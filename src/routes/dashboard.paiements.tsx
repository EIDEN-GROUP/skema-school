import { buildMeta } from "@/lib/seo/metadata";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Search } from "lucide-react";
import { listPayments } from "@/lib/server-payments";
import { Sticker } from "@/components/skema/bits";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RTooltip } from "recharts";
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
import { useDashboardI18n } from "@/lib/landing-i18n";
import { usePagination, TablePagination } from "@/components/table-pagination";
import {
  softCard,
  softInput as inputClass,
  softSelectTrigger as selectTriggerClass,
  softSelectContent,
  dialogSurface,
  dashTooltip,
  labelClass,
  ghostPill,
  statusPill,
  STATUS_COLORS,
  renderPieLabel,
} from "@/lib/dash-ui";
import { track } from "@/lib/analytics";
import { amountBucket, paymentMethod, errorType } from "@/lib/analytics";

export const Route = createFileRoute("/dashboard/paiements")({
  head: () =>
    buildMeta({
      title: "Paiements · SKEMA",
      description: "Suivi des paiements des familles et des encaissements mensuels de l'école.",
      path: "/dashboard/paiements",
      noindex: true,
    }),
  component: CrmPaiementsPage,
});

type PaymentStatus = "paye" | "en_attente" | "retard" | "impaye";

const STATUS_LABEL: Record<PaymentStatus, string> = {
  paye: "Payé",
  en_attente: "En attente",
  retard: "Retard",
  impaye: "Impayé",
};

function dash(v: string) {
  return v.trim() === "" ? " " : v;
}

/** Badge d'envoi du reçu de paiement. */
function RecuBadge({ sent }: { sent: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide",
        sent ? "bg-[#6C4DF6]/30 text-[#0E6B62]" : "bg-muted text-foreground/70",
      )}
    >
      <span
        className={cn("h-1.5 w-1.5 shrink-0 rounded-full", sent ? "bg-[#17B3A6]" : "bg-current")}
        aria-hidden
      />
      {sent ? "Envoyé" : "Non envoyé"}
    </span>
  );
}

function CrmPaiementsPage() {
  const { t } = useDashboardI18n();
  const { data: rawPayments = [] } = useQuery({ queryKey: ["payments"], queryFn: listPayments });
  const [search, setSearch] = useState("");
  const [month, setMonth] = useState("tous");
  const [modeFilter, setModeFilter] = useState("tous");
  const [recuFilter, setRecuFilter] = useState("tous");
  const [detailId, setDetailId] = useState<string | null>(null);

  // Build months from data
  const dbPayments = rawPayments as unknown as DbPayment[];
  const allPeriods = useMemo(() => {
    const set = new Set<string>();
    dbPayments.forEach((p) => {
      if (p.period) set.add(p.period);
    });
    return Array.from(set).sort();
  }, [dbPayments]);
  const monthLabel = month === "tous" ? "Tous les mois" : month;

  // Lignes du mois sélectionné
  const monthRows = useMemo(() => {
    if (month === "tous") return dbPayments;
    return dbPayments.filter((r) => r.period === month);
  }, [dbPayments, month]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return monthRows.filter((r) => {
      if (modeFilter !== "tous" && r.mode?.toLowerCase() !== modeFilter.toLowerCase()) return false;
      if (recuFilter === "envoye" && !r.invoice_sent) return false;
      if (recuFilter === "non_envoye" && r.invoice_sent) return false;
      if (!q) return true;
      const blob =
        `${r.clients?.parent_name ?? ""} ${r.clients?.child_name ?? ""} ${r.id} ${r.clients?.level ?? ""}`.toLowerCase();
      return blob.includes(q);
    });
  }, [monthRows, search, modeFilter, recuFilter]);

  // 5 paiements par page ; tout changement de filtre renvoie en page 1.
  const pager = usePagination(filtered, `${month}|${search}|${modeFilter}|${recuFilter}`);

  // Répartition par mode de paiement (pour le graphique)
  const donut = useMemo(() => {
    const counts: Record<string, number> = {};
    const amounts: Record<string, number> = {};
    monthRows.forEach((r) => {
      const k = r.mode ?? "autre";
      counts[k] = (counts[k] ?? 0) + 1;
      amounts[k] = (amounts[k] ?? 0) + r.amount;
    });
    const colors = ["#17B3A6", "#001B3D", "#E0A030", "#D93A41", "#17B3A6"];
    return Object.entries(counts).map(([key, value], i) => ({
      key,
      name: key,
      value,
      montant: amounts[key] ?? 0,
      color: colors[i % colors.length],
    }));
  }, [monthRows]);

  const donutTotal = donut.reduce((s, d) => s + d.value, 0);
  const encaisse = donut.reduce((s, d) => s + d.montant, 0);

  const detail = detailId ? (dbPayments.find((r) => r.id === detailId) ?? null) : null;

  function exportCsv(lines: DbPayment[]) {
    track("payments_exported", { rows: lines.length, format: "csv" });
    const header = [
      t.paiements.table.parent,
      "Élève",
      "Niveau",
      "Email",
      `${t.paiements.table.amount} (${t.common.mad})`,
      t.paiements.table.date,
      t.paiements.table.mode,
      t.paiements.table.period,
      "N° de reçu",
      "Reçu de paiement",
    ];
    const body = lines.map((r) =>
      [
        r.clients?.parent_name ?? "",
        r.clients?.child_name ?? "",
        r.clients?.level ?? "",
        r.clients?.email ?? "",
        String(r.amount),
        r.date,
        r.mode ?? "",
        r.period ?? "",
        r.id.slice(0, 8),
        r.invoice_sent ? "Envoyé" : "Non envoyé",
      ]
        .map((c) => `"${String(c).replace(/"/g, '""')}"`)
        .join(","),
    );
    const csv = [header.join(","), ...body].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = t.paiements.csvFilename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <header className="relative flex flex-wrap items-end justify-between gap-4">
        <Sticker
          name="coinStack"
          tilt={-6}
          className="pointer-events-none absolute -top-2 right-0 hidden w-16 opacity-90 sm:block"
        />
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {t.paiements.eyebrow}
          </p>
          <h1 className="font-hand mt-1 text-4xl tracking-tight text-foreground md:text-5xl">
            {t.paiements.titleBold}{" "}
            <span className="italic text-muted-foreground">{t.paiements.titleItalic}</span>
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Suivi mensuel des encaissements cliquez une ligne pour ouvrir le détail du paiement.
          </p>
        </div>
        <button type="button" onClick={() => exportCsv(filtered)} className={ghostPill}>
          <Download className="h-4 w-4" />
          {t.common.export}
        </button>
      </header>

      {/* Filtres (barre pleine largeur) puis l'analyse circulaire */}
      <div className="space-y-4">
        <section className={cn(softCard, "p-5")}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Filtres vue mensuelle
          </p>
          <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end">
            <div className="relative lg:flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t.paiements.searchPlaceholder}
                className={cn(inputClass, "pl-10")}
                aria-label={t.paiements.searchAria}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3 lg:flex lg:gap-3">
              <div className="lg:w-44">
                <Label className={labelClass}>Mois</Label>
                <Select value={month} onValueChange={setMonth}>
                  <SelectTrigger
                    className={cn(selectTriggerClass, "mt-1.5")}
                    aria-label="Filtrer par mois"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={softSelectContent}>
                    <SelectItem value="tous">Tous les mois</SelectItem>
                    {allPeriods.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="lg:w-44">
                <Label className={labelClass}>Mode de paiement</Label>
                <Select
                  value={modeFilter}
                  onValueChange={(v) => {
                    setModeFilter(v);
                    track("payment_status_filtered", { filter_type: "mode" });
                  }}
                >
                  <SelectTrigger
                    className={cn(selectTriggerClass, "mt-1.5")}
                    aria-label={t.paiements.paymentModeAria}
                  >
                    <SelectValue placeholder={t.common.allModes} />
                  </SelectTrigger>
                  <SelectContent className={softSelectContent}>
                    <SelectItem value="tous">{t.common.allModes}</SelectItem>
                    <SelectItem value="espèces">{t.form.paymentModes.cash}</SelectItem>
                    <SelectItem value="virement">{t.form.paymentModes.transfer}</SelectItem>
                    <SelectItem value="carte">{t.form.paymentModes.card}</SelectItem>
                    <SelectItem value="chèque">{t.form.paymentModes.check}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="lg:w-44">
                <Label className={labelClass}>Reçu de paiement</Label>
                <Select
                  value={recuFilter}
                  onValueChange={(v) => {
                    setRecuFilter(v);
                    track("payment_status_filtered", { filter_type: "recu" });
                  }}
                >
                  <SelectTrigger
                    className={cn(selectTriggerClass, "mt-1.5")}
                    aria-label="Filtrer par reçu de paiement"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={softSelectContent}>
                    <SelectItem value="tous">Tous les reçus</SelectItem>
                    <SelectItem value="non_envoye">Non envoyé</SelectItem>
                    <SelectItem value="envoye">Envoyé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-xs text-muted-foreground lg:whitespace-nowrap lg:pb-2.5">
              {filtered.length} paiement{filtered.length > 1 ? "s" : ""} ·{" "}
              {encaisse.toLocaleString("fr-FR")} {t.common.mad} encaissés
            </p>
          </div>
        </section>

        {/* Camembert plein   part de chaque mode de paiement, % inscrit dans la part */}
        <section className={cn(softCard, "p-5")}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Analyse {monthLabel}
          </p>
          <div className="mt-2 flex flex-col items-center gap-6 lg:flex-row lg:items-center">
            <div className="h-48 w-full max-w-[15rem] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donut}
                    dataKey="value"
                    nameKey="name"
                    outerRadius="95%"
                    stroke="none"
                    labelLine={false}
                    label={renderPieLabel}
                  >
                    {donut.map((d) => (
                      <Cell key={d.key} fill={d.color} />
                    ))}
                  </Pie>
                  <RTooltip
                    contentStyle={dashTooltip}
                    formatter={(v: number, n) => [`${v} paiement${v > 1 ? "s" : ""}`, n]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="grid w-full gap-1.5 sm:grid-cols-2 lg:flex-1">
              {donut.map((d) => (
                <li
                  key={d.key}
                  className="flex items-center justify-between gap-2 rounded-full bg-muted/60 px-3 py-1.5 text-xs"
                >
                  <span className="flex items-center gap-2 font-medium text-foreground">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: d.color }}
                    />
                    {d.name}
                  </span>
                  <span className="font-semibold tabular-nums text-foreground">
                    {d.value} · {d.montant.toLocaleString("fr-FR")} {t.common.mad}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>

      <section className={cn(softCard, "overflow-hidden")}>
        <div className="overflow-x-auto">
          {/* Même grille que le tableau Familles : filet vertical posé au niveau du
              tableau, pour qu'une colonne ajoutée l'hérite sans oubli. */}
          <table
            className={cn(
              "w-full min-w-[820px] text-left text-sm",
              "[&_th]:border-r [&_th]:border-[#001B3D]/15",
              "[&_td]:border-r [&_td]:border-[#001B3D]/8",
            )}
          >
            {/* Alignement : texte à gauche, montant à droite en chiffres tabulaires,
                badges centrés. Élève et Niveau restent dans la recherche, l'export
                CSV et la fiche détail   seules les colonnes sont retirées. */}
            <thead>
              <tr className="border-b border-[#001B3D]/15 bg-muted/60 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="whitespace-nowrap px-4 py-3.5">{t.paiements.table.parent}</th>
                <th className="whitespace-nowrap px-4 py-3.5 text-right">
                  {t.paiements.table.amount}
                </th>
                <th className="whitespace-nowrap px-4 py-3.5">{t.paiements.table.date}</th>
                <th className="whitespace-nowrap px-4 py-3.5 text-center">
                  {t.paiements.table.mode}
                </th>
                <th className="whitespace-nowrap px-4 py-3.5 text-center">Statut</th>
                <th className="whitespace-nowrap px-4 py-3.5">N° de reçu</th>
                <th className="whitespace-nowrap px-4 py-3.5 text-center">Reçu de paiement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#001B3D]/8">
              {pager.pageItems.map((r) => {
                const c = r.clients;
                const status = c?.payment_status as PaymentStatus | undefined;
                // Rappel visuel du statut en tête de ligne : payé / impayé / en
                // retard se repèrent sans traverser jusqu'à la colonne Statut.
                // Sans statut connu, pas de filet coloré plutôt qu'une couleur
                // arbitraire   la largeur reste réservée, l'alignement tient.
                const accent = status ? STATUS_COLORS[status] : "transparent";
                return (
                  <tr
                    key={r.id}
                    onClick={() => setDetailId(r.id)}
                    className="cursor-pointer transition-colors hover:bg-[#6C4DF6]/10"
                  >
                    <td
                      className="border-l-[3px] px-4 py-3.5 font-medium text-foreground"
                      style={{ borderLeftColor: accent }}
                    >
                      {c?.parent_name ?? ""}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-right font-semibold tabular-nums text-foreground">
                      {r.amount} {t.common.mad}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 tabular-nums text-foreground/90">
                      {dash(r.date)}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#001B3D]/8 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#001B3D]">
                        <span
                          className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#001B3D]"
                          aria-hidden
                        />
                        {r.mode ?? "ESPÈCES"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {status ? (
                        <span className={statusPill(status)}>{STATUS_LABEL[status]}</span>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 font-mono text-xs text-foreground/90">
                      {r.id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <RecuBadge sent={r.invoice_sent} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">
            {t.paiements.noMatch}
          </p>
        ) : null}
        <TablePagination
          page={pager.page}
          pageCount={pager.pageCount}
          total={pager.total}
          pageSize={pager.pageSize}
          onPage={pager.setPage}
          label={pager.total > 1 ? "paiements" : "paiement"}
        />
      </section>

      {detail ? (
        <PaymentDetailDialog
          row={detail}
          open={!!detailId}
          onOpenChange={(o) => !o && setDetailId(null)}
        />
      ) : null}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <p className={labelClass}>{label}</p>
      <p className="text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function PaymentDetailDialog({
  row,
  open,
  onOpenChange,
}: {
  row: DbPayment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useDashboardI18n();
  const c = row.clients;
  const status = c?.payment_status as PaymentStatus | undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(dialogSurface, "w-[min(100vw-1.5rem,640px)] max-w-[640px]")}>
        <DialogDescription className="sr-only">
          Détail du paiement {row.id.slice(0, 8)}
        </DialogDescription>
        <div className="flex min-h-0 flex-1 flex-col border-t-4 border-t-[#6C4DF6]">
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[#001B3D]/10 px-6 pb-4 pt-6 pr-14">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Paiement
              </p>
              <DialogTitle className="mt-1 text-left font-display text-xl font-semibold tracking-tight text-foreground">
                {c?.parent_name ?? ""}{" "}
                <span className="font-normal text-muted-foreground">· {c?.child_name ?? ""}</span>
              </DialogTitle>
            </div>
            {status ? <span className={statusPill(status)}>{STATUS_LABEL[status]}</span> : null}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto scroll-touch px-6 py-5">
            <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              <InfoRow label="Élève" value={c?.child_name ?? ""} />
              <InfoRow label="Niveau" value={c?.level ?? ""} />
              <InfoRow label="Email du parent" value={dash(c?.email ?? "")} />
              <InfoRow label="Téléphone" value={dash(c?.phone ?? "")} />

              <InfoRow label="Montant réglé" value={`${row.amount} ${t.common.mad}`} />
              <InfoRow label="Mode de paiement" value={row.mode ?? "ESPÈCES"} />
              <InfoRow label="Date de paiement" value={dash(row.date)} />
              <InfoRow label="Période" value={row.period ?? ""} />
              <InfoRow label="N° de reçu" value={row.id.slice(0, 8)} />
              <div className="space-y-0.5">
                <p className={labelClass}>Reçu de paiement</p>
                <div className="pt-0.5">
                  <RecuBadge sent={row.invoice_sent} />
                </div>
              </div>

              <div className="sm:col-span-2">
                <p className={labelClass}>Services facturés</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {(c?.subscribed_services ?? []).length === 0 ? (
                    <span className="text-sm text-muted-foreground">Aucun service</span>
                  ) : (
                    c?.subscribed_services?.map((s) => (
                      <span
                        key={s}
                        className="inline-flex items-center rounded-full bg-[#001B3D]/8 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#001B3D]"
                      >
                        {s}
                      </span>
                    ))
                  )}
                </div>
              </div>

              {row.notes ? (
                <div className="sm:col-span-2">
                  <p className={labelClass}>Note</p>
                  <p className="mt-1 text-sm text-foreground/90">{row.notes}</p>
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-[#001B3D]/10 px-6 py-4">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-full border border-[#001B3D]/15 bg-card px-5 py-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              {t.common.close}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
