import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { DashShell } from "@/components/dash-shell";
import { useAuth } from "@/lib/auth";
import { useDashboardI18n, useSuperadminNav } from "@/lib/landing-i18n";

function SuperadminLayout() {
  const { user, role, loading, roleLoading } = useAuth();
  const { t, dir } = useDashboardI18n();
  const { topNav, brand } = useSuperadminNav();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading || roleLoading || typeof window === "undefined") return;
    if (!user) {
      const timer = setTimeout(() => navigate({ to: "/login" }), 0);
      return () => clearTimeout(timer);
    }
    // role === null means not yet determined – wait for it
    if (role !== null && role !== "superadmin") {
      const timer = setTimeout(() => navigate({ to: "/dashboard" }), 0);
      return () => clearTimeout(timer);
    }
  }, [user, role, loading, roleLoading, navigate]);

  if (loading || roleLoading || !user || role === null || role !== "superadmin") {
    return (
      <div className="grid h-dvh place-items-center bg-[linear-gradient(180deg,#ffffff_0%,#E6FAF7_45%,#E6FAF7_100%)]">
        <div className="flex flex-col items-center gap-3">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-[#001B3D]/20 border-t-[#001B3D]" />
          <p className="text-sm text-muted-foreground">{t.superadmin.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <DashShell
      brand={brand}
      brandColor="primary"
      variant="topnav"
      topNav={topNav}
      hideNotifications
      dir={dir}
    >
      <Outlet />
    </DashShell>
  );
}

export const Route = createFileRoute("/superadmin")({
  component: SuperadminLayout,
});
