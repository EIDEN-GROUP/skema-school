import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useRef, type ReactNode } from "react";
import { Sticker } from "@/components/skema/bits";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, CalendarDays, Pencil, Plus, Search, Trash2, Upload, Download, Loader2 } from "lucide-react";
import { listEmployees, createEmployee, updateEmployee, deleteEmployee, importEmployeesCsv, type EmployeeInput } from "@/lib/server-employees";
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
import { cn } from "@/lib/utils";
import { interpolate, useDashboardI18n } from "@/lib/landing-i18n";
import { usePagination, TablePagination } from "@/components/table-pagination";
import {
  softCard,
  softInput as inputClass,
  softSelectTrigger as selectTriggerClass,
  softSelectContent,
  dialogSurface,
  labelClass,
  iconButton,
  primaryPill,
  ghostPill,
} from "@/lib/dash-ui";

export const Route = createFileRoute("/dashboard/affiches")({
  head: () => ({ meta: [{ title: "Affiches   Équipe" }] }),
  component: AffichesPage,
});

type StatutEmploye = "actif" | "inactif";

type Employe = {
  id: string;
  nomComplet: string;
  poste: string;
  departement: string;
  email: string;
  emailPerso: string;
  tel: string;
  tel2: string;
  cin: string;
  dateNaissance: string;
  dateEmbauche: string;
  adresse: string;
  contrat: string;
  /** Salaire mensuel brut, en MAD. */
  salaire: number;
  /** Congés posés   dates ISO (AAAA-MM-JJ). Vides = aucun congé planifié. */
  congeDebut: string;
  congeFin: string;
  statut: StatutEmploye;
};

type CongeState = "en_cours" | "a_venir" | "termine" | "aucun";

/** Un congé n'existe que si les deux bornes sont renseignées. */
function aConge(e: Employe) {
  return e.congeDebut.trim() !== "" && e.congeFin.trim() !== "";
}

/** Date ISO -> JJ/MM/AAAA. */
function formatDateFr(iso: string) {
  if (!iso.trim()) return " ";
  const [y, m, d] = iso.split("-");
  return d && m && y ? `${d}/${m}/${y}` : iso;
}

/** Durée du congé, bornes incluses. */
function joursConge(e: Employe) {
  const start = new Date(e.congeDebut);
  const end = new Date(e.congeFin);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
}

/** Position du congé par rapport à aujourd'hui. */
function congeState(e: Employe): CongeState {
  if (!aConge(e)) return "aucun";
  const today = new Date().toISOString().slice(0, 10);
  if (today < e.congeDebut) return "a_venir";
  if (today > e.congeFin) return "termine";
  return "en_cours";
}

const CONGE_TONE: Record<Exclude<CongeState, "aucun">, { label: string; chip: string }> = {
  en_cours: { label: "En congé", chip: "bg-[#FFF3E6] text-[#B5760E]" },
  a_venir: { label: "Congé à venir", chip: "bg-[#F1F3F6]/70 text-[#B5760E]" },
  termine: { label: "Congé passé", chip: "bg-muted text-muted-foreground" },
};

/** Formate un salaire en MAD (séparateur d'espace fine, comme le reste du CRM). */
function formatSalaire(v: number) {
  return v.toLocaleString("fr-FR").replace(/ | /g, " ");
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

function Badge({ children, variant }: { children: ReactNode; variant: "neutral" | "dark" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide",
        variant === "dark"
          ? "bg-[#6C4DF6]/30 text-[#0E6B62]"
          : "bg-muted text-foreground/70",
      )}
    >
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", variant === "dark" ? "bg-[#17B3A6]" : "bg-current")} aria-hidden />
      {children}
    </span>
  );
}

/** Tag seul (sans libellé « Statut ») pour la fiche employé */
function StatutTag({ actif }: { actif: boolean }) {
  const { t } = useDashboardI18n();
  return (
    <span
      role="status"
      className={cn(
        "inline-flex w-fit rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider",
        actif ? "bg-[#6C4DF6]/30 text-[#0E6B62]" : "bg-muted text-muted-foreground",
      )}
    >
      {actif ? t.status.actif : t.status.inactif}
    </span>
  );
}

function dash(v: string) {
  return v.trim() === "" ? " " : v;
}

