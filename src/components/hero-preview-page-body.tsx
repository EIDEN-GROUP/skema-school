import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowUp,
  ArrowDown,
  ArrowUpRight,
  Pencil,
  Plus,
  Search,
  Send,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { CartesianGrid, Bar, Cell, ComposedChart, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useDashboardI18n, useLandingI18n } from "@/lib/landing-i18n";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/dash-ui";
import {
  MIRROR_PAGE_SIZE,
  mirrorCalendar,
  mirrorClients,
  mirrorDashboardMetrics,
  mirrorEmployes,
  mirrorLastPayments,
  mirrorLevelSplit,
  mirrorLevelSplitTotal,
  mirrorPaymentModes,
  mirrorPaymentRows,
  mirrorPaymentsEncaisse,
  mirrorPendingDues,
  mirrorPendingTotal,
  mirrorServiceRevenue,
  mirrorServiceRevenueTotal,
  mirrorSettingsSections,
  mirrorStatKpis,
  mirrorStatSeries,
  type DashboardMiniaturePageId,
} from "@/lib/dashboard-mirror-data";

// Rounded tooltip matching the real dashboard shot.
const shotTooltip = {
  background: "var(--card)",
  border: "1px solid rgba(40,57,108,0.15)",
  borderRadius: 10,
  color: "var(--foreground)",
  fontSize: 11,
} as const;

