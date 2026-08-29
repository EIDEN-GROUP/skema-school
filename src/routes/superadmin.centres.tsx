import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Building2,
  Pause,
  Pencil,
  Play,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageTitle } from "@/components/dash-shell";
import { TablePagination, usePagination } from "@/components/table-pagination";
import { getAccessToken } from "@/lib/auth";
import { useDashboardI18n } from "@/lib/landing-i18n";
import {
  createCenter,
  deleteCenter,
  listCenters,
  updateCenter,
  type CenterWithAdmins,
} from "@/lib/server-superadmin";
import type { CenterInput, CenterPlan, CenterStatus } from "@/lib/database-types";
import {
  dialogSurface,
  ghostPill,
  iconButton,
  labelClass,
  primaryPill,
  softCard,
  softInput,
  softSelectContent,
  softSelectTrigger,
  statusPill,
} from "@/lib/dash-ui";

type CentresSearch = {
  name?: string;
  email?: string;
  phone?: string;
};

export const Route = createFileRoute("/superadmin/centres")({
  head: () => ({ meta: [{ title: "Centres   Superadmin" }] }),
  validateSearch: (search: Record<string, unknown>): CentresSearch => ({
    name: typeof search.name === "string" ? search.name : undefined,
    email: typeof search.email === "string" ? search.email : undefined,
    phone: typeof search.phone === "string" ? search.phone : undefined,
  }),
  component: SuperadminCentres,
});

type CenterForm = {
  name: string;
  city: string;
  contact_email: string;
  contact_phone: string;
  plan: CenterPlan;
  status: CenterStatus;
  monthly_price: string;
  students_count: string;
  notes: string;
};

const emptyForm: CenterForm = {
  name: "",
  city: "",
  contact_email: "",
  contact_phone: "",
  plan: "essai",
  status: "actif",
  monthly_price: "0",
  students_count: "0",
  notes: "",
};

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

function statusTone(status: string): "paye" | "en_attente" | "retard" | "neutral" {
  if (status === "actif") return "paye";
  if (status === "essai") return "en_attente";
  if (status === "suspendu") return "retard";
  return "neutral";
}

