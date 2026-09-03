import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase-browser";
import { buildMeta } from "@/lib/seo/metadata";
import { Doodle, Motif } from "@/components/skema/bits";
import ctaVibe from "@/assets/landing/cta-vibe.png";
import stickerToque from "@/assets/login/sticker-toque.png";
import stickerLivre from "@/assets/login/sticker-livre.png";
import stickerCrayon from "@/assets/login/sticker-crayon.png";
import stickerEtoile from "@/assets/login/sticker-etoile.png";

export const Route = createFileRoute("/login")({
  head: () =>
    buildMeta({
      title: "Connexion · SKEMA",
      description:
        "Espace établissement : connectez-vous à SKEMA pour gérer les familles, les élèves, les frais de scolarité et le planning de votre école privée.",
      path: "/login",
      noindex: true,
    }),
  component: Login,
});

function Champ({
  id,
  label,
  type,
  value,
  onChange,
  placeholder,
  autoComplete,
  trailing,
}: {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  autoComplete: string;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-[0.78rem] font-medium text-nuit/60">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="w-full rounded-xl border border-nuit/15 bg-white px-4 py-3 text-[0.95rem] text-nuit outline-none transition-colors placeholder:text-nuit/35 focus:border-violet focus:ring-2 focus:ring-violet/20"
        />
        {trailing}
      </div>
    </div>
  );
}

function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !pw) {
      setError("Veuillez remplir tous les champs.");
      return;
    }
    setError("");
    setBusy(true);
    const result = await login(email, pw);
    if (result.error) {
      setBusy(false);
      setError(result.error);
      return;
    }

    // Route superadmins straight to their console; everyone else to the dashboard.
    // `useAuth().role` isn't populated yet this tick, so read the profile directly.
    let dest: "/superadmin" | "/dashboard" = "/dashboard";
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (uid) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", uid)
        .single();
      if (profile?.role === "superadmin" || auth.user?.user_metadata?.role === "superadmin") {
        dest = "/superadmin";
      }
    }
    setBusy(false);
    nav({ to: dest });
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-papier">
      <div aria-hidden className="dots pointer-events-none absolute inset-0 opacity-60" />
      <div
        aria-hidden
        className="ruled pointer-events-none absolute -left-28 top-16 hidden h-[540px] w-[420px] -rotate-3 border border-nuit/10 bg-white/70 lg:block"
      />
      {/* halos + illustration de marque */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-40 top-1/4 hidden h-96 w-96 rounded-full bg-violet/15 blur-3xl lg:block"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 bottom-10 hidden h-80 w-80 rounded-full bg-turquoise/15 blur-3xl lg:block"
      />
      <img
        src={ctaVibe}
        alt="Illustration décorative"
        aria-hidden
        width={2000}
        height={2000}
        className="pointer-events-none absolute -right-24 bottom-4 hidden w-[440px] opacity-95 drop-shadow-[0_30px_60px_rgba(0,27,61,0.15)] xl:block 2xl:w-[520px]"
      />

      <div className="relative mx-auto flex min-h-screen w-full max-w-[560px] flex-col justify-center px-5 py-14 sm:px-8">
        {/* Marque */}
        <div className="relative flex flex-col items-center text-center">
          <img
            src={stickerToque}
            alt=""
            aria-hidden
            loading="lazy"
            width={512}
            height={512}
            className="pointer-events-none absolute -left-6 -top-10 hidden w-[92px] -rotate-12 sm:block"
          />
          <img
            src={stickerLivre}
            alt=""
            aria-hidden
            loading="lazy"
            width={512}
            height={512}
            className="pointer-events-none absolute -right-4 -top-12 hidden w-[86px] rotate-6 sm:block"
          />

          <a href="/" className="flex items-center gap-2">
            <span className="text-[1.7rem] font-semibold leading-none tracking-[-0.05em] text-nuit">
              SK
            </span>
            <Motif className="w-[22px]" />
            <span className="text-[1.7rem] font-semibold leading-none tracking-[-0.05em] text-nuit">
              MA
            </span>
          </a>
          <div className="mt-3 flex items-center gap-3">
            <Motif className="w-5" />
            <span className="text-[0.7rem] font-medium uppercase tracking-[0.22em] text-nuit/50">
              Espace établissement
            </span>
          </div>
        </div>

        {/* Carte papier scotchée */}
        <div className="relative mt-10">
          <span aria-hidden className="scotch -top-3 left-8 -rotate-6" />
          <span aria-hidden className="scotch -top-3 right-8 rotate-3" />

          <img
            src={stickerCrayon}
            alt=""
            aria-hidden
            loading="lazy"
            width={512}
            height={512}
            className="pointer-events-none absolute -left-12 bottom-16 hidden w-[104px] lg:block"
          />
          <img
            src={stickerEtoile}
            alt=""
            aria-hidden
            loading="lazy"
            width={512}
            height={512}
            className="pointer-events-none absolute -right-11 -bottom-8 hidden w-[80px] -rotate-6 lg:block"
          />

          <div className="paper relative rounded-[22px] px-6 py-8 sm:px-9 sm:py-10">
            <h1 className="text-[1.55rem] leading-tight text-nuit">Content de vous revoir.</h1>
            <p className="font-hand mt-3 text-[0.98rem] text-nuit/60 sm:text-[1.05rem]">
              <span className="mr-1.5 text-corail">↳</span>
              Une école, un compte. Vos familles vous attendent à l&apos;intérieur.
            </p>

            <form onSubmit={submit} className="mt-8 space-y-5">
              <Champ
                id="email"
                label="Adresse e-mail"
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="direction@votre-ecole.ma"
                autoComplete="email"
              />
              <Champ
                id="password"
                label="Mot de passe"
                type={show ? "text" : "password"}
                value={pw}
                onChange={setPw}
                placeholder="••••••••"
                autoComplete="current-password"
                trailing={
                  <button
                    type="button"
                    onClick={() => setShow((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-nuit/40 transition-colors hover:text-nuit"
                  >
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
              />

              {error ? <p className="text-xs text-corail">{error}</p> : null}

              <button
                type="submit"
                disabled={busy}
                className="mt-2 inline-flex w-full items-center justify-center rounded-xl bg-nuit px-5 py-3 text-[0.95rem] font-medium text-white transition-all hover:-translate-y-[2px] hover:bg-nuit/90 disabled:opacity-60"
              >
                {busy ? "Connexion..." : "Se connecter"}
              </button>
            </form>

            <div className="mt-7 flex items-center gap-3">
              <span className="h-px flex-1 bg-nuit/10" />
              <span className="text-[0.72rem] uppercase tracking-[0.18em] text-nuit/50">ou</span>
              <span className="h-px flex-1 bg-nuit/10" />
            </div>

            <div className="mt-6 flex flex-col items-center gap-3 text-center">
              <p className="text-[0.88rem] text-nuit/60">
                Votre établissement n&apos;a pas encore de compte&nbsp;?
              </p>
              <a
                href="/#demo"
                className="inline-flex items-center justify-center rounded-xl border border-nuit/15 bg-white px-4 py-2.5 text-[0.92rem] font-medium text-nuit transition-all hover:-translate-y-[2px] hover:border-nuit/35"
              >
                Demander une démo
              </a>
            </div>
          </div>
        </div>

        <Doodle className="mx-auto mt-8 hidden w-32 text-nuit/20 sm:block" />

        <p className="mt-4 text-center text-[0.78rem] text-nuit/50">
          Données hébergées et chiffrées · SKEMA © 2026
        </p>
      </div>
    </main>
  );
}
