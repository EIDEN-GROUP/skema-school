// ─────────────────────────────────────────────
// Branded transactional email templates (French).
// SKEMA identity: nuit / violet / turquoise / corail / ocre, generous rounding,
// the tricolour "E" motif, paper ground. Pure functions, zero dependencies,
// table-based + inline styles for maximum email-client compatibility.
// ─────────────────────────────────────────────

export type DemoRequest = {
  /** Name of the school / center */
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

// SKEMA brand palette — literal hex (email clients don't support CSS variables).
const C = {
  nuit: "#001B3D",
  violet: "#6C4DF6",
  turquoise: "#17B3A6",
  corail: "#FF666B",
  ocre: "#FFB347",
  paper: "#FFFDF7",
  white: "#FFFFFF",
  ground: "#EEF1F6",
  ink: "#1F2A3D",
  muted: "#6B7688",
  lavande: "#F0ECFF",
  line: "#E4E7EC",
} as const;

// Brand constants — fixed in the template, not env-driven, so the email
// content is always correct regardless of deployment config.
const SITE = "https://skema.eiden-group.com";
const WEBSITE = "skema.eiden-group.com";
const ADMIN_EMAIL = "contact@eiden-group.com";
const PHONE_MA_DISPLAY = "07 77 77 74 28";
const PHONE_MA_TEL = "+212777777428";

const ASSET = (name: string) => `${SITE}/skema-assets/${name}`;
const FONT = "'Poppins',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif";

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

/** The tricolour SKEMA bars, as a bulletproof stacked-cell mark. `w` = bar width px. */
const motif = (w = 16) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">` +
  `<tr><td style="width:${w}px;height:3px;background:${C.violet};font-size:0;line-height:0;border-radius:2px;">&nbsp;</td></tr>` +
  `<tr><td style="height:3px;font-size:0;line-height:0;">&nbsp;</td></tr>` +
  `<tr><td style="width:${w}px;height:3px;background:${C.turquoise};font-size:0;line-height:0;border-radius:2px;">&nbsp;</td></tr>` +
  `<tr><td style="height:3px;font-size:0;line-height:0;">&nbsp;</td></tr>` +
  `<tr><td style="width:${w}px;height:3px;background:${C.corail};font-size:0;line-height:0;border-radius:2px;">&nbsp;</td></tr>` +
  `</table>`;
const MOTIF = motif(16);

/** "SK▮MA" wordmark — the "E" is the tricolour motif. Pure table, always renders. */
const LOCKUP = `<table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;"><tr>
  <td style="font:800 20px/1 ${FONT};color:${C.nuit};letter-spacing:-0.04em;">SK</td>
  <td style="padding:0 3px;">${motif(13)}</td>
  <td style="font:800 20px/1 ${FONT};color:${C.nuit};letter-spacing:-0.04em;">MA</td>
</tr></table>`;

function shell(opts: {
  preheader: string;
  eyebrow: string;
  title: string;
  body: string;
  /** Sticker filename in /skema-assets, shown top-right of the body. */
  sticker?: string;
}): string {
  const { preheader, eyebrow, title, body, sticker } = opts;
  // Rounded tinted badge behind the sticker, so it still reads as branded even
  // if the remote PNG is blocked or the site URL isn't live yet.
  const stickerCell = sticker
    ? `<td align="right" valign="top" style="width:76px;padding-left:12px;">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr><td width="64" height="64" align="center" valign="middle" style="width:64px;height:64px;background-color:${C.lavande};border-radius:18px;">
          <img src="${ASSET(sticker)}" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border:0;" />
        </td></tr></table>
      </td>`
    : "";
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="light only" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background-color:${C.ground};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:${C.ground};">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${C.ground};">
<tr><td align="center" style="padding:32px 16px;">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;border-collapse:separate;border-spacing:0;border:1px solid rgba(0,27,61,0.08);border-radius:24px;overflow:hidden;background-color:${C.white};">

    <!-- Header -->
    <tr><td style="background-color:${C.white};padding:22px 30px 18px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td>${LOCKUP}</td>
        <td align="right" style="font:600 10px/1 ${FONT};color:${C.muted};letter-spacing:0.16em;text-transform:uppercase;">${escapeHtml(WEBSITE)}</td>
      </tr></table>
    </td></tr>

    <!-- Tricolour rule -->
    <tr><td style="font-size:0;line-height:0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;"><tr>
        <td style="height:4px;background:${C.violet};font-size:0;line-height:0;">&nbsp;</td>
        <td style="height:4px;background:${C.turquoise};font-size:0;line-height:0;">&nbsp;</td>
        <td style="height:4px;background:${C.corail};font-size:0;line-height:0;">&nbsp;</td>
      </tr></table>
    </td></tr>

    <!-- Body -->
    <tr><td style="background-color:${C.paper};padding:36px 30px 34px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td valign="top">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td style="padding-right:10px;">${MOTIF}</td>
            <td style="font:700 12px/1 ${FONT};color:${C.turquoise};letter-spacing:0.12em;text-transform:uppercase;">${escapeHtml(eyebrow)}</td>
          </tr></table>
          <h1 style="margin:12px 0 0;font:800 26px/1.2 ${FONT};color:${C.nuit};letter-spacing:-0.02em;">${escapeHtml(title)}</h1>
        </td>
        ${stickerCell}
      </tr></table>
      <div style="height:22px;line-height:22px;font-size:0;">&nbsp;</div>
      ${body}
    </td></tr>

    <!-- Footer -->
    <tr><td style="background-color:${C.nuit};padding:26px 30px;">
      <p style="margin:0 0 6px;font:700 13px/1.4 ${FONT};color:${C.white};">SKEMA</p>
      <p style="margin:0 0 14px;font:400 12px/1.6 ${FONT};color:rgba(255,255,255,0.55);">Logiciel de gestion pour écoles privées. Vie scolaire, planning et frais de scolarité sur une seule page.</p>
      <p style="margin:0;font:400 12px/1.6 ${FONT};color:rgba(255,255,255,0.55);">
        <a href="tel:${PHONE_MA_TEL}" style="color:${C.ocre};text-decoration:none;">${PHONE_MA_DISPLAY}</a>
        &nbsp;·&nbsp;
        <a href="mailto:${ADMIN_EMAIL}" style="color:${C.ocre};text-decoration:none;">${ADMIN_EMAIL}</a>
        &nbsp;·&nbsp;
        <a href="${SITE}" style="color:${C.ocre};text-decoration:none;">${WEBSITE}</a>
      </p>
    </td></tr>

    <tr><td align="center" style="background-color:${C.nuit};padding:0 30px 22px;font:400 11px/1.5 ${FONT};color:rgba(255,255,255,0.4);">
      © ${new Date().getFullYear()} SKEMA · Fait par EIDEN
    </td></tr>

  </table>
</td></tr>
</table>
</body>
</html>`;
}

/** A rounded key/value detail table shared by the emails. */
function detailTable(rows: Array<{ label: string; value: string; href?: string }>): string {
  const cells = rows
    .map((r, i) => {
      const value = r.href
        ? `<a href="${r.href}" style="color:${C.violet};text-decoration:none;font-weight:600;">${escapeHtml(r.value)}</a>`
        : `<span style="color:${C.nuit};font-weight:600;">${escapeHtml(r.value)}</span>`;
      const top = i === 0 ? "" : `border-top:1px solid ${C.line};`;
      return `<tr>
        <td style="${top}padding:13px 18px;font:700 10px/1.3 ${FONT};color:${C.muted};letter-spacing:0.1em;text-transform:uppercase;white-space:nowrap;vertical-align:top;width:38%;">${escapeHtml(r.label)}</td>
        <td style="${top}padding:13px 18px;font:400 14px/1.5 ${FONT};">${value}</td>
      </tr>`;
    })
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${C.line};background-color:${C.white};border-collapse:separate;border-spacing:0;border-radius:16px;overflow:hidden;">${cells}</table>`;
}

/** Filled pill button. */
function button(href: string, label: string, tone: "nuit" | "corail" | "ghost" = "nuit"): string {
  const bg = tone === "corail" ? C.corail : tone === "ghost" ? C.white : C.nuit;
  const fg = tone === "ghost" ? C.nuit : C.white;
  const border = tone === "ghost" ? `1px solid ${C.line}` : "0";
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="display:inline-block;"><tr>
    <td style="background-color:${bg};border:${border};border-radius:14px;">
      <a href="${href}" style="display:inline-block;padding:13px 24px;font:700 13px/1 ${FONT};color:${fg};text-decoration:none;">${escapeHtml(label)}</a>
    </td></tr></table>`;
}

// ── Visitor confirmation ────────────────────────

export function renderVisitorConfirmationEmail(data: DemoRequest): RenderedEmail {
  const dateLabel = formatDemoDate(data.preferredDate);
  const rows: Array<{ label: string; value: string; href?: string }> = [
    { label: "Établissement", value: data.center },
    { label: "Créneau souhaité", value: dateLabel },
    { label: "Téléphone", value: data.phone, href: `tel:${data.phone.replace(/\s+/g, "")}` },
    { label: "Email", value: data.email, href: `mailto:${data.email}` },
  ];
  if (data.message?.trim()) rows.push({ label: "Message", value: data.message.trim() });

  const body = `
    <p style="margin:0 0 22px;font:400 15px/1.65 ${FONT};color:${C.ink};">
      Bonjour,<br /><br />
      Merci d'avoir demandé une démo de <strong>SKEMA</strong> pour <strong>${escapeHtml(data.center)}</strong>.
      Votre demande est bien enregistrée. Notre équipe vous contacte <strong>sous 2&nbsp;heures ouvrées</strong> pour confirmer le créneau ci-dessous.
    </p>

    ${detailTable(rows)}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;border-left:4px solid ${C.violet};background-color:${C.lavande};border-radius:14px;">
      <tr><td style="padding:18px 20px;">
        <p style="margin:0 0 10px;font:700 13px/1.2 ${FONT};color:${C.nuit};">Ce qui vous attend pendant la démo</p>
        <p style="margin:0;font:400 14px/1.75 ${FONT};color:${C.ink};">
          Une présentation adaptée à votre établissement.<br />
          Vos cas concrets : familles, paiements, planning.<br />
          30 minutes, sans engagement, avec vos vrais chiffres.
        </p>
      </td></tr>
    </table>

    <div style="height:26px;font-size:0;">&nbsp;</div>
    ${button(`tel:${PHONE_MA_TEL}`, `Une question ? Appelez le ${PHONE_MA_DISPLAY}`, "corail")}

    <p style="margin:26px 0 0;font:400 13px/1.6 ${FONT};color:${C.muted};">
      À très vite,<br />L'équipe SKEMA
    </p>`;

  const text = [
    `Merci d'avoir demandé une démo de SKEMA pour ${data.center}.`,
    `Notre équipe vous contacte sous 2 heures ouvrées pour confirmer le créneau.`,
    ``,
    `Établissement : ${data.center}`,
    `Créneau souhaité : ${dateLabel}`,
    `Téléphone : ${data.phone}`,
    `Email : ${data.email}`,
    data.message?.trim() ? `Message : ${data.message.trim()}` : ``,
    ``,
    `Une question ? Appelez le ${PHONE_MA_DISPLAY}.`,
    `${WEBSITE} · ${ADMIN_EMAIL}`,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    subject: `Votre démo SKEMA · ${data.center}`,
    html: shell({
      preheader: `Demande reçue pour ${data.center}. Nous vous recontactons sous 2h.`,
      eyebrow: "Demande de démo reçue",
      title: "C'est noté, on s'occupe de tout.",
      sticker: "sticker-star.png",
      body,
    }),
    text,
  };
}

