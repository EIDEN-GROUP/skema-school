import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/lib/supabase-server";

export type CalendarException = {
  id: string;
  date: string;
  label: string;
};

export const listCalendarExceptions = createServerFn({ method: "GET" })
  .handler(async () => {
    const { data, error } = await supabaseAdmin
      .from("calendar_exceptions")
      .select("*")
      .order("date", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as CalendarException[];
  });

export const createCalendarException = createServerFn({ method: "POST" })
  .validator((input: { date: string; label: string }) => input)
  .handler(async ({ data }) => {
    const { data: result, error } = await supabaseAdmin
      .from("calendar_exceptions")
      .insert({ date: data.date, label: data.label })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return result as CalendarException;
  });

export const deleteCalendarException = createServerFn({ method: "POST" })
  .validator((id: string) => id)
  .handler(async ({ data: id }) => {
    const { error } = await supabaseAdmin
      .from("calendar_exceptions")
      .delete()
      .eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
