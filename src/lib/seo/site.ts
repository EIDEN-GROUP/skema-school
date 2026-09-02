/**
 * Central site identity constants used by the SEO/GEO/AEO metadata layer.
 *
 * The canonical URL always points at the production domain so preview/staging
 * deployments never leak as canonicals. `PUBLIC_SITE_URL` (server-only env) can
 * override it for genuine multi-domain setups, but it defaults to production.
 */

const PRODUCTION_SITE_URL = "https://skema.eiden-group.com";

function resolveSiteUrl(): string {
  // Server-side: allow PUBLIC_SITE_URL to override. Client bundles fall back to
  // the production constant so canonicals stay stable everywhere.
  if (typeof process !== "undefined" && process.env?.PUBLIC_SITE_URL) {
    return process.env.PUBLIC_SITE_URL.replace(/\/+$/, "");
  }
  return PRODUCTION_SITE_URL;
}

export const SITE_URL = resolveSiteUrl();

export const SITE_NAME = "SKEMA";
export const SITE_TAGLINE =
  "Logiciel de gestion pour écoles et centres privés : familles, élèves, paiements, planning, rapports et communication.";
export const DEFAULT_LOCALE = "fr_FR";
export const DEFAULT_LANG = "fr";
export const COMPANY_NAME = "EIDEN GROUP";

export const ORG_DESCRIPTION =
  "EIDEN GROUP est l'éditeur de SKEMA, le logiciel de gestion tout-en-un pour les écoles et centres de soutien privés au Maroc et en France.";

export const LOGO_URL = `${SITE_URL}/skema-logo.png`;
export const OG_IMAGE_URL = `${SITE_URL}/skema-assets/skema-logo-official.png`;

// Search-engine verification tokens (server env). Empty when not configured.
export function googleSiteVerification(): string {
  return typeof process !== "undefined" && process.env?.PUBLIC_GOOGLE_SITE_VERIFICATION
    ? process.env.PUBLIC_GOOGLE_SITE_VERIFICATION
    : "";
}

export function bingSiteVerification(): string {
  return typeof process !== "undefined" && process.env?.PUBLIC_BING_SITE_VERIFICATION
    ? process.env.PUBLIC_BING_SITE_VERIFICATION
    : "";
}

/** Build an absolute canonical URL for a given path (keeps trailing-slash rules consistent). */
export function canonicalUrl(path: string): string {
  const clean = path === "/" ? "/" : path.replace(/\/+$/, "");
  return `${SITE_URL}${clean}`;
}