// ── School → parent notification ────────────────

/**
 * Wraps a free-text message from the dashboard message centre in the SKEMA
 * shell. Without this, those notifications go out as bare `<br>`-joined text
 * with none of the site's identity.
 */
export function renderSchoolNotificationEmail(opts: {
  message: string;
  eyebrow?: string;
  title?: string;
  parentName?: string;
}): RenderedEmail {
  const { message, eyebrow = "Message de l'école", title = "Vous avez un nouveau message" } = opts;
  const greeting = opts.parentName?.trim()
    ? `Bonjour ${escapeHtml(opts.parentName.trim())},`
    : "Bonjour,";

  const paragraphs = message
    .trim()
    .split(/\n{2,}/)
    .map(
      (block) =>
        `<p style="margin:0 0 16px;font:400 15px/1.7 ${FONT};color:${C.ink};">${escapeHtml(block).replace(/\n/g, "<br />")}</p>`,
    )
    .join("");

  const body = `
    <p style="margin:0 0 20px;font:400 15px/1.65 ${FONT};color:${C.ink};">${greeting}</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-left:4px solid ${C.turquoise};background-color:${C.white};border:1px solid ${C.line};border-radius:14px;">
      <tr><td style="padding:20px 22px;">${paragraphs}</td></tr>
    </table>

    <p style="margin:26px 0 0;font:400 13px/1.6 ${FONT};color:${C.muted};">
      Vous pouvez répondre directement à cet email.<br />L'équipe pédagogique
    </p>`;

  const text = [greeting.replace(/<[^>]*>/g, ""), "", message.trim(), "", `${WEBSITE} · ${ADMIN_EMAIL}`].join("\n");

  return {
    subject: title,
    html: shell({
      preheader: message.trim().slice(0, 120),
      eyebrow,
      title,
      sticker: "sticker-bubble.png",
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
    <p style="margin:0 0 22px;font:400 15px/1.65 ${FONT};color:${C.ink};">
      Bonjour ${escapeHtml(opts.parentName)},<br /><br />
      Nous confirmons la réception de votre paiement de <strong>${escapeHtml(amountLabel)}</strong>. Merci pour votre confiance.
    </p>

    ${detailTable(rows)}

    ${opts.pdfUrl ? `<div style="height:22px;font-size:0;">&nbsp;</div>${button(escapeHtml(opts.pdfUrl), "Télécharger le reçu PDF", "nuit")}` : ""}

    <p style="margin:26px 0 0;font:400 13px/1.6 ${FONT};color:${C.muted};">
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
      sticker: "sticker-invoice.png",
      body,
    }),
    text,
  };
}

