import { createFileRoute, Outlet } from "@tanstack/react-router";
import { DashShell } from "@/components/dash-shell";
import { useDashboardI18n, useDashboardNav } from "@/lib/landing-i18n";

function DashboardLayout() {
  const { dir } = useDashboardI18n();
  const { topNav, brand } = useDashboardNav();

  return (
    <DashShell
      brand={brand}
      brandColor="primary"
      variant="topnav"
      topNav={topNav}
      dir={dir}
    >
      <Outlet />
    </DashShell>
  );
}

export const Route = createFileRoute("/dashboard")({
  component: DashboardLayout,
});
