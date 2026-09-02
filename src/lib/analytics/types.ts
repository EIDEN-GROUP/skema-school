import type { EventName } from "./events";

/**
 * Strongly-typed property contracts for every analytics event.
 *
 * Only properties listed here may be sent. This is the privacy boundary:
 * anything sensitive (names, phones, emails, addresses, free text, secrets,
 * tokens, amounts) must never appear — use the safe helpers from `privacy.ts`
 * (e.g. `amountBucket`) instead.
 */

export type Locale = "fr" | "ar";
export type UserRole = "admin" | "superadmin";
export type ReferrerCategory = "direct" | "organic" | "social" | "referral";
export type BillingPeriod = "monthly" | "yearly";
export type AmountBucket = "0-500" | "500-2000" | "2000-5000" | "5000+";
export type PaymentMethod = "cash" | "transfer" | "card" | "check" | "unknown";
export type Channel = "whatsapp" | "email";
export type MessageType = "custom" | "payment_reminder" | "payment_confirmation" | "broadcast";
export type PlanningType = "planification" | "holiday" | "vacation";
export type ErrorType =
  | "invalid_credentials"
  | "rate_limited"
  | "validation"
  | "network"
  | "not_found"
  | "forbidden"
  | "server"
  | "unknown";

/** Shared properties available on every event (auto-added by the wrapper). */
export type CommonProperties = {
  role?: UserRole;
  locale?: Locale;
};

export type EventPropertiesMap = {
  landing_viewed: { pathname?: string; referrer_category?: ReferrerCategory };
  pricing_viewed: { source?: string };
  pricing_plan_selected: {
    plan: "essentiel" | "pro" | "reseau";
    tier?: number;
    billing_period?: BillingPeriod;
    locale?: Locale;
    referrer_category?: ReferrerCategory;
  };
  pricing_tier_selected: { tier: number; plan?: string; billing_period?: BillingPeriod };
  pricing_billing_selected: { billing_period: BillingPeriod; plan?: string; tier?: number };
  demo_form_started: { source?: string };
  demo_request_submitted: {
    plan?: string;
    tier?: number;
    billing_period?: BillingPeriod;
    locale?: Locale;
    referrer_category?: ReferrerCategory;
    pathname?: string;
  };

  login_started: { auth_method: "email_password" };
  login_succeeded: { auth_method: "email_password"; role?: UserRole };
  login_failed: { auth_method: "email_password"; error_type: ErrorType };
  logout: { role?: UserRole };

  dashboard_viewed: { role?: UserRole };
  first_dashboard_view: { role?: UserRole };
  onboarding_started: { step?: string };
  onboarding_step_completed: { step?: string };
  onboarding_completed: { steps?: number };

  families_viewed: { role?: UserRole };
  family_created: { source?: "wizard" | "import"; family_count?: number };
  family_updated: { role?: UserRole };
  family_deleted: { family_count?: number; role?: UserRole };
  family_search_used: { role?: UserRole };
  family_filter_used: { filter_type: string; role?: UserRole };
  family_import_completed: { imported?: number; errors?: number };
  student_created: { family_count?: number };
  student_updated: { role?: UserRole };
  student_deleted: { role?: UserRole };

  payments_viewed: { role?: UserRole };
  payment_started: { source?: string; role?: UserRole };
  payment_created: {
    payment_method: PaymentMethod;
    payment_status?: string;
    amount_bucket: AmountBucket;
    role?: UserRole;
  };
  payment_updated: { role?: UserRole };
  payment_failed: { payment_method?: PaymentMethod; error_type: ErrorType; role?: UserRole };
  payments_exported: { rows?: number; format: "csv" };
  receipt_generated: { role?: UserRole };
  receipt_sent: { channel?: Channel; role?: UserRole };
  payment_reminder_sent: {
    channel?: Channel;
    message_type?: MessageType;
    recipient_count?: number;
    success_count?: number;
    failure_count?: number;
    role?: UserRole;
  };
  payment_status_filtered: { filter_type: string; role?: UserRole };
  invoice_viewed: { role?: UserRole };
  invoice_generated: { role?: UserRole };
  invoice_exported: { format?: string; rows?: number };

  calendar_viewed: { role?: UserRole };
  planning_viewed: { role?: UserRole };
  planning_created: { planning_type?: PlanningType; role?: UserRole };
  planning_updated: { planning_type?: PlanningType; role?: UserRole };
  planning_deleted: { planning_type?: PlanningType; role?: UserRole };
  appointment_created: { planning_type?: PlanningType; role?: UserRole };
  appointment_updated: { planning_type?: PlanningType; role?: UserRole };
  appointment_deleted: { planning_type?: PlanningType; role?: UserRole };

  reports_viewed: { role?: UserRole };
  report_generated: { report_type?: string; format?: string; role?: UserRole };
  report_exported: { report_type?: string; format?: string; role?: UserRole };
  report_downloaded: { report_type?: string; format?: string; role?: UserRole };

  messaging_viewed: { role?: UserRole };
  message_started: { channel?: Channel; mode?: "individual" | "all"; role?: UserRole };
  message_sent: {
    channel: Channel;
    message_type: MessageType;
    recipient_count?: number;
    role?: UserRole;
  };
  message_failed: { channel?: Channel; error_type: ErrorType; role?: UserRole };
  broadcast_started: { channel?: Channel; role?: UserRole };
  broadcast_sent: {
    channel?: Channel;
    recipient_count?: number;
    success_count?: number;
    failure_count?: number;
    role?: UserRole;
  };

  settings_viewed: { role?: UserRole };
  settings_updated: { section: string; role?: UserRole };
  user_invited: { role?: UserRole };
  user_removed: { role?: UserRole };
  role_changed: { from?: string; to?: string };

  superadmin_dashboard_viewed: { role?: UserRole };
  school_viewed: { plan?: string; status?: string; role?: UserRole };
  school_selected: { role?: UserRole };
  account_status_changed: { status: "actif" | "suspendu"; role?: UserRole };
  subscription_viewed: { role?: UserRole };

  page_viewed: {
    route: string;
    page_name: string;
    role?: UserRole;
    authenticated: boolean;
    locale?: Locale;
  };

  first_family_created: { source?: "wizard" | "import" };
  first_student_created: Record<string, never>;
  first_payment_recorded: Record<string, never>;
  first_report_generated: Record<string, never>;
  first_message_sent: { channel?: Channel };
  first_planning_created: Record<string, never>;

  action_failed: { action: string; module?: string; error_type: ErrorType };
  report_generation_failed: { report_type?: string; error_type: ErrorType };
  form_submission_failed: { form: string; error_type: ErrorType };

  organic_landing_viewed: { pathname?: string; referrer_category?: ReferrerCategory };
  search_cta_clicked: {
    page_name?: string;
    cta_location?: string;
    search_intent_category?: string;
  };
  seo_content_viewed: { content_type?: string; page_name?: string; locale?: Locale };
  faq_expanded: { question_index?: number; page_name?: string };
  internal_link_clicked: { page_name?: string; target?: string };
  demo_cta_clicked: { page_name?: string; cta_location: string; locale?: Locale };
  contact_cta_clicked: { page_name?: string; cta_location: string };
};

export type EventProperties<T extends EventName> = EventPropertiesMap[T] &
  Partial<CommonProperties>;

export type AnyEventProperties = { [K in EventName]?: EventPropertiesMap[K] };

export const AMOUNT_BUCKETS = ["0-500", "500-2000", "2000-5000", "5000+"] as const;
