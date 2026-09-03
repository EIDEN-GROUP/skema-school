import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronRight, Check, Loader2 } from "lucide-react";
import { submitDemoRequest } from "@/lib/contact-demo";
import { buildMeta } from "@/lib/seo/metadata";
import {
  organizationSchema,
  webApplicationSchema,
  webSiteSchema,
  faqSchema,
  type FaqItem,
} from "@/lib/seo/schema";
import { track, errorType } from "@/lib/analytics";

import photoClasse from "@/assets/photo-classe.jpg";
import ctaVibe from "@/assets/landing/cta-vibe.png";
import stickerEssentiel from "@/assets/stickers/pricing/essentiel.png";
import stickerPro from "@/assets/stickers/pricing/pro.png";
import stickerReseau from "@/assets/stickers/pricing/reseau.png";
import stickerMaternelle from "@/assets/stickers/maternelle.png";
import stickerPrimaire from "@/assets/stickers/primaire.png";
import stickerCollege from "@/assets/stickers/college.png";
import stickerLycee from "@/assets/stickers/lycee.png";
import { Doodle, Note, Sticker, Underline } from "@/components/skema/bits";
import { Logo } from "@/components/skema/logo";
import { DashboardMock, FamillesMock, PaiementsMock } from "@/components/skema/mocks";

const FAQ_ITEMS: FaqItem[] = [
  {
    question: "Qu'est-ce que SKEMA ?",
    answer:
      "SKEMA est un logiciel de gestion tout-en-un pour les écoles privées, les centres de soutien et les établissements scolaires. Il centralise les familles et les élèves, les frais de scolarité et les paiements, le planning et les rendez-vous, les rapports et la communication avec les parents, dans une seule interface.",
  },
  {
    question: "Pour qui SKEMA est-il conçu ?",
    answer:
      "SKEMA est conçu pour les directions et équipes administratives d'écoles privées, de centres de soutien scolaire et d'établissements multi-niveaux, de la maternelle au lycée, principalement au Maroc et en France.",
  },
  {
    question: "Comment SKEMA gère-t-il les familles et les élèves ?",
    answer:
      "SKEMA conserve les fiches familles et élèves complètes : coordonnées, scolarité, services souscrits (cantine, garderie, transport, activités), remise fratrie et suivi des paiements mensuels, avec recherche et filtres par niveau ou service.",
  },
  {
    question: "Comment fonctionnent les paiements et les reçus ?",
    answer:
      "SKEMA suit les encaissements mois par mois, calcule automatiquement le statut de paiement (payé, en attente, retard, impayé), génère un reçu PDF personnalisé et envoie la confirmation aux parents par email et WhatsApp. Des relances de paiement peuvent être envoyées en quelques clics.",
  },
  {
    question: "SKEMA inclut-il un planning et un calendrier ?",
    answer:
      "Oui. SKEMA propose un planning hebdomadaire sans conflit de salle ni de professeur, un calendrier avec jours fériés marocains, vacances scolaires et planifications, ainsi qu'un suivi des rendez-vous et des congés de l'équipe.",
  },
  {
    question: "Comment SKEMA communique-t-il avec les parents ?",
    answer:
      "SKEMA dispose d'un centre de messages : envoi de messages individuels ou diffusés aux parents par WhatsApp ou email, notifications reçues des familles, et envoi automatique des reçus de paiement. Le contenu des messages n'est jamais partagé.",
  },
  {
    question: "Comment demander une démo de SKEMA ?",
    answer:
      "Utilisez le formulaire de démonstration sur cette page (bouton « Réserver ma démo gratuite »). Vous choisissez votre formule et votre effectif, et l'équipe EIDEN GROUP vous contacte sous 2 h ouvrées pour organiser une démo guidée de 30 minutes.",
  },
  {
    question: "Comment SKEMA protège-t-il les données sensibles ?",
    answer:
      "Les données des élèves et des familles restent privées et ne sont jamais vendues. Les informations sensibles (coordonnées, notes, messages) ne sont pas partagées et ne sont pas utilisées à des fins de marketing. Les données sont hébergées au Maroc et chiffrées.",
  },
];

export const Route = createFileRoute("/")({
  head: () =>
    buildMeta({
      title: "SKEMA · Logiciel de gestion pour écoles privées au Maroc",
      description:
        "SKEMA centralise élèves, notes, absences, emplois du temps et facturation de votre établissement privé : maternelle, primaire, collège et lycée. Démo gratuite.",
      path: "/",
      jsonLd: [organizationSchema(), webApplicationSchema(), webSiteSchema(), faqSchema(FAQ_ITEMS)],
    }),
  component: Landing,
});

