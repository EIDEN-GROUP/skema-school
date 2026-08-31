import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Sticker } from "@/components/skema/bits";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listLevels,
  createLevel,
  updateLevel,
  deleteLevel,
  getSettings,
  updateSetting,
} from "@/lib/server-settings";
import { uploadSchoolFile, deleteSchoolFile } from "@/lib/server-storage";
import { analyzePdfTemplate } from "@/lib/server-ai";
import { cn } from "@/lib/utils";
import {
  softCard,
  softInput,
  labelClass,
  eyebrowClass,
  primaryPill,
  ghostPill,
  iconButton,
} from "@/lib/dash-ui";
import { toast } from "sonner";
import { Plus, Trash2, Save, Percent, Calendar, Package, GraduationCap, X, BadgeDollarSign, ChevronDown, Upload, FileText, Image as ImageIcon, GripVertical, Maximize2, Sparkles, CheckCircle2, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/dashboard/settings")({
  head: () => ({ meta: [{ title: "Paramètres · SKEMA" }] }),
  component: SettingsPage,
});

type Service = { name: string; price: number; enabled: boolean };

/** Row shell: wraps on narrow screens, single line from `sm` up. */
const rowClass =
  "flex flex-wrap items-center gap-x-3 gap-y-3 px-4 py-3.5 sm:flex-nowrap sm:gap-x-4 sm:px-6";

/** Every field in this page is a bare <input>, so it needs the full input token. */
const fieldClass = cn(softInput, "h-10 px-3 text-sm outline-none");

const checkboxClass =
  "h-4 w-4 shrink-0 accent-[#17B3A6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6C4DF6]/60";

function Section({
  icon: Icon,
  title,
  description,
  children,
  footer,
}: {
  icon: any;
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <section className={cn(softCard, "overflow-hidden")}>
      <div className="border-b border-[#001B3D]/10 px-4 py-4 sm:px-6">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
          <h2 className="font-display text-lg font-semibold text-foreground">{title}</h2>
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
      {footer}
    </section>
  );
}

const SETTINGS_TABS = [
  {
    id: "scolarite",
    label: "Scolarité & tarifs",
    icon: GraduationCap,
    hint: "Niveaux, services, frais et remise fratrie — la base du calcul des frais.",
  },
  {
    id: "paiements",
    label: "Paiements",
    icon: BadgeDollarSign,
    hint: "Les 3 délais qui décident des statuts : échéance, grâce, escalade.",
  },
  {
    id: "etablissement",
    label: "Établissement",
    icon: Package,
    hint: "Les coordonnées de l'école.",
  },
  { id: "recu", label: "Reçu", icon: FileText, hint: "Le modèle de reçu envoyé aux familles et les documents officiels." },
] as const;

