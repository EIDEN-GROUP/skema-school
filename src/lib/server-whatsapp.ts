import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/lib/supabase-server";
import {
  renderSchoolNotificationEmail,
  renderPaymentReceiptEmail,
} from "@/lib/email-templates";

const WA_API_VERSION = process.env.WHATSAPP_API_VERSION ?? "v22.0";
const WA_PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID ?? "";
const WA_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN ?? "";
const WA_URL = `https://graph.facebook.com/${WA_API_VERSION}/${WA_PHONE_ID}/messages`;

// n8n → WAHA path. When N8N_WEBHOOK_URL is set, outbound WhatsApp is routed
// through the self-hosted n8n webhook (which calls WAHA /api/sendText) instead
// of hitting the Meta Cloud API directly. The shared secret lets n8n reject
// callers that aren't this app.
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL ?? "";
const N8N_WEBHOOK_SECRET = process.env.N8N_WEBHOOK_SECRET ?? "";

type SendResult = { ok: boolean; waId?: string; error?: string };

async function sendViaN8n(cleanPhone: string, content: string): Promise<SendResult> {
  try {
    const res = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(N8N_WEBHOOK_SECRET ? { "X-Webhook-Secret": N8N_WEBHOOK_SECRET } : {}),
      },
      body: JSON.stringify({ phone: cleanPhone, content }),
    });

    // n8n may answer with no body / non-JSON on a bare "Respond to Webhook".
    const body = await res.json().catch(() => ({}) as Record<string, unknown>);
    if (!res.ok || body.ok === false) {
      const err = (body.error as string) ?? `n8n HTTP ${res.status}`;
      return { ok: false, error: err };
    }
    const waId = (body.waId ?? body.messageId ?? body.id) as string | undefined;
    return { ok: true, waId };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Erreur inconnue" };
  }
}

async function sendViaMeta(cleanPhone: string, content: string): Promise<SendResult> {
  if (!WA_PHONE_ID || !WA_TOKEN) {
    return { ok: false, error: "WhatsApp API non configurée" };
  }

  try {
    const res = await fetch(WA_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${WA_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: cleanPhone,
        type: "text",
        text: { preview_url: false, body: content },
      }),
    });

    const body = await res.json();
    if (!res.ok) {
      return { ok: false, error: body.error?.message ?? `Erreur ${res.status}` };
    }
    return { ok: true, waId: body.messages?.[0]?.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Erreur inconnue" };
  }
}

async function sendDocumentViaN8n(cleanPhone: string, pdfUrl: string, filename: string, caption: string): Promise<SendResult> {
  try {
    const res = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(N8N_WEBHOOK_SECRET ? { "X-Webhook-Secret": N8N_WEBHOOK_SECRET } : {}),
      },
      body: JSON.stringify({ phone: cleanPhone, content: caption, document: { url: pdfUrl, filename } }),
    });

    const body = await res.json().catch(() => ({}) as Record<string, unknown>);
    if (!res.ok || body.ok === false) {
      const err = (body.error as string) ?? `n8n HTTP ${res.status}`;
      return { ok: false, error: err };
    }
    const waId = (body.waId ?? body.messageId ?? body.id) as string | undefined;
    return { ok: true, waId };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Erreur inconnue" };
  }
}

async function sendDocumentViaMeta(cleanPhone: string, pdfUrl: string, filename: string, caption: string): Promise<SendResult> {
  if (!WA_PHONE_ID || !WA_TOKEN) {
    return { ok: false, error: "WhatsApp API non configurée" };
  }

  try {
    const res = await fetch(WA_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${WA_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: cleanPhone,
        type: "document",
        document: {
          link: pdfUrl,
          filename,
          caption,
        },
      }),
    });

    const body = await res.json();
    if (!res.ok) {
      return { ok: false, error: body.error?.message ?? `Erreur ${res.status}` };
    }
    return { ok: true, waId: body.messages?.[0]?.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Erreur inconnue" };
  }
}

export async function sendWhatsAppDocument(phone: string, pdfUrl: string, filename: string, caption: string): Promise<SendResult> {
  const cleanPhone = phone.replace(/\D/g, "");
  if (cleanPhone.length < 8) {
    return { ok: false, error: "Numéro de téléphone invalide" };
  }

  if (N8N_WEBHOOK_URL) {
    return sendDocumentViaN8n(cleanPhone, pdfUrl, filename, caption);
  }
  return sendDocumentViaMeta(cleanPhone, pdfUrl, filename, caption);
}

