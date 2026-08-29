import { useState, useEffect, useRef, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "@/lib/supabase-browser";
import { useAuth } from "@/lib/auth";
import { useDashboardI18n } from "@/lib/landing-i18n";
import { LifeBuoy, X, Send, ArrowLeft, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SupportSession, SupportMessage, SupportSessionWithLastMessage } from "@/lib/database-types";

function msgTime(ts: string) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function msgDate(ts: string) {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return msgTime(ts);
  if (d.toDateString() === yesterday.toDateString()) return "Hier";
  return d.toLocaleDateString([], { day: "numeric", month: "short" });
}

function SessionMessage({ msg, isMine }: { msg: SupportMessage; isMine: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn("flex", isMine ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm",
          isMine
            ? "rounded-br-sm bg-[#001B3D] text-white"
            : "rounded-bl-sm border border-border bg-card text-foreground",
        )}
      >
        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
        <p className={cn("mt-0.5 text-[10px]", isMine ? "text-white/50" : "text-muted-foreground")}>
          {msgTime(msg.created_at)}
        </p>
      </div>
    </motion.div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const panelVariants: any = {
  hidden: { opacity: 0, y: 24, scale: 0.96 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.25 } },
  exit: { opacity: 0, y: 16, scale: 0.96, transition: { duration: 0.18 } },
};

export function SuperadminSupport() {
  const { user } = useAuth();
  const { t } = useDashboardI18n();
  const [open, setOpen] = useState(false);
  const [sessions, setSessions] = useState<SupportSessionWithLastMessage[]>([]);
  const [selectedSession, setSelectedSession] = useState<SupportSession | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<"list" | "chat">("list");

  const fetchSessions = useCallback(async () => {
    const { data: sessionsData } = await supabase
      .from("support_sessions")
      .select("*")
      .eq("status", "open")
      .order("updated_at", { ascending: false });
    const sessionsList = (sessionsData ?? []) as SupportSession[];
    const enriched: SupportSessionWithLastMessage[] = await Promise.all(
      sessionsList.map(async (s) => {
        const { data: lastMsg } = await supabase
          .from("support_messages")
          .select("content, sender_role, created_at")
          .eq("session_id", s.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        return { ...s, last_message: lastMsg ?? null };
      }),
    );
    setSessions(enriched);
  }, []);

  const fetchMessages = useCallback(async (sessionId: string) => {
    const { data } = await supabase
      .from("support_messages")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });
    if (data) setMessages(data as SupportMessage[]);
  }, []);

  useEffect(() => {
    if (!open) return;
    fetchSessions();
  }, [open, fetchSessions]);

  useEffect(() => {
    if (!open) return;
    const interval = setInterval(fetchSessions, 10000);
    return () => clearInterval(interval);
  }, [open, fetchSessions]);

  useEffect(() => {
    if (!open || !selectedSession?.id || view !== "chat") return;
    fetchMessages(selectedSession.id);
    const interval = setInterval(() => fetchMessages(selectedSession.id), 5000);
    return () => clearInterval(interval);
  }, [open, selectedSession?.id, view, fetchMessages]);

  useEffect(() => {
    if (!selectedSession?.id) return;
    const channel = supabase
      .channel("superadmin-msgs-" + selectedSession.id)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "support_messages",
          filter: `session_id=eq.${selectedSession.id}`,
        },
        (payload) => {
          setMessages((prev) => {
            if (prev.some((m) => m.id === (payload.new as SupportMessage).id)) return prev;
            return [...prev, payload.new as SupportMessage];
          });
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedSession?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const openChat = (session: SupportSession) => {
    setSelectedSession(session);
    setView("chat");
    fetchMessages(session.id);
  };

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || !user?.id || !selectedSession?.id || sending) return;
    setSending(true);
    await supabase.from("support_messages").insert({
      session_id: selectedSession.id,
      sender_id: user.id,
      sender_role: "superadmin",
      content: trimmed,
    });
    setInput("");
    setSending(false);
    fetchMessages(selectedSession.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const closeSession = async () => {
    if (!selectedSession?.id) return;
    await supabase
      .from("support_sessions")
      .update({ status: "closed", updated_at: new Date().toISOString() })
      .eq("id", selectedSession.id);
    setSelectedSession(null);
    setView("list");
    fetchSessions();
  };

  const openCount = sessions.length;

  return (
    <div className="relative">
      <motion.button
        type="button"
        onClick={() => setOpen((p) => !p)}
        whileTap={{ scale: 0.92 }}
        aria-label="Sessions actives"
        className="relative grid h-11 w-11 place-items-center rounded-full border border-border bg-card text-foreground shadow-[var(--shadow-soft)] transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.span key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <X className="h-5 w-5" />
            </motion.span>
          ) : (
            <motion.span key="lifebuoy" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <LifeBuoy className="h-5 w-5" strokeWidth={2} aria-hidden />
            </motion.span>
          )}
        </AnimatePresence>
        {!open && openCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="pointer-events-none absolute -end-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white"
          >
            {openCount}
          </motion.span>
        )}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            key="panel"
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            style={{ maxHeight: "min(70vh, 540px)" }}
            className={cn(
              "absolute z-[70] flex w-[min(92vw,380px)] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl",
              "bottom-full mb-2 end-0",
            )}
          >
            <div className="flex items-center justify-between border-b border-border bg-[#001B3D] px-4 py-3 text-white">
              <div className="flex items-center gap-2">
                {view === "chat" ? (
                  <motion.button
                    type="button"
                    onClick={() => { setView("list"); setSelectedSession(null); fetchSessions(); }}
                    initial={{ x: -8, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className="flex items-center gap-1 text-sm font-medium text-white/80 hover:text-white"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    {t.supportChat.superadminTitle}
                  </motion.button>
                ) : (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
                    <LifeBuoy className="h-4 w-4" />
                    <span className="text-sm font-semibold">{t.supportChat.superadminTitle}</span>
                    <motion.span
                      key={openCount}
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="rounded-full bg-white/20 px-2 py-0.5 text-xs"
                    >
                      {openCount}
                    </motion.span>
                  </motion.div>
                )}
              </div>
              {view === "chat" && (
                <motion.button
                  type="button"
                  onClick={closeSession}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-white/80 hover:bg-white/10 hover:text-white"
                >
                  <CheckCheck className="h-3 w-3" />
                  {t.supportChat.closeSession}
                </motion.button>
              )}
            </div>

            <AnimatePresence mode="wait">
              {view === "list" ? (
                <motion.div
                  key="list"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.18 }}
                  className="flex-1 overflow-y-auto"
                >
                  {sessions.length === 0 && (
                    <div className="flex h-32 items-center justify-center">
                      <p className="text-center text-sm text-muted-foreground">{t.supportChat.noSessions}</p>
                    </div>
                  )}
                  {sessions.map((s, i) => (
                    <motion.button
                      key={s.id}
                      type="button"
                      onClick={() => openChat(s)}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04, duration: 0.2 }}
                      className="flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left transition hover:bg-muted"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#001B3D]/10 text-sm font-bold text-[#001B3D]">
                        {s.admin_name?.charAt(0)?.toUpperCase() ?? "?"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-medium">{s.admin_name || "Admin"}</p>
                          {s.last_message && (
                            <span className="shrink-0 text-[10px] text-muted-foreground">
                              {msgDate(s.last_message.created_at)}
                            </span>
                          )}
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                          {s.last_message ? (
                            <>
                              <span className="font-medium">
                                {s.last_message.sender_role === "superadmin" ? t.supportChat.superadmin + ": " : t.supportChat.you + ": "}
                              </span>
                              {s.last_message.content}
                            </>
                          ) : (
                            <span className="italic">{t.supportChat.noMessages}</span>
                          )}
                        </p>
                      </div>
                    </motion.button>
                  ))}
                </motion.div>
              ) : (
                <motion.div
                  key="chat"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.18 }}
                  className="flex min-h-0 flex-1 flex-col"
                >
                  <div className="flex-1 space-y-2 overflow-y-auto p-3">
                    {messages.length === 0 && (
                      <div className="flex h-32 items-center justify-center">
                        <p className="text-center text-sm text-muted-foreground">{t.supportChat.noMessages}</p>
                      </div>
                    )}
                    {messages.map((msg) => (
                      <SessionMessage key={msg.id} msg={msg} isMine={msg.sender_role === "superadmin"} />
                    ))}
                    {selectedSession?.status === "closed" && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="rounded-lg bg-muted px-3 py-2 text-center text-xs text-muted-foreground"
                      >
                        {t.supportChat.sessionClosed}
                      </motion.div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                  {selectedSession?.status !== "closed" && (
                    <motion.div
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      className="flex items-end gap-2 border-t border-border p-3"
                    >
                      <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        rows={1}
                        placeholder={t.supportChat.placeholder}
                        className="max-h-20 min-h-[36px] flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[#001B3D] focus:ring-1 focus:ring-[#001B3D]"
                      />
                      <motion.button
                        type="button"
                        onClick={sendMessage}
                        disabled={!input.trim() || sending}
                        whileTap={input.trim() && !sending ? { scale: 0.9 } : undefined}
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#001B3D] text-white transition hover:bg-[#001B3D]/90 disabled:opacity-50"
                      >
                        <Send className="h-4 w-4" />
                      </motion.button>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
