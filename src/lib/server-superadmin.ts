import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/lib/supabase-server";
import type {
  Center,
  CenterInput,
  PlatformStats,
  UserRole,
} from "@/lib/database-types";

// ------------------------------------------------------------------
// Auth guard   mutations verify the caller's token and role server-side
// ------------------------------------------------------------------

async function requireSuperadmin(token: string) {
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) throw new Error("Non autorisé");
  const { data: prof } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();
  if (prof?.role !== "superadmin") throw new Error("Accès réservé au superadmin");
  return data.user;
}

// ------------------------------------------------------------------
// Reads
// ------------------------------------------------------------------

export type CenterWithAdmins = Center & {
  center_admins: Array<{
    profile_id: string;
    profiles: { name: string; email: string } | null;
  }>;
};

export type AdminRow = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  created_at: string;
  center_admins: Array<{
    center_id: string;
    centers: { id: string; name: string } | null;
  }>;
};

export type DemoRequest = {
  id: number;
  center: string;
  email: string;
  phone: string;
  preferred_date: string;
  message: string | null;
  created_at: string;
};

export const getPlatformStats = createServerFn({ method: "GET" })
  .handler(async (): Promise<PlatformStats> => {
    const [centersRes, adminsRes, clientsRes, revenueRes, demoRes] = await Promise.all([
      supabaseAdmin.from("centers").select("status, monthly_price, students_count, is_primary"),
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "admin"),
      supabaseAdmin.from("clients").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("payments").select("amount"),
      supabaseAdmin.from("demo_requests").select("id", { count: "exact", head: true }),
    ]);

    const centers = centersRes.data ?? [];
    const liveClients = clientsRes.count ?? 0;
    // Le centre principal est adossé aux vraies tables : ses élèves = clients réels.
    const declared = centers.reduce(
      (sum, c) => sum + (c.is_primary ? liveClients : Number(c.students_count)),
      0,
    );

    return {
      total_centers: centers.length,
      active_centers: centers.filter((c) => c.status === "actif").length,
      suspended_centers: centers.filter((c) => c.status === "suspendu").length,
      total_admins: adminsRes.count ?? 0,
      total_students: declared,
      platform_revenue: (revenueRes.data ?? []).reduce((sum, p) => sum + Number(p.amount), 0),
      mrr: centers
        .filter((c) => c.status === "actif")
        .reduce((sum, c) => sum + Number(c.monthly_price), 0),
      pending_demo_requests: demoRes.count ?? 0,
    };
  });

export const listCenters = createServerFn({ method: "GET" })
  .handler(async (): Promise<CenterWithAdmins[]> => {
    const { data, error } = await supabaseAdmin
      .from("centers")
      .select("*, center_admins(profile_id, profiles(name, email))")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as CenterWithAdmins[];
  });

export const listAdmins = createServerFn({ method: "GET" })
  .handler(async (): Promise<AdminRow[]> => {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id, name, email, role, created_at, center_admins(center_id, centers(id, name))")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as AdminRow[];
  });

export const listDemoRequests = createServerFn({ method: "GET" })
  .handler(async (): Promise<DemoRequest[]> => {
    const { data, error } = await supabaseAdmin
      .from("demo_requests")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as DemoRequest[];
  });

export const getCentersByPlan = createServerFn({ method: "GET" })
  .handler(async (): Promise<Array<{ plan: string; count: number }>> => {
    const { data, error } = await supabaseAdmin.from("centers").select("plan");
    if (error) throw new Error(error.message);
    const counts: Record<string, number> = {};
    for (const row of data ?? []) counts[row.plan] = (counts[row.plan] ?? 0) + 1;
    return Object.entries(counts).map(([plan, count]) => ({ plan, count }));
  });

export const getPlatformMonthlyRevenue = createServerFn({ method: "GET" })
  .handler(async () => {
    const months = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sept", "Oct", "Nov", "Déc"];
    const now = new Date();
    const currentMonth = now.getMonth();

    const { data: centersData } = await supabaseAdmin
      .from("centers")
      .select("status, monthly_price, created_at");
    const activeCenters = (centersData ?? []).filter((c) => c.status === "actif");

    const results: Array<{ m: string; v: number; mrr: number }> = [];

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
      const monthEnd = new Date(y, m + 1, 0, 23, 59, 59);
      const mrr = activeCenters
        .filter((c) => new Date(c.created_at) <= monthEnd)
        .reduce((sum, c) => sum + Number(c.monthly_price), 0);
      results.push({ m: months[m], v: total, mrr });
    }

    return results;
  });