// ── Admin notification ──────────────────────────

export function renderAdminNotificationEmail(data: DemoRequest): RenderedEmail {
  const dateLabel = formatDemoDate(data.preferredDate);
  const received = new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Africa/Casablanca",
  }).format(new Date());

  const rows: Array<{ label: string; value: string; href?: string }> = [
    { label: "Établissement", value: data.center },
    { label: "Créneau souhaité", value: dateLabel },
    { label: "Téléphone", value: data.phone, href: `tel:${data.phone.replace(/\s+/g, "")}` },
    { label: "Email", value: data.email, href: `mailto:${data.email}` },
    { label: "Reçu le", value: received },
  ];
  if (data.message?.trim()) rows.push({ label: "Message", value: data.message.trim() });

  const body = `
    <p style="margin:0 0 22px;font:400 15px/1.65 ${FONT};color:${C.ink};">
      Une nouvelle demande de démo vient d'arriver via le site. Recontactez l'établissement <strong>sous 2&nbsp;heures ouvrées</strong>.
    </p>

    ${detailTable(rows)}

    <div style="height:24px;font-size:0;">&nbsp;</div>
    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
      <td>${button(`tel:${data.phone.replace(/\s+/g, "")}`, "Appeler l'établissement", "corail")}</td>
      <td style="width:10px;font-size:0;">&nbsp;</td>
      <td>${button(`mailto:${data.email}`, "Répondre par email", "ghost")}</td>
    </tr></table>`;

  const text = [
    `Nouvelle demande de démo SKEMA.`,
    ``,
    `Établissement : ${data.center}`,
    `Créneau souhaité : ${dateLabel}`,
    `Téléphone : ${data.phone}`,
    `Email : ${data.email}`,
    `Reçu le : ${received}`,
    data.message?.trim() ? `Message : ${data.message.trim()}` : ``,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    subject: `Nouvelle demande de démo · ${data.center}`,
    html: shell({
      preheader: `${data.center} · ${data.phone} · créneau : ${dateLabel}`,
      eyebrow: "Nouveau lead à recontacter",
      title: `Demande de démo · ${data.center}`,
      sticker: "sticker-clock.png",
      body,
    }),
    text,
  };
}
