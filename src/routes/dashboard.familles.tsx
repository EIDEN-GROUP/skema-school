import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect, useRef, type ReactNode } from "react";
import { Sticker } from "@/components/skema/bits";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Pencil,
  Plus,
  Trash2,
  Search,
  GraduationCap,
  CalendarDays,
  MapPin,
  Phone,
  HeartPulse,
  Utensils,
  ShieldAlert,
  Percent,
  Bus,
  Package,
  Briefcase,
  BookOpen,
  Upload,
  Download,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RTooltip,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";
import { interpolate, useDashboardI18n } from "@/lib/landing-i18n";
import {
  softCard,
  softInput as inputClass,
  softSelectTrigger as selectTriggerClass,
  softSelectContent,
  dialogSurface,
  labelClass,
  primaryPill,
  ghostPill,
  iconButton,
  statusPill,
  STATUS_COLORS,
  dashTooltip,
  renderPieLabel,
  eyebrowClass,
} from "@/lib/dash-ui";
import { listClients, createClient, updateClient, deleteClient, getClient, importClientsCsv, type ClientInput } from "@/lib/server-clients";
import { getSettings, listLevels } from "@/lib/server-settings";
import { StudentFields } from "@/components/student-fields";
import { usePagination, TablePagination } from "@/components/table-pagination";

import { AddClientDialog, emptyChild, emptyWizard, type WizardData, type ChildFormData } from "@/components/add-client-wizard";
import { createPayment, updatePaymentInvoice } from "@/lib/server-payments";
import { generateReceiptPdf } from "@/lib/server-receipt";
import { sendClientMessage, sendBroadcast, sendPaymentConfirmation } from "@/lib/server-whatsapp";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/familles")({
  head: () => ({ meta: [{ title: "Parents   CRM" }] }),
  component: CrmParentsPage,
});

type PaymentStatus = "paye" | "en_attente" | "retard" | "impaye";

const PAYMENT_LABEL: Record<PaymentStatus, string> = {
  paye: "Payé",
  en_attente: "En attente",
  retard: "Retard",
  impaye: "Impayé",
};

type DbClient = {
  id: string;
  parent_name: string;
  child_name: string;
  child_age: string;
  email: string;
  email2: string;
  phone: string;
  phone2: string;
  cin: string;
  cin_mother: string;
  father_name: string;
  mother_name: string;
  profession_father: string;
  profession_mother: string;
  address: string;
  child_names: { name: string; dob: string; cycle: string; level: string; services: string[]; frais: string[] }[];
  dob: string;
  level: string;
  crm_stage: string;
  monthly_fee: number;
  debt: number;
  payment_status: PaymentStatus;
  payment_day: number;
  notes: string;
  whatsapp_optin: boolean;
  transport: boolean;
  cantine: boolean;
  garderie: boolean;
  activites: boolean;
  fratrie: number;
  remise: number;
  subscribed_services: string[];
  subscribed_frais: string[];
  created_at: string;
};

function remiseAuto(fratrie: number) {
  if (fratrie >= 4) return 15;
  if (fratrie >= 3) return 10;
  return 0;
}

function servicesOf(c: DbClient, svcNames: string[]) {
  const all = (c.child_names ?? []).flatMap((ch) => ch.services ?? []);
  const dedup = [...new Set(all)];
  return dedup.filter((s) => svcNames.includes(s));
}

/** Pie slice label that prints the raw total (not the percentage), grouped by thousands. */
function renderTotalLabel({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  value,
  percent,
}: {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  value: number;
  percent: number;
}) {
  // Thin wedges collide — the legend row underneath carries the exact figure.
  if (!value || (percent ?? 0) < 0.06) return null;
  const RAD = Math.PI / 180;
  const r = innerRadius + (outerRadius - innerRadius) * 0.6;
  const x = cx + r * Math.cos(-midAngle * RAD);
  const y = cy + r * Math.sin(-midAngle * RAD);
  return (
    <text
      x={x}
      y={y}
      fill="#fff"
      fontSize={12}
      fontWeight={700}
      textAnchor="middle"
      dominantBaseline="central"
    >
      {value.toLocaleString("fr-FR")}
    </text>
  );
}

function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className={labelClass}>
        {label}
      </Label>
      {children}
    </div>
  );
}

/** Puces des services souscrits. */
function ServiceChips({ services }: { services: string[] }) {
  if (services.length === 0) return <span className="text-xs text-muted-foreground">Aucun service</span>;
  return (
    <span className="flex flex-wrap justify-center gap-1">
      {services.map((s) => (
        <span
          key={s}
          className="inline-flex items-center gap-1 rounded-full bg-[#001B3D]/8 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#001B3D]"
        >
          {s}
        </span>
      ))}
    </span>
  );
}

/** Badge de remise fratrie (masqué quand la famille n'a pas de remise). */
function RemiseBadge({ client }: { client: FlatClient }) {
  if (!client.remise || client.remise <= 0) return <span className="text-xs text-muted-foreground"> </span>;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#6C4DF6]/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#0E6B62]">
      <Percent className="h-3 w-3" />
      {client.remise}%   {client.fratrie} enfants
    </span>
  );
}

/** Petit sélecteur de statut de paiement, coloré selon la valeur. */
function StatusSelect({
  value,
  onChange,
  className,
}: {
  value: PaymentStatus;
  onChange: (v: PaymentStatus) => void;
  className?: string;
}) {
  const tone =
    value === "paye"
      ? "bg-[#6C4DF6]/30 text-[#0E6B62]"
      : value === "retard"
        ? "bg-[#FFE3E0] text-[#D93A41]"
        : "bg-[#FFF3E6] text-[#B5760E]";
  return (
    <Select value={value} onValueChange={(v) => onChange(v as PaymentStatus)}>
      <SelectTrigger
        className={cn(
          "h-8 w-[8.5rem] gap-1.5 rounded-full border-0 px-3 text-[11px] font-semibold uppercase tracking-wide shadow-none focus:ring-0 focus:ring-offset-0",
          tone,
          className,
        )}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent className={softSelectContent}>
        <SelectItem value="paye">{PAYMENT_LABEL.paye}</SelectItem>
        <SelectItem value="en_attente">{PAYMENT_LABEL.en_attente}</SelectItem>
        <SelectItem value="retard">{PAYMENT_LABEL.retard}</SelectItem>
      </SelectContent>
    </Select>
  );
}

/** Sélecteur Oui / Non pour les services de l'école. */
function OuiNonSelect({
  id,
  value,
  onChange,
}: {
  id: string;
  value: OuiNon;
  onChange: (v: OuiNon) => void;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as OuiNon)}>
      <SelectTrigger id={id} className={selectTriggerClass}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent className={softSelectContent}>
        <SelectItem value="Oui">Oui</SelectItem>
        <SelectItem value="Non">Non</SelectItem>
      </SelectContent>
    </Select>
  );
}

function dash(v: string) {
  return v.trim() === "" ? " " : v;
}

type FlatClient = DbClient & { child_subtitle?: string; has_transport: boolean; has_cantine: boolean; has_garderie: boolean; has_activites: boolean };

