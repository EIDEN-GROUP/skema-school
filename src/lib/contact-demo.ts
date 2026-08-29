import { createServerFn } from "@tanstack/react-start";

import {
  renderVisitorConfirmationEmail,
  renderAdminNotificationEmail,
  type DemoRequest,
} from "@/lib/email-templates";
import { supabaseAdmin } from "@/lib/supabase-server";

const ADMIN_EMAIL = "contact@eiden-group.com";

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SUPABASE_ANON = process.env.SUPABASE_ANON ?? "";

export type DemoRequestResult = { ok: true } | { ok: false; error: string };

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function validate(input: unknown): DemoRequest {
  const data = (input ?? {}) as Record<string, unknown>;
  const contactName = clean(data.contactName);
  const center = clean(data.center);
  const email = clean(data.email);
  const phone = clean(data.phone);
  const preferredDate = clean(data.preferredDate);
  const message = clean(data.message);

  if (!contactName) throw new Error("Votre nom complet est requis.");
  if (!center) throw new Error("Le nom de l'établissement est requis.");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Adresse email invalide.");
  if (phone && phone.replace(/\D/g, "").length < 8) throw new Error("Numéro de téléphone invalide.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(preferredDate)) throw new Error("Date souhaitée invalide.");

  // The name isn't a dedicated column, so it rides along in the message.
  const composedMessage = [`Contact : ${contactName}`, message || null]
    .filter(Boolean)
    .join("\n\n");

  return {
    center: center.slice(0, 160),
    email: email.slice(0, 160),
    phone: (phone || "Non communiqué").slice(0, 40),
    preferredDate,
    message: composedMessage.slice(0, 2000),
  };
}

export const submitDemoRequest = createServerFn({ method: "POST" })
  .validator((input: unknown) => validate(input))
  .handler(async ({ data }): Promise<DemoRequestResult> => {
    const visitor = renderVisitorConfirmationEmail(data);
    const admin = renderAdminNotificationEmail(data);

    try {
      await deliver(data, visitor, admin);
      return { ok: true };
    } catch (error) {
      console.error("[demo-request] delivery failed:", error);
      return { ok: false, error: "Envoi impossible pour le moment. Merci de réessayer." };
    }
  });

type Rendered = { subject: string; html: string; text: string };

async function deliver(data: DemoRequest, visitor: Rendered, admin: Rendered): Promise<void> {
  const { error: insertError } = await supabaseAdmin.from("demo_requests").insert({
    center: data.center,
    email: data.email,
    phone: data.phone,
    preferred_date: data.preferredDate,
    message: data.message ?? null,
  });

  if (insertError) {
    console.error("[demo-request] supabase insert failed:", insertError);
    throw new Error(insertError.message);
  }

  const body = {
    visitor: { to: data.email, subject: visitor.subject, html: visitor.html, text: visitor.text },
    admin: { to: ADMIN_EMAIL, subject: admin.subject, html: admin.html, text: admin.text, replyTo: data.email },
  };

  const fnRes = await fetch(`${SUPABASE_URL}/functions/v1/send-demo-emails`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_ANON}`,
    },
    body: JSON.stringify(body),
  });

  if (!fnRes.ok) {
    const text = await fnRes.text();
    console.error("[demo-request] edge function returned", fnRes.status, text);
    throw new Error(`Edge Function returned ${fnRes.status}: ${text}`);
  }
}