const modules = [
  {
    name: "Académique",
    sticker: "cap",
    tone: "bg-lavande",
    accent: "text-violet",
    line: "Notes, bulletins et livrets générés automatiquement.",
  },
  {
    name: "Élèves",
    sticker: "backpack",
    tone: "bg-menthe",
    accent: "text-turquoise",
    line: "Dossiers, inscriptions et absences en temps réel.",
  },
  {
    name: "Finance",
    sticker: "invoice",
    tone: "bg-peche",
    accent: "text-corail",
    line: "Frais de scolarité, reçus et relances automatiques.",
  },
  {
    name: "Planning",
    sticker: "calendar",
    tone: "bg-bleu-doux",
    accent: "text-nuit",
    line: "Emplois du temps sans conflit de salle ni de prof.",
  },
  {
    name: "Communication",
    sticker: "bubble",
    tone: "bg-lavande",
    accent: "text-violet",
    line: "Messages, annonces et carnet de liaison numérique.",
  },
] as const;

const cycles = [
  {
    nom: "Maternelle",
    sticker: stickerMaternelle,
    alt: "Petite élève de maternelle en blouse corail tenant un gros crayon",
    fond: "bg-peche",
    accent: "text-corail",
    phrase:
      "Les frais de garderie et de cantine s'ajoutent au forfait de la famille, sans second fichier.",
  },
  {
    nom: "Primaire",
    sticker: stickerPrimaire,
    alt: "Élève de primaire avec son cartable, la main levée",
    fond: "bg-menthe",
    accent: "text-turquoise",
    phrase:
      "Une fratrie de trois enfants, une seule facture mensuelle et la remise appliquée d'office.",
  },
  {
    nom: "Collège",
    sticker: stickerCollege,
    alt: "Collégienne en blazer bleu nuit serrant un cahier contre elle",
    fond: "bg-lavande",
    accent: "text-violet",
    phrase: "Emplois du temps par matière, absences saisies en classe et transport suivi au mois.",
  },
  {
    nom: "Lycée",
    sticker: stickerLycee,
    alt: "Lycéen en bomber bleu nuit, besace violette en bandoulière",
    fond: "bg-bleu-doux",
    accent: "text-nuit",
    phrase:
      "Options, séances de soutien et examens blancs facturés à la séance, sans oubli en fin d'année.",
  },
] as const;

const etapes = [
  {
    n: "1",
    t: "On vous écoute",
    d: "Un audit rapide de votre organisation actuelle.",
    tape: "tape-corail",
    tilt: "-rotate-2",
  },
  {
    n: "2",
    t: "On importe tout",
    d: "Élèves, familles, classes et historique de notes.",
    tape: "tape-violet",
    tilt: "rotate-2",
  },
  {
    n: "3",
    t: "On forme l'équipe",
    d: "Deux ateliers suffisent, l'interface est intuitive.",
    tape: "tape-turquoise",
    tilt: "-rotate-1",
  },
  {
    n: "4",
    t: "Vous ouvrez l'année",
    d: "Chaque module s'active à votre rythme.",
    tape: "tape",
    tilt: "rotate-1",
  },
];

const tarifs = [
  {
    id: "essentiel",
    nom: "Essentiel",
    tag: "",
    img: stickerEssentiel,
    tape: "tape-turquoise",
    tilt: "-rotate-1",
    desc: "Un administrateur, l'essentiel du pilotage.",
    points: [
      "Fichier familles & élèves",
      "Planning & rendez-vous",
      "Rapports de base",
      "Support par email",
    ],
  },
  {
    id: "pro",
    nom: "Pro",
    tag: "Le plus populaire",
    img: stickerPro,
    tape: "tape-violet",
    tilt: "rotate-0",
    desc: "Équipe multi-rôles, relances et pilotage renforcé.",
    points: [
      "Tout Essentiel",
      "Paiements & relances automatiques",
      "Suivi des nouvelles demandes",
      "Exports & tableaux avancés",
      "Support prioritaire",
      "Onboarding + Formation + Support inclus",
    ],
  },
  {
    id: "reseau",
    nom: "Réseau",
    tag: "",
    img: stickerReseau,
    tape: "tape-corail",
    tilt: "rotate-1",
    desc: "Multi-sites, groupes et besoins sur mesure.",
    points: [
      "SLA dédié",
      "Intégrations & API",
      "Formation des équipes",
      "Accompagnement au déploiement",
    ],
  },
] as const;

const TIERS = [100, 250, 300] as const;
type Tier = (typeof TIERS)[number];
const MONTHS_OFF = 4; // annuel = 8 mois payés au lieu de 12

/**
 * Prix HT en MAD, calculé plutôt que fixé à la main :
 *   mensuel Essentiel = 1000 (base 100 élèves) + 5 MAD par élève au-delà de 100
 *   mensuel Pro       = 2 × Essentiel
 *   annuel            = 8 × le mensuel (4 mois offerts)
 * Résultat arrondi à la centaine.
 */
const priceFor = (plan: "essentiel" | "pro", students: Tier) => {
  const base = 1000 + 5 * (students - 100);
  const m = Math.round((plan === "pro" ? base * 2 : base) / 100) * 100;
  return { m, y: m * 8 };
};
const PRICE = {
  essentiel: Object.fromEntries(TIERS.map((n) => [n, priceFor("essentiel", n)])) as Record<
    Tier,
    { m: number; y: number }
  >,
  pro: Object.fromEntries(TIERS.map((n) => [n, priceFor("pro", n)])) as Record<
    Tier,
    { m: number; y: number }
  >,
};