export function HeroPreviewPageBody({
  page,
  showLocked,
}: {
  page: DashboardMiniaturePageId;
  showLocked: (msg: string) => void;
}) {
  const { t } = useDashboardI18n();
  const { t: tl } = useLandingI18n();
  const pv = tl.preview;

  /** Pied « 1–N sur N » des tableaux paginés (5 lignes/page sur le vrai dashboard). */
  const pagerFooter = (total: number, label: string) => (
    <div className="flex shrink-0 items-center justify-between gap-2 border-t border-[#001B3D]/10 px-2.5 py-1.5">
      <p className="text-[7px] tabular-nums text-[#4B5563] sm:text-[8px]">
        1–{Math.min(MIRROR_PAGE_SIZE, total)} sur {total} {label}
      </p>
      <div className="flex items-center gap-1">
        <span className="grid h-4 w-4 place-items-center rounded-full border border-[#001B3D]/15 text-[7px] text-[#4B5563]">‹</span>
        <span className="text-[7px] font-semibold tabular-nums text-[#001B3D] sm:text-[8px]">
          Page 1 / {Math.max(1, Math.ceil(total / MIRROR_PAGE_SIZE))}
        </span>
        <span className="grid h-4 w-4 place-items-center rounded-full border border-[#001B3D]/15 text-[7px] text-[#4B5563]">›</span>
      </div>
    </div>
  );

  switch (page) {
    case "dashboard":
      return (
        <div className="flex h-full min-h-0 flex-col gap-2 overflow-y-auto overscroll-contain text-[#001B3D]">
          {/* Header */}
          <div className="flex shrink-0 items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[9px] font-medium uppercase tracking-[0.2em] text-[#4B5563]">{t.home.eyebrow}</p>
              <p className="mt-0.5 font-display text-sm font-semibold leading-tight sm:text-base">
                <span className="font-semibold">{t.home.titleBold}</span>{" "}
                <span className="font-normal italic text-[#4B5563]">{t.home.titleItalic}</span>
              </p>
              <p className="mt-0.5 truncate text-[9px] text-[#4B5563] sm:text-[10px]">{t.home.subtitle}</p>
            </div>
            <button
              type="button"
              onClick={() => showLocked(pv.locked.addClient)}
              className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#6C4DF6] px-2.5 py-1.5 text-[9px] font-bold text-[#001B3D] shadow-sm sm:text-[10px]"
            >
              <Plus className="h-3 w-3" />
              <span className="hidden sm:inline">{t.home.quickActions.addClient.title}</span>
            </button>
          </div>

          {/* 4 status cards   total familles / payé / en retard / impayé */}
          <div className="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-4">
            {mirrorDashboardMetrics.map((card) => (
              <Link
                key={card.k}
                to={card.to}
                onClick={(e) => {
                  e.preventDefault();
                  showLocked(pv.locked.openCard);
                }}
                className="relative block overflow-hidden rounded-2xl border border-[#001B3D]/10 bg-white p-2.5 text-left text-inherit no-underline shadow-[0_10px_25px_-20px_rgba(40,57,108,0.5)]"
              >
                <div className="flex items-start justify-between gap-1">
                  <p className="text-[8px] font-medium uppercase tracking-wider text-[#4B5563] sm:text-[9px]">{card.label}</p>
                  <span
                    className="grid h-6 w-6 shrink-0 place-items-center rounded-xl"
                    style={{ backgroundColor: card.tint, color: card.accent }}
                  >
                    <card.icon className="h-3 w-3" />
                  </span>
                </div>
                <p className="mt-1.5 font-display text-lg font-semibold leading-none tracking-tight sm:text-xl">{card.value}</p>
                <p className="mt-1 text-[8px] text-[#4B5563] sm:text-[9px]">{card.sub}</p>
                {/* Analyse express sur la carte Impayé   cf. dashboard.index */}
                {card.extra ? (
                  <p
                    className="mt-1.5 inline-flex rounded-full px-1.5 py-0.5 text-[7px] font-semibold tabular-nums sm:text-[8px]"
                    style={{ backgroundColor: card.tint, color: card.accent }}
                  >
                    {card.extra}
                  </p>
                ) : null}
                <span className="mt-2 block h-1 w-8 rounded-full" style={{ backgroundColor: card.accent }} />
              </Link>
            ))}
          </div>

          {/* Statistique générale   barres (encaissé) + courbe (paiements) + colonne KPI */}
          <div className="shrink-0 overflow-hidden rounded-2xl border border-[#001B3D]/10 bg-white shadow-[0_14px_30px_-24px_rgba(40,57,108,0.5)]">
            <div className="grid sm:grid-cols-[minmax(0,1fr)_9rem]">
              <div className="min-w-0 p-2.5 sm:p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[8px] font-semibold uppercase tracking-[0.18em] text-[#4B5563] sm:text-[9px]">Vue d'ensemble</p>
                    <h2 className="mt-0.5 font-display text-xs text-[#001B3D] sm:text-sm">
                      Statistique <span className="font-normal italic text-[#4B5563]">générale</span>
                    </h2>
                  </div>
                  <span className="rounded-lg border border-[#001B3D]/10 bg-muted/60 px-2 py-0.5 text-[8px] font-medium text-[#4B5563] sm:text-[9px]">2026</span>
                </div>
                <div className="mt-2 h-[6.5rem] w-full min-w-0 sm:h-[7.5rem]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={mirrorStatSeries} margin={{ top: 6, right: 4, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(40,57,108,0.08)" vertical={false} />
                      <XAxis dataKey="mois" stroke="var(--muted-foreground)" tick={{ fontSize: 8 }} tickLine={false} axisLine={false} />
                      <YAxis stroke="var(--muted-foreground)" tick={{ fontSize: 8 }} width={20} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={shotTooltip} cursor={{ fill: "rgba(181,225,139,0.16)" }} />
                      <Bar dataKey="encaisse" fill="#E8F1FF" radius={[4, 4, 0, 0]} maxBarSize={18} />
                      <Line type="monotone" dataKey="paiements" stroke="#001B3D" strokeWidth={2} dot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                <ul className="mt-2 flex flex-wrap gap-3">
                  <li className="inline-flex items-center gap-1.5 text-[8px] font-medium text-[#4B5563] sm:text-[9px]">
                    <span className="h-2 w-3 rounded-sm bg-[#E8F1FF]" /> Encaissé (k MAD)
                  </li>
                  <li className="inline-flex items-center gap-1.5 text-[8px] font-medium text-[#4B5563] sm:text-[9px]">
                    <span className="h-0.5 w-3.5 rounded-full bg-[#001B3D]" /> Paiements reçus
                  </li>
                </ul>
              </div>

              <ul className="grid grid-cols-2 border-t border-[#001B3D]/10 sm:grid-cols-1 sm:border-l sm:border-t-0 sm:divide-y sm:divide-[#001B3D]/10">
                {mirrorStatKpis.map((k) => (
                  <li key={k.label} className="border-b border-[#001B3D]/10 px-2.5 py-1.5 sm:border-b-0 sm:py-2">
                    <p className="truncate text-[8px] text-[#4B5563] sm:text-[9px]">{k.label}</p>
                    <div className="mt-0.5 flex items-end justify-between gap-1">
                      <p className="font-display text-sm font-semibold tabular-nums leading-none">{k.value}</p>
                      <span className={cn("inline-flex items-center gap-0.5 text-[8px] font-semibold sm:text-[9px]", k.up ? "text-[#0E6B62]" : "text-[#D93A41]")}>
                        {k.delta}
                        {k.up ? <ArrowUp className="h-2 w-2" /> : <ArrowDown className="h-2 w-2" />}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Derniers paiements + Relance rapide */}
          <div className="grid min-h-0 flex-1 gap-2 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
            <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-[#001B3D]/10 bg-white p-2.5 shadow-[0_14px_30px_-24px_rgba(40,57,108,0.5)]">
              <div className="flex shrink-0 items-center justify-between gap-2">
                <div>
                  <p className="text-[8px] font-semibold uppercase tracking-[0.18em] text-[#4B5563] sm:text-[9px]">Activité récente</p>
                  <h2 className="mt-0.5 font-display text-xs text-[#001B3D] sm:text-sm">Derniers paiements</h2>
                </div>
                <button
                  type="button"
                  onClick={() => showLocked(pv.locked.openCard)}
                  className="inline-flex items-center gap-1 text-[8px] font-semibold text-[#001B3D] sm:text-[9px]"
                >
                  Voir tout <ArrowUpRight className="h-3 w-3" />
                </button>
              </div>
              <ul className="mt-1.5 min-h-0 flex-1 divide-y divide-[#001B3D]/8 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
                {mirrorLastPayments.map((p) => (
                  <li key={p.who + p.note} className="flex items-center gap-2 py-1.5">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-[#001B3D]/8 text-[9px] font-bold text-[#001B3D]">
                      {initials(p.who)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[10px] font-medium leading-tight sm:text-[11px]">{p.who}</p>
                      <p className="truncate text-[8px] leading-tight text-[#4B5563] sm:text-[9px]">{p.note}</p>
                    </div>
                    <span className="shrink-0 text-[10px] font-semibold tabular-nums sm:text-[11px]">{p.amount} MAD</span>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-[7px] font-semibold uppercase tracking-wide sm:text-[8px]",
                        p.status === "paye"
                          ? "bg-[#6C4DF6]/30 text-[#0E6B62]"
                          : p.status === "retard"
                            ? "bg-[#FFE3E0] text-[#D93A41]"
                            : "bg-[#FFF3E6] text-[#B5760E]",
                      )}
                    >
                      {p.status === "paye" ? "Payé" : p.status === "retard" ? "En retard" : "Impayé"}
                    </span>
                  </li>
                ))}
              </ul>

              {/* Paiements en attente (Créances)   file de relance sous les derniers paiements */}
              <div className="mt-2 shrink-0 overflow-hidden rounded-2xl border border-[#001B3D]/10 bg-white">
                <div className="flex items-center justify-between gap-2 border-b border-[#001B3D]/10 px-2.5 py-1.5">
                  <div className="min-w-0">
                    <p className="text-[7px] font-semibold uppercase tracking-[0.18em] text-[#4B5563] sm:text-[8px]">Créances</p>
                    <h3 className="font-display text-[10px] text-[#001B3D] sm:text-[11px]">Paiements en attente</h3>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <span className="rounded-full bg-[#FFF3E6] px-1.5 py-0.5 text-[7px] font-semibold text-[#B5760E] sm:text-[8px]">
                      {mirrorPendingDues.length} familles
                    </span>
                    <span className="rounded-full bg-[#001B3D]/8 px-1.5 py-0.5 text-[7px] font-semibold tabular-nums text-[#001B3D] sm:text-[8px]">
                      {mirrorPendingTotal.toLocaleString("fr-FR")} MAD
                    </span>
                  </div>
                </div>
                <ul className="divide-y divide-[#001B3D]/8">
                  {mirrorPendingDues.map((d) => (
                    <li key={d.id} className="flex items-center gap-2 px-2.5 py-1.5">
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#001B3D]/8 text-[8px] font-bold text-[#001B3D]">
                        {initials(d.name)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <p className="truncate text-[9px] font-semibold leading-tight text-[#001B3D] sm:text-[10px]">{d.name}</p>
                          <span
                            className={cn(
                              "shrink-0 rounded-full px-1.5 py-0.5 text-[6px] font-semibold sm:text-[7px]",
                              d.status === "retard" && d.days > 14
                                ? "bg-[#FFE3E0] text-[#D93A41]"
                                : "bg-[#FFF3E6] text-[#B5760E]",
                            )}
                          >
                            {d.status === "retard" ? `${d.days}j de retard` : "En attente"}
                          </span>
                        </div>
                        <p className="truncate text-[7px] leading-tight text-[#4B5563] sm:text-[8px]">{d.level}</p>
                      </div>
                      <span className="shrink-0 text-[9px] font-semibold tabular-nums text-[#001B3D] sm:text-[10px]">
                        {d.amount.toLocaleString("fr-FR")} MAD
                      </span>
                      <button
                        type="button"
                        onClick={() => showLocked(pv.locked.openCard)}
                        className="inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[7px] font-semibold text-[#001B3D] sm:text-[8px]"
                      >
                        <Send className="h-2.5 w-2.5" /> Relancer
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Relance rapide teaser */}
            <div className="hidden overflow-hidden rounded-2xl border border-[#001B3D]/10 bg-[#001B3D] p-2.5 text-white shadow-[0_14px_30px_-24px_rgba(40,57,108,0.5)] lg:block">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[8px] font-semibold uppercase tracking-[0.18em] text-[#6C4DF6] sm:text-[9px]">Relance rapide</p>
                <TrendingUp className="h-3.5 w-3.5 text-[#6C4DF6]" />
              </div>
              <h4 className="mt-1 font-display text-xs font-semibold sm:text-sm">Rappel de paiement</h4>
              <div className="mt-2 flex items-center gap-1.5">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-dashed border-white/40 text-white/80">
                  <Plus className="h-3 w-3" />
                </span>
                {["Karim Alami / Nadia Alami", "Mehdi Tazi / Imane Tazi", "Youssef Benjelloun / Salma Benjelloun"].map((name) => (
                  <span
                    key={name}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#6C4DF6] text-[9px] font-bold text-[#001B3D] ring-2 ring-[#001B3D]"
                  >
                    {initials(name)}
                  </span>
                ))}
              </div>
              <button
                type="button"
                onClick={() => showLocked(pv.locked.openCard)}
                className="mt-2.5 inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-[#6C4DF6] px-3 py-2 text-[10px] font-bold text-[#001B3D]"
              >
                <Send className="h-3 w-3" />
                Envoyer le rappel
              </button>
            </div>
          </div>
        </div>
      );

    case "familles":
      return (
        <div className="flex h-full min-h-0 flex-col gap-2 overflow-y-auto overscroll-contain text-[#001B3D]">
          {/* Header */}
          <div className="flex shrink-0 items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[8px] font-medium uppercase tracking-[0.18em] text-[#4B5563] sm:text-[9px]">{t.familles.eyebrow}</p>
              <p className="mt-0.5 font-display text-sm font-semibold leading-tight sm:text-base">
                {t.familles.titleBold} <span className="font-normal italic text-[#4B5563]">{t.familles.titleItalic}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => showLocked(pv.locked.addClient)}
              className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#6C4DF6] px-2.5 py-1.5 text-[9px] font-bold text-[#001B3D] shadow-sm sm:text-[10px]"
            >
              <Plus className="h-3 w-3" />
              <span className="hidden sm:inline">{t.familles.addClient}</span>
            </button>
          </div>

          {/* Filtres + revenu par service + répartition par niveau   une seule rangée */}
          <div className="grid shrink-0 gap-2 sm:grid-cols-3">
            <div className="rounded-2xl border border-[#001B3D]/10 bg-white p-2 shadow-[0_10px_25px_-20px_rgba(40,57,108,0.5)]">
              <p className="text-[7px] font-semibold uppercase tracking-[0.2em] text-[#4B5563] sm:text-[8px]">Filtres</p>
              <div className="mt-1.5 flex items-center gap-1 rounded-lg border border-[#001B3D]/10 bg-[#001B3D]/5 px-1.5 py-1">
                <Search className="h-2.5 w-2.5 shrink-0 text-[#4B5563]" />
                <span className="text-[7px] text-[#4B5563] sm:text-[8px]">{pv.searchEllipsis}</span>
              </div>
              {["Tous les niveaux", "Tous les services"].map((f) => (
                <div key={f} className="mt-1 flex items-center justify-between rounded-lg border border-[#001B3D]/10 px-1.5 py-1">
                  <span className="text-[7px] text-[#4B5563] sm:text-[8px]">{f}</span>
                  <span className="text-[7px] text-[#4B5563]">▾</span>
                </div>
              ))}
              <p className="mt-1.5 text-[7px] text-[#4B5563] sm:text-[8px]">{mirrorClients.length} familles trouvées</p>
            </div>

            <div className="rounded-2xl border border-[#001B3D]/10 bg-white p-2 shadow-[0_10px_25px_-20px_rgba(40,57,108,0.5)]">
              <p className="text-[7px] font-semibold uppercase tracking-[0.2em] text-[#4B5563] sm:text-[8px]">Revenu par service</p>
              <div className="mx-auto mt-1 h-14 w-14">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={mirrorServiceRevenue as any} dataKey="value" nameKey="name" outerRadius="95%" stroke="none">
                      {mirrorServiceRevenue.map((d) => (
                        <Cell key={d.name} fill={d.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="mt-1 space-y-0.5">
                {mirrorServiceRevenue.map((d) => (
                  <li key={d.name} className="flex items-center justify-between gap-1 rounded-full bg-[#001B3D]/5 px-1.5 py-0.5">
                    <span className="flex min-w-0 items-center gap-1">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
                      <span className="truncate text-[6px] font-medium sm:text-[7px]">{d.name}</span>
                    </span>
                    <span className="shrink-0 text-[6px] font-semibold tabular-nums sm:text-[7px]">
                      {d.value.toLocaleString("fr-FR")} MAD
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-1 text-right text-[6px] font-semibold tabular-nums text-[#4B5563] sm:text-[7px]">
                {mirrorServiceRevenueTotal.toLocaleString("fr-FR")} MAD
              </p>
            </div>

            <div className="hidden rounded-2xl border border-[#001B3D]/10 bg-white p-2 shadow-[0_10px_25px_-20px_rgba(40,57,108,0.5)] sm:block">
              <p className="text-[7px] font-semibold uppercase tracking-[0.2em] text-[#4B5563] sm:text-[8px]">Répartition par niveau</p>
              <div className="mx-auto mt-1 h-14 w-14">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={mirrorLevelSplit as any} dataKey="value" nameKey="name" outerRadius="95%" stroke="none">
                      {mirrorLevelSplit.map((d) => (
                        <Cell key={d.name} fill={d.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="mt-1 space-y-0.5">
                {mirrorLevelSplit.map((d) => (
                  <li key={d.name} className="flex items-center justify-between gap-1 rounded-full bg-[#001B3D]/5 px-1.5 py-0.5">
                    <span className="flex min-w-0 items-center gap-1">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
                      <span className="truncate text-[6px] font-medium sm:text-[7px]">{d.name}</span>
                    </span>
                    <span className="shrink-0 text-[6px] font-semibold tabular-nums sm:text-[7px]">
                      {d.value} · {Math.round((d.value / mirrorLevelSplitTotal) * 100)}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Liste des clients   Parent · Élève(s) · Niveau · Services · Remise · Mensuel */}
          <div className="min-h-0 shrink-0 overflow-hidden rounded-2xl border border-[#001B3D]/10 bg-white shadow-[0_14px_30px_-24px_rgba(40,57,108,0.5)]">
            <div className="border-b border-[#001B3D]/10 px-2.5 py-1.5">
              <p className="text-[7px] font-semibold uppercase tracking-[0.2em] text-[#4B5563] sm:text-[8px]">
                {t.familles.clientList}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[330px] text-left text-[7px] sm:text-[8px]">
                <thead>
                  <tr className="border-b border-[#001B3D]/10 bg-[#001B3D]/5 text-[6px] font-semibold uppercase tracking-wider text-[#4B5563] sm:text-[7px]">
                    <th className="px-1.5 py-1">{t.familles.table.parent}</th>
                    <th className="px-1.5 py-1">Élève(s)</th>
                    <th className="px-1.5 py-1">Niveau</th>
                    <th className="px-1.5 py-1">Services</th>
                    <th className="px-1.5 py-1">Remise</th>
                    <th className="px-1.5 py-1">{t.familles.table.monthly}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#001B3D]/8">
                  {mirrorClients.map((c) => (
                    <tr key={c.id} className="hover:bg-[#6C4DF6]/10">
                      <td className="px-1.5 py-1 font-medium">{c.parent}</td>
                      <td className="px-1.5 py-1">
                        {c.eleves.map((e) => (
                          <span key={e} className="block font-medium leading-tight">{e}</span>
                        ))}
                      </td>
                      <td className="px-1.5 py-1 text-[#4B5563]">{c.niveau || " "}</td>
                      <td className="px-1.5 py-1">
                        {c.services.length === 0 ? (
                          <span className="text-[#4B5563]">Aucun</span>
                        ) : (
                          <span className="flex flex-wrap gap-0.5">
                            {c.services.map((s) => (
                              <span key={s} className="rounded-full bg-[#001B3D]/8 px-1 py-px text-[6px] font-semibold text-[#001B3D]">
                                {s.split(" ")[0]}
                              </span>
                            ))}
                          </span>
                        )}
                      </td>
                      <td className="px-1.5 py-1">
                        {c.remise > 0 ? (
                          <span className="rounded-full bg-[#6C4DF6]/30 px-1 py-px text-[6px] font-semibold text-[#0E6B62]">
                            {c.remise}%
                          </span>
                        ) : (
                          <span className="text-[#4B5563]"> </span>
                        )}
                      </td>
                      <td className="px-1.5 py-1 tabular-nums">
                        <span className="block font-semibold">{c.mensuel.toLocaleString("fr-FR")} MAD</span>
                        {/* Reflète le paiement, comme la colonne Mensuel réelle */}
                        {c.payment === "paye" ? (
                          <span className="block text-[6px] font-medium text-[#17B3A6]">Payé ce mois</span>
                        ) : (
                          <span className="block text-[6px] font-medium text-[#FF666B]">
                            Reste : {c.dette.toLocaleString("fr-FR")} MAD
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pagerFooter(mirrorClients.length, "familles")}
          </div>
        </div>
      );

    case "paiements":
      return (
        <div className="flex h-full min-h-0 flex-col gap-2 overflow-y-auto overscroll-contain text-[#001B3D]">
          {/* Header */}
          <div className="flex shrink-0 items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[8px] font-medium uppercase tracking-[0.18em] text-[#4B5563] sm:text-[9px]">{t.paiements.eyebrow}</p>
              <p className="mt-0.5 font-display text-sm font-semibold leading-tight sm:text-base">
                {t.paiements.titleBold} <span className="font-normal italic text-[#4B5563]">{t.paiements.titleItalic}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => showLocked(pv.locked.exportCsv)}
              className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[#001B3D]/15 bg-white px-2.5 py-1.5 text-[9px] font-semibold text-[#001B3D] shadow-sm sm:text-[10px]"
            >
              {t.common.export}
            </button>
          </div>

          {/* Filtres (mois / mode / reçu) + répartition par mode */}
          <div className="grid shrink-0 gap-2 sm:grid-cols-3">
            <div className="rounded-2xl border border-[#001B3D]/10 bg-white p-2 shadow-[0_10px_25px_-20px_rgba(40,57,108,0.5)] sm:col-span-2">
              <p className="text-[7px] font-semibold uppercase tracking-[0.2em] text-[#4B5563] sm:text-[8px]">
                {t.common.filtersAndSearch}
              </p>
              <div className="mt-1.5 flex items-center gap-1 rounded-lg border border-[#001B3D]/10 bg-[#001B3D]/5 px-1.5 py-1">
                <Search className="h-2.5 w-2.5 shrink-0 text-[#4B5563]" />
                <span className="text-[7px] text-[#4B5563] sm:text-[8px]">{pv.searchEllipsis}</span>
              </div>
              <div className="mt-1 grid grid-cols-3 gap-1">
                {["Tous les mois", "Tous les modes", "Tous les reçus"].map((f) => (
                  <div key={f} className="flex items-center justify-between rounded-lg border border-[#001B3D]/10 px-1.5 py-1">
                    <span className="truncate text-[6px] text-[#4B5563] sm:text-[7px]">{f}</span>
                    <span className="text-[6px] text-[#4B5563]">▾</span>
                  </div>
                ))}
              </div>
              <p className="mt-1.5 text-[7px] text-[#4B5563] sm:text-[8px]">
                {mirrorPaymentRows.length} paiements ·{" "}
                <span className="font-semibold tabular-nums text-[#001B3D]">
                  {mirrorPaymentsEncaisse.toLocaleString("fr-FR")} {t.common.mad}
                </span>{" "}
                encaissés
              </p>
            </div>

            <div className="rounded-2xl border border-[#001B3D]/10 bg-white p-2 shadow-[0_10px_25px_-20px_rgba(40,57,108,0.5)]">
              <p className="text-[7px] font-semibold uppercase tracking-[0.2em] text-[#4B5563] sm:text-[8px]">Répartition par mode</p>
              <div className="mx-auto mt-1 h-14 w-14">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={mirrorPaymentModes as any} dataKey="value" nameKey="name" outerRadius="95%" stroke="none">
                      {mirrorPaymentModes.map((d) => (
                        <Cell key={d.name} fill={d.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="mt-1 space-y-0.5">
                {mirrorPaymentModes.map((d) => (
                  <li key={d.name} className="flex items-center justify-between gap-1 rounded-full bg-[#001B3D]/5 px-1.5 py-0.5">
                    <span className="flex min-w-0 items-center gap-1">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
                      <span className="truncate text-[6px] font-medium sm:text-[7px]">{d.name}</span>
                    </span>
                    <span className="shrink-0 text-[6px] font-semibold tabular-nums sm:text-[7px]">{d.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Table   Parent · Élève · Niveau · Montant · Date · Mode · Statut · Reçu */}
          <div className="min-h-0 shrink-0 overflow-hidden rounded-2xl border border-[#001B3D]/10 bg-white shadow-[0_14px_30px_-24px_rgba(40,57,108,0.5)]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[360px] text-left text-[7px] sm:text-[8px]">
                <thead>
                  <tr className="border-b border-[#001B3D]/10 bg-[#001B3D]/5 text-[6px] font-semibold uppercase tracking-wider text-[#4B5563] sm:text-[7px]">
                    <th className="px-1.5 py-1">{t.common.parent}</th>
                    <th className="px-1.5 py-1">Élève</th>
                    <th className="px-1.5 py-1">Niveau</th>
                    <th className="px-1.5 py-1">{t.common.amount}</th>
                    <th className="px-1.5 py-1">{t.common.date}</th>
                    <th className="px-1.5 py-1">{t.common.mode}</th>
                    <th className="px-1.5 py-1">Statut</th>
                    <th className="px-1.5 py-1">{t.common.receipt}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#001B3D]/8">
                  {mirrorPaymentRows.map((r) => (
                    <tr key={r.id} className="hover:bg-[#6C4DF6]/10">
                      <td className="px-1.5 py-1 font-medium">{r.parent}</td>
                      <td className="px-1.5 py-1">{r.enfant}</td>
                      <td className="px-1.5 py-1 text-[#4B5563]">{r.niveau}</td>
                      <td className="px-1.5 py-1 font-semibold tabular-nums">
                        {r.montant.toLocaleString("fr-FR")} {t.common.mad}
                      </td>
                      <td className="px-1.5 py-1 tabular-nums text-[#4B5563]">{r.date}</td>
                      <td className="px-1.5 py-1">
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-[#001B3D]/8 px-1.5 py-px text-[6px] font-semibold uppercase tracking-wide text-[#001B3D]">
                          <span className="h-1 w-1 shrink-0 rounded-full bg-[#001B3D]" aria-hidden />
                          {r.mode}
                        </span>
                      </td>
                      <td className="px-1.5 py-1">
                        <span
                          className={cn(
                            "rounded-full px-1.5 py-px text-[6px] font-semibold uppercase tracking-wide",
                            r.statut === "paye" ? "bg-[#6C4DF6]/30 text-[#0E6B62]" : "bg-[#FFE3E0] text-[#D93A41]",
                          )}
                        >
                          {r.statut === "paye" ? t.status.paye : t.status.overdue}
                        </span>
                      </td>
                      <td className="px-1.5 py-1">
                        <span className="block font-mono text-[6px] text-[#4B5563] sm:text-[7px]">{r.recu}</span>
                        <span
                          className={cn(
                            "mt-px inline-flex rounded-full px-1 py-px text-[6px] font-semibold",
                            r.facture === "envoye" ? "bg-[#6C4DF6]/30 text-[#0E6B62]" : "bg-[#001B3D]/8 text-[#4B5563]",
                          )}
                        >
                          {r.facture === "non_envoye" ? t.status.notSent : t.status.sent}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pagerFooter(mirrorPaymentRows.length, "paiements")}
          </div>
        </div>
      );

    case "calendar": {
      // Grille mensuelle : cases vides avant le 1er, puis les jours du mois.
      const cells: (number | null)[] = [
        ...Array.from({ length: mirrorCalendar.startOffset }, () => null),
        ...Array.from({ length: mirrorCalendar.daysInMonth }, (_, i) => i + 1),
      ];
      const dayTone = (d: number) =>
        mirrorCalendar.holidays.includes(d)
          ? "bg-[#17B3A6]/20 text-[#0E6B62] font-semibold"
          : mirrorCalendar.vacations.includes(d)
            ? "bg-[#FFB347]/40 text-[#B5760E] font-semibold"
            : mirrorCalendar.planifications.includes(d)
              ? "bg-[#6C4DF6]/15 text-[#4A34C7] font-semibold"
              : "text-[#001B3D]";

      return (
        <div className="flex h-full min-h-0 flex-col gap-2 overflow-y-auto overscroll-contain text-[#001B3D]">
          <div className="shrink-0">
            <p className="text-[8px] font-semibold uppercase tracking-[0.2em] text-[#4B5563] sm:text-[9px]">Calendrier</p>
            <p className="mt-0.5 font-display text-sm font-semibold leading-tight sm:text-base">Calendrier</p>
          </div>

          {/* Légende   jours fériés / vacances / planifications */}
          <div className="flex shrink-0 flex-wrap gap-1">
            <span className="inline-flex items-center gap-1 rounded-full bg-[#17B3A6]/15 px-1.5 py-0.5 text-[7px] font-semibold text-[#0E6B62] sm:text-[8px]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#17B3A6]" /> Jour férié ({mirrorCalendar.holidays.length})
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#FFB347]/40 px-1.5 py-0.5 text-[7px] font-semibold text-[#B5760E] sm:text-[8px]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#FFB347]" /> Vacances ({mirrorCalendar.vacations.length})
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#001B3D]/10 px-1.5 py-0.5 text-[7px] font-semibold text-[#001B3D] sm:text-[8px]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#6C4DF6]" /> Planification ({mirrorCalendar.planifications.length})
            </span>
          </div>

          {/* Grille du mois */}
          <div className="min-h-0 shrink-0 rounded-2xl border border-[#001B3D]/10 bg-white p-2 shadow-[0_14px_30px_-24px_rgba(40,57,108,0.5)]">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                <span className="grid h-5 w-5 place-items-center rounded-full border border-[#001B3D]/15 text-[8px] text-[#001B3D]">‹</span>
                <span className="grid h-5 w-5 place-items-center rounded-full border border-[#001B3D]/15 text-[8px] text-[#001B3D]">›</span>
                <h2 className="ml-1 font-display text-[11px] font-semibold sm:text-xs">
                  {mirrorCalendar.month} <span className="font-normal text-[#4B5563]">{mirrorCalendar.year}</span>
                </h2>
              </div>
              <button
                type="button"
                onClick={() => showLocked(pv.locked.openCard)}
                className="text-[7px] font-semibold text-[#4B5563] sm:text-[8px]"
              >
                Cliquez sur un jour
              </button>
            </div>

            <div className="mt-1.5 grid grid-cols-7 gap-0.5">
              {mirrorCalendar.weekDays.map((d, i) => (
                <div key={i} className="py-0.5 text-center text-[6px] font-semibold uppercase text-[#4B5563] sm:text-[7px]">
                  {d}
                </div>
              ))}
              {cells.map((d, i) => (
                <button
                  key={i}
                  type="button"
                  disabled={d === null}
                  onClick={() => showLocked(pv.locked.openCard)}
                  className={cn(
                    "grid aspect-square place-items-center rounded-md text-[7px] transition sm:text-[8px]",
                    d === null ? "opacity-0" : dayTone(d),
                    d === mirrorCalendar.today && "ring-1 ring-[#001B3D]",
                  )}
                >
                  {d ?? ""}
                </button>
              ))}
            </div>
          </div>
        </div>
      );
    }

    case "affiches":
      return (
        <div className="flex h-full min-h-0 flex-col gap-2 overflow-y-auto overscroll-contain text-[#001B3D]">
          {/* Header + ajouter un employé */}
          <div className="flex shrink-0 items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[8px] font-medium uppercase tracking-[0.22em] text-[#4B5563] sm:text-[9px]">{t.affiches.eyebrow}</p>
              <p className="mt-0.5 font-display text-sm font-semibold leading-tight sm:text-base">
                {t.affiches.titleBold}{" "}
                <span className="font-normal italic text-[#4B5563]">{t.affiches.titleItalic}</span>
              </p>
              <p className="mt-0.5 truncate text-[8px] text-[#4B5563] sm:text-[9px]">{t.affiches.subtitle}</p>
            </div>
            <button
              type="button"
              onClick={() => showLocked(pv.locked.addClient)}
              className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#6C4DF6] px-2.5 py-1.5 text-[9px] font-bold text-[#001B3D] shadow-sm sm:text-[10px]"
            >
              <Plus className="h-3 w-3" />
              <span className="hidden sm:inline">Ajouter un employé</span>
            </button>
          </div>

          {/* Recherche + compteur */}
          <div className="shrink-0">
            <div className="flex items-center gap-1 rounded-xl border border-[#001B3D]/10 bg-white px-2 py-1.5 shadow-[0_10px_25px_-20px_rgba(40,57,108,0.5)]">
              <Search className="h-2.5 w-2.5 shrink-0 text-[#4B5563]" />
              <span className="text-[7px] text-[#4B5563] sm:text-[8px]">{pv.searchEllipsis}</span>
            </div>
            <p className="mt-1 text-[7px] text-[#4B5563] sm:text-[8px]">{mirrorEmployes.length} employés</p>
          </div>

          {/* Table   Nom · Poste · Département · Contact · Salaire · Statut · Actions */}
          <div className="min-h-0 shrink-0 overflow-hidden rounded-2xl border border-[#001B3D]/10 bg-white shadow-[0_14px_30px_-24px_rgba(40,57,108,0.5)]">
            <div className="border-b border-[#001B3D]/10 px-2.5 py-1.5">
              <p className="text-[7px] font-semibold uppercase tracking-[0.2em] text-[#4B5563] sm:text-[8px]">
                {t.affiches.employeeList}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[340px] text-left text-[7px] sm:text-[8px]">
                <thead>
                  <tr className="border-b border-[#001B3D]/10 bg-[#001B3D]/5 text-[6px] font-semibold uppercase tracking-wider text-[#4B5563] sm:text-[7px]">
                    <th className="px-1.5 py-1">{t.affiches.table.name}</th>
                    <th className="px-1.5 py-1">{t.affiches.table.position}</th>
                    <th className="px-1.5 py-1">{t.affiches.table.department}</th>
                    <th className="px-1.5 py-1">{t.affiches.table.contact}</th>
                    <th className="px-1.5 py-1">Salaire</th>
                    <th className="px-1.5 py-1">{t.affiches.table.status}</th>
                    <th className="px-1.5 py-1">{t.affiches.table.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#001B3D]/8">
                  {mirrorEmployes.map((e) => {
                    return (
                      <tr key={e.id} className="hover:bg-[#6C4DF6]/10">
                        <td className="px-1.5 py-1 font-medium">{e.nomComplet}</td>
                        <td className="px-1.5 py-1">{e.poste}</td>
                        <td className="px-1.5 py-1 text-[#4B5563]">{e.departement}</td>
                        <td className="px-1.5 py-1 text-[#4B5563]">
                          <span className="block max-w-[5rem] truncate">{e.email}</span>
                          <span className="mt-px block text-[6px] sm:text-[7px]">{e.tel}</span>
                        </td>
                        <td className="px-1.5 py-1 font-semibold tabular-nums">
                          {e.salaire.toLocaleString("fr-FR")}{" "}
                          <span className="text-[6px] font-normal text-[#4B5563]">{t.common.mad}</span>
                        </td>
                        <td className="px-1.5 py-1">
                          <span
                            className={cn(
                              "rounded-full px-1.5 py-px text-[6px] font-semibold uppercase tracking-wide",
                              e.statut === "actif" ? "bg-[#001B3D] text-white" : "bg-[#001B3D]/8 text-[#4B5563]",
                            )}
                          >
                            {e.statut === "actif" ? t.status.actif : t.status.inactif}
                          </span>
                        </td>
                        <td className="px-1.5 py-1">
                          <div className="flex gap-0.5">
                            <button
                              type="button"
                              onClick={() => showLocked(pv.locked.openCard)}
                              className="grid h-4 w-4 place-items-center rounded-full border border-[#001B3D]/15 text-[#001B3D]"
                              aria-label="Modifier"
                            >
                              <Pencil className="h-2 w-2" />
                            </button>
                            <button
                              type="button"
                              onClick={() => showLocked(pv.locked.openCard)}
                              className="grid h-4 w-4 place-items-center rounded-full border border-[#001B3D]/15 text-[#FF666B]"
                              aria-label="Supprimer"
                            >
                              <Trash2 className="h-2 w-2" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {pagerFooter(mirrorEmployes.length, "employés")}
          </div>
        </div>
      );

    case "settings":
      return (
        <div className="flex h-full min-h-0 flex-col gap-2 overflow-y-auto overscroll-contain text-[#001B3D]">
          <div className="shrink-0">
            <p className="text-[8px] font-semibold uppercase tracking-[0.2em] text-[#4B5563] sm:text-[9px]">Paramètres</p>
            <p className="mt-0.5 font-display text-sm font-semibold leading-tight sm:text-base">
              Configuration <span className="font-normal italic text-[#4B5563]">du centre</span>
            </p>
          </div>

          {/* Sections réelles de dashboard.settings */}
          <div className="grid shrink-0 gap-2 sm:grid-cols-2">
            {mirrorSettingsSections.map((s) => (
              <div
                key={s.title}
                className="overflow-hidden rounded-2xl border border-[#001B3D]/10 bg-white shadow-[0_10px_25px_-20px_rgba(40,57,108,0.5)]"
              >
                <div className="border-b border-[#001B3D]/10 px-2 py-1.5">
                  <p className="font-display text-[10px] font-semibold sm:text-[11px]">{s.title}</p>
                  <p className="text-[7px] text-[#4B5563] sm:text-[8px]">{s.desc}</p>
                </div>
                <ul className="divide-y divide-[#001B3D]/8">
                  {s.rows.map((r) => (
                    <li key={r.label} className="flex items-center justify-between gap-2 px-2 py-1">
                      <span className="truncate text-[7px] text-[#4B5563] sm:text-[8px]">{r.label}</span>
                      <span className="shrink-0 text-[7px] font-semibold tabular-nums text-[#001B3D] sm:text-[8px]">
                        {r.value}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="flex justify-end border-t border-[#001B3D]/10 px-2 py-1.5">
                  <button
                    type="button"
                    onClick={() => showLocked(pv.locked.openCard)}
                    className="rounded-full bg-[#6C4DF6] px-2 py-0.5 text-[7px] font-bold text-[#001B3D] sm:text-[8px]"
                  >
                    Enregistrer
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      );

    default:
      return null;
  }
}
