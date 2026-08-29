/**
 * Shared dashboard UI tokens — SKEMA scrapbook/paper design language, matching
 * the landing page's own `paper`/`Note`/`tape` visual vocabulary (see
 * src/styles.css and src/components/skema/bits.tsx) instead of a bespoke
 * dashboard-only look. Import these instead of re-declaring per-page magic
 * strings so every dashboard page shares one consistent surface / input /
 * badge language with the marketing site.
 */

import { Motif } from "@/components/skema/bits";

/**
 * Page meta-header — kicker (Motif + "Écran n/6"), title, subtitle, and a
 * hand-written file-path annotation. Matches the skema-stickers dashboard
 * design-spec pages (src/components/dashboard/Chrome.tsx `EcranApp` there).
 */
export function EcranHeader({
  numero,
  titre,
  sousTitre,
}: {
  numero: string;
  titre: string;
  sousTitre: string;
  route?: string;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 pb-2">
      <div>
        <div className="flex items-center gap-3">
          <Motif className="w-5" />
          <span className="text-[0.7rem] font-medium uppercase tracking-[0.22em] text-nuit/50">{numero}</span>
        </div>
        <h1 className="mt-3 font-display text-[1.5rem] tracking-tight text-nuit sm:text-[1.85rem]">{titre}</h1>
        <p className="mt-2 max-w-[62ch] text-[0.9rem] leading-relaxed text-nuit/60">{sousTitre}</p>
      </div>
    </div>
  );
}

/** Primary surface — same recipe as the landing's `paper` utility: white card, soft layered shadow. */
export const softCard = "paper rounded-[22px] border border-nuit/8";

/** Interactive surface — same as softCard but lifts on hover (for clickable cards). */
export const softCardHover =
  "paper rounded-[22px] border border-nuit/8 transition-all hover:-translate-y-0.5 hover:shadow-[0_26px_50px_-30px_rgba(0,27,61,0.4)]";

/**
 * Text input — rounded, violet focus ring (Skema's primary action color).
 * Carries its own `border` width and `w-full`: Tailwind's preflight resets every
 * element to `border: 0 solid`, so a bare `<input>` styled only with a border
 * *colour* renders with no visible box.
 */
export const softInput =
  "w-full min-w-0 rounded-xl border border-nuit/12 bg-papier shadow-none focus-visible:border-violet focus-visible:ring-2 focus-visible:ring-violet/30";

/** Select trigger — matches softInput height/rounding. */
export const softSelectTrigger =
  "h-10 rounded-xl border-nuit/12 bg-papier shadow-none focus:ring-0 focus:ring-offset-0 data-[placeholder]:text-nuit/45";

/** Select dropdown surface. */
export const softSelectContent = "rounded-2xl border-nuit/8";

/** Small uppercase field label. */
export const labelClass = "text-[10px] font-medium uppercase tracking-wider text-nuit/50";

/** Section eyebrow (uppercase, wide tracking). */
export const eyebrowClass = "text-[11px] font-semibold uppercase tracking-[0.18em] text-nuit/50";

/**
 * Primary pill button — nuit (navy) fill. The brand book has nuit as the
 * dominant color (~85% of the page); violet/turquoise/corail/ocre are three
 * equal semantic accents, not "the" primary, so CTAs use nuit, not violet.
 */
export const primaryPill =
  "inline-flex items-center gap-2 rounded-full bg-nuit px-5 py-2.5 text-sm font-bold text-white shadow-[0_14px_30px_-14px_rgba(0,27,61,0.55)] transition hover:bg-[#00142E]";

/** Solid ink pill button — alias of primaryPill, kept for call sites that named it separately. */
export const navyPill = primaryPill;

/** Ghost / secondary pill button. */
export const ghostPill =
  "inline-flex items-center gap-2 rounded-full border border-nuit/12 bg-papier px-5 py-2.5 text-sm font-medium text-nuit transition hover:bg-nuit/6";

/** Small square icon-action button (view / edit inside tables). */
export const iconButton =
  "grid h-9 w-9 place-items-center rounded-xl border border-nuit/12 bg-papier text-nuit/50 transition hover:bg-nuit/6 hover:text-nuit";

/**
 * Dialog surface — same paper card language as the landing's `Note`/`paper` cards.
 * `flex flex-col` so a header / scrolling body / footer stack can size itself against
 * the capped height. Give the body `min-h-0 flex-1 overflow-y-auto` rather than a `vh`
 * max-height: a `vh` body ignores this cap and pushes the footer out of the clipped box.
 */
export const dialogSurface =
  "paper flex flex-col gap-0 overflow-hidden rounded-[26px] border border-nuit/8 p-0 " +
  "max-h-[min(90vh,720px)] w-[min(100vw-1.5rem,560px)] max-w-[min(100vw-1.5rem,560px)] " +
  "[&>button]:right-5 [&>button]:top-5 [&>button]:rounded-full [&>button]:border [&>button]:border-nuit/12 [&>button]:bg-papier [&>button]:opacity-100 [&>button]:hover:bg-gris-clair [&>button]:focus:ring-0 [&>button]:focus:ring-offset-0";

/** Recharts tooltip content style — matches the paper card language. */
export const dashTooltip = {
  background: "var(--color-papier)",
  border: "1px solid rgba(0,27,61,0.12)",
  borderRadius: 14,
  color: "var(--color-nuit)",
} as const;

/** Status colours   payé / en attente / retard / impaye (shared across pages). */
export const STATUS_COLORS = {
  paye: "#17B3A6",
  en_attente: "#FFB347",
  retard: "#FF666B",
  impaye: "#D93A41",
} as const;

/** Rounded status pill with a soft tinted background. */
export function statusPill(tone: "paye" | "en_attente" | "retard" | "impaye" | "neutral") {
  const map = {
    paye: "bg-menthe text-[#0E6B62]",
    en_attente: "bg-peche text-[#B5760E]",
    retard: "bg-[#FFE3E0] text-[#D93A41]",
    impaye: "bg-[#FF666B]/20 text-[#D93A41]",
    neutral: "bg-gris-clair text-nuit/70",
  } as const;
  return `inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${map[tone]}`;
}

/**
 * Étiquette « % » inscrite au centre de chaque part d'un camembert Recharts.
 * Les parts nulles ne sont pas étiquetées (sinon le 0 % se superpose aux voisines).
 */
export function renderPieLabel({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
}) {
  // Skip nulls and thin wedges — a 3% label is unreadable and collides with its
  // neighbours. The legend list underneath carries the exact figure anyway.
  if (!percent || percent < 0.06) return null;
  const RAD = Math.PI / 180;
  const r = innerRadius + (outerRadius - innerRadius) * 0.6;
  const x = cx + r * Math.cos(-midAngle * RAD);
  const y = cy + r * Math.sin(-midAngle * RAD);
  return (
    <text
      x={x}
      y={y}
      fill="#fff"
      fontSize={12}
      fontWeight={700}
      textAnchor="middle"
      dominantBaseline="central"
    >
      {`${Math.round(percent * 100)}%`}
    </text>
  );
}

/** Deterministic initials from a name string (for avatar chips). */
export function initials(name: string) {
  const parts = name.replace(/[/].*/, "").trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "?";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}
