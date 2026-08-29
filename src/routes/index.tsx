import { createFileRoute } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { ChevronRight, Check, Loader2 } from "lucide-react";
import { submitDemoRequest } from "@/lib/contact-demo";

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
import {
  DashboardMock,
  FamillesMock,
  PaiementsMock,
} from "@/components/skema/mocks";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SKEMA · Logiciel de gestion pour écoles privées" },
      {
        name: "description",
        content:
          "SKEMA centralise élèves, notes, absences, emplois du temps et facturation de votre établissement privé : maternelle, primaire, collège et lycée.",
      },
      { property: "og:title", content: "SKEMA, la solution tout-en-un pour votre établissement" },
      {
        property: "og:description",
        content:
          "Une plateforme unique et colorée pour piloter votre centre privé : vie scolaire, pédagogie, finance et communication.",
      },
    ],
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
    phrase: "Les frais de garderie et de cantine s'ajoutent au forfait de la famille, sans second fichier.",
  },
  {
    nom: "Primaire",
    sticker: stickerPrimaire,
    alt: "Élève de primaire avec son cartable, la main levée",
    fond: "bg-menthe",
    accent: "text-turquoise",
    phrase: "Une fratrie de trois enfants, une seule facture mensuelle et la remise appliquée d'office.",
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
    phrase: "Options, séances de soutien et examens blancs facturés à la séance, sans oubli en fin d'année.",
  },
] as const;

const etapes = [
  { n: "1", t: "On vous écoute", d: "Un audit rapide de votre organisation actuelle.", tape: "tape-corail", tilt: "-rotate-2" },
  { n: "2", t: "On importe tout", d: "Élèves, familles, classes et historique de notes.", tape: "tape-violet", tilt: "rotate-2" },
  { n: "3", t: "On forme l'équipe", d: "Deux ateliers suffisent, l'interface est intuitive.", tape: "tape-turquoise", tilt: "-rotate-1" },
  { n: "4", t: "Vous ouvrez l'année", d: "Chaque module s'active à votre rythme.", tape: "tape", tilt: "rotate-1" },
];

