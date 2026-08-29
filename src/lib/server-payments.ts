import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/lib/supabase-server";

export type PaymentInput = {
  client_id: string;
  amount: number;
  date?: string;
  mode?: "especes" | "virement" | "carte" | "cheque";
  period?: string;
  notes?: string;
};

export const listPayments = createServerFn({ method: "GET" })
  .handler(async () => {
    const { data, error } = await supabaseAdmin
      .from("payments")
      .select("*, clients!inner(parent_name, child_name, phone, email, level, monthly_fee, fratrie, remise, subscribed_services, payment_status)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getClientPayments = createServerFn({ method: "GET" })
  .validator((clientId: string) => clientId)
  .handler(async ({ data: clientId }) => {
    const { data, error } = await supabaseAdmin
      .from("payments")
      .select("*")
      .eq("client_id", clientId)
      .order("date", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createPayment = createServerFn({ method: "POST" })
  .validator((input: PaymentInput) => input)
  .handler(async ({ data }) => {
    const now = new Date();
    const dateStr = data.date ?? now.toISOString().split("T")[0];
    const period = data.period ?? `${now.toLocaleString("fr-FR", { month: "long" })} ${now.getFullYear()}`;

    const { data: result, error } = await supabaseAdmin
      .from("payments")
      .insert({
        client_id: data.client_id,
        amount: data.amount,
        date: dateStr,
        mode: data.mode ?? "especes",
        period,
        notes: data.notes ?? "",
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    await supabaseAdmin.rpc("recalc_client_debt", { p_client_id: data.client_id });

    return result;
  });

export const updatePaymentInvoice = createServerFn({ method: "POST" })
  .validator((input: { id: string; invoice_sent: boolean }) => input)
  .handler(async ({ data }) => {
    const { data: result, error } = await supabaseAdmin
      .from("payments")
      .update({ invoice_sent: data.invoice_sent })
      .eq("id", data.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return result;
  });

export const deletePayment = createServerFn({ method: "POST" })
  .validator((id: string) => id)
  .handler(async ({ data: id }) => {
    const { error } = await supabaseAdmin
      .from("payments")
      .delete()
      .eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
