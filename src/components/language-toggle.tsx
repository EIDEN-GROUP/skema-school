import { useRouterState } from "@tanstack/react-router";
import { Languages } from "lucide-react";
import { cn } from "@/lib/utils";
import { SupportChat } from "@/components/support-chat";
import { SuperadminSupport } from "@/components/superadmin-support";
import { useLandingI18nOptional, type LandingLocale } from "@/lib/landing-i18n";

function LanguageToggleButton({
  locale,
  onToggle,
  label,
}: {
  locale: LandingLocale;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      className={cn(
        "relative grid h-11 w-11 place-items-center rounded-full border border-border bg-card text-foreground shadow-[var(--shadow-soft)] transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      )}
    >
      <Languages className="h-5 w-5" strokeWidth={2} aria-hidden />
      <span className="sr-only">{locale === "fr" ? "العربية" : "Français"}</span>
      <span
        className="pointer-events-none absolute -bottom-0.5 -end-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-0.5 text-[9px] font-black uppercase text-primary-foreground"
        aria-hidden
      >
        {locale === "fr" ? "AR" : "FR"}
      </span>
    </button>
  );
}

/** Fixed language control   always visible on landing and dashboard (no scroll required). */
export function LanguageToggleFloating() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const i18n = useLandingI18nOptional();

  const show = pathname === "/" || pathname.startsWith("/dashboard") || pathname.startsWith("/superadmin");
  if (!show || !i18n) return null;

  const langLabel = i18n.t.a11y.switchLanguage;

  const onDashboard = pathname.startsWith("/dashboard");
  const onSuperadmin = pathname.startsWith("/superadmin");

  return (
    <div
      className={cn(
        "fixed z-[60] flex flex-col items-center gap-2",
        "end-[max(1rem,env(safe-area-inset-right))]",
        onDashboard
          ? "bottom-[calc(5rem+max(0.5rem,env(safe-area-inset-bottom)))] lg:bottom-[max(1rem,env(safe-area-inset-bottom))]"
          : "bottom-[max(1rem,env(safe-area-inset-bottom))]",
      )}
    >
      {onDashboard ? <SupportChat /> : null}
      {onSuperadmin ? <SuperadminSupport /> : null}
      <LanguageToggleButton locale={i18n.locale} onToggle={i18n.toggleLocale} label={langLabel} />
    </div>
  );
}
