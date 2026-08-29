import type { ReactNode } from "react";

import stickerCap from "@/assets/sticker-cap.png";
import stickerBook from "@/assets/sticker-book.png";
import stickerBackpack from "@/assets/sticker-backpack.png";
import stickerPencil from "@/assets/sticker-pencil.png";
import stickerCalendar from "@/assets/sticker-calendar.png";
import stickerInvoice from "@/assets/sticker-invoice.png";
import stickerBubble from "@/assets/sticker-bubble.png";
import stickerStar from "@/assets/sticker-star.png";
import stickerClock from "@/assets/sticker-clock.png";
import stickerTrophy from "@/assets/sticker-trophy.png";

import dCoinStack from "@/assets/dashboard/01-coin-stack.png";
import dWalletCoin from "@/assets/dashboard/02-wallet-coin.png";
import dEnvelopeAlert from "@/assets/dashboard/04-envelope-alert.png";
import dChatCheck from "@/assets/dashboard/05-chat-check.png";
import dFolderPapers from "@/assets/dashboard/06-folder-papers.png";
import dCalendarPin from "@/assets/dashboard/07-calendar-pin.png";
import dGraduationCap from "@/assets/dashboard/08-graduation-cap.png";
import dOpenBook from "@/assets/dashboard/09-open-book.png";
import dPencilChecklist from "@/assets/dashboard/10-pencil-checklist.png";
import dGrowthChart from "@/assets/dashboard/11-growth-chart.png";
import dShieldCheck from "@/assets/dashboard/12-shield-check.png";
import dGear from "@/assets/dashboard/13-gear.png";
import dMegaphone from "@/assets/dashboard/14-megaphone.png";
import dTargetArrow from "@/assets/dashboard/15-target-arrow.png";
import dMagnifierDoc from "@/assets/dashboard/16-magnifier-doc.png";
import dStarSparkle from "@/assets/dashboard/17-star-sparkle.png";
import dWarningTriangle from "@/assets/dashboard/18-warning-triangle.png";
import dHandshake from "@/assets/dashboard/19-handshake.png";

export const stickers = {
  cap: stickerCap,
  book: stickerBook,
  backpack: stickerBackpack,
  pencil: stickerPencil,
  calendar: stickerCalendar,
  invoice: stickerInvoice,
  bubble: stickerBubble,
  star: stickerStar,
  clock: stickerClock,
  trophy: stickerTrophy,
  // Dashboard set (20-piece brief, 2 slots — 03 & 20 — never came back).
  coinStack: dCoinStack,
  walletCoin: dWalletCoin,
  envelopeAlert: dEnvelopeAlert,
  chatCheck: dChatCheck,
  folderPapers: dFolderPapers,
  calendarPin: dCalendarPin,
  graduationCap: dGraduationCap,
  openBook: dOpenBook,
  pencilChecklist: dPencilChecklist,
  growthChart: dGrowthChart,
  shieldCheck: dShieldCheck,
  gear: dGear,
  megaphone: dMegaphone,
  targetArrow: dTargetArrow,
  magnifierDoc: dMagnifierDoc,
  starSparkle: dStarSparkle,
  warningTriangle: dWarningTriangle,
  handshake: dHandshake,
};

export type StickerName = keyof typeof stickers;

const labels: Record<StickerName, string> = {
  cap: "Diplôme",
  book: "Cahier ouvert",
  backpack: "Cartable",
  pencil: "Crayon",
  calendar: "Calendrier",
  invoice: "Facture",
  bubble: "Message",
  star: "Étoile de réussite",
  clock: "Horloge",
  trophy: "Trophée",
  coinStack: "Pile de pièces",
  walletCoin: "Portefeuille",
  envelopeAlert: "Alerte e-mail",
  chatCheck: "Message confirmé",
  folderPapers: "Dossier famille",
  calendarPin: "Échéance",
  graduationCap: "Réussite scolaire",
  openBook: "Pédagogie",
  pencilChecklist: "Tâche faite",
  growthChart: "Croissance",
  shieldCheck: "Sécurité des données",
  gear: "Paramètres",
  megaphone: "Annonce",
  targetArrow: "Objectif atteint",
  magnifierDoc: "Recherche",
  starSparkle: "Statut payé",
  warningTriangle: "Statut impayé",
  handshake: "Nouvelle inscription",
};

export function Sticker({
  name,
  className = "",
  tilt = 0,
  bob = false,
}: {
  name: StickerName;
  className?: string;
  tilt?: number;
  bob?: boolean;
}) {
  return (
    <img
      src={stickers[name]}
      alt={labels[name]}
      loading="lazy"
      width={512}
      height={512}
      style={{ ["--tilt" as string]: `${tilt}deg`, rotate: bob ? undefined : `${tilt}deg` }}
      className={`pointer-events-none aspect-square select-none object-contain drop-shadow-[0_10px_18px_rgba(0,27,61,0.22)] ${bob ? "bob" : ""} ${className}`}
    />
  );
}

/** Le motif ≡ : trois barres — enseignants (violet), élèves (turquoise), administration (corail). */
export function Motif({ className = "" }: { className?: string }) {
  return (
    <span aria-hidden className={`inline-flex flex-col gap-[3px] ${className}`}>
      <span className="h-[3px] w-full rounded-full bg-violet" />
      <span className="h-[3px] w-full rounded-full bg-turquoise" />
      <span className="h-[3px] w-full rounded-full bg-corail" />
    </span>
  );
}

export function Doodle({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 70" className={className} fill="none" aria-hidden="true">
      <path
        d="M4 44c26-30 52 22 78-4 20-20 38 16 62 2"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <path d="M140 42l6 0-2 8" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
      <path
        d="M144 42c14-3 32 2 50 12"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeDasharray="2 9"
      />
    </svg>
  );
}

/** Quarter-circle hand-drawn connector, used to chain steps into a loop. */
export function CurveArrow({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 80 80" className={className} fill="none" aria-hidden="true">
      <path
        d="M4 4c0 42 34 76 76 76"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="2 10"
      />
      <path d="M68 72l12 8-4-14" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Underline({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 300 22" className={className} fill="none" aria-hidden="true">
      <path
        d="M4 15c58-11 130-13 292-6"
        stroke="currentColor"
        strokeWidth="7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Note({
  children,
  className = "",
  tapeTone = "",
  variant = "ruled",
}: {
  children: ReactNode;
  className?: string;
  tapeTone?: string;
  variant?: "ruled" | "grid" | "plain";
}) {
  const skin = variant === "ruled" ? "ruled" : variant === "grid" ? "grid-paper" : "";
  return (
    <div
      className={`tape ${tapeTone} paper ${skin} relative rounded-[4px] px-7 pt-9 pb-7 transition-transform duration-500 hover:rotate-0 ${className}`}
    >
      {children}
    </div>
  );
}