function CrmParentsPage() {
  const { t } = useDashboardI18n();
  const queryClient = useQueryClient();
  const { data: rawClients = [] } = useQuery({ queryKey: ["clients"], queryFn: listClients });
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: getSettings });
  const services: Array<{ name: string; price: number; enabled: boolean }> = settings?.services ?? [];
  const svcNames = services.filter((s) => s.enabled).map((s) => s.name);

  const [search, setSearch] = useState("");
  const [niveauFilter, setNiveauFilter] = useState<string>("tous");
  const [serviceFilter, setServiceFilter] = useState<string>("tous");
  const [nivExpanded, setNivExpanded] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  // Une famille occupe plusieurs <tr> : le survol est piloté ici pour surligner
  // tout le groupe, et pas seulement la ligne de l'élève pointé.
  const [hoverId, setHoverId] = useState<string | null>(null);

  // Wizard data persists across dialog close so users don't lose their input
  const [wizard, setWizard] = useState<WizardData>(emptyWizard);

  const updateWizard = (patch: Partial<WizardData>) => setWizard((prev) => ({ ...prev, ...patch }));

  const removeClient = useMutation({
    mutationFn: (id: string) => deleteClient({ data: id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Fiche supprimée");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Erreur"),
  });

  const clients: FlatClient[] = useMemo(() => {
    return (rawClients as any[] ?? []).map((r: any) => ({
      ...r,
      child_subtitle: r.child_age ? `Enfant de ${r.child_age} ans` : undefined,
      has_transport: (r.subscribed_services ?? []).includes("Transport scolaire"),
      has_cantine: (r.subscribed_services ?? []).includes("Cantine"),
      has_garderie: (r.subscribed_services ?? []).includes("Garderie"),
      has_activites: (r.subscribed_services ?? []).some((s: string) => s.toLowerCase().includes("activit")),
    }));
  }, [rawClients]);

  // Base = recherche + service (sert au graphique) ; filtered ajoute le statut (sert au tableau)
  const base = useMemo(() => {
    const q = search.trim().toLowerCase();
    // Wait for settings to arrive, but don't blank the list just because the school
    // has no services configured   that hid every client.
    if (!settings) return [];
    return clients.filter((c) => {
      if (serviceFilter === "transport" && !c.has_transport) return false;
      if (serviceFilter === "cantine" && !c.has_cantine) return false;
      if (serviceFilter === "garderie" && !c.has_garderie) return false;
      if (serviceFilter === "activites" && !c.has_activites) return false;
      if (serviceFilter === "remise" && (c.remise ?? 0) <= 0) return false;
      if (!q) return true;
      const blob = `${c.parent_name} ${c.child_name} ${c.email} ${c.email2} ${c.phone} ${c.level}`.toLowerCase();
      return blob.includes(q);
    });
  }, [clients, search, serviceFilter, svcNames]);

  const niveaux = useMemo(
    () => [...new Set(base.map((c) => c.level).filter(Boolean))].sort(),
    [base],
  );

  const filtered = useMemo(
    () => base.filter((c) => niveauFilter === "tous" || c.level === niveauFilter),
    [base, niveauFilter],
  );

  // 5 familles par page ; tout changement de filtre renvoie en page 1.
  const pager = usePagination(filtered, `${search}|${serviceFilter}|${niveauFilter}`);

  const LEVEL_COLORS = [
    "#001B3D", "#6C4DF6", "#FF666B", "#FFCB7A", "#6C8FD6",
    "#FFB399", "#A8E8DD", "#9B7FFF", "#FF666B", "#3FC4B8",
  ];

  const donut = useMemo(() => {
    const counts: Record<string, number> = {};
    base.forEach((c) => {
      const lv = c.level || "Non défini";
      counts[lv] = (counts[lv] ?? 0) + 1;
    });
    return Object.entries(counts)
      .sort(([a], [b]) => {
        if (a === "Non défini") return 1;
        if (b === "Non défini") return -1;
        return a.localeCompare(b);
      })
      .map(([name, value], i) => ({
        name,
        value,
        color: LEVEL_COLORS[i % LEVEL_COLORS.length],
      }));
  }, [base]);
  const donutTotal = donut.reduce((s, d) => s + d.value, 0);

  // Revenu par service. Une famille peut cumuler plusieurs services : on somme
  // le prix du service pour chaque famille abonnée (value = prix × nb familles),
  // pas de pourcentage   les ensembles se chevauchent et ne totalisent pas 100 %.
  const serviceDonut = useMemo(() => {
    const priceOf: Record<string, number> = {};
    services.forEach((s) => {
      priceOf[s.name] = Number(s.price) || 0;
    });
    const counts: Record<string, number> = {};
    svcNames.forEach((name) => {
      counts[name] = 0;
    });
    base.forEach((c) => {
      (c.child_names ?? []).forEach((child) => {
        (child.services ?? []).forEach((s) => {
          if (s in counts) counts[s] += 1;
        });
      });
    });
    return svcNames
      .map((name, i) => ({
        name,
        count: counts[name] ?? 0,
        value: (counts[name] ?? 0) * (priceOf[name] ?? 0),
        color: LEVEL_COLORS[i % LEVEL_COLORS.length],
      }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [base, svcNames, services]);
  const serviceTotal = serviceDonut.reduce((s, d) => s + d.value, 0);

  const detail = detailId ? clients.find((c) => c.id === detailId) : null;
  const edit = editId ? clients.find((c) => c.id === editId) : null;
  const paymentClient = paymentId ? clients.find((c) => c.id === paymentId) : null;

  const fileRef = useRef<HTMLInputElement>(null);
  const importCsv = useMutation({
    mutationFn: (input: { csvText: string }) => importClientsCsv({ data: input }),
    onSuccess: (r) => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success(`${r.imported} client(s) importé(s)${r.errors.length ? `, ${r.errors.length} erreur(s)` : ""}`);
      if (r.errors.length) r.errors.forEach((e) => toast.error(e));
      setPreviewRows(null);
    },
    onError: (err) => {
      console.error("CSV import error:", err);
      toast.error(err instanceof Error ? err.message : `Erreur import CSV${err ? ` : ${JSON.stringify(err)}` : ""}`);
      setPreviewRows(null);
    },
  });

  function handleExportCsv() {
    const cols = [
      "parent_name", "child_name", "child_names", "email", "phone", "address",
      "level", "monthly_fee", "remise", "payment_day", "fratrie",
      "transport", "cantine", "garderie", "activites", "notes",
    ];
    const header = cols.join(",");
    const body = clients.map((c) => {
      const childNames = JSON.stringify(c.child_names ?? []);
      const esc = (v: unknown) => {
        const s = String(v ?? "");
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };
      return cols.map((col) => {
        if (col === "child_names") return esc(childNames);
        return esc((c as Record<string, unknown>)[col]);
      }).join(",");
    }).join("\n");
    const csv = `${header}\n${body}`;
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "clients.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const [previewRows, setPreviewRows] = useState<Record<string, string>[] | null>(null);
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);
  const [csvText, setCsvText] = useState("");

  function parseCsvClient(text: string): { headers: string[]; rows: Record<string, string>[] } {
    let t = text;
    if (t.charCodeAt(0) === 0xfeff) t = t.slice(1);
    t = t.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

    const lines: string[] = t.split("\n").filter((l) => l.trim());
    if (lines.length < 2) return { headers: [], rows: [] };

    function splitLine(line: string): string[] {
      const res: string[] = [];
      let cur = "", q = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') {
          if (q && line[i + 1] === '"') { cur += '"'; i++; }
          else q = !q;
        } else if (c === "," && !q) { res.push(cur); cur = ""; }
        else cur += c;
      }
      res.push(cur);
      return res;
    }

    const headers = splitLine(lines[0]).map((h) => h.trim());
    const rows: Record<string, string>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const vals = splitLine(lines[i]);
      const row: Record<string, string> = {};
      headers.forEach((h, j) => { row[h] = (vals[j] ?? "").trim(); });
      rows.push(row);
    }
    return { headers, rows };
  }

  function handleImportCsv(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const { headers, rows } = parseCsvClient(text);
      if (rows.length === 0) {
        toast.error("Aucune ligne valide dans le fichier CSV");
        return;
      }
      setPreviewHeaders(headers);
      setPreviewRows(rows);
      setCsvText(text);
    };
    reader.readAsText(file);
  }

  function confirmImportCsv() {
    if (!csvText) return;
    importCsv.mutate({ csvText });
  }

  const validateWarnings = useMemo(() => {
    if (!previewRows || !previewHeaders.length) return [];
    const warnings: string[] = [];
    const h = previewHeaders.map((x) => x.toLowerCase());

    const nameCol = previewHeaders.find((x) =>
      ["parent_name", "parent", "nom parent", "nom_parent"].includes(x.toLowerCase())
    );
    if (!nameCol) warnings.push("Colonne manquante : parent_name / Parent");

    const recommended = [
      { label: "child_name / Enfant", keys: ["child_name", "enfant"] },
      { label: "email / Email", keys: ["email"] },
      { label: "phone / Téléphone", keys: ["phone", "telephone", "téléphone", "tel"] },
      { label: "level / Niveau", keys: ["level", "niveau"] },
      { label: "monthly_fee / Frais mensuels", keys: ["monthly_fee", "frais mensuels", "frais_mensuels"] },
    ];
    recommended.forEach((r) => {
      if (!r.keys.some((k) => h.includes(k))) warnings.push(`Colonne conseillée manquante : ${r.label}`);
    });

    if (nameCol) {
      const missing = previewRows.filter((row) => !(row[nameCol] ?? "").trim()).length;
      if (missing) warnings.push(`${missing} ligne(s) sans parent`);
    }
    return warnings;
  }, [previewRows, previewHeaders]);

  return (
    <div className="space-y-6">
      <header className="relative flex flex-wrap items-end justify-between gap-4">
        <Sticker name="graduationCap" tilt={-6} className="pointer-events-none absolute -top-2 right-0 hidden w-16 opacity-90 sm:block" />
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">{t.familles.eyebrow}</p>
          <h1 className="font-hand mt-1 text-4xl tracking-tight text-foreground md:text-5xl">
            {t.familles.titleBold}{" "}
            {t.familles.titleItalic ? <span className="italic text-muted-foreground">{t.familles.titleItalic}</span> : null}
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Fiches élèves complètes   scolarité, contacts, santé et suivi des paiements mensuels.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImportCsv(f); e.target.value = ""; }}
          />
          <button type="button" onClick={handleExportCsv} className={cn(ghostPill, "gap-1.5")} title="Exporter en CSV">
            <Download className="h-3.5 w-3.5" /> CSV
          </button>
          <button type="button" onClick={() => fileRef.current?.click()} disabled={importCsv.isPending} className={cn(ghostPill, "gap-1.5 disabled:opacity-50")} title="Importer un CSV">
            {importCsv.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            CSV
          </button>
          <button type="button" onClick={() => setAddOpen(true)} className={primaryPill}>
            <Plus className="h-4 w-4" />
            {t.familles.addClient}
          </button>
        </div>
      </header>

      {/* Filtres (barre pleine largeur) puis les deux camemberts en dessous */}
      <div className="space-y-4">
        <section className={cn(softCard, "p-5")}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Filtres</p>
          <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end">
            <div className="relative lg:flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t.familles.searchPlaceholder}
                className={cn(inputClass, "pl-10")}
                aria-label={t.familles.searchAria}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:flex lg:gap-3">
              <div className="lg:w-48">
                <Label className={labelClass}>Niveau</Label>
                <Select value={niveauFilter} onValueChange={setNiveauFilter}>
                  <SelectTrigger className={cn(selectTriggerClass, "mt-1.5")} aria-label="Filtrer par niveau">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={softSelectContent}>
                    <SelectItem value="tous">Tous les niveaux</SelectItem>
                    {niveaux.map((n) => (
                      <SelectItem key={n} value={n}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="lg:w-48">
                <Label className={labelClass}>Service souscrit</Label>
                <Select value={serviceFilter} onValueChange={setServiceFilter}>
                  <SelectTrigger className={cn(selectTriggerClass, "mt-1.5")} aria-label="Filtrer par service">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={softSelectContent}>
                    <SelectItem value="tous">Tous les services</SelectItem>
                    <SelectItem value="transport">Transport scolaire</SelectItem>
                    <SelectItem value="cantine">Cantine</SelectItem>
                    <SelectItem value="garderie">Garderie</SelectItem>
                    <SelectItem value="activites">Activités périscolaires</SelectItem>
                    <SelectItem value="remise">Avec remise fratrie</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-xs text-muted-foreground lg:whitespace-nowrap lg:pb-2.5">
              {filtered.length === 1
                ? t.familles.clientsFoundOne
                : interpolate(t.familles.clientsFoundMany, { count: filtered.length })}
            </p>
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        {/* Graphique circulaire   revenu total par service (prix × nb de familles) */}
        <section className={cn(softCard, "flex flex-col p-5")}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Revenu par service</p>
          {serviceTotal > 0 ? (
            <>
              <div className="mx-auto mt-2 h-48 w-full max-w-[15rem]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={serviceDonut}
                      dataKey="value"
                      nameKey="name"
                      outerRadius="95%"
                      stroke="none"
                      labelLine={false}
                      label={renderTotalLabel}
                    >
                      {serviceDonut.map((d) => (
                        <Cell key={d.name} fill={d.color} />
                      ))}
                    </Pie>
                    <RTooltip
                      contentStyle={dashTooltip}
                      formatter={(value: number, name: string) => [`${value.toLocaleString("fr-FR")} MAD`, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="mt-3 space-y-1.5">
                {serviceDonut.map((d) => (
                  <li key={d.name} className="flex items-center justify-between gap-2 rounded-full bg-muted/60 px-3 py-1.5 text-xs">
                    <span className="flex items-center gap-2 font-medium text-foreground">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                      {d.name}
                    </span>
                    <span className="font-semibold tabular-nums text-foreground">
                      {d.value.toLocaleString("fr-FR")} MAD
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="mt-8 text-center text-sm text-muted-foreground">
              Aucune souscription à un service pour cette sélection.
            </p>
          )}
        </section>

        {/* Graphique circulaire   répartition par niveau */}
        <section className={cn(softCard, "flex flex-col p-5")}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Répartition par niveau</p>
          {donutTotal > 0 ? (
            <>
              <div className="mx-auto mt-2 h-48 w-full max-w-[15rem]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donut}
                      dataKey="value"
                      nameKey="name"
                      outerRadius="95%"
                      stroke="none"
                      labelLine={false}
                      label={renderPieLabel}
                    >
                      {donut.map((d) => (
                        <Cell key={d.name} fill={d.color} />
                      ))}
                    </Pie>
                    <RTooltip
                      contentStyle={dashTooltip}
                      formatter={(value: number, name: string) => [`${value} élève${value > 1 ? "s" : ""}`, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="mt-3 space-y-1.5">
                {(nivExpanded ? donut : donut.slice(0, 6)).map((d) => {
                  const share = Math.round((d.value / donutTotal) * 100);
                  return (
                    <li key={d.name} className="flex items-center justify-between gap-2 rounded-full bg-muted/60 px-3 py-1.5 text-xs">
                      <span className="flex items-center gap-2 font-medium text-foreground">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                        {d.name}
                      </span>
                      <span className="font-semibold tabular-nums text-foreground">
                        {d.value} · {share}%
                      </span>
                    </li>
                  );
                })}
              </ul>
              {donut.length > 6 ? (
                <button
                  type="button"
                  onClick={() => setNivExpanded((v) => !v)}
                  aria-expanded={nivExpanded}
                  className="mt-2 inline-flex items-center gap-1 self-start rounded-full px-3 py-1.5 text-xs font-semibold text-[#001B3D] transition hover:bg-[#6C4DF6]/15"
                >
                  {nivExpanded ? "Afficher moins" : `Afficher les ${donut.length} niveaux`}
                  <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", nivExpanded && "rotate-180")} />
                </button>
              ) : null}
            </>
          ) : null}
        </section>
        </div>
      </div>

      {/* Tableau   cliquer une ligne ouvre la fiche complète */}
      <section className={cn(softCard, "overflow-hidden")}>
        <div className="border-b border-[#001B3D]/10 px-5 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{t.familles.clientList}</p>
        </div>
        <div className="overflow-x-auto">
          {/* Grille verticale posée au niveau du tableau plutôt que cellule par
              cellule : une colonne ajoutée ou retirée hérite du filet sans risque
              d'oubli. Pas de `:last-child` ici   sur les lignes de fratrie la
              dernière cellule est Services (les colonnes famille sont en rowSpan),
              le filet de droite sauterait donc une ligne sur deux. */}
          <table
            className={cn(
              "w-full min-w-[1200px] text-left text-sm",
              "[&_th]:border-r [&_th]:border-[#001B3D]/15",
              "[&_td]:border-r [&_td]:border-[#001B3D]/8",
            )}
          >
            {/* Alignement : texte à gauche (l'œil descend le long d'un bord franc),
                montants à droite en chiffres tabulaires (les MAD s'alignent par
                unité), badges et actions centrés. */}
            <thead>
              <tr className="border-b border-[#001B3D]/15 bg-muted/60 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="whitespace-nowrap px-4 py-3.5">{t.familles.table.parent}</th>
                <th className="whitespace-nowrap px-4 py-3.5">Élève(s)</th>
                <th className="whitespace-nowrap px-4 py-3.5">Niveau</th>
                <th className="whitespace-nowrap px-4 py-3.5">Emails des parents</th>
                <th className="whitespace-nowrap px-4 py-3.5">{t.familles.table.contact}</th>
                <th className="whitespace-nowrap px-4 py-3.5 text-center">Services</th>
                <th className="whitespace-nowrap px-4 py-3.5 text-center">Remise fratrie</th>
                <th className="whitespace-nowrap px-4 py-3.5 text-right">{t.familles.table.monthly}</th>
                <th className="w-36 whitespace-nowrap px-4 py-3.5 text-center">{t.familles.table.actions}</th>
              </tr>
            </thead>
            {/* Une <tr> par élève : Élève / Niveau / Services se lisent ligne par ligne,
                les colonnes propres à la famille s'étendent sur tout le groupe (rowSpan).
                Le divide-y de tbody ne trace donc un trait que sous les cellules qui
                commencent sur la ligne   fin trait entre élèves, trait plein entre familles. */}
            <tbody className="divide-y divide-[#001B3D]/8">
              {pager.pageItems.flatMap((c, familyIdx) => {
                const kids = (c.child_names ?? []).filter((ch) => ch.name?.trim());
                // Sans child_names, on retombe sur l'élève unique des champs hérités.
                const rows: Array<(typeof kids)[number] | null> = kids.length > 0 ? kids : [null];
                const span = rows.length;
                const hovered = hoverId === c.id;
                // Bandes une famille sur deux : le bloc d'une fratrie se lit d'un
                // bloc, sans compter les traits pour savoir où la famille s'arrête.
                const banded = familyIdx % 2 === 1;
                // Rappel visuel du statut déjà écrit dans la colonne Mensualité :
                // l'admin repère les familles à relancer sans traverser 8 colonnes.
                const accent = STATUS_COLORS[c.payment_status] ?? STATUS_COLORS.en_attente;

                return rows.map((ch, i) => (
                  <tr
                    key={`${c.id}-${i}`}
                    onClick={() => setDetailId(c.id)}
                    onMouseEnter={() => setHoverId(c.id)}
                    onMouseLeave={() => setHoverId(null)}
                    className={cn(
                      "cursor-pointer transition-colors",
                      hovered ? "bg-[#6C4DF6]/40" : banded ? "bg-[#6C4DF6]/[0.18]" : "bg-card",
                    )}
                  >
                    {i === 0 ? (
                      <td
                        rowSpan={span}
                        className="border-l-[3px] px-4 py-3.5 align-middle font-medium text-foreground"
                        style={{ borderLeftColor: accent }}
                      >

                        <span className="block">{c.parent_name}</span>
                      </td>
                    ) : null}
                    <td className="px-4 py-3.5 align-middle text-foreground">
                      <span className="block font-medium">{ch ? ch.name : dash(c.child_name)}</span>
                      {i === 0 && c.child_subtitle ? (
                        <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                          {c.child_subtitle}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3.5 align-middle text-muted-foreground">
                      {dash((ch ? ch.level : c.level) ?? "")}
                    </td>
                    {i === 0 ? (
                      <td rowSpan={span} className="px-4 py-3.5 align-middle text-muted-foreground">
                        <span className="block">{dash(c.email)}</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground/70">{dash(c.email2)}</span>
                      </td>
                    ) : null}
                    {i === 0 ? (
                      <td rowSpan={span} className="px-4 py-3.5 align-middle text-muted-foreground">
                        <span className="block whitespace-nowrap">{c.phone}</span>
                        <span className="mt-0.5 block whitespace-nowrap text-xs text-muted-foreground/70">{dash(c.phone2)}</span>
                      </td>
                    ) : null}
                    <td className="px-4 py-3.5 align-middle">
                      <ServiceChips
                        services={
                          ch
                            ? (ch.services ?? []).filter((s) => svcNames.includes(s))
                            : servicesOf(c, svcNames)
                        }
                      />
                    </td>
                    {i === 0 ? (
                      <td rowSpan={span} className="px-4 py-3.5 text-center align-middle">
                        <RemiseBadge client={c} />
                      </td>
                    ) : null}
                    {i === 0 ? (
                      <td rowSpan={span} className="whitespace-nowrap px-4 py-3.5 text-right align-middle tabular-nums text-foreground/90">
                        <span className="block font-semibold text-foreground">
                          {(c.monthly_fee ?? 0)} {t.common.mad}
                        </span>
                        {(c.remise ?? 0) > 0 ? (
                          <span className="mt-0.5 block text-xs text-muted-foreground/70">
                            {Math.round((c.monthly_fee ?? 0) * (1 - (c.remise ?? 0) / 100))} {t.common.mad} après remise
                          </span>
                        ) : null}
                        {/* Reflète le paiement : recalc_client_debt met à jour debt/statut après chaque paiement.
                            Un client sans recalc a debt=0 mais n'est pas payé, d'où le test sur le statut. */}
                        {c.payment_status === "paye" ? (
                          <span className="mt-1 block text-xs font-medium text-[#17B3A6]">Mois payé</span>
                        ) : (
                          <span className="mt-1 block text-xs font-medium text-[#FF666B]">
                            Reste : {(c.debt ?? 0) > 0 ? c.debt : Math.round((c.monthly_fee ?? 0) * (1 - (c.remise ?? 0) / 100))} {t.common.mad}
                          </span>
                        )}
                      </td>
                    ) : null}
                    {i === 0 ? (
                      <td rowSpan={span} className="px-4 py-3.5 align-middle" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => setEditId(c.id)}
                            className={iconButton}
                            title="Modifier"
                            aria-label={interpolate(t.familles.editAria, { name: c.child_name })}
                          >
                            <Pencil className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Supprimer définitivement la fiche de ${c.child_name} (${c.parent_name}) ?`)) {
                                removeClient.mutate(c.id);
                              }
                            }}
                            disabled={removeClient.isPending}
                            className={cn(iconButton, "text-[#FF666B] hover:bg-[#FF666B]/10 hover:text-[#FF666B] disabled:opacity-50")}
                            title="Supprimer"
                            aria-label={`Supprimer la fiche de ${c.child_name}`}
                          >
                            <Trash2 className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                          </button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ));
              })}

           </tbody>
          </table>
        </div>
        {filtered.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">{t.familles.noMatch}</p>
        ) : null}
        <TablePagination
          page={pager.page}
          pageCount={pager.pageCount}
          total={pager.total}
          pageSize={pager.pageSize}
          onPage={pager.setPage}
          label={pager.total > 1 ? "familles" : "famille"}
        />
      </section>

      <AddClientDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        wizard={wizard}
        updateWizard={updateWizard}
        setWizard={setWizard}
      />

      {detail ? (
        <DetailClientDialog
          client={detail}
          open={!!detailId}
          onOpenChange={(o) => !o && setDetailId(null)}
          onEdit={() => {
            setEditId(detail.id);
            setDetailId(null);
          }}
          onPayment={() => {
            setPaymentId(detail.id);
            setDetailId(null);
          }}
        />
      ) : null}

      {paymentClient ? (
        <PaymentDialog
          clientId={paymentClient.id}
          clientLabel={paymentClient.parent_name}
          clientEmail={paymentClient.email}
          open={!!paymentId}
          onOpenChange={(o) => {
            if (!o) setPaymentId(null);
          }}
        />
      ) : null}

      {edit ? (
        <EditClientDialog
          key={edit.id}
          client={edit}
          open={!!editId}
          onOpenChange={(o) => !o && setEditId(null)}
        />
      ) : null}

      <Dialog open={!!previewRows} onOpenChange={(o) => !o && setPreviewRows(null)}>
        <DialogContent className="max-w-[90vw] max-h-[85vh] flex flex-col">
          <DialogTitle className="text-lg font-semibold">Aperçu des données CSV</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {previewRows ? `${previewRows.length} client(s) détecté(s). Vérifiez les données avant de confirmer l'import.` : ""}
          </DialogDescription>
          {validateWarnings.length > 0 ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {validateWarnings.map((w, i) => (
                <p key={i} className="flex items-center gap-1.5">
                  <span className="shrink-0">⚠️</span> {w}
                </p>
              ))}
              <p className="mt-1 text-[10px] text-amber-600">L'import peut tout de même être tenté avec les données disponibles.</p>
            </div>
          ) : previewRows ? (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
              Toutes les colonnes recommandées sont présentes.
            </div>
          ) : null}
          <div className="flex-1 overflow-auto rounded-md border">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/50">
                  {previewHeaders.map((h, i) => (
                    <th key={i} className="whitespace-nowrap px-3 py-2 text-left font-semibold text-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows?.map((row, ri) => (
                  <tr key={ri} className="border-t border-border odd:bg-card">
                    {previewHeaders.map((h, ci) => (
                      <td key={ci} className="max-w-[200px] truncate px-3 py-1.5 text-foreground" title={row[h]}>{row[h]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setPreviewRows(null)}
              className="rounded-full border border-border bg-card px-5 py-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={confirmImportCsv}
              disabled={importCsv.isPending}
              className="rounded-full bg-[#17B3A6] px-5 py-2 text-sm font-medium text-white hover:bg-[#0E9C90] disabled:opacity-60"
            >
              {importCsv.isPending ? "Import en cours…" : `Importer ${previewRows?.length ?? 0} client(s)`}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Fiche complète (lecture) ───────────────────────────────
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <p className={labelClass}>{label}</p>
      <p className="text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function SectionTitle({ icon: Icon, children }: { icon: typeof GraduationCap; children: ReactNode }) {
  return (
    <p className="col-span-full mt-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
      <span className="grid h-6 w-6 place-items-center rounded-lg bg-[#001B3D]/8 text-[#001B3D]">
        <Icon className="h-3.5 w-3.5" />
      </span>
      {children}
    </p>
  );
}

function DetailClientDialog({
  client,
  open,
  onOpenChange,
  onEdit,
  onPayment,
}: {
  client: FlatClient;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
  onPayment: () => void;
}) {
  const { t } = useDashboardI18n();
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: getSettings });
  const services: Array<{ name: string; price: number; enabled: boolean }> = settings?.services ?? [];
  const subscribed = client.subscribed_services ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(dialogSurface, "w-[min(100vw-1.5rem,680px)] max-w-[680px]")}>
        <DialogDescription className="sr-only">Fiche complète de {client.child_name}</DialogDescription>
        <div className="flex min-h-0 flex-1 flex-col border-t-4 border-t-[#6C4DF6]">
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[#001B3D]/10 px-6 pb-4 pt-6 pr-14">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Fiche élève</p>
              <DialogTitle className="mt-1 text-left font-display text-xl font-semibold tracking-tight text-foreground">
                {client.child_name} <span className="font-normal text-muted-foreground">· {client.parent_name}</span>
              </DialogTitle>
            </div>
            <div className="text-right">
              <p className={labelClass}>Niveau</p>
              <span className="mt-1 inline-block rounded-full bg-[#6C4DF6]/30 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#0E6B62]">
                {dash(client.level)}
              </span>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto scroll-touch px-6 py-5">
            <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              <SectionTitle icon={GraduationCap}>Scolarité</SectionTitle>
              <InfoRow label="Nom de l'élève" value={client.child_name} />
              <InfoRow label="Âge" value={dash(client.child_age)} />
              <InfoRow label="Date de naissance" value={dash(client.dob)} />
              <InfoRow label="Niveau / Classe" value={dash(client.level)} />
              <InfoRow label="Date d'inscription" value={dash(new Date(client.created_at).toLocaleDateString("fr-FR"))} />
              <InfoRow label="Enfants scolarisés" value={`${client.fratrie ?? 1}`} />

      <SectionTitle icon={CalendarDays}>Parents & identité</SectionTitle>
        <InfoRow label="Nom du père" value={dash(client.father_name)} />
        <InfoRow label="Nom de la mère" value={dash(client.mother_name)} />
        <InfoRow label="CIN / Passeport (père)" value={dash(client.cin)} />
        <InfoRow label="CIN / Passeport (mère)" value={dash(client.cin_mother)} />

        <SectionTitle icon={Briefcase}>Profession & adresse</SectionTitle>
        <InfoRow label="Adresse" value={dash(client.address)} />

        <SectionTitle icon={Phone}>Contact</SectionTitle>
        <InfoRow label="Email du père" value={dash(client.email)} />
        <InfoRow label="Email de la mère" value={dash(client.email2)} />
        <InfoRow label="Téléphone 1" value={dash(client.phone)} />
        <InfoRow label="Téléphone 2" value={dash(client.phone2)} />

        <SectionTitle icon={ShieldAlert}>Contact d'urgence</SectionTitle>
        <InfoRow label="Notes" value={dash(client.notes)} />

        <SectionTitle icon={BookOpen}>Élèves</SectionTitle>
        {(client.child_names ?? []).length > 0 ? (
          (client.child_names ?? []).map((ch, i) => (
            <div key={i} className="col-span-full rounded-xl bg-muted/40 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Élève {i + 1}   {ch.name}
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <InfoRow label="Date de naissance" value={dash(ch.dob)} />
                <InfoRow label="Cycle" value={dash(ch.cycle)} />
                <InfoRow label="Niveau" value={dash(ch.level)} />
                <InfoRow label="Services" value={(ch.services ?? []).join(", ") || " "} />
              </div>
            </div>
          ))
        ) : (
          <InfoRow label="Nom de l'élève" value={dash(client.child_name)} />
        )}

        <SectionTitle icon={Bus}>Frais supplémentaires</SectionTitle>
        {(() => {
          const all = (client.child_names ?? []).flatMap((ch) => ch.frais ?? []);
          const dedup = [...new Set(all as string[])];
          return dedup.length > 0
            ? dedup.map((f) => <InfoRow key={f} label={f} value="Souscrit" />)
            : <InfoRow label="Aucun" value=" " />;
        })()}

              <SectionTitle icon={Utensils}>Paiement & remise</SectionTitle>
              <InfoRow label="Frais mensuels" value={`${client.monthly_fee ?? 0} ${t.common.mad}`} />
              <InfoRow
                label="Remise fratrie"
                value={(client.remise ?? 0) > 0 ? `${client.remise}%   ${client.fratrie ?? 1} enfants` : "Aucune"}
              />
              <InfoRow label="Jour de paiement" value={client.payment_day ? `Le ${client.payment_day}` : " "} />
              <InfoRow label="Dette totale" value={`${client.debt ?? 0} ${t.common.mad}`} />
            </div>
          </div>

          <div className="flex w-full shrink-0 flex-wrap items-center justify-between gap-3 border-t border-[#001B3D]/10 bg-card px-6 py-4">
            <button type="button" onClick={onPayment} className={primaryPill}>
              <Plus className="h-4 w-4" />
              Enregistrer un paiement
            </button>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onEdit}
                className="inline-flex items-center gap-2 rounded-full border border-[#001B3D]/15 bg-card px-5 py-2 text-sm font-medium text-foreground hover:bg-muted"
              >
                <Pencil className="h-4 w-4" />
                Modifier
              </button>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded-full border border-[#001B3D]/15 bg-card px-5 py-2 text-sm font-medium text-foreground hover:bg-muted"
              >
                {t.common.close}
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PaymentDialog({
  clientId,
  clientLabel,
  clientEmail,
  open,
  onOpenChange,
}: {
  clientId: string;
  clientLabel: string;
  clientEmail?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useDashboardI18n();
  const f = t.form;
  const p = t.familles.paymentModal;
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const schoolYearStart = currentMonth >= 9 ? currentYear : currentYear - 1;
  const [schoolYear, setSchoolYear] = useState(schoolYearStart);

  const SCHOOL_MONTHS = [
    { num: 9, short: "Sep", long: "Septembre" },
    { num: 10, short: "Oct", long: "Octobre" },
    { num: 11, short: "Nov", long: "Novembre" },
    { num: 12, short: "Déc", long: "Décembre" },
    { num: 1, short: "Jan", long: "Janvier" },
    { num: 2, short: "Fév", long: "Février" },
    { num: 3, short: "Mar", long: "Mars" },
    { num: 4, short: "Avr", long: "Avril" },
    { num: 5, short: "Mai", long: "Mai" },
    { num: 6, short: "Juin", long: "Juin" },
  ];

  function monthCalYear(num: number, sy: number) {
    return num >= 9 ? sy : sy + 1;
  }

  function isFutureMonth(num: number, sy: number) {
    const yr = monthCalYear(num, sy);
    if (yr > currentYear) return true;
    if (yr < currentYear) return false;
    return num > currentMonth;
  }

  function selectMonth(num: number) {
    const yr = monthCalYear(num, schoolYear);
    const value = `${String(num).padStart(2, "0")}/${yr}`;
    setSelectedPeriod(value);
  }

  function formatPeriod(value: string) {
    if (!value) return "Mois en cours";
    const [m, y] = value.split("/");
    const month = SCHOOL_MONTHS.find((s) => s.num === Number(m));
    return month ? `${month.long} ${y}` : value;
  }

  function prevSchoolYear() { setSchoolYear((y) => y - 1); }
  function nextSchoolYear() { setSchoolYear((y) => Math.min(y + 1, currentYear)); }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    try {
      const period = String(fd.get("period") || "");
      const payment = await createPayment({
        data: {
          client_id: clientId,
          amount: Number(fd.get("montant") ?? 0),
          date: String(fd.get("date") || new Date().toISOString().split("T")[0]),
          mode: String(fd.get("mode") || "especes") as any,
          period: period || undefined,
        },
      });
      const clientData = clientEmail ? await getClient({ data: clientId }) : null;
      const settings = clientEmail ? await getSettings({}) : null;
      const schoolInfo = settings?.school_info ?? {};
      let pdfUrl = "";
      if (clientData) {
        const children = (clientData as any)?.child_names ?? [];
        const pdfResult = await generateReceiptPdf({
          data: {
            clientId,
            paymentId: payment.id,
            data: {
              school_name: schoolInfo.name ?? "",
              school_address: schoolInfo.address ?? "",
              school_phone: schoolInfo.phone ?? "",
              receipt_number: payment.receipt,
              date: String(payment.date),
              parent_name: clientLabel,
              children_names: children.map((c: any) => c.name).join(", "),
              period: String(payment.period),
              monthly_fee: String((clientData as any)?.monthly_fee ?? 0),
              remise: String((clientData as any)?.remise ?? 0),
              discount_amount: String(Math.round(((clientData as any)?.monthly_fee ?? 0) * ((clientData as any)?.remise ?? 0) / 100)),
              amount_due: String(payment.amount),
              amount_paid: String(payment.amount),
              payment_date: String(payment.date),
              remaining: "0",
              payment_mode: String(payment.mode),
              stamp: "true",
            },
          },
        });
        pdfUrl = pdfResult.url;
      }
      if (clientEmail && pdfUrl) {
        await sendPaymentConfirmation({
          data: {
            to: clientEmail,
            parentName: clientLabel,
            receipt: payment.receipt,
            amount: Number(payment.amount),
            date: String(payment.date),
            mode: String(payment.mode),
            period: String(payment.period),
            pdfUrl,
            clientPhone: String((clientData as any)?.phone ?? ""),
            whatsappOptin: Boolean((clientData as any)?.whatsapp_optin),
          },
        });
      }
      if (payment.id) {
        await updatePaymentInvoice({ data: { id: payment.id, invoice_sent: true } }).catch(() => {});
      }
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success(clientEmail ? "Paiement enregistré et facture envoyée" : "Paiement enregistré");
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(dialogSurface, "max-w-[480px]")}>
        <DialogDescription className="sr-only">{interpolate(p.srDesc, { name: clientLabel })}</DialogDescription>
        <div className="border-t-4 border-t-[#6C4DF6]">
          <div className="border-b border-[#001B3D]/10 px-6 pb-4 pt-6 pr-14">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">{p.eyebrow}</p>
            <DialogTitle className="mt-2 text-left font-display text-xl font-semibold text-foreground">{p.title}</DialogTitle>
          </div>
          <form className="space-y-4 px-6 py-5" onSubmit={handleSubmit}>
            <Field id="pay-montant" label={f.amountMad}>
              <Input id="pay-montant" name="montant" type="number" defaultValue={0} min={0} className={inputClass} />
            </Field>
            <Field id="pay-date" label={f.paymentDate}>
              <Input id="pay-date" name="date" type="date" className={inputClass} />
            </Field>
            <Field id="pay-mode" label={f.paymentMode}>
              <Select name="mode" defaultValue="especes">
                <SelectTrigger id="pay-mode" className={selectTriggerClass}>
                  <SelectValue placeholder={t.common.mode} />
                </SelectTrigger>
                <SelectContent className={softSelectContent}>
                  <SelectItem value="especes">{f.paymentModes.cash}</SelectItem>
                  <SelectItem value="virement">{f.paymentModes.transfer}</SelectItem>
                  <SelectItem value="carte">{f.paymentModes.card}</SelectItem>
                  <SelectItem value="cheque">{f.paymentModes.check}</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field id="pay-period" label="Mois concerné">
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className={cn(selectTriggerClass, "flex w-full items-center justify-between gap-1 px-3")}
                    data-placeholder={selectedPeriod ? undefined : ""}
                  >
                    <span className="truncate">{selectedPeriod ? formatPeriod(selectedPeriod) : "Mois en cours"}</span>
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground/50" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-[280px] p-3">
                  <div className="mb-3 flex items-center justify-between">
                    <button type="button" onClick={prevSchoolYear} className="grid h-7 w-7 place-items-center rounded-md hover:bg-muted">
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="text-sm font-medium">{schoolYear}/{schoolYear + 1}</span>
                    <button type="button" onClick={nextSchoolYear} className="grid h-7 w-7 place-items-center rounded-md hover:bg-muted disabled:opacity-30" disabled={schoolYear >= currentYear}>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {SCHOOL_MONTHS.map((m) => {
                      const yr = monthCalYear(m.num, schoolYear);
                      const val = `${String(m.num).padStart(2, "0")}/${yr}`;
                      const future = isFutureMonth(m.num, schoolYear);
                      return (
                        <button
                          key={m.num}
                          type="button"
                          onClick={() => selectMonth(m.num)}
                          disabled={future}
                          className={cn(
                            "rounded-md px-1 py-2 text-sm transition-colors",
                            selectedPeriod === val ? "bg-[#17B3A6] text-white font-semibold" : "hover:bg-muted",
                            future && "text-muted-foreground/30 cursor-not-allowed",
                          )}
                        >
                          {m.short}
                        </button>
                      );
                    })}
                  </div>
                </PopoverContent>
              </Popover>
              <input type="hidden" name="period" value={selectedPeriod} />
            </Field>
            {error ? <p className="text-xs text-red-600">{error}</p> : null}
            <div className="flex flex-wrap justify-end gap-3 border-t border-[#001B3D]/10 pt-5">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded-full border border-[#001B3D]/15 bg-card px-5 py-2 text-sm font-medium text-foreground hover:bg-muted"
              >
                {t.common.cancel}
              </button>
              <button type="submit" disabled={busy} className={cn(primaryPill, "px-5 py-2 disabled:opacity-60")}>
                {busy ? "..." : p.confirm}
              </button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Liste d'élèves de départ pour l'édition : child_names si présent, sinon
 *  un élève reconstruit depuis les champs hérités (child_name / dob / level),
 *  en récupérant les services/frais enregistrés au niveau de la famille. */
function initialChildren(client: FlatClient): ChildFormData[] {
  if (client.child_names && client.child_names.length > 0) {
    return client.child_names.map((c) => ({
      name: c.name ?? "",
      dob: c.dob ?? "",
      cycle: c.cycle ?? "",
      level: c.level ?? "",
      services: c.services ?? [],
      frais: c.frais ?? [],
    }));
  }
  return [
    {
      name: client.child_name ?? "",
      dob: client.dob ?? "",
      cycle: "",
      level: client.level ?? "",
      services: client.subscribed_services ?? [],
      frais: client.subscribed_frais ?? [],
    },
  ];
}

/** Modale « Ajouter / Modifier un élève »   mêmes questions que l'étape 5/6 de
 *  l'assistant. Le brouillon n'est appliqué qu'à la validation (Annuler jette). */
function StudentModal({
  mode,
  initial,
  onOpenChange,
  onConfirm,
}: {
  mode: "add" | "edit";
  initial: ChildFormData;
  onOpenChange: (open: boolean) => void;
  onConfirm: (child: ChildFormData) => void;
}) {
  // Monté à l'ouverture uniquement (voir la `key` côté appelant) : l'état initial
  // suffit, pas d'effet de synchro qui écraserait la saisie à chaque re-render.
  const [draft, setDraft] = useState<ChildFormData>(initial);

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className={cn(dialogSurface, "w-[min(100vw-1.5rem,560px)] max-w-[560px]")}>
        <DialogDescription className="sr-only">
          {mode === "add" ? "Ajouter un élève à la famille" : `Modifier l'élève ${initial.name}`}
        </DialogDescription>
        <div className="flex min-h-0 flex-1 flex-col border-t-4 border-t-[#6C4DF6]">
          <div className="shrink-0 border-b border-[#001B3D]/10 px-6 pb-4 pt-6 pr-14">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Élève</p>
            <DialogTitle className="mt-2 text-left font-display text-xl font-semibold text-foreground">
              {mode === "add" ? "Ajouter un élève" : "Modifier l'élève"}
            </DialogTitle>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto scroll-touch px-6 py-5">
            <StudentFields
              value={draft}
              onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))}
              idPrefix="sm"
            />
          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-3 border-t border-[#001B3D]/10 px-6 py-4">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-full border border-[#001B3D]/15 bg-card px-5 py-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              Annuler
            </button>
            <button
              type="button"
              disabled={draft.name.trim() === ""}
              onClick={() => {
                onConfirm(draft);
                onOpenChange(false);
              }}
              className={cn(primaryPill, "px-5 py-2 disabled:opacity-50")}
            >
              {mode === "add" ? "Ajouter" : "Enregistrer"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditClientDialog({
  client,
  open,
  onOpenChange,
}: {
  client: FlatClient;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: getSettings });
  const { data: levels } = useQuery({ queryKey: ["levels"], queryFn: listLevels });
  const services: Array<{ name: string; price: number; enabled: boolean }> = settings?.services ?? [];
  const frais: Array<{ name: string; price: number; enabled: boolean }> = settings?.frais ?? [];
  const [remise, setRemise] = useState<number>(client.remise ?? 0);
  const [children, setChildren] = useState<ChildFormData[]>(() => initialChildren(client));
  const [studentModal, setStudentModal] = useState<{ mode: "add" } | { mode: "edit"; index: number } | null>(null);
  const [busy, setBusy] = useState(false);

  // Données héritées : le niveau est connu mais pas le cycle, or le select
  // Niveau reste désactivé sans cycle. On le déduit dès que les niveaux arrivent.
  useEffect(() => {
    if (!levels) return;
    setChildren((prev) =>
      prev.map((c) =>
        c.level && !c.cycle
          ? { ...c, cycle: levels.find((l) => l.name === c.level)?.cycle ?? c.cycle }
          : c,
      ),
    );
  }, [levels]);

  const { t } = useDashboardI18n();
  const f = t.form;
  const e = t.familles.editModal;

  const removeStudent = (i: number) =>
    setChildren((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev));

  // Frais mensuels recalculés depuis les élèves (niveau + services + frais),
  // comme le fait l'assistant : sinon la colonne « Mensuel » resterait figée.
  const totalMonthly = useMemo(() => {
    return children.reduce((sum, c) => {
      const lv = (levels ?? []).find((l) => l.name === c.level);
      const svc = (c.services ?? []).reduce(
        (s, n) => s + (services.find((x) => x.name === n)?.price ?? 0),
        0,
      );
      const frs = (c.frais ?? []).reduce(
        (s, n) => s + (frais.find((x) => x.name === n)?.price ?? 0),
        0,
      );
      return sum + (lv?.monthly_fee ?? 0) + svc + frs;
    }, 0);
  }, [children, levels, services, frais]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(dialogSurface, "w-[min(100vw-1.5rem,640px)] max-w-[640px]")}>
        <DialogDescription className="sr-only">{interpolate(e.srDesc, { name: client.child_name })}</DialogDescription>
        <div className="flex min-h-0 flex-1 flex-col border-t-4 border-t-[#6C4DF6]">
          <div className="shrink-0 border-b border-[#001B3D]/10 px-6 pb-4 pt-6 pr-14">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">{e.eyebrow}</p>
            <DialogTitle className="mt-2 text-left font-display text-xl font-semibold text-foreground">{e.title}</DialogTitle>
          </div>
          <form
            className="min-h-0 flex-1 space-y-4 overflow-y-auto scroll-touch px-6 py-5"
            onSubmit={async (ev) => {
              ev.preventDefault();
              setBusy(true);
              const fd = new FormData(ev.currentTarget);
              // On ne garde que les élèves nommés ; le 1er alimente les champs hérités.
              const cleanChildren = children.filter((c) => c.name.trim() !== "");
              const firstChild = cleanChildren[0];
              // Les services/frais vivent désormais sur l'élève : on réagrège au
              // niveau famille pour garder les filtres et les graphiques justes.
              const aggregatedServices = [...new Set(cleanChildren.flatMap((c) => c.services ?? []))];
              const aggregatedFrais = [...new Set(cleanChildren.flatMap((c) => c.frais ?? []))];
              try {
                await updateClient({
                  data: {
                    id: client.id,
                    parent_name: String(fd.get("parent_name") ?? client.parent_name),
                    child_name: firstChild?.name ?? client.child_name,
                    child_names: cleanChildren,
                    email: String(fd.get("email") ?? client.email),
                    email2: String(fd.get("email2") ?? client.email2),
                    phone: String(fd.get("phone") ?? client.phone),
                    phone2: String(fd.get("phone2") ?? client.phone2),
                    father_name: String(fd.get("father_name") ?? client.father_name),
                    mother_name: String(fd.get("mother_name") ?? client.mother_name),
                    cin: String(fd.get("cin") ?? client.cin),
                    dob: firstChild?.dob ?? client.dob,
                    level: firstChild?.level ?? client.level,
                    notes: String(fd.get("notes") ?? client.notes),
                    monthly_fee: totalMonthly,
                    fratrie: cleanChildren.length || 1,
                    remise,
                    subscribed_services: aggregatedServices,
                    subscribed_frais: aggregatedFrais,
                    payment_day: Number(fd.get("payment_day") ?? client.payment_day ?? 1),
                  },
                });
                queryClient.invalidateQueries({ queryKey: ["clients"] });
                toast.success("Client modifié");
                onOpenChange(false);
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Erreur");
              } finally {
                setBusy(false);
              }
            }}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field id="e-parent" label={t.common.parent}>
                <Input id="e-parent" name="parent_name" defaultValue={client.parent_name} className={inputClass} />
              </Field>
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between gap-2">
                  <Label className={labelClass}>Élèves de la famille</Label>
                  <button
                    type="button"
                    onClick={() => setStudentModal({ mode: "add" })}
                    className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-[#001B3D] transition hover:bg-[#6C4DF6]/15"
                  >
                    <Plus className="h-3.5 w-3.5" /> Ajouter un élève
                  </button>
                </div>
                {children.length === 0 ? (
                  <p className="mt-2 rounded-xl border border-dashed border-[#001B3D]/15 px-3 py-4 text-center text-xs text-muted-foreground">
                    Aucun élève. Utilisez « Ajouter un élève ».
                  </p>
                ) : (
                  <ul className="mt-2 divide-y divide-[#001B3D]/8 overflow-hidden rounded-xl border border-[#001B3D]/10 bg-muted/30">
                    {children.map((ch, i) => (
                      <li key={i} className="flex items-center gap-2 px-3 py-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">
                            {ch.name.trim() || `Élève ${i + 1}`}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {ch.level || "Niveau non défini"}
                            {(ch.services ?? []).length > 0 ? ` · ${ch.services.length} service(s)` : ""}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setStudentModal({ mode: "edit", index: i })}
                          className={iconButton}
                          title="Modifier l'élève"
                          aria-label={`Modifier ${ch.name || `l'élève ${i + 1}`}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        {children.length > 1 ? (
                          <button
                            type="button"
                            onClick={() => removeStudent(i)}
                            className={cn(iconButton, "text-[#FF666B] hover:bg-[#FF666B]/10 hover:text-[#FF666B]")}
                            title="Retirer l'élève"
                            aria-label={`Retirer ${ch.name || `l'élève ${i + 1}`}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <Field id="e-father" label={f.fatherName}>
                <Input id="e-father" name="father_name" defaultValue={client.father_name} className={inputClass} />
              </Field>
              <Field id="e-mother" label={f.motherName}>
                <Input id="e-mother" name="mother_name" defaultValue={client.mother_name} className={inputClass} />
              </Field>
              <Field id="e-cin" label={f.cinPassport}>
                <Input id="e-cin" name="cin" defaultValue={client.cin} className={inputClass} />
              </Field>
              <Field id="e-email" label="Email du père">
                <Input id="e-email" name="email" type="email" defaultValue={client.email} className={inputClass} />
              </Field>
              <Field id="e-email2" label="Email de la mère">
                <Input id="e-email2" name="email2" type="email" defaultValue={client.email2} className={inputClass} />
              </Field>
              <Field id="e-phone" label="Téléphone du père">
                <Input id="e-phone" name="phone" type="tel" defaultValue={client.phone} className={inputClass} />
              </Field>
              <Field id="e-phone2" label="Téléphone de la mère">
                <Input id="e-phone2" name="phone2" type="tel" defaultValue={client.phone2} className={inputClass} />
              </Field>
              <div className="sm:col-span-2">
                <Field id="e-notes" label="Notes">
                  <Input id="e-notes" name="notes" defaultValue={client.notes} className={inputClass} />
                </Field>
              </div>
              <Field id="e-remise" label="Remise fratrie (%)">
                <Input
                  id="e-remise"
                  type="number"
                  min={0}
                  max={100}
                  value={remise}
                  onChange={(ev) => setRemise(Number(ev.target.value || 0))}
                  className={inputClass}
                />
              </Field>
              <Field id="e-jour" label={f.paymentDay}>
                <Input id="e-jour" name="payment_day" type="number" min={1} max={31} defaultValue={client.payment_day ?? 1} className={inputClass} />
              </Field>
              <div className="sm:col-span-2">
                <p className="rounded-xl bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                  Frais mensuels recalculés :{" "}
                  <span className="font-semibold tabular-nums text-foreground">{totalMonthly} {t.common.mad}</span>{" "}
                    niveaux, services et frais des élèves.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-3 border-t border-[#001B3D]/10 pt-5">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded-full border border-[#001B3D]/15 bg-card px-5 py-2 text-sm font-medium text-foreground hover:bg-muted"
              >
                {t.common.cancel}
              </button>
              <button type="submit" disabled={busy} className={cn(primaryPill, "px-5 py-2 disabled:opacity-60")}>
                {busy ? "..." : t.common.saveChanges}
              </button>
            </div>
          </form>
        </div>
      </DialogContent>

      {/* Modale élève   portalisée hors du <form>, donc aucun risque de submit.
          Montée seulement à l'ouverture, avec une key : chaque ouverture repart
          d'un brouillon neuf (élève sélectionné ou vide). */}
      {studentModal ? (
        <StudentModal
          key={studentModal.mode === "edit" ? `edit-${studentModal.index}` : "add"}
          mode={studentModal.mode}
          initial={
            studentModal.mode === "edit" ? children[studentModal.index] ?? emptyChild() : emptyChild()
          }
          onOpenChange={(o) => !o && setStudentModal(null)}
          onConfirm={(child) => {
            if (studentModal.mode === "edit") {
              const idx = studentModal.index;
              setChildren((prev) => prev.map((c, i) => (i === idx ? child : c)));
            } else {
              setChildren((prev) => [...prev, child]);
            }
          }}
        />
      ) : null}
    </Dialog>
  );
}


