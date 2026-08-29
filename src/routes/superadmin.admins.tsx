import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Eye, EyeOff, Pencil, Plus, Search, Trash2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageTitle } from "@/components/dash-shell";
import { TablePagination, usePagination } from "@/components/table-pagination";
import { getAccessToken, useAuth } from "@/lib/auth";
import { useDashboardI18n, getDateFnsLocale } from "@/lib/landing-i18n";
import { format } from "date-fns";
import {
  createAdmin,
  deleteAdmin,
  listAdmins,
  listCenters,
  updateAdmin,
  type AdminRow,
} from "@/lib/server-superadmin";
import {
  dialogSurface,
  ghostPill,
  iconButton,
  initials,
  labelClass,
  primaryPill,
  softCard,
  softInput,
  softSelectContent,
  softSelectTrigger,
  statusPill,
} from "@/lib/dash-ui";

export const Route = createFileRoute("/superadmin/admins")({
  head: () => ({ meta: [{ title: "Administrateurs   Superadmin" }] }),
  component: SuperadminAdmins,
});

const NO_CENTER = "__none__";

type AdminForm = {
  name: string;
  email: string;
  password: string;
  centerId: string;
};

const emptyForm: AdminForm = { name: "", email: "", password: "", centerId: NO_CENTER };

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

