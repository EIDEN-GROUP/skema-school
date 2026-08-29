import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/lib/supabase-server";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

type FieldPos = { key: string; x: number; y: number };
type ClientData = Record<string, string>;

export const generateReceiptPdf = createServerFn({ method: "POST" })
  .validator((input: { clientId: string; paymentId: string; data: ClientData }) => input)
  .handler(async ({ data: { clientId, paymentId, data: fieldData } }) => {
    // Load settings
    const { data: settingsRows } = await supabaseAdmin
      .from("settings")
      .select("key, value");
    const settings: Record<string, any> = {};
    for (const r of settingsRows ?? []) settings[r.key] = r.value;

    const templateMeta = settings.pdf_template as { url?: string } | undefined;
    const stampMeta = settings.stamp as { url?: string } | undefined;
    const fieldSource = settings.active_field_source as string | undefined;
    const fields: FieldPos[] = fieldSource === "ai"
      ? (settings.receipt_fields_ai as FieldPos[] | undefined) ?? []
      : (settings.receipt_fields as FieldPos[] | undefined) ?? [];

    if (!templateMeta?.url) throw new Error("Aucun template PDF configuré");

    // Fetch template PDF
    const tmplRes = await fetch(templateMeta.url);
    const tmplBytes = new Uint8Array(await tmplRes.arrayBuffer());

    const pdfDoc = await PDFDocument.load(tmplBytes);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const pages = pdfDoc.getPages();
    const page = pages[0];
    const { width, height } = page.getSize();

    // Fetch stamp if configured
    let stampImg: Awaited<ReturnType<typeof pdfDoc.embedPng>> | null = null;
    if (stampMeta?.url) {
      const stampRes = await fetch(stampMeta.url);
      const stampBytes = new Uint8Array(await stampRes.arrayBuffer());
      stampImg = await pdfDoc.embedPng(stampBytes);
    }

    // Draw each field
    for (const f of fields) {
      const value = fieldData[f.key] ?? "";
      const px = (f.x / 100) * width;
      const py = height - (f.y / 100) * height;

      if (f.key === "stamp" && stampImg && value === "true") {
        const sw = 120;
        const aspect = stampImg.width / stampImg.height;
        const sh = sw / aspect;
        page.drawImage(stampImg, {
          x: px - sw / 2,
          y: py - sh / 2,
          width: sw,
          height: sh,
          opacity: 0.85,
        });
      } else if (value) {
        page.drawText(value, {
          x: px,
          y: py,
          size: 11,
          font,
          color: rgb(0.1, 0.1, 0.1),
        });
      }
    }

    const pdfBytes = await pdfDoc.save();

    // Upload generated PDF to storage
    const filePath = `receipts/${clientId}/${paymentId}.pdf`;
    const { error: upErr } = await supabaseAdmin.storage
      .from("school-documents")
      .upload(filePath, pdfBytes, { contentType: "application/pdf", upsert: true });
    if (upErr) throw new Error(`Upload PDF échoué: ${upErr.message}`);

    const { data: pub } = supabaseAdmin.storage.from("school-documents").getPublicUrl(filePath);
    return { url: pub.publicUrl };
  });
