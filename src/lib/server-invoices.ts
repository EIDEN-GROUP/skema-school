import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/lib/supabase-server";

export type InvoiceStatus = "paye" | "en_attente" | "retard" | "impaye";

export type Invoice = {
  id: string;
  client_id: string;
  period: string; // YYYY-MM
  amount_due: number;
  amount_paid: number;
  due_date: string;
  status: InvoiceStatus;
  created_at: string;
  updated_at: string;
};

/** One bar/point of the dashboard series. Amounts are MAD. */
export type InvoicePoint = {
  bucket: string;
  encaisse: number;
  en_attente: number;
  impaye: number;
  retard: number;
  du: number;
  paiements: number;
  countPaye: number;
  countEnAttente: number;
  countImpaye: number;
  countRetard: number;
};

const MONTH_LABELS = [
  "Jan",
  "Fév",
  "Mar",
  "Avr",
  "Mai",
  "Juin",
  "Juil",
  "Août",
  "Sep",
  "Oct",
  "Nov",
  "Déc",
];

export const listInvoices = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("invoices")
    .select("*, clients!inner(parent_name, child_name, phone, email, level)")
    .order("period", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
});

/**
 * Money series for the dashboard, straight off the invoices ledger.
 * `mensuel` = the 12 months of `year`; `annuel` = one bucket per year.
 * Encaissé is what came in, impayé/retard is what did not, split by whether the
 * due date (+ grace) has passed.
 */
export const getInvoiceAnalytics = createServerFn({ method: "GET" })
  .validator((input: { grain: "mensuel" | "trimestriel" | "annuel"; year?: string }) => input)
  .handler(async ({ data: input }): Promise<InvoicePoint[]> => {
    const { data, error } = await supabaseAdmin
      .from("invoices")
      .select("period, amount_due, amount_paid, status");
    if (error) throw new Error(error.message);

    const rows = (data ?? []) as Array<
      Pick<Invoice, "period" | "amount_due" | "amount_paid" | "status">
    >;

    const empty = (bucket: string): InvoicePoint => ({
      bucket,
      encaisse: 0,
      en_attente: 0,
      impaye: 0,
      retard: 0,
      du: 0,
      paiements: 0,
      countPaye: 0,
      countEnAttente: 0,
      countImpaye: 0,
      countRetard: 0,
    });

    const add = (point: InvoicePoint, r: (typeof rows)[number]) => {
      const due = Number(r.amount_due) || 0;
      const paid = Number(r.amount_paid) || 0;
      const outstanding = Math.max(0, due - paid);
      point.du += due;
      point.encaisse += paid;
      if (paid > 0) point.paiements += 1;
      if (r.status === "retard") {
        point.retard += outstanding;
        point.countRetard += 1;
      } else if (r.status === "en_attente") {
        point.en_attente += outstanding;
        point.countEnAttente += 1;
      } else if (r.status === "impaye") {
        point.impaye += outstanding;
        point.countImpaye += 1;
      } else {
        point.countPaye += 1;
      }
    };

    const round = (p: InvoicePoint): InvoicePoint => ({
      ...p,
      encaisse: Math.round(p.encaisse),
      en_attente: Math.round(p.en_attente),
      impaye: Math.round(p.impaye),
      retard: Math.round(p.retard),
      du: Math.round(p.du),
    });

    if (input.grain === "annuel") {
      const byYear = new Map<string, InvoicePoint>();
      for (const r of rows) {
        const y = (r.period ?? "").slice(0, 4);
        if (!y) continue;
        if (!byYear.has(y)) byYear.set(y, empty(y));
        add(byYear.get(y)!, r);
      }
      return [...byYear.values()].sort((a, b) => a.bucket.localeCompare(b.bucket)).map(round);
    }

    if (input.grain === "trimestriel") {
      // "3 mois" = the last three calendar months, most recent last. This is
      // relative to today and can span a year boundary (e.g. Nov, Déc, Jan).
      const now = new Date();
      const keyFor = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const slots = [2, 1, 0].map((back) => {
        const d = new Date(now.getFullYear(), now.getMonth() - back, 1);
        return { key: keyFor(d), point: empty(MONTH_LABELS[d.getMonth()]) };
      });
      const byKey = new Map(slots.map((s) => [s.key, s.point]));
      for (const r of rows) {
        const key = (r.period ?? "").slice(0, 7);
        const point = byKey.get(key);
        if (point) add(point, r);
      }
      return slots.map((s) => round(s.point));
    }

    const year = input.year ?? String(new Date().getFullYear());
    const months = MONTH_LABELS.map((m) => empty(m));
    for (const r of rows) {
      const period = r.period ?? "";
      if (period.slice(0, 4) !== year) continue;
      const idx = Number(period.slice(5, 7)) - 1;
      if (Number.isNaN(idx) || idx < 0 || idx > 11) continue;
      add(months[idx], r);
    }
    return months.map(round);
  });

/** Which years the ledger actually covers, newest first. */
export const listInvoiceYears = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin.from("invoices").select("period");
  if (error) throw new Error(error.message);
  const years = new Set<string>();
  for (const r of (data ?? []) as Array<{ period: string }>) {
    const y = (r.period ?? "").slice(0, 4);
    if (y) years.add(y);
  }
  years.add(String(new Date().getFullYear()));
  return [...years].sort((a, b) => b.localeCompare(a));
});

/**
 * Current outstanding totals, for the clickable KPI cards.
 *
 * Reads the *client* ledger (payment_status + debt), not the invoices table:
 * `retard` is a transient ~15-day window between the grace date and escalation,
 * and historical invoices have all aged past it into `impaye`, so an
 * invoice-based sum reports 0 MAD for retard while 13 clients are flagged
 * retard. The client rows are what `recalc_client_debt` keeps current and what
 * the count cards above already use, so both halves of each row now agree.
 */
export const getOutstanding = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("clients")
    .select("payment_status, debt")
    .in("payment_status", ["en_attente", "retard", "impaye"]);
  if (error) throw new Error(error.message);

  let enAttenteTotal = 0;
  let impayeTotal = 0;
  let retardTotal = 0;
  let enAttenteCount = 0;
  let impayeCount = 0;
  let retardCount = 0;
  for (const r of (data ?? []) as Array<{
    payment_status: InvoiceStatus;
    debt: number;
  }>) {
    const outstanding = Math.max(0, Number(r.debt) || 0);
    if (r.payment_status === "retard") {
      retardTotal += outstanding;
      retardCount += 1;
    } else if (r.payment_status === "en_attente") {
      enAttenteTotal += outstanding;
      enAttenteCount += 1;
    } else if (r.payment_status === "impaye") {
      impayeTotal += outstanding;
      impayeCount += 1;
    }
  }
  return {
    enAttenteTotal: Math.round(enAttenteTotal),
    impayeTotal: Math.round(impayeTotal),
    retardTotal: Math.round(retardTotal),
    enAttenteCount,
    impayeCount,
    retardCount,
  };
});

/** Issue (or refresh) the invoices for a period. Idempotent. */
export const generateInvoices = createServerFn({ method: "POST" })
  .validator((input: { period: string }) => input)
  .handler(async ({ data }) => {
    const { data: created, error } = await supabaseAdmin.rpc("generate_invoices", {
      p_period: data.period,
    });
    if (error) throw new Error(error.message);
    return { ok: true, created: Number(created ?? 0) };
  });
