import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/lib/supabase-server";

const BUCKET = "school-documents";

function base64ToBytes(base64: string): Uint8Array {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return bytes;
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

async function ensureBucket() {
  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  if (!buckets?.some((b) => b.name === BUCKET)) {
    const { error } = await supabaseAdmin.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: 10485760,
      allowedMimeTypes: ["application/pdf", "image/png"],
    });
    if (error) throw new Error(`Impossible de créer le bucket: ${error.message}`);
  }
}

export const uploadSchoolFile = createServerFn({ method: "POST" })
  .validator((input: { key: string; content: string; filename: string; contentType: string }) => input)
  .handler(async ({ data }) => {
    await ensureBucket();

    const bytes = base64ToBytes(data.content);
    const safeFilename = sanitizeFilename(data.filename);
    const filePath = `${data.key}/${Date.now()}_${safeFilename}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(filePath, bytes, { contentType: data.contentType, upsert: true });

    if (uploadError) throw new Error(`Upload échoué: ${uploadError.message}`);

    const { data: publicUrl } = supabaseAdmin.storage
      .from(BUCKET)
      .getPublicUrl(filePath);

    const meta = { url: publicUrl.publicUrl, filename: data.filename, updated_at: new Date().toISOString() };

    const { error: dbError } = await supabaseAdmin
      .from("settings")
      .upsert({ key: data.key, value: meta }, { onConflict: "key" });

    if (dbError) throw new Error(`Sauvegarde échouée: ${dbError.message}`);

    return meta;
  });

export const deleteSchoolFile = createServerFn({ method: "POST" })
  .validator((key: string) => key)
  .handler(async ({ data: key }) => {
    const { data: row } = await supabaseAdmin
      .from("settings")
      .select("value")
      .eq("key", key)
      .single();

    const meta = row?.value as { url?: string } | null;
    if (meta?.url) {
      const parts = meta.url.split(`/${BUCKET}/`);
      if (parts.length > 1) {
        const filePath = parts[1].split("?")[0];
        await supabaseAdmin.storage.from(BUCKET).remove([filePath]);
      }
    }

    const empty = { url: "", filename: "", updated_at: "" };
    await supabaseAdmin.from("settings").upsert({ key, value: empty }, { onConflict: "key" });

    return { ok: true };
  });
