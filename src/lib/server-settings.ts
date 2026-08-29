import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/lib/supabase-server";
import type { Level } from "@/lib/database-types";

export const listLevels = createServerFn({ method: "GET" })
  .handler(async () => {
    const { data, error } = await supabaseAdmin
      .from("levels")
      .select("*")
      .order("name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createLevel = createServerFn({ method: "POST" })
  .validator((input: { name: string; monthly_fee: number; cycle?: string; max_students?: number }) => input)
  .handler(async ({ data }) => {
    const { data: result, error } = await supabaseAdmin
      .from("levels")
      .insert({ name: data.name, monthly_fee: data.monthly_fee, cycle: data.cycle ?? "", max_students: data.max_students ?? 0 })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return result;
  });

export const updateLevel = createServerFn({ method: "POST" })
  .validator((input: { id: string; name?: string; monthly_fee?: number; cycle?: string; max_students?: number }) => input)
  .handler(async ({ data }) => {
    const { data: result, error } = await supabaseAdmin
      .from("levels")
      .update(data)
      .eq("id", data.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return result;
  });

export const deleteLevel = createServerFn({ method: "POST" })
  .validator((id: string) => id)
  .handler(async ({ data: id }) => {
    const { error } = await supabaseAdmin.from("levels").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getSettings = createServerFn({ method: "GET" })
  .handler(async () => {
    const { data, error } = await supabaseAdmin.from("settings").select("key, value");
    if (error) throw new Error(error.message);
    const map: Record<string, any> = {};
    for (const row of data ?? []) {
      map[row.key] = row.value;
    }
    return map;
  });

export const updateSetting = createServerFn({ method: "POST" })
  .validator((input: { key: string; value: any }) => input)
  .handler(async ({ data }) => {
    const { data: result, error } = await supabaseAdmin
      .from("settings")
      .upsert({ key: data.key, value: data.value }, { onConflict: "key" })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return result;
  });