import { useMemo, useState, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  User,
  IdCard,
  Mail,
  Briefcase,
  BookOpen,
  Check,
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
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
import {
  softCard,
  softInput as inputClass,
  softSelectTrigger as selectTriggerClass,
  softSelectContent,
  dialogSurface,
  labelClass,
  primaryPill,
  ghostPill,
  eyebrowClass,
} from "@/lib/dash-ui";
import { createClient } from "@/lib/server-clients";
import { track, trackFirstOnce } from "@/lib/analytics";
import { getSettings, listLevels } from "@/lib/server-settings";
import { StudentFields } from "@/components/student-fields";
import { toast } from "sonner";

export type ChildFormData = {
  name: string;
  dob: string;
  cycle: string;
  level: string;
  services: string[];
  frais: string[];
};
export type WizardData = {
  step: number;
  father_name: string;
  mother_name: string;
  cin: string;
  cin_mother: string;
  email: string;
  email2: string;
  phone: string;
  phone2: string;
  address: string;
  children: ChildFormData[];
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

export function emptyChild(): ChildFormData {
  return { name: "", dob: "", cycle: "", level: "", services: [], frais: [] };
}

export function emptyWizard(): WizardData {
  return {
    step: 0,
    father_name: "",
    mother_name: "",
    cin: "",
    cin_mother: "",
    email: "",
    email2: "",
    phone: "",
    phone2: "",
    address: "",
    children: [emptyChild()],
  };
}

const STEP_LABELS = ["Parents", "Identité", "Contact", "Profil", "Élèves", "Récapitulatif"];

export function AddClientDialog({
  open,
  onOpenChange,
  wizard,
  updateWizard,
  setWizard,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  wizard: WizardData;
  updateWizard: (patch: Partial<WizardData>) => void;
  setWizard: (w: WizardData | ((prev: WizardData) => WizardData)) => void;
}) {
  const { t } = useDashboardI18n();
  const a = t.familles.addModal;
  const queryClient = useQueryClient();
  const { data: levels } = useQuery({ queryKey: ["levels"], queryFn: listLevels });
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: getSettings });
  const services: Array<{ name: string; price: number; enabled: boolean }> =
    settings?.services ?? [];
  const frais: Array<{ name: string; price: number; enabled: boolean }> = settings?.frais ?? [];
  const [busy, setBusy] = useState(false);
  // Applique (ou non) la réduction fratrie pour cette famille. Remplace l'ancien
  // interrupteur global des paramètres : la réduction se décide désormais par client,
  // au récapitulatif. Désactivée par défaut   c'est un choix explicite.
  const [reductionEnabled, setReductionEnabled] = useState(false);

  const step = wizard.step;
  const totalSteps = 6;
  const children = wizard.children;
  const fratrie = children.length;
  // Réduction fratrie : pourcentage configuré dans les paramètres. Elle s'applique
  // dès que l'utilisateur l'active au récapitulatif, quel que soit le nombre
  // d'élèves (un seul élève suffit).
  const discountPct = Number(settings?.sibling_discount?.value ?? 10);
  const remise = reductionEnabled ? discountPct : 0;

  const totalFromLevels = useMemo(() => {
    if (!levels) return 0;
    return children.reduce((sum, c) => {
      const lv = levels.find((l) => l.name === c.level);
      return sum + (lv?.monthly_fee ?? 0);
    }, 0);
  }, [children, levels]);

  const totalServices = useMemo(() => {
    return children.reduce((sum, c) => {
      return (
        sum +
        c.services.reduce((s, svcName) => {
          const svc = services.find((x) => x.name === svcName);
          return s + (svc?.price ?? 0);
        }, 0)
      );
    }, 0);
  }, [children, services]);

  const totalSelectedFrais = useMemo(() => {
    return children.reduce((sum, c) => {
      return (
        sum +
        (c.frais ?? []).reduce((s, name) => {
          const f = frais.find((x) => x.name === name);
          return s + (f?.price ?? 0);
        }, 0)
      );
    }, 0);
  }, [children, frais]);

  const totalMonthly = totalFromLevels + totalServices + totalSelectedFrais;

  const canNext = useMemo(() => {
    switch (step) {
      case 0:
        return wizard.father_name.trim() !== "" && wizard.mother_name.trim() !== "";
      case 1:
        return true;
      case 2:
        return true;
      case 3:
        return true;
      case 4:
        return children.length > 0 && children.every((c) => c.name.trim() !== "" && c.level !== "");
      case 5:
        return true;
      default:
        return false;
    }
  }, [step, wizard, children]);

  const submit = async () => {
    setBusy(true);
    const first = children[0] ?? { name: "", dob: "", cycle: "", level: "", services: [] };
    try {
      await createClient({
        data: {
          father_name: wizard.father_name,
          mother_name: wizard.mother_name,
          parent_name: `${wizard.father_name} / ${wizard.mother_name}`,
          cin: wizard.cin,
          cin_mother: wizard.cin_mother,
          email: wizard.email,
          email2: wizard.email2,
          phone: wizard.phone,
          phone2: wizard.phone2,
          address: wizard.address,
          child_name: first.name,
          dob: first.dob,
          level: first.level,
          child_names: children,
          monthly_fee: totalMonthly,
          fratrie,
          remise,
          subscribed_services: [],
          payment_day: 1,
        },
      });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      track("family_created", { source: "wizard", family_count: 1 });
      trackFirstOnce("family_created", "first_family_created", { source: "wizard" });
      if (children.length > 0) {
        track("student_created", { family_count: children.length });
        trackFirstOnce("student_created", "first_student_created");
      }
      track("onboarding_completed", { steps: totalSteps });
      toast.success("Famille créée");
      setWizard(emptyWizard());
      setReductionEnabled(false);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  };

  const prevStep = () => updateWizard({ step: step - 1 });
  const nextStep = () => {
    track("onboarding_step_completed", { step: STEP_LABELS[step] ?? String(step) });
    updateWizard({ step: step + 1 });
  };
  const addChild = () =>
    setWizard((prev) => ({ ...prev, children: [...prev.children, emptyChild()] }));
  const removeChild = (i: number) =>
    setWizard((prev) => ({ ...prev, children: prev.children.filter((_, idx) => idx !== i) }));
  const updChild = (i: number, patch: Partial<ChildFormData>) =>
    setWizard((prev) => ({
      ...prev,
      children: prev.children.map((c, idx) => (idx === i ? { ...c, ...patch } : c)),
    }));

  const enabledFrais = frais.filter((f) => f.enabled);

  const steps = [
    <div key="step0" className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field id="w-father" label="Prénom et nom du père">
        <Input
          id="w-father"
          value={wizard.father_name}
          onChange={(e) => updateWizard({ father_name: e.target.value })}
          placeholder="ex. Ahmed Benali"
          className={inputClass}
        />
      </Field>
      <Field id="w-mother" label="Prénom et nom de la mère">
        <Input
          id="w-mother"
          value={wizard.mother_name}
          onChange={(e) => updateWizard({ mother_name: e.target.value })}
          placeholder="ex. Fatima Benali"
          className={inputClass}
        />
      </Field>
    </div>,

    <div key="step1" className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field id="w-cin" label="CIN ou passeport du père">
        <Input
          id="w-cin"
          value={wizard.cin}
          onChange={(e) => updateWizard({ cin: e.target.value })}
          placeholder="ex. AB123456"
          className={inputClass}
        />
      </Field>
      <Field id="w-cin-mother" label="CIN ou passeport de la mère">
        <Input
          id="w-cin-mother"
          value={wizard.cin_mother}
          onChange={(e) => updateWizard({ cin_mother: e.target.value })}
          placeholder="ex. CD789012"
          className={inputClass}
        />
      </Field>
    </div>,

    <div key="step2" className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field id="w-email" label="Email du père">
        <Input
          id="w-email"
          type="email"
          value={wizard.email}
          onChange={(e) => updateWizard({ email: e.target.value })}
          className={inputClass}
        />
      </Field>
      <Field id="w-email2" label="Email de la mère">
        <Input
          id="w-email2"
          type="email"
          value={wizard.email2}
          onChange={(e) => updateWizard({ email2: e.target.value })}
          className={inputClass}
        />
      </Field>
      <Field id="w-phone" label="Téléphone 1">
        <Input
          id="w-phone"
          type="tel"
          value={wizard.phone}
          onChange={(e) => updateWizard({ phone: e.target.value })}
          className={inputClass}
        />
      </Field>
      <Field id="w-phone2" label="Téléphone 2">
        <Input
          id="w-phone2"
          type="tel"
          value={wizard.phone2}
          onChange={(e) => updateWizard({ phone2: e.target.value })}
          className={inputClass}
        />
      </Field>
    </div>,

    <div key="step3" className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Field id="w-address" label="Adresse">
          <Input
            id="w-address"
            value={wizard.address}
            onChange={(e) => updateWizard({ address: e.target.value })}
            placeholder="ex. 12 Rue de la Liberté, Casablanca"
            className={inputClass}
          />
        </Field>
      </div>
    </div>,

    <div key="step4" className="space-y-6">
      {children.map((child, i) => (
        <div key={i} className={cn(softCard, "relative p-4")}>
          {children.length > 1 ? (
            <button
              type="button"
              onClick={() => removeChild(i)}
              className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full text-muted-foreground transition hover:bg-[#FF666B]/10 hover:text-[#FF666B]"
              aria-label={`Supprimer ${child.name || `l'élève ${i + 1}`}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          ) : null}
          <p className={cn(eyebrowClass, "mb-4")}>Élève {i + 1}</p>
          <StudentFields
            value={child}
            onChange={(patch) => updChild(i, patch)}
            idPrefix={`c-${i}`}
          />
        </div>
      ))}
      <button
        type="button"
        onClick={addChild}
        className={cn(ghostPill, "w-full justify-center gap-2")}
      >
        <Plus className="h-4 w-4" /> Ajouter un élève
      </button>
    </div>,

    <div key="step5" className="space-y-4">
      <div className={cn(softCard, "divide-y divide-[#001B3D]/8 p-4")}>
        <div className="pb-3">
          <p className={eyebrowClass}>Parents</p>
          <p className="mt-1 text-sm text-foreground">
            {wizard.father_name} / {wizard.mother_name}
          </p>
        </div>
        <div className="py-3">
          <p className={eyebrowClass}>Contact</p>
          <p className="mt-1 text-sm text-foreground">
            {wizard.email || " "} · {wizard.phone || " "}
          </p>
        </div>
        <div className="py-3">
          <p className={eyebrowClass}>Adresse</p>
          <p className="mt-1 text-sm text-foreground">{wizard.address || " "}</p>
        </div>
        <div className="py-3">
          <p className={eyebrowClass}>Élèves inscrits ({children.length})</p>
          <ul className="mt-1 space-y-1">
            {children.map((c, i) => (
              <li key={i} className="text-sm text-foreground">
                {c.name} {c.level || "Niveau non défini"}
              </li>
            ))}
          </ul>
        </div>
        <div className="pt-3">
          <p className={eyebrowClass}>Détail des frais mensuels</p>
          <div className="mt-1 space-y-1">
            {children.map((c, i) => {
              const lv = levels?.find((l) => l.name === c.level);
              return lv ? (
                <p key={i} className="text-sm text-muted-foreground">
                  {c.name} ({lv.name}) : {lv.monthly_fee} MAD
                </p>
              ) : null;
            })}
            {children.map((c, i) => {
              const hasSvc = c.services.length > 0;
              const hasFrais = (c.frais ?? []).length > 0;
              if (!hasSvc && !hasFrais) return null;
              return (
                <div key={`extras-${i}`} className="ml-4 space-y-0.5">
                  {c.services.map((svcName) => {
                    const svc = services.find((s) => s.name === svcName);
                    return svc ? (
                      <p key={svcName} className="text-xs text-muted-foreground">
                        ↳ {c.name} {svc.name} : +{svc.price} MAD
                      </p>
                    ) : null;
                  })}
                  {(c.frais ?? []).map((fName) => {
                    const f = frais.find((x) => x.name === fName);
                    return f ? (
                      <p key={fName} className="text-xs text-muted-foreground">
                        ↳ {c.name} {f.name} : +{f.price} MAD
                      </p>
                    ) : null;
                  })}
                </div>
              );
            })}
          </div>

          <div className="mt-3 border-t border-[#001B3D]/8 pt-3">
            <p className="mt-1 font-display text-xl font-semibold text-foreground">
              Total : {totalMonthly} MAD
            </p>
            {remise > 0 ? (
              <p className="text-xs text-muted-foreground">
                Réduction fratrie ({fratrie} élève{fratrie > 1 ? "s" : ""}) : -{remise} %
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className={cn(softCard, "p-4")}>
        <label className="flex items-center gap-2.5 text-sm font-medium text-foreground">
          <input
            type="checkbox"
            checked={reductionEnabled}
            onChange={(e) => setReductionEnabled(e.target.checked)}
            className="h-4 w-4 rounded border-[#001B3D]/25 accent-[#17B3A6]"
          />
          Activer la réduction fratrie
        </label>
        <p className="mt-2 text-xs text-muted-foreground">
          {reductionEnabled
            ? `Réduction appliquée : -${discountPct} % (applicable même pour un seul élève).`
            : "La réduction fratrie ne sera pas appliquée."}
        </p>
      </div>
    </div>,
  ];

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onOpenChange(false);
      }}
    >
      <DialogContent className={cn(dialogSurface, "w-[min(100vw-1.5rem,640px)] max-w-[640px]")}>
        <DialogDescription className="sr-only">{a.srDesc}</DialogDescription>
        <div className="flex min-h-0 flex-1 flex-col border-t-4 border-t-[#6C4DF6]">
          <div className="shrink-0 border-b border-[#001B3D]/10 px-6 pb-4 pt-6 pr-14">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {a.eyebrow}
            </p>
            <DialogTitle className="mt-2 text-left font-display text-xl font-semibold text-foreground">
              {a.title}
            </DialogTitle>
            <div className="mt-3 flex items-center gap-2">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-1 flex-1 rounded-full transition-colors duration-300",
                    i <= step ? "bg-[#6C4DF6]" : "bg-[#001B3D]/10",
                  )}
                />
              ))}
            </div>
            <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Étape {step + 1} / {totalSteps} {STEP_LABELS[step]}
            </p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto scroll-touch px-6 py-5">{steps[step]}</div>
          <div className="flex shrink-0 items-center justify-between gap-3 border-t border-[#001B3D]/10 px-6 py-4">
            <div>
              {step > 0 ? (
                <button type="button" onClick={prevStep} className={cn(ghostPill, "gap-2")}>
                  <ChevronLeft className="h-4 w-4" /> Précédent
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setWizard(emptyWizard());
                    onOpenChange(false);
                  }}
                  className="rounded-full border border-[#001B3D]/15 bg-card px-5 py-2 text-sm font-medium text-foreground hover:bg-muted"
                >
                  {t.common.cancel}
                </button>
              )}
            </div>
            {step < totalSteps - 1 ? (
              <button
                type="button"
                onClick={nextStep}
                disabled={!canNext}
                className={cn(primaryPill, "gap-2 disabled:opacity-50")}
              >
                Suivant <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={submit}
                disabled={busy}
                className={cn(primaryPill, "gap-2 disabled:opacity-60")}
              >
                {busy ? "..." : a.submit} {!busy ? <Check className="h-4 w-4" /> : null}
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
