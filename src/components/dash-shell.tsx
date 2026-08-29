import { Link, useNavigate, useLocation } from "@tanstack/react-router";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Toaster } from "@/components/ui/sonner";
import { useDashboardI18n } from "@/lib/landing-i18n";
import { Motif } from "@/components/skema/bits";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  LogOut,
  Bell,
  MessageCircle,
  Check,
  CheckCheck,
  AlertTriangle,
  ArrowLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  User,
  ShieldCheck,
  ExternalLink,
  RefreshCw,
  Send,
  GraduationCap,
  Plus,
  Trash2,
} from "lucide-react";
import {
  getMessageHistory,
  sendClientMessage,
  sendEmailNotification,
  sendBroadcast,
  deleteMessage,
} from "@/lib/server-whatsapp";
import { listClients } from "@/lib/server-clients";
import {
  softCard,
  softInput as inputClass,
  dialogSurface,
  labelClass,
  primaryPill,
} from "@/lib/dash-ui";

export type NavItem = {
  to: string;
  label: string;
  /** Condensed label for the mobile tab bar, where the full label would ellipsise. */
  shortLabel?: string;
  icon: any;
};

type PanelTab = "alertes" | "whatsapp";

function formatMsgTime(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "À l'instant";
  if (diffMin < 60) return `Il y a ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `Il y a ${diffH} h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return "Hier";
  if (diffD < 7) return `Il y a ${diffD} j`;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function parentName(m: { clients: { parent_name: string } | null; phone: string }): string {
  return m.clients?.parent_name ?? m.phone;
}

function ShellNotifications() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<PanelTab>("alertes");
  const [selected, setSelected] = useState<string | null>(null);
  const [sendOpen, setSendOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: rawMessages = [] } = useQuery({
    queryKey: ["message-history"],
    queryFn: () => getMessageHistory(),
    refetchInterval: 30_000,
  });
  const messages = rawMessages as unknown as Array<{
    id: string; direction: "sent" | "received"; phone: string; content: string;
    status: string; created_at: string; clients: { parent_name: string } | null;
  }>;

  const received = useMemo(() => messages.filter((m) => m.direction === "received"), [messages]);
  const sent = useMemo(() => messages.filter((m) => m.direction === "sent"), [messages]);
  const failedCount = sent.filter((m) => m.status === "failed").length;
  const sentCount = sent.length;

  const clearMutation = useMutation({
    mutationFn: async () => {
      for (const m of received) {
        await deleteMessage({ data: m.id });
      }
    },
    onSuccess: () => {
      toast.success("Notifications effacées");
      queryClient.invalidateQueries({ queryKey: ["message-history"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMsgMutation = useMutation({
    mutationFn: (id: string) => deleteMessage({ data: id }),
    onSuccess: () => {
      toast.success("Message supprimé");
      queryClient.invalidateQueries({ queryKey: ["message-history"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openOn = (n: PanelTab) => { setTab(n); setSelected(null); setOpen(true); };
  const selectedReceived = tab === "alertes" && selected ? received.find((m) => m.id === selected) : undefined;
  const selectedSent = tab === "whatsapp" && selected ? sent.find((m) => m.id === selected) : undefined;

  const triggerClass = "relative grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#001B3D]/15 text-muted-foreground transition-colors hover:text-foreground";
  const rowClass = "flex w-full gap-3 px-5 py-4 text-left transition-colors hover:bg-[#6C4DF6]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#17B3A6]";
  const actionClass = "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition";

  return (
    <>
      <button type="button" onClick={() => openOn("alertes")} aria-label={received.length > 0 ? `Notifications   ${received.length} reçues` : "Notifications"} className={cn(triggerClass, "hover:bg-[#6C4DF6]/15")}>
        <Bell className="h-4 w-4" strokeWidth={1.75} />
        {received.length > 0 ? (
          <span className="absolute -right-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[#FF666B] px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">
            {received.length > 9 ? "9+" : received.length}
          </span>
        ) : null}
      </button>

      <button type="button" onClick={() => openOn("whatsapp")} aria-label={failedCount > 0 ? `WhatsApp   ${failedCount} échecs` : `WhatsApp   ${sentCount} envoyés`} className={cn(triggerClass, "hover:bg-[#25D366]/15")}>
        <MessageCircle className="h-4 w-4" strokeWidth={1.75} />
        {sentCount > 0 ? (
          <span className={cn("absolute -right-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white", failedCount > 0 ? "bg-[#FF666B]" : "bg-[#25D366]")}>
            {(failedCount || sentCount) > 9 ? "9+" : (failedCount || sentCount)}
          </span>
        ) : null}
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="flex w-[min(26rem,100vw-2rem)] flex-col gap-0 border-l-[#001B3D]/10 bg-card p-0 sm:max-w-md">
          <SheetHeader className="space-y-1 border-b border-[#001B3D]/10 px-5 pb-4 pt-5 pr-14 text-left">
            <SheetTitle className="font-display text-xl tracking-tight text-foreground">Centre de messages</SheetTitle>
            <SheetDescription className="text-xs">Notifications reçues des parents et messages envoyés.</SheetDescription>
          </SheetHeader>

          {!selected ? (
            <div className="flex flex-col gap-2.5 border-b border-[#001B3D]/10 px-5 py-3">
              {/* Tabs and actions sit on separate rows: at the sheet's width, all four
                  controls on one line wrap "Tout effacer" and clip "Envoyer". */}
              <div className="flex gap-1">
                {([{ key: "alertes" as const, label: "Notifications", count: received.length, dot: "bg-[#FF666B]" },
                   { key: "whatsapp" as const, label: "WhatsApp", count: failedCount || sentCount, dot: failedCount > 0 ? "bg-[#FF666B]" : "bg-[#25D366]" }] as const).map((tb) => (
                  <button key={tb.key} type="button" onClick={() => setTab(tb.key)}
                    className={cn("inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors", tab === tb.key ? "bg-[#001B3D] text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
                    {tb.label}
                    {tb.count > 0 ? <span className={cn("grid h-[18px] min-w-[18px] place-items-center rounded-full px-1 text-[10px] font-bold leading-none text-white", tb.dot)}>{tb.count}</span> : null}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                {tab === "alertes" && received.length > 0 ? (
                  <button type="button" onClick={() => clearMutation.mutate()}
                    className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-[#FF666B]/30 px-3.5 py-1.5 text-xs font-semibold text-[#FF666B] transition hover:bg-[#FF666B]/10">
                    <Trash2 className="h-3.5 w-3.5" /> Tout effacer
                  </button>
                ) : null}
                <button type="button" onClick={() => setSendOpen(true)}
                  className="ml-auto inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-[#6C4DF6] px-4 py-1.5 text-xs font-bold text-white transition hover:brightness-105">
                  <Send className="h-3.5 w-3.5" /> Envoyer
                </button>
              </div>
            </div>
          ) : (
            <div className="border-b border-[#001B3D]/10 px-5 py-3">
              <button type="button" onClick={() => setSelected(null)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#001B3D] hover:underline">
                <ArrowLeft className="h-3.5 w-3.5" /> Retour à la liste
              </button>
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto scroll-touch">
            {selectedReceived ? (
              <div className="space-y-4 px-5 py-5">
                <div>
                  <p className="font-display text-lg font-semibold text-foreground">{parentName(selectedReceived)}</p>
                  <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">{formatMsgTime(selectedReceived.created_at)}   {selectedReceived.phone}</p>
                </div>
                <p className="rounded-2xl bg-muted/60 px-4 py-3 text-sm leading-relaxed text-foreground">{selectedReceived.content}</p>
                <div className="flex flex-wrap gap-2">
                  <Link to="/dashboard/familles" onClick={() => setOpen(false)} className={cn(actionClass, "bg-[#6C4DF6] text-[#001B3D] hover:brightness-105")}>
                    <ExternalLink className="h-3.5 w-3.5" /> Voir la fiche famille
                  </Link>
                  <Link to="/dashboard/paiements" onClick={() => setOpen(false)} className={cn(actionClass, "border border-[#001B3D]/15 text-foreground hover:bg-muted")}>
                    Voir les paiements
                  </Link>
                  <button type="button" onClick={() => { deleteMsgMutation.mutate(selectedReceived.id); setSelected(null); }} className={cn(actionClass, "border border-[#FF666B]/30 text-[#FF666B] hover:bg-[#FF666B]/10")}>
                    <Trash2 className="h-3.5 w-3.5" /> Supprimer
                  </button>
                </div>
              </div>
            ) : null}

            {selectedSent ? (
              <div className="space-y-4 px-5 py-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-lg font-semibold text-foreground">{parentName(selectedSent)}</p>
                    <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">{formatMsgTime(selectedSent.created_at)}   {selectedSent.phone}</p>
                  </div>
                  <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold", selectedSent.status === "sent" ? "bg-[#25D366]/15 text-[#1B7F45]" : "bg-[#FFE3E0] text-[#D93A41]")}>
                    {selectedSent.status === "sent" ? <CheckCheck className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                    {selectedSent.status === "sent" ? "Envoyé" : "Échec"}
                  </span>
                </div>
                <p className={cn("rounded-2xl border-l-[3px] px-4 py-3 text-sm leading-relaxed text-foreground", selectedSent.status === "sent" ? "border-l-[#25D366] bg-[#25D366]/[0.05]" : "border-l-[#FF666B] bg-[#FF666B]/[0.05]")}>
                  {selectedSent.content}
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedSent.status === "failed" ? (
                    <p className="text-xs font-medium text-[#D93A41]">Le message n'est pas parti.</p>
                  ) : (
                    <Link to="/dashboard/familles" onClick={() => setOpen(false)} className={cn(actionClass, "border border-[#001B3D]/15 text-foreground hover:bg-muted")}>
                      <ExternalLink className="h-3.5 w-3.5" /> Voir la fiche famille
                    </Link>
                  )}
                  <button type="button" onClick={() => { deleteMsgMutation.mutate(selectedSent.id); setSelected(null); }} className={cn(actionClass, "border border-[#FF666B]/30 text-[#FF666B] hover:bg-[#FF666B]/10")}>
                    <Trash2 className="h-3.5 w-3.5" /> Supprimer
                  </button>
                </div>
              </div>
            ) : null}

            {!selected && tab === "alertes" ? (
              <ul className="divide-y divide-[#001B3D]/8">
                {received.map((m) => (
                  <li key={m.id} className="group relative">
                    <button type="button" onClick={() => { setSelected(m.id); }} className={cn(rowClass, "pr-12")}>
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#17B3A6]" aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-medium text-foreground">{parentName(m)}</span>
                          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        </span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">{m.content}</span>
                        <span className="mt-1 block text-[10px] uppercase tracking-wider text-muted-foreground/80">{formatMsgTime(m.created_at)}</span>
                      </span>
                    </button>
                    <button type="button" onClick={(e) => { e.stopPropagation(); deleteMsgMutation.mutate(m.id); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-[#FF666B]/10 hover:text-[#FF666B] transition-all">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
                {received.length === 0 ? <li className="px-5 py-8 text-center text-xs text-muted-foreground">Aucune notification reçue</li> : null}
              </ul>
            ) : null}

            {!selected && tab === "whatsapp" ? (
              <ul className="divide-y divide-[#001B3D]/8">
                {sent.map((m) => (
                  <li key={m.id} className="group relative">
                    <button type="button" onClick={() => setSelected(m.id)}
                      className={cn(rowClass, "flex-col border-l-[3px] pr-12", m.status === "sent" ? "border-l-[#25D366] bg-[#25D366]/[0.05]" : "border-l-[#FF666B] bg-[#FF666B]/[0.05]")}>
                      <span className="flex w-full items-baseline justify-between gap-2">
                        <span className="truncate text-sm font-medium text-foreground">{parentName(m)}</span>
                        <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{m.phone}</span>
                      </span>
                      <span className="mt-1 block w-full text-xs text-muted-foreground">{m.content}</span>
                      <span className="mt-2 flex w-full items-center justify-between gap-2">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground/80">{formatMsgTime(m.created_at)}</span>
                        <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold", m.status === "sent" ? "bg-[#25D366]/15 text-[#1B7F45]" : "bg-[#FFE3E0] text-[#D93A41]")}>
                          {m.status === "sent" ? <CheckCheck className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                          {m.status === "sent" ? "Envoyé" : "Échec"}
                        </span>
                      </span>
                    </button>
                    <button type="button" onClick={(e) => { e.stopPropagation(); deleteMsgMutation.mutate(m.id); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-[#FF666B]/10 hover:text-[#FF666B] transition-all">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
                {sent.length === 0 ? <li className="px-5 py-8 text-center text-xs text-muted-foreground">Aucun message envoyé</li> : null}
              </ul>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>

      <SendMessageModal open={sendOpen} onOpenChange={setSendOpen} />
    </>
  );
}

function SendMessageModal({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t } = useDashboardI18n();
  const queryClient = useQueryClient();
  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: () => listClients() });
  const typedClients = clients as unknown as Array<{ id: string; parent_name: string; phone: string; email: string; whatsapp_optin: boolean }>;

  const [mode, setMode] = useState<"individual" | "all">("individual");
  const [selectedId, setSelectedId] = useState<string>("");
  const [channel, setChannel] = useState<"whatsapp" | "email">("whatsapp");
  const [content, setContent] = useState("");

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (mode === "individual") {
        if (!selectedId) throw new Error("Sélectionnez un parent");
        const client = typedClients.find((c) => c.id === selectedId);
        if (!client) throw new Error("Parent introuvable");
        if (channel === "whatsapp") {
          const wa = await sendClientMessage({ data: { clientId: selectedId, content } });
          if (!wa.ok) throw new Error(wa.error ?? "Erreur WhatsApp");
        } else {
          const em = await sendEmailNotification({
            data: {
              to: client.email,
              subject: "Message de l'école",
              message: content,
              parentName: client.parent_name,
            },
          });
          if (!em.ok) throw new Error(em.error ?? "Erreur email");
        }
      } else {
        const bc = await sendBroadcast({ data: { content } });
        if (!bc.ok) throw new Error(bc.error ?? "Erreur envoi");
      }
    },
    onSuccess: () => {
      toast.success(mode === "all" ? "Message envoyé à tous les parents" : "Message envoyé");
      queryClient.invalidateQueries({ queryKey: ["message-history"] });
      onOpenChange(false);
      setContent("");
      setSelectedId("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const valid = content.trim().length > 0 && (mode === "all" || selectedId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(dialogSurface, "max-w-[520px]")}>
        <DialogDescription className="sr-only">Envoyer un message aux parents</DialogDescription>
        <div className="border-t-4 border-t-primary">
          <div className="border-b border-border px-6 pb-4 pt-6 pr-14">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Centre de messages</p>
            <DialogTitle className="mt-2 text-left font-display text-xl font-semibold tracking-tight text-foreground">
              Envoyer un message
            </DialogTitle>
          </div>
          <form className="space-y-4 px-6 py-5" onSubmit={(e) => { e.preventDefault(); if (valid) sendMutation.mutate(); }}>
            <div className="space-y-1.5">
              <Label className={labelClass}>Destinataire</Label>
              <div className="flex gap-2">
                {[
                  { value: "individual" as const, label: "Individuel" },
                  { value: "all" as const, label: "Tous les parents" },
                ].map((opt) => (
                  <button key={opt.value} type="button" onClick={() => setMode(opt.value)}
                    className={cn("rounded-full px-4 py-2 text-xs font-semibold transition", mode === opt.value ? "bg-[#001B3D] text-white" : "border border-[#001B3D]/15 text-foreground hover:bg-muted")}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {mode === "individual" ? (
              <div className="space-y-1.5">
                <Label htmlFor="msg-client" className={labelClass}>Parent</Label>
                <Select value={selectedId} onValueChange={setSelectedId}>
                  <SelectTrigger id="msg-client" className="rounded-xl border-[#001B3D]/15">
                    <SelectValue placeholder="Sélectionner un parent..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-[#001B3D]/10">
                    {typedClients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.parent_name}   {c.phone}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <div className="space-y-1.5">
              <Label className={labelClass}>Canal</Label>
              <div className="flex gap-2">
                {[
                  { value: "whatsapp" as const, label: "WhatsApp", icon: MessageCircle },
                  { value: "email" as const, label: "Email", icon: Send },
                ].map((opt) => (
                  <button key={opt.value} type="button" onClick={() => setChannel(opt.value)}
                    className={cn("inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition", channel === opt.value ? "bg-[#001B3D] text-white" : "border border-[#001B3D]/15 text-foreground hover:bg-muted")}>
                    <opt.icon className="h-3.5 w-3.5" /> {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="msg-content" className={labelClass}>Message</Label>
              <textarea id="msg-content" value={content} onChange={(e) => setContent(e.target.value)} rows={4} required
                className={cn(inputClass, "min-h-[100px] resize-y rounded-2xl px-4 py-3 text-sm")}
                placeholder="Écrivez votre message ici..." />
            </div>

            <div className="flex flex-wrap justify-end gap-3 border-t border-border pt-5">
              <button type="button" onClick={() => onOpenChange(false)}
                className="rounded-full border border-[#001B3D]/15 bg-card px-5 py-2 text-sm font-medium text-foreground hover:bg-muted">
                {t.common.cancel}
              </button>
              <button type="submit" disabled={!valid || sendMutation.isPending}
                className="inline-flex items-center gap-2 rounded-full bg-[#6C4DF6] px-5 py-2 text-sm font-bold text-white shadow-[0_14px_30px_-14px_rgba(108,77,246,0.6)] transition hover:brightness-105 disabled:opacity-50">
                <Send className="h-4 w-4" />
                {sendMutation.isPending ? "Envoi..." : "Envoyer"}
              </button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * SKEMA iconography (brand guide §05): nav icons carry the brand accent colours,
 * one per module, rather than a flat monochrome. Keyed by route so it survives
 * i18n label changes.
 */
const NAV_ICON_COLOR: Record<string, string> = {
  "/dashboard": "#6C4DF6", // violet   — Tableau de bord
  "/dashboard/calendar": "#17B3A6", // turquoise — Calendrier
  "/dashboard/familles": "#6C4DF6", // violet   — Familles / Élèves
  "/dashboard/paiements": "#FFB347", // ocre     — Paiements / Finance
  "/dashboard/affiches": "#FF666B", // corail   — Annonces
  "/dashboard/settings": "#001B3D", // bleu nuit — Paramètres
};
const navIconColor = (to: string) => NAV_ICON_COLOR[to] ?? "#6C4DF6";

/** Signed-in user's avatar — a person icon, or a shield for superadmins. */
function RoleAvatar({ className }: { className?: string }) {
  const { role } = useAuth();
  const Icon = role === "superadmin" ? ShieldCheck : User;
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-nuit text-white shadow-[0_10px_20px_-10px_rgba(0,27,61,0.5)]",
        className,
      )}
    >
      <Icon className="h-4 w-4" strokeWidth={2} />
    </span>
  );
}

function topNavItemActive(pathname: string, to: string) {
  if (to === "/dashboard")
    return pathname === "/dashboard" || pathname === "/dashboard/";
  if (to === "/superadmin")
    return pathname === "/superadmin" || pathname === "/superadmin/";
  if (to === "/dashboard/rendez-vous")
    return pathname === "/dashboard/rendez-vous" || pathname.startsWith("/dashboard/rendez-vous/");
  if (to === "/dashboard/familles")
    return pathname === "/dashboard/familles" || pathname.startsWith("/dashboard/familles/");
  if (to === "/dashboard/paiements")
    return pathname === "/dashboard/paiements" || pathname.startsWith("/dashboard/paiements/");
  if (to === "/dashboard/affiches")
    return pathname === "/dashboard/affiches" || pathname.startsWith("/dashboard/affiches/");
  if (to === "/dashboard/rapports")
    return pathname === "/dashboard/rapports" || pathname.startsWith("/dashboard/rapports/");
  return pathname === to || pathname.startsWith(`${to}/`);
}

/** Mobile bottom bar   active tab: top accent bar + weight; no background fill. */
function MobileBottomNav({
  topNav,
  pathname,
  mainNavAria,
}: {
  topNav: NavItem[];
  pathname: string;
  mainNavAria: string;
}) {
  const compact = topNav.length >= 4;
  const labelClass = compact ? "text-[9px] leading-tight" : "text-[10px] leading-tight";

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#001B3D]/10 bg-white/95 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1 shadow-[0_-10px_35px_-15px_rgba(40,57,108,0.3)] backdrop-blur-xl lg:hidden" aria-label={mainNavAria}>
      <div className="grid min-h-[4.25rem] w-full auto-cols-fr" style={{ gridTemplateColumns: `repeat(${topNav.length}, minmax(0, 1fr))` }}>
        {topNav.map((n) => {
          const active = topNavItemActive(pathname, n.to);
          const Icon = n.icon;
          return (
            <Link
              key={n.to}
              to={n.to}
              className={cn(
                "relative mx-0.5 flex min-w-0 flex-col items-center justify-center gap-1 rounded-full px-0.5 py-2 font-sans transition-colors",
                active ? "text-foreground" : "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
              )}
            >
              <span className="flex h-1 w-full shrink-0 items-center justify-center" aria-hidden>
                <span className={cn("h-0.5 w-6 shrink-0 rounded-full", active ? "bg-primary" : "bg-transparent")} />
              </span>
              <Icon
                className="h-5 w-5 shrink-0"
                style={{ color: navIconColor(n.to) }}
                strokeWidth={active ? 2.25 : 1.75}
              />
              <span className={cn( "w-full max-w-full truncate px-0.5 text-center font-semibold leading-tight", labelClass, active ? "text-foreground" : "font-medium text-muted-foreground", )}>
                {n.shortLabel ?? n.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function DashShell({
  brand,
  brandColor: _brandColor,
  nav = [],
  topNav,
  secondaryNav,
  variant = "sidebar",
  hideNotifications,
  dir,
  children,
  fillHeight = true,
}: {
  brand: string;
  brandColor: "primary";
  nav?: NavItem[];
  topNav?: NavItem[];
  secondaryNav?: NavItem[];
  variant?: "sidebar" | "topnav";
  /** Hide the alerts/WhatsApp sheet (admin-centric   superadmin shell hides it). */
  hideNotifications?: boolean;
  dir?: "ltr" | "rtl";
  children: ReactNode;
  /** Default true: shell fills the full viewport (h-dvh) for standalone-page usage.
   *  Set false when nesting inside a sized wrapper (e.g. the Écran meta-header
   *  card) — the shell then fills its parent's height (h-full) instead. */
  fillHeight?: boolean;
}) {
  const { user, loading, logout } = useAuth();
  const { t } = useDashboardI18n();
  const navigate = useNavigate();
  const loc = useLocation();
  const shellDir = dir ?? "ltr";

  // Left rail collapse — icons-only when true, remembered per browser.
  const [railCollapsed, setRailCollapsed] = useState(false);
  useEffect(() => {
    try {
      setRailCollapsed(localStorage.getItem("skema_sidebar_collapsed") === "1");
    } catch {
      /* private mode / blocked storage — keep the default */
    }
  }, []);
  const toggleRail = () =>
    setRailCollapsed((v) => {
      const next = !v;
      try {
        localStorage.setItem("skema_sidebar_collapsed", next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });

  useEffect(() => {
    if (!loading && !user && typeof window !== "undefined") {
      const t = setTimeout(() => navigate({ to: "/login" }), 0);
      return () => clearTimeout(t);
    }
  }, [user, loading, navigate]);

  if (variant === "topnav" && topNav && topNav.length > 0) {
    const handleLogout = () => {
      logout();
      navigate({ to: "/login" });
    };

    const allNav = [...topNav, ...(secondaryNav ?? [])];

    return (
      <div className={cn("relative flex min-h-0 overflow-hidden bg-papier font-sans", fillHeight ? "h-dvh" : "h-full")} dir={shellDir}>
        <div className="dots pointer-events-none fixed inset-0 -z-10 opacity-50" />

        {/* Left rail — desktop only, mobile keeps the bottom tab bar */}
        <aside
          className={cn(
            "hidden h-full min-h-0 shrink-0 flex-col gap-6 border-r border-nuit/8 bg-gris-clair/40 py-6 transition-[width] duration-200 ease-out lg:flex",
            railCollapsed ? "w-[76px] px-3" : "w-[248px] px-5",
          )}
        >
          <div className={cn("flex items-center", railCollapsed ? "justify-center" : "justify-between")}>
            <Link to={topNav[0]?.to ?? "/dashboard"} className="flex items-center">
              <img
                src="/favicon.png"
                alt={`${brand} logo`}
                className={cn(railCollapsed ? "h-8 w-8" : "h-9 w-9")}
              />
            </Link>
            {!railCollapsed && (
              <button
                type="button"
                onClick={toggleRail}
                aria-label="Réduire le menu"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-nuit/45 transition-colors hover:bg-white/70 hover:text-nuit"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            )}
          </div>

          {railCollapsed && (
            <button
              type="button"
              onClick={toggleRail}
              aria-label="Déployer le menu"
              className="mx-auto grid h-8 w-8 shrink-0 place-items-center rounded-full text-nuit/45 transition-colors hover:bg-white/70 hover:text-nuit"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
          )}

          <nav className="flex flex-col gap-1">
            {allNav.map((n) => {
              const active = topNavItemActive(loc.pathname, n.to);
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  title={railCollapsed ? n.label : undefined}
                  className={cn(
                    "relative flex items-center rounded-full text-sm transition-colors",
                    railCollapsed ? "h-10 w-10 justify-center" : "gap-2.5 py-2 pl-4 pr-3.5",
                    active
                      ? "bg-white font-medium text-nuit shadow-[0_1px_2px_rgba(0,27,61,0.06)]"
                      : "text-nuit/55 hover:bg-white/70 hover:text-nuit",
                  )}
                >
                  {active ? (
                    <Motif
                      className={cn(
                        "absolute top-1/2 w-[11px] -translate-y-1/2",
                        railCollapsed ? "-left-[7px]" : "-left-[9px]",
                      )}
                    />
                  ) : null}
                  <n.icon
                    className="h-4 w-4 shrink-0"
                    style={{ color: navIconColor(n.to) }}
                    strokeWidth={active ? 2.25 : 2}
                  />
                  {!railCollapsed && n.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto flex flex-col gap-3 border-t border-nuit/8 pt-4">
            <div className={cn("flex items-center gap-2.5", railCollapsed && "justify-center")}>
              <RoleAvatar className="h-9 w-9" />
              {!railCollapsed && (
                <p className="min-w-0 truncate text-sm font-medium text-nuit">
                  {(user?.user_metadata?.name || user?.email || "admin")}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={handleLogout}
              title={railCollapsed ? t.shell.logout : undefined}
              className={cn(
                "inline-flex items-center rounded-full border border-nuit/12 text-xs text-nuit/60 transition-colors hover:bg-nuit/6 hover:text-nuit",
                railCollapsed ? "h-9 w-9 justify-center self-center" : "gap-1.5 px-3 py-1.5",
              )}
              aria-label={t.shell.logoutAria}
            >
              <LogOut className="h-3.5 w-3.5 shrink-0" />
              {!railCollapsed && t.shell.logout}
            </button>
          </div>
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {/* Top bar — page-specific title lives inside each page's own content; this
              strip just carries the mobile logo + global actions on every screen. */}
          <header className="z-30 flex shrink-0 items-center justify-between gap-3 border-b border-nuit/8 bg-papier/90 px-4 py-2.5 backdrop-blur-xl lg:justify-end lg:px-6">
            <Link to={topNav[0]?.to ?? "/dashboard"} className="flex items-center lg:hidden">
              <img src="/favicon.png" alt={`${brand} logo`} className="h-9 w-9" />
            </Link>
            <div className="flex shrink-0 items-center gap-2">
              {hideNotifications ? null : <ShellNotifications />}
              <RoleAvatar className="h-9 w-9 lg:hidden" />
              <button
                type="button"
                onClick={handleLogout}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-nuit/12 text-nuit/60 transition-colors hover:bg-nuit/6 hover:text-nuit lg:hidden"
                aria-label={t.shell.logoutAria}
              >
                <LogOut className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </div>
          </header>

          {/* pb clears the fixed bottom nav on mobile */}
          <main data-dashboard-main dir={shellDir} className="min-h-0 flex-1 overflow-y-auto scroll-touch p-4 pb-36 lg:p-8 lg:pb-8">
            {children}
          </main>
        </div>

        <MobileBottomNav topNav={topNav} pathname={loc.pathname} mainNavAria={t.shell.mainNavAria} />
        <Toaster />
      </div>
    );
  }

  return (
    <div className="flex h-dvh min-h-0 overflow-hidden bg-muted">
      <aside className="hidden h-full min-h-0 w-64 shrink-0 flex-col border-r border-border bg-card lg:flex">
        <div className="px-6 py-5 border-b border-border space-y-3">
          <div>
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#001B3D] shadow-[0_8px_20px_-10px_rgba(40,57,108,0.5)]">
              <GraduationCap className="h-[20px] w-[20px] text-[#6C4DF6]" />
            </span>
          </div>
        </div>
        <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto scroll-touch p-3">
          {nav.map((n) => {
            const active = loc.pathname === n.to;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition " +
                  (active
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-muted-foreground hover:bg-muted/80 hover:text-foreground")
                }
              >
                <n.icon className="h-4 w-4 shrink-0" style={{ color: navIconColor(n.to) }} />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-border">
          <button
            onClick={() => {
              logout();
              navigate({ to: "/login" });
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-muted/80"
          >
            <LogOut className="h-4 w-4" /> {t.shell.disconnect}
          </button>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="z-20 shrink-0 border-b border-border bg-card">
          <div className="px-6 h-16 flex items-center justify-end gap-4">
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium leading-none text-foreground">{(user?.user_metadata?.name || user?.email || "Admin")}</p>
              </div>
              <RoleAvatar className="h-9 w-9" />
            </div>
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto scroll-touch p-6 lg:p-8">{children}</main>
      </div>
      <Toaster />
    </div>
  );
}

export function StatCard({
  label,
  value,
  sub,
  color = "primary",
  monochrome,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
  monochrome?: boolean;
  icon?: any;
}) {
  return (
    <div className="rounded-2xl bg-card border border-[#001B3D]/10 p-5 shadow-[0_18px_45px_-28px_rgba(40,57,108,0.35)]">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
        {Icon && (
          <span
            className={
              monochrome
                ? "grid place-items-center h-8 w-8 rounded-lg bg-muted text-foreground"
                : "grid place-items-center h-8 w-8 rounded-lg"
            }
            style={
              monochrome
                ? undefined
                : { backgroundColor: `color-mix(in oklab, var(--${color}) 22%, var(--background))`, color: `var(--${color})` }
            }
          >
            <Icon className="h-4 w-4" />
          </span>
        )}
      </div>
      <p className="mt-3 font-display text-3xl text-foreground">{value}</p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

export function PageTitle({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: ReactNode }) {
  return (
    <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
      <div>
        {eyebrow && <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{eyebrow}</p>}
        <h1 className="mt-1 font-display text-3xl md:text-4xl text-foreground">{title}</h1>
      </div>
      {action}
    </div>
  );
}
