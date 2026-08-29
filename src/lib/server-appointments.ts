import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/lib/supabase-server";

export type AppointmentInput = {
  name: string;
  email?: string;
  phone?: string;
  subject?: string;
  type?: "contact" | "rdv";
  status?: "nouveau" | "contacte" | "converti";
  age?: string;
  message?: string;
  date_table?: string;
  date_detail?: string;
};

export const listAppointments = createServerFn({ method: "GET" })
  .handler(async () => {
    const { data, error } = await supabaseAdmin
      .from("appointments")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createAppointment = createServerFn({ method: "POST" })
  .validator((input: AppointmentInput) => input)
  .handler(async ({ data }) => {
    const now = new Date();
    const dateStr = `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;
    const dateDetail = now.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

    const { data: result, error } = await supabaseAdmin
      .from("appointments")
      .insert({
        name: data.name,
        email: data.email ?? "",
        phone: data.phone ?? "",
        subject: data.subject ?? "",
        type: data.type ?? "contact",
        status: data.status ?? "nouveau",
        age: data.age ?? "",
        message: data.message ?? "",
        date_table: data.date_table ?? dateStr,
        date_detail: data.date_detail ?? dateDetail,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return result;
  });

export const updateAppointment = createServerFn({ method: "POST" })
  .validator((input: { id: string } & Partial<AppointmentInput>) => input)
  .handler(async ({ data }) => {
    const { id, ...fields } = data;
    const { data: result, error } = await supabaseAdmin
      .from("appointments")
      .update(fields)
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return result;
  });

export const deleteAppointment = createServerFn({ method: "POST" })
  .validator((id: string) => id)
  .handler(async ({ data: id }) => {
    const { error } = await supabaseAdmin
      .from("appointments")
      .delete()
      .eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
