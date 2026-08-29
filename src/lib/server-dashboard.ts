import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/lib/supabase-server";
import type { DashboardStats } from "@/lib/database-types";

export const getDashboardStats = createServerFn({ method: "GET" })
  .handler(async (): Promise<DashboardStats> => {
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    const lastOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

    const [clientsRes, paidRes, debtRes, revenueRes, activeRes, overdueRes] = await Promise.all([
      supabaseAdmin.from("clients").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("payments").select("amount").gte("date", firstOfMonth).lte("date", lastOfMonth),
      supabaseAdmin.from("clients").select("debt"),
      supabaseAdmin.from("payments").select("amount"),
      supabaseAdmin.from("clients").select("id", { count: "exact", head: true }).eq("crm_stage", "converti"),
      supabaseAdmin.from("clients").select("id", { count: "exact", head: true }).eq("overdue", true),
    ]);

    const total_clients = clientsRes.count ?? 0;
    const paid_this_month = (paidRes.data ?? []).reduce((sum, p) => sum + Number(p.amount), 0);
    const total_debt = (debtRes.data ?? []).reduce((sum, c) => sum + Number(c.debt), 0);
    const total_revenue = (revenueRes.data ?? []).reduce((sum, p) => sum + Number(p.amount), 0);
    const active_clients = activeRes.count ?? 0;
    const overdue_count = overdueRes.count ?? 0;

    return {
      total_clients,
      paid_this_month,
      total_debt,
      total_revenue,
      active_clients,
      overdue_count,
    };
  });

export const getMonthlyRevenue = createServerFn({ method: "GET" })
  .handler(async () => {
    const months = ["Sept", "Oct", "Nov", "Déc", "Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août"];
    const now = new Date();
    const currentMonth = now.getMonth();

    const results: Array<{ m: string; v: number }> = [];

    for (let i = 6; i >= 0; i--) {
      let m = currentMonth - i;
      let y = now.getFullYear();
      if (m < 0) { m += 12; y -= 1; }
      const first = new Date(y, m, 1).toISOString().split("T")[0];
      const last = new Date(y, m + 1, 0).toISOString().split("T")[0];
      const { data } = await supabaseAdmin
        .from("payments")
        .select("amount")
        .gte("date", first)
        .lte("date", last);
      const total = (data ?? []).reduce((sum, p) => sum + Number(p.amount), 0);
      results.push({ m: months[m], v: total });
    }

    return results;
  });
