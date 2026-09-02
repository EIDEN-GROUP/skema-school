import { useEffect, useRef } from "react";
import { useLocation } from "@tanstack/react-router";
import { useAuth, getAccessToken } from "@/lib/auth";
import { useLandingI18nOptional } from "@/lib/landing-i18n";
import {
  trackPage,
  setUserContext,
  track,
  setUser,
  setGroup,
  sanitizePath,
  referrerCategory,
  getReferrer,
  startReplayIfAllowed,
} from "@/lib/analytics";
import { getCurrentSchool } from "@/lib/server-school";

const PAGE_NAMES: Record<string, string> = {
  "/": "landing",
  "/login": "login",
  "/privacy": "privacy",
  "/dashboard": "dashboard",
  "/dashboard/": "dashboard",
  "/dashboard/calendar": "calendar",
  "/dashboard/familles": "families",
  "/dashboard/paiements": "payments",
  "/dashboard/planifications": "planning",
  "/dashboard/rapports": "reports",
  "/dashboard/affiches": "team",
  "/dashboard/settings": "settings",
  "/superadmin": "superadmin",
  "/superadmin/": "superadmin",
  "/superadmin/centres": "superadmin_centres",
  "/superadmin/admins": "superadmin_admins",
  "/superadmin/demandes": "superadmin_demandes",
};

function pageName(pathname: string): string {
  if (PAGE_NAMES[pathname]) return PAGE_NAMES[pathname];
  const derived = pathname.replace(/\/$/, "").replace(/^\//, "").replace(/\//g, "_");
  return derived || "unknown";
}

/**
 * Tracks page views and manages analytics identity + school/group attribution.
 *
 * Must be rendered inside AuthProvider + LandingI18nProvider. Returns null.
 */
export function AnalyticsPageTracker() {
  const { user, role, loading, roleLoading } = useAuth();
  const localeOpt = useLandingI18nOptional();
  const location = useLocation();
  const lastPath = useRef<string | null>(null);

  // Sync role/locale context (attached to every subsequent event)
  useEffect(() => {
    setUserContext({ role: role ?? undefined, locale: localeOpt?.locale ?? "fr" });
  }, [role, localeOpt?.locale]);

  // Identify the user + resolve school/group once auth is settled
  useEffect(() => {
    if (loading || roleLoading) return;
    if (!user?.id) {
      setUser(null);
      return;
    }
    setUser(user.id, {
      role: role ?? "admin",
      locale: localeOpt?.locale ?? "fr",
    });
    getAccessToken()
      .then((token) => {
        if (!token) return;
        return getCurrentSchool({ data: token }).then((school: { centerId: string } | null) => {
          if (school) setGroup("school", school.centerId);
        });
      })
      .catch(() => {
        /* analytics must never break the app */
      });
  }, [user?.id, role, loading, roleLoading, localeOpt?.locale]);

  // Track page views (deduplicated per pathname) on route changes
  useEffect(() => {
    if (loading || roleLoading) return;
    const pathname = sanitizePath(location.pathname);
    if (pathname === lastPath.current) return;
    lastPath.current = pathname;

    const locale = localeOpt?.locale ?? "fr";
    trackPage({
      route: pathname,
      page_name: pageName(pathname),
      role: role ?? undefined,
      authenticated: !!user,
      locale,
    });

    if (pathname === "/") {
      const category = referrerCategory(getReferrer());
      track("landing_viewed", { pathname: "/", referrer_category: category });
      if (category === "organic") {
        track("organic_landing_viewed", { pathname: "/", referrer_category: category });
      }
    }

    // Session replay: only ever started on public marketing pages (and after
    // consent); navigating to any private route stops it.
    void startReplayIfAllowed(pathname);
  }, [location.pathname, user, user?.id, role, loading, roleLoading, localeOpt?.locale]);

  return null;
}
