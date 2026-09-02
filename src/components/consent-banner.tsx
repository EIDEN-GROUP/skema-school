import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { hasConsentDecision } from "@/lib/analytics";
import { setConsent as applyConsent } from "@/lib/analytics";

/**
 * Minimal, non-blocking analytics consent banner.
 *
 * - Only rendered while consent is pending (no prior choice).
 * - Never blocks the application: it is dismissible, sits at the bottom of the
 *   viewport, and the app works identically whether analytics is on or off.
 * - Choices are persisted in localStorage and enforced by the analytics layer
 *   (pending = buffered locally, declined = dropped, accepted = sent).
 */
export function ConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Re-evaluate after a tick so localStorage is available and the first paint
    // is not delayed by consent logic.
    const timer = setTimeout(() => {
      setVisible(!hasConsentDecision());
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  const decide = (accepted: boolean) => {
    applyConsent(accepted);
    setVisible(false);
    setDismissed(true);
  };

  if (!visible || dismissed) return null;

  return (
    <aside
      aria-label="Gestion des cookies et du suivi"
      role="dialog"
      aria-modal="false"
      className="fixed inset-x-3 bottom-3 z-[70] mx-auto max-w-xl rounded-2xl border border-nuit/10 bg-papier p-4 shadow-[0_24px_60px_-24px_rgba(0,27,61,0.45)] sm:p-5"
    >
      <p className="text-sm font-semibold text-nuit">Nous respectons votre vie privée</p>
      <p className="mt-1.5 text-xs leading-relaxed text-nuit/70">
        SKEMA utilise des statistiques anonymes (Amplitude) pour comprendre comment
        l&apos;application est utilisée et l&apos;améliorer. Aucune donnée personnelle de vos élèves
        ou familles n&apos;est collectée. Vous pouvez accepter, refuser ou modifier ce choix à tout
        moment.{" "}
        <Link
          to="/privacy"
          className="font-medium text-violet underline underline-offset-2 hover:text-nuit"
        >
          En savoir plus
        </Link>
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => decide(true)}
          className="inline-flex items-center justify-center rounded-full bg-nuit px-4 py-2 text-xs font-semibold text-white transition hover:bg-nuit/90"
        >
          Accepter
        </button>
        <button
          type="button"
          onClick={() => decide(false)}
          className="inline-flex items-center justify-center rounded-full border border-nuit/15 bg-white px-4 py-2 text-xs font-semibold text-nuit transition hover:bg-muted"
        >
          Refuser
        </button>
        <button
          type="button"
          onClick={() => setVisible(false)}
          className="ml-auto text-xs font-medium text-nuit/50 underline-offset-2 hover:text-nuit hover:underline"
        >
          Plus tard
        </button>
      </div>
    </aside>
  );
}