export async function sendWhatsAppMessage(phone: string, content: string): Promise<SendResult> {
  const cleanPhone = phone.replace(/\D/g, "");
  if (cleanPhone.length < 8) {
    return { ok: false, error: "Numéro de téléphone invalide" };
  }

  // Prefer the n8n/WAHA path when configured; otherwise fall back to Meta.
  if (N8N_WEBHOOK_URL) {
    return sendViaN8n(cleanPhone, content);
  }
  return sendViaMeta(cleanPhone, content);
}

export const sendClientMessage = createServerFn({ method: "POST" })
  .validator((input: { clientId: string; content: string }) => input)
  .handler(async ({ data }) => {
    const { data: client, error } = await supabaseAdmin
      .from("clients")
      .select("id, phone, parent_name, whatsapp_optin")
      .eq("id", data.clientId)
      .single();
    if (error || !client) return { ok: false, error: "Client introuvable" };
    if (!client.whatsapp_optin) return { ok: false, error: "Ce client n'a pas activé WhatsApp" };

    const result = await sendWhatsAppMessage(client.phone, data.content);

    await supabaseAdmin.from("whatsapp_messages").insert({
      client_id: client.id,
      phone: client.phone,
      direction: "sent",
      content: data.content,
      status: result.ok ? "sent" : "failed",
      wa_message_id: result.waId ?? "",
    });

    return result;
  });

export const sendBroadcast = createServerFn({ method: "POST" })
  .validator((input: { content: string; filterOverdue?: boolean; filterStage?: string }) => input)
  .handler(async ({ data }) => {
    let query = supabaseAdmin
      .from("clients")
      .select("id, phone, parent_name, whatsapp_optin")
      .eq("whatsapp_optin", true)
      .neq("phone", "");

    if (data.filterOverdue) {
      query = query.eq("overdue", true);
    }
    if (data.filterStage && data.filterStage !== "tous") {
      query = query.eq("crm_stage", data.filterStage);
    }

    const { data: clients, error } = await query;
    if (error) return { ok: false, error: error.message };
    if (!clients || clients.length === 0) return { ok: false, error: "Aucun client éligible" };

    const broadcastId = crypto.randomUUID();
    const results: Array<{ phone: string; ok: boolean; error?: string }> = [];
    const logs: Array<{
      client_id: string | null;
      phone: string;
      direction: "sent";
      content: string;
      status: "pending" | "sent" | "failed";
      wa_message_id: string;
      broadcast_id: string;
    }> = [];

    for (const client of clients) {
      const res = await sendWhatsAppMessage(client.phone, data.content);
      results.push({ phone: client.phone, ok: res.ok, error: res.error });
      logs.push({
        client_id: client.id,
        phone: client.phone,
        direction: "sent",
        content: data.content,
        status: res.ok ? "sent" : "failed",
        wa_message_id: res.waId ?? "",
        broadcast_id: broadcastId,
      });
    }

    if (logs.length > 0) {
      await supabaseAdmin.from("whatsapp_messages").insert(logs);
    }

    const successCount = results.filter((r) => r.ok).length;
    return {
      ok: true,
      broadcastId,
      total: results.length,
      success: successCount,
      failed: results.length - successCount,
      results,
    };
  });

export const getMessageHistory = createServerFn({ method: "GET" })
  .handler(async () => {
    const { data, error } = await supabaseAdmin
      .from("whatsapp_messages")
      .select("*, clients(parent_name)")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const deleteMessage = createServerFn({ method: "POST" })
  .validator((id: string) => id)
  .handler(async ({ data: id }) => {
    const { error } = await supabaseAdmin
      .from("whatsapp_messages")
      .delete()
      .eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const sendEmailNotification = createServerFn({ method: "POST" })
  .validator(
    (input: {
      to: string;
      subject: string;
      /** Plain text. Rendered into the branded template. */
      message?: string;
      parentName?: string;
      /** Escape hatch: pre-rendered HTML, used as-is (no branding applied). */
      html?: string;
      text?: string;
    }) => input,
  )
  .handler(async ({ data }) => {
    const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
    const SUPABASE_ANON = process.env.SUPABASE_ANON ?? "";

    // Branding happens here, not at the call sites, so every dashboard email
    // carries the site identity even if a new caller forgets.
    const rendered = data.message
      ? renderSchoolNotificationEmail({
          message: data.message,
          title: data.subject,
          parentName: data.parentName,
        })
      : null;
    const html = rendered?.html ?? data.html ?? "";
    const text = rendered?.text ?? data.text ?? "";

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_ANON}`,
        },
        body: JSON.stringify({
          to: data.to,
          subject: data.subject,
          html,
          text,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Edge function: ${res.status} ${text}`);
      }

      await supabaseAdmin.from("email_logs").insert({
        recipient: data.to,
        subject: data.subject,
        type: "custom",
        status: "sent",
      });

      return { ok: true };
    } catch (err) {
      await supabaseAdmin.from("email_logs").insert({
        recipient: data.to,
        subject: data.subject,
        type: "custom",
        status: "failed",
        error_msg: err instanceof Error ? err.message : "Unknown error",
      });
      return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
    }
  });