type PlanId = "essentiel" | "pro" | "reseau";
type Selection = { plan: PlanId; tier: Tier; yearly: boolean };
const PLAN_NAME: Record<PlanId, string> = { essentiel: "Essentiel", pro: "Pro", reseau: "Réseau" };

/** Human-readable summary of a pricing choice, for the form + emails. */
function describeSelection(s: Selection): { title: string; price: string; line: string } {
  const nf = (n: number) => n.toLocaleString("fr-FR");
  const title = `${PLAN_NAME[s.plan]} · jusqu'à ${s.tier} élèves`;
  if (s.plan === "reseau") return { title, price: "sur mesure", line: `${title} · sur mesure` };
  const cell = PRICE[s.plan][s.tier];
  const price = s.yearly ? `${nf(cell.y)} MAD/an HT` : `${nf(cell.m)} MAD/mois HT`;
  return { title, price, line: `${title} · ${s.yearly ? "annuel" : "mensuel"} · ${price}` };
}

/** Section kicker — the SKEMA logo "E" bars + a hand-written label. Used on every section. */
function Kicker({
  children,
  tone = "text-turquoise",
  center = false,
}: {
  children: ReactNode;
  tone?: string;
  center?: boolean;
}) {
  return (
    <p className={`flex items-center gap-3 ${center ? "justify-center" : ""}`}>
      <span aria-hidden className="inline-flex flex-col gap-[3px]">
        <span className="h-[3px] w-4 rounded-full bg-violet" />
        <span className="h-[3px] w-4 rounded-full bg-turquoise" />
        <span className="h-[3px] w-4 rounded-full bg-corail" />
      </span>
      <span className={`font-hand text-2xl leading-none ${tone}`}>{children}</span>
    </p>
  );
}

const avis = [
  {
    quote:
      "Avant, la rentrée c'était trois semaines de paperasse. Cette année, tout était prêt en deux jours, et les parents nous écrivent directement depuis l'application.",
    name: "Salma Benjelloun",
    role: "Directrice, Groupe Scolaire Anfa",
    initials: "SB",
    tint: "bg-lavande text-violet",
  },
  {
    quote:
      "Les relances de paiement partent toutes seules. Le secrétariat passe trois fois moins de temps sur la facturation, et les impayés ont fondu.",
    name: "Karim Tazi",
    role: "Directeur, École Les Oliviers",
    initials: "KT",
    tint: "bg-menthe text-turquoise",
  },
  {
    quote:
      "Une seule vue pour les quatre niveaux. J'ouvre mon ordinateur le matin et je vois les encaissements du jour et les absences, sans rien chercher.",
    name: "Nadia El Amrani",
    role: "Fondatrice, Centre Al Manar",
    initials: "NA",
    tint: "bg-peche text-corail",
  },
];

