/**
 * Landing-page previews that mirror the real dashboard screens 1:1 — same nav,
 * same KPI labels, same table columns, same SKEMA palette — so the marketing
 * shots match what a customer actually sees after logging in.
 */

import type { ReactNode } from "react";

const NAV = [
  { label: "Tableau de bord", color: "#6C4DF6" },
  { label: "Calendrier", color: "#17B3A6" },
  { label: "Parents", color: "#6C4DF6" },
  { label: "Paiement", color: "#FFB347" },
  { label: "Annonces", color: "#FF666B" },
];

/** The tricolour SKEMA "E" that marks the active row in the real sidebar. */
function Motif({ className = "" }: { className?: string }) {
  return (
    <span aria-hidden className={`inline-flex flex-col gap-[2px] ${className}`}>
      <span className="h-[2px] w-full rounded-full bg-violet" />
      <span className="h-[2px] w-full rounded-full bg-turquoise" />
      <span className="h-[2px] w-full rounded-full bg-corail" />
    </span>
  );
}

function Chrome({ path, children }: { path: string; children: ReactNode }) {
  return (
    <div className="w-full overflow-hidden rounded-[24px] bg-card ring-1 ring-nuit/8 shadow-[0_40px_80px_-40px_rgba(0,27,61,0.45)]">
      <div className="flex items-center gap-2 border-b border-nuit/8 px-5 py-3">
        <span className="size-2.5 rounded-full bg-corail/60" />
        <span className="size-2.5 rounded-full bg-ocre/70" />
        <span className="size-2.5 rounded-full bg-turquoise/70" />
        <span className="ml-3 truncate text-[11px] font-medium text-muted-foreground">{path}</span>
      </div>
      {children}
    </div>
  );
}

function Rail({ active }: { active: number }) {
  return (
    <aside className="hidden w-[104px] shrink-0 space-y-1 border-r border-nuit/8 bg-gris-clair/50 p-2.5 sm:block">
      {NAV.map((n, i) => (
        <div
          key={n.label}
          className={`relative flex items-center gap-1.5 rounded-full px-2 py-1.5 text-[9.5px] font-semibold ${
            i === active ? "bg-white text-nuit shadow-[0_1px_2px_rgba(0,27,61,0.06)]" : "text-nuit/45"
          }`}
        >
          {i === active && <Motif className="absolute -left-[5px] w-[7px]" />}
          <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: n.color }} />
          <span className="truncate">{n.label}</span>
        </div>
      ))}
    </aside>
  );
}

const chip = "rounded-full bg-muted/70 px-2 py-1 text-[8.5px] font-semibold text-nuit/50";
const th = "px-2 py-1.5 text-[8px] font-bold uppercase tracking-wider text-muted-foreground";
const td = "px-2 py-1.5 text-[9.5px] text-nuit/75";

function StatusPill({ s }: { s: string }) {
  const tone =
    s === "Payé"
      ? "bg-menthe text-turquoise"
      : s === "Retard"
        ? "bg-peche text-corail"
        : s === "Impayé"
          ? "bg-[#FFE3E0] text-corail"
          : "bg-peche text-ocre";
  return <span className={`rounded-full px-1.5 py-0.5 text-[8px] font-bold ${tone}`}>{s}</span>;
}