// ------------------------------------------------------------------
// Mutations   token-guarded
// ------------------------------------------------------------------

export const createCenter = createServerFn({ method: "POST" })
  .validator((input: { token: string } & CenterInput) => input)
  .handler(async ({ data }) => {
    await requireSuperadmin(data.token);
    const { token: _token, ...center } = data;
    const { data: result, error } = await supabaseAdmin
      .from("centers")
      .insert({
        name: center.name,
        city: center.city ?? "",
        contact_email: center.contact_email ?? "",
        contact_phone: center.contact_phone ?? "",
        plan: center.plan ?? "essai",
        status: center.status ?? "actif",
        monthly_price: center.monthly_price ?? 0,
        students_count: center.students_count ?? 0,
        notes: center.notes ?? "",
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return result as Center;
  });

export const updateCenter = createServerFn({ method: "POST" })
  .validator((input: { token: string; id: string } & Partial<CenterInput>) => input)
  .handler(async ({ data }) => {
    await requireSuperadmin(data.token);
    const { token: _token, id, ...updates } = data;
    const { data: result, error } = await supabaseAdmin
      .from("centers")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return result as Center;
  });

export const deleteCenter = createServerFn({ method: "POST" })
  .validator((input: { token: string; id: string }) => input)
  .handler(async ({ data }) => {
    await requireSuperadmin(data.token);
    const { data: center } = await supabaseAdmin
      .from("centers")
      .select("is_primary")
      .eq("id", data.id)
      .single();
    if (center?.is_primary) throw new Error("Impossible de supprimer le centre principal");
    const { error } = await supabaseAdmin.from("centers").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { success: true };
  });

export const createAdmin = createServerFn({ method: "POST" })
  .validator(
    (input: { token: string; email: string; password: string; name: string; centerId?: string }) => input,
  )
  .handler(async ({ data }) => {
    await requireSuperadmin(data.token);
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { name: data.name, role: "admin" },
    });
    if (error) throw new Error(error.message);
    if (data.centerId) {
      const { error: linkError } = await supabaseAdmin
        .from("center_admins")
        .insert({ center_id: data.centerId, profile_id: created.user.id });
      if (linkError) throw new Error(linkError.message);
    }
    return { id: created.user.id };
  });

export const updateAdmin = createServerFn({ method: "POST" })
  .validator(
    (input: { token: string; id: string; name?: string; centerId?: string | null; newPassword?: string }) => input,
  )
  .handler(async ({ data }) => {
    await requireSuperadmin(data.token);
    if (data.name !== undefined) {
      const { error } = await supabaseAdmin
        .from("profiles")
        .update({ name: data.name })
        .eq("id", data.id);
      if (error) throw new Error(error.message);
    }
    if (data.newPassword) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(data.id, {
        password: data.newPassword,
      });
      if (error) throw new Error(error.message);
    }
    if (data.centerId !== undefined) {
      const { error: delError } = await supabaseAdmin
        .from("center_admins")
        .delete()
        .eq("profile_id", data.id);
      if (delError) throw new Error(delError.message);
      if (data.centerId) {
        const { error: insError } = await supabaseAdmin
          .from("center_admins")
          .insert({ center_id: data.centerId, profile_id: data.id });
        if (insError) throw new Error(insError.message);
      }
    }
    return { success: true };
  });

export const deleteAdmin = createServerFn({ method: "POST" })
  .validator((input: { token: string; id: string }) => input)
  .handler(async ({ data }) => {
    const caller = await requireSuperadmin(data.token);
    if (caller.id === data.id) throw new Error("Impossible de supprimer votre propre compte");
    const { data: target } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", data.id)
      .single();
    if (target?.role === "superadmin")
      throw new Error("Impossible de supprimer un superadmin");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.id);
    if (error) throw new Error(error.message);
    return { success: true };
  });
