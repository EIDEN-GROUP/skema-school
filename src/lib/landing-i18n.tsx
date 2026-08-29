import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  LayoutDashboard,
  Calendar,
  Users,
  CreditCard,
  Images,
  Settings,
  Building2,
  UserCog,
  Inbox,
} from "lucide-react";
import { fr as dateFnsFr, ar as dateFnsAr } from "date-fns/locale";
import frLanding from "@/locales/landing/fr.json";
import arLanding from "@/locales/landing/ar.json";
import frDashboard from "@/locales/dashboard/fr.json";
import arDashboard from "@/locales/dashboard/ar.json";
import type { NavItem } from "@/components/dash-shell";

export type LandingLocale = "fr" | "ar";
export type LandingTranslations = typeof frLanding;
export type DashboardTranslations = typeof frDashboard;

const STORAGE_KEY = "gestio-landing-locale";

const landingDictionaries: Record<LandingLocale, LandingTranslations> = {
  fr: frLanding,
  ar: arLanding,
};

const dashboardDictionaries: Record<LandingLocale, DashboardTranslations> = {
  fr: frDashboard,
  ar: arDashboard,
};

type LandingI18nContextValue = {
  locale: LandingLocale;
  setLocale: (locale: LandingLocale) => void;
  toggleLocale: () => void;
  dir: "ltr" | "rtl";
  numberLocale: string;
  landing: LandingTranslations;
  dashboard: DashboardTranslations;
};

const LandingI18nContext = createContext<LandingI18nContextValue | null>(null);

function readStoredLocale(): LandingLocale {
  if (typeof window === "undefined") return "fr";
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "ar" ? "ar" : "fr";
}

export function getDateFnsLocale(locale: LandingLocale) {
  return locale === "ar" ? dateFnsAr : dateFnsFr;
}

export function LandingI18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<LandingLocale>("fr");

  useEffect(() => {
    setLocaleState(readStoredLocale());
  }, []);

  const setLocale = useCallback((next: LandingLocale) => {
    setLocaleState(next);
    localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const toggleLocale = useCallback(() => {
    setLocale(locale === "fr" ? "ar" : "fr");
  }, [locale, setLocale]);

  const landing = landingDictionaries[locale];
  const dashboard = dashboardDictionaries[locale];
  const dir: "ltr" | "rtl" = locale === "ar" ? "rtl" : "ltr";
  const numberLocale = locale === "ar" ? "ar-MA" : "fr-MA";

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
  }, [locale, dir]);

  const value = useMemo(
    () => ({ locale, setLocale, toggleLocale, dir, numberLocale, landing, dashboard }),
    [locale, setLocale, toggleLocale, dir, numberLocale, landing, dashboard],
  );

  return <LandingI18nContext.Provider value={value}>{children}</LandingI18nContext.Provider>;
}

export function useLandingI18n() {
  const ctx = useContext(LandingI18nContext);
  if (!ctx) throw new Error("useLandingI18n must be used within LandingI18nProvider");
  return { ...ctx, t: ctx.landing };
}

export function useLandingI18nOptional() {
  const ctx = useContext(LandingI18nContext);
  if (!ctx) return null;
  return { ...ctx, t: ctx.landing };
}

export function useDashboardI18n() {
  const ctx = useContext(LandingI18nContext);
  if (!ctx) throw new Error("useDashboardI18n must be used within LandingI18nProvider");
  return { ...ctx, t: ctx.dashboard };
}

export function useDashboardNav() {
  const { t } = useDashboardI18n();

  const topNav: NavItem[] = useMemo(
    () => [
      {
        to: "/dashboard",
        label: t.nav.dashboard,
        shortLabel: t.navShort.dashboard,
        icon: LayoutDashboard,
      },
      {
        to: "/dashboard/calendar",
        label: t.nav.calendar,
        shortLabel: t.navShort.calendar,
        icon: Calendar,
      },
      {
        to: "/dashboard/familles",
        label: t.nav.familles,
        shortLabel: t.navShort.familles,
        icon: Users,
      },
      {
        to: "/dashboard/paiements",
        label: t.nav.paiements,
        shortLabel: t.navShort.paiements,
        icon: CreditCard,
      },
      {
        to: "/dashboard/affiches",
        label: t.nav.affiches,
        shortLabel: t.navShort.affiches,
        icon: Images,
      },
      {
        to: "/dashboard/settings",
        label: t.nav.settings,
        shortLabel: t.navShort.settings,
        icon: Settings,
      },
    ],
    [t.nav, t.navShort],
  );

  const secondaryNav: NavItem[] = useMemo(() => [], []);

  return { topNav, secondaryNav, brand: t.shell.brand };
}

export function useSuperadminNav() {
  const { t } = useDashboardI18n();

  const topNav: NavItem[] = useMemo(
    () => [
      {
        to: "/superadmin",
        label: t.superadmin.nav.overview,
        shortLabel: t.superadmin.navShort.overview,
        icon: LayoutDashboard,
      },
      {
        to: "/superadmin/centres",
        label: t.superadmin.nav.centres,
        shortLabel: t.superadmin.navShort.centres,
        icon: Building2,
      },
      {
        to: "/superadmin/admins",
        label: t.superadmin.nav.admins,
        shortLabel: t.superadmin.navShort.admins,
        icon: UserCog,
      },
      {
        to: "/superadmin/demandes",
        label: t.superadmin.nav.demandes,
        shortLabel: t.superadmin.navShort.demandes,
        icon: Inbox,
      },
    ],
    [t.superadmin],
  );

  return { topNav, brand: t.superadmin.brand };
}

export function interpolate(template: string, vars: Record<string, string | number>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => String(vars[key] ?? ""));
}

// La visite guidée de la landing calque exactement la navigation réelle du
// dashboard (voir `useDashboardNav` ci-dessus) : un module = une entrée de nav.
export const DEMO_STEP_PAGES = [
  "dashboard",
  "calendar",
  "familles",
  "paiements",
  "affiches",
  "settings",
] as const;

export const PREVIEW_TOP_NAV_IDS = [
  "dashboard",
  "calendar",
  "familles",
  "paiements",
] as const;

export const PREVIEW_SECONDARY_NAV_IDS = ["affiches", "settings"] as const;
