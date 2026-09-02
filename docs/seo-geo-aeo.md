# SEO / GEO / AEO — Implementation & Operations Guide

This documents how SKEMA's public site is structured for traditional search
engines (SEO), AI search/answer engines (GEO) and direct-answer systems (AEO),
and the privacy rules that keep private data out of every public surface.

## Public route indexability rules

| Route | Indexable? | Notes |
|---|---|---|
| `/` (landing) | Yes | Unique metadata, canonical, JSON-LD |
| `/privacy` | Yes | Compliance page, minimal |
| `/login` | No | `noindex, nofollow` meta + robots disallow |
| `/dashboard*` | No | `noindex, nofollow` meta + robots disallow |
| `/superadmin*` | No | `noindex, nofollow` meta + robots disallow |

Private pages must also require authentication (existing guard in
`DashShell` / `SuperadminLayout`). `robots.txt` is only a first layer; the
`noindex` meta and the auth guards are the real protection.

## Private route noindex rules

Every dashboard/superadmin route `head()` calls `buildMeta({ ..., noindex: true })`,
which emits `<meta name="robots" content="noindex, nofollow">`. Adding a new
private route: apply `buildMeta` with `noindex: true` and never add it to the
sitemap.

## Metadata architecture

- Central builder: `src/lib/seo/metadata.ts` → `buildMeta(input)`
- Site identity: `src/lib/seo/site.ts` (name, canonical origin, locale, OG image)
- JSON-LD builders: `src/lib/seo/schema.ts`

Every public page must set unique `title`, `description`, `canonical`, `robots`,
`og:*`, and `twitter:*`. Titles/descriptions are written for humans in French and
must match the page's real content — no keyword stuffing.

## Canonical URL strategy

- Canonical origin is `https://skema.eiden-group.com` (constant in `site.ts`)
- All canonical URLs use HTTPS, the production hostname, and no query params
- No trailing-slash drift: `/` stays `/`, everything else strips trailing slash
- Preview/staging deployments never publish their own URL as canonical
- Private pages get a canonical to their own (noindex) URL, never to a public page

## robots.txt strategy

`public/robots.txt`:

- Googlebot / Bingbot / Twitterbot / facebookexternalhit: crawl `/` public paths
- AI crawlers (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, ChatGPT-User):
  allowed on public pages, disallowed on private — GEO visibility objective
- `*`: allowed on public pages
- `Disallow`: `/dashboard`, `/superadmin`, `/login`, `/api`
- Sitemap reference included

Do not rely on robots.txt alone — it is layered with `noindex` meta tags.

## Sitemap generation

`public/sitemap.xml` is a static XML file listing only public, indexable URLs:

- `https://skema.eiden-group.com/`
- `https://skema.eiden-group.com/privacy`

No private routes, no login, no redirects. If dynamic public content is added
later, migrate to a generated sitemap (server route) and keep the same
whitelist logic.

## Structured-data strategy

JSON-LD is emitted as `<script type="application/ld+json">` from each page's
`head()` (TanStack Start `scripts` array). Types used:

| Type | Page | Content |
|---|---|---|
| `Organization` | `/`, `/privacy` | EIDEN GROUP (name, URL, logo, contact email) |
| `WebApplication` | `/` | SKEMA product (name, URL, category, provider) |
| `WebSite` | `/` | Website identity |
| `FAQPage` | `/` | The visible FAQ on the landing page |

Rules:

- Schema must exactly match visible content
- `FAQPage` only on pages with real, visible FAQs (the landing FAQ section)
- No fabricated ratings, reviews, prices, or statistics
- No `SearchAction` (no public site-search feature exists)
- No `LocalBusiness` markup (no verified physical public location added)
- Validate with Google Rich Results Test / Schema Markup Validator after edits

## Organization & product entity definitions

Consistent naming across the whole public site and metadata:

- **Product name:** SKEMA
- **Company / publisher:** EIDEN GROUP
- **What it does:** school / tutoring-centre management software (families,
  students, fees & payments, planning, reports, communication)
- **Where it operates:** private schools and support centres in Morocco and France
- **Contact:** `contact@eiden-group.com` and the landing demo form

## FAQ & AEO content rules

