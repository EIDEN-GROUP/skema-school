import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Building2 } from "lucide-react";
import { PageTitle } from "@/components/dash-shell";
import { TablePagination, usePagination } from "@/components/table-pagination";
import { getDateFnsLocale, useDashboardI18n } from "@/lib/landing-i18n";
import { listDemoRequests } from "@/lib/server-superadmin";
import { ghostPill, softCard } from "@/lib/dash-ui";

export const Route = createFileRoute("/superadmin/demandes")({
  head: () => ({ meta: [{ title: "Demandes démo   Superadmin" }] }),
  component: SuperadminDemandes,
});

function SuperadminDemandes() {
  const { t, locale } = useDashboardI18n();
  const td = t.superadmin.demandes;
  const navigate = useNavigate();
  const dateLocale = getDateFnsLocale(locale);

  const { data: requests = [] } = useQuery({
    queryKey: ["demo-requests"],
    queryFn: listDemoRequests,
  });

  const { page, setPage, pageCount, pageItems, total, pageSize } = usePagination(requests);

  const fmtDate = (value: string | null) => {
    if (!value) return " ";
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? " " : format(d, "d MMM yyyy", { locale: dateLocale });
  };

  return (
    <div>
      <PageTitle eyebrow={td.eyebrow} title={td.pageTitle} />

      <div className={`${softCard} overflow-hidden`}>
        {requests.length === 0 ? (
          <p className="px-5 py-6 text-sm text-muted-foreground">{td.noRequests}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3 font-medium">{td.center}</th>
                  <th className="px-5 py-3 font-medium">{td.email}</th>
                  <th className="px-5 py-3 font-medium">{td.phone}</th>
                  <th className="px-5 py-3 font-medium">{td.preferredDate}</th>
                  <th className="px-5 py-3 font-medium">{td.message}</th>
                  <th className="px-5 py-3 font-medium">{td.receivedAt}</th>
                  <th className="px-5 py-3 font-medium text-right">{t.common.actions}</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((r) => (
                  <tr key={r.id} className="border-t border-[#001B3D]/10">
                    <td className="px-5 py-3 font-medium text-foreground">{r.center}</td>
                    <td className="px-5 py-3 text-muted-foreground">{r.email}</td>
                    <td className="px-5 py-3 text-muted-foreground">{r.phone}</td>
                    <td className="px-5 py-3 text-muted-foreground">{fmtDate(r.preferred_date)}</td>
                    <td className="max-w-[16rem] px-5 py-3 text-muted-foreground">
                      <span className="line-clamp-2">{r.message || " "}</span>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{fmtDate(r.created_at)}</td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() =>
                            navigate({
                              to: "/superadmin/centres",
                              search: { name: r.center, email: r.email, phone: r.phone },
                            })
                          }
                          className={`${ghostPill} px-4 py-2 text-xs`}
                        >
                          <Building2 className="h-3.5 w-3.5" />
                          {td.createCenter}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <TablePagination
          page={page}
          pageCount={pageCount}
          total={total}
          pageSize={pageSize}
          onPage={setPage}
          label={td.unit}
        />
      </div>
    </div>
  );
}
