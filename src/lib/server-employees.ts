import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/lib/supabase-server";

export type EmployeeInput = {
  full_name: string;
  position?: string;
  department?: string;
  email?: string;
  personal_email?: string;
  phone?: string;
  phone2?: string;
  cin?: string;
  birth_date?: string;
  hire_date?: string;
  address?: string;
  contract_type?: string;
  salary?: number;
  leave_start?: string;
  leave_end?: string;
  status?: "actif" | "inactif";
};

export const listEmployees = createServerFn({ method: "GET" })
  .handler(async () => {
    const { data, error } = await supabaseAdmin
      .from("employees")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createEmployee = createServerFn({ method: "POST" })
  .validator((input: EmployeeInput) => input)
  .handler(async ({ data }) => {
    const { data: result, error } = await supabaseAdmin
      .from("employees")
      .insert({
        full_name: data.full_name,
        position: data.position ?? "",
        department: data.department ?? "",
        email: data.email ?? "",
        personal_email: data.personal_email ?? "",
        phone: data.phone ?? "",
        phone2: data.phone2 ?? "",
        cin: data.cin ?? "",
        birth_date: data.birth_date ?? "",
        hire_date: data.hire_date ?? "",
        address: data.address ?? "",
        contract_type: data.contract_type ?? "",
        salary: data.salary ?? 0,
        leave_start: data.leave_start ?? undefined,
        leave_end: data.leave_end ?? null,
        status: data.status ?? "actif",
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return result;
  });

export const updateEmployee = createServerFn({ method: "POST" })
  .validator((input: { id: string } & Partial<EmployeeInput>) => input)
  .handler(async ({ data }) => {
    const { id, ...fields } = data;
    const { data: result, error } = await supabaseAdmin
      .from("employees")
      .update(fields)
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return result;
  });

export const deleteEmployee = createServerFn({ method: "POST" })
  .validator((id: string) => id)
  .handler(async ({ data: id }) => {
    const { error } = await supabaseAdmin
      .from("employees")
      .delete()
      .eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

function parseCsv(text: string): Record<string, string>[] {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
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

function toNumber(v: string): number {
  const cleaned = v.replace(/[^\d.,\-]/g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

export const importEmployeesCsv = createServerFn({ method: "POST" })
  .validator((input: { csvText: string }) => input)
  .handler(async ({ data }) => {
    const rows = parseCsv(data.csvText);
    let imported = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const fullName = r["full_name"] || r["Nom complet"] || r["nom_complet"] || r["Nom Complet"] || "";
      if (!fullName) {
        errors.push(`Ligne ${i + 2}: nom complet manquant`);
        continue;
      }

      const input: EmployeeInput = {
        full_name: fullName,
        position: r["position"] || r["Poste"] || r["poste"] || "",
        department: r["department"] || r["Département"] || r["Departement"] || r["departement"] || "",
        email: r["email"] || r["Email"] || "",
        personal_email: r["personal_email"] || r["Email personnel"] || r["email_perso"] || "",
        phone: r["phone"] || r["Téléphone"] || r["Telephone"] || r["tel"] || "",
        phone2: r["phone2"] || r["Téléphone 2"] || r["Telephone 2"] || r["tel2"] || "",
        cin: r["cin"] || r["CIN"] || "",
        birth_date: r["birth_date"] || r["Date de naissance"] || r["date_naissance"] || "",
        hire_date: r["hire_date"] || r["Date d'embauche"] || r["date_embauche"] || "",
        address: r["address"] || r["Adresse"] || r["adresse"] || "",
        contract_type: r["contract_type"] || r["Type de contrat"] || r["contrat"] || "",
        salary: toNumber(r["salary"] || r["Salaire"] || r["salaire"] || "0"),
        leave_start: r["leave_start"] || r["Début congé"] || r["conge_debut"] || undefined,
        leave_end: r["leave_end"] || r["Fin congé"] || r["conge_fin"] || undefined,
        status: (r["status"] === "inactif" || r["Statut"] === "inactif" ? "inactif" : "actif") as "actif" | "inactif",
      };

      try {
        const { error: insertError } = await supabaseAdmin.from("employees").insert(input);
        if (insertError) throw insertError;
        imported++;
      } catch (e) {
        const msg = e instanceof Error ? e.message : typeof e === "object" && e !== null ? (e as Record<string, unknown>).message || JSON.stringify(e) : String(e);
        errors.push(`Ligne ${i + 2}: ${msg}`);
      }
    }

    return { imported, errors };
  });
