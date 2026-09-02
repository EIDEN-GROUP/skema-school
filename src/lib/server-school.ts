import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/lib/supabase-server";

export type CurrentSchool = {
  centerId: string;
  name: string;
  plan: string;
  status: string;
  studentsCount: number;
};

type CenterLinkRow = {
  centers: {
    id: string;
    name: string;
    plan: string;
    status: string;
    students_count: number;
    is_primary: boolean;
  } | null;
};

/**
 * Resolve the Amplitude group identifier for the current user.
 *
 * Finds the user's primary center via `center_admins`. Falls back to the first
 * linked center if no primary is marked. Returns null for superadmins (they
 * manage multiple schools and are not attributed to one).
 */
export const getCurrentSchool = createServerFn({ method: "GET" })
  .validator((token: string) => token)
  .handler(async ({ data: token }): Promise<CurrentSchool | null> => {
    if (!token) return null;
    const { data: auth, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !auth?.user) return null;

    const { data } = await supabaseAdmin
      .from("center_admins")
      .select("centers(id, name, plan, status, students_count, is_primary)")
      .eq("profile_id", auth.user.id);

    const rows = (data ?? []) as unknown as CenterLinkRow[];
    if (rows.length === 0) return null;

    const primary = rows.find((r) => r.centers?.is_primary) ?? rows[0];
    const c = primary?.centers;
    if (!c) return null;

    return {
      centerId: c.id,
      name: c.name,
      plan: c.plan,
      status: c.status,
      studentsCount: c.students_count,
    };
  });
