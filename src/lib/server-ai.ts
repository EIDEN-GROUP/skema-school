import { createServerFn } from "@tanstack/react-start";

type FieldPos = { key: string; x: number; y: number };

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
const FALLBACK_MODEL = "qwen/qwen3.6-27b";

const ALL_FIELDS = [
  "school_name", "school_address", "school_phone",
  "receipt_number", "date", "parent_name", "children_names",
  "period", "monthly_fee", "remise", "discount_amount",
  "amount_due", "amount_paid", "payment_date", "remaining", "payment_mode",
  "stamp",
];

function groqKeys(): string[] {
  const keys: string[] = [];
  for (let i = 1; i <= 5; i++) {
    const k = process.env[`GROQ_API_KEY_${i}`] as string | undefined;
    if (k?.trim()) keys.push(k.trim());
  }
  return keys;
}

async function callGroq(
  apiKey: string,
  base64Png: string,
  model: string,
): Promise<{ choices: { message: { content: string } }[] }> {
  const body = JSON.stringify({
    model,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `This is a school receipt PDF template (first page rendered as image).

Analyse the layout and tell me where to place each of these fields on the page.
Fields: ${ALL_FIELDS.join(", ")}

The "stamp" field is a circular school stamp (120px wide) — place it where a stamp would naturally go (centred on x,y). All other fields are text (11px font).

Return ONLY a valid JSON array with objects {key: string, x: number, y: number} where x and y are percentage positions (0-100, where 0,0 = top-left corner of the page).

Position the fields where they naturally belong on a receipt form. For example:
- school_name near the top centre
- receipt_number and date in a small row near the top-right
- parent_name and children_names aligned left in the middle
- period, monthly_fee, remise, discount_amount, amount_due, amount_paid, payment_date, remaining, payment_mode in a table-like area below
- stamp near the bottom-right or bottom-centre
- school_address and school_phone below the school name

Return ONLY the JSON array, no explanation.`,
          },
          {
            type: "image_url",
            image_url: { url: `data:image/png;base64,${base64Png}` },
          },
        ],
      },
    ],
    max_tokens: 4096,
    temperature: 0.1,
  });

  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(GROQ_ENDPOINT, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body,
    });

    if (res.ok) return res.json();

    if (res.status === 429) {
      const wait = Math.min(1000 * 2 ** attempt, 15000);
      await new Promise((r) => setTimeout(r, wait));
      continue;
    }

    const text = await res.text().catch(() => "");
    throw new Error(`Groq HTTP ${res.status}: ${text.slice(0, 200)}`);
  }

  throw new Error(`Groq HTTP 429: taux limite atteint après 5 tentatives`);
}

function safeParse(json: string): FieldPos[] | null {
  try {
    const parsed = JSON.parse(json);
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (f): f is FieldPos =>
          typeof f.key === "string" &&
          typeof f.x === "number" &&
          typeof f.y === "number" &&
          ALL_FIELDS.includes(f.key),
      );
    }
    // Try extracting from a nested object
    if (parsed?.fields && Array.isArray(parsed.fields)) {
      return parsed.fields.filter(
        (f: any): f is FieldPos =>
          typeof f.key === "string" &&
          typeof f.x === "number" &&
          typeof f.y === "number" &&
          ALL_FIELDS.includes(f.key),
      );
    }
    return null;
  } catch {
    return null;
  }
}

export const analyzePdfTemplate = createServerFn({ method: "POST" })
  .validator((d: { base64Png: string }) => d)
  .handler(async ({ data: { base64Png } }) => {
    const keys = groqKeys();
    if (keys.length === 0) {
      return { ok: false as const, error: "Aucune clé Groq configurée. Ajoutez GROQ_API_KEY_1 dans .env." };
    }

    const models = [MODEL, FALLBACK_MODEL];
    let lastErr = "";

    for (const key of keys) {
      for (const model of models) {
        try {
          const json = await callGroq(key, base64Png, model);
          const content = json.choices?.[0]?.message?.content ?? "";
          const fields = safeParse(content);

          if (fields && fields.length >= 5) {
            return { ok: true as const, fields, model };
          }

          lastErr = `Réponse invalide de l'IA (${fields?.length ?? 0} champs valides)`;

        } catch (err) {
          lastErr = err instanceof Error ? err.message : "Erreur inconnue";
          continue;
        }
      }
    }

    return { ok: false as const, error: lastErr || "Échec après toutes les tentatives" };
  });