const tarifs = [
  {
    nom: "Essentiel",
    prix: "1 000",
    prixAnnuel: "8 000",
    prixAnnuelParMois: "800",
    tag: "",
    img: stickerEssentiel,
    tape: "tape-turquoise",
    tilt: "-rotate-1",
    desc: "Jusqu'à ~500 élèves actifs. Un seul administrateur.",
    points: [
      "Fichier familles & élèves",
      "Planning & rendez-vous",
      "Rapports de base",
      "Support par email",
    ],
  },
  {
    nom: "Pro",
    prix: "2 000",
    prixAnnuel: "16 000",
    prixAnnuelParMois: "1 600",
    tag: "Le plus populaire",
    img: stickerPro,
    tape: "tape-violet",
    tilt: "rotate-0",
    desc: "Établissements actifs : équipe multi-rôles et pilotage renforcé.",
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
    nom: "Réseau",
    prix: "sur mesure",
    prixAnnuel: "",
    prixAnnuelParMois: "",
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
];

/** SKEMA logo — the official uncropped brand lockup. */
function Logo({ className = "h-12" }: { className?: string }) {
  return <img src="/skema-logo.png" alt="SKEMA, la solution tout-en-un pour votre établissement" className={`w-auto ${className}`} />;
}

/** Section kicker — the SKEMA logo "E" bars + a hand-written label. Used on every section. */
function Kicker({ children, tone = "text-turquoise", center = false }: { children: ReactNode; tone?: string; center?: boolean }) {
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

function DemoForm() {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ contactName: "", center: "", email: "", phone: "", preferredDate: "" });
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState("");
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const field =
    "w-full rounded-xl border border-white/15 bg-white/5 px-3.5 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/35 focus:border-turquoise focus:bg-white/10 [color-scheme:dark]";
  const label = "mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-white/45";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setState("sending");
    try {
      const res = await submitDemoRequest({ data: form });
      if (res.ok) setState("done");
      else {
        setError(res.error);
        setState("idle");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Envoi impossible. Merci de réessayer.");
      setState("idle");
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
          On revient vers vous sous 2 h pour caler le créneau. Un email de confirmation part vers {form.email}.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="df-name">Nom complet</label>
          <input id="df-name" className={field} value={form.contactName} onChange={set("contactName")} placeholder="Amina El Fassi" autoComplete="name" required />
        </div>
        <div>
          <label className={label} htmlFor="df-center">Nom de l'établissement</label>
          <input id="df-center" className={field} value={form.center} onChange={set("center")} placeholder="Groupe Scolaire Anfa" autoComplete="organization" required />
        </div>
        <div>
          <label className={label} htmlFor="df-email">Email de l'école</label>
          <input id="df-email" type="email" className={field} value={form.email} onChange={set("email")} placeholder="direction@votre-ecole.ma" autoComplete="email" required />
        </div>
        <div>
          <label className={label} htmlFor="df-phone">Téléphone <span className="normal-case text-white/30">(facultatif)</span></label>
          <input id="df-phone" type="tel" className={field} value={form.phone} onChange={set("phone")} placeholder="06 12 34 56 78" autoComplete="tel" />
        </div>
      </div>
      <div>
        <label className={label} htmlFor="df-date">Date souhaitée pour la démo</label>
        <input id="df-date" type="date" min={today} className={field} value={form.preferredDate} onChange={set("preferredDate")} required />
      </div>

      {error ? <p className="text-sm font-medium text-corail">{error}</p> : null}

      <button
        type="submit"
        disabled={state === "sending"}
        className="inline-flex w-full items-center justify-center gap-2 rounded-[18px] bg-corail px-8 py-4 text-base font-bold text-white shadow-[0_22px_50px_-16px_rgba(255,102,107,0.7)] transition-transform hover:-translate-y-0.5 disabled:opacity-60 sm:w-auto"
      >
        {state === "sending" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {state === "sending" ? "Envoi..." : "Réserver ma démo gratuite"}
      </button>
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
        <Sticker name="trophy" tilt={10} className="absolute -right-5 -top-9 w-20 sm:-right-8 sm:-top-12 sm:w-24" />

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

function PricingSection() {
  const [yearly, setYearly] = useState(false);

  return (
    <section id="tarifs" className="relative mx-auto max-w-7xl px-6 py-20">
      <Sticker name="backpack" tilt={-8} className="pointer-events-none absolute -left-2 top-4 hidden w-16 opacity-60 lg:block" />
      <div className="mb-10 max-w-xl">
        <Kicker tone="text-turquoise">un tarif clair, pas de surprise</Kicker>
        <h2 className="mt-3 text-4xl font-bold tracking-tight text-nuit">
          Un prix par établissement, selon l&apos;effectif.
        </h2>
      </div>

      {/* Bascule Mensuel / Annuel */}
      <div className="mb-12 inline-flex items-center gap-1 rounded-full bg-nuit/5 p-1 text-sm font-semibold">
        <button
          type="button"
          onClick={() => setYearly(false)}
          className={`rounded-full px-4 py-1.5 transition-colors ${!yearly ? "bg-white text-nuit shadow-sm" : "text-nuit/50 hover:text-nuit"}`}
        >
          Mensuel
        </button>
        <button
          type="button"
          onClick={() => setYearly(true)}
          className={`flex items-center gap-2 rounded-full px-4 py-1.5 transition-colors ${yearly ? "bg-white text-nuit shadow-sm" : "text-nuit/50 hover:text-nuit"}`}
        >
          Annuel
          <span className="rounded-full bg-turquoise/20 px-1.5 py-0.5 text-[10px] font-bold text-turquoise">−2 MOIS</span>
        </button>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        {tarifs.map((t) => {
          const custom = t.prix === "sur mesure";
          return (
            <div key={t.nom} className="relative">
              <Note tapeTone={t.tape} variant="plain" className={`${t.tilt} h-full`}>
                {t.tag && (
                  <span className="absolute -top-3 right-6 rounded-full bg-violet px-3 py-1 text-[12px] font-bold text-white shadow-[0_10px_24px_-10px_rgba(108,77,246,0.8)]">
                    {t.tag}
                  </span>
                )}
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
                  <span className="text-3xl font-bold tracking-tight text-nuit">
                    {custom ? t.prix : `${yearly ? t.prixAnnuel : t.prix} MAD`}
                  </span>
                  {!custom && (
                    <span className="text-sm font-semibold text-nuit/50">{yearly ? "/an HT" : "/mois HT"}</span>
                  )}
                </p>
                {!custom && (
                  <p className="mt-1 text-xs text-nuit/50">
                    {yearly ? `soit ${t.prixAnnuelParMois} MAD/mois, 2 mois offerts` : "sans engagement"}
                  </p>
                )}
                <ul className="mt-6 space-y-2.5 border-t border-nuit/10 pt-5">
                  {t.points.map((p) => (
                    <li key={p} className="flex gap-2 text-[13.5px] leading-snug text-nuit/70">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-turquoise" />
                      {p}
                    </li>
                  ))}
                </ul>
                <a
                  href="#demo"
                  className={`mt-7 inline-flex w-full items-center justify-center rounded-[16px] px-5 py-3 text-sm font-bold transition-transform hover:-translate-y-0.5 ${
                    t.tag ? "bg-violet text-white" : "bg-nuit text-white"
                  }`}
                >
                  {custom ? "Parler à un expert" : "Choisir cette formule"}
                </a>
              </Note>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Landing() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background font-sans text-foreground">
      <div className="dots pointer-events-none fixed inset-0 -z-10" />

      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-nuit/6 bg-background/85 backdrop-blur-md">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5">
          <Logo className="h-12" />
          <div className="hidden items-center gap-8 text-sm font-medium text-nuit/65 md:flex">
            <a href="#app" className="hover:text-violet">L'application</a>
            <a href="#modules" className="hover:text-violet">Modules</a>
            <a href="#niveaux" className="hover:text-violet">Niveaux</a>
            <a href="#temoignage" className="hover:text-violet">Avis</a>
            <a href="#tarifs" className="hover:text-violet">Tarifs</a>
          </div>
          <a
            href="#demo"
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
              <p className="font-hand mt-1.5 text-center text-lg text-nuit/70">la vraie vie de classe</p>
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
              { el: <DashboardMock />, tilt: "-rotate-2", label: "Tableau de bord", sticker: "star" as const },
              { el: <FamillesMock />, tilt: "rotate-1", label: "Familles", sticker: "cap" as const },
              { el: <PaiementsMock />, tilt: "-rotate-1", label: "Paiements", sticker: "invoice" as const },
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
            <article key={c.nom} className={`relative rounded-[26px] ${c.fond} p-6 pt-6 ring-1 ring-nuit/6`}>
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
            <Kicker tone="text-violet" center>4 étapes, zéro stress</Kicker>
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

      <PricingSection />

      {/* CTA — la conversion */}
      <section id="demo" className="mx-auto max-w-6xl px-6 pb-24 pt-4">
        <div className="relative overflow-hidden rounded-[40px] bg-nuit text-primary-foreground">
          {/* halos de couleur */}
          <div aria-hidden className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-violet/40 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute -bottom-28 right-1/3 h-80 w-80 rounded-full bg-turquoise/30 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute -right-24 top-1/4 h-72 w-72 rounded-full bg-corail/20 blur-3xl" />

          <div className="relative grid gap-10 px-7 py-14 sm:px-12 md:py-16 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-12">
            {/* Texte + formulaire */}
            <div>
              <p className="font-hand text-3xl text-ocre">on s'y met ?</p>
              <h2 className="mt-3 text-4xl font-bold leading-[1.08] tracking-tight md:text-5xl">
                Voyez <span className="text-turquoise">votre</span> école dans SKEMA.
              </h2>
              <p className="mt-4 max-w-md text-base leading-relaxed text-white/70">
                Une démo guidée de 30 minutes. On importe un échantillon de vos données
                pendant l'appel : vous repartez avec votre tableau de bord déjà rempli.
              </p>

              <DemoForm />

              <ul className="mt-7 grid gap-x-6 gap-y-2 text-sm text-white/55 sm:grid-cols-2">
                <li className="flex items-center gap-2"><span className="size-1.5 shrink-0 rounded-full bg-turquoise" /> Sans engagement</li>
                <li className="flex items-center gap-2"><span className="size-1.5 shrink-0 rounded-full bg-violet" /> Mise en route en 48 h</li>
                <li className="flex items-center gap-2"><span className="size-1.5 shrink-0 rounded-full bg-ocre" /> Onboarding &amp; formation inclus</li>
                <li className="flex items-center gap-2"><span className="size-1.5 shrink-0 rounded-full bg-corail" /> Vos données restent au Maroc</li>
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
          <p className="text-xs text-muted-foreground">
            © 2026 SKEMA · La solution tout-en-un pour votre établissement.
          </p>
        </div>
      </footer>
    </div>
  );
}
