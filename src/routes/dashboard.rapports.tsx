import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useId, useMemo, useState } from "react";
import { CheckCircle2, Search, Users, XCircle } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { interpolate, useDashboardI18n } from "@/lib/landing-i18n";
import { softCard, dashTooltip } from "@/lib/dash-ui";

const CHART_VALUES = [4, 7, 6, 3, 9, 12, 11];

type DemoFamily = {
  id: string;
  parent: string;
  child: string;
  email: string;
  phone: string;
  remarque: string;
};

const CHILD_NAMES = [
  "Yasmine",
  "Mehdi",
  "Sara",
  "Adam",
  "Lina",
  "Youssef",
  "Imane",
  "Rayan",
  "Salma",
  "Anas",
] as const;

const EXTRA_PAYE_SURNAMES = [
  "Amrani",
  "Chraibi",
  "Lahlou",
  "Berrada",
  "Mouline",
  "Ouazzani",
  "Sefrioui",
  "Zerhouni",
  "El Mansouri",
  "Bennani",
  "Cherkaoui",
  "Filali",
  "Hakimi",
  "Jabri",
  "Kettani",
  "Lamrani",
  "Nasri",
  "Ouahbi",
  "Rahmani",
  "Sabri",
  "Tahiri",
  "Zaïdi",
] as const;

const EXTRA_IMPAYE_SURNAMES = [
  "Abbassi",
  "Bouazza",
  "Dahmani",
  "El Idrissi",
  "Fikri",
  "Ghazi",
  "Hamidi",
  "Ibrahimi",
  "Jaafari",
  "Kabbaj",
  "Laâroussi",
  "Mahfoud",
  "Naciri",
  "Oualid",
  "Radi",
  "Saïdi",
  "Temsamani",
  "Umar",
  "Wahbi",
  "Yata",
] as const;

const IMPAYE_REMARQUES = [
  "Aucun règlement enregistré",
  "Dette 1 200 MAD   en retard",
  "Échéance dépassée (15 j.)",
  "Dette 800 MAD",
  "Paiement partiel   solde ouvert",
  "Relance envoyée   sans réponse",
  "Dette 2 400 MAD",
  "Mois en cours non réglé",
  "Dette 450 MAD",
  "Prélevé en erreur   à régulariser",
  "Dette 1 600 MAD   en retard",
  "Aucun mandat actif",
  "Dette 300 MAD",
  "Contrat suspendu   impayé",
  "Dette 950 MAD",
  "Deux mois impayés",
  "Dette 1 100 MAD",
  "En attente de virement",
  "Dette 720 MAD",
  "Justificatif manquant",
] as const;

