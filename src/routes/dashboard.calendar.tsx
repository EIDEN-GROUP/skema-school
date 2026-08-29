import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Sticker } from "@/components/skema/bits";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  AlertCircle,
  Trash2,
  Star,
  Sun,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { softInput as inputClass, dialogSurface, labelClass } from "@/lib/dash-ui";
import { listPlanifications, createPlanification, type PlanificationInput } from "@/lib/server-planifications";
import {
  listHolidays,
  createHoliday,
  deleteHoliday,
  listSchoolVacations,
  createSchoolVacation,
  deleteSchoolVacation,
  syncPublicHolidays,
  type Holiday,
  type SchoolVacation,
} from "@/lib/server-holidays-vacations";
import { toast } from "sonner";

type PlanifTone = "violet" | "emerald" | "amber" | "zinc";

type Planif = {
  id: string;
  date: string;
  time: string;
  title: string;
  detail: string;
  tone: PlanifTone;
};

export const Route = createFileRoute("/dashboard/calendar")({
  head: () => ({ meta: [{ title: "Calendrier   CRM" }] }),
  component: CrmCalendrier,
});

const MOIS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

const JOURS_FR = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function isoKey(y: number, m: number, d: number) {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

function fmtIso(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MOIS_FR[m - 1].toLowerCase()} ${y}`;
}

type Cell = {
  day: number;
  iso: string;
  isOutside: boolean;
  isToday: boolean;
};

function EventChip({
  title,
  kind,
  accent,
  dot,
}: {
  title: string;
  kind: string;
  accent: string;
  dot: string;
}) {
  return (
    <div
      className={cn(
        "w-full overflow-hidden rounded-[4px] border border-[#001B3D]/10 border-l-[3px] bg-card px-2 py-1 shadow-[0_1px_2px_rgba(40,57,108,0.06)]",
        accent,
      )}
    >
      <p className="truncate text-[11px] font-semibold leading-tight text-foreground">{title}</p>
      <p className="mt-0.5 flex items-center gap-1 text-[10px] leading-tight text-muted-foreground">
        <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dot)} aria-hidden />
        <span className="truncate">{kind}</span>
      </p>
    </div>
  );
}

function toneColor(tone: string) {
  return tone === "violet" ? "border-l-[#6C4DF6]" : tone === "emerald" ? "border-l-[#17B3A6]" : tone === "amber" ? "border-l-[#FFB347]" : "border-l-[#4B5563]";
}

function dotColor(tone: string) {
  return tone === "violet" ? "bg-[#6C4DF6]" : tone === "emerald" ? "bg-[#17B3A6]" : tone === "amber" ? "bg-[#FFB347]" : "bg-[#4B5563]";
}

function vacLabelForIso(iso: string, vacs: SchoolVacation[]): string | null {
  for (const v of vacs) {
    if (iso >= v.start_date && iso <= v.end_date) return v.label;
  }
  return null;
}

function CrmCalendrier() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [openIso, setOpenIso] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: planifications = [] } = useQuery({
    queryKey: ["planifications"],
    queryFn: () => listPlanifications() as Promise<Planif[]>,
  });

  const { data: holidays = [] } = useQuery({
    queryKey: ["holidays"],
    queryFn: () => listHolidays(),
  });

  const { data: schoolVacations = [] } = useQuery({
    queryKey: ["school-vacations"],
    queryFn: () => listSchoolVacations(),
  });

  const planifsByDate = useMemo(() => {
    const map: Record<string, Planif[]> = {};
    for (const p of planifications) {
      if (!map[p.date]) map[p.date] = [];
      map[p.date].push(p);
    }
    return map;
  }, [planifications]);

  const holidaysByDate = useMemo(() => {
    const map: Record<string, Holiday> = {};
    for (const h of holidays) map[h.date] = h;
    return map;
  }, [holidays]);

  const forceRefetch = () => {
    queryClient.refetchQueries({ queryKey: ["planifications"] });
    queryClient.refetchQueries({ queryKey: ["holidays"] });
    queryClient.refetchQueries({ queryKey: ["school-vacations"] });
  };

  const handleMutError = (err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    toast.error(`Erreur: ${msg}`);
  };

  const createPlanifMutation = useMutation({
    mutationFn: (input: { data: PlanificationInput }) => createPlanification(input),
    onSuccess: () => { forceRefetch(); toast.success("Planification ajoutée"); },
    onError: handleMutError,
  });

  const createHolidayMutation = useMutation({
    mutationFn: (input: { data: { date: string; label: string } }) => createHoliday(input),
    onSuccess: () => { forceRefetch(); toast.success("Jour férié ajouté"); },
    onError: handleMutError,
  });

  const deleteHolidayMutation = useMutation({
    mutationFn: (id: string) => deleteHoliday({ data: id }),
    onSuccess: () => { forceRefetch(); toast.success("Jour férié supprimé"); },
    onError: handleMutError,
  });

  const syncMutation = useMutation({
    mutationFn: () => syncPublicHolidays({ data: [new Date().getFullYear(), new Date().getFullYear() + 1] }),
    onSuccess: (result) => { forceRefetch(); toast.success(`${result.added} jour(s) férié(s) synchronisé(s)`); },
    onError: handleMutError,
  });

  const createVacationMutation = useMutation({
    mutationFn: (input: { data: { start_date: string; end_date: string; label: string } }) => createSchoolVacation(input),
    onSuccess: () => { forceRefetch(); toast.success("Vacance ajoutée"); },
    onError: handleMutError,
  });

  const deleteVacationMutation = useMutation({
    mutationFn: (id: string) => deleteSchoolVacation({ data: id }),
    onSuccess: () => { forceRefetch(); toast.success("Vacance supprimée"); },
    onError: handleMutError,
  });

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  };
  const goToday = () => {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
  };

  const cells = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const offset = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const make = (dt: Date, isOutside: boolean): Cell => {
      const y = dt.getFullYear();
      const m = dt.getMonth();
      const d = dt.getDate();
      return {
        day: d,
        iso: isoKey(y, m, d),
        isOutside,
        isToday: d === today.getDate() && m === today.getMonth() && y === today.getFullYear(),
      };
    };

    const list: Cell[] = [];
    for (let i = offset; i > 0; i--) list.push(make(new Date(year, month, 1 - i), true));
    for (let d = 1; d <= daysInMonth; d++) list.push(make(new Date(year, month, d), false));
    let tail = 1;
    while (list.length % 7 !== 0) list.push(make(new Date(year, month + 1, tail++), true));
    return list;
  }, [year, month]);

  const planifsDuMois = cells
    .filter((c) => !c.isOutside && planifsByDate[c.iso])
    .flatMap((c) => (planifsByDate[c.iso] ?? []).map((p) => ({ ...p, day: c.day })));

  const holidaysDuMois = cells.filter((c) => !c.isOutside && holidaysByDate[c.iso]);

  return (
    <div className="space-y-6 sm:space-y-8">
      <header className="relative">
        <Sticker name="calendarPin" tilt={-6} className="pointer-events-none absolute -top-4 right-0 hidden w-16 opacity-90 sm:block" />
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Calendrier
        </p>
        <h1 className="font-hand mt-2 text-4xl text-foreground md:text-5xl">
          <span className="font-semibold">Calendrier</span>
        </h1>
      </header>
      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-2 rounded-full bg-[#17B3A6]/15 px-3 py-1.5 text-xs font-semibold text-[#0E6B62]">
          <span className="h-2.5 w-2.5 rounded-full bg-[#17B3A6]" /> Jour férié ({holidays.length})
          <button
            type="button"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            className="ml-1 grid h-5 w-5 place-items-center rounded-full bg-[#17B3A6]/20 text-[#0E6B62] transition hover:bg-[#17B3A6]/40 disabled:opacity-50"
            title="Synchroniser les jours fériés marocains"
          >
            <RefreshCw className={cn("h-3 w-3", syncMutation.isPending && "animate-spin")} />
          </button>
        </span>
        <span className="inline-flex items-center gap-2 rounded-full bg-[#FFB347]/40 px-3 py-1.5 text-xs font-semibold text-[#B5760E]">
          <span className="h-2.5 w-2.5 rounded-full bg-[#FFB347]" /> Vacances ({schoolVacations.length})
        </span>
        <span className="inline-flex items-center gap-2 rounded-full bg-[#001B3D]/10 px-3 py-1.5 text-xs font-semibold text-[#001B3D]">
          <span className="h-2.5 w-2.5 rounded-full bg-[#6C4DF6]" /> Planification ({planifications.length})
        </span>
        <span className="ml-auto hidden items-center gap-1.5 text-xs text-muted-foreground sm:inline-flex">
          <AlertCircle className="h-3.5 w-3.5" />
          Cliquez sur un jour
        </span>
      </div>

      <div className="space-y-4">
        <div className="paper min-w-0 rounded-[22px] border border-nuit/8 p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={prevMonth}
                  aria-label="Mois précédent"
                  className="grid h-9 w-9 place-items-center rounded-full border border-[#001B3D]/15 text-[#001B3D] transition hover:bg-[#6C4DF6]/20"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={nextMonth}
                  aria-label="Mois suivant"
                  className="grid h-9 w-9 place-items-center rounded-full border border-[#001B3D]/15 text-[#001B3D] transition hover:bg-[#6C4DF6]/20"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <h2 className="font-display text-xl font-semibold text-foreground sm:text-2xl">
                {MOIS_FR[month]} <span className="font-normal text-muted-foreground">{year}</span>
              </h2>
            </div>

            <button
              type="button"
              onClick={goToday}
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[#001B3D] px-5 py-2.5 text-sm font-medium text-white shadow-[0_14px_30px_-14px_rgba(40,57,108,0.6)] transition hover:bg-[#00142E]"
            >
              <CalendarDays className="h-4 w-4" />
              Aujourd'hui
            </button>
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border border-[#001B3D]/10">
            <div className="grid grid-cols-7 border-b border-[#001B3D]/10 bg-muted/40">
              {JOURS_FR.map((j) => (
                <div
                  key={j}
                  className="py-2.5 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:text-[11px]"
                >
                  {j}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-px bg-[#001B3D]/[0.07]">
              {cells.map((c) => {
                const plans = planifsByDate[c.iso];
                const hol = holidaysByDate[c.iso];
                const vac = vacLabelForIso(c.iso, schoolVacations);
                return (
                  <button
                    key={c.iso}
                    type="button"
                    onClick={() => setOpenIso(c.iso)}
                    aria-label={`${c.day} ${MOIS_FR[month]} ${year}`}
                    className={cn(
                      "group relative flex min-h-[4.5rem] flex-col items-stretch gap-1 p-1.5 text-left transition sm:min-h-[7.5rem] sm:p-2",
                      "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#001B3D]",
                      c.isOutside ? "bg-card opacity-40" : "bg-card hover:bg-muted/40",
                      c.isToday && "bg-[#001B3D]/[0.04]",
                    )}
                  >
                    <span
                      className={cn(
                        "grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-semibold tabular-nums",
                        c.isToday
                          ? "bg-[#001B3D] text-white"
                          : c.isOutside
                            ? "text-muted-foreground/50"
                            : "text-foreground/80",
                      )}
                    >
                      {c.day}
                    </span>

                    <div className="hidden flex-col gap-1 sm:flex">
                      {hol && (
                        <EventChip
                          title={hol.label}
                          kind="Jour férié"
                          accent="border-l-[#17B3A6]"
                          dot="bg-[#17B3A6]"
                        />
                      )}
                      {vac && !hol && (
                        <EventChip
                          title={vac}
                          kind="Vacances"
                          accent="border-l-[#FFB347]"
                          dot="bg-[#FFB347]"
                        />
                      )}
                      {plans?.map((p) => (
                        <EventChip
                          key={p.id}
                          title={p.title}
                          kind={p.time.slice(0, 5)}
                          accent={toneColor(p.tone)}
                          dot={dotColor(p.tone)}
                        />
                      ))}
                    </div>

                    {(hol || vac || plans?.length) && (
                      <span
                        className={cn(
                          "absolute bottom-1.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full sm:hidden",
                          hol ? "bg-[#17B3A6]" : vac ? "bg-[#FFB347]" : "bg-[#6C4DF6]",
                        )}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {(holidaysDuMois.length > 0 ||
            planifsDuMois.length > 0) && (
            <div className="mt-5 space-y-2 border-t border-[#001B3D]/10 pt-4">
              {holidaysDuMois.map((c) => (
                <p key={`h-${c.day}`} className="flex items-center gap-2 text-sm text-foreground">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#17B3A6]/30 text-[10px] font-bold text-[#0E6B62]">
                    {c.day}
                  </span>
                  <span className="font-medium">{holidaysByDate[c.iso].label}</span>
                  <span className="text-xs text-muted-foreground">jour férié</span>
                  <button
                    type="button"
                    onClick={() => deleteHolidayMutation.mutate(holidaysByDate[c.iso].id)}
                    className="ml-auto grid h-7 w-7 place-items-center rounded-full text-muted-foreground transition hover:bg-[#17B3A6]/20 hover:text-[#0E6B62]"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </p>
              ))}
              {planifsDuMois.map((p) => (
                <p key={p.id} className="flex items-center gap-2 text-sm text-foreground">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#001B3D]/10 text-[10px] font-bold text-[#001B3D]">
                    {p.day}
                  </span>
                  <span className="font-medium">{p.title}</span>
                  <span className="text-xs text-muted-foreground">{p.time.slice(0, 5)}</span>
                </p>
              ))}
            </div>
          )}
        </div>
      </div>

      <DayDetailModal
        iso={openIso}
        holiday={openIso ? (holidaysByDate[openIso] ?? null) : null}
        vacLabel={openIso ? vacLabelForIso(openIso, schoolVacations) : null}
        planifs={openIso ? (planifsByDate[openIso] ?? []) : []}
        onClose={() => setOpenIso(null)}
        onSavePlanification={(input) => {
          if (openIso) createPlanifMutation.mutate({ data: { ...input, date: openIso } });
        }}
        onSaveHoliday={(label) => {
          if (openIso) createHolidayMutation.mutate({ data: { date: openIso, label } });
        }}
        onDeleteHoliday={(id) => deleteHolidayMutation.mutate(id)}
        onSaveVacation={(input) => {
          if (openIso) createVacationMutation.mutate({ data: { start_date: openIso, ...input } });
        }}
        onDeleteVacation={(id) => deleteVacationMutation.mutate(id)}
      />
    </div>
  );
}

type DayMode = "holiday" | "vacation" | "planification";

function DayDetailModal({
  iso,
  holiday,
  vacLabel,
  planifs,
  onClose,
  onSavePlanification,
  onSaveHoliday,
  onDeleteHoliday,
  onSaveVacation,
  onDeleteVacation,
}: {
  iso: string | null;
  holiday: Holiday | null;
  vacLabel: string | null;
  planifs: Planif[];
  onClose: () => void;
  onSavePlanification: (input: Omit<PlanificationInput, "date">) => void;
  onSaveHoliday: (label: string) => void;
  onDeleteHoliday: (id: string) => void;
  onSaveVacation: (input: { end_date: string; label: string }) => void;
  onDeleteVacation: (id: string) => void;
}) {
  const [mode, setMode] = useState<DayMode>("holiday");
  const [hLabel, setHlabel] = useState("");
  const [vEnd, setVend] = useState("");
  const [vLabel, setVlabel] = useState("");
  const [pTitle, setPtitle] = useState("");
  const [pTime, setPtime] = useState("09:00");
  const [pDetail, setPdetail] = useState("");
  const [pTone, setPtone] = useState<PlanifTone>("violet");

  const isToday =
    iso !== null &&
    (() => {
      const d = new Date();
      const [y, m, day] = iso.split("-").map(Number);
      return d.getFullYear() === y && d.getMonth() + 1 === m && d.getDate() === day;
    })();

  const [loadedIso, setLoadedIso] = useState<string | null>(null);
  if (iso !== loadedIso) {
    setLoadedIso(iso);
    setHlabel("");
    setVend(iso ?? "");
    setVlabel("");
    setPtitle("");
    setPtime("09:00");
    setPdetail("");
    setPtone("violet");
    if (holiday) setMode("holiday");
    else if (vacLabel) setMode("vacation");
    else if (planifs.length > 0) setMode("planification");
    else setMode("holiday");
  }

  const tabs: { key: DayMode; label: string }[] = [
    { key: "holiday", label: "Jour férié" },
    { key: "vacation", label: "Vacances" },
    { key: "planification", label: "Planification" },
  ];

  return (
    <Dialog open={iso !== null} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className={cn(dialogSurface, "max-w-[500px]")}>
        <DialogDescription className="sr-only">
          Détail d'une journée du calendrier.
        </DialogDescription>

        <div className="border-t-4 border-t-[#001B3D]">
          <div className="px-6 pb-2 pt-5">
            <DialogTitle className="font-display text-xl font-semibold text-foreground">
              {iso ? fmtIso(iso) : ""}
            </DialogTitle>
            {isToday && (
              <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-[#001B3D]/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#001B3D]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#001B3D]" />
                Aujourd&rsquo;hui
              </span>
            )}
          </div>

          {(holiday || vacLabel || planifs.length > 0) && (
            <div className="space-y-2 border-t border-[#001B3D]/10 px-6 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                Événements
              </p>
              {holiday && (
                <div className="flex items-center gap-2 rounded-xl border border-[#17B3A6]/30 bg-[#17B3A6]/10 px-3 py-2">
                  <Star className="h-4 w-4 shrink-0 text-[#17B3A6]" />
                  <span className="text-sm font-medium text-foreground">{holiday.label}</span>
                  <span className="ml-auto text-xs text-muted-foreground">jour férié</span>
                  <button
                    type="button"
                    onClick={() => onDeleteHoliday(holiday.id)}
                    className="grid h-7 w-7 place-items-center rounded-full text-muted-foreground transition hover:bg-[#17B3A6]/20 hover:text-[#0E6B62]"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
              {vacLabel && (
                <div className="flex items-center gap-2 rounded-xl border border-[#FFB347]/50 bg-[#FFB347]/20 px-3 py-2">
                  <Sun className="h-4 w-4 shrink-0 text-[#FFB347]" />
                  <span className="text-sm font-medium text-foreground">{vacLabel}</span>
                  <span className="ml-auto text-xs text-muted-foreground">vacances</span>
                </div>
              )}
              {planifs.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-2 rounded-xl border border-[#001B3D]/10 bg-card px-3 py-2 shadow-sm"
                >
                  <div className={cn("h-2 w-2 shrink-0 rounded-full", dotColor(p.tone))} />
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-foreground">{p.title}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{p.time.slice(0, 5)}</span>
                  </div>
                  {p.detail && (
                    <span className="ml-auto truncate text-xs text-muted-foreground">{p.detail}</span>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="border-t border-[#001B3D]/10 px-6 py-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setMode(t.key)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium transition",
                    mode === t.key ? "bg-[#001B3D] text-white" : "bg-muted text-muted-foreground hover:bg-muted/80",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {mode === "holiday" && (
              <form
                className="mt-3 space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  const clean = hLabel.trim();
                  if (!clean) return;
                  onSaveHoliday(clean);
                  setHlabel("");
                }}
              >
                <div className="space-y-1">
                  <Label htmlFor="modal-h-label" className={labelClass}>Nom du jour férié</Label>
                  <Input
                    id="modal-h-label"
                    value={hLabel}
                    onChange={(e) => setHlabel(e.target.value)}
                    placeholder="Ex. : Fête du Trône"
                    className={inputClass}
                    autoFocus={mode === "holiday"}
                  />
                </div>
                <button
                  type="submit"
                  disabled={!hLabel.trim()}
                  className="rounded-full bg-[#17B3A6] px-4 py-1.5 text-sm font-medium text-white transition hover:bg-[#0E9C90] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Ajouter le jour férié
                </button>
              </form>
            )}

            {mode === "vacation" && (
              <form
                className="mt-3 space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  const cleanLabel = vLabel.trim();
                  if (!cleanLabel || !vEnd) return;
                  onSaveVacation({ end_date: vEnd, label: cleanLabel });
                  setVlabel("");
                  setVend("");
                }}
              >
                <div className="space-y-1">
                  <Label htmlFor="modal-v-end" className={labelClass}>Date de fin</Label>
                  <Input
                    id="modal-v-end"
                    type="date"
                    value={vEnd}
                    onChange={(e) => setVend(e.target.value)}
                    className={inputClass}
                    autoFocus={mode === "vacation"}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="modal-v-label" className={labelClass}>Nom</Label>
                  <Input
                    id="modal-v-label"
                    value={vLabel}
                    onChange={(e) => setVlabel(e.target.value)}
                    placeholder="Ex. : Vacances d'été"
                    className={inputClass}
                  />
                </div>
                <button
                  type="submit"
                  disabled={!vLabel.trim() || !vEnd}
                  className="rounded-full bg-[#FFB347] px-4 py-1.5 text-sm font-medium text-[#B5760E] transition hover:bg-[#FFCB7A] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Ajouter la vacance
                </button>
              </form>
            )}

            {mode === "planification" && (
              <form
                className="mt-3 space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  const cleanTitle = pTitle.trim();
                  if (!cleanTitle || !pTime) return;
                  onSavePlanification({
                    title: cleanTitle,
                    time: `${pTime}:00`,
                    detail: pDetail.trim() || "",
                    tone: pTone,
                  });
                  setPtitle("");
                  setPtime("09:00");
                  setPdetail("");
                  setPtone("violet");
                }}
              >
                <div className="space-y-1">
                  <Label htmlFor="modal-p-title" className={labelClass}>Titre</Label>
                  <Input
                    id="modal-p-title"
                    value={pTitle}
                    onChange={(e) => setPtitle(e.target.value)}
                    placeholder="Ex. : Réunion parents"
                    className={inputClass}
                    autoFocus={mode === "planification"}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="modal-p-time" className={labelClass}>Horaire</Label>
                  <Input
                    id="modal-p-time"
                    type="time"
                    value={pTime}
                    onChange={(e) => setPtime(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="modal-p-detail" className={labelClass}>
                    Détail <span className="text-muted-foreground/60">(optionnel)</span>
                  </Label>
                  <Input
                    id="modal-p-detail"
                    value={pDetail}
                    onChange={(e) => setPdetail(e.target.value)}
                    placeholder="Ex. : Salle A"
                    className={inputClass}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="modal-p-tone" className={labelClass}>Couleur</Label>
                  <select
                    id="modal-p-tone"
                    value={pTone}
                    onChange={(e) => setPtone(e.target.value as PlanifTone)}
                    className={cn(inputClass, "appearance-none")}
                  >
                    <option value="violet">Violet</option>
                    <option value="emerald">Émeraude</option>
                    <option value="amber">Ambre</option>
                    <option value="zinc">Zinc</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={!pTitle.trim() || !pTime}
                  className="rounded-full bg-[#6C4DF6] px-4 py-1.5 text-sm font-medium text-white transition hover:bg-[#6C4DF6] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Ajouter la planification
                </button>
              </form>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end border-t border-[#001B3D]/10 px-6 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-4 py-1.5 text-sm font-medium text-muted-foreground transition hover:bg-muted"
          >
            Fermer
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
