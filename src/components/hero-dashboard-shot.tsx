/**
 * Static, non-interactive product shot of the real CRM dashboard   used as the
 * hero visual on the landing page. It reproduces the top of `dashboard.index`
 * (header · status cards · « Statistique générale » · « Derniers paiements »)
 * at screenshot scale; the hero frame crops the bottom with a soft fade.
 *
 * This is intentionally NOT the interactive demo miniature   no tabs, no toasts,
 * no links   just a faithful picture of the current dashboard.
 */
import {
  ArrowUp,
  ArrowDown,
  ArrowUpRight,
  Plus,
  Send,
  TrendingUp,
} from "lucide-react";
import {
  ResponsiveContainer,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Bar,
  Line,
} from "recharts";
import { cn } from "@/lib/utils";
import { useDashboardI18n } from "@/lib/landing-i18n";
import { initials } from "@/lib/dash-ui";
import {
  mirrorDashboardMetrics,
  mirrorStatSeries,
  mirrorStatKpis,
  mirrorLastPayments,
} from "@/lib/dashboard-mirror-data";

const shotTooltip = {
  background: "var(--card)",
  border: "1px solid rgba(40,57,108,0.15)",
  borderRadius: 10,
  color: "var(--foreground)",
  fontSize: 11,
} as const;

