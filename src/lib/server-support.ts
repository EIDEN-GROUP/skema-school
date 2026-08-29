import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/lib/supabase-server";
import type { SupportSession, SupportMessage } from "@/lib/database-types";

export const sendMessage = createServerFn({ method: "POST" })
  .validator((d: { sessionId: string; senderId: string; senderRole: "admin" | "superadmin"; content: string }) => d)
  .handler(async ({ data }) => {
    const { data: msg, error } = await supabaseAdmin
      .from("support_messages")
      .insert({
        session_id: data.sessionId,
        sender_id: data.senderId,
        sender_role: data.senderRole,
        content: data.content,
      })
      .select()
      .single();
    if (error) throw error;
    await supabaseAdmin
      .from("support_sessions")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", data.sessionId);
    return msg as SupportMessage;
  });

export const createSession = createServerFn({ method: "POST" })
  .validator((d: { adminId: string; adminName: string; centerId?: string | null }) => d)
  .handler(async ({ data }) => {
    const { data: session, error } = await supabaseAdmin
      .from("support_sessions")
      .insert({
        admin_id: data.adminId,
        admin_name: data.adminName,
        center_id: data.centerId ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return session as SupportSession;
  });

export const getOrCreateSession = createServerFn({ method: "GET" })
  .validator((d: { adminId: string; adminName: string; centerId?: string | null }) => d)
  .handler(async ({ data }) => {
    const { data: existing } = await supabaseAdmin
      .from("support_sessions")
      .select("*")
      .eq("admin_id", data.adminId)
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existing) return existing as SupportSession;
    const { data: session, error } = await supabaseAdmin
      .from("support_sessions")
      .insert({
        admin_id: data.adminId,
        admin_name: data.adminName,
        center_id: data.centerId ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return session as SupportSession;
  });

export const getSessionMessages = createServerFn({ method: "GET" })
  .validator((d: { sessionId: string }) => d)
  .handler(async ({ data }) => {
    const { data: messages, error } = await supabaseAdmin
      .from("support_messages")
      .select("*")
      .eq("session_id", data.sessionId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return messages as SupportMessage[];
  });

export const getOpenSessions = createServerFn({ method: "GET" })
  .handler(async () => {
    const { data: sessions, error } = await supabaseAdmin
      .from("support_sessions")
      .select("*")
      .eq("status", "open")
      .order("updated_at", { ascending: false });
    if (error) throw error;
    const enriched = await Promise.all(
      (sessions ?? []).map(async (s) => {
        const { data: msgs } = await supabaseAdmin
          .from("support_messages")
          .select("content, sender_role, created_at")
          .eq("session_id", s.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        return { ...s, last_message: msgs ?? null };
      }),
    );
    return enriched as (SupportSession & { last_message: Pick<SupportMessage, "content" | "sender_role" | "created_at"> | null })[];
  });

export const closeSession = createServerFn({ method: "POST" })
  .validator((d: { sessionId: string }) => d)
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin
      .from("support_sessions")
      .update({ status: "closed", updated_at: new Date().toISOString() })
      .eq("id", data.sessionId);
    if (error) throw error;
  });