function dbToEmploye(db: Record<string, unknown>): Employe {
  return {
    id: db.id as string,
    nomComplet: (db.full_name as string) ?? "",
    poste: (db.position as string) ?? "",
    departement: (db.department as string) ?? "",
    email: (db.email as string) ?? "",
    emailPerso: (db.personal_email as string) ?? "",
    tel: (db.phone as string) ?? "",
    tel2: (db.phone2 as string) ?? "",
    cin: (db.cin as string) ?? "",
    dateNaissance: (db.birth_date as string) ?? "",
    dateEmbauche: (db.hire_date as string) ?? "",
    adresse: (db.address as string) ?? "",
    contrat: (db.contract_type as string) ?? "",
    salaire: Number(db.salary ?? 0),
    congeDebut: (db.leave_start as string) ?? "",
    congeFin: (db.leave_end as string) ?? "",
    statut: (db.status as StatutEmploye) ?? "actif",
  };
}

function employeToInput(emp: Partial<Employe>): Partial<EmployeeInput> {
  return {
    full_name: emp.nomComplet,
    position: emp.poste,
    department: emp.departement,
    email: emp.email,
    personal_email: emp.emailPerso,
    phone: emp.tel,
    phone2: emp.tel2,
    cin: emp.cin,
    birth_date: emp.dateNaissance,
    hire_date: emp.dateEmbauche,
    address: emp.adresse,
    contract_type: emp.contrat,
    salary: emp.salaire,
    leave_start: emp.congeDebut || undefined,
    leave_end: emp.congeFin || undefined,
    status: emp.statut,
  };
}