/* ─────────────────────────  Tableau de bord  ───────────────────────── */
export function DashboardMock() {
  return (
    <Chrome path="skema.app / tableau de bord">
      <div className="flex">
        <Rail active={0} />
        <div className="min-w-0 flex-1 space-y-3 p-4">
          <Motif className="w-4" />
          <p className="font-hand text-lg leading-none text-nuit">Bonjour, la journée en un écran</p>
          <div className="grid grid-cols-4 gap-2">
            {[
              { k: "Familles", v: "138", tone: "bg-lavande text-violet" },
              { k: "Payé", v: "106", tone: "bg-menthe text-turquoise" },
              { k: "Retard", v: "13", tone: "bg-peche text-corail" },
              { k: "Impayé", v: "9", tone: "bg-[#FFE3E0] text-corail" },
            ].map((s) => (
              <div key={s.k} className={`rounded-xl px-2 py-2 ${s.tone}`}>
                <div className="text-[7.5px] font-bold uppercase tracking-[0.12em] opacity-80">{s.k}</div>
                <div className="mt-0.5 text-base font-bold text-nuit">{s.v}</div>
              </div>
            ))}
          </div>
          <div className="rounded-2xl bg-muted/60 p-3">
            <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Statistique générale</p>
            <div className="mt-2 flex h-16 items-end gap-1.5">
              {[38, 62, 45, 78, 52, 88, 60, 71].map((h, i) => (
                <div
                  key={i}
                  style={{ height: `${h}%` }}
                  className={`flex-1 rounded-t-[3px] ${i % 3 === 0 ? "bg-violet/70" : i % 3 === 1 ? "bg-turquoise/70" : "bg-ocre/80"}`}
                />
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Paiements en attente</p>
            {[
              ["Famille Alaoui", "2 400", "Retard"],
              ["Famille Benali", "1 950", "Impayé"],
            ].map(([n, a, s]) => (
              <div key={n} className="flex items-center gap-2 rounded-xl bg-papier px-2.5 py-1.5 ring-1 ring-nuit/6">
                <span className="grid size-6 place-items-center rounded-full bg-lavande text-[9px] font-bold text-violet">
                  {n!.slice(8, 9)}
                </span>
                <span className="text-[10px] font-semibold text-nuit">{n}</span>
                <span className="ml-auto text-[10px] font-bold text-nuit">{a} MAD</span>
                <StatusPill s={s!} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </Chrome>
  );
}

/* ─────────────────────────────  Familles  ──────────────────────────── */
export function FamillesMock() {
  return (
    <Chrome path="skema.app / parents">
      <div className="flex">
        <Rail active={2} />
        <div className="min-w-0 flex-1 space-y-3 p-4">
          <Motif className="w-4" />
          <p className="font-hand text-lg leading-none text-nuit">Mes clients</p>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="flex-1 rounded-full bg-muted/70 px-2.5 py-1.5 text-[9px] text-nuit/40">
              Rechercher par nom, email…
            </span>
            <span className={chip}>Tous les niveaux</span>
            <span className={chip}>Tous les services</span>
            <span className="text-[8.5px] font-semibold text-nuit/45">138 clients</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { t: "Revenu par service", legend: [["Transport", "#001B3D"], ["Cantine", "#6C4DF6"], ["Garderie", "#FF666B"]] },
              { t: "Répartition par niveau", legend: [["MS1 · 20%", "#6C4DF6"], ["GS2 · 14%", "#001B3D"], ["CE1 · 11%", "#6C8FD6"]] },
            ].map((c) => (
              <div key={c.t} className="rounded-2xl bg-muted/50 p-2.5">
                <p className="text-[7.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{c.t}</p>
                <div className="mt-2 flex items-center gap-2">
                  <span
                    className="size-9 shrink-0 rounded-full"
                    style={{ background: "conic-gradient(#001B3D 0 38%, #6C4DF6 0 76%, #FF666B 0 90%, #FFB347 0)" }}
                  />
                  <ul className="space-y-0.5">
                    {c.legend.map(([l, col]) => (
                      <li key={l} className="flex items-center gap-1 text-[8px] text-nuit/65">
                        <span className="size-1.5 rounded-full" style={{ backgroundColor: col }} />
                        {l}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
          <div className="overflow-hidden rounded-xl ring-1 ring-nuit/8">
            <table className="w-full">
              <thead className="bg-muted/60">
                <tr>
                  <th className={th}>Parent</th>
                  <th className={th}>Niveau</th>
                  <th className={`${th} text-right`}>Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-nuit/8">
                {[
                  ["M. Issam Bensaid", "CM2", "Payé"],
                  ["Mme Alaoui", "6ème", "Retard"],
                  ["M. Cherkaoui", "MS1", "En attente"],
                ].map(([p, n, s]) => (
                  <tr key={p} className="bg-card">
                    <td className={`${td} font-semibold text-nuit`}>{p}</td>
                    <td className={td}>{n}</td>
                    <td className={`${td} text-right`}>
                      <StatusPill s={s!} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Chrome>
  );
}

/* ────────────────────────────  Paiements  ─────────────────────────── */
export function PaiementsMock() {
  return (
    <Chrome path="skema.app / paiement">
      <div className="flex">
        <Rail active={3} />
        <div className="min-w-0 flex-1 space-y-3 p-4">
          <Motif className="w-4" />
          <p className="font-hand text-lg leading-none text-nuit">Historique des paiements</p>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="flex-1 rounded-full bg-muted/70 px-2.5 py-1.5 text-[9px] text-nuit/40">
              Rechercher par parent, reçu…
            </span>
            <span className={chip}>Tous les mois</span>
            <span className={chip}>Tous les modes</span>
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-muted/50 p-2.5">
            <span
              className="size-12 shrink-0 rounded-full"
              style={{ background: "conic-gradient(#17B3A6 0 24%, #001B3D 0 48%, #FFB347 0 74%, #FF666B 0)" }}
            />
            <ul className="grid flex-1 grid-cols-2 gap-x-2 gap-y-0.5">
              {[
                ["Chèque", "#17B3A6"],
                ["Espèces", "#001B3D"],
                ["Virement", "#FFB347"],
                ["Carte", "#FF666B"],
              ].map(([l, c]) => (
                <li key={l} className="flex items-center gap-1 text-[8.5px] text-nuit/65">
                  <span className="size-1.5 rounded-full" style={{ backgroundColor: c }} />
                  {l}
                </li>
              ))}
            </ul>
          </div>
          <div className="overflow-hidden rounded-xl ring-1 ring-nuit/8">
            <table className="w-full">
              <thead className="bg-muted/60">
                <tr>
                  <th className={th}>Parent</th>
                  <th className={`${th} text-right`}>Montant</th>
                  <th className={th}>Mode</th>
                  <th className={`${th} text-right`}>Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-nuit/8">
                {[
                  ["M. Issam Bensaid", "1 950", "Chèque", "Payé"],
                  ["Mme Ouazzani", "2 400", "Virement", "Payé"],
                  ["M. Idrissi", "1 800", "Carte", "Payé"],
                ].map(([p, a, m, s]) => (
                  <tr key={p} className="bg-card">
                    <td className={`${td} font-semibold text-nuit`}>{p}</td>
                    <td className={`${td} text-right font-bold text-nuit`}>{a} MAD</td>
                    <td className={td}>{m}</td>
                    <td className={`${td} text-right`}>
                      <StatusPill s={s!} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Chrome>
  );
}

/* ─── kept for the hero collage accent card ─── */
export function TimetableMock() {
  const cells = [
    "bg-lavande text-violet",
    "bg-menthe text-turquoise",
    "",
    "bg-peche text-corail",
    "bg-bleu-doux text-nuit",
    "",
    "bg-menthe text-turquoise",
    "bg-lavande text-violet",
    "bg-peche text-corail",
    "",
    "bg-bleu-doux text-nuit",
    "bg-menthe text-turquoise",
  ];
  return (
    <div className="w-full rounded-[22px] bg-card p-4 ring-1 ring-nuit/8 shadow-[0_30px_60px_-38px_rgba(0,27,61,0.5)]">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-bold text-nuit">Calendrier · 6ème A</span>
        <span className="rounded-full bg-lavande px-2 py-0.5 text-[9px] font-bold text-violet">SANS CONFLIT</span>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {["Lun", "Mar", "Mer", "Jeu"].map((d) => (
          <div key={d} className="text-center text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
            {d}
          </div>
        ))}
        {cells.map((tone, i) => (
          <div
            key={i}
            className={`h-9 rounded-lg text-[9px] font-semibold ${tone || "bg-muted/60"} grid place-items-center`}
          >
            {tone ? ["Maths", "SVT", "Franç.", "Hist."][i % 4] : ""}
          </div>
        ))}
      </div>
    </div>
  );
}
