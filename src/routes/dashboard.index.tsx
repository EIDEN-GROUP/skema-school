import { buildMeta } from "@/lib/seo/metadata";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo, useEffect, useRef, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getDashboardStats } from "@/lib/server-dashboard";
import { listPayments } from "@/lib/server-payments";
import { listClients } from "@/lib/server-clients";
import { sendBroadcast, sendClientMessage } from "@/lib/server-whatsapp";
import {
  getInvoiceAnalytics,
  getOutstanding,
  listInvoiceYears,
  type InvoicePoint,
} from "@/lib/server-invoices";
import { toast } from "sonner";
import { track, trackFirstOnce } from "@/lib/analytics";
import { amountBucket, paymentMethod, errorType } from "@/lib/analytics";
import {
  Users,
  CreditCard,
  AlertCircle,
  Plus,
  ArrowRight,
  ArrowUpRight,
  ArrowUp,
  ArrowDown,
  TrendingUp,
  Calendar,
  Send,
  Clock,
} from "lucide-react";
import { AddClientDialog, emptyWizard, type WizardData } from "@/components/add-client-wizard";
import { Sticker } from "@/components/skema/bits";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { interpolate, useDashboardI18n } from "@/lib/landing-i18n";
import {
  softCard,
  softCardHover,
  softInput,
  softSelectTrigger,
  softSelectContent,
  dialogSurface,
  dashTooltip,
  labelClass,
  eyebrowClass,
  primaryPill,
  STATUS_COLORS,
  statusPill,
  initials,
} from "@/lib/dash-ui";

export const Route = createFileRoute("/dashboard/")({
  head: () =>
    buildMeta({
      title: "Tableau de bord · SKEMA",
      description:
        "Vue d'ensemble du tableau de bord de l'école : indicateurs financiers, familles et rappels de paiement.",
      path: "/dashboard",
      noindex: true,
    }),
  component: CrmDash,
});

// ──────────────────────────────────────────────────────────
// Données démo   statistique générale (encaissé en k MAD + nb de paiements)
// ──────────────────────────────────────────────────────────
type Grain = "mensuel" | "trimestriel" | "annuel";

const PENDING_COLOR = "#FFB347";
const MONTH_NAMES = [
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
type SeriesKey = "encaisse" | "en_attente" | "impaye" | "retard" | "attente";

const SERIES_META: Array<{ key: SeriesKey; label: string; color: string }> = [
  { key: "encaisse", label: "Encaissé", color: "#001B3D" },
  { key: "en_attente", label: "En attente", color: STATUS_COLORS.en_attente },
  { key: "impaye", label: "Impayé", color: STATUS_COLORS.impaye },
  { key: "retard", label: "Retard", color: STATUS_COLORS.retard },
  { key: "attente", label: "Total à recouvrer", color: PENDING_COLOR },
];

type QuickAction =
  | { kind: "link"; to: string; title: string; desc: string; icon: typeof Users }
  | { kind: "add-client"; title: string; desc: string; icon: typeof Plus };

function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className={labelClass}>
        {label}
      </Label>
      {children}
    </div>
  );
}

/** Jours de retard depuis l'échéance du mois courant (borne à 0, jour ≤ 28). */
const daysOverdue = (paymentDay?: number): number => {
  const now = new Date();
  const day = Math.min(Math.max(Number(paymentDay) || 1, 1), 28);
  const due = new Date(now.getFullYear(), now.getMonth(), day);
  const diff = Math.floor((now.getTime() - due.getTime()) / 86_400_000);
  return Math.max(0, diff);
};

