import { useEffect, useRef, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useReducedMotion } from "framer-motion";

/**
 * Lightweight top progress bar for page navigation — replaces the old
 * full-screen navy curtain takeover, which read as a heavy "loading screen"
 * rather than a quick transition. This never blocks the outgoing page.
 */

/** Keep the bar on screen long enough to read as real progress, not a flicker. */
const MIN_VISIBLE_MS = 220;

export function PageTransition() {
  const busy = useRouterState({
    select: (s) => s.isLoading || s.status === "pending" || s.isTransitioning,
  });
  const reduceMotion = useReducedMotion();

  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const shownAt = useRef(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (busy) {
      if (!visible) {
        shownAt.current = Date.now();
        setProgress(8);
        setVisible(true);
      }
      // Creep toward 90% while the navigation is in flight; the last stretch
      // only completes once the route actually resolves.
      tickRef.current = setInterval(() => {
        setProgress((p) => (p < 90 ? p + (90 - p) * 0.12 : p));
      }, 120);
      return () => {
        if (tickRef.current) clearInterval(tickRef.current);
      };
    }

    if (!visible) return;
    if (tickRef.current) clearInterval(tickRef.current);
    setProgress(100);
    const remaining = MIN_VISIBLE_MS - (Date.now() - shownAt.current);
    const t = setTimeout(() => setVisible(false), Math.max(80, remaining));
    return () => clearTimeout(t);
  }, [busy, visible]);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="fixed inset-x-0 top-0 z-[9998] h-[3px] bg-transparent"
    >
      <div
        className="h-full bg-gradient-to-r from-violet via-turquoise to-corail"
        style={{
          width: `${progress}%`,
          transition: reduceMotion ? "none" : "width 200ms ease-out, opacity 200ms ease-out",
          opacity: progress >= 100 ? 0 : 1,
        }}
      />
      <span className="sr-only">Chargement de la page</span>
    </div>
  );
}
