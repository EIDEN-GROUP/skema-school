import { createFileRoute } from "@tanstack/react-router";
import { buildMeta } from "@/lib/seo/metadata";
import { organizationSchema } from "@/lib/seo/schema";
import { Logo } from "@/components/skema/logo";

export const Route = createFileRoute("/privacy")({
  head: () =>
    buildMeta({
      title: "Politique de confidentialité · SKEMA",
      description:
        "La politique de confidentialité de SKEMA : quelles données sont collectées, pourquoi, et comment elles sont protégées. Éditeur : EIDEN GROUP.",
      path: "/privacy",
      jsonLd: [organizationSchema()],
    }),
  component: Privacy,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-xl font-bold tracking-tight text-nuit">{title}</h2>
      <div className="mt-2 space-y-3 text-sm leading-relaxed text-nuit/70">{children}</div>
    </section>
  );
}

function Privacy() {
  return (
    <div className="min-h-screen bg-papier">
      <div aria-hidden className="dots pointer-events-none fixed inset-0 -z-10 opacity-50" />
      <main className="mx-auto max-w-3xl px-6 py-14">
        <Logo className="h-14" />
        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Dernière mise à jour : septembre 2026
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-nuit md:text-4xl">
          Politique de confidentialité
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-nuit/70">
          SKEMA est édité par <strong>EIDEN GROUP</strong>. La présente politique explique quelles
          données sont traitées lorsque vous consultez le site public de SKEMA ou utilisez
          l&apos;application de gestion pour votre établissement, et comment elles sont protégées.
        </p>

        <Section title="1. Les données que nous collectons">
          <p>
            <strong>Visiteurs du site :</strong> lorsque vous demandez une démonstration, nous
            traitons les informations que vous saisissez dans le formulaire (nom, établissement,
            email professionnel, téléphone facultatif, date souhaitée). Si vous acceptez les
            statistiques de navigation, nous traitons des données d&apos;usage anonymisées via notre
            outil d&apos;analyse (Amplitude), sans données personnelles d&apos;élèves ni de
            familles.
          </p>
          <p>
            <strong>Utilisateurs de l&apos;application :</strong> les comptes des directions et
            équipes reposent sur une adresse email et un identifiant. Les données scolaires
            (familles, élèves, paiements, planning, messages) sont saisies et traitées par
            l&apos;établissement lui-même, pour son propre fonctionnement. Nous n&apos;utilisons
            jamais ces données à des fins de marketing et nous ne les vendons pas.
          </p>
        </Section>

        <Section title="2. Pourquoi nous traitons ces données">
          <p>
            Les données des formulaires de démo servent uniquement à organiser votre démonstration
            et à vous recontacter. Les données scolaires servent au fonctionnement de
            l&apos;application pour votre établissement. Les statistiques anonymes nous aident à
            améliorer le produit et ne sont collectées qu&apos;avec votre consentement préalable.
          </p>
        </Section>

        <Section title="3. Base légale et consentement">
          <p>
            Le traitement repose sur l&apos;exécution du service (contrat) pour l&apos;utilisation
            de l&apos;application, sur notre intérêt légitime pour répondre aux demandes de démo, et
            sur votre <strong>consentement</strong> pour les statistiques de navigation. Vous pouvez
            retirer votre consentement à tout moment en refusant le suivi depuis votre navigateur.
          </p>
        </Section>

        <Section title="4. Confidentialité des données scolaires">
          <p>
            Les fiches familles et élèves (coordonnées, scolarité, paiements), les messages et les
            notes saisis dans SKEMA restent propres à votre établissement. Ils sont accessibles
            uniquement aux comptes autorisés de votre école et ne sont pas utilisés à des fins
            publicitaires. Les reçus et relances sont générés à partir des informations que vous
            avez enregistrées.
          </p>
        </Section>

        <Section title="5. Hébergement et sécurité">
          <p>
            Les données sont hébergées par nos prestataires techniques (notamment Supabase et
            Vercel), qui appliquent des mesures de sécurité conformes aux standards du secteur
            (chiffrement en transit et au repos, contrôles d&apos;accès). L&apos;accès aux données
            est restreint aux personnes autorisées chez EIDEN GROUP pour la maintenance et le
            support.
          </p>
        </Section>

        <Section title="6. Durées de conservation">
          <p>
            Les données d&apos;un établissement sont conservées tant que le compte est actif et
            supprimées (ou restituées) à la demande de l&apos;établissement. Les demandes de démo
            sont conservées le temps nécessaire à leur traitement. Les statistiques anonymes sont
            conservées selon les durées légales applicables.
          </p>
        </Section>

        <Section title="7. Vos droits">
          <p>
            Vous disposez d&apos;un droit d&apos;accès, de rectification, d&apos;effacement et
            d&apos;opposition sur les données vous concernant, ainsi que d&apos;un droit à la
            portabilité. Pour exercer ces droits, contactez-nous à{" "}
            <a
              href="mailto:contact@eiden-group.com"
              className="font-medium text-violet underline underline-offset-2"
            >
              contact@eiden-group.com
            </a>
            .
          </p>
        </Section>

        <Section title="8. Contact">
          <p>
            Pour toute question relative à cette politique, vous pouvez écrire à EIDEN GROUP,
            éditeur de SKEMA :{" "}
            <a
              href="mailto:contact@eiden-group.com"
              className="font-medium text-violet underline underline-offset-2"
            >
              contact@eiden-group.com
            </a>
            .
          </p>
        </Section>

        <footer className="mt-16 border-t border-nuit/8 pt-6 text-xs text-muted-foreground">
          © 2026 SKEMA · EIDEN GROUP —{" "}
          <a href="/" className="font-medium text-nuit underline underline-offset-2">
            Retour à l&apos;accueil
          </a>
        </footer>
      </main>
    </div>
  );
}
