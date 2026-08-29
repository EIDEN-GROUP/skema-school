import { useMemo, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  softInput as inputClass,
  softSelectTrigger as selectTriggerClass,
  softSelectContent,
  labelClass,
} from "@/lib/dash-ui";
import { getSettings, listLevels } from "@/lib/server-settings";
import type { ChildFormData } from "@/components/add-client-wizard";

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

/**
 * Questions posées pour un élève (étape 5/6 de « Ajouter un client »).
 * Partagé par l'assistant de création et la modale « Ajouter un élève » de
 * « Modifier le client », pour que les deux écrans restent identiques.
 *
 * `idPrefix` distingue les ids/labels quand plusieurs élèves sont affichés.
 */
export function StudentFields({
  value,
  onChange,
  idPrefix = "student",
}: {
  value: ChildFormData;
  onChange: (patch: Partial<ChildFormData>) => void;
  idPrefix?: string;
}) {
  const { data: levels } = useQuery({ queryKey: ["levels"], queryFn: listLevels });
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: getSettings });
  const services: Array<{ name: string; price: number; enabled: boolean }> = settings?.services ?? [];
  const frais: Array<{ name: string; price: number; enabled: boolean }> = settings?.frais ?? [];

  const allCycles = useMemo(
    () => [...new Set((levels ?? []).map((l) => l.cycle).filter(Boolean))].sort(),
    [levels],
  );
  const levelsByCycle = useMemo(() => {
    const map: Record<string, NonNullable<typeof levels>> = {};
    for (const l of levels ?? []) {
      const c = l.cycle || "Sans cycle";
      if (!map[c]) map[c] = [];
      map[c].push(l);
    }
    return map;
  }, [levels]);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field id={`${idPrefix}-name`} label="Nom d'élève">
        <Input
          id={`${idPrefix}-name`}
          value={value.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Prénom et nom"
          className={inputClass}
        />
      </Field>
      <Field id={`${idPrefix}-dob`} label="Date de naissance">
        <Input
          id={`${idPrefix}-dob`}
          type="date"
          value={value.dob}
          onChange={(e) => onChange({ dob: e.target.value })}
          className={inputClass}
        />
      </Field>
      <Field id={`${idPrefix}-cycle`} label="Cycle">
        <Select value={value.cycle} onValueChange={(v) => onChange({ cycle: v, level: "" })}>
          <SelectTrigger id={`${idPrefix}-cycle`} className={selectTriggerClass}>
            <SelectValue placeholder="Choisir un cycle" />
          </SelectTrigger>
          <SelectContent className={softSelectContent}>
            {allCycles.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field id={`${idPrefix}-level`} label="Niveau">
        <Select
          value={value.level}
          onValueChange={(v) => onChange({ level: v })}
          disabled={!value.cycle}
        >
          <SelectTrigger id={`${idPrefix}-level`} className={selectTriggerClass}>
            <SelectValue placeholder={value.cycle ? "Choisir un niveau" : "Sélectionnez d'abord le cycle"} />
          </SelectTrigger>
          <SelectContent className={softSelectContent}>
            {(levelsByCycle[value.cycle] ?? []).map((lv) => (
              <SelectItem key={lv.id} value={lv.name}>
                {lv.name}   {lv.monthly_fee} MAD
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <div className="sm:col-span-2">
        <Label className={labelClass}>Services souscrits</Label>
        <div className="mt-2 flex flex-wrap gap-4">
          {services.filter((s) => s.enabled).map((s) => (
            <label key={s.name} className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={value.services.includes(s.name)}
                onChange={() =>
                  onChange({
                    services: value.services.includes(s.name)
                      ? value.services.filter((x) => x !== s.name)
                      : [...value.services, s.name],
                  })
                }
                className="h-4 w-4 rounded border-[#001B3D]/25 accent-[#17B3A6]"
              />
              {s.name}
            </label>
          ))}
        </div>
      </div>
      <div className="sm:col-span-2">
        <Label className={labelClass}>Frais supplémentaires</Label>
        <div className="mt-2 flex flex-wrap gap-4">
          {frais.filter((f) => f.enabled).map((f) => (
            <label key={f.name} className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={value.frais.includes(f.name)}
                onChange={() =>
                  onChange({
                    frais: value.frais.includes(f.name)
                      ? value.frais.filter((x) => x !== f.name)
                      : [...value.frais, f.name],
                  })
                }
                className="h-4 w-4 rounded border-[#001B3D]/25 accent-[#17B3A6]"
              />
              {f.name}   {f.price} MAD
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