/** Branded payment receipt. Rendered server-side so the template never ships to the browser. */
export const sendPaymentReceipt = createServerFn({ method: "POST" })
  .validator(
    (input: {
      to: string;
      parentName: string;
      receipt: string;
      amount: number;
      date: string;
      mode: string;
      period: string;
      pdfUrl?: string;
    }) => input,
  )
  .handler(async ({ data }) => {
    const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
    const SUPABASE_ANON = process.env.SUPABASE_ANON ?? "";
    const mail = renderPaymentReceiptEmail(data);

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_ANON}`,
        },
        body: JSON.stringify({
          to: data.to,
          subject: mail.subject,
          html: mail.html,
          text: mail.text,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Edge function: ${res.status} ${text}`);
      }

      await supabaseAdmin.from("email_logs").insert({
        recipient: data.to,
        subject: mail.subject,
        type: "receipt",
        status: "sent",
      });

      return { ok: true };
    } catch (err) {
      await supabaseAdmin.from("email_logs").insert({
        recipient: data.to,
        subject: mail.subject,
        type: "receipt",
        status: "failed",
        error_msg: err instanceof Error ? err.message : "Unknown error",
      });
      return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
    }
  });

/** Send payment confirmation via both WhatsApp (message + PDF) and email (same PDF). */
export const sendPaymentConfirmation = createServerFn({ method: "POST" })
  .validator(
    (input: {
      to: string;
      parentName: string;
      receipt: string;
      amount: number;
      date: string;
      mode: string;
      period: string;
      pdfUrl: string;
      clientPhone?: string;
      whatsappOptin?: boolean;
    }) => input,
  )
  .handler(async ({ data }) => {
    const results: { email: { ok: boolean; error?: string }; whatsapp: { ok: boolean; error?: string } | null } = {
      email: { ok: false },
      whatsapp: null,
    };

    const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
    const SUPABASE_ANON = process.env.SUPABASE_ANON ?? "";
    const mail = renderPaymentReceiptEmail(data);

    // Send email
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_ANON}`,
        },
        body: JSON.stringify({
          to: data.to,
          subject: mail.subject,
          html: mail.html,
          text: mail.text,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Edge function: ${res.status} ${text}`);
      }

      await supabaseAdmin.from("email_logs").insert({
        recipient: data.to,
        subject: mail.subject,
        type: "receipt",
        status: "sent",
      });

      results.email = { ok: true };
    } catch (err) {
      await supabaseAdmin.from("email_logs").insert({
        recipient: data.to,
        subject: mail.subject,
        type: "receipt",
        status: "failed",
        error_msg: err instanceof Error ? err.message : "Unknown error",
      });
      results.email = { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
    }

    // Send WhatsApp with PDF if client has opted in
    if (data.clientPhone && data.whatsappOptin) {
      const caption = `Centre de messages\n\nReçu de paiement ${data.receipt} — ${data.amount.toLocaleString("fr-FR")} MAD — Merci pour votre règlement.`;
      const waResult = await sendWhatsAppDocument(
        data.clientPhone,
        data.pdfUrl,
        `recu-${data.receipt}.pdf`,
        caption,
      );

      await supabaseAdmin.from("whatsapp_messages").insert({
        client_id: null,
        phone: data.clientPhone,
        direction: "sent",
        content: caption,
        status: waResult.ok ? "sent" : "failed",
        wa_message_id: waResult.waId ?? "",
      });

      results.whatsapp = waResult;
    }

    return results;
  });