function slug(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function buildFamillesPayees(): DemoFamily[] {
  const core: DemoFamily[] = [
    {
      id: "2",
      parent: "Famille Alami",
      child: "Yasmine",
      email: "contact.alami@example.com",
      phone: "0661122334",
      remarque: "Paiement à jour",
    },
    {
      id: "4",
      parent: "Tazi / Mehdi",
      child: "Mehdi",
      email: "mehdi.parent@example.com",
      phone: "0622334455",
      remarque: "Paiement à jour",
    },
  ];
  const extra = EXTRA_PAYE_SURNAMES.map((name, i) => ({
    id: `paye-gen-${i}`,
    parent: `Famille ${name}`,
    child: CHILD_NAMES[i % CHILD_NAMES.length],
    email: `famille.${slug(name)}@demo-crm.ma`,
    phone: `06${String(21000000 + i * 91357).padStart(8, "0").slice(0, 8)}`,
    remarque: "Paiement à jour",
  }));
  return [...core, ...extra];
}

function buildFamillesImpayees(): DemoFamily[] {
  const core: DemoFamily[] = [
    {
      id: "1",
      parent: "rztest / testss",
      child: "testss",
      email: "tehgdgh@test.com",
      phone: "0614020520",
      remarque: "Aucun règlement enregistré",
    },
    {
      id: "3",
      parent: "Benjelloun / Sara",
      child: "Sara",
      email: "sara.b@example.com",
      phone: "0611223344",
      remarque: "Dette 1 200 MAD   en retard",
    },
  ];
  const extra = EXTRA_IMPAYE_SURNAMES.map((name, i) => ({
    id: `impaye-gen-${i}`,
    parent: `Famille ${name}`,
    child: CHILD_NAMES[(i + 3) % CHILD_NAMES.length],
    email: `impaye.${slug(name)}@demo-crm.ma`,
    phone: `06${String(31000000 + i * 71717).padStart(8, "0").slice(0, 8)}`,
    remarque: IMPAYE_REMARQUES[i % IMPAYE_REMARQUES.length],
  }));
  return [...core, ...extra];
}

const FAMILLES_PAYEES = buildFamillesPayees();
const FAMILLES_IMPAYEES = buildFamillesImpayees();

const TOTAL_PAYE = FAMILLES_PAYEES.length;
const TOTAL_IMPAYE = FAMILLES_IMPAYEES.length;
const TOTAL_FAMILLES_RAPPORTS = TOTAL_PAYE + TOTAL_IMPAYE;

const chartTooltip = dashTooltip;

/** Même enveloppe que `NouveauClientModal` (dashboard.index)   min-w-0 pour scroll horizontal des tableaux sur mobile */
const listeDialogContent = cn(
  "paper flex min-w-0 flex-col gap-0 overflow-hidden rounded-[26px] border border-nuit/8 p-0",
  "max-h-[min(90vh,860px)] w-[min(100vw-1.5rem,640px)] max-w-[min(100vw-1.5rem,640px)] translate-y-[-50%] sm:max-w-[640px]",
  "[&>button]:right-5 [&>button]:top-5 [&>button]:rounded-full [&>button]:border [&>button]:border-nuit/12 [&>button]:bg-papier [&>button]:opacity-100 [&>button]:hover:bg-gris-clair [&>button]:focus:ring-0 [&>button]:focus:ring-offset-0",
);

const cardClass =
  "paper relative block w-full overflow-hidden rounded-[22px] border border-nuit/8 p-5 text-left outline-none transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border-t-4";

const listeSearchInputClass =
  "h-10 rounded-xl border-[#001B3D]/15 bg-card shadow-none focus-visible:border-[#17B3A6] focus-visible:ring-2 focus-visible:ring-[#6C4DF6]/40";

function ListeFamillesModal({
  open,
  onOpenChange,
  title,
  eyebrow,
  rows,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  eyebrow: string;
  rows: DemoFamily[];
}) {
  const { t } = useDashboardI18n();
  const r = t.rapports;
  const searchFieldId = useId();
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
      const hay = [row.parent, row.child, row.email, row.phone, row.remarque].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [rows, query]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={listeDialogContent}>
        <DialogDescription className="sr-only min-w-0">{r.modalSrDesc}</DialogDescription>
        <div className="flex min-h-0 min-w-0 max-w-full flex-1 flex-col border-t-4 border-t-primary">
          <div className="border-b border-border px-6 pb-4 pt-6 pr-14">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">{eyebrow}</p>
            <DialogTitle className="mt-2 text-left font-display text-xl font-semibold tracking-tight text-foreground">
              {title}
            </DialogTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              {query.trim() ? (
                <>
                  {filtered.length === 1
                    ? interpolate(r.resultsOnTotal, { filtered: filtered.length, total: rows.length })
                    : interpolate(r.resultsOnTotalPlural, { filtered: filtered.length, total: rows.length })}
                </>
              ) : (
                <>
                  {rows.length === 1
                    ? r.familiesDemoOne
                    : interpolate(r.familiesDemoMany, { count: rows.length })}
                </>
              )}
            </p>
          </div>
          <div className="border-b border-border px-6 py-3">
            <label htmlFor={searchFieldId} className="sr-only">
              {r.searchInList}
            </label>
            <div className="relative min-w-0">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70"
                aria-hidden
              />
              <Input
                id={searchFieldId}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={r.searchPlaceholder}
                className={cn(listeSearchInputClass, "pl-10")}
                autoComplete="off"
              />
            </div>
          </div>
          <div className="min-h-0 min-w-0 w-full max-w-full flex-1 overflow-x-auto overflow-y-auto scroll-touch border-b border-border">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="sticky top-0 z-10 border-b border-border bg-muted text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">{t.common.parent}</th>
                  <th className="px-4 py-3">{t.common.child}</th>
                  <th className="px-4 py-3">{t.common.contact}</th>
                  <th className="px-4 py-3">{t.common.situation}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      {r.noSearchMatch}
                    </td>
                  </tr>
                ) : (
                  filtered.map((row) => (
                    <tr key={row.id} className="hover:bg-muted/80">
                      <td className="px-4 py-3 font-medium text-foreground">{row.parent}</td>
                      <td className="px-4 py-3 text-foreground/90">{row.child}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        <span className="block">{row.email}</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">{row.phone}</span>
                      </td>
                      <td className="max-w-[11rem] px-4 py-3 text-xs leading-snug text-muted-foreground">{row.remarque}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RapportsPage() {
  const { t } = useDashboardI18n();
  const r = t.rapports;
  const [modal, setModal] = useState<null | "paye" | "en_attente">(null);

  const chartData = useMemo(
    () => r.months.map((m, i) => ({ m, v: CHART_VALUES[i] ?? 0 })),
    [r.months],
  );

  return (
    <div className="space-y-8">
      <ListeFamillesModal
        open={modal === "paye"}
        onOpenChange={(o) => !o && setModal(null)}
        eyebrow={r.modalEyebrow}
        title={r.modalPaidTitle}
        rows={FAMILLES_PAYEES}
      />
      <ListeFamillesModal
        open={modal === "en_attente"}
        onOpenChange={(o) => !o && setModal(null)}
        eyebrow={r.modalEyebrow}
        title={r.modalUnpaidTitle}
        rows={FAMILLES_IMPAYEES}
      />

      <header className="space-y-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">{r.eyebrow}</p>
        <div>
          <h1 className="font-display text-3xl md:text-[2.35rem] leading-tight tracking-tight text-foreground">
            <span className="font-semibold">{r.titleBold}</span>{" "}
            <span className="font-normal italic text-muted-foreground">{r.titleItalic}</span>
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{r.subtitle}</p>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <div
          className={cn(
            cardClass,
            "border-t-primary sm:col-span-2 xl:col-span-1",
            "cursor-default hover:border-border hover:bg-card",
          )}
        >
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{r.summary}</p>
          <div className="mt-3 flex flex-wrap items-end gap-x-6 gap-y-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{r.paid}</p>
              <p className="font-display text-2xl font-semibold tracking-tight text-foreground tabular-nums">{TOTAL_PAYE}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{r.unpaid}</p>
              <p className="font-display text-2xl font-semibold tracking-tight text-foreground tabular-nums">{TOTAL_IMPAYE}</p>
            </div>
            <div className="min-w-[6rem] border-l border-border pl-6">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{r.totalFamilies}</p>
              <p className="font-display text-3xl font-semibold tracking-tight text-foreground tabular-nums">{TOTAL_FAMILLES_RAPPORTS}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3">
            <p className="text-xs text-muted-foreground">{r.summaryNote}</p>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#001B3D]/8 text-[#001B3D]" aria-hidden>
              <Users className="h-5 w-5" />
            </span>
          </div>
        </div>

        <button type="button" onClick={() => setModal("paye")} className={cn(cardClass, "border-t-chart-4")}>
          <p className="pr-14 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{r.paidCard}</p>
          <div className="mt-3 flex items-start justify-between gap-3">
            <p className="font-display text-3xl font-semibold tracking-tight text-foreground">{TOTAL_PAYE}</p>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#001B3D]/8 text-[#001B3D]">
              <CheckCircle2 className="h-5 w-5" aria-hidden />
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{r.paidDesc}</p>
        </button>

        <button type="button" onClick={() => setModal("en_attente")} className={cn(cardClass, "border-t-chart-3")}>
          <p className="pr-14 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{r.unpaidCard}</p>
          <div className="mt-3 flex items-start justify-between gap-3">
            <p className="font-display text-3xl font-semibold tracking-tight text-foreground">{TOTAL_IMPAYE}</p>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#FFF3E6] text-[#B5760E]">
              <XCircle className="h-5 w-5" aria-hidden />
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{r.unpaidDesc}</p>
        </button>

        
      </div>

      <div className={cn(softCard, "p-6")}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{t.common.chart}</p>
        <h2 className="mt-1 font-display text-xl text-foreground">
          {r.chartTitleBold} <span className="font-normal italic text-muted-foreground">{r.chartTitleItalic}</span>
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">{r.chartSubtitle}</p>
        <div className="mt-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(40,57,108,0.10)" vertical={false} />
              <XAxis dataKey="m" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={chartTooltip} cursor={{ fill: "rgba(181,225,139,0.18)" }} />
              <Bar dataKey="v" fill="#001B3D" radius={[8, 8, 0, 0]} maxBarSize={38} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/dashboard/rapports")({
  head: () => ({ meta: [{ title: "Rapports   CRM" }] }),
  component: RapportsPage,
});
