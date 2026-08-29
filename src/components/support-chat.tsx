import { useState, useEffect, useRef, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "@/lib/supabase-browser";
import { useAuth } from "@/lib/auth";
import { useDashboardI18n } from "@/lib/landing-i18n";
import { LifeBuoy, X, Send, Plus, MessageCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SupportSession, SupportMessage } from "@/lib/database-types";

function msgTime(ts: string) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function SessionBubble({ msg, isMine }: { msg: SupportMessage; isMine: boolean }) {
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
        <p
          className={cn(
            "mt-0.5 text-[10px]",
            isMine ? "text-white/50" : "text-muted-foreground",
          )}
        >
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

export function SupportChat() {
  const { user } = useAuth();
  const { t, dir } = useDashboardI18n();
  const [open, setOpen] = useState(false);
  const [sessions, setSessions] = useState<SupportSession[]>([]);
  const [activeSession, setActiveSession] = useState<SupportSession | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showSessions, setShowSessions] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchSessions = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from("support_sessions")
      .select("*")
      .eq("admin_id", user.id)
      .order("updated_at", { ascending: false });
    if (data) setSessions(data as SupportSession[]);
    return data as SupportSession[];
  }, [user?.id]);

  const fetchMessages = useCallback(async (sessionId?: string) => {
    const sid = sessionId ?? activeSession?.id;
    if (!sid) return;
    const { data } = await supabase
      .from("support_messages")
      .select("*")
      .eq("session_id", sid)
      .order("created_at", { ascending: true });
    if (data) setMessages(data as SupportMessage[]);
  }, [activeSession?.id]);

  const syncActiveSession = useCallback(
    (all: SupportSession[], current: SupportSession | null) => {
      const openS = all.find((s) => s.status === "open");
      if (openS && openS.id !== current?.id) {
        setActiveSession(openS);
        setShowSessions(false);
      } else if (!openS && all.length > 0 && !current) {
        setActiveSession(all[0]);
      }
    },
    [],
  );

  useEffect(() => {
    if (!open) return;
    fetchSessions().then((data) => {
      if (data) syncActiveSession(data, null);
    });
  }, [open, fetchSessions, syncActiveSession]);

  useEffect(() => {
    if (activeSession?.id) fetchMessages(activeSession.id);
    else setMessages([]);
  }, [activeSession?.id, fetchMessages]);

  useEffect(() => {
    if (!open || !activeSession?.id) return;
    fetchMessages(activeSession.id);
    const interval = setInterval(() => fetchMessages(activeSession.id), 5000);
    return () => clearInterval(interval);
  }, [open, activeSession?.id, fetchMessages]);

  useEffect(() => {
    if (!activeSession?.id) return;
    const channel = supabase
      .channel("support-msgs-" + activeSession.id)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "support_messages",
          filter: `session_id=eq.${activeSession.id}`,
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
  }, [activeSession?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || !user?.id || sending) return;

    let session = activeSession;
    if (!session || session.status === "closed") {
      const name = (user.user_metadata?.name as string) ?? user.email ?? "Admin";
      const { data: newSession } = await supabase
        .from("support_sessions")
        .insert({ admin_id: user.id, admin_name: name })
        .select()
        .single();
      if (!newSession) return;
      session = newSession as SupportSession;
      setActiveSession(session);
      setSessions((prev) => {
        const updated = [session!, ...prev];
        syncActiveSession(updated, session!);
        return updated;
      });
      setShowSessions(false);
    }

    setSending(true);
    await supabase.from("support_messages").insert({
      session_id: session.id,
      sender_id: user.id,
      sender_role: "admin",
      content: trimmed,
    });
    setInput("");
    setSending(false);
    fetchMessages(session.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const openSessions = sessions.filter((s) => s.status === "open");
  const isRtl = dir === "rtl";

  return (
    <div className="relative">
      <motion.button
        type="button"
        onClick={() => setOpen((p) => !p)}
        whileTap={{ scale: 0.92 }}
        aria-label="Assistance"
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
        {!open && openSessions.length > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="pointer-events-none absolute -end-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-0.5 text-[9px] font-black text-primary-foreground"
          >
            {openSessions.length}
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
                {showSessions && (
                  <motion.button
                    type="button"
                    onClick={() => setShowSessions(false)}
                    initial={{ x: -8, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className="flex items-center gap-1 text-sm font-medium text-white/80 hover:text-white"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={isRtl ? "rotate-180" : ""}><path d="M10 2L5 8l5 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    {t.supportChat.title}
                  </motion.button>
                )}
                {!showSessions && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
                    <a
                      href="https://wa.me/21277777428"
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="grid h-6 w-6 place-items-center rounded-full bg-[#25D366] text-white transition hover:brightness-110"
                      title="Discuter sur WhatsApp"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                    </a>
                    <span className="text-sm font-semibold">{activeSession?.admin_name || t.supportChat.title}</span>
                  </motion.div>
                )}
              </div>
              {!showSessions && (
                <div className="flex items-center gap-1">
                  {sessions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setShowSessions(true)}
                      className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-white/80 hover:bg-white/10 hover:text-white"
                    >
                      <Clock className="h-3 w-3" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      const name = (user?.user_metadata?.name as string) ?? user?.email ?? "Admin";
                      supabase
                        .from("support_sessions")
                        .insert({ admin_id: user?.id, admin_name: name })
                        .select()
                        .single()
                        .then(({ data }) => {
                          if (data) {
                            const s = data as SupportSession;
                            setSessions((prev) => [s, ...prev]);
                            setActiveSession(s);
                            setShowSessions(false);
                          }
                        });
                    }}
                    className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-white/80 hover:bg-white/10 hover:text-white"
                  >
                    <Plus className="h-3 w-3" />
                    {t.supportChat.newTicket}
                  </button>
                </div>
              )}
            </div>

            <AnimatePresence mode="wait">
              {showSessions ? (
                <motion.div
                  key="sessions"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.18 }}
                  className="flex-1 overflow-y-auto p-2"
                >
                  {sessions.length === 0 && (
                    <p className="p-4 text-center text-sm text-muted-foreground">
                      {t.supportChat.noSessions}
                    </p>
                  )}
                  {sessions.map((s, i) => (
                    <motion.button
                      key={s.id}
                      type="button"
                      onClick={() => { setActiveSession(s); setShowSessions(false); }}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03, duration: 0.2 }}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-muted",
                        activeSession?.id === s.id && "bg-muted",
                      )}
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#001B3D]/10 text-xs font-bold text-[#001B3D]">
                        {s.admin_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{s.admin_name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {s.status === "open" ? (
                            <span className="text-emerald-600">&#9679; {t.supportChat.title}</span>
                          ) : (
                            <span className="text-muted-foreground">{t.supportChat.sessionClosed}</span>
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
                      <div className="flex h-full items-center justify-center">
                        <p className="text-center text-sm text-muted-foreground">
                          {t.supportChat.noMessages}
                        </p>
                      </div>
                    )}
                    {messages.map((msg) => (
                      <SessionBubble key={msg.id} msg={msg} isMine={msg.sender_role === "admin"} />
                    ))}
                    {activeSession?.status === "closed" && (
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

                  {activeSession?.status !== "closed" && (
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