function CrmDash() {
  const { t } = useDashboardI18n();
  const isMobile = useIsMobile();
  const dashViewedRef = useRef(false);
  useEffect(() => {
    if (dashViewedRef.current) return;
    dashViewedRef.current = true;
    track("dashboard_viewed", { role: "admin" });
    trackFirstOnce("dashboard_viewed", "first_dashboard_view", { role: "admin" });
  }, []);
  const [addClientOpen, setAddClientOpen] = useState(false);
  const [wizard, setWizard] = useState<WizardData>(emptyWizard);
  const updateWizard = (patch: Partial<WizardData>) => setWizard((prev) => ({ ...prev, ...patch }));
  const [grain, setGrain] = useState<Grain>("mensuel");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [relanceIds, setRelanceIds] = useState<string[]>([]);
  const [relanceExpanded, setRelanceExpanded] = useState(false);
  const [pendingExpanded, setPendingExpanded] = useState(false);
  const [relancePeriode, setRelancePeriode] = useState("Mai 2026 · frais mensuels");

  // Which money series are drawn. Clicking a legend chip toggles one on/off.
  const [series, setSeries] = useState<Record<SeriesKey, boolean>>({
    encaisse: true,
    en_attente: true,
    impaye: true,
    retard: true,
    attente: true,
  });
  const toggleSeries = (k: SeriesKey) =>
    setSeries((s) => {
      const next = { ...s, [k]: !s[k] };
      // Never leave the chart empty.
      return Object.values(next).some(Boolean) ? next : s;
    });

  const { data: stats } = useQuery({ queryKey: ["dashboard-stats"], queryFn: getDashboardStats });
  const { data: payments = [] } = useQuery({ queryKey: ["payments"], queryFn: listPayments });
  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: listClients });
  const { data: years = [] } = useQuery({ queryKey: ["invoice-years"], queryFn: listInvoiceYears });
  const { data: outstanding } = useQuery({ queryKey: ["outstanding"], queryFn: getOutstanding });

  // The bar series comes straight off the invoices ledger, so impayé/retard are
  // recorded facts (what was owed, and whether the due date passed), not guesses.
  const { data: barData = [] } = useQuery({
    queryKey: ["invoice-analytics", grain, year],
    queryFn: () => getInvoiceAnalytics({ data: { grain, year } }),
  });
  // The activity card is always monthly, whatever the bar granularity is.
  const { data: monthlyData = [] } = useQuery({
    queryKey: ["invoice-analytics", "mensuel", year],
    queryFn: () => getInvoiceAnalytics({ data: { grain: "mensuel", year } }),
  });

  const dbPayments = payments as unknown as Array<{
    id: string;
    amount: number;
    date: string;
    mode: string;
    period: string;
    invoice_sent: boolean;
    clients: {
      parent_name: string;
      child_name: string;
      phone: string;
      email: string;
      level: string;
      monthly_fee: number;
      payment_status: string;
      subscribed_services: string[];
    };
  }>;
  // "Impayé" is what the bucket still owes: the unpaid amount whether or not
  // the due date has passed. Derived here rather than in the ledger query   it is
  // exactly impayé + retard, which getInvoiceAnalytics already returns.
  const chartData = useMemo(
    () =>
      (barData as InvoicePoint[]).map((p) => ({
        ...p,
        attente: p.en_attente + p.impaye + p.retard,
      })),
    [barData],
  );

  // Count payment statuses
  const statusCounts = useMemo(() => {
    const c = { paye: 0, en_attente: 0, retard: 0, impaye: 0 };
    (clients as any[]).forEach((cl: any) => {
      if (cl.payment_status === "paye") c.paye++;
      else if (cl.payment_status === "retard") c.retard++;
      else if (cl.payment_status === "en_attente") c.en_attente++;
      else c.impaye++;
    });
    return c;
  }, [clients]);

  // Familles en attente de paiement (impayé + en retard), triées du plus ancien
  // retard au plus récent   c'est la file de relance affichée sous les paiements.
  const pendingDues = useMemo(() => {
    return (clients as any[])
      .filter((c: any) => c.payment_status !== "paye")
      .map((c: any) => {
        const net = Math.round((c.monthly_fee ?? 0) * (1 - (c.remise ?? 0) / 100));
        return {
          id: c.id as string,
          name: (c.parent_name || c.child_name || "") as string,
          level: (c.level || "") as string,
          status: c.payment_status as "en_attente" | "retard" | "impaye",
          days: c.payment_status === "retard" ? daysOverdue(c.payment_day) : 0,
          amount: (c.debt ?? 0) > 0 ? (c.debt as number) : net,
        };
      })
      .sort((a, b) => b.days - a.days || b.amount - a.amount);
  }, [clients]);

  const pendingTotal = useMemo(() => pendingDues.reduce((s, d) => s + d.amount, 0), [pendingDues]);

  // "Total à recouvrer" is just the three status rows added up. Those rows sum
  // each family's live debt by payment_status (getOutstanding), so the count
  // matches the KPI cards above and the MAD matches the count.
  const attenteTotal =
    (outstanding?.enAttenteTotal ?? 0) +
    (outstanding?.impayeTotal ?? 0) +
    (outstanding?.retardTotal ?? 0);
  const attenteCount =
    (outstanding?.enAttenteCount ?? 0) +
    (outstanding?.impayeCount ?? 0) +
    (outstanding?.retardCount ?? 0);

  // Relance rapide: pick who gets the reminder instead of blasting every overdue
  const relanceCandidates = useMemo(
    () => (clients as any[]).filter((c: any) => c.payment_status !== "paye"),
    [clients],
  );
  const relanceShown = relanceExpanded ? relanceCandidates : relanceCandidates.slice(0, 4);
  const toggleRelance = (id: string) =>
    setRelanceIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const relanceMutation = useMutation({
    mutationFn: async () => {
      const content = relancePeriode.trim()
        ? `Rappel de paiement · ${relancePeriode.trim()}`
        : "Rappel de paiement";

      // No selection => previous behaviour: every overdue client.
      if (relanceIds.length === 0) {
        return sendBroadcast({ data: { content, filterOverdue: true } });
      }

      // Sequential, not Promise.all: WAHA drives one WhatsApp session, and
      // parallel bursts are exactly the pattern that gets numbers banned.
      let success = 0;
      const errors: string[] = [];
      for (const clientId of relanceIds) {
        const res = await sendClientMessage({ data: { clientId, content } });
        if (res.ok) success += 1;
        else errors.push(res.error ?? "échec");
      }
      return { ok: true, success, failed: relanceIds.length - success, errors };
    },
    onSuccess: (res: any) => {
      track("payment_reminder_sent", {
        channel: "whatsapp",
        message_type: "payment_reminder",
        recipient_count: res.success + (res.failed || 0),
        success_count: res.success,
        failure_count: res.failed || 0,
      });
      if (res.success === 0) {
        toast.error(res.errors?.[0] ?? "Aucun rappel envoyé");
      } else {
        toast.success(
          `Rappel envoyé à ${res.success} client${res.success > 1 ? "s" : ""}` +
            (res.failed ? ` (${res.failed} échec${res.failed > 1 ? "s" : ""})` : ""),
        );
      }
      setRelanceIds([]);
      queryClient.invalidateQueries({ queryKey: ["message-history"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Relance individuelle depuis la file "Paiements en attente".
  const remindMutation = useMutation({
    mutationFn: (clientId: string) =>
      sendClientMessage({ data: { clientId, content: "Rappel de paiement" } }),
    onSuccess: () => {
      track("payment_reminder_sent", {
        channel: "whatsapp",
        message_type: "payment_reminder",
        recipient_count: 1,
        success_count: 1,
      });
      toast.success("Rappel envoyé");
      queryClient.invalidateQueries({ queryKey: ["message-history"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Last 4 payments
  const lastPayments = useMemo(() => {
    return dbPayments.slice(0, 4).map((p) => ({
      who: p.clients?.parent_name ?? "",
      note: `Frais mensuels · ${p.clients?.child_name ?? ""}`,
      date: p.date || " ",
      amount: String(p.amount),
      status: (p.clients?.payment_status ?? "en_attente") as
        "paye" | "en_attente" | "retard" | "impaye",
    }));
  }, [dbPayments]);

  // 5 indicateurs
  const totalClients = (clients as any[]).length;
  const paidCount = statusCounts.paye;
  const overdueCount = statusCounts.retard;
  const partialCount = statusCounts.en_attente;
  const unpaidCount = statusCounts.impaye;
  const totalRevenue = stats?.total_revenue ?? 0;

  // Each card opens the client list already filtered to the status it counts,
  // rather than dropping you on an unfiltered page.
  const metrics = [
    {
      k: "01",
      label: "Total de familles à l'école",
      value: String(totalClients),
      sub: "familles inscrites",
      accent: "#001B3D",
      tint: "rgba(40,57,108,0.10)",
      icon: Users,
      to: "/dashboard/familles",
      search: {},
      extra: null as string | null,
    },
    {
      k: "02",
      label: "Payé",
      value: String(paidCount),
      sub: "paiements du mois reçus",
      accent: STATUS_COLORS.paye,
      tint: "rgba(107,165,58,0.14)",
      icon: CreditCard,
      to: "/dashboard/familles",
      search: { statut: "paye" },
      extra: null as string | null,
    },
    {
      k: "03",
      label: "Retard",
      value: String(overdueCount),
      sub: "relance recommandée",
      accent: STATUS_COLORS.retard,
      tint: "rgba(226,92,92,0.12)",
      icon: Clock,
      to: "/dashboard/familles",
      search: { statut: "retard" },
      extra: null as string | null,
    },
    {
      k: "04",
      label: "En attente",
      value: String(partialCount),
      sub: "paiement partiel reçu",
      accent: STATUS_COLORS.en_attente,
      tint: "rgba(232,161,60,0.14)",
      icon: AlertCircle,
      to: "/dashboard/familles",
      search: { statut: "en_attente" },
      extra: null as string | null,
    },
    {
      k: "05",
      label: "Impayé",
      value: String(unpaidCount),
      sub: "jamais payé",
      accent: "#D93A41",
      tint: "rgba(154,47,47,0.10)",
      icon: TrendingUp,
      to: "/dashboard/familles",
      search: { statut: "impaye" },
      extra: null as string | null,
    },
  ] as const;

  const queryClient = useQueryClient();

  const quickActions: QuickAction[] = [
    {
      kind: "link",
      to: "/dashboard/familles",
      title: t.home.quickActions.manageClients.title,
      desc: t.home.quickActions.manageClients.desc,
      icon: Users,
    },
    {
      kind: "link",
      to: "/dashboard/paiements",
      title: t.home.quickActions.lateClients.title,
      desc: t.home.quickActions.lateClients.desc,
      icon: Clock,
    },
    {
      kind: "add-client",
      title: t.home.quickActions.addClient.title,
      desc: t.home.quickActions.addClient.desc,
      icon: Plus,
    },
  ];

  return (
    <div className="space-y-5 sm:space-y-6">
      <AddClientDialog
        open={addClientOpen}
        onOpenChange={setAddClientOpen}
        wizard={wizard}
        updateWizard={updateWizard}
        setWizard={setWizard}
      />

      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
            {t.home.eyebrow}
          </p>
          <h1 className="font-hand mt-2 text-4xl leading-tight tracking-tight text-foreground md:text-[3rem]">
            <span className="font-semibold">{t.home.titleBold}</span>{" "}
            <span className="font-normal italic text-muted-foreground">{t.home.titleItalic}</span>
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t.home.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => setAddClientOpen(true)}
          className={cn(primaryPill, "w-full justify-center sm:w-auto sm:shrink-0")}
        >
          <Plus className="h-4 w-4" />
          {t.home.quickActions.addClient.title}
        </button>
      </header>

      {/* 4 cartes indicateurs   total / payé / en retard / impayé */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {metrics.map((card) => (
          <Link
            key={card.k}
            to={card.to}
            search={card.search}
            aria-label={interpolate(t.home.cardOpenAria, { label: card.label, value: card.value })}
            className={cn(
              softCardHover,
              "relative block overflow-hidden p-5 text-left text-inherit no-underline outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {card.label}
              </p>
              <span
                className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl"
                style={{ backgroundColor: card.tint, color: card.accent }}
              >
                <card.icon className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-3 font-display text-3xl font-semibold tracking-tight text-foreground">
              {card.value}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{card.sub}</p>
            {card.extra ? (
              <p
                className="mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums"
                style={{ backgroundColor: card.tint, color: card.accent }}
              >
                {card.extra}
              </p>
            ) : null}
            <span
              className="mt-3 block h-1 w-10 rounded-full"
              style={{ backgroundColor: card.accent }}
            />
          </Link>
        ))}
      </div>

      {/* Statistique générale   barres (encaissé) + courbe (paiements reçus) et colonne d'indicateurs */}
      <div className={cn(softCard, "overflow-hidden")}>
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_17rem]">
          {/* Graphique */}
          <div className="min-w-0 p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className={eyebrowClass}>Vue d'ensemble</p>
                <h2 className="mt-1 font-display text-2xl text-foreground">
                  Statistique{" "}
                  <span className="font-normal italic text-muted-foreground">générale</span>
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Select value={grain} onValueChange={(v) => setGrain(v as Grain)}>
                  <SelectTrigger
                    className={cn(softSelectTrigger, "h-9 w-[7.5rem] rounded-xl")}
                    aria-label="Granularité"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={softSelectContent}>
                    <SelectItem value="mensuel">Mensuel</SelectItem>
                    <SelectItem value="trimestriel">3 mois</SelectItem>
                    <SelectItem value="annuel">Annuel</SelectItem>
                  </SelectContent>
                </Select>
                {/* Only monthly is scoped to a year; "3 mois" is the last 3 months from today and annual shows every year. */}
                {grain === "mensuel" ? (
                  <Select value={year} onValueChange={setYear}>
                    <SelectTrigger
                      className={cn(softSelectTrigger, "h-9 w-[6.5rem] rounded-xl")}
                      aria-label="Année"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={softSelectContent}>
                      {years.map((y) => (
                        <SelectItem key={y} value={y}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : null}
              </div>
            </div>

            <div className="mt-5 h-64 w-full min-w-0 sm:mt-6 sm:h-[24rem]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                  barCategoryGap="28%"
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(40,57,108,0.08)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="bucket"
                    stroke="var(--muted-foreground)"
                    fontSize={isMobile ? 11 : 12}
                    tickLine={false}
                    axisLine={false}
                    dy={6}
                    minTickGap={isMobile ? 16 : 5}
                  />
                  {/* Width fits 4-digit MAD ticks   a tighter axis clips the leading digit.
                      On mobile the ticks compact to "12k" so the axis stays narrow. */}
                  <YAxis
                    stroke="var(--muted-foreground)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    width={isMobile ? 40 : 64}
                    tickFormatter={(v: number) =>
                      isMobile && Math.abs(v) >= 1000
                        ? `${(v / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })}k`
                        : v.toLocaleString("fr-FR")
                    }
                  />
                  <Tooltip
                    contentStyle={dashTooltip}
                    cursor={{ fill: "rgba(181,225,139,0.16)" }}
                    formatter={(v: number, n) => [`${Number(v).toLocaleString("fr-FR")} MAD`, n]}
                  />
                  {/* Thin fully-rounded columns   the bar-forward shape from the reference. */}
                  {SERIES_META.filter((s) => series[s.key]).map((s) => (
                    <Bar
                      key={s.key}
                      dataKey={s.key}
                      name={s.label}
                      fill={s.color}
                      radius={[999, 999, 999, 999]}
                      maxBarSize={12}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Clickable legend: each chip toggles its series on the chart. */}
            <ul className="mt-4 flex flex-wrap items-center gap-2">
              {SERIES_META.map((s) => {
                const on = series[s.key];
                return (
                  <li key={s.key}>
                    <button
                      type="button"
                      onClick={() => toggleSeries(s.key)}
                      aria-pressed={on}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                        on
                          ? "border-[#001B3D]/15 bg-card text-foreground shadow-sm"
                          : "border-transparent bg-muted/60 text-muted-foreground/70 hover:text-foreground",
                      )}
                    >
                      <span
                        className="h-3 w-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: on ? s.color : "currentColor" }}
                        aria-hidden
                      />
                      {s.label}
                    </button>
                  </li>
                );
              })}
              <li className="ml-1 text-xs text-muted-foreground">
                {grain === "mensuel"
                  ? `Par mois · ${year}`
                  : grain === "trimestriel"
                    ? "3 derniers mois"
                    : "Par année"}{" "}
                · MAD
              </li>
            </ul>
          </div>

          {/* Colonne d'indicateurs   impayé / retard sont cliquables : ils ouvrent la liste filtrée. */}
          <div className="border-t border-[#001B3D]/10 lg:border-l lg:border-t-0">
            <ul className="divide-y divide-[#001B3D]/10">
              <li className="px-4 py-5 sm:px-6">
                <p className="text-xs text-muted-foreground">Total encaissé</p>
                <p className="mt-1.5 font-display text-2xl font-semibold tabular-nums text-foreground">
                  {(stats?.total_revenue ?? 0).toLocaleString("fr-FR")} MAD
                </p>
              </li>
              <li className="px-4 py-5 sm:px-6">
                <p className="text-xs text-muted-foreground">Encaissé ce mois</p>
                <p className="mt-1.5 font-display text-2xl font-semibold tabular-nums text-foreground">
                  {(stats?.paid_this_month ?? 0).toLocaleString("fr-FR")} MAD
                </p>
              </li>

              <li>
                <Link
                  to="/dashboard/familles"
                  search={{ statut: "en_attente" }}
                  className="block px-4 py-5 transition-colors hover:bg-[#FFF3E6]/40 sm:px-6"
                >
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: STATUS_COLORS.en_attente }}
                    />
                    En attente
                    <ArrowRight className="ml-auto h-3.5 w-3.5" />
                  </p>
                  <p className="mt-1.5 font-display text-2xl font-semibold tabular-nums text-foreground">
                    {(outstanding?.enAttenteTotal ?? 0).toLocaleString("fr-FR")} MAD
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {outstanding?.enAttenteCount ?? 0} famille(s) en attente
                  </p>
                </Link>
              </li>

              <li>
                <Link
                  to="/dashboard/familles"
                  search={{ statut: "impaye" }}
                  className="block px-4 py-5 transition-colors hover:bg-[#FF666B]/20 sm:px-6"
                >
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: STATUS_COLORS.impaye }}
                    />
                    Impayé
                    <ArrowRight className="ml-auto h-3.5 w-3.5" />
                  </p>
                  <p className="mt-1.5 font-display text-2xl font-semibold tabular-nums text-foreground">
                    {(outstanding?.impayeTotal ?? 0).toLocaleString("fr-FR")} MAD
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {outstanding?.impayeCount ?? 0} famille(s) impayée(s)
                  </p>
                </Link>
              </li>

              <li>
                <Link
                  to="/dashboard/familles"
                  search={{ statut: "retard" }}
                  className="block px-4 py-5 transition-colors hover:bg-[#FFE3E0]/40 sm:px-6"
                >
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: STATUS_COLORS.retard }}
                    />
                    Retard
                    <ArrowRight className="ml-auto h-3.5 w-3.5" />
                  </p>
                  <p className="mt-1.5 font-display text-2xl font-semibold tabular-nums text-foreground">
                    {(outstanding?.retardTotal ?? 0).toLocaleString("fr-FR")} MAD
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {outstanding?.retardCount ?? 0} famille(s) en retard
                  </p>
                </Link>
              </li>

              <li className="px-4 py-5 sm:px-6">
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: PENDING_COLOR }}
                  />
                  Total à recouvrer
                </p>
                <p className="mt-1.5 font-display text-2xl font-semibold tabular-nums text-foreground">
                  {attenteTotal.toLocaleString("fr-FR")} MAD
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {attenteCount} famille(s) à recouvrer
                </p>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Activité récente + relance rapide + actions rapides */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)] lg:items-start">
        {/* Colonne principale : activité récente + créances en attente à relancer */}
        <div className="min-w-0 space-y-5">
          {/* Derniers paiements (Activité récente) */}
          <div className={cn(softCard, "p-4 sm:p-6")}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className={eyebrowClass}>Activité récente</p>
                <h2 className="mt-1 font-display text-xl text-foreground">Derniers paiements</h2>
              </div>
              <Link
                to="/dashboard/paiements"
                className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-[#001B3D] transition hover:bg-[#6C4DF6]/15"
              >
                Voir tout <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <ul className="mt-4 divide-y divide-[#001B3D]/8">
              {lastPayments.map((p) => (
                <li key={p.who + p.note} className="flex items-center gap-3 py-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#001B3D]/8 text-xs font-bold text-[#001B3D]">
                    {initials(p.who)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{p.who}</p>
                    <p className="truncate text-xs text-muted-foreground">{p.note}</p>
                    <p className="mt-0.5 text-xs font-semibold tabular-nums text-foreground sm:hidden">
                      {p.amount} MAD{" "}
                      <span className="font-normal text-muted-foreground">· {p.date}</span>
                    </p>
                  </div>
                  <div className="hidden shrink-0 text-right sm:block">
                    <p className="text-sm font-semibold tabular-nums text-foreground">
                      {p.amount} MAD
                    </p>
                    <p className="text-[11px] text-muted-foreground">{p.date}</p>
                  </div>
                  <span className={statusPill(p.status)}>
                    {p.status === "paye"
                      ? "Payé"
                      : p.status === "retard"
                        ? "Retard"
                        : p.status === "en_attente"
                          ? "En attente"
                          : "Impayé"}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Paiements en attente   file de relance : uniquement impayés et retards. */}
          <div className={cn(softCard, "relative overflow-hidden")}>
            <Sticker
              name="warningTriangle"
              tilt={8}
              className="pointer-events-none absolute -right-3 -top-3 w-16 opacity-90"
            />
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#001B3D]/10 px-4 py-4 sm:px-6">
              <div>
                <p className={eyebrowClass}>Créances</p>
                <h2 className="mt-1 font-display text-xl text-foreground">Paiements en attente</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Familles impayées ou en retard à relancer
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#FFF3E6] px-3 py-1 text-xs font-semibold text-[#B5760E]">
                  {pendingDues.length} famille{pendingDues.length > 1 ? "s" : ""}
                </span>
                {pendingTotal > 0 ? (
                  <span className="rounded-full bg-[#001B3D]/8 px-3 py-1 text-xs font-semibold tabular-nums text-[#001B3D]">
                    {pendingTotal.toLocaleString("fr-FR")} MAD
                  </span>
                ) : null}
              </div>
            </div>
            {pendingDues.length === 0 ? (
              <p className="px-6 py-10 text-center text-sm text-muted-foreground">
                Aucun paiement en attente. Tout est à jour.
              </p>
            ) : (
              <ul className="divide-y divide-[#001B3D]/8">
                {(pendingExpanded ? pendingDues : pendingDues.slice(0, 6)).map((d) => (
                  <li key={d.id} className="px-4 py-3.5 sm:px-6">
                    <div className="flex items-center gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#001B3D]/8 text-xs font-bold text-[#001B3D]">
                        {initials(d.name)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-semibold text-foreground">{d.name}</p>
                          {d.status === "retard" && d.days > 0 ? (
                            <span
                              className={cn(
                                "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                                d.days > 14
                                  ? "bg-[#FFE3E0] text-[#D93A41]"
                                  : "bg-[#FFF3E6] text-[#B5760E]",
                              )}
                            >
                              {d.days}j de retard
                            </span>
                          ) : d.status === "en_attente" ? (
                            <span className="shrink-0 rounded-full bg-[#FFF3E6] px-2 py-0.5 text-[10px] font-semibold text-[#B5760E]">
                              En attente
                            </span>
                          ) : (
                            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                              Impayé
                            </span>
                          )}
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                          {d.level || "Niveau non défini"}
                        </p>
                      </div>
                      <p className="hidden shrink-0 text-right text-sm font-semibold tabular-nums text-foreground sm:block">
                        {d.amount.toLocaleString("fr-FR")} MAD
                      </p>
                      <button
                        type="button"
                        onClick={() => remindMutation.mutate(d.id)}
                        disabled={remindMutation.isPending}
                        className="hidden shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-[#001B3D] transition hover:bg-[#6C4DF6]/15 disabled:opacity-50 sm:inline-flex"
                      >
                        <Send className="h-3.5 w-3.5" /> Relancer
                      </button>
                    </div>
                    {/* Mobile : montant + relance sur leur propre ligne */}
                    <div className="mt-2 flex items-center justify-between gap-2 pl-[3.25rem] sm:hidden">
                      <p className="text-sm font-semibold tabular-nums text-foreground">
                        {d.amount.toLocaleString("fr-FR")} MAD
                      </p>
                      <button
                        type="button"
                        onClick={() => remindMutation.mutate(d.id)}
                        disabled={remindMutation.isPending}
                        className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[#001B3D]/15 px-3 py-1.5 text-xs font-semibold text-[#001B3D] transition hover:bg-[#6C4DF6]/15 disabled:opacity-50"
                      >
                        <Send className="h-3.5 w-3.5" /> Relancer
                      </button>
                    </div>
                  </li>
                ))}
                {pendingDues.length > 6 ? (
                  <li className="px-4 py-3 sm:px-6">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setPendingExpanded((v) => !v)}
                        aria-expanded={pendingExpanded}
                        className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-[#001B3D] transition hover:bg-[#6C4DF6]/15"
                      >
                        {pendingExpanded
                          ? "Afficher moins"
                          : `Voir les ${pendingDues.length} familles`}
                        <ArrowDown
                          className={cn(
                            "h-3.5 w-3.5 transition-transform",
                            pendingExpanded && "rotate-180",
                          )}
                        />
                      </button>
                      <Link
                        to="/dashboard/familles"
                        search={{ statut: "retard" }}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground transition hover:text-foreground"
                      >
                        Ouvrir la liste complète <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </li>
                ) : null}
              </ul>
            )}
          </div>
        </div>

        {/* Colonne latérale   relance rapide + actions rapides */}
        <div className="min-w-0 space-y-5">
          {/* Relance rapide */}
          <div className={cn(softCard, "overflow-hidden")}>
            <div className="relative bg-[#001B3D] p-4 text-white sm:p-5">
              <Sticker
                name="megaphone"
                tilt={-6}
                className="pointer-events-none absolute -right-2 -top-4 w-14"
              />
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6C4DF6]">
                  Relance rapide
                </p>
                <Link
                  to="/dashboard/familles"
                  className="text-[11px] font-medium text-white/70 hover:text-white"
                >
                  Voir tout
                </Link>
              </div>
              <h3 className="mt-1 font-display text-lg font-semibold">Rappel de paiement</h3>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {relanceCandidates.length > 4 && (
                  <button
                    type="button"
                    onClick={() => setRelanceExpanded((v) => !v)}
                    title={
                      relanceExpanded
                        ? "Afficher moins"
                        : `Afficher les ${relanceCandidates.length} clients`
                    }
                    aria-expanded={relanceExpanded}
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-dashed border-white/40 text-white/80 transition hover:border-white/80 hover:text-white"
                  >
                    <Plus
                      className={cn("h-4 w-4 transition-transform", relanceExpanded && "rotate-45")}
                    />
                  </button>
                )}
                {relanceShown.map((c: any) => {
                  const selected = relanceIds.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleRelance(c.id)}
                      title={`${c.parent_name}${selected ? " (sélectionné)" : ""}`}
                      aria-pressed={selected}
                      className={cn(
                        "grid h-11 w-11 shrink-0 place-items-center rounded-full text-xs font-bold transition",
                        selected
                          ? "bg-white text-[#001B3D] ring-2 ring-[#6C4DF6] ring-offset-2 ring-offset-[#001B3D]"
                          : "bg-[#6C4DF6] text-[#001B3D] ring-2 ring-[#001B3D] opacity-70 hover:opacity-100",
                      )}
                    >
                      {initials(c.parent_name)}
                    </button>
                  );
                })}
                {relanceCandidates.length === 0 && (
                  <p className="text-xs text-white/60">Aucun client à relancer.</p>
                )}
              </div>
              <p className="mt-3 text-[11px] text-white/70">
                {relanceIds.length > 0
                  ? `${relanceIds.length} client${relanceIds.length > 1 ? "s" : ""} sélectionné${relanceIds.length > 1 ? "s" : ""}`
                  : "Cliquez sur un parent pour le relancer, ou envoyez à tous les en retard."}
              </p>
            </div>
            <form
              className="space-y-3 p-4 sm:p-5"
              onSubmit={(e) => {
                e.preventDefault();
                relanceMutation.mutate();
              }}
            >
              <div>
                <Label htmlFor="relance-periode" className={labelClass}>
                  Période concernée
                </Label>
                <Input
                  id="relance-periode"
                  value={relancePeriode}
                  onChange={(e) => setRelancePeriode(e.target.value)}
                  className={cn(softInput, "mt-1.5")}
                />
              </div>
              <button
                type="submit"
                disabled={relanceMutation.isPending || relanceCandidates.length === 0}
                className={cn(primaryPill, "w-full justify-center")}
              >
                <Send className="h-4 w-4" />
                {relanceMutation.isPending
                  ? "Envoi..."
                  : relanceIds.length > 0
                    ? `Envoyer à ${relanceIds.length} sélectionné${relanceIds.length > 1 ? "s" : ""}`
                    : "Envoyer à tous les en retard"}
              </button>
            </form>
          </div>

          {/* Actions rapides */}
          <div className={cn(softCard, "p-4 sm:p-6")}>
            <p className={eyebrowClass}>{t.home.quickActionsEyebrow}</p>
            <h3 className="mt-1 font-display text-lg text-foreground">{t.home.quickNavBold}</h3>
            <ul className="mt-3 space-y-1.5">
              {quickActions.map((a) => {
                const QIcon = a.icon;
                const inner = (
                  <>
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#6C4DF6]/25 text-[#001B3D]">
                      <QIcon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-foreground">{a.title}</span>
                        <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:text-foreground" />
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">{a.desc}</span>
                    </span>
                  </>
                );
                const rowClass =
                  "group flex w-full items-start gap-3 rounded-2xl border border-transparent p-2.5 text-left transition hover:border-[#001B3D]/10 hover:bg-[#6C4DF6]/10";
                if (a.kind === "add-client") {
                  return (
                    <li key={a.title}>
                      <button
                        type="button"
                        onClick={() => setAddClientOpen(true)}
                        className={rowClass}
                      >
                        {inner}
                      </button>
                    </li>
                  );
                }
                return (
                  <li key={a.title}>
                    <Link to={a.to} className={rowClass}>
                      {inner}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
