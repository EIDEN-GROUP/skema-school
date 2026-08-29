import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/lib/supabase-server";
import type { ChildInfo } from "@/lib/database-types";

export type ClientInput = {
  parent_name: string;
  child_name: string;
  child_age?: string;
  email?: string;
  email2?: string;
  phone?: string;
  phone2?: string;
  cin?: string;
  cin_mother?: string;
  father_name?: string;
  mother_name?: string;
  profession_father?: string;
  profession_mother?: string;
  address?: string;
  child_names?: ChildInfo[];
  subscribed_frais?: string[];
  dob?: string;
  level?: string;
  crm_stage?: "nouveau" | "converti";
  monthly_fee?: number;
  payment_day?: number;
  notes?: string;
  whatsapp_optin?: boolean;
  transport?: boolean;
  cantine?: boolean;
  garderie?: boolean;
  activites?: boolean;
  fratrie?: number;
  remise?: number;
  subscribed_services?: string[];
};

function parseCsv(text: string): Record<string, string>[] {
  // Strip BOM
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  // Normalise line endings: \r\n → \n, then \r → \n
  text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // Naive line split — same as client-side parser (handles quoted commas correctly
  // because field-level parsing is delegated to parseCsvLine)
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map((h) => h.trim());
  const result: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, j) => { row[h] = (values[j] ?? "").trim(); });
    result.push(row);
  }
  return result;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function toBool(v: string): boolean {
  return ["true", "1", "oui", "yes", "on"].includes(v.toLowerCase());
}

function tryParseJsonArray<T>(v: string): T[] {
  try {
    const parsed = JSON.parse(v);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export const importClientsCsv = createServerFn({ method: "POST" })
  .validator((input: { csvText: string }) => input)
  .handler(async ({ data }) => {
    const rows = parseCsv(data.csvText);
    let imported = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const parentName = r["parent_name"] || r["Parent"] || "";
      if (!parentName) {
        errors.push(`Ligne ${i + 2}: parent_name manquant`);
        continue;
      }

      const childNamesRaw = r["child_names"];
      let childNames: ChildInfo[] = [];
      if (childNamesRaw) {
        childNames = tryParseJsonArray<ChildInfo>(childNamesRaw);
      } else {
        childNames = [{ name: r["child_name"] || r["Enfant"] || "", dob: "", cycle: "", level: r["level"] || r["Niveau"] || "", services: [], frais: [] }];
      }

      const input: ClientInput = {
        parent_name: parentName,
        child_name: childNames.map((c) => c.name).join(", "),
        child_age: r["child_age"] || "",
        email: r["email"] || r["Email"] || "",
        email2: r["email2"] || "",
        phone: r["phone"] || r["Téléphone"] || r["Telephone"] || "",
        phone2: r["phone2"] || "",
        cin: r["cin"] || r["CIN"] || "",
        cin_mother: r["cin_mother"] || "",
        father_name: r["father_name"] || r["Père"] || r["Pere"] || "",
        mother_name: r["mother_name"] || r["Mère"] || r["Mere"] || "",
        profession_father: r["profession_father"] || "",
        profession_mother: r["profession_mother"] || "",
        address: r["address"] || r["Adresse"] || "",
        child_names: childNames,
        subscribed_frais: tryParseJsonArray<string>(r["subscribed_frais"] || "[]"),
        dob: r["dob"] || r["Date de naissance"] || "",
        level: r["level"] || r["Niveau"] || "",
        crm_stage: (r["crm_stage"] === "converti" ? "converti" : "nouveau") as "nouveau" | "converti",
        monthly_fee: Number(r["monthly_fee"] || r["Frais mensuels"] || 0) || 0,
        payment_day: Number(r["payment_day"] || r["Jour de paiement"] || 1) || 1,
        notes: r["notes"] || r["Notes"] || "",
        whatsapp_optin: r["whatsapp_optin"] ? toBool(r["whatsapp_optin"]) : true,
        transport: r["transport"] ? toBool(r["transport"]) : false,
        cantine: r["cantine"] ? toBool(r["cantine"]) : false,
        garderie: r["garderie"] ? toBool(r["garderie"]) : false,
        activites: r["activites"] ? toBool(r["activites"]) : false,
        fratrie: (() => {
          const v = r["fratrie"] || "1";
          const n = v.toLowerCase() === "true" ? 1 : v.toLowerCase() === "false" ? 0 : Number(v);
          return Number.isFinite(n) ? n : 1;
        })(),
        remise: Number(r["remise"] || 0) || 0,
        subscribed_services: tryParseJsonArray<string>(r["subscribed_services"] || "[]"),
      };

      try {
        const { error: insertError } = await supabaseAdmin.from("clients").insert(input);
        if (insertError) throw insertError;
        imported++;
      } catch (e) {
        const msg = e instanceof Error ? e.message : typeof e === "object" && e !== null ? (e as Record<string, unknown>).message || JSON.stringify(e) : String(e);
        errors.push(`Ligne ${i + 2}: ${msg}`);
      }
    }

    return { imported, errors };
  });

export const listClients = createServerFn({ method: "GET" })
  .handler(async () => {
    const { data, error } = await supabaseAdmin
      .from("clients")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getClient = createServerFn({ method: "GET" })
  .validator((id: string) => id)
  .handler(async ({ data: id }) => {
    const { data, error } = await supabaseAdmin
      .from("clients")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw new Error(error.message);
    return data;
  });

export const createClient = createServerFn({ method: "POST" })
  .validator((input: ClientInput) => input)
  .handler(async ({ data }) => {
    const { data: result, error } = await supabaseAdmin
      .from("clients")
      .insert({
        parent_name: data.parent_name,
        child_name: data.child_name,
        child_age: data.child_age ?? "",
        email: data.email ?? "",
        email2: data.email2 ?? "",
        phone: data.phone ?? "",
        phone2: data.phone2 ?? "",
        cin: data.cin ?? "",
        cin_mother: data.cin_mother ?? "",
        father_name: data.father_name ?? "",
        mother_name: data.mother_name ?? "",
        profession_father: data.profession_father ?? "",
        profession_mother: data.profession_mother ?? "",
        address: data.address ?? "",
        child_names: data.child_names ?? [],
        subscribed_frais: data.subscribed_frais ?? [],
        dob: data.dob ?? "",
        level: data.level ?? "",
        crm_stage: data.crm_stage ?? "nouveau",
        monthly_fee: data.monthly_fee ?? 0,
        payment_day: data.payment_day ?? 1,
        notes: data.notes ?? "",
        whatsapp_optin: data.whatsapp_optin ?? true,
        transport: data.transport ?? false,
        cantine: data.cantine ?? false,
        garderie: data.garderie ?? false,
        activites: data.activites ?? false,
        fratrie: data.fratrie ?? 1,
        remise: data.remise ?? 0,
        subscribed_services: data.subscribed_services ?? [],
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return result;
  });

export const updateClient = createServerFn({ method: "POST" })
  .validator((input: { id: string } & Partial<ClientInput>) => input)
  .handler(async ({ data }) => {
    const { id, ...fields } = data;
    const { data: result, error } = await supabaseAdmin
      .from("clients")
      .update(fields)
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return result;
  });

export const deleteClient = createServerFn({ method: "POST" })
  .validator((id: string) => id)
  .handler(async ({ data: id }) => {
    const { error } = await supabaseAdmin
      .from("clients")
      .delete()
      .eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
