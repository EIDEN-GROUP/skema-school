import {
  SITE_NAME,
  SITE_URL,
  DEFAULT_LOCALE,
  DEFAULT_LANG,
  OG_IMAGE_URL,
  googleSiteVerification,
  bingSiteVerification,
  canonicalUrl,
} from "./site";

export interface HeadMetaInput {
  title: string;
  description: string;
  path: string;
  ogImage?: string;
  noindex?: boolean;
  locale?: string;
  lang?: string;
  /** JSON-LD script(s) to inject. Each item becomes a separate `<script>` element. */
  jsonLd?: Record<string, unknown>[];
}

/**
 * Build a complete `<head>` metadata payload for a TanStack Start route.
 *
 * Supply the page title, description, path (route), and optional noindex,
 * locale override, or JSON-LD scripts. Returns `{ meta, links, scripts }`.
 */
export function buildMeta(input: HeadMetaInput): {
  meta: Record<string, string>[];
  links: Record<string, string>[];
  scripts: Record<string, unknown>[];
} {
  const locale = input.locale ?? DEFAULT_LOCALE;
  const lang = input.lang ?? DEFAULT_LANG;
  const image = input.ogImage ?? OG_IMAGE_URL;
  const canonical = canonicalUrl(input.path);
  const robotsValue = input.noindex ? "noindex, nofollow" : "index, follow";

  const meta: Record<string, string>[] = [
    { title: input.title },
    { name: "description", content: input.description },
    { name: "robots", content: robotsValue },
    { property: "og:title", content: input.title },
    { property: "og:description", content: input.description },
    { property: "og:url", content: canonical },
    { property: "og:image", content: image },
    { property: "og:type", content: "website" },
    { property: "og:locale", content: locale },
    { property: "og:site_name", content: SITE_NAME },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: input.title },
    { name: "twitter:description", content: input.description },
    { name: "twitter:image", content: image },
  ];

  // Search-engine verification meta tags (only rendered when configured)
  const gv = googleSiteVerification();
  const bv = bingSiteVerification();
  if (gv) meta.push({ name: "google-site-verification", content: gv });
  if (bv) meta.push({ name: "msvalidate.01", content: bv });

  // Language / locale
  if (lang)
    meta.push({ property: "og:locale:alternate", content: lang === "fr" ? "fr_FR" : "ar_MA" });

  const links: Record<string, string>[] = [{ rel: "canonical", href: canonical }];

  // JSON-LD scripts (injected as `<script type="application/ld+json">`)
  const scripts: Record<string, unknown>[] = (input.jsonLd ?? []).map((schema) => ({
    type: "application/ld+json",
    children: JSON.stringify(schema),
  }));

  return { meta, links, scripts };
}
