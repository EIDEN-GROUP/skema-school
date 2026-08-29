import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/lib/supabase-server";

export type PlanificationInput = {
  date: string;
  time: string;
  title: string;
  detail?: string;
  tone?: "violet" | "emerald" | "amber" | "zinc";
};

export const listPlanifications = createServerFn({ method: "GET" })
  .handler(async () => {
    const { data, error } = await supabaseAdmin
      .from("planifications")
      .select("*")
      .order("date", { ascending: true })
      .order("time", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createPlanification = createServerFn({ method: "POST" })
  .validator((input: PlanificationInput) => input)
  .handler(async ({ data }) => {
    const { data: result, error } = await supabaseAdmin
      .from("planifications")
      .insert({
        date: data.date,
        time: data.time,
        title: data.title,
        detail: data.detail ?? "",
        tone: data.tone ?? "zinc",
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return result;
  });

export const updatePlanification = createServerFn({ method: "POST" })
  .validator((input: { id: string } & Partial<PlanificationInput>) => input)
  .handler(async ({ data }) => {
    const { id, ...fields } = data;
    const { data: result, error } = await supabaseAdmin
      .from("planifications")
      .update(fields)
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return result;
  });

export const deletePlanification = createServerFn({ method: "POST" })
  .validator((id: string) => id)
  .handler(async ({ data: id }) => {
    const { error } = await supabaseAdmin
      .from("planifications")
      .delete()
      .eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