function SuperadminAdmins() {
  const { t, locale } = useDashboardI18n();
  const ta = t.superadmin.adminsPage;
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: admins = [] } = useQuery({ queryKey: ["platform-admins"], queryFn: listAdmins });
  const { data: centers = [] } = useQuery({ queryKey: ["centers"], queryFn: listCenters });

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminRow | null>(null);
  const [form, setForm] = useState<AdminForm>(emptyForm);
  const [showPassword, setShowPassword] = useState(false);
  const [toDelete, setToDelete] = useState<AdminRow | null>(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["platform-admins"] });
    queryClient.invalidateQueries({ queryKey: ["centers"] });
    queryClient.invalidateQueries({ queryKey: ["platform-stats"] });
  };

  const createMutation = useMutation({
    mutationFn: async (f: AdminForm) =>
      createAdmin({
        data: {
          token: await getAccessToken(),
          email: f.email.trim(),
          password: f.password,
          name: f.name.trim(),
          centerId: f.centerId === NO_CENTER ? undefined : f.centerId,
        },
      }),
    onSuccess: () => {
      toast.success(ta.created);
      setDialogOpen(false);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, f }: { id: string; f: AdminForm }) =>
      updateAdmin({
        data: {
          token: await getAccessToken(),
          id,
          name: f.name.trim(),
          centerId: f.centerId === NO_CENTER ? null : f.centerId,
          newPassword: f.password || undefined,
        },
      }),
    onSuccess: () => {
      toast.success(ta.updated);
      setDialogOpen(false);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) =>
      deleteAdmin({ data: { token: await getAccessToken(), id } }),
    onSuccess: () => {
      toast.success(ta.deleted);
      setToDelete(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return admins;
    return admins.filter((a) => [a.name, a.email].join(" ").toLowerCase().includes(q));
  }, [admins, search]);

  const { page, setPage, pageCount, pageItems, total, pageSize } = usePagination(filtered, search);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowPassword(false);
    setDialogOpen(true);
  };

  const openEdit = (admin: AdminRow) => {
    setEditing(admin);
    setForm({
      name: admin.name,
      email: admin.email,
      password: "",
      centerId: admin.center_admins[0]?.center_id ?? NO_CENTER,
    });
    setShowPassword(false);
    setDialogOpen(true);
  };

  const canSubmit = editing
    ? form.name.trim().length > 0
    : form.name.trim().length > 0 && form.email.trim().length > 0 && form.password.length >= 6;

  const submit = () => {
    if (!canSubmit) return;
    if (editing) updateMutation.mutate({ id: editing.id, f: form });
    else createMutation.mutate(form);
  };

  const pending = createMutation.isPending || updateMutation.isPending;
  const dateLocale = getDateFnsLocale(locale);

  return (
    <div>
      <PageTitle
        eyebrow={ta.eyebrow}
        title={ta.pageTitle}
        action={
          <button type="button" onClick={openCreate} className={primaryPill}>
            <Plus className="h-4 w-4" />
            {ta.addAdmin}
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
              placeholder={ta.searchPlaceholder}
              className={`${softInput} pl-9`}
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="px-5 pb-6 text-sm text-muted-foreground">{ta.noResults}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-t border-[#001B3D]/10 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3 font-medium">{ta.name}</th>
                  <th className="px-5 py-3 font-medium">{ta.email}</th>
                  <th className="px-5 py-3 font-medium">{ta.role}</th>
                  <th className="px-5 py-3 font-medium">{ta.center}</th>
                  <th className="px-5 py-3 font-medium">{ta.createdAt}</th>
                  <th className="px-5 py-3 font-medium text-right">{t.common.actions}</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((a) => {
                  const isSuper = a.role === "superadmin";
                  const isSelf = a.id === user?.id;
                  return (
                    <tr key={a.id} className="border-t border-[#001B3D]/10">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#001B3D] text-[11px] font-semibold text-[#6C4DF6]">
                            {initials(a.name || a.email || "?")}
                          </span>
                          <span className="font-medium text-foreground">{a.name || " "}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">{a.email || " "}</td>
                      <td className="px-5 py-3">
                        <span className={statusPill(isSuper ? "paye" : "neutral")}>
                          {isSuper ? ta.roleSuperadmin : ta.roleAdmin}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {a.center_admins[0]?.centers?.name ?? ta.noCenter}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {a.created_at
                          ? format(new Date(a.created_at), "d MMM yyyy", { locale: dateLocale })
                          : " "}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(a)}
                            className={iconButton}
                            aria-label={ta.editAdmin}
                            title={ta.editAdmin}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          {!isSuper && !isSelf ? (
                            <button
                              type="button"
                              onClick={() => setToDelete(a)}
                              className={`${iconButton} hover:text-[#D93A41]`}
                              aria-label={ta.deleteTitle}
                              title={ta.deleteTitle}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
          label={ta.unit}
        />
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className={dialogSurface}>
          <div className="border-b border-[#001B3D]/10 px-6 py-5">
            <DialogTitle className="font-display text-xl">
              {editing ? ta.editAdmin : ta.addAdmin}
            </DialogTitle>
            <DialogDescription className="sr-only">{ta.subtitle}</DialogDescription>
          </div>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
            <Field id="admin-name" label={ta.name}>
              <Input
                id="admin-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className={softInput}
              />
            </Field>
            <Field id="admin-email" label={ta.email}>
              <Input
                id="admin-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className={softInput}
                disabled={!!editing}
              />
            </Field>
            <Field id="admin-password" label={editing ? ta.newPassword : ta.password}>
              <div className="relative">
                <Input
                  id="admin-password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  className={`${softInput} pr-10`}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={ta.showPassword}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>
            <Field id="admin-center" label={ta.center}>
              <Select
                value={form.centerId}
                onValueChange={(v) => setForm((f) => ({ ...f, centerId: v }))}
              >
                <SelectTrigger id="admin-center" className={`${softSelectTrigger} w-full`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className={softSelectContent}>
                  <SelectItem value={NO_CENTER}>{ta.noCenter}</SelectItem>
                  {centers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-[#001B3D]/10 px-6 py-4">
            <button type="button" onClick={() => setDialogOpen(false)} className={ghostPill}>
              {t.common.cancel}
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={!canSubmit || pending}
              className={`${primaryPill} disabled:opacity-50`}
            >
              {editing ? t.common.saveChanges : t.common.add}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={toDelete !== null}
        onOpenChange={(open) => {
          if (!open) setToDelete(null);
        }}
      >
        <AlertDialogContent className="rounded-3xl border-[#001B3D]/10">
          <AlertDialogHeader>
            <AlertDialogTitle>{ta.deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>{ta.deleteDesc}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full bg-[#001B3D] hover:bg-[#00142E]"
              onClick={() => {
                if (toDelete) deleteMutation.mutate(toDelete.id);
              }}
            >
              {ta.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