export function HeroDashboardShot() {
  const { t } = useDashboardI18n();

  return (
    <div className="h-full w-full select-none bg-[#FFFFFF] px-3.5 pb-4 pt-3.5 text-[#001B3D] sm:px-5 sm:pt-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[9px] font-medium uppercase tracking-[0.22em] text-[#4B5563]">{t.home.eyebrow}</p>
          <h3 className="mt-0.5 font-display text-lg font-semibold leading-tight tracking-tight sm:text-xl">
            <span className="font-semibold">{t.home.titleBold}</span>{" "}
            <span className="font-normal italic text-[#4B5563]">{t.home.titleItalic}</span>
          </h3>
          <p className="mt-0.5 truncate text-[10px] text-[#4B5563] sm:text-[11px]">{t.home.subtitle}</p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#6C4DF6] px-2.5 py-1.5 text-[10px] font-bold text-[#001B3D] shadow-sm sm:text-[11px]">
          <Plus className="h-3 w-3" />
          <span className="hidden sm:inline">{t.home.quickActions.addClient.title}</span>
        </span>
      </div>

      {/* 4 status cards */}
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {mirrorDashboardMetrics.map((card) => (
          <div
            key={card.k}
            className="relative overflow-hidden rounded-2xl border border-[#001B3D]/10 bg-white p-2.5 shadow-[0_10px_25px_-20px_rgba(40,57,108,0.5)]"
          >
            <div className="flex items-start justify-between gap-1">
              <p className="text-[9px] font-medium uppercase tracking-wider text-[#4B5563]">{card.label}</p>
              <span
                className="grid h-6 w-6 shrink-0 place-items-center rounded-xl"
                style={{ backgroundColor: card.tint, color: card.accent }}
              >
                <card.icon className="h-3 w-3" />
              </span>
            </div>
            <p className="mt-1.5 font-display text-xl font-semibold leading-none tracking-tight">{card.value}</p>
            <p className="mt-1 text-[9px] text-[#4B5563]">{card.sub}</p>
            <span className="mt-2 block h-1 w-8 rounded-full" style={{ backgroundColor: card.accent }} />
          </div>
        ))}
      </div>

      {/* Statistique générale   composed chart + KPI column */}
      <div className="mt-3 overflow-hidden rounded-2xl border border-[#001B3D]/10 bg-white shadow-[0_14px_30px_-24px_rgba(40,57,108,0.5)]">
        <div className="grid sm:grid-cols-[minmax(0,1fr)_9.5rem]">
          <div className="min-w-0 p-3 sm:p-3.5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#4B5563]">Vue d'ensemble</p>
                <h4 className="mt-0.5 font-display text-sm text-[#001B3D]">
                  Statistique <span className="font-normal italic text-[#4B5563]">générale</span>
                </h4>
              </div>
              <span className="rounded-lg border border-[#001B3D]/10 bg-muted/60 px-2 py-0.5 text-[9px] font-medium text-[#4B5563]">
                2026
              </span>
            </div>
            <div className="mt-2 h-[7.5rem] w-full min-w-0 sm:h-[8.5rem]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={mirrorStatSeries} margin={{ top: 6, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(40,57,108,0.08)" vertical={false} />
                  <XAxis dataKey="mois" stroke="var(--muted-foreground)" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--muted-foreground)" tick={{ fontSize: 9 }} width={22} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={shotTooltip} cursor={{ fill: "rgba(181,225,139,0.16)" }} />
                  <Bar dataKey="encaisse" fill="#E8F1FF" radius={[5, 5, 0, 0]} maxBarSize={22} />
                  <Line type="monotone" dataKey="paiements" stroke="#001B3D" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <ul className="mt-2 flex flex-wrap gap-3">
              <li className="inline-flex items-center gap-1.5 text-[9px] font-medium text-[#4B5563]">
                <span className="h-2 w-3 rounded-sm bg-[#E8F1FF]" /> Encaissé (k MAD)
              </li>
              <li className="inline-flex items-center gap-1.5 text-[9px] font-medium text-[#4B5563]">
                <span className="h-0.5 w-3.5 rounded-full bg-[#001B3D]" /> Paiements reçus
              </li>
            </ul>
          </div>

          <ul className="grid grid-cols-2 border-t border-[#001B3D]/10 sm:grid-cols-1 sm:border-l sm:border-t-0 sm:divide-y sm:divide-[#001B3D]/10">
            {mirrorStatKpis.map((k) => (
              <li key={k.label} className="border-b border-[#001B3D]/10 px-3 py-2 sm:border-b-0 sm:py-2.5">
                <p className="truncate text-[9px] text-[#4B5563]">{k.label}</p>
                <div className="mt-0.5 flex items-end justify-between gap-1">
                  <p className="font-display text-base font-semibold tabular-nums leading-none">{k.value}</p>
                  <span
                    className={cn(
                      "inline-flex items-center gap-0.5 text-[9px] font-semibold",
                      k.up ? "text-[#0E6B62]" : "text-[#D93A41]",
                    )}
                  >
                    {k.delta}
                    {k.up ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Derniers paiements + Relance rapide teaser (cropped by the frame fade) */}
      <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <div className="overflow-hidden rounded-2xl border border-[#001B3D]/10 bg-white p-3 shadow-[0_14px_30px_-24px_rgba(40,57,108,0.5)]">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#4B5563]">Activité récente</p>
              <h4 className="mt-0.5 font-display text-sm text-[#001B3D]">Derniers paiements</h4>
            </div>
            <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-[#001B3D]">
              Voir tout <ArrowUpRight className="h-3 w-3" />
            </span>
          </div>
          <ul className="mt-1.5 divide-y divide-[#001B3D]/8">
            {mirrorLastPayments.map((p) => (
              <li key={p.who + p.note} className="flex items-center gap-2 py-1.5">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-[#001B3D]/8 text-[9px] font-bold text-[#001B3D]">
                  {initials(p.who)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-medium leading-tight">{p.who}</p>
                  <p className="truncate text-[9px] leading-tight text-[#4B5563]">{p.note}</p>
                </div>
                <span className="shrink-0 text-[11px] font-semibold tabular-nums">{p.amount} MAD</span>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-[8px] font-semibold uppercase tracking-wide",
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
        </div>

        <div className="overflow-hidden rounded-2xl border border-[#001B3D]/10 bg-[#001B3D] p-3 text-white shadow-[0_14px_30px_-24px_rgba(40,57,108,0.5)]">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#6C4DF6]">Relance rapide</p>
            <TrendingUp className="h-3.5 w-3.5 text-[#6C4DF6]" />
          </div>
          <h4 className="mt-1 font-display text-sm font-semibold">Rappel de paiement</h4>
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
          <div className="mt-2.5 inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-[#6C4DF6] px-3 py-2 text-[11px] font-bold text-[#001B3D]">
            <Send className="h-3 w-3" />
            Envoyer le rappel
          </div>
        </div>
      </div>
    </div>
  );
}