function DetailEmployeDialog({
  employe,
  open,
  onOpenChange,
}: {
  employe: Employe | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useDashboardI18n();
  const f = t.form;
  const a = t.affiches;

  if (!employe) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={dialogSurface}>
        <DialogDescription className="sr-only">
          {interpolate(a.detailModal.srDesc, { name: employe.nomComplet })}
        </DialogDescription>
        <div className="flex min-h-0 flex-1 flex-col border-t-4 border-t-primary">
          <div className="shrink-0 border-b border-border px-6 pb-4 pt-6 pr-14">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">{a.team}</p>
            <DialogTitle className="mt-2 text-left font-display text-xl font-semibold tracking-tight text-foreground">
              {a.detailModal.title}
            </DialogTitle>
          </div>
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-x-6 gap-y-4 overflow-y-auto scroll-touch px-6 py-5 sm:grid-cols-2">
            <Field id="emp-nom" label={f.fullName}>
              <p className="text-sm font-semibold text-foreground">{employe.nomComplet}</p>
            </Field>
            <div className="flex items-end justify-start sm:justify-end">
              <StatutTag actif={employe.statut === "actif"} />
            </div>
            <Field id="emp-naissance" label={f.birthDate}>
              <p className="text-sm font-semibold text-foreground">{dash(employe.dateNaissance)}</p>
            </Field>
            <Field id="emp-embauche" label={f.hireDate}>
              <p className="text-sm font-semibold text-foreground">{dash(employe.dateEmbauche)}</p>
            </Field>
            <Field id="emp-cin" label={f.cinPassport}>
              <p className="text-sm font-semibold text-foreground">{dash(employe.cin)}</p>
            </Field>
            <Field id="emp-contrat" label={f.contractType}>
              <p className="text-sm font-semibold text-foreground">{dash(employe.contrat)}</p>
            </Field>
            <Field id="emp-salaire" label="Salaire mensuel brut">
              <p className="text-sm font-semibold text-foreground">
                {formatSalaire(employe.salaire)} {t.common.mad}
              </p>
            </Field>
            <Field id="emp-conge" label="Congés">
              <p className="text-sm font-semibold text-foreground">
                {aConge(employe)
                  ? `Du ${formatDateFr(employe.congeDebut)} au ${formatDateFr(employe.congeFin)}   ${joursConge(employe)} j`
                  : "Aucun congé planifié"}
              </p>
            </Field>
            <Field id="emp-email" label={f.workEmail}>
              <p className="text-sm font-semibold text-foreground">{dash(employe.email)}</p>
            </Field>
            <Field id="emp-email-perso" label={f.personalEmail}>
              <p className="text-sm font-semibold text-foreground">{dash(employe.emailPerso)}</p>
            </Field>
            <Field id="emp-tel1" label={f.phone1}>
              <p className="text-sm font-semibold text-foreground">{dash(employe.tel)}</p>
            </Field>
            <Field id="emp-tel2" label={f.phone2}>
              <p className="text-sm font-semibold text-foreground">{dash(employe.tel2)}</p>
            </Field>
            <Field id="emp-poste" label={t.common.position}>
              <p className="text-sm font-semibold text-foreground">{employe.poste}</p>
            </Field>
            <Field id="emp-dept" label={t.common.department}>
              <p className="text-sm font-semibold text-foreground">{employe.departement}</p>
            </Field>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="emp-adresse" className={labelClass}>
                {t.common.address}
              </Label>
              <p id="emp-adresse" className="text-sm font-semibold text-foreground">
                {dash(employe.adresse)}
              </p>
            </div>
          </div>
          <div className="flex w-full flex-wrap justify-end border-t border-border px-6 py-4">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-full border border-[#001B3D]/15 bg-card px-5 py-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              {t.common.close}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditEmployeDialog({
  employe,
  open,
  onOpenChange,
  onSave,
}: {
  employe: Employe | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (next: Employe) => void;
}) {
  const { t } = useDashboardI18n();
  const f = t.form;
  const a = t.affiches;
  const [statut, setStatut] = useState<StatutEmploye>("actif");

  useEffect(() => {
    if (employe) setStatut(employe.statut);
  }, [employe?.id, employe?.statut]);

  if (!employe) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(dialogSurface, "max-w-[560px]")}>
        <DialogDescription className="sr-only">
          {interpolate(a.editModal.srDesc, { name: employe.nomComplet })}
        </DialogDescription>
        <div className="flex min-h-0 flex-1 flex-col border-t-4 border-t-primary">
          <div className="shrink-0 border-b border-border px-6 pb-4 pt-6 pr-14">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">{a.editModal.eyebrow}</p>
            <DialogTitle className="mt-2 text-left font-display text-xl font-semibold tracking-tight text-foreground">
              {a.editModal.title}
            </DialogTitle>
          </div>
          <form
            className="min-h-0 flex-1 space-y-4 overflow-y-auto scroll-touch px-6 py-5"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              onSave({
                ...employe,
                nomComplet: String(fd.get("nomComplet") ?? employe.nomComplet),
                poste: String(fd.get("poste") ?? employe.poste),
                departement: String(fd.get("departement") ?? employe.departement),
                email: String(fd.get("email") ?? employe.email),
                emailPerso: String(fd.get("emailPerso") ?? employe.emailPerso),
                tel: String(fd.get("tel") ?? employe.tel),
                tel2: String(fd.get("tel2") ?? employe.tel2),
                cin: String(fd.get("cin") ?? employe.cin),
                dateNaissance: String(fd.get("dateNaissance") ?? employe.dateNaissance),
                dateEmbauche: String(fd.get("dateEmbauche") ?? employe.dateEmbauche),
                adresse: String(fd.get("adresse") ?? employe.adresse),
                contrat: String(fd.get("contrat") ?? employe.contrat),
                salaire: Number(fd.get("salaire") ?? employe.salaire),
                congeDebut: String(fd.get("congeDebut") ?? employe.congeDebut),
                congeFin: String(fd.get("congeFin") ?? employe.congeFin),
                statut,
              });
              onOpenChange(false);
            }}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field id="ed-nom" label={f.fullName}>
                <Input id="ed-nom" name="nomComplet" defaultValue={employe.nomComplet} required className={inputClass} />
              </Field>
              <Field id="ed-statut" label={t.common.status}>
                <Select value={statut} onValueChange={(v) => setStatut(v as StatutEmploye)}>
                  <SelectTrigger id="ed-statut" className={selectTriggerClass}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={softSelectContent}>
                    <SelectItem value="actif">{t.status.actif}</SelectItem>
                    <SelectItem value="inactif">{t.status.inactif}</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field id="ed-poste" label={t.common.position}>
                <Input id="ed-poste" name="poste" defaultValue={employe.poste} className={inputClass} />
              </Field>
              <Field id="ed-dept" label={t.common.department}>
                <Input id="ed-dept" name="departement" defaultValue={employe.departement} className={inputClass} />
              </Field>
              <Field id="ed-email" label={f.workEmail}>
                <Input id="ed-email" name="email" type="email" defaultValue={employe.email} className={inputClass} />
              </Field>
              <Field id="ed-email-perso" label={f.personalEmail}>
                <Input id="ed-email-perso" name="emailPerso" type="email" defaultValue={employe.emailPerso} className={inputClass} />
              </Field>
              <Field id="ed-tel" label={f.phone1}>
                <Input id="ed-tel" name="tel" type="tel" defaultValue={employe.tel} className={inputClass} />
              </Field>
              <Field id="ed-tel2" label={f.phone2}>
                <Input id="ed-tel2" name="tel2" type="tel" defaultValue={employe.tel2} className={inputClass} />
              </Field>
              <Field id="ed-naissance" label={f.birthDate}>
                <Input id="ed-naissance" name="dateNaissance" defaultValue={employe.dateNaissance} className={inputClass} />
              </Field>
              <Field id="ed-embauche" label={f.hireDate}>
                <Input id="ed-embauche" name="dateEmbauche" defaultValue={employe.dateEmbauche} className={inputClass} />
              </Field>
              <Field id="ed-cin" label={f.cinPassport}>
                <Input id="ed-cin" name="cin" defaultValue={employe.cin} className={inputClass} />
              </Field>
              <Field id="ed-contrat" label={f.contractType}>
                <Input id="ed-contrat" name="contrat" defaultValue={employe.contrat} className={inputClass} />
              </Field>
              <Field id="ed-salaire" label={`Salaire mensuel brut (${t.common.mad})`}>
                <Input
                  id="ed-salaire"
                  name="salaire"
                  type="number"
                  min={0}
                  step={100}
                  defaultValue={employe.salaire}
                  className={inputClass}
                />
              </Field>
              <Field id="ed-conge-debut" label="Congé   début">
                <Input
                  id="ed-conge-debut"
                  name="congeDebut"
                  type="date"
                  defaultValue={employe.congeDebut}
                  className={inputClass}
                />
              </Field>
              <Field id="ed-conge-fin" label="Congé   fin">
                <Input
                  id="ed-conge-fin"
                  name="congeFin"
                  type="date"
                  defaultValue={employe.congeFin}
                  className={inputClass}
                />
              </Field>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="ed-adresse" className={labelClass}>
                  {t.common.address}
                </Label>
                <Input id="ed-adresse" name="adresse" defaultValue={employe.adresse} className={inputClass} />
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-3 border-t border-border pt-5">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded-full border border-[#001B3D]/15 bg-card px-5 py-2 text-sm font-medium text-foreground hover:bg-muted"
              >
                {t.common.cancel}
              </button>
              <button
                type="submit"
                className="rounded-full bg-[#6C4DF6] px-5 py-2 text-sm font-bold text-[#001B3D] shadow-[0_14px_30px_-14px_rgba(107,165,58,0.7)] transition hover:brightness-105"
              >
                {t.common.saveChanges}
              </button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddEmployeDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (employe: Employe) => void;
}) {
  const { t } = useDashboardI18n();
  const f = t.form;
  const [statut, setStatut] = useState<StatutEmploye>("actif");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(dialogSurface, "max-w-[560px]")}>
        <DialogDescription className="sr-only">Ajouter un nouvel employé à l'équipe</DialogDescription>
        <div className="flex min-h-0 flex-1 flex-col border-t-4 border-t-primary">
          <div className="shrink-0 border-b border-border px-6 pb-4 pt-6 pr-14">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Équipe</p>
            <DialogTitle className="mt-2 text-left font-display text-xl font-semibold tracking-tight text-foreground">
              Ajouter un employé
            </DialogTitle>
          </div>
          <form
            className="min-h-0 flex-1 space-y-4 overflow-y-auto scroll-touch px-6 py-5"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              onCreate({
                id: `e-${Date.now()}`,
                nomComplet: String(fd.get("nomComplet") || "Nouvel employé"),
                poste: String(fd.get("poste") || ""),
                departement: String(fd.get("departement") || ""),
                email: String(fd.get("email") || ""),
                emailPerso: "",
                tel: String(fd.get("tel") || ""),
                tel2: "",
                cin: String(fd.get("cin") || ""),
                dateNaissance: "",
                dateEmbauche: String(fd.get("dateEmbauche") || ""),
                adresse: "",
                contrat: String(fd.get("contrat") || "CDI"),
                salaire: Number(fd.get("salaire") || 0),
                congeDebut: "",
                congeFin: "",
                statut,
              });
              onOpenChange(false);
              setStatut("actif");
            }}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field id="ae-nom" label={f.fullName}>
                <Input id="ae-nom" name="nomComplet" required className={inputClass} />
              </Field>
              <Field id="ae-statut" label={t.common.status}>
                <Select value={statut} onValueChange={(v) => setStatut(v as StatutEmploye)}>
                  <SelectTrigger id="ae-statut" className={selectTriggerClass}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={softSelectContent}>
                    <SelectItem value="actif">{t.status.actif}</SelectItem>
                    <SelectItem value="inactif">{t.status.inactif}</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field id="ae-poste" label={t.common.position}>
                <Input id="ae-poste" name="poste" className={inputClass} placeholder="Ex. Professeur des écoles" />
              </Field>
              <Field id="ae-dept" label={t.common.department}>
                <Input id="ae-dept" name="departement" className={inputClass} placeholder="Ex. Pédagogie" />
              </Field>
              <Field id="ae-email" label={f.workEmail}>
                <Input id="ae-email" name="email" type="email" className={inputClass} />
              </Field>
              <Field id="ae-tel" label={f.phone1}>
                <Input id="ae-tel" name="tel" type="tel" className={inputClass} />
              </Field>
              <Field id="ae-cin" label={f.cinPassport}>
                <Input id="ae-cin" name="cin" className={inputClass} />
              </Field>
              <Field id="ae-embauche" label={f.hireDate}>
                <Input id="ae-embauche" name="dateEmbauche" className={inputClass} placeholder="JJ/MM/AAAA" />
              </Field>
              <Field id="ae-contrat" label={f.contractType}>
                <Input id="ae-contrat" name="contrat" defaultValue="CDI" className={inputClass} />
              </Field>
              <Field id="ae-salaire" label={`Salaire mensuel brut (${t.common.mad})`}>
                <Input
                  id="ae-salaire"
                  name="salaire"
                  type="number"
                  min={0}
                  step={100}
                  defaultValue={0}
                  className={inputClass}
                />
              </Field>
            </div>
            <div className="flex flex-wrap justify-end gap-3 border-t border-border pt-5">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded-full border border-[#001B3D]/15 bg-card px-5 py-2 text-sm font-medium text-foreground hover:bg-muted"
              >
                {t.common.cancel}
              </button>
              <button type="submit" className={cn(primaryPill, "px-5 py-2")}>
                Ajouter l'employé
              </button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Popup des dates de congé d'un employé. */
function CongeDialog({
  employe,
  open,
  onOpenChange,
}: {
  employe: Employe | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useDashboardI18n();

  if (!employe) return null;
  const st = congeState(employe);
  const tone = st === "aucun" ? null : CONGE_TONE[st];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(dialogSurface, "max-w-[460px]")}>
        <DialogDescription className="sr-only">Congés de {employe.nomComplet}</DialogDescription>
        <div className="border-t-4 border-t-[#FFB347]">
          <div className="flex items-start justify-between gap-3 border-b border-border px-6 pb-4 pt-6 pr-14">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Congés</p>
              <DialogTitle className="mt-2 text-left font-display text-xl font-semibold tracking-tight text-foreground">
                {employe.nomComplet}
              </DialogTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">{employe.poste}</p>
            </div>
            {tone ? (
              <span
                className={cn(
                  "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide",
                  tone.chip,
                )}
              >
                {tone.label}
              </span>
            ) : null}
          </div>

          <div className="px-6 py-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-muted/60 px-4 py-3">
                <p className={labelClass}>Date de début</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{formatDateFr(employe.congeDebut)}</p>
              </div>
              <div className="rounded-2xl bg-muted/60 px-4 py-3">
                <p className={labelClass}>Date de fin</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{formatDateFr(employe.congeFin)}</p>
              </div>
            </div>
            <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarDays className="h-4 w-4 shrink-0 text-[#B5760E]" />
              {joursConge(employe)} jour{joursConge(employe) > 1 ? "s" : ""} de congé
            </p>
          </div>

          <div className="flex justify-end border-t border-border px-6 py-4">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-full border border-[#001B3D]/15 bg-card px-5 py-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              {t.common.close}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DeleteEmployeDialog({
  employe,
  open,
  onOpenChange,
  onConfirm,
}: {
  employe: Employe | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  const { t } = useDashboardI18n();

  if (!employe) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(dialogSurface, "max-w-[440px]")}>
        <DialogDescription className="sr-only">Confirmer la suppression de {employe.nomComplet}</DialogDescription>
        <div className="border-t-4 border-t-[#FF666B]">
          <div className="border-b border-border px-6 pb-4 pt-6 pr-14">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Équipe</p>
            <DialogTitle className="mt-2 text-left font-display text-xl font-semibold tracking-tight text-foreground">
              Supprimer cet employé ?
            </DialogTitle>
          </div>
          <div className="px-6 py-5">
            <div className="flex items-start gap-3 rounded-2xl bg-[#FFE3E0]/50 px-4 py-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#D93A41]" />
              <p className="text-sm text-foreground">
                <span className="font-semibold">{employe.nomComplet}</span>   {employe.poste} sera retiré de la liste du
                personnel. Cette action est irréversible.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap justify-end gap-3 border-t border-border px-6 py-4">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-full border border-[#001B3D]/15 bg-card px-5 py-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              {t.common.cancel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="inline-flex items-center gap-2 rounded-full bg-[#FF666B] px-5 py-2 text-sm font-bold text-white shadow-[0_14px_30px_-14px_rgba(226,92,92,0.8)] transition hover:brightness-105"
            >
              <Trash2 className="h-4 w-4" />
              Supprimer
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AffichesPage() {
  const { t } = useDashboardI18n();
  const a = t.affiches;
  const queryClient = useQueryClient();
  const { data: employes = [], refetch: refetchEmployees } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const db = await listEmployees();
      return db.map(dbToEmploye);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...fields }: { id: string } & Partial<EmployeeInput>) =>
      updateEmployee({ data: { id, ...fields } }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["employees"] }); toast.success("Employé mis à jour"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const createMutation = useMutation({
    mutationFn: (input: EmployeeInput) => createEmployee({ data: input }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["employees"] }); toast.success("Employé ajouté"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteEmployee({ data: id }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["employees"] }); toast.success("Employé supprimé"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const importCsv = useMutation({
    mutationFn: (input: { csvText: string }) => importEmployeesCsv({ data: input }),
    onSuccess: (r) => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success(`${r.imported} employé(s) importé(s)${r.errors.length ? `, ${r.errors.length} erreur(s)` : ""}`);
      if (r.errors.length) r.errors.forEach((e) => toast.error(e));
      setPreviewRows(null);
    },
    onError: (err) => {
      console.error("CSV import error:", err);
      toast.error(err instanceof Error ? err.message : `Erreur import CSV${err ? ` : ${JSON.stringify(err)}` : ""}`);
      setPreviewRows(null);
    },
  });

  const fileRef = useRef<HTMLInputElement>(null);

  function handleExportCsv() {
    const cols = [
      "full_name", "position", "department", "email", "personal_email",
      "phone", "phone2", "cin", "birth_date", "hire_date", "address",
      "contract_type", "salary", "leave_start", "leave_end", "status",
    ];
    const esc = (v: unknown) => {
      const s = String(v ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = cols.join(",");
    const body = employes.map((e) =>
      cols.map((col) => {
        const val = (e as Record<string, unknown>)[
          col === "full_name" ? "nomComplet" :
          col === "position" ? "poste" :
          col === "department" ? "departement" :
          col === "personal_email" ? "emailPerso" :
          col === "phone" ? "tel" :
          col === "phone2" ? "tel2" :
          col === "birth_date" ? "dateNaissance" :
          col === "hire_date" ? "dateEmbauche" :
          col === "contract_type" ? "contrat" :
          col === "leave_start" ? "congeDebut" :
          col === "leave_end" ? "congeFin" :
          col
        ];
        return esc(val);
      }).join(",")
    ).join("\n");
    const csv = `${header}\n${body}`;
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "employes.csv";
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

  const [search, setSearch] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [congeId, setCongeId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return employes;
    return employes.filter(
      (e) =>
        e.nomComplet.toLowerCase().includes(q) ||
        e.poste.toLowerCase().includes(q) ||
        e.departement.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q),
    );
  }, [search, employes]);

  // 5 employés par page ; une nouvelle recherche renvoie en page 1.
  const pager = usePagination(filtered, search);

  const selected = detailId ? employes.find((e) => e.id === detailId) ?? null : null;
  const editing = editId ? employes.find((e) => e.id === editId) ?? null : null;
  const deleting = deleteId ? employes.find((e) => e.id === deleteId) ?? null : null;
  const conge = congeId ? employes.find((e) => e.id === congeId) ?? null : null;

  const validateWarnings = useMemo(() => {
    if (!previewRows || !previewHeaders.length) return [];
    const warnings: string[] = [];
    const h = previewHeaders.map((x) => x.toLowerCase());

    const nameCol = previewHeaders.find((x) =>
      ["full_name", "nom complet", "nom_complet", "nom"].includes(x.toLowerCase())
    );
    if (!nameCol) warnings.push("Colonne manquante : full_name / Nom complet");

    const recommended = [
      { label: "position / Poste", keys: ["position", "poste"] },
      { label: "email / Email", keys: ["email"] },
      { label: "phone / Téléphone", keys: ["phone", "telephone", "téléphone", "tel"] },
      { label: "cin / CIN", keys: ["cin"] },
      { label: "salary / Salaire", keys: ["salary", "salaire"] },
    ];
    recommended.forEach((r) => {
      if (!r.keys.some((k) => h.includes(k))) warnings.push(`Colonne conseillée manquante : ${r.label}`);
    });

    if (nameCol) {
      const missing = previewRows.filter((row) => !(row[nameCol] ?? "").trim()).length;
      if (missing) warnings.push(`${missing} ligne(s) sans nom complet`);
    }
    return warnings;
  }, [previewRows, previewHeaders]);

  return (
    <div className="space-y-8">
      <DetailEmployeDialog employe={selected} open={Boolean(selected)} onOpenChange={(o) => !o && setDetailId(null)} />
      <EditEmployeDialog
        employe={editing}
        open={Boolean(editing)}
        onOpenChange={(o) => !o && setEditId(null)}
        onSave={(next) => {
          updateMutation.mutate({ id: next.id, ...employeToInput(next) });
          setEditId(null);
        }}
      />
      <AddEmployeDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreate={(emp) => {
          createMutation.mutate(employeToInput(emp) as EmployeeInput);
          setAddOpen(false);
        }}
      />
      <DeleteEmployeDialog
        employe={deleting}
        open={Boolean(deleting)}
        onOpenChange={(o) => !o && setDeleteId(null)}
        onConfirm={() => { if (deleteId) { deleteMutation.mutate(deleteId); setDeleteId(null); } }}
      />
      <CongeDialog employe={conge} open={Boolean(conge)} onOpenChange={(o) => !o && setCongeId(null)} />

      <header className="relative space-y-4">
        <Sticker name="megaphone" tilt={-6} className="pointer-events-none absolute -top-2 right-0 hidden w-16 opacity-90 sm:block" />
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">{a.eyebrow}</p>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-hand text-4xl md:text-[3rem] leading-tight tracking-tight text-foreground">
              <span className="font-semibold">{a.titleBold}</span>{" "}
              <span className="font-normal italic text-muted-foreground">{a.titleItalic}</span>
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{a.subtitle}</p>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImportCsv(f); e.target.value = ""; }}
            />
            <button type="button" onClick={handleExportCsv} className={cn(ghostPill, "gap-1.5")} title="Exporter en CSV">
              <Download className="h-3.5 w-3.5" /> Exporter
            </button>
            <button type="button" onClick={() => fileRef.current?.click()} disabled={importCsv.isPending} className={cn(ghostPill, "gap-1.5 disabled:opacity-50")} title="Importer un CSV">
              {importCsv.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              Importer
            </button>
            <button type="button" onClick={() => setAddOpen(true)} className={cn(primaryPill, "w-full justify-center sm:w-auto sm:shrink-0")}>
              <Plus className="h-4 w-4" />
              Ajouter un employé
            </button>
          </div>
        </div>
      </header>

      <section className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="relative max-w-md flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={a.searchPlaceholder}
              className={cn(inputClass, "pl-9")}
              aria-label={a.searchAria}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {filtered.length === 1
            ? a.employeesCountOne
            : interpolate(a.employeesCountMany, { count: filtered.length })}
        </p>
      </section>

      <section className={cn(softCard, "overflow-hidden")}>
        <div className="border-b border-[#001B3D]/10 px-5 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{a.employeeList}</p>
        </div>
        {/* Mobile : liste de cartes */}
        <ul className="divide-y divide-border sm:hidden">
          {pager.pageItems.map((e) => {
            const st = congeState(e);
            const tone = st === "aucun" ? null : CONGE_TONE[st];
            return (
              <li key={e.id} className="px-4 py-3.5">
                <button
                  type="button"
                  onClick={() => { setDetailId(e.id); setEditId(null); }}
                  className="block w-full text-left"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 truncate text-sm font-semibold text-foreground">{e.nomComplet}</p>
                    <Badge variant={e.statut === "actif" ? "dark" : "neutral"}>
                      {e.statut === "actif" ? t.status.actif : t.status.inactif}
                    </Badge>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {[e.poste, e.departement].filter(Boolean).join(" · ") || " "}
                  </p>
                  <p className="mt-1 text-sm font-semibold tabular-nums text-foreground">
                    {formatSalaire(e.salaire)} <span className="text-xs font-normal text-muted-foreground">{t.common.mad}</span>
                  </p>
                </button>
                <div className="mt-2 flex items-center gap-1.5">
                  {tone ? (
                    <button
                      type="button"
                      onClick={() => setCongeId(e.id)}
                      aria-label={`Congés de ${e.nomComplet}`}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide transition hover:brightness-95",
                        tone.chip,
                      )}
                    >
                      <CalendarDays className="h-3 w-3" />
                      {tone.label}
                    </button>
                  ) : null}
                  <div className="ml-auto flex gap-1">
                    <button
                      type="button"
                      onClick={() => { setEditId(e.id); setDetailId(null); }}
                      className={iconButton}
                      aria-label={interpolate(a.editAria, { name: e.nomComplet })}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteId(e.id)}
                      className={cn(iconButton, "hover:border-[#FF666B]/40 hover:bg-[#FFE3E0] hover:text-[#D93A41]")}
                      aria-label={`Supprimer ${e.nomComplet}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="hidden overflow-x-auto scroll-touch sm:block">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-muted text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3">{a.table.name}</th>
                <th className="px-4 py-3">{a.table.position}</th>
                <th className="px-4 py-3">{a.table.department}</th>
                <th className="px-4 py-3">{a.table.contact}</th>
                <th className="px-4 py-3">Salaire</th>
                <th className="px-4 py-3">{a.table.status}</th>
                <th className="px-4 py-3 w-28">{a.table.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pager.pageItems.map((e) => (
                <tr
                  key={e.id}
                  onClick={() => {
                    setDetailId(e.id);
                    setEditId(null);
                  }}
                  className="cursor-pointer transition-colors hover:bg-[#6C4DF6]/10"
                >
                  <td className="px-4 py-3 font-medium text-foreground">{e.nomComplet}</td>
                  <td className="px-4 py-3 text-foreground/90">{e.poste}</td>
                  <td className="px-4 py-3 text-muted-foreground">{e.departement}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    <span className="block">{e.email}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">{e.tel}</span>
                  </td>
                  <td className="px-4 py-3 font-semibold tabular-nums text-foreground">
                    {formatSalaire(e.salaire)} <span className="text-xs font-normal text-muted-foreground">{t.common.mad}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant={e.statut === "actif" ? "dark" : "neutral"}>
                        {e.statut === "actif" ? t.status.actif : t.status.inactif}
                      </Badge>
                      {(() => {
                        const st = congeState(e);
                        if (st === "aucun") return null;
                        const tone = CONGE_TONE[st];
                        return (
                          <button
                            type="button"
                            onClick={(ev) => {
                              ev.stopPropagation();
                              setCongeId(e.id);
                            }}
                            aria-label={`Congés de ${e.nomComplet}`}
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide transition hover:brightness-95",
                              tone.chip,
                            )}
                          >
                            <CalendarDays className="h-3 w-3" />
                            {tone.label}
                          </button>
                        );
                      })()}
                    </div>
                  </td>
                  <td className="px-4 py-3" onClick={(ev) => ev.stopPropagation()}>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditId(e.id);
                          setDetailId(null);
                        }}
                        className={iconButton}
                        aria-label={interpolate(a.editAria, { name: e.nomComplet })}
                      >
                        <Pencil className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteId(e.id)}
                        className={cn(
                          iconButton,
                          "hover:border-[#FF666B]/40 hover:bg-[#FFE3E0] hover:text-[#D93A41]",
                        )}
                        aria-label={`Supprimer ${e.nomComplet}`}
                      >
                        <Trash2 className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <TablePagination
          page={pager.page}
          pageCount={pager.pageCount}
          total={pager.total}
          pageSize={pager.pageSize}
          onPage={pager.setPage}
          label={pager.total > 1 ? "employés" : "employé"}
        />
      </section>

      <Dialog open={!!previewRows} onOpenChange={(o) => !o && setPreviewRows(null)}>
        <DialogContent className="max-w-[90vw] max-h-[85vh] flex flex-col">
          <DialogTitle className="text-lg font-semibold">Aperçu des données CSV</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {previewRows ? `${previewRows.length} employé(s) détecté(s). Vérifiez les données avant de confirmer l'import.` : ""}
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
              {importCsv.isPending ? "Import en cours…" : `Importer ${previewRows?.length ?? 0} employé(s)`}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
