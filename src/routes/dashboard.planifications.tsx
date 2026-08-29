import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  addWeeks,
  eachDayOfInterval,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfWeek,
} from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { getDateFnsLocale, useDashboardI18n } from "@/lib/landing-i18n";
import { softCard, iconButton } from "@/lib/dash-ui";
import { listPlanifications } from "@/lib/server-planifications";

type PlanTone = "violet" | "emerald" | "amber" | "zinc";

/** Journée affichée : 08h00 → 18h00, pas de 30 min. */
const START_HOUR = 8;
const END_HOUR = 18;
const SLOT_MINUTES = 30;
const SLOT_PX = 36;
const DEFAULT_DURATION_MIN = 60;

const START_MINUTES = START_HOUR * 60;
const END_MINUTES = END_HOUR * 60;
const SLOT_COUNT = (END_MINUTES - START_MINUTES) / SLOT_MINUTES;
const GRID_BODY_PX = SLOT_COUNT * SLOT_PX;

const toneBlock: Record<PlanTone, string> = {
  violet: "border-l-[3px] border-l-violet-600 bg-violet-50/95 text-violet-950 shadow-sm",
  emerald: "border-l-[3px] border-l-emerald-600 bg-emerald-50/95 text-emerald-950 shadow-sm",
  amber: "border-l-[3px] border-l-amber-600 bg-amber-50/95 text-amber-950 shadow-sm",
  zinc: "border-l-[3px] border-l-primary/50 bg-muted/95 text-foreground shadow-sm",
};

function earliestPlanMonday(plans: Array<{ date: string }>): Date {
  if (plans.length === 0) return startOfWeek(new Date(), { weekStartsOn: 1 });
  const min = plans.reduce(
    (acc, p) => (p.date < acc ? p.date : acc),
    plans[0].date,
  );
  return startOfWeek(parseISO(min), { weekStartsOn: 1 });
}

function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function planBlockStyle(plan: { time: string }): { top: number; height: number } | null {
  const start = parseTimeToMinutes(plan.time);
  const end = start + DEFAULT_DURATION_MIN;
  const clippedStart = Math.max(start, START_MINUTES);
  const clippedEnd = Math.min(end, END_MINUTES);
  if (clippedStart >= clippedEnd) return null;
  const top = ((clippedStart - START_MINUTES) / SLOT_MINUTES) * SLOT_PX;
  const height = Math.max(((clippedEnd - clippedStart) / SLOT_MINUTES) * SLOT_PX, SLOT_PX * 0.75);
  return { top, height };
}

