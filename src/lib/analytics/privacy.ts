/**
 * Privacy helpers for analytics: consent state, safe-value builders and the
 * session-replay route policy.
 *
 * Privacy-by-design rules enforced here (and documented in docs/analytics.md):
 * - Never send student/parent names, emails, phones, addresses, notes, message
 *   bodies, credentials, tokens, or raw financial records.
 * - Monetary values are only sent as coarse buckets via `amountBucket`.
 * - URLs are sanitized before tracking (query params / secrets stripped).
 */

import type { AmountBucket, ErrorType, PaymentMethod, ReferrerCategory } from "./types";

// ---------------------------------------------------------------------------
// Consent
// ---------------------------------------------------------------------------

export type ConsentState = "accepted" | "declined" | "pending";

export const CONSENT_STORAGE_KEY = "skema_analytics_consent";

function safeLocalStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    // Private mode / blocked storage — analytics simply stays gated.
    return null;
  }
}

export function getConsent(): ConsentState {
  const storage = safeLocalStorage();
  if (!storage) return "pending";
  const value = storage.getItem(CONSENT_STORAGE_KEY);
  return value === "accepted" ? "accepted" : value === "declined" ? "declined" : "pending";
}

export function setConsentState(state: Exclude<ConsentState, "pending">): void {
  const storage = safeLocalStorage();
  if (!storage) return;
  try {
    storage.setItem(CONSENT_STORAGE_KEY, state);
  } catch {
    /* ignore */
  }
}

export function hasConsentDecision(): boolean {
  return getConsent() !== "pending";
}

export function isConsentAccepted(): boolean {
  return getConsent() === "accepted";
}

// ---------------------------------------------------------------------------
// Safe value builders
// ---------------------------------------------------------------------------

/** Coarse, privacy-safe buckets for monetary values (MAD). Never send raw amounts. */
export function amountBucket(value: number | null | undefined): AmountBucket | undefined {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return undefined;
  if (n <= 500) return "0-500";
  if (n <= 2000) return "500-2000";
  if (n <= 5000) return "2000-5000";
  return "5000+";
}

export function paymentMethod(mode: string | null | undefined): PaymentMethod {
  switch ((mode ?? "").toLowerCase()) {
    case "especes":
    case "cash":
    case "espèces":
      return "cash";
    case "virement":
    case "transfer":
      return "transfer";
    case "carte":
    case "card":
      return "card";
    case "cheque":
    case "chèque":
    case "check":
      return "check";
    default:
      return "unknown";
  }
}

/** Classify a thrown error / Supabase message into a coarse, non-sensitive type. */
export function errorType(err: unknown): ErrorType {
  if (err && typeof err === "object" && "status" in err) {
    const status = (err as { status?: unknown }).status;
    if (typeof status === "number") {
      if (status === 400 || status === 422) return "validation";
      if (status === 401 || status === 403) return "forbidden";
      if (status === 404) return "not_found";
      if (status === 429) return "rate_limited";
      if (status >= 500) return "server";
    }
  }
  const message = err instanceof Error ? err.message : String(err ?? "");
  const lower = message.toLowerCase();
  if (/(invalid login|invalid credentials|wrong|incorrect|not found|no user)/.test(lower)) {
    return "invalid_credentials";
  }
  if (/(too many|rate limit|throttled|429)/.test(lower)) return "rate_limited";
  if (/(network|fetch|failed to fetch|load failed|timeout|econnaborted|econnreset)/.test(lower)) {
    return "network";
  }
  if (/(validate|required|invalid|doit contenir|requis)/.test(lower)) return "validation";
  return "unknown";
}

/** Human error message is never sent — only the coarse type. */
export function toSafeError(error: unknown): { error_type: ErrorType } {
  return { error_type: errorType(error) };
}

// ---------------------------------------------------------------------------
// URL / referrer sanitization
// ---------------------------------------------------------------------------

/** Keeps only the pathname + known-safe query params (utm_*), never tokens/secrets. */
export function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(
      url,
      typeof window !== "undefined" ? window.location.origin : "https://skema.eiden-group.com",
    );
    const safe = new URL(parsed.origin + parsed.pathname);
    for (const key of [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "ref",
    ]) {
      const value = parsed.searchParams.get(key);
      if (value) safe.searchParams.set(key, value);
    }
    return safe.pathname === "/" ? "/" : safe.pathname.replace(/\/+$/, "");
  } catch {
    return "/";
  }
}

export function sanitizePath(pathname: string): string {
  if (!pathname) return "/";
  const clean = pathname.replace(/\/+/g, "/");
  return clean.length > 1 ? clean.replace(/\/+$/, "") : clean;
}

const SEARCH_ENGINE_RE =
  /(^|\.)(google\.|bing\.|duckduckgo\.|yandex\.|ecosia\.|qwant\.|search\.|baidu\.|naver\.)/i;
const SOCIAL_RE =
  /(^|\.)(facebook\.|instagram\.|linkedin\.|x\.com|twitter\.|tiktok\.|pinterest\.|youtube\.|wa\.me|whatsapp\.)/i;

/** Coarse referrer category. Search queries are never captured — only the category. */
export function referrerCategory(referrer?: string | null): ReferrerCategory {
  const ref = (referrer ?? "").trim();
  if (!ref) return "direct";
  try {
    const host = new URL(ref).hostname;
    if (SEARCH_ENGINE_RE.test(host)) return "organic";
    if (SOCIAL_RE.test(host)) return "social";
    return "referral";
  } catch {
    return "referral";
  }
}

export function getReferrer(): string {
  return typeof document === "undefined" ? "" : document.referrer;
}

export function isOrganicTraffic(): boolean {
  return referrerCategory(getReferrer()) === "organic";
}

// ---------------------------------------------------------------------------
// Session replay policy
// ---------------------------------------------------------------------------

/**
 * Session replay may ONLY run on public, non-authenticated marketing pages.
 * The authenticated application (families, students, payments, messages,
 * settings, admin, superadmin) is never recorded — no masking strategy can make
 * it safe enough to justify capturing it.
 */
export const REPLAY_ALLOWED_PREFIXES = ["/"];

export const REPLAY_DENY_PREFIXES = [
  "/login",
  "/dashboard",
  "/superadmin",
  "/reset-password",
  "/auth",
];

export function isReplayAllowedPath(pathname: string): boolean {
  if (!pathname) return false;
  if (REPLAY_DENY_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return false;
  }
  return REPLAY_ALLOWED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}`));
}
