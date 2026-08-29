/**
 * Snapshot of demo data used on real dashboard routes   kept in sync for the landing miniature.
 * Les pages calquent la navigation réelle (`useDashboardNav`) :
 * dashboard.index, dashboard.calendar, dashboard.familles, dashboard.paiements,
 * dashboard.affiches, dashboard.settings.
 */
import type { LucideIcon } from "lucide-react";
import { Users, CreditCard, AlertCircle, Banknote, Plus, Clock } from "lucide-react";

export type DashboardMiniaturePageId =
  | "dashboard"
  | "calendar"
  | "familles"
  | "paiements"
  | "affiches"
  | "settings";

export const mirrorFilterTags = ["CLIENTS", "PAIEMENTS", "DETTE", "COLLECTE"] as const;

/**
 * Home dashboard snapshot   mirrors the reworked `dashboard.index` route:
 * 4 status cards + « Statistique générale » composed chart with a KPI column +
 * « Derniers paiements » activity list.
 */
export const mirrorDashboardMetrics: readonly {
  k: string;
  label: string;
  value: string;
  sub: string;
  accent: string;
  tint: string;
  icon: LucideIcon;
  to: string;
  /** Pastille d'analyse   seule la carte Impayé en affiche une (cf. dashboard.index). */
  extra?: string;
}[] = [
  { k: "01", label: "Total familles", value: "4", sub: "familles inscrites", accent: "#001B3D", tint: "rgba(40,57,108,0.10)", icon: Users, to: "/dashboard/familles" },
  { k: "02", label: "Payé", value: "2", sub: "reçus ce mois", accent: "#17B3A6", tint: "rgba(107,165,58,0.14)", icon: CreditCard, to: "/dashboard/paiements" },
  { k: "03", label: "En retard", value: "1", sub: "relance conseillée", accent: "#FF666B", tint: "rgba(226,92,92,0.12)", icon: Clock, to: "/dashboard/paiements" },
  { k: "04", label: "En attente", value: "1", sub: "facture en attente", accent: "#FFB347", tint: "rgba(232,161,60,0.14)", icon: AlertCircle, to: "/dashboard/paiements", extra: "1 200 MAD en attente" },
];

/** « Paiements en attente » (Créances)   file de relance sous les derniers paiements. */
export const mirrorPendingDues = [
  { id: "d1", name: "Youssef Benjelloun / Salma Benjelloun", level: "CE2", status: "retard" as const, days: 21, amount: 1200 },
  { id: "d2", name: "Rachid Cherkaoui / Houda Cherkaoui", level: "CP", status: "en_attente" as const, days: 0, amount: 900 },
] as const;

export const mirrorPendingTotal = mirrorPendingDues.reduce((s, d) => s + d.amount, 0);

/** Encaissé (k MAD) + paiements reçus   subset of `STAT_SERIES["2026"].semestre`. */
export const mirrorStatSeries: { mois: string; encaisse: number; paiements: number }[] = [
  { mois: "Jan", encaisse: 34, paiements: 22 },
  { mois: "Fév", encaisse: 42, paiements: 27 },
  { mois: "Mar", encaisse: 41, paiements: 26 },
  { mois: "Avr", encaisse: 33, paiements: 21 },
  { mois: "Mai", encaisse: 48, paiements: 31 },
  { mois: "Juin", encaisse: 44, paiements: 29 },
];

/** Side KPI column   same figures as `STAT_KPIS` on the real dashboard. */
export const mirrorStatKpis = [
  { label: "Total encaissé", value: "457k", delta: "+62k", up: true },
  { label: "Paiements reçus", value: "293", delta: "+24", up: true },
  { label: "Impayés", value: "38", delta: "+7", up: false },
  { label: "Inscriptions", value: "46", delta: "+12", up: true },
] as const;

/** « Derniers paiements » list   mirrors `LAST_PAYMENTS` on the real dashboard. */
export const mirrorLastPayments = [
  { who: "Karim Alami / Nadia Alami", note: "Frais mensuels · Yasmine", amount: "3 600", status: "paye" as const },
  { who: "Mehdi Tazi / Imane Tazi", note: "Frais mensuels · Adam", amount: "1 800", status: "paye" as const },
  { who: "Youssef Benjelloun / Salma Benjelloun", note: "Échéance dépassée · Sara", amount: "1 200", status: "retard" as const },
] as const;


