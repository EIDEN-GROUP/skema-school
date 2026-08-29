import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase-browser";
import type { User } from "@supabase/supabase-js";
import type { UserRole } from "@/lib/database-types";

type AuthUser = User | null;

type AuthCtx = {
  user: AuthUser;
  role: UserRole | null;
  roleLoading: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({
  user: null,
  role: null,
  roleLoading: false,
  loading: true,
  login: async () => ({ error: "Not ready" }),
  logout: async () => {},
});

/** Access token of the current session   passed to superadmin server mutations. */
export async function getAccessToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? "";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<UserRole | null>(null);
  const [roleLoading, setRoleLoading] = useState(false);

  useEffect(() => {
    const stored = supabase.auth.getSession();
    stored.then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user?.id) {
      setRole(null);
      return;
    }
    let cancelled = false;
    setRoleLoading(true);
    supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (!error && data?.role === "superadmin") {
          setRole("superadmin");
        } else if (user.user_metadata?.role === "superadmin") {
          setRole("superadmin");
          // Attempt to backfill the DB so it sticks on next reload
          supabase.from("profiles").upsert({ id: user.id, role: "superadmin" }).then().catch(() => {});
        } else {
          setRole("admin");
        }
        setRoleLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const login = async (email: string, password: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRole(null);
  };

  return (
    <Ctx.Provider value={{ user, role, roleLoading, loading, login, logout }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
