import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/lib/supabase-server";

export type Holiday = {
  id: string;
  date: string;
  label: string;
};

export type SchoolVacation = {
  id: string;
  start_date: string;
  end_date: string;
  label: string;
};

// ── Holidays ──

export const listHolidays = createServerFn({ method: "GET" })
  .handler(async () => {
    const { data, error } = await supabaseAdmin
      .from("holidays")
      .select("*")
      .order("date", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as Holiday[];
  });

export const createHoliday = createServerFn({ method: "POST" })
  .validator((input: { date: string; label: string }) => input)
  .handler(async ({ data }) => {
    const { data: result, error } = await supabaseAdmin
      .from("holidays")
      .insert({ date: data.date, label: data.label })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return result as Holiday;
  });

export const deleteHoliday = createServerFn({ method: "POST" })
  .validator((id: string) => id)
  .handler(async ({ data: id }) => {
    const { error } = await supabaseAdmin
      .from("holidays")
      .delete()
      .eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ── School Vacations ──

export const listSchoolVacations = createServerFn({ method: "GET" })
  .handler(async () => {
    const { data, error } = await supabaseAdmin
      .from("school_vacations")
      .select("*")
      .order("start_date", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as SchoolVacation[];
  });

export const createSchoolVacation = createServerFn({ method: "POST" })
  .validator((input: { start_date: string; end_date: string; label: string }) => input)
  .handler(async ({ data }) => {
    const { data: result, error } = await supabaseAdmin
      .from("school_vacations")
      .insert({ start_date: data.start_date, end_date: data.end_date, label: data.label })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return result as SchoolVacation;
  });

export const deleteSchoolVacation = createServerFn({ method: "POST" })
  .validator((id: string) => id)
  .handler(async ({ data: id }) => {
    const { error } = await supabaseAdmin
      .from("school_vacations")
      .delete()
      .eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ── Sync public holidays from Nager API ──

type NagerHoliday = {
  date: string;
  localName: string;
  name: string;
  countryCode: string;
  fixed: boolean;
  global: boolean;
  types: string[];
};

export const syncPublicHolidays = createServerFn({ method: "POST" })
  .validator((years: number[]) => years)
  .handler(async ({ data: years }) => {
    const existingRows = await supabaseAdmin
      .from("holidays")
      .select("date, label");
    const existing = new Set(
      (existingRows.data ?? []).map((r) => `${r.date}|${r.label}`),
    );

    let added = 0;

    for (const year of years) {
      const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/MA`);
      if (!res.ok) continue;
      const holidays: NagerHoliday[] = await res.json();

      const rows = holidays
        .filter((h) => !existing.has(`${h.date}|${h.localName}`))
        .map((h) => ({ date: h.date, label: h.localName }));

      if (rows.length === 0) continue;

      const { error } = await supabaseAdmin.from("holidays").insert(rows);
      if (error) throw new Error(error.message);
      added += rows.length;
    }

    return { added };
  });