- FAQ answers are answer-first (concise direct answer, then detail)
- Questions mirror real user search intent and are product-accurate
- The FAQ list lives in `src/routes/index.tsx` (`FAQ_ITEMS`) — keep it in sync
  with the FAQPage schema (same constant feeds both)
- No irrelevant or unsupported FAQ entries
- Structure supports featured snippets: short self-contained paragraphs,
  descriptive headings, real H2/H3 hierarchy

## Keyword & search-intent map

Current public content is French and focuses on:

- school / tutoring-centre management software (logiciel de gestion école/centre)
- family & student management (gestion familles et élèves)
- school fees, payments & invoices (frais de scolarité, paiements, facturation)
- planning & calendar (planning, calendrier, emploi du temps)
- reports & communication with parents (rapports, communication WhatsApp)
- local/regional: Morocco & France, private education sector
- branded: SKEMA, EIDEN GROUP
- conversion goal on every public page: demo request

Do not create doorway pages, fake city pages, or near-duplicate pages for minor
keyword variations.

## Internal-linking strategy

- Nav + footer link landing sections and `/privacy`
- FAQ answers point to relevant landing sections (`#app`, `#modules`, `#tarifs`, `#demo`)
- Anchor text is descriptive; no tracking-parameter noise
- No orphan public pages

## Localization & hreflang strategy

The public site is French-only today (`<html lang="fr">`). Arabic exists inside
the authenticated app but the public site does not ship an AR variant, so no
`hreflang` pairs are emitted. If localized public pages are added later:

- per-locale URLs with self-referencing `hreflang` + `x-default`
- localized metadata, OG, and JSON-LD
- no machine-translated low-quality content

## Local SEO rules

No `LocalBusiness` schema and no fake location pages: EIDEN GROUP/SKEMA's public
site does not publish a verified physical retail address, so local business
markup would be misleading.

## Images & accessibility

- Public images already carry descriptive alt text and width/height
- OG image: `https://skema.eiden-group.com/skema-assets/skema-logo-official.png`
- Keep essential information in HTML text, not inside images
- Public pages must stay keyboard-navigable with visible focus and correct
  heading order (they inherit the shared design tokens)

## Performance requirements

- Analytics and replay are lazy-loaded / async; they never block LCP/rendering
- Public pages remain server-rendered; keep heavy client-only widgets off the
  landing where possible
- Do not add banner/layout-shift churn; the consent banner is fixed-position
  and non-intrusive

## Search Console & Bing Webmaster setup

1. Verify the domain in Google Search Console and Bing Webmaster Tools using
   DNS or the meta tag. Meta-tag tokens can be supplied via
   `PUBLIC_GOOGLE_SITE_VERIFICATION` and `PUBLIC_BING_SITE_VERIFICATION` (server
   env) and are rendered by `buildMeta`.
2. Submit `https://skema.eiden-group.com/sitemap.xml` in both tools.
3. Configure the preferred domain (https, no www) and monitor:
   - Index coverage (no private URLs indexed)
   - Core Web Vitals report
   - Rich-results / structured-data report (FAQPage)
4. AI-visibility monitoring is external (Perplexity/ChatGPT/Google AI Overview
   checks) — use the Search Console + PageSpeed baseline plus manual spot-checks.

## AI crawler policy

- Public marketing pages: AI crawlers allowed (GEO objective)
- Authenticated pages and APIs: disallowed via robots.txt AND auth guards
- No weakening of auth, no exposing private/API routes
- Documented here and in `public/robots.txt`

## Routes intentionally excluded from indexing

`/login`, `/dashboard`, `/superadmin` (and children) are excluded because they
contain authenticated, user-specific and financial data. Their content must never
appear in SERPs, sitemaps, JSON-LD, or crawlable HTML.

## Validation checklist

- `npm run build`
- Unique title + description per public page (landing, privacy)
- Canonical = `https://skema.eiden-group.com/...` (and `/`)
- robots.txt + sitemap.xml reachable and correct
- Public pages render without authentication; private pages 404/redirect or
  render behind auth and are `noindex`
- Validate JSON-LD (Rich Results Test / validator) and OG preview (sharing
  debugger)
- No PII/secret in any metadata, schema, sitemap or robots output