function SettingsPage() {
  const [tab, setTab] = useState<(typeof SETTINGS_TABS)[number]["id"]>("scolarite");
  const active = SETTINGS_TABS.find((t) => t.id === tab)!;

  return (
    <div className="mx-auto w-full max-w-4xl pb-8">
      <header className="relative">
        <Sticker name="gear" tilt={-6} className="pointer-events-none absolute -top-2 right-0 hidden w-16 opacity-90 sm:block" />
        <p className={eyebrowClass}>Configuration</p>
        <h1 className="font-hand mt-1.5 text-3xl tracking-tight text-foreground sm:text-4xl md:text-5xl">
          Paramètres
        </h1>
      </header>

      {/* Barre d'onglets — collante en haut du contenu */}
      <div className="sticky top-0 z-20 mt-5 border-b border-[#001B3D]/10 bg-papier/90 backdrop-blur-md">
        <div className="flex gap-1 overflow-x-auto scroll-touch">
          {SETTINGS_TABS.map((t) => {
            const on = t.id === tab;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                aria-current={on}
                className={cn(
                  "relative flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3 py-3 text-sm font-medium transition-colors",
                  on ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <t.icon className="h-4 w-4 shrink-0" />
                {t.label}
                {on ? (
                  <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-[#6C4DF6]" />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <p className="mt-4 text-sm text-muted-foreground">{active.hint}</p>

      <div className="mt-4 space-y-4 sm:mt-5 sm:space-y-6">
        {tab === "scolarite" && (
          <>
            <LevelsSection />
            <ServicesSection />
            <FraisSection />
            <SiblingDiscountSection />
          </>
        )}
        {tab === "paiements" && <PaymentDueSection />}
        {tab === "etablissement" && <SchoolInfoSection />}
        {tab === "recu" && (
          <>
            <PdfTemplateEditorSection />
            <DocumentsSection />
          </>
        )}
      </div>
    </div>
  );
}

function ComboboxInput({
  value,
  onChange,
  options,
  placeholder,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const filtered = options.filter((o) => o !== value && o.toLowerCase().includes(value.toLowerCase()));
  const show = open && filtered.length > 0;

  // Panel is portaled to <body> (fixed-positioned off the input's own rect) so it
  // isn't clipped by the settings card's `overflow-hidden`, same as every other
  // dropdown on this page (which portal via the shared shadcn Select).
  useLayoutEffect(() => {
    if (!show || !wrapRef.current) return;
    const r = wrapRef.current.getBoundingClientRect();
    setRect({ top: r.bottom + 4, left: r.left, width: r.width });
  }, [show]);

  return (
    <div ref={wrapRef} className="relative">
      <input
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => { setOpen(true); setFocused(true); }}
        onBlur={() => setTimeout(() => { setOpen(false); setFocused(false); }, 150)}
        placeholder={placeholder}
        aria-label={label}
        className={cn(fieldClass, "w-full pr-8")}
      />
      <ChevronDown
        className={cn(
          "pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60 transition-transform",
          focused && "rotate-180",
        )}
        aria-hidden
      />
      {show && rect
        ? createPortal(
            <div
              style={{ position: "fixed", top: rect.top, left: rect.left, width: rect.width }}
              className="z-50 max-h-40 overflow-y-auto rounded-lg border border-[#001B3D]/15 bg-popover shadow-lg"
            >
              {filtered.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onMouseDown={() => { onChange(opt); setOpen(false); }}
                  className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-[#6C4DF6]/20"
                >
                  {opt}
                </button>
              ))}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

function LevelsSection() {
  const queryClient = useQueryClient();
  const { data: levels } = useQuery({ queryKey: ["levels"], queryFn: listLevels });
  const [newName, setNewName] = useState("");
  const [newFee, setNewFee] = useState("");
  const [newCycle, setNewCycle] = useState("");
  const [newMax, setNewMax] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editFee, setEditFee] = useState("");
  const [editCycle, setEditCycle] = useState("");
  const [editMax, setEditMax] = useState("");

  const allCycles = useMemo(
    () => [...new Set((levels ?? []).map((l) => l.cycle).filter(Boolean))].sort(),
    [levels],
  );

  const create = useMutation({
    mutationFn: (input: { name: string; monthly_fee: number; cycle?: string; max_students?: number }) => createLevel({ data: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["levels"] });
      toast.success("Niveau créé");
      setNewName("");
      setNewFee("");
      setNewCycle("");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Erreur"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteLevel({ data: id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["levels"] });
      toast.success("Niveau supprimé");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Erreur"),
  });

  const update = useMutation({
    mutationFn: (input: { id: string; name?: string; monthly_fee?: number; cycle?: string; max_students?: number }) =>
      updateLevel({ data: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["levels"] });
      toast.success("Niveau mis à jour");
      setEditId(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Erreur"),
  });

  const canAdd = newName.trim() !== "" && newFee !== "";

  return (
    <Section
      icon={GraduationCap}
      title="Niveaux scolaires"
      description="Définissez les niveaux, leur cycle/catégorie et leurs frais mensuels"
      footer={
        <div className={cn(rowClass, "flex-col gap-3 border-t border-[#001B3D]/10 py-4 sm:flex-col")}>
          <div className="flex w-full flex-wrap items-end gap-3">
            <div className="flex-1 basis-full sm:basis-[180px]">
              <p className={cn(labelClass, "mb-1")}>Niveau</p>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="ex. CM2"
                aria-label="Nom du niveau"
                className={cn(fieldClass, "w-full")}
              />
            </div>
            <div className="flex-1 basis-full sm:basis-[180px]">
              <p className={cn(labelClass, "mb-1")}>Cycle / Catégorie</p>
              <ComboboxInput
                value={newCycle}
                onChange={setNewCycle}
                options={allCycles}
                placeholder="ex. Primaire"
                label="Cycle"
              />
            </div>
            <div className="flex-1 basis-full sm:basis-[140px]">
              <p className={cn(labelClass, "mb-1")}>Frais mensuels</p>
              <div className="flex items-center gap-2">
                <input
                  value={newFee}
                  onChange={(e) => setNewFee(e.target.value)}
                  type="number"
                  min="0"
                  inputMode="numeric"
                  placeholder="Frais"
                  aria-label="Frais mensuels"
                  className={cn(fieldClass, "w-full")}
                />
                <span className="shrink-0 text-xs text-muted-foreground">MAD</span>
              </div>
            </div>
            <div className="flex-1 basis-full sm:basis-[100px]">
              <p className={cn(labelClass, "mb-1")}>Max élèves</p>
              <input
                value={newMax}
                onChange={(e) => setNewMax(e.target.value)}
                type="number"
                min="0"
                inputMode="numeric"
                placeholder="0"
                aria-label="Limite d'élèves"
                className={cn(fieldClass, "w-full")}
              />
            </div>
            <button
              onClick={() => {
                if (canAdd) create.mutate({ name: newName.trim(), monthly_fee: Number(newFee), cycle: newCycle.trim(), max_students: Number(newMax) || 0 });
              }}
              disabled={!canAdd || create.isPending}
              className={cn(
                primaryPill,
                "w-full shrink-0 justify-center disabled:opacity-50 sm:ml-auto sm:w-auto",
              )}
            >
              <Plus className="h-4 w-4" /> Ajouter
            </button>
          </div>
        </div>
      }
    >
      <div className="max-h-[26rem] divide-y divide-[#001B3D]/8 overflow-y-auto scroll-touch">
        {levels?.map((l) =>
          editId === l.id ? (
            <div key={l.id} className={rowClass}>
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                aria-label="Nom du niveau"
                className={cn(fieldClass, "flex-1 basis-full sm:basis-auto")}
              />
              <div className="flex-1 basis-full sm:basis-[180px]">
                <ComboboxInput
                  value={editCycle}
                  onChange={setEditCycle}
                  options={allCycles}
                  placeholder="Cycle"
                  label="Cycle"
                />
              </div>
              <div className="flex flex-1 items-center gap-2 sm:flex-none">
                <input
                  value={editFee}
                  onChange={(e) => setEditFee(e.target.value)}
                  type="number"
                  min="0"
                  inputMode="numeric"
                  aria-label="Frais mensuels"
                  className={cn(fieldClass, "sm:w-28")}
                />
                <span className="shrink-0 text-xs text-muted-foreground">MAD</span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
              <input
                value={editMax}
                onChange={(e) => setEditMax(e.target.value)}
                type="number"
                min="0"
                inputMode="numeric"
                aria-label="Limite d'élèves"
                className={cn(fieldClass, "w-20")}
              />
              <span className="text-xs text-muted-foreground">élèves</span>
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-2">
              <button
                onClick={() =>
                  update.mutate({ id: l.id, name: editName.trim(), monthly_fee: Number(editFee), cycle: editCycle.trim(), max_students: Number(editMax) || 0 })
                }
                  disabled={update.isPending}
                  className={cn(primaryPill, "px-4 py-2 disabled:opacity-50")}
                >
                  <Save className="h-4 w-4" /> Enregistrer
                </button>
                <button onClick={() => setEditId(null)} className={iconButton} aria-label="Annuler">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <div key={l.id} className={rowClass}>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                {l.name}
              </span>
              <span className="shrink-0 text-sm text-muted-foreground">
                {l.cycle || " "}
              </span>
              <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                {l.monthly_fee} MAD
              </span>
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground/70">
                {l.max_students > 0 ? `${l.max_students} max` : " "}
              </span>
              <div className="ml-auto flex shrink-0 items-center gap-2">
                <button
                  onClick={() => {
                    setEditId(l.id);
                    setEditName(l.name);
                    setEditFee(String(l.monthly_fee));
                    setEditCycle(l.cycle);
                    setEditMax(String(l.max_students));
                  }}
                  className={cn(ghostPill, "px-4 py-2 text-xs")}
                >
                  Modifier
                </button>
                <button
                  onClick={() => {
                    toast.warning(
                      `Supprimer le niveau « ${l.name} » ?`,
                      {
                        duration: 8000,
                        action: {
                          label: "Supprimer",
                          onClick: () => remove.mutate(l.id),
                        },
                        cancel: {
                          label: "Annuler",
                          onClick: () => {},
                        },
                      },
                    );
                  }}
                  className={cn(iconButton, "text-red-500 hover:bg-red-50 hover:text-red-600")}
                  aria-label={`Supprimer ${l.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ),
        )}
        {levels?.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground sm:px-6">
            Aucun niveau défini
          </p>
        ) : null}
      </div>
    </Section>
  );
}

function ServicesSection() {
  const queryClient = useQueryClient();
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: getSettings });
  const saved: Service[] = settings?.services ?? [];

  // Edits are held locally and pushed on save. Writing on every keystroke would fire
  // one request (and one toast) per character, and the refetch could clobber the field.
  const [draft, setDraft] = useState<Service[] | null>(null);
  const services = draft ?? saved;
  const dirty = draft !== null;

  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");

  const save = useMutation({
    mutationFn: (value: Service[]) => updateSetting({ data: { key: "services", value } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      setDraft(null);
      toast.success("Services mis à jour");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Erreur"),
  });

  const edit = (fn: (list: Service[]) => Service[]) => setDraft(fn(services));

  const addService = () => {
    if (!newName.trim() || !newPrice) return;
    edit((list) => [...list, { name: newName.trim(), price: Number(newPrice), enabled: true }]);
    setNewName("");
    setNewPrice("");
  };

  if (!settings) return null;

  const canAdd = newName.trim() !== "" && newPrice !== "";

  return (
    <Section
      icon={Package}
      title="Services"
      description="Gérez les services proposés et leurs tarifs mensuels"
      footer={
        <>
          <div className={cn(rowClass, "border-t border-[#001B3D]/10 py-4")}>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nom du service"
              aria-label="Nom du service"
              className={cn(fieldClass, "flex-1 basis-full sm:basis-auto")}
            />
            <div className="flex flex-1 items-center gap-2 sm:flex-none">
              <input
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                type="number"
                min="0"
                inputMode="numeric"
                placeholder="Prix"
                aria-label="Prix du service"
                className={cn(fieldClass, "sm:w-28")}
              />
              <span className="shrink-0 text-xs text-muted-foreground">MAD</span>
            </div>
            <button
              onClick={addService}
              disabled={!canAdd}
              className={cn(
                ghostPill,
                "w-full shrink-0 justify-center disabled:opacity-50 sm:ml-auto sm:w-auto",
              )}
            >
              <Plus className="h-4 w-4" /> Ajouter
            </button>
          </div>
          {dirty ? (
            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-[#001B3D]/10 bg-muted/40 px-4 py-3 sm:px-6">
              <p className="mr-auto text-xs text-muted-foreground">
                Modifications non enregistrées
              </p>
              <button onClick={() => setDraft(null)} className={cn(ghostPill, "px-4 py-2 text-xs")}>
                Annuler
              </button>
              <button
                onClick={() => save.mutate(services)}
                disabled={save.isPending}
                className={cn(primaryPill, "px-4 py-2 text-xs disabled:opacity-50")}
              >
                <Save className="h-4 w-4" /> {save.isPending ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          ) : null}
        </>
      }
    >
      <div className="divide-y divide-[#001B3D]/8">
        {services.map((svc, i) => (
          <div key={i} className={rowClass}>
            <input
              type="checkbox"
              checked={svc.enabled}
              onChange={() =>
                edit((list) =>
                  list.map((s, idx) => (idx === i ? { ...s, enabled: !s.enabled } : s)),
                )
              }
              className={checkboxClass}
              aria-label={`Activer ${svc.name}`}
            />
            <input
              value={svc.name}
              onChange={(e) =>
                edit((list) =>
                  list.map((s, idx) => (idx === i ? { ...s, name: e.target.value } : s)),
                )
              }
              aria-label="Nom du service"
              className={cn(fieldClass, "min-w-0 flex-1 basis-[10rem]")}
            />
            <div className="flex items-center gap-2">
              <input
                value={svc.price}
                onChange={(e) =>
                  edit((list) =>
                    list.map((s, idx) => (idx === i ? { ...s, price: Number(e.target.value) } : s)),
                  )
                }
                type="number"
                min="0"
                inputMode="numeric"
                aria-label="Prix du service"
                className={cn(fieldClass, "w-24")}
              />
              <span className="shrink-0 text-xs text-muted-foreground">MAD</span>
            </div>
            <button
              onClick={() => edit((list) => list.filter((_, idx) => idx !== i))}
              className={cn(
                iconButton,
                "ml-auto text-red-500 hover:bg-red-50 hover:text-red-600 sm:ml-0",
              )}
              aria-label={`Supprimer ${svc.name}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        {services.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground sm:px-6">
            Aucun service défini
          </p>
        ) : null}
      </div>
    </Section>
  );
}

function FraisSection() {
  const queryClient = useQueryClient();
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: getSettings });
  const saved: Service[] = settings?.frais ?? [];
  const [draft, setDraft] = useState<Service[] | null>(null);
  const frais = draft ?? saved;
  const dirty = draft !== null;
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");

  const save = useMutation({
    mutationFn: (value: Service[]) => updateSetting({ data: { key: "frais", value } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      setDraft(null);
      toast.success("Frais mis à jour");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Erreur"),
  });

  const edit = (fn: (list: Service[]) => Service[]) => setDraft(fn(frais));

  const addFrais = () => {
    if (!newName.trim() || !newPrice) return;
    edit((list) => [...list, { name: newName.trim(), price: Number(newPrice), enabled: true }]);
    setNewName("");
    setNewPrice("");
  };

  if (!settings) return null;

  const canAdd = newName.trim() !== "" && newPrice !== "";

  return (
    <Section
      icon={BadgeDollarSign}
      title="Les Frais"
      description="Frais supplémentaires sélectionnables par élève dans le wizard d'inscription"
      footer={
        <>
          <div className={cn(rowClass, "border-t border-[#001B3D]/10 py-4")}>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nom du frais"
              aria-label="Nom du frais"
              className={cn(fieldClass, "flex-1 basis-full sm:basis-auto")}
            />
            <div className="flex flex-1 items-center gap-2 sm:flex-none">
              <input
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                type="number"
                min="0"
                inputMode="numeric"
                placeholder="Prix"
                aria-label="Prix du frais"
                className={cn(fieldClass, "sm:w-28")}
              />
              <span className="shrink-0 text-xs text-muted-foreground">MAD</span>
            </div>
            <button
              onClick={addFrais}
              disabled={!canAdd}
              className={cn(
                ghostPill,
                "w-full shrink-0 justify-center disabled:opacity-50 sm:ml-auto sm:w-auto",
              )}
            >
              <Plus className="h-4 w-4" /> Ajouter
            </button>
          </div>
          {dirty ? (
            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-[#001B3D]/10 bg-muted/40 px-4 py-3 sm:px-6">
              <p className="mr-auto text-xs text-muted-foreground">
                Modifications non enregistrées
              </p>
              <button onClick={() => setDraft(null)} className={cn(ghostPill, "px-4 py-2 text-xs")}>
                Annuler
              </button>
              <button
                onClick={() => save.mutate(frais)}
                disabled={save.isPending}
                className={cn(primaryPill, "px-4 py-2 text-xs disabled:opacity-50")}
              >
                <Save className="h-4 w-4" /> {save.isPending ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          ) : null}
        </>
      }
    >
      <div className="divide-y divide-[#001B3D]/8">
        {frais.map((svc, i) => (
          <div key={i} className={rowClass}>
            <input
              type="checkbox"
              checked={svc.enabled}
              onChange={() =>
                edit((list) =>
                  list.map((s, idx) => (idx === i ? { ...s, enabled: !s.enabled } : s)),
                )
              }
              className={checkboxClass}
              aria-label={`Activer ${svc.name}`}
            />
            <input
              value={svc.name}
              onChange={(e) =>
                edit((list) =>
                  list.map((s, idx) => (idx === i ? { ...s, name: e.target.value } : s)),
                )
              }
              aria-label="Nom du frais"
              className={cn(fieldClass, "min-w-0 flex-1 basis-[10rem]")}
            />
            <div className="flex items-center gap-2">
              <input
                value={svc.price}
                onChange={(e) =>
                  edit((list) =>
                    list.map((s, idx) => (idx === i ? { ...s, price: Number(e.target.value) } : s)),
                  )
                }
                type="number"
                min="0"
                inputMode="numeric"
                aria-label="Prix du frais"
                className={cn(fieldClass, "w-24")}
              />
              <span className="shrink-0 text-xs text-muted-foreground">MAD</span>
            </div>
            <button
              onClick={() => edit((list) => list.filter((_, idx) => idx !== i))}
              className={cn(
                iconButton,
                "ml-auto text-red-500 hover:bg-red-50 hover:text-red-600 sm:ml-0",
              )}
              aria-label={`Supprimer ${svc.name}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        {frais.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground sm:px-6">
            Aucun frais défini
          </p>
        ) : null}
      </div>
    </Section>
  );
}

function SiblingDiscountSection() {
  const queryClient = useQueryClient();
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: getSettings });
  const [value, setValue] = useState("10");
  const [maxKids, setMaxKids] = useState("99");

  useEffect(() => {
    if (settings?.sibling_discount) {
      setValue(String(settings.sibling_discount.value ?? 10));
      setMaxKids(String(settings.sibling_discount.max_kids ?? 99));
    }
  }, [
    settings?.sibling_discount?.value,
    settings?.sibling_discount?.max_kids,
  ]);

  const save = useMutation({
    mutationFn: (val: any) => updateSetting({ data: { key: "sibling_discount", value: val } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast.success("Réduction mise à jour");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Erreur"),
  });

  if (!settings) return null;

  return (
    <Section
      icon={Percent}
      title="Réduction fratrie"
      description="Réduction pour les parents avec plusieurs enfants"
    >
      <div className="space-y-5 px-4 py-5 sm:px-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="sibling-value" className={labelClass}>
              Réduction par enfant supplémentaire
            </label>
            <div className="flex items-center gap-2">
              <input
                id="sibling-value"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                type="number"
                min="0"
                max="100"
                inputMode="numeric"
                className={cn(fieldClass, "w-24")}
              />
              <span className="shrink-0 text-sm text-muted-foreground">%</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="sibling-max" className={labelClass}>
              Nombre maximum d'enfants
            </label>
            <div className="flex items-center gap-2">
              <input
                id="sibling-max"
                value={maxKids}
                onChange={(e) => setMaxKids(e.target.value)}
                type="number"
                min="1"
                inputMode="numeric"
                className={cn(fieldClass, "w-24")}
              />
              <span className="shrink-0 text-sm text-muted-foreground">enfants</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end border-t border-[#001B3D]/10 pt-4">
          <button
            onClick={() =>
              save.mutate({
                enabled: true,
                type: "percentage",
                value: Number(value),
                max_kids: Number(maxKids),
              })
            }
            disabled={save.isPending}
            className={cn(primaryPill, "w-full justify-center disabled:opacity-50 sm:w-auto")}
          >
            <Save className="h-4 w-4" /> {save.isPending ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      </div>
    </Section>
  );
}

function PaymentDueSection() {
  const queryClient = useQueryClient();
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: getSettings });
  const [day, setDay] = useState("5");
  const [graceDays, setGraceDays] = useState("5");
  const [escalationDays, setEscalationDays] = useState("15");

  useEffect(() => {
    if (settings?.payment_due) {
      setDay(String(settings.payment_due.day ?? 5));
      setGraceDays(String(settings.payment_due.grace_days ?? 5));
      setEscalationDays(String(settings.payment_due.escalation_days ?? 15));
    }
  }, [settings?.payment_due?.day, settings?.payment_due?.grace_days, settings?.payment_due?.escalation_days]);

  const save = useMutation({
    mutationFn: (val: any) => updateSetting({ data: { key: "payment_due", value: val } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast.success("Échéance mise à jour");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Erreur"),
  });

  if (!settings) return null;

  return (
    <Section
      icon={Calendar}
      title="Échéance des paiements"
      description="Jour d'échéance, délai de grâce et délai avant passage en impayé"
      footer={
        <div className="border-t border-[#001B3D]/10 bg-muted/40 px-4 py-3 sm:px-6">
          <p className="text-xs leading-relaxed text-muted-foreground">
            Un client non payé est d'abord marqué <strong className="text-foreground">retard</strong> à
            partir du jour d'échéance + délai de grâce. Si aucun paiement n'arrive dans les
            <strong className="text-foreground"> {escalationDays} jours </strong>
            suivants, il passe en <strong className="text-foreground">impayé</strong>.
          </p>
        </div>
      }
    >
      <div className="space-y-5 px-4 py-5 sm:px-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <label htmlFor="due-day" className={labelClass}>
              Paiement dû le jour
            </label>
            <div className="flex items-center gap-2">
              <input
                id="due-day"
                value={day}
                onChange={(e) => setDay(e.target.value)}
                type="number"
                min="1"
                max="28"
                inputMode="numeric"
                className={cn(fieldClass, "w-24")}
              />
              <span className="shrink-0 text-sm text-muted-foreground">du mois</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="due-grace" className={labelClass}>
              Délai de grâce
            </label>
            <div className="flex items-center gap-2">
              <input
                id="due-grace"
                value={graceDays}
                onChange={(e) => setGraceDays(e.target.value)}
                type="number"
                min="0"
                inputMode="numeric"
                className={cn(fieldClass, "w-24")}
              />
              <span className="shrink-0 text-sm text-muted-foreground">jours</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="due-escalation" className={labelClass}>
              Passage impayé après
            </label>
            <div className="flex items-center gap-2">
              <input
                id="due-escalation"
                value={escalationDays}
                onChange={(e) => setEscalationDays(e.target.value)}
                type="number"
                min="0"
                inputMode="numeric"
                className={cn(fieldClass, "w-24")}
              />
              <span className="shrink-0 text-sm text-muted-foreground">jours de retard</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end border-t border-[#001B3D]/10 pt-4">
          <button
            onClick={() => save.mutate({ day: Number(day), grace_days: Number(graceDays), escalation_days: Number(escalationDays) })}
            disabled={save.isPending}
            className={cn(primaryPill, "w-full justify-center disabled:opacity-50 sm:w-auto")}
          >
            <Save className="h-4 w-4" /> {save.isPending ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      </div>
    </Section>
  );
}

function SchoolInfoSection() {
  const queryClient = useQueryClient();
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: getSettings });
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (settings?.school_info) {
      setName(settings.school_info.name ?? "");
      setAddress(settings.school_info.address ?? "");
      setPhone(settings.school_info.phone ?? "");
    } else {
      setName(settings?.school_name ?? "");
      setAddress(settings?.school_address ?? "");
      setPhone(settings?.school_phone ?? "");
    }
  }, [settings?.school_info, settings?.school_name, settings?.school_address, settings?.school_phone]);

  const save = useMutation({
    mutationFn: (val: any) => updateSetting({ data: { key: "school_info", value: val } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast.success("Informations de l'école mises à jour");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Erreur"),
  });

  if (!settings) return null;

  return (
    <Section
      icon={GraduationCap}
      title="Informations de l'école"
      description="Ces informations apparaîtront sur les reçus PDF et dans les notifications WhatsApp"
    >
      <div className="space-y-5 px-4 py-5 sm:px-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="school-name" className={labelClass}>Nom de l'école</label>
            <input
              id="school-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={cn(fieldClass, "w-full")}
              placeholder="Ex: Groupe Scolaire..."
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="school-phone" className={labelClass}>Téléphone</label>
            <input
              id="school-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={cn(fieldClass, "w-full")}
              placeholder="Ex: 05 28 XX XX XX"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="school-address" className={labelClass}>Adresse</label>
          <input
            id="school-address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className={cn(fieldClass, "w-full")}
            placeholder="Ex: Agadir Bay, Technopole 1 Bloc B, Agadir"
          />
        </div>
        <div className="flex justify-end border-t border-[#001B3D]/10 pt-4">
          <button
            onClick={() => save.mutate({ name, address, phone })}
            disabled={save.isPending}
            className={cn(primaryPill, "w-full justify-center disabled:opacity-50 sm:w-auto")}
          >
            <Save className="h-4 w-4" /> {save.isPending ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      </div>
    </Section>
  );
}

type DocMeta = { url: string; filename: string; updated_at: string };
type ReceiptField = { key: string; x: number; y: number };

function DocumentsSection() {
  const queryClient = useQueryClient();
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: getSettings });
  const template: DocMeta = settings?.pdf_template ?? { url: "", filename: "", updated_at: "" };
  const stamp: DocMeta = settings?.stamp ?? { url: "", filename: "", updated_at: "" };
  const [aiStatus, setAiStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [aiFields, setAiFields] = useState<ReceiptField[]>([]);
  const [aiError, setAiError] = useState("");

  const handleAiDetect = async () => {
    if (!template.url || aiStatus === "loading") return;
    setAiStatus("loading");
    setAiError("");
    try {
      const { getDocument, GlobalWorkerOptions } = await import("pdfjs-dist");
      GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@6.1.200/build/pdf.worker.min.mjs`;

      const pdf = await getDocument({ url: template.url }).promise;
      const page = await pdf.getPage(1);
      const vp = page.getViewport({ scale: 2 });
      const canvas = document.createElement("canvas");
      canvas.width = vp.width;
      canvas.height = vp.height;
      const ctx = canvas.getContext("2d")!;
      const task = page.render({ canvasContext: ctx, viewport: vp } as any);
      await task.promise;
      const base64Png = canvas.toDataURL("image/png").split(",")[1];

      const result = await analyzePdfTemplate({ data: { base64Png } });
      if (result.ok) {
        const fields: ReceiptField[] = result.fields.map((f: any) => ({ key: f.key, x: f.x, y: f.y }));
        setAiFields(fields);
        setAiStatus("done");
        // Save AI fields + switch source to AI
        await updateSetting({ data: { key: "receipt_fields_ai", value: fields } });
        await updateSetting({ data: { key: "active_field_source", value: "ai" } });
        queryClient.invalidateQueries({ queryKey: ["settings"] });
        toast.success(`${fields.length} champ(s) détectés par l'IA`);
      } else {
        setAiError(result.error);
        setAiStatus("error");
        toast.error(result.error);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur inconnue";
      setAiError(msg);
      setAiStatus("error");
      toast.error(msg);
    }
  };

  const upload = useMutation({
    mutationFn: (input: { key: string; content: string; filename: string; contentType: string }) =>
      uploadSchoolFile({ data: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast.success("Fichier uploadé");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Erreur"),
  });

  const remove = useMutation({
    mutationFn: (key: string) => deleteSchoolFile({ data: key }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast.success("Fichier supprimé");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Erreur"),
  });

  const handleFile = (key: string, file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      upload.mutate({ key, content: base64, filename: file.name, contentType: file.type });
    };
    reader.readAsDataURL(file);
  };

  if (!settings) return null;

  return (
    <Section
      icon={FileText}
      title="Documents"
      description="Template PDF du reçu et tampon de l'école (PNG)   utilisés dans l'éditeur ci-dessous"
    >
      <div className="divide-y divide-[#001B3D]/8">
        <div className={rowClass}>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <p className="text-sm font-medium text-foreground">Template facture / reçu</p>
            <p className="text-xs text-muted-foreground">
              {template.filename ? template.filename : "Aucun fichier uploadé"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {template.url ? (
              <a href={template.url} target="_blank" rel="noreferrer" className={cn(ghostPill, "px-3 py-1.5 text-xs")}>
                <FileText className="h-3.5 w-3.5" /> Voir
              </a>
            ) : null}
            <label className={cn(primaryPill, "cursor-pointer px-3 py-1.5 text-xs")}>
              <Upload className="h-3.5 w-3.5" /> Uploader
              <input
                type="file"
                accept="application/pdf"
                className="sr-only"
                onChange={(e) => handleFile("pdf_template", e.target.files?.[0] ?? null)}
              />
            </label>
            {template.url ? (
              <button onClick={() => remove.mutate("pdf_template")} className={cn(ghostPill, "px-3 py-1.5 text-xs text-red-500")}>
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        </div>
        <div className={cn(rowClass, "border-t border-[#001B3D]/8")}>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <p className="text-sm font-medium text-foreground">Détection automatique des champs</p>
            <p className="text-xs text-muted-foreground">
              {aiStatus === "done"
                ? `${aiFields.length} champ(s) détecté(s) par IA`
                : aiStatus === "error"
                  ? aiError
                  : "Analyse le PDF avec l'IA pour placer les champs automatiquement"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {aiStatus === "done" && (
              <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" /> Défini
              </span>
            )}
            {aiStatus === "error" && (
              <span className="flex items-center gap-1 rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700">
                <AlertCircle className="h-3.5 w-3.5" /> Échec
              </span>
            )}
            {!template.url ? (
              <span className="text-xs text-muted-foreground">Uploader d'abord un template</span>
            ) : (
              <button
                onClick={handleAiDetect}
                disabled={aiStatus === "loading"}
                className={cn(
                  primaryPill,
                  "gap-2 px-3 py-1.5 text-xs disabled:opacity-50",
                  aiStatus === "error" && "bg-red-500 hover:bg-red-600",
                )}
              >
                <Sparkles className={cn("h-3.5 w-3.5", aiStatus === "loading" && "animate-pulse")} />
                {aiStatus === "loading"
                  ? "Analyse…"
                  : aiStatus === "error"
                    ? "Réessayer"
                    : "Détection auto par IA"}
              </button>
            )}
          </div>
        </div>
        <div className={rowClass}>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <p className="text-sm font-medium text-foreground">Tampon de l'école</p>
            <p className="text-xs text-muted-foreground">
              {stamp.filename ? stamp.filename : "Aucun fichier uploadé"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {stamp.url ? (
              <a href={stamp.url} target="_blank" rel="noreferrer" className={cn(ghostPill, "px-3 py-1.5 text-xs")}>
                <ImageIcon className="h-3.5 w-3.5" /> Voir
              </a>
            ) : null}
            <label className={cn(primaryPill, "cursor-pointer px-3 py-1.5 text-xs")}>
              <Upload className="h-3.5 w-3.5" /> Uploader
              <input
                type="file"
                accept="image/png"
                className="sr-only"
                onChange={(e) => handleFile("stamp", e.target.files?.[0] ?? null)}
              />
            </label>
            {stamp.url ? (
              <button onClick={() => remove.mutate("stamp")} className={cn(ghostPill, "px-3 py-1.5 text-xs text-red-500")}>
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </Section>
  );
}

function PdfTemplateEditorSection() {
  const queryClient = useQueryClient();
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: getSettings });
  const template: DocMeta = settings?.pdf_template ?? { url: "", filename: "", updated_at: "" };
  const savedManualFields: ReceiptField[] = settings?.receipt_fields ?? [];
  const savedAiFields: ReceiptField[] = settings?.receipt_fields_ai ?? [];
  const activeSource = (settings?.active_field_source as string) ?? "manual";
  const hasAi = savedAiFields.length > 0;
  const [fields, setFields] = useState<ReceiptField[] | null>(null);
  const [source, setSource] = useState<"manual" | "ai">(activeSource === "ai" && hasAi ? "ai" : "manual");
  const current = fields ?? (source === "ai" ? savedAiFields : savedManualFields);
  const isAiMode = source === "ai";
  const dirty = fields !== null && !isAiMode;
  const [open, setOpen] = useState(false);
  const [dragging, setDragging] = useState<number | null>(null);

  const save = useMutation({
    mutationFn: (value: ReceiptField[]) => updateSetting({ data: { key: "receipt_fields", value } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      setFields(null);
      toast.success("Configuration du template sauvegardée");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Erreur"),
  });

  const saveFieldSource = useMutation({
    mutationFn: (value: "manual" | "ai") =>
      updateSetting({ data: { key: "active_field_source", value } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Erreur"),
  });

  const allPlaceholders = [
    "school_name", "school_address", "school_phone",
    "receipt_number", "date", "parent_name", "children_names",
    "period", "monthly_fee", "remise", "discount_amount",
    "amount_due", "amount_paid", "payment_date", "remaining", "payment_mode",
    "stamp",
  ];

  const placedKeys = new Set(current.map((f) => f.key));
  const available = allPlaceholders.filter((p) => !placedKeys.has(p));

  const addField = (key: string) => {
    setFields((prev) => [...(prev ?? savedManualFields), { key, x: 50, y: 50 }]);
  };

  const removeField = (idx: number) => {
    setFields((prev) => (prev ?? savedManualFields).filter((_, i) => i !== idx));
  };

  const updatePos = (idx: number, x: number, y: number) => {
    setFields((prev) =>
      (prev ?? savedManualFields).map((f, i) => (i === idx ? { ...f, x, y } : f)),
    );
  };

  const handleMouseDown = (idx: number, e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(idx);
    const container = (e.currentTarget as HTMLElement).parentElement;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const field = current[idx];
    const startPctX = field.x;
    const startPctY = field.y;

    const onMove = (ev: MouseEvent) => {
      const dx = ((ev.clientX - startX) / rect.width) * 100;
      const dy = ((ev.clientY - startY) / rect.height) * 100;
      updatePos(idx, Math.max(0, Math.min(100, startPctX + dx)), Math.max(0, Math.min(100, startPctY + dy)));
    };
    const onUp = () => {
      setDragging(null);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  if (!settings) return null;

  const editor = (
    <div className="absolute inset-0 flex items-start justify-center overflow-hidden bg-[#F1F3F6]">
      <div className="relative h-full shadow-2xl" style={{ aspectRatio: "1/1.414" }}>
        <embed
          src={`${template.url}#toolbar=0&navpanes=0&view=FitH`}
          type="application/pdf"
          className="h-full w-full"
          style={{ pointerEvents: "none" }}
        />
      {current.map((f, i) => (
        <div
          key={f.key}
          onMouseDown={(e) => { if (!isAiMode) handleMouseDown(i, e); }}
          className={cn(
            "absolute z-10 flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-mono font-medium shadow-sm transition-shadow",
            isAiMode
              ? "cursor-default bg-white/80 text-[#001B3D]"
              : "cursor-grab hover:shadow-md",
            dragging === i ? "shadow-md ring-2 ring-[#17B3A6] cursor-grabbing" : "",
            f.key === "stamp" ? "bg-[#FF666B]/15 text-[#FF666B] ring-[#FF666B]" : "",
          )}
          style={{ left: `${f.x}%`, top: `${f.y}%`, transform: "translate(-50%, -50%)" }}
        >
          {!isAiMode && <GripVertical className="h-3 w-3 shrink-0 opacity-60" />}
          <span className="truncate max-w-[120px]">{'{'}{f.key}{'}'}</span>
          {!isAiMode && (
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => removeField(i)}
              className="ml-0.5 grid h-4 w-4 place-items-center rounded-full hover:bg-black/10"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      ))}
      </div>
    </div>
  );

  return (
    <Section
      icon={FileText}
      title="Configuration du reçu PDF"
      description={
        isAiMode
          ? "Champs positionnés par l'IA. Passez en mode Manuel pour modifier."
          : "Placez les champs directement sur le template PDF. Le champ stamp positionne le tampon de l'école."
      }
    >
      <div className="space-y-4 px-4 py-5 sm:px-6">
        {hasAi && (
          <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2">
            <span className="text-xs font-medium text-foreground">Source des champs :</span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => { setSource("manual"); saveFieldSource.mutate("manual"); }}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition",
                  !isAiMode
                    ? "bg-[#001B3D] text-white"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                Manuel
              </button>
              <button
                type="button"
                onClick={() => { setSource("ai"); saveFieldSource.mutate("ai"); }}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition",
                  isAiMode
                    ? "bg-[#001B3D] text-white"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                IA {hasAi ? `(${savedAiFields.length} champ${savedAiFields.length > 1 ? "s" : ""})` : ""}
              </button>
            </div>
          </div>
        )}
        {!template.url ? (
          <p className="text-sm text-muted-foreground">
            Uploader d'abord un template PDF dans la section «Documents» ci-dessus.
          </p>
        ) : (
          <>
            <p className="text-sm text-foreground">
              {current.length} champ(s) positionné(s) sur le template{isAiMode ? " (IA)" : ""}.
              {dirty ? " Modifications non enregistrées." : ""}
            </p>
            <button
              onClick={() => setOpen(true)}
              className={cn(primaryPill, "gap-2")}
            >
              <Maximize2 className="h-4 w-4" /> Ouvrir l'éditeur
            </button>
          </>
        )}
      </div>

      {open && createPortal(
        <div className="fixed inset-0 z-[9999] bg-[#F1F3F6]" style={{ isolation: "isolate" }}>
          <div className="sr-only" role="dialog" aria-modal="true" aria-label="Configuration du reçu PDF" />

          {/* Floating top bar */}
          <div className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between bg-white/90 px-4 py-2 shadow-sm backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">
                {current.length} champ{current.length !== 1 ? "s" : ""}
                {isAiMode ? " (IA)" : ""}
                {dirty ? " · Modifié" : ""}
              </span>
              {!isAiMode && available.length > 0 && (
                <select
                  value=""
                  onChange={(e) => { if (e.target.value) addField(e.target.value); e.target.value = ""; }}
                  className={cn(ghostPill, "px-2 py-1 text-xs")}
                >
                  <option value="">+ Ajouter un champ</option>
                  {available.map((p) => (
                    <option key={p} value={p}>{'{'}{p}{'}'}</option>
                  ))}
                </select>
              )}
              {isAiMode && (
                <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                  <Sparkles className="h-3 w-3" /> IA
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {dirty && (
                <>
                  <button onClick={() => { setFields(null); setOpen(false); }} className={cn(ghostPill, "px-2 py-1 text-xs")}>Annuler</button>
                  <button
                    onClick={() => save.mutate(current)}
                    disabled={save.isPending}
                    className={cn(primaryPill, "px-2 py-1 text-xs disabled:opacity-50")}
                  >
                    <Save className="h-3 w-3" /> {save.isPending ? "..." : "Enregistrer"}
                  </button>
                </>
              )}
              <button onClick={() => setOpen(false)} className={cn(iconButton, "h-7 w-7 p-0")} aria-label="Fermer"><X className="h-4 w-4" /></button>
            </div>
          </div>

          {editor}
        </div>,
        document.body
      )}
    </Section>
  );
}