function slotLabel(slotIndex: number): string {
  const m = START_MINUTES + slotIndex * SLOT_MINUTES;
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

export const Route = createFileRoute("/dashboard/planifications")({
  head: () => ({ meta: [{ title: "Planifications   CRM" }] }),
  component: PlanificationsPage,
});

type PlanItem = { id: string; date: string; time: string; title: string; detail: string; tone: PlanTone };

function PlanificationsPage() {
  const { t, locale } = useDashboardI18n();
  const dateFnsLocale = getDateFnsLocale(locale);
  const { data: plans = [] } = useQuery({
    queryKey: ["planifications"],
    queryFn: () => listPlanifications(),
  });
  const typedPlans = plans as unknown as PlanItem[];

  const [weekStart, setWeekStart] = useState(() => earliestPlanMonday(typedPlans));
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  const weekDays = useMemo(
    () => eachDayOfInterval({ start: weekStart, end: endOfWeek(weekStart, { weekStartsOn: 1 }) }),
    [weekStart],
  );

  const weekLabel = useMemo(() => {
    const a = weekDays[0];
    const b = weekDays[6];
    if (!a || !b) return "";
    if (a.getMonth() === b.getMonth()) {
      return `${format(a, "d", { locale: dateFnsLocale })} – ${format(b, "d MMMM yyyy", { locale: dateFnsLocale })}`;
    }
    return `${format(a, "d MMM", { locale: dateFnsLocale })} – ${format(b, "d MMM yyyy", { locale: dateFnsLocale })}`;
  }, [weekDays, dateFnsLocale]);

  const plansInWeek = useMemo(
    () =>
      typedPlans.filter((p) => {
        const d = parseISO(p.date);
        return d >= weekDays[0] && d <= weekDays[6];
      }).sort((a, b) => {
        const da = parseISO(a.date).getTime() - parseISO(b.date).getTime();
        if (da !== 0) return da;
        return a.time.localeCompare(b.time);
      }),
    [weekDays, typedPlans],
  );

  const monthPlans = useMemo(() => {
    const ref = weekDays[0];
    return typedPlans.filter((p) => isSameMonth(parseISO(p.date), ref)).sort((a, b) => {
      const da = parseISO(a.date).getTime() - parseISO(b.date).getTime();
      if (da !== 0) return da;
      return a.time.localeCompare(b.time);
    });
  }, [weekDays, typedPlans]);

  const selectedPlan = selectedPlanId ? typedPlans.find((p) => p.id === selectedPlanId) ?? null : null;

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      <header className="space-y-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">{t.planifications.eyebrow}</p>
        <div>
          <h1 className="font-display text-3xl leading-tight tracking-tight text-foreground md:text-[2.35rem]">
            <span className="font-semibold">{t.planifications.titleBold}</span>{" "}
            <span className="font-normal italic text-muted-foreground">{t.planifications.titleItalic}</span>
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t.planifications.subtitle}</p>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(260px,320px)] lg:items-start">
        <div className={cn(softCard, "overflow-hidden")}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#001B3D]/10 px-3 py-3 sm:px-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#001B3D]/8 text-[#001B3D]">
                <CalendarDays className="h-4 w-4" strokeWidth={1.75} />
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t.planifications.weekView}</p>
                <p className="text-sm font-medium capitalize text-foreground">{weekLabel}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setWeekStart((w) => addWeeks(w, -1))}
                className={iconButton}
                aria-label={t.planifications.prevWeekAria}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setWeekStart(earliestPlanMonday(typedPlans))}
                className="rounded-full bg-[#001B3D] px-4 py-1.5 text-xs font-medium text-white transition hover:bg-[#00142E]"
              >
                {t.planifications.demoWeek}
              </button>
              <button
                type="button"
                onClick={() => setWeekStart((w) => addWeeks(w, 1))}
                className={iconButton}
                aria-label={t.planifications.nextWeekAria}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[640px]">
              <div
                className="grid border-b border-border bg-muted/80"
                style={{
                  gridTemplateColumns: `3.25rem repeat(7, minmax(0, 1fr))`,
                }}
              >
                <div className="border-r border-border" />
                {weekDays.map((day) => {
                  const isToday = isSameDay(day, new Date());
                  return (
                    <div
                      key={format(day, "yyyy-MM-dd")}
                      className={cn(
                        "border-r border-border px-1 py-2 text-center last:border-r-0",
                        isToday && "bg-primary/5",
                      )}
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {format(day, "EEE", { locale: dateFnsLocale })}
                      </p>
                      <p className={cn("mt-0.5 font-display text-sm font-semibold tabular-nums", isToday && "text-foreground")}>
                        {format(day, "d MMM", { locale: dateFnsLocale })}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div
                className="grid"
                style={{
                  gridTemplateColumns: `3.25rem repeat(7, minmax(0, 1fr))`,
                }}
              >
                <div className="border-r border-border bg-muted/40">
                  {Array.from({ length: SLOT_COUNT }, (_, i) => (
                    <div
                      key={i}
                      className="border-b border-border pr-1.5 text-right text-[10px] font-medium tabular-nums text-muted-foreground/70"
                      style={{ height: SLOT_PX, lineHeight: `${SLOT_PX}px` }}
                    >
                      {i % 2 === 0 ? slotLabel(i) : ""}
                    </div>
                  ))}
                </div>

                {weekDays.map((day) => {
                  const dayPlans = typedPlans.filter((p) => isSameDay(parseISO(p.date), day));
                  return (
                    <div
                      key={format(day, "yyyy-MM-dd")}
                      className={cn(
                        "relative border-r border-border last:border-r-0",
                        isSameDay(day, new Date()) && "bg-primary/[0.02]",
                      )}
                    >
                      <div className="pointer-events-none absolute inset-0">
                        {Array.from({ length: SLOT_COUNT }, (_, i) => (
                          <div key={i} className="border-b border-border" style={{ height: SLOT_PX }} />
                        ))}
                      </div>
                      <div className="relative" style={{ height: GRID_BODY_PX }}>
                        {dayPlans.map((plan) => {
                          const layout = planBlockStyle(plan);
                          if (!layout) return null;
                          const active = selectedPlanId === plan.id;
                          return (
                            <button
                              key={plan.id}
                              type="button"
                              onClick={() => setSelectedPlanId((id) => (id === plan.id ? null : plan.id))}
                              className={cn(
                                "absolute left-0.5 right-0.5 overflow-hidden border border-border/80 px-1.5 py-1 text-left transition",
                                toneBlock[plan.tone],
                                active && "ring-2 ring-primary ring-offset-1",
                              )}
                              style={{ top: layout.top, height: layout.height, zIndex: active ? 2 : 1 }}
                            >
                              <p className="text-[10px] font-semibold leading-tight sm:text-[11px]">{plan.title}</p>
                              <p className="mt-0.5 flex items-center gap-0.5 text-[9px] font-medium tabular-nums opacity-90 sm:text-[10px]">
                                <Clock className="h-2.5 w-2.5 shrink-0" aria-hidden />
                                {plan.time}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <aside className="flex flex-col gap-5">
          <div className={cn(softCard, "p-5 sm:p-6")}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{t.planifications.selectedSlot}</p>
            {selectedPlan ? (
              <>
                <h2 className="mt-1 font-display text-lg text-foreground">{selectedPlan.title}</h2>
                <p className="mt-2 flex items-center gap-1.5 text-xs font-medium tabular-nums text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" aria-hidden />
                  {format(parseISO(selectedPlan.date), "EEEE d MMMM yyyy", { locale: dateFnsLocale })} · {selectedPlan.time}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{selectedPlan.detail}</p>
              </>
            ) : (
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                {t.planifications.selectSlotHint}
              </p>
            )}
          </div>

          <div className="rounded-[22px] border border-nuit/8 bg-gris-clair/60 p-5 sm:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{t.planifications.thisWeek}</p>
            <h3 className="mt-1 font-display text-lg text-foreground">{t.planifications.allSlots}</h3>
            <ul className="mt-4 max-h-[min(20rem,45vh)] space-y-2 overflow-y-auto pr-1">
              {plansInWeek.length === 0 ? (
                <li className="text-xs text-muted-foreground">{t.planifications.noSlotsWeek}</li>
              ) : (
                plansInWeek.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPlanId(p.id);
                        setWeekStart(startOfWeek(parseISO(p.date), { weekStartsOn: 1 }));
                      }}
                      className={cn(
                        "flex w-full items-start justify-between gap-2 rounded-xl border border-[#001B3D]/10 bg-card px-2.5 py-2 text-left text-xs shadow-sm transition hover:border-[#001B3D]/20",
                        selectedPlanId === p.id && "ring-1 ring-[#17B3A6]",
                      )}
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">{p.title}</p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">{p.detail}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-medium tabular-nums text-foreground/90">{p.time}</p>
                        <p className="text-[10px] capitalize text-muted-foreground">
                          {format(parseISO(p.date), "EEE d MMM", { locale: dateFnsLocale })}
                        </p>
                      </div>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>

          <div className={cn(softCard, "p-5 sm:p-6")}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{t.planifications.monthView}</p>
            <ul className="mt-3 space-y-2 text-xs">
              {monthPlans.map((p) => (
                <li
                  key={`m-${p.id}`}
                  className="flex items-start justify-between gap-2 border-b border-border py-1.5 last:border-0"
                >
                  <span className="font-medium text-foreground/90">{p.title}</span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {format(parseISO(p.date), "d/MM", { locale: dateFnsLocale })} {p.time}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
