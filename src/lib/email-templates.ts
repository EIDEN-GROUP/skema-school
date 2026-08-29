// ─────────────────────────────────────────────
// Branded transactional email templates (French)
// Styled to match the Gestio demo: forest / cream / emerald / gold,
// squared corners, mono labels. Pure functions, zero dependencies,
// table-based + inline styles for maximum email-client compatibility.
// ─────────────────────────────────────────────

export type DemoRequest = {
  /** Name of the specialized center */
  center: string;
  email: string;
  phone: string;
  /** Preferred demo date as ISO yyyy-mm-dd */
  preferredDate: string;
  /** Optional free-text message */
  message?: string;
};

export type RenderedEmail = {
  subject: string;
  html: string;
  text: string;
};

// Brand palette (literal hex   email clients don't support CSS variables)
const C = {
  forest: "#28396c",
  forestMd: "#32467f",
  cream: "#f6ffdb",
  beige: "#eae6bc",
  emerald: "#b5e18b",
  emeraldDk: "#9ecf6e",
  gold: "#cfc27a",
  white: "#ffffff",
  ink: "#333c5c",
  muted: "#707893",
  line: "#ddd8b3",
} as const;

const ADMIN_EMAIL = process.env.PUBLIC_ADMIN_EMAIL ?? "contact@eiden-group.com";
const WEBSITE = process.env.PUBLIC_WEBSITE ?? "eiden-group.com";
const PHONE_MA_DISPLAY = process.env.PUBLIC_PHONE_DISPLAY ?? "07 77 77 74 28";
const PHONE_MA_TEL = process.env.PUBLIC_PHONE_TEL ?? "+212777777428";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Format an ISO yyyy-mm-dd into a long French date label. */
export function formatDemoDate(iso: string): string {
  if (!iso) return "À convenir";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  try {
    const label = new Intl.DateTimeFormat("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(d);
    return label.charAt(0).toUpperCase() + label.slice(1);
  } catch {
    return iso;
  }
}

// ── Shared building blocks ──────────────────────

function shell(opts: {
  preheader: string;
  eyebrow: string;
  title: string;
  body: string;
}): string {
  const { preheader, eyebrow, title, body } = opts;
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="light only" />
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background-color:${C.forest};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:${C.forest};">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${C.forest};">
<tr><td align="center" style="padding:32px 16px;">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;border-collapse:collapse;">

    <!-- Header / browser-chrome echo of the demo -->
    <tr><td style="background-color:${C.forest};border:2px solid ${C.forestMd};border-bottom:none;padding:18px 28px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="font:700 19px/1.1 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:${C.cream};letter-spacing:-0.4px;">
            <span style="display:inline-block;width:22px;height:22px;background-color:${C.emerald};border-radius:4px;vertical-align:-5px;margin-right:8px;"></span>Gestio
          </td>
          <td align="right" style="font:700 10px/1 -apple-system,Arial,sans-serif;color:${C.emerald};letter-spacing:1.5px;text-transform:uppercase;">
            <span style="display:inline-block;width:7px;height:7px;background-color:${C.emerald};border-radius:50%;vertical-align:1px;margin-right:6px;"></span>${escapeHtml(WEBSITE)}
          </td>
        </tr>
      </table>
    </td></tr>

    <!-- Accent rule -->
    <tr><td style="height:4px;background:linear-gradient(90deg,${C.emerald} 0%,${C.gold} 100%);font-size:0;line-height:0;">&nbsp;</td></tr>

    <!-- Body -->
    <tr><td style="background-color:${C.cream};border:2px solid ${C.forestMd};border-top:none;padding:40px 36px;">
      <p style="margin:0 0 14px;font:700 11px/1 'Courier New',monospace;color:${C.emeraldDk};letter-spacing:2px;text-transform:uppercase;">${escapeHtml(eyebrow)}</p>
      <h1 style="margin:0 0 24px;font:800 27px/1.2 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:${C.forest};letter-spacing:-0.6px;">${escapeHtml(title)}</h1>
      ${body}
    </td></tr>

    <!-- Footer -->
    <tr><td style="background-color:${C.forest};border:2px solid ${C.forestMd};border-top:none;padding:26px 36px;">
      <p style="margin:0 0 6px;font:700 13px/1.4 -apple-system,Arial,sans-serif;color:${C.cream};">Gestio · CRM pour centres spécialisés</p>
      <p style="margin:0 0 14px;font:400 12px/1.6 -apple-system,Arial,sans-serif;color:#9fb3aa;">Agadir Bay, Technopole 1 Bloc B, Agadir 80000 · Maroc</p>
      <p style="margin:0;font:400 12px/1.6 -apple-system,Arial,sans-serif;color:#9fb3aa;">
        <a href="tel:${PHONE_MA_TEL}" style="color:${C.gold};text-decoration:none;">${PHONE_MA_DISPLAY}</a>
        &nbsp;·&nbsp;
        <a href="mailto:${ADMIN_EMAIL}" style="color:${C.gold};text-decoration:none;">${ADMIN_EMAIL}</a>
        &nbsp;·&nbsp;
        <a href="https://${WEBSITE}" style="color:${C.gold};text-decoration:none;">${WEBSITE}</a>
      </p>
    </td></tr>

    <tr><td align="center" style="padding:18px 8px 0;font:400 11px/1.5 -apple-system,Arial,sans-serif;color:#5e7068;">
      © ${new Date().getFullYear()} Gestio · Eiden Group · Tous droits réservés
    </td></tr>

  </table>
</td></tr>
</table>
</body>
</html>`;
}

/** A bordered key/value detail table shared by both emails. */
function detailTable(rows: Array<{ label: string; value: string; href?: string }>): string {
  const cells = rows
    .map((r, i) => {
      const value = r.href
        ? `<a href="${r.href}" style="color:${C.emeraldDk};text-decoration:none;font-weight:700;">${escapeHtml(r.value)}</a>`
        : `<span style="color:${C.ink};font-weight:600;">${escapeHtml(r.value)}</span>`;
      const top = i === 0 ? "" : `border-top:1px solid ${C.line};`;
      return `<tr>
        <td style="${top}padding:13px 16px;font:700 10px/1.3 'Courier New',monospace;color:${C.muted};letter-spacing:1px;text-transform:uppercase;white-space:nowrap;vertical-align:top;width:38%;">${escapeHtml(r.label)}</td>
        <td style="${top}padding:13px 16px;font:400 14px/1.5 -apple-system,Arial,sans-serif;">${value}</td>
      </tr>`;
    })
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:2px solid ${C.forest};background-color:${C.white};border-collapse:collapse;">${cells}</table>`;
}

// ── Visitor confirmation ────────────────────────

export function renderVisitorConfirmationEmail(data: DemoRequest): RenderedEmail {
  const dateLabel = formatDemoDate(data.preferredDate);
  const rows: Array<{ label: string; value: string; href?: string }> = [
    { label: "Centre", value: data.center },
    { label: "Créneau souhaité", value: dateLabel },
    { label: "Téléphone", value: data.phone, href: `tel:${data.phone.replace(/\s+/g, "")}` },
    { label: "Email", value: data.email, href: `mailto:${data.email}` },
  ];
  if (data.message?.trim()) {
    rows.push({ label: "Message", value: data.message.trim() });
  }

  const body = `
    <p style="margin:0 0 22px;font:400 15px/1.65 -apple-system,Arial,sans-serif;color:${C.ink};">
      Bonjour,<br /><br />
      Merci d'avoir demandé une démo de <strong>Gestio</strong> pour <strong>${escapeHtml(data.center)}</strong>.
      Votre demande est bien enregistrée. Notre équipe vous contactera <strong>sous 2&nbsp;heures ouvrées</strong> pour confirmer le créneau ci-dessous.
    </p>

    ${detailTable(rows)}

    <!-- What's next callout -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:26px;border-left:4px solid ${C.gold};background-color:#fbf4e3;">
      <tr><td style="padding:18px 20px;">
        <p style="margin:0 0 10px;font:800 13px/1.2 -apple-system,Arial,sans-serif;color:${C.forest};letter-spacing:0.3px;">Ce qui vous attend pendant la démo</p>
        <p style="margin:0;font:400 14px/1.7 -apple-system,Arial,sans-serif;color:${C.ink};">
          • Une présentation personnalisée selon votre type de centre<br />
          • Vos cas concrets : dossiers, paiements, planning<br />
          • 20 minutes, sans engagement
        </p>
      </td></tr>
    </table>

    <!-- CTA: call now -->
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:28px;">
      <tr><td style="background-color:${C.emerald};border:2px solid ${C.emeraldDk};">
        <a href="tel:${PHONE_MA_TEL}" style="display:inline-block;padding:14px 28px;font:800 14px/1 -apple-system,Arial,sans-serif;color:${C.white};text-decoration:none;letter-spacing:0.3px;">
          Une question urgente ? Appelez-nous → ${PHONE_MA_DISPLAY}
        </a>
      </td></tr>
    </table>

    <p style="margin:26px 0 0;font:400 13px/1.6 -apple-system,Arial,sans-serif;color:${C.muted};">
      À très vite,<br />L'équipe Gestio
    </p>`;

  const text = [
    `Merci d'avoir demandé une démo de Gestio pour ${data.center}.`,
    `Notre équipe vous contactera sous 2 heures ouvrées.`,
    ``,
    `Centre : ${data.center}`,
    `Créneau souhaité : ${dateLabel}`,
    `Téléphone : ${data.phone}`,
    `Email : ${data.email}`,
    data.message?.trim() ? `Message : ${data.message.trim()}` : ``,
    ``,
    `Une question urgente ? Appelez-nous au ${PHONE_MA_DISPLAY}.`,
    `${WEBSITE} · ${ADMIN_EMAIL}`,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    subject: `Votre démo Gestio est en cours de confirmation   ${data.center}`,
    html: shell({
      preheader: `Demande reçue pour ${data.center}. Nous vous recontactons sous 2h.`,
      eyebrow: "Demande de démo reçue",
      title: "C'est noté, on s'occupe de tout.",
      body,
    }),
    text,
  };
}

// ── School → parent notification ────────────────

/**
 * Wraps a free-text message from the dashboard message centre in the same branded
 * shell as the demo emails. Without this, those notifications go out as bare
 * `<br>`-joined text with none of the site's identity.
 */
export function renderSchoolNotificationEmail(opts: {
  message: string;
  /** Shown above the title, e.g. the school name. */
  eyebrow?: string;
  title?: string;
  parentName?: string;
}): RenderedEmail {
  const { message, eyebrow = "Message de l'école", title = "Vous avez un nouveau message" } = opts;
  const greeting = opts.parentName?.trim()
    ? `Bonjour ${escapeHtml(opts.parentName.trim())},`
    : "Bonjour,";

  // Preserve the author's line breaks without letting raw HTML through.
  const paragraphs = message
    .trim()
    .split(/\n{2,}/)
    .map(
      (block) =>
        `<p style="margin:0 0 16px;font:400 15px/1.7 -apple-system,Arial,sans-serif;color:${C.ink};">${escapeHtml(
          block,
        ).replace(/\n/g, "<br />")}</p>`,
    )
    .join("");

  const body = `
    <p style="margin:0 0 20px;font:400 15px/1.65 -apple-system,Arial,sans-serif;color:${C.ink};">${greeting}</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-left:4px solid ${C.emerald};background-color:${C.white};">
      <tr><td style="padding:20px 22px;">${paragraphs}</td></tr>
    </table>

    <p style="margin:26px 0 0;font:400 13px/1.6 -apple-system,Arial,sans-serif;color:${C.muted};">
      Vous pouvez répondre directement à cet email.<br />L'équipe pédagogique
    </p>`;

  const text = [greeting.replace(/<[^>]*>/g, ""), "", message.trim(), "", `${WEBSITE} · ${ADMIN_EMAIL}`].join("\n");

  return {
    subject: title,
    html: shell({
      preheader: message.trim().slice(0, 120),
      eyebrow,
      title,
      body,
    }),
    text,
  };
}

// ── Payment receipt ─────────────────────────────

const MODE_LABEL: Record<string, string> = {
  especes: "Espèces",
  virement: "Virement",
  carte: "Carte",
  cheque: "Chèque",
};

/** Branded payment receipt, replacing the bare `<table>` the dashboard used to send. */
export function renderPaymentReceiptEmail(opts: {
  parentName: string;
  receipt: string;
  amount: number;
  date: string;
  mode: string;
  period: string;
  pdfUrl?: string;
}): RenderedEmail {
  const amountLabel = `${opts.amount.toLocaleString("fr-FR")} MAD`;
  const modeLabel = MODE_LABEL[opts.mode] ?? opts.mode;
  const rows = [
    { label: "Reçu n°", value: opts.receipt || " " },
    { label: "Montant", value: amountLabel },
    { label: "Date", value: opts.date },
    { label: "Mode de paiement", value: modeLabel },
    { label: "Période", value: opts.period || " " },
  ];

  const body = `
    <p style="margin:0 0 22px;font:400 15px/1.65 -apple-system,Arial,sans-serif;color:${C.ink};">
      Bonjour ${escapeHtml(opts.parentName)},<br /><br />
      Nous confirmons la réception de votre paiement de <strong>${escapeHtml(amountLabel)}</strong>. Merci pour votre confiance.
    </p>

    ${detailTable(rows)}

    ${opts.pdfUrl ? `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:22px;">
      <tr><td style="background-color:${C.emerald};border:2px solid ${C.emeraldDk};border-radius:8px;">
        <a href="${escapeHtml(opts.pdfUrl)}" style="display:inline-block;padding:13px 24px;font:800 13px/1 -apple-system,Arial,sans-serif;color:${C.white};text-decoration:none;">
          Télécharger le reçu PDF →
        </a>
      </td></tr>
    </table>` : ""}

    <p style="margin:26px 0 0;font:400 13px/1.6 -apple-system,Arial,sans-serif;color:${C.muted};">
      Ce reçu fait foi de paiement. Conservez-le pour vos archives.<br />L'équipe pédagogique
    </p>`;

  const text = [
    `Reçu de paiement ${opts.receipt}`,
    ``,
    `Bonjour ${opts.parentName},`,
    `Nous confirmons la réception de votre paiement de ${amountLabel}.`,
    ``,
    ...rows.map((r) => `${r.label} : ${r.value}`),
    ``,
    `${WEBSITE} · ${ADMIN_EMAIL}`,
  ].join("\n");

  return {
    subject: `Reçu de paiement ${opts.receipt}`.trim(),
    html: shell({
      preheader: `Paiement de ${amountLabel} bien reçu.`,
      eyebrow: "Reçu de paiement",
      title: "Votre paiement est confirmé.",
      body,
    }),
    text,
  };
}

// ── Admin notification ("receipt") ──────────────

export function renderAdminNotificationEmail(data: DemoRequest): RenderedEmail {
  const dateLabel = formatDemoDate(data.preferredDate);
  const received = new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Africa/Casablanca",
  }).format(new Date());

  const rows: Array<{ label: string; value: string; href?: string }> = [
    { label: "Centre", value: data.center },
    { label: "Créneau souhaité", value: dateLabel },
    { label: "Téléphone", value: data.phone, href: `tel:${data.phone.replace(/\s+/g, "")}` },
    { label: "Email", value: data.email, href: `mailto:${data.email}` },
    { label: "Reçu le", value: received },
  ];
  if (data.message?.trim()) {
    rows.push({ label: "Message", value: data.message.trim() });
  }

  const body = `
    <p style="margin:0 0 22px;font:400 15px/1.65 -apple-system,Arial,sans-serif;color:${C.ink};">
      Une nouvelle demande de démo vient d'arriver via le site. Recontactez le centre <strong>sous 2&nbsp;heures ouvrées</strong>.
    </p>

    ${detailTable(rows)}

    <!-- Quick actions -->
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:26px;">
      <tr>
        <td style="background-color:${C.emerald};border:2px solid ${C.emeraldDk};">
          <a href="tel:${data.phone.replace(/\s+/g, "")}" style="display:inline-block;padding:13px 22px;font:800 13px/1 -apple-system,Arial,sans-serif;color:${C.white};text-decoration:none;">Appeler le centre</a>
        </td>
        <td style="width:12px;font-size:0;">&nbsp;</td>
        <td style="background-color:${C.white};border:2px solid ${C.forest};">
          <a href="mailto:${data.email}" style="display:inline-block;padding:13px 22px;font:800 13px/1 -apple-system,Arial,sans-serif;color:${C.forest};text-decoration:none;">Répondre par email</a>
        </td>
      </tr>
    </table>`;

  const text = [
    `Nouvelle demande de démo Gestio.`,
    ``,
    `Centre : ${data.center}`,
    `Créneau souhaité : ${dateLabel}`,
    `Téléphone : ${data.phone}`,
    `Email : ${data.email}`,
    `Reçu le : ${received}`,
    data.message?.trim() ? `Message : ${data.message.trim()}` : ``,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    subject: `Nouvelle demande de démo   ${data.center}`,
    html: shell({
      preheader: `${data.center} · ${data.phone} · créneau : ${dateLabel}`,
      eyebrow: "Nouveau lead · à recontacter",
      title: `Demande de démo   ${data.center}`,
      body,
    }),
    text,
  };
}