function SuperadminCentres() {
  const { t, numberLocale } = useDashboardI18n();
  const tc = t.superadmin.centres;
  const queryClient = useQueryClient();
  const prefill = Route.useSearch();

  const { data: centers = [] } = useQuery({ queryKey: ["centers"], queryFn: listCenters });

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CenterWithAdmins | null>(null);
  const [form, setForm] = useState<CenterForm>(emptyForm);
  const [confirmAction, setConfirmAction] = useState<
    | { kind: "delete"; center: CenterWithAdmins }
    | { kind: "suspend"; center: CenterWithAdmins }
    | null
  >(null);

  // Pré-remplissage depuis une demande démo (/superadmin/demandes → « Créer le centre »)
  useEffect(() => {
    if (!prefill.name) return;
    setEditing(null);
    setForm({
      ...emptyForm,
      name: prefill.name ?? "",
      contact_email: prefill.email ?? "",
      contact_phone: prefill.phone ?? "",
    });
    setDialogOpen(true);
  }, [prefill.name, prefill.email, prefill.phone]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["centers"] });
    queryClient.invalidateQueries({ queryKey: ["platform-stats"] });
    queryClient.invalidateQueries({ queryKey: ["centers-by-plan"] });
  };

  const toInput = (f: CenterForm): CenterInput => ({
    name: f.name.trim(),
    city: f.city.trim(),
    contact_email: f.contact_email.trim(),
    contact_phone: f.contact_phone.trim(),
    plan: f.plan,
    status: f.status,
    monthly_price: Number(f.monthly_price) || 0,
    students_count: Number(f.students_count) || 0,
    notes: f.notes.trim(),
  });

  const createMutation = useMutation({
    mutationFn: async (f: CenterForm) =>
      createCenter({ data: { token: await getAccessToken(), ...toInput(f) } }),
    onSuccess: () => {
      toast.success(tc.created);
      setDialogOpen(false);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CenterInput> }) =>
      updateCenter({ data: { token: await getAccessToken(), id, ...updates } }),
    onSuccess: () => {
      toast.success(tc.updated);
      setDialogOpen(false);
      setConfirmAction(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) =>
      deleteCenter({ data: { token: await getAccessToken(), id } }),
    onSuccess: () => {
      toast.success(tc.deleted);
      setConfirmAction(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return centers;
    return centers.filter((c) =>
      [c.name, c.city, c.contact_email, c.contact_phone]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [centers, search]);

  const { page, setPage, pageCount, pageItems, total, pageSize } = usePagination(filtered, search);

  const fmt = (n: number) => n.toLocaleString(numberLocale);
  const planLabel = (plan: string) =>
    plan === "premium" ? tc.planPremium : plan === "standard" ? tc.planStandard : tc.planEssai;
  const statusLabel = (status: string) =>
    status === "actif" ? tc.statusActif : status === "suspendu" ? tc.statusSuspendu : tc.statusEssai;

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (center: CenterWithAdmins) => {
    setEditing(center);
    setForm({
      name: center.name,
      city: center.city,
      contact_email: center.contact_email,
      contact_phone: center.contact_phone,
      plan: center.plan,
      status: center.status,
      monthly_price: String(center.monthly_price),
      students_count: String(center.students_count),
      notes: center.notes,
    });
    setDialogOpen(true);
  };

  const submit = () => {
    if (!form.name.trim()) return;
    if (editing) updateMutation.mutate({ id: editing.id, updates: toInput(form) });
    else createMutation.mutate(form);
  };

  const pending = createMutation.isPending || updateMutation.isPending;

  return (
    <div>
      <PageTitle
        eyebrow={tc.eyebrow}
        title={tc.pageTitle}
        action={
          <button type="button" onClick={openCreate} className={primaryPill}>
            <Plus className="h-4 w-4" />
            {tc.addCenter}
          </button>
        }
      />

      <div className={`${softCard} overflow-hidden`}>
        <div className="flex flex-wrap items-center gap-3 px-5 py-4">
          <div className="relative min-w-0 flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={tc.searchPlaceholder}
              className={`${softInput} pl-9`}
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="px-5 pb-6 text-sm text-muted-foreground">
            {centers.length === 0 ? t.superadmin.overview.noCenters : tc.noResults}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-t border-[#001B3D]/10 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3 font-medium">{tc.name}</th>
                  <th className="px-5 py-3 font-medium">{tc.city}</th>
                  <th className="px-5 py-3 font-medium">{tc.plan}</th>
                  <th className="px-5 py-3 font-medium">{tc.status}</th>
                  <th className="px-5 py-3 font-medium">{tc.admins}</th>
                  <th className="px-5 py-3 font-medium">{tc.monthlyPrice}</th>
                  <th className="px-5 py-3 font-medium text-right">{t.common.actions}</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((c) => (
                  <tr key={c.id} className="border-t border-[#001B3D]/10">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2 font-medium text-foreground">
                        <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span>{c.name}</span>
                        {c.is_primary ? (
                          <span className={statusPill("neutral")}>{tc.primaryBadge}</span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{c.city || " "}</td>
                    <td className="px-5 py-3 text-muted-foreground">{planLabel(c.plan)}</td>
                    <td className="px-5 py-3">
                      <span className={statusPill(statusTone(c.status))}>{statusLabel(c.status)}</span>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {c.center_admins.length === 0
                        ? tc.noAdmins
                        : c.center_admins
                            .map((a) => a.profiles?.name || a.profiles?.email || " ")
                            .join(", ")}
                    </td>
                    <td className="px-5 py-3 tabular-nums text-muted-foreground">
                      {fmt(c.monthly_price)} {t.common.mad}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(c)}
                          className={iconButton}
                          aria-label={tc.editCenter}
                          title={tc.editCenter}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        {c.status === "suspendu" ? (
                          <button
                            type="button"
                            onClick={() =>
                              updateMutation.mutate({ id: c.id, updates: { status: "actif" } })
                            }
                            className={iconButton}
                            aria-label={tc.activate}
                            title={tc.activate}
                          >
                            <Play className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmAction({ kind: "suspend", center: c })}
                            className={iconButton}
                            aria-label={tc.suspend}
                            title={tc.suspend}
                          >
                            <Pause className="h-4 w-4" />
                          </button>
                        )}
                        {!c.is_primary ? (
                          <button
                            type="button"
                            onClick={() => setConfirmAction({ kind: "delete", center: c })}
                            className={`${iconButton} hover:text-[#D93A41]`}
                            aria-label={tc.delete}
                            title={tc.delete}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <TablePagination
          page={page}
          pageCount={pageCount}
          total={total}
          pageSize={pageSize}
          onPage={setPage}
          label={tc.unit}
        />
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className={dialogSurface}>
          <div className="border-b border-[#001B3D]/10 px-6 py-5">
            <DialogTitle className="font-display text-xl">
              {editing ? tc.editCenter : tc.addCenter}
            </DialogTitle>
            <DialogDescription className="sr-only">{tc.subtitle}</DialogDescription>
          </div>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
            <Field id="center-name" label={tc.name}>
              <Input
                id="center-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className={softInput}
              />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field id="center-city" label={tc.city}>
                <Input
                  id="center-city"
                  value={form.city}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                  className={softInput}
                />
              </Field>
              <Field id="center-phone" label={tc.contactPhone}>
                <Input
                  id="center-phone"
                  value={form.contact_phone}
                  onChange={(e) => setForm((f) => ({ ...f, contact_phone: e.target.value }))}
                  className={softInput}
                />
              </Field>
            </div>
            <Field id="center-email" label={tc.contactEmail}>
              <Input
                id="center-email"
                type="email"
                value={form.contact_email}
                onChange={(e) => setForm((f) => ({ ...f, contact_email: e.target.value }))}
                className={softInput}
              />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field id="center-plan" label={tc.plan}>
                <Select
                  value={form.plan}
                  onValueChange={(v) => setForm((f) => ({ ...f, plan: v as CenterPlan }))}
                >
                  <SelectTrigger id="center-plan" className={`${softSelectTrigger} w-full`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={softSelectContent}>
                    <SelectItem value="essai">{tc.planEssai}</SelectItem>
                    <SelectItem value="standard">{tc.planStandard}</SelectItem>
                    <SelectItem value="premium">{tc.planPremium}</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field id="center-status" label={tc.status}>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm((f) => ({ ...f, status: v as CenterStatus }))}
                >
                  <SelectTrigger id="center-status" className={`${softSelectTrigger} w-full`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={softSelectContent}>
                    <SelectItem value="actif">{tc.statusActif}</SelectItem>
                    <SelectItem value="essai">{tc.statusEssai}</SelectItem>
                    <SelectItem value="suspendu">{tc.statusSuspendu}</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field id="center-price" label={tc.monthlyPrice}>
                <Input
                  id="center-price"
                  type="number"
                  min="0"
                  value={form.monthly_price}
                  onChange={(e) => setForm((f) => ({ ...f, monthly_price: e.target.value }))}
                  className={softInput}
                />
              </Field>
              <Field id="center-students" label={tc.studentsCount}>
                <Input
                  id="center-students"
                  type="number"
                  min="0"
                  value={form.students_count}
                  onChange={(e) => setForm((f) => ({ ...f, students_count: e.target.value }))}
                  className={softInput}
                />
              </Field>
            </div>
            <Field id="center-notes" label={tc.notes}>
              <Textarea
                id="center-notes"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className={softInput}
                rows={3}
              />
            </Field>
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-[#001B3D]/10 px-6 py-4">
            <button type="button" onClick={() => setDialogOpen(false)} className={ghostPill}>
              {t.common.cancel}
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={!form.name.trim() || pending}
              className={`${primaryPill} disabled:opacity-50`}
            >
              {editing ? t.common.saveChanges : t.common.add}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={confirmAction !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmAction(null);
        }}
      >
        <AlertDialogContent className="rounded-3xl border-[#001B3D]/10">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.kind === "delete" ? tc.deleteTitle : tc.suspendTitle}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.kind === "delete" ? tc.deleteDesc : tc.suspendDesc}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full bg-[#001B3D] hover:bg-[#00142E]"
              onClick={() => {
                if (!confirmAction) return;
                if (confirmAction.kind === "delete") deleteMutation.mutate(confirmAction.center.id);
                else
                  updateMutation.mutate({
                    id: confirmAction.center.id,
                    updates: { status: "suspendu" },
                  });
              }}
            >
              {tc.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