function DemoForm({ selection, onClear }: { selection: Selection | null; onClear: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    contactName: "",
    center: "",
    email: "",
    phone: "",
    preferredDate: "",
  });
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState("");
  const startedRef = useRef(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!startedRef.current) {
      startedRef.current = true;
      track("demo_form_started", { source: "landing_demo_section" });
    }
    setForm((f) => ({ ...f, [k]: e.target.value }));
  };
  const picked = selection ? describeSelection(selection) : null;

  const field =
    "w-full rounded-xl border border-white/15 bg-white/5 px-3.5 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/35 focus:border-turquoise focus:bg-white/10 [color-scheme:dark]";
  const label = "mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-white/45";

  const goToPricing = () => {
    if (typeof document !== "undefined")
      document.getElementById("tarifs")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!selection) {
      setError("Choisissez d'abord une formule dans la section Tarifs.");
      goToPricing();
      return;
    }
    setState("sending");
    try {
      const res = await submitDemoRequest({ data: { ...form, plan: picked?.line ?? "" } });
      if (res.ok) {
        setState("done");
        track("demo_request_submitted", {
          plan: selection?.plan,
          tier: selection?.tier,
          billing_period: selection?.yearly ? "yearly" : "monthly",
          locale: "fr",
        });
      } else {
        setError(res.error);
        setState("idle");
        track("form_submission_failed", { form: "demo", error_type: "validation" });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Envoi impossible. Merci de réessayer.");
      setState("idle");
      track("form_submission_failed", { form: "demo", error_type: errorType(err) });
    }
  };

  if (state === "done") {
    return (
      <div className="mt-8 rounded-2xl border border-turquoise/30 bg-turquoise/10 p-6">
        <span className="grid size-11 place-items-center rounded-full bg-turquoise text-nuit">
          <Check className="h-5 w-5" strokeWidth={3} />
        </span>
        <p className="mt-4 text-lg font-bold text-white">Demande envoyée.</p>
        <p className="mt-1 text-sm text-white/70">
          On revient vers vous sous 2 h pour caler le créneau. Un email de confirmation part vers{" "}
          {form.email}.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-4">
      {picked ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border border-turquoise/25 bg-turquoise/10 px-4 py-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-turquoise">
            Formule choisie
          </span>
          <span className="text-sm font-bold text-white">{picked.title}</span>
          <span className="text-sm font-semibold text-turquoise">{picked.price}</span>
          <button
            type="button"
            onClick={onClear}
            className="ml-auto text-xs font-semibold text-white/50 underline-offset-2 hover:text-white hover:underline"
          >
            retirer
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={goToPricing}
          className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-white/25 bg-white/5 px-4 py-3 text-left text-sm text-white/60 transition-colors hover:border-white/40 hover:text-white"
        >
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ocre">Étape 1</span>
          Choisissez une formule dans la section Tarifs
          <ChevronRight className="ml-auto h-4 w-4" />
        </button>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="df-name">
            Nom complet
          </label>
          <input
            id="df-name"
            className={field}
            value={form.contactName}
            onChange={set("contactName")}
            placeholder="Amina El Fassi"
            autoComplete="name"
            required
          />
        </div>
        <div>
          <label className={label} htmlFor="df-center">
            Nom de l'établissement
          </label>
          <input
            id="df-center"
            className={field}
            value={form.center}
            onChange={set("center")}
            placeholder="Groupe Scolaire Anfa"
            autoComplete="organization"
            required
          />
        </div>
        <div>
          <label className={label} htmlFor="df-email">
            Email de l'école
          </label>
          <input
            id="df-email"
            type="email"
            className={field}
            value={form.email}
            onChange={set("email")}
            placeholder="direction@votre-ecole.ma"
            autoComplete="email"
            required
          />
        </div>
        <div>
          <label className={label} htmlFor="df-phone">
            Téléphone <span className="normal-case text-white/30">(facultatif)</span>
          </label>
          <input
            id="df-phone"
            type="tel"
            className={field}
            value={form.phone}
            onChange={set("phone")}
            placeholder="06 12 34 56 78"
            autoComplete="tel"
          />
        </div>
      </div>
      <div>
        <label className={label} htmlFor="df-date">
          Date souhaitée pour la démo
        </label>
        <input
          id="df-date"
          type="date"
          min={today}
          className={field}
          value={form.preferredDate}
          onChange={set("preferredDate")}
          required
        />
      </div>

      {error ? <p className="text-sm font-medium text-corail">{error}</p> : null}

      <button
        type="submit"
        disabled={state === "sending" || !selection}
        className="inline-flex w-full items-center justify-center gap-2 rounded-[18px] bg-corail px-8 py-4 text-base font-bold text-white shadow-[0_22px_50px_-16px_rgba(255,102,107,0.7)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 sm:w-auto"
      >
        {state === "sending" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {state === "sending" ? "Envoi..." : "Réserver ma démo gratuite"}
      </button>
      {!selection ? (
        <p className="text-xs text-white/45">Sélectionnez une formule pour activer l&apos;envoi.</p>
      ) : null}
    </form>
  );
}

function Testimonials() {
  const [i, setI] = useState(0);
  const a = avis[i]!;

  return (
    <section id="temoignage" className="mx-auto max-w-5xl px-6 py-20">
      <Kicker tone="text-turquoise">ce qu'en disent les directions</Kicker>

      <div className="paper relative mt-8 rounded-[32px] p-8 sm:p-12 md:p-14">
        <Sticker
          name="trophy"
          tilt={10}
          className="absolute -right-5 -top-9 w-20 sm:-right-8 sm:-top-12 sm:w-24"
        />

        <blockquote key={i} className="text-2xl font-medium leading-relaxed text-nuit md:text-3xl">
          « {a.quote} »
        </blockquote>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className={`grid size-12 place-items-center rounded-full font-bold ${a.tint}`}>
              {a.initials}
            </span>
            <div>
              <p className="font-bold text-nuit">{a.name}</p>
              <p className="text-sm text-muted-foreground">{a.role}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {avis.map((_, n) => (
              <button
                key={n}
                type="button"
                onClick={() => setI(n)}
                aria-label={`Témoignage ${n + 1}`}
                aria-current={n === i}
                className={`h-2 rounded-full transition-all ${n === i ? "w-6 bg-nuit" : "w-2 bg-nuit/20 hover:bg-nuit/40"}`}
              />
            ))}
            <button
              type="button"
              onClick={() => setI((v) => (v + 1) % avis.length)}
              aria-label="Témoignage suivant"
              className="ml-1 grid size-9 place-items-center rounded-full border border-nuit/15 text-nuit/60 transition-colors hover:bg-nuit/5 hover:text-nuit"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function PricingSection({
  selected,
  onSelect,
}: {
  selected: Selection | null;
  onSelect: (s: Selection) => void;
}) {
  const [yearly, setYearly] = useState(false);
  const [tier, setTier] = useState<Tier>(100);
  const fmt = (n: number) => n.toLocaleString("fr-FR");

  const choose = (plan: PlanId) => {
    track("pricing_plan_selected", {
      plan,
      tier,
      billing_period: yearly ? "yearly" : "monthly",
    });
    track("demo_cta_clicked", { page_name: "landing", cta_location: "pricing_card" });
    onSelect({ plan, tier, yearly });
    if (typeof document !== "undefined")
      document.getElementById("demo")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const seg = "rounded-full px-3.5 py-1.5 transition-colors sm:px-4";
  const segOn = "bg-white text-nuit shadow-sm";
  const segOff = "text-nuit/50 hover:text-nuit";

  return (
    <section id="tarifs" className="relative mx-auto max-w-7xl px-6 py-20">
      <Sticker
        name="backpack"
        tilt={-8}
        className="pointer-events-none absolute -left-2 top-4 hidden w-16 opacity-60 lg:block"
      />
      <div className="mb-8 max-w-xl">
        <Kicker tone="text-turquoise">un tarif clair, pas de surprise</Kicker>
        <h2 className="mt-3 text-4xl font-bold tracking-tight text-nuit">
          Un prix par établissement, selon l&apos;effectif.
        </h2>
        <p className="mt-3 text-nuit/60">
          Un forfait unique, tout compris. Choisissez votre effectif et la périodicité.
        </p>
      </div>

      {/* Filtres : périodicité + effectif */}
      <div className="mb-12 flex flex-col gap-6 sm:flex-row sm:flex-wrap sm:items-end sm:gap-8">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-nuit/40">
            Périodicité
          </p>
          <div className="inline-flex items-center gap-1 rounded-full bg-nuit/5 p-1 text-sm font-semibold">
            <button
              type="button"
              onClick={() => {
                setYearly(false);
                track("pricing_billing_selected", {
                  billing_period: "monthly",
                  plan: selected?.plan,
                  tier: selected?.tier,
                });
              }}
              className={`${seg} ${!yearly ? segOn : segOff}`}
            >
              Mensuel
            </button>
            <button
              type="button"
              onClick={() => {
                setYearly(true);
                track("pricing_billing_selected", {
                  billing_period: "yearly",
                  plan: selected?.plan,
                  tier: selected?.tier,
                });
              }}
              className={`flex items-center gap-2 ${seg} ${yearly ? segOn : segOff}`}
            >
              Annuel
              <span className="rounded-full bg-turquoise/20 px-1.5 py-0.5 text-[10px] font-bold text-turquoise">
                −{MONTHS_OFF} MOIS
              </span>
            </button>
          </div>
        </div>

        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-nuit/40">
            Effectif de l&apos;établissement
          </p>
          <div className="inline-flex items-center gap-1 rounded-full bg-nuit/5 p-1 text-sm font-semibold">
            {TIERS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setTier(n)}
                className={`${seg} ${tier === n ? segOn : segOff}`}
              >
                Jusqu&apos;à {n}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        {tarifs.map((t) => {
          const custom = t.id === "reseau";
          const cell = custom ? null : PRICE[t.id as "essentiel" | "pro"][tier];
          const amount = custom ? "sur mesure" : `${fmt(yearly ? cell!.y : cell!.m)} MAD`;
          const isPicked =
            selected?.plan === t.id && selected.tier === tier && selected.yearly === yearly;
          return (
            <div key={t.nom} className="relative">
              <Note
                tapeTone={t.tape}
                variant="plain"
                className={`${t.tilt} h-full ${isPicked ? "ring-2 ring-turquoise ring-offset-2" : ""}`}
              >
                {isPicked ? (
                  <span className="absolute -top-3 left-6 rounded-full bg-turquoise px-3 py-1 text-[12px] font-bold text-white shadow-[0_10px_24px_-10px_rgba(23,179,166,0.8)]">
                    Sélectionnée
                  </span>
                ) : t.tag ? (
                  <span className="absolute -top-3 right-6 rounded-full bg-violet px-3 py-1 text-[12px] font-bold text-white shadow-[0_10px_24px_-10px_rgba(108,77,246,0.8)]">
                    {t.tag}
                  </span>
                ) : null}
                <img
                  src={t.img}
                  alt=""
                  aria-hidden
                  loading="lazy"
                  className="mb-3 h-16 w-16 object-contain drop-shadow-[0_10px_18px_rgba(0,27,61,0.15)]"
                />
                <h3 className="text-xl font-bold text-nuit">{t.nom}</h3>
                <p className="mt-1 text-sm text-nuit/60">{t.desc}</p>
                <p className="mt-5 flex items-baseline gap-1.5">
                  <span className="text-3xl font-bold tracking-tight text-nuit">{amount}</span>
                  {!custom && (
                    <span className="text-sm font-semibold text-nuit/50">
                      {yearly ? "/an HT" : "/mois HT"}
                    </span>
                  )}
                </p>
                <p className="mt-1 text-xs text-nuit/50">
                  {custom
                    ? `Au-delà de ${TIERS[TIERS.length - 1]} élèves ou plusieurs sites`
                    : yearly
                      ? `${fmt(cell!.m * 12 - cell!.y)} MAD d'économie sur l'année`
                      : `jusqu'à ${tier} élèves, sans engagement`}
                </p>
                <ul className="mt-6 space-y-2.5 border-t border-nuit/10 pt-5">
                  {t.points.map((p) => (
                    <li key={p} className="flex gap-2 text-[13.5px] leading-snug text-nuit/70">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-turquoise" />
                      {p}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => choose(t.id as PlanId)}
                  className={`mt-7 inline-flex w-full items-center justify-center rounded-[16px] px-5 py-3 text-sm font-bold transition-transform hover:-translate-y-0.5 ${
                    t.tag ? "bg-violet text-white" : "bg-nuit text-white"
                  }`}
                >
                  {custom
                    ? "Parler à un expert"
                    : isPicked
                      ? "Formule choisie"
                      : "Choisir cette formule"}
                </button>
              </Note>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Landing() {
  const [selection, setSelection] = useState<Selection | null>(null);
  const pricingTracked = useRef(false);

  useEffect(() => {
    if (pricingTracked.current) return;
    const el = document.getElementById("tarifs");
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && !pricingTracked.current) {
          pricingTracked.current = true;
          track("pricing_viewed", { source: "landing_scroll" });
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background font-sans text-foreground">
      <div className="dots pointer-events-none fixed inset-0 -z-10" />

      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-nuit/6 bg-background/85 backdrop-blur-md">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5">
          <Logo className="h-12" />
          <div className="hidden items-center gap-8 text-sm font-medium text-nuit/65 md:flex">
            <a
              href="#app"
              onClick={() =>
                track("internal_link_clicked", { page_name: "landing", target: "#app" })
              }
              className="hover:text-violet"
            >
              L'application
            </a>
            <a
              href="#modules"
              onClick={() =>
                track("internal_link_clicked", { page_name: "landing", target: "#modules" })
              }
              className="hover:text-violet"
            >
              Modules
            </a>
            <a
              href="#niveaux"
              onClick={() =>
                track("internal_link_clicked", { page_name: "landing", target: "#niveaux" })
              }
              className="hover:text-violet"
            >
              Niveaux
            </a>
            <a
              href="#temoignage"
              onClick={() =>
                track("internal_link_clicked", { page_name: "landing", target: "#temoignage" })
              }
              className="hover:text-violet"
            >
              Avis
            </a>
            <a
              href="#tarifs"
              onClick={() =>
                track("internal_link_clicked", { page_name: "landing", target: "#tarifs" })
              }
              className="hover:text-violet"
            >
              Tarifs
            </a>
            <a
              href="#faq"
              onClick={() =>
                track("internal_link_clicked", { page_name: "landing", target: "#faq" })
              }
              className="hover:text-violet"
            >
              FAQ
            </a>
          </div>
          <a
            href="#demo"
            onClick={() =>
              track("demo_cta_clicked", { page_name: "landing", cta_location: "navbar" })
            }
            className="rounded-full bg-corail px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-[0_10px_24px_-10px_rgba(255,102,107,0.9)] transition-transform hover:scale-105"
          >
            Demander une démo
          </a>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative mx-auto grid max-w-7xl items-center gap-16 px-6 pb-20 pt-16 lg:grid-cols-[1fr_1.05fr]">
        <div className="rise relative z-10">
          <span className="inline-flex items-center gap-2 rounded-full bg-menthe px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-turquoise">
            Centres privés · Maroc & France
          </span>
          <h1 className="mt-6 text-5xl font-bold leading-[1.05] tracking-tight text-nuit md:text-6xl">
            Toute votre école,
            <span className="relative ml-2 inline-block text-violet">
              collée
              <Underline className="absolute -bottom-2 left-0 w-full text-ocre/80" />
            </span>
            <br />
            sur une seule page.
          </h1>
          <p className="mt-7 max-w-md text-lg leading-relaxed text-muted-foreground">
            Élèves, notes, absences, emplois du temps et frais de scolarité : SKEMA rassemble le
            quotidien de votre établissement dans une interface claire et colorée.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-5">
            <a
              href="#demo"
              onClick={() =>
                track("demo_cta_clicked", { page_name: "landing", cta_location: "hero" })
              }
              className="rounded-[20px] bg-nuit px-8 py-4 text-base font-bold text-primary-foreground shadow-[0_22px_44px_-20px_rgba(0,27,61,0.8)] transition-transform hover:-translate-y-0.5"
            >
              Explorer la plateforme
            </a>
            <p className="font-hand text-2xl text-nuit/60">
              15 min pour prendre la main
              <Doodle className="mt-1 w-40 text-turquoise/70" />
            </p>
          </div>
        </div>

        {/* Collage — aperçu réel du produit + photo de classe */}
        <div className="relative">
          <Sticker name="star" tilt={-12} bob className="absolute -top-8 left-4 z-40 w-14" />
          <Sticker name="pencil" tilt={16} className="absolute -right-4 top-10 z-40 w-14" />

          <div className="relative z-20 rotate-1 transition-transform duration-700 hover:rotate-0">
            <DashboardMock />
          </div>

          <div className="absolute -bottom-14 -left-8 z-30 w-48 -rotate-3 transition-transform duration-500 hover:rotate-0 sm:w-56">
            <div className="paper rounded-[16px] p-2.5">
              <img
                src={photoClasse}
                alt="Élèves et enseignante en classe"
                loading="lazy"
                width={1024}
                height={1280}
                className="h-40 w-full rounded-[10px] object-cover"
              />
              <p className="font-hand mt-1.5 text-center text-lg text-nuit/70">
                la vraie vie de classe
              </p>
            </div>
            <span className="absolute -top-3 left-6 h-6 w-20 -rotate-6 bg-turquoise/45 ring-1 ring-inset ring-white/40" />
          </div>
        </div>
      </section>

      {/* App explorer — montrer le produit d'abord */}
      <section id="app" className="relative bg-nuit py-20 text-primary-foreground">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-14 max-w-xl">
            <Kicker tone="text-ocre">exactement ce que vous verrez</Kicker>
            <h2 className="mt-3 text-4xl font-bold tracking-tight">
              L'application, écran par écran.
            </h2>
          </div>
          <div className="grid gap-10 md:grid-cols-3">
            {[
              {
                el: <DashboardMock />,
                tilt: "-rotate-2",
                label: "Tableau de bord",
                sticker: "star" as const,
              },
              {
                el: <FamillesMock />,
                tilt: "rotate-1",
                label: "Familles",
                sticker: "cap" as const,
              },
              {
                el: <PaiementsMock />,
                tilt: "-rotate-1",
                label: "Paiements",
                sticker: "invoice" as const,
              },
            ].map((card) => (
              <div key={card.label} className="relative">
                <div className={`${card.tilt} transition-transform duration-500 hover:rotate-0`}>
                  {card.el}
                </div>
                <Sticker name={card.sticker} tilt={12} className="absolute -right-4 -top-8 w-16" />
                <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-white/55">
                  {card.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Modules */}
      <section id="modules" className="mx-auto max-w-7xl px-6 py-20">
        <div className="mb-16 max-w-xl">
          <Kicker tone="text-corail">cinq modules, une seule connexion</Kicker>
          <h2 className="mt-3 text-4xl font-bold tracking-tight text-nuit">
            Chaque métier de l'école a son autocollant.
          </h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-5">
          {modules.map((m, i) => (
            <article
              key={m.name}
              className={`group relative rounded-[26px] ${m.tone} p-6 pt-16 ring-1 ring-nuit/6 transition-transform duration-500 hover:-translate-y-2 ${
                i % 2 ? "lg:mt-8" : ""
              }`}
            >
              <Sticker
                name={m.sticker}
                tilt={i % 2 ? 8 : -8}
                className="absolute -top-6 left-5 w-16 transition-transform duration-500 group-hover:scale-110"
              />
              <h3 className={`text-lg font-bold ${m.accent}`}>{m.name}</h3>
              <p className="mt-2 text-sm leading-relaxed text-nuit/65">{m.line}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Niveaux / Cycles */}
      <section id="niveaux" className="mx-auto max-w-7xl px-6 py-20">
        <Kicker tone="text-violet">Un seul outil, quatre cycles</Kicker>
        <h2 className="mt-3 mb-16 max-w-lg text-4xl font-bold tracking-tight text-nuit">
          De la maternelle au lycée, sans changer d&apos;outil.
        </h2>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {cycles.map((c) => (
            <article
              key={c.nom}
              className={`relative rounded-[26px] ${c.fond} p-6 pt-6 ring-1 ring-nuit/6`}
            >
              <img
                src={c.sticker}
                alt={c.alt}
                loading="lazy"
                width={160}
                height={160}
                className="h-40 w-40 object-contain"
              />
              <h3 className={`mt-2 text-xl font-bold ${c.accent}`}>{c.nom}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-nuit/65">{c.phrase}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Démarrage */}
      <section id="demarrage" className="relative bg-bleu-doux/60 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-16 text-center">
            <Kicker tone="text-violet" center>
              4 étapes, zéro stress
            </Kicker>
            <h2 className="mt-3 text-4xl font-bold tracking-tight text-nuit">
              Votre passage à SKEMA
            </h2>
          </div>
          <div className="grid gap-10 md:grid-cols-4">
            {etapes.map((e, i) => (
              <div key={e.n} className="relative">
                <Note tapeTone={e.tape} className={e.tilt}>
                  <span className="font-hand absolute -left-3 -top-6 text-6xl font-bold text-nuit">
                    {e.n}
                  </span>
                  <h3 className="mt-1 text-lg font-bold text-nuit">{e.t}</h3>
                  <p className="mt-2 text-sm text-nuit/65">{e.d}</p>
                </Note>
                {i < etapes.length - 1 && (
                  <Doodle className="absolute -right-10 top-1/2 hidden w-16 text-nuit/25 md:block" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <Testimonials />

      <PricingSection selected={selection} onSelect={setSelection} />

      {/* FAQ — questions fréquentes */}
      <section id="faq" className="mx-auto max-w-4xl px-6 py-20">
        <Kicker tone="text-violet" center>
          Des questions ?
        </Kicker>
        <h2 className="mt-3 text-center text-4xl font-bold tracking-tight text-nuit">
          Questions fréquentes sur SKEMA
        </h2>
        <div className="mt-10 space-y-4">
          {FAQ_ITEMS.map((item, i) => (
            <details
              key={i}
              className="group rounded-[22px] border border-nuit/8 bg-papier transition-shadow hover:shadow-sm"
              onToggle={(e) => {
                if ((e.currentTarget as HTMLDetailsElement).open) {
                  track("faq_expanded", { question_index: i, page_name: "landing" });
                }
              }}
            >
              <summary className="flex cursor-pointer items-center justify-between gap-3 px-6 py-5 text-left text-base font-semibold text-nuit transition-colors hover:text-violet md:text-lg">
                {item.question}
                <span
                  className="shrink-0 text-2xl text-nuit/40 transition-transform group-open:rotate-45"
                  aria-hidden
                >
                  +
                </span>
              </summary>
              <div className="border-t border-nuit/8 px-6 pb-6 pt-4">
                <p className="text-sm leading-relaxed text-nuit/70">{item.answer}</p>
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* CTA — la conversion */}
      <section id="demo" className="mx-auto max-w-6xl px-6 pb-24 pt-4">
        <div className="relative overflow-hidden rounded-[40px] bg-nuit text-primary-foreground">
          {/* halos de couleur */}
          <div
            aria-hidden
            className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-violet/40 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-28 right-1/3 h-80 w-80 rounded-full bg-turquoise/30 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -right-24 top-1/4 h-72 w-72 rounded-full bg-corail/20 blur-3xl"
          />

          <div className="relative grid gap-10 px-7 py-14 sm:px-12 md:py-16 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-12">
            {/* Texte + formulaire */}
            <div>
              <p className="font-hand text-3xl text-ocre">on s'y met ?</p>
              <h2 className="mt-3 text-4xl font-bold leading-[1.08] tracking-tight md:text-5xl">
                Voyez <span className="text-turquoise">votre</span> école dans SKEMA.
              </h2>
              <p className="mt-4 max-w-md text-base leading-relaxed text-white/70">
                Une démo guidée de 30 minutes. On importe un échantillon de vos données pendant
                l'appel : vous repartez avec votre tableau de bord déjà rempli.
              </p>

              <DemoForm selection={selection} onClear={() => setSelection(null)} />

              <ul className="mt-7 grid gap-x-6 gap-y-2 text-sm text-white/55 sm:grid-cols-2">
                <li className="flex items-center gap-2">
                  <span className="size-1.5 shrink-0 rounded-full bg-turquoise" /> Sans engagement
                </li>
                <li className="flex items-center gap-2">
                  <span className="size-1.5 shrink-0 rounded-full bg-violet" /> Mise en route en 48
                  h
                </li>
                <li className="flex items-center gap-2">
                  <span className="size-1.5 shrink-0 rounded-full bg-ocre" /> Onboarding &amp;
                  formation inclus
                </li>
                <li className="flex items-center gap-2">
                  <span className="size-1.5 shrink-0 rounded-full bg-corail" /> Vos données restent
                  au Maroc
                </li>
              </ul>
            </div>

            {/* Illustration */}
            <div className="relative mx-auto hidden w-full max-w-[440px] lg:block lg:max-w-none">
              <img
                src={ctaVibe}
                alt="Les trois figures SKEMA jaillissant d'un livre, entourées d'éléments du produit"
                width={2000}
                height={2000}
                loading="lazy"
                className="w-full drop-shadow-[0_30px_60px_rgba(0,0,0,0.35)]"
              />
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-nuit/8 bg-papier py-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-6 text-center md:flex-row md:justify-between md:text-left">
          <Logo className="h-14" />
          <div className="flex flex-col items-center gap-2 text-xs text-muted-foreground md:items-end">
            <p>© 2026 SKEMA · EIDEN GROUP · La solution tout-en-un pour votre établissement.</p>
            <nav
              className="flex flex-wrap items-center justify-center gap-4"
              aria-label="Liens du site"
            >
              <Link to="/" className="hover:text-nuit hover:underline">
                Accueil
              </Link>
              <Link to="/privacy" className="hover:text-nuit hover:underline">
                Confidentialité
              </Link>
              <a href="/login" className="hover:text-nuit hover:underline">
                Connexion
              </a>
              <a href="/#demo" className="hover:text-nuit hover:underline">
                Demander une démo
              </a>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