export const mirrorMetrics: readonly {
  k: string;
  label: string;
  value: string;
  sub: string;
  badge: string;
  borderClass: string;
  icon: LucideIcon;
}[] = [
  {
    k: "01",
    label: "TOTAL CLIENTS",
    value: "4",
    sub: "1 actif",
    badge: "Actif",
    borderClass: "border-t-primary",
    icon: Users,
  },
  {
    k: "02",
    label: "PAYÉS CE MOIS",
    value: "2",
    sub: "1 en attente",
    badge: "Actif",
    borderClass: "border-t-chart-4",
    icon: CreditCard,
  },
  {
    k: "03",
    label: "DETTE TOTALE",
    value: "0 MAD",
    sub: "Calculé dynamiquement",
    badge: "Actif",
    borderClass: "border-t-chart-2",
    icon: AlertCircle,
  },
  {
    k: "04",
    label: "REVENU TOTAL",
    value: "12 600 MAD",
    sub: "Rapports & paiements (démo)",
    badge: "Actif",
    borderClass: "border-t-muted-foreground",
    icon: Banknote,
  },
];

export const mirrorQuickActions: readonly { title: string; desc: string; icon: LucideIcon }[] = [
  { title: "Gérer les clients", desc: "Voir et modifier les informations des clients.", icon: Users },
  { title: "Enregistrer un paiement", desc: "Sélectionner un parent et enregistrer.", icon: CreditCard },
  { title: "Clients en retard", desc: "Voir les clients avec des paiements en retard.", icon: Clock },
  { title: "Ajouter un client", desc: "Créer un nouveau client depuis le dashboard.", icon: Plus },
];

/**
 * Table « Liste des clients »   colonnes du `dashboard.familles` actuel :
 * Parent · Élève(s) · Niveau · Services · Remise fratrie · Mensuel (Payé / Reste).
 * `eleves` reflète `child_names` : une famille peut scolariser plusieurs élèves.
 */
export const mirrorClients = [
  {
    id: "1",
    parent: "Karim Alami / Nadia Alami",
    eleves: ["Yasmine Alami", "Omar Alami"],
    niveau: "CE2",
    email: "k.alami@gmail.com",
    phone: "0661122334",
    services: ["Transport scolaire", "Cantine"] as readonly string[],
    remise: 10,
    payment: "paye",
    mensuel: 3600,
    dette: 0,
  },
  {
    id: "2",
    parent: "Mehdi Tazi / Imane Tazi",
    eleves: ["Adam Tazi"],
    niveau: "CM1",
    email: "m.tazi@gmail.com",
    phone: "0622334455",
    services: ["Garderie"] as readonly string[],
    remise: 0,
    payment: "paye",
    mensuel: 1800,
    dette: 0,
  },
  {
    id: "3",
    parent: "Youssef Benjelloun / Salma Benjelloun",
    eleves: ["Sara Benjelloun"],
    niveau: "CE2",
    email: "y.benjelloun@gmail.com",
    phone: "0611223344",
    services: ["Cantine"] as readonly string[],
    remise: 0,
    payment: "retard",
    mensuel: 1200,
    dette: 1200,
  },
  {
    id: "4",
    parent: "Rachid Cherkaoui / Houda Cherkaoui",
    eleves: ["Lina Cherkaoui"],
    niveau: "CP",
    email: "r.cherkaoui@gmail.com",
    phone: "0655667788",
    services: [] as readonly string[],
    remise: 0,
    payment: "en_attente",
    mensuel: 900,
    dette: 900,
  },
] as const;

/** Donut « Revenu par service »   prix du service × nb de familles abonnées. */
export const mirrorServiceRevenue = [
  { name: "Transport scolaire", value: 4800, color: "#001B3D" },
  { name: "Cantine", value: 3000, color: "#6C4DF6" },
  { name: "Garderie", value: 1600, color: "#FF666B" },
] as const;

export const mirrorServiceRevenueTotal = mirrorServiceRevenue.reduce((s, d) => s + d.value, 0);

/** Donut « Répartition par niveau »   compte les élèves de `mirrorClients`. */
export const mirrorLevelSplit = [
  { name: "CE2", value: 3, color: "#001B3D" },
  { name: "CM1", value: 1, color: "#6C4DF6" },
  { name: "CP", value: 1, color: "#FF666B" },
] as const;

export const mirrorLevelSplitTotal = mirrorLevelSplit.reduce((s, d) => s + d.value, 0);

/** Table des paiements   colonnes réelles : Parent · Élève · Niveau · Montant ·
 *  Date · Mode · Statut · N° de reçu · Reçu de paiement. */
