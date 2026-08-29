import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  getPlatformStats,
  getPlatformMonthlyRevenue,
  getCentersByPlan,
  listCenters,
} from "@/lib/server-superadmin";
import { Building2, UserCog, Inbox, ArrowUpRight } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { PageTitle, StatCard } from "@/components/dash-shell";
import { useDashboardI18n } from "@/lib/landing-i18n";
import { softCard, dashTooltip, statusPill, renderPieLabel } from "@/lib/dash-ui";

export const Route = createFileRoute("/superadmin/")({
  head: () => ({ meta: [{ title: "Vue d'ensemble   Superadmin" }] }),
  component: SuperadminOverview,
});

const PLAN_COLORS: Record<string, string> = {
  essai: "#FFB347",
  standard: "#17B3A6",
  premium: "#001B3D",
};

function statusTone(status: string): "paye" | "en_attente" | "retard" | "neutral" {
  if (status === "actif") return "paye";
  if (status === "essai") return "en_attente";
  if (status === "suspendu") return "retard";
  return "neutral";
}

function SuperadminOverview() {
  const { t, numberLocale } = useDashboardI18n();
  const st = t.superadmin.overview;

  const { data: stats } = useQuery({ queryKey: ["platform-stats"], queryFn: getPlatformStats });
  const { data: revenue = [] } = useQuery({
    queryKey: ["platform-monthly-revenue"],
    queryFn: getPlatformMonthlyRevenue,
  });
  const { data: byPlan = [] } = useQuery({
    queryKey: ["centers-by-plan"],
    queryFn: getCentersByPlan,
  });
  const { data: centers = [] } = useQuery({ queryKey: ["centers"], queryFn: listCenters });

  const fmt = (n: number) => n.toLocaleString(numberLocale);
  const planLabel = (plan: string) =>
    plan === "premium"
      ? t.superadmin.centres.planPremium
      : plan === "standard"
        ? t.superadmin.centres.planStandard
        : t.superadmin.centres.planEssai;
  const statusLabel = (status: string) =>
    status === "actif"
      ? t.superadmin.centres.statusActif
      : status === "suspendu"
        ? t.superadmin.centres.statusSuspendu
        : t.superadmin.centres.statusEssai;

  const pieData = byPlan.map((p) => ({ name: planLabel(p.plan), value: p.count, plan: p.plan }));
  const latest = centers.slice(0, 5);

  return (
    <div>
      <PageTitle eyebrow={st.eyebrow} title={st.pageTitle} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label={st.activeCenters}
          value={fmt(stats?.active_centers ?? 0)}
          sub={`${fmt(stats?.total_centers ?? 0)} ${st.totalCenters.toLowerCase()}`}
          icon={Building2}
          monochrome
        />
        <StatCard
          label={st.admins}
          value={fmt(stats?.total_admins ?? 0)}
          icon={UserCog}
          monochrome
        />
        <StatCard
          label={st.pendingRequests}
          value={fmt(stats?.pending_demo_requests ?? 0)}
          icon={Inbox}
          monochrome
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
        <div className={`${softCard} p-5`}>
          <h2 className="mb-4 text-sm font-semibold text-foreground">{st.monthlyRevenueTitle}</h2>
          <div className="h-60 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenue} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(40,57,108,0.08)" vertical={false} />
                <XAxis dataKey="m" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip contentStyle={dashTooltip} cursor={{ fill: "rgba(40,57,108,0.05)" }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="v" name={st.platformRevenue} fill="#001B3D" radius={[6, 6, 0, 0]} maxBarSize={42} />
                <Bar dataKey="mrr" name={st.mrr} fill="#A9C6FF" radius={[6, 6, 0, 0]} maxBarSize={42} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={`${softCard} p-5`}>
          <h2 className="mb-4 text-sm font-semibold text-foreground">{st.centersByPlanTitle}</h2>
          {pieData.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">{st.noCenters}</p>
          ) : (
            <>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={0}
                      outerRadius="90%"
                      labelLine={false}
                      label={renderPieLabel}
                      stroke="var(--card)"
                      strokeWidth={2}
                    >
                      {pieData.map((entry) => (
                        <Cell key={entry.plan} fill={PLAN_COLORS[entry.plan] ?? "#4B5563"} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={dashTooltip} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 flex flex-wrap justify-center gap-3">
                {pieData.map((entry) => (
                  <span key={entry.plan} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: PLAN_COLORS[entry.plan] ?? "#4B5563" }}
                    />
                    {entry.name} ({entry.value})
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className={`${softCard} mt-6 overflow-hidden`}>
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-4 sm:px-5">
          <h2 className="text-sm font-semibold text-foreground">{st.latestCentersTitle}</h2>
          <Link
            to="/superadmin/centres"
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#001B3D] hover:underline"
          >
            {st.viewAllCenters}
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {latest.length === 0 ? (
          <p className="px-5 pb-6 text-sm text-muted-foreground">{st.noCenters}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-t border-[#001B3D]/10 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="whitespace-nowrap px-4 py-3 font-medium sm:px-5">{t.superadmin.centres.name}</th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium sm:px-5">{t.superadmin.centres.city}</th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium sm:px-5">{t.superadmin.centres.plan}</th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium sm:px-5">{t.superadmin.centres.status}</th>
                </tr>
              </thead>
              <tbody>
                {latest.map((c) => (
                  <tr key={c.id} className="border-t border-[#001B3D]/10">
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground sm:px-5">{c.name}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground sm:px-5">{c.city || " "}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground sm:px-5">{planLabel(c.plan)}</td>
                    <td className="whitespace-nowrap px-4 py-3 sm:px-5">
                      <span className={statusPill(statusTone(c.status))}>{statusLabel(c.status)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
