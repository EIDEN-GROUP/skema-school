import { SITE_NAME, SITE_URL, COMPANY_NAME, ORG_DESCRIPTION, LOGO_URL, canonicalUrl } from "./site";

/**
 * JSON-LD structured data builders (schema.org).
 *
 * Only verified, product-supported facts are emitted. No fabricated ratings,
 * reviews, awards, prices or statistics.
 */

/** EIDEN GROUP — the organization behind SKEMA. */
export function organizationSchema(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: COMPANY_NAME,
    url: SITE_URL,
    logo: LOGO_URL,
    description: ORG_DESCRIPTION,
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: "contact@eiden-group.com",
        url: `${SITE_URL}/#demo`,
      },
    ],
  };
}

/** SKEMA — the web application (provider: EIDEN GROUP). */
export function webApplicationSchema(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "@id": `${SITE_URL}/#application`,
    name: SITE_NAME,
    url: SITE_URL,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    browserRequirements: "Requires a modern web browser",
    description:
      "SKEMA est un logiciel de gestion tout-en-un pour les écoles et centres privés : familles, élèves, notes, absences, paiements, facturation, planning, rapports et communication WhatsApp.",
    provider: {
      "@id": `${SITE_URL}/#organization`,
      name: COMPANY_NAME,
    },
    offers: {
      "@type": "Offer",
      description: "Tarification par établissement selon l'effectif. Démo gratuite.",
      url: `${SITE_URL}/#tarifs`,
    },
  };
}

/** Website root (no SearchAction — no public site-search feature exists). */
export function webSiteSchema(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: SITE_NAME,
    url: SITE_URL,
    description:
      "SKEMA, la solution de gestion scolaire tout-en-un pour les écoles privées, les centres de soutien et les établissements scolaires.",
    publisher: { "@id": `${SITE_URL}/#organization` },
    inLanguage: "fr",
  };
}

export interface FaqItem {
  question: string;
  answer: string;
}

/** FAQPage — only for pages that visibly contain the exact same Q&As. */
export function faqSchema(items: FaqItem[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export interface BreadcrumbItem {
  name: string;
  path: string;
}

/** BreadcrumbList — must match visible navigation and canonical URLs. */
export function breadcrumbSchema(items: BreadcrumbItem[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: canonicalUrl(item.path),
    })),
  };
}