export const mirrorPaymentRows = [
  {
    id: "1",
    parent: "Karim Alami / Nadia Alami",
    enfant: "Yasmine Alami",
    niveau: "CE2",
    montant: 3600,
    date: "05/05/2026",
    mode: "ESPÈCES",
    periode: "mai 2026",
    statut: "paye" as const,
    recu: "EDU-20260505-115",
    facture: "envoye" as const,
  },
  {
    id: "2",
    parent: "Mehdi Tazi / Imane Tazi",
    enfant: "Adam Tazi",
    niveau: "CM1",
    montant: 1800,
    date: "05/05/2026",
    mode: "VIREMENT",
    periode: "mai 2026",
    statut: "paye" as const,
    recu: "EDU-20260505-253",
    facture: "non_envoye" as const,
  },
  {
    id: "3",
    parent: "Youssef Benjelloun / Salma Benjelloun",
    enfant: "Sara Benjelloun",
    niveau: "CE2",
    montant: 600,
    date: "03/05/2026",
    mode: "ESPÈCES",
    periode: "mai 2026",
    statut: "retard" as const,
    recu: "EDU-20260503-088",
    facture: "non_envoye" as const,
  },
] as const;

/** Donut « Répartition par mode » de la page Paiements. */
export const mirrorPaymentModes = [
  { name: "Espèces", value: 2, color: "#001B3D" },
  { name: "Virement", value: 1, color: "#6C4DF6" },
] as const;

export const mirrorPaymentsEncaisse = mirrorPaymentRows.reduce((s, r) => s + r.montant, 0);

/**
 * Page « Calendrier »   calque `dashboard.calendar` : légende (jour férié /
 * vacances / planification) puis une grille mensuelle. `startOffset` = nombre de
 * cases vides avant le 1er (lundi = première colonne).
 */
export const mirrorCalendar = {
  month: "Mai",
  year: 2026,
  startOffset: 4,
  daysInMonth: 31,
  weekDays: ["L", "M", "M", "J", "V", "S", "D"],
  today: 15,
  holidays: [1, 23] as readonly number[],
  vacations: [11, 12, 13, 14, 15] as readonly number[],
  planifications: [6, 19, 27] as readonly number[],
} as const;

/** Page « Paramètres »   les sections réelles de `dashboard.settings`. */
export const mirrorSettingsSections = [
  {
    title: "Niveaux scolaires",
    desc: "Niveaux et frais mensuels",
    rows: [
      { label: "CE2", value: "1 200 MAD" },
      { label: "CM1", value: "1 400 MAD" },
      { label: "CM2", value: "1 500 MAD" },
    ],
  },
  {
    title: "Services",
    desc: "Services proposés et tarifs",
    rows: [
      { label: "Transport scolaire", value: "600 MAD" },
      { label: "Cantine", value: "500 MAD" },
      { label: "Garderie", value: "400 MAD" },
    ],
  },
  {
    title: "Réduction fratrie",
    desc: "Remise par famille",
    rows: [
      { label: "Réduction", value: "10 %" },
      { label: "Nombre max d'enfants", value: "99" },
    ],
  },
  {
    title: "Échéance des paiements",
    desc: "Jour d'échéance et délai de grâce",
    rows: [
      { label: "Jour d'échéance", value: "5" },
      { label: "Délai de grâce", value: "5 jours" },
    ],
  },
] as const;

/** Table du personnel   colonnes réelles : Nom · Poste · Département · Contact ·
 *  Salaire · Statut · Actions. Le statut n'affiche que Actif / Inactif. */
export const mirrorEmployes = [
  {
    id: "e1",
    nomComplet: "Nadia El Mansouri",
    poste: "Responsable pédagogique",
    departement: "Pédagogie",
    email: "n.elmansouri@demo-crm.ma",
    tel: "0661122001",
    salaire: 9500,
    statut: "actif" as const,
  },
  {
    id: "e2",
    nomComplet: "Karim Tazi",
    poste: "Comptable",
    departement: "Finance",
    email: "k.tazi@demo-crm.ma",
    tel: "0662233004",
    salaire: 8200,
    statut: "actif" as const,
  },
  {
    id: "e3",
    nomComplet: "Sanae Benjelloun",
    poste: "Assistante administrative",
    departement: "Administration",
    email: "s.benjelloun@demo-crm.ma",
    tel: "0614020998",
    salaire: 6400,
    statut: "actif" as const,
  },
] as const;

/** Pied de tableau paginé   les tables du dashboard affichent 5 lignes par page. */
export const MIRROR_PAGE_SIZE = 5;
