/**
 * Analytics event taxonomy — the single source of truth for every event name
 * SKEMA sends to Amplitude.
 *
 * Rules:
 * - snake_case, stable, never renamed (renames split history).
 * - Every event is fired from a real user/business action (mutation success,
 *   explicit interaction) — never from renders, polling or cache refreshes.
 * - See docs/events.md for the full catalog with properties and privacy notes.
 */

export const EVENTS = {
  // Acquisition
  landing_viewed: "landing_viewed",
  pricing_viewed: "pricing_viewed",
  pricing_plan_selected: "pricing_plan_selected",
  pricing_tier_selected: "pricing_tier_selected",
  pricing_billing_selected: "pricing_billing_selected",
  demo_form_started: "demo_form_started",
  demo_request_submitted: "demo_request_submitted",

  // Authentication
  login_started: "login_started",
  login_succeeded: "login_succeeded",
  login_failed: "login_failed",
  logout: "logout",

  // Activation
  dashboard_viewed: "dashboard_viewed",
  first_dashboard_view: "first_dashboard_view",
  onboarding_started: "onboarding_started",
  onboarding_step_completed: "onboarding_step_completed",
  onboarding_completed: "onboarding_completed",

  // Families / students
  families_viewed: "families_viewed",
  family_created: "family_created",
  family_updated: "family_updated",
  family_deleted: "family_deleted",
  family_search_used: "family_search_used",
  family_filter_used: "family_filter_used",
  family_import_completed: "family_import_completed",
  student_created: "student_created",
  student_updated: "student_updated",
  student_deleted: "student_deleted",

  // Payments / finance
  payments_viewed: "payments_viewed",
  payment_started: "payment_started",
  payment_created: "payment_created",
  payment_updated: "payment_updated",
  payment_failed: "payment_failed",
  payments_exported: "payments_exported",
  receipt_generated: "receipt_generated",
  receipt_sent: "receipt_sent",
  payment_reminder_sent: "payment_reminder_sent",
  payment_status_filtered: "payment_status_filtered",
  invoice_viewed: "invoice_viewed",
  invoice_generated: "invoice_generated",
  invoice_exported: "invoice_exported",

  // Planning / calendar
  calendar_viewed: "calendar_viewed",
  planning_viewed: "planning_viewed",
  planning_created: "planning_created",
  planning_updated: "planning_updated",
  planning_deleted: "planning_deleted",
  appointment_created: "appointment_created",
  appointment_updated: "appointment_updated",
  appointment_deleted: "appointment_deleted",

  // Reports
  reports_viewed: "reports_viewed",
  report_generated: "report_generated",
  report_exported: "report_exported",
  report_downloaded: "report_downloaded",

  // Messaging / WhatsApp
  messaging_viewed: "messaging_viewed",
  message_started: "message_started",
  message_sent: "message_sent",
  message_failed: "message_failed",
  broadcast_started: "broadcast_started",
  broadcast_sent: "broadcast_sent",

  // Settings / administration
  settings_viewed: "settings_viewed",
  settings_updated: "settings_updated",
  user_invited: "user_invited",
  user_removed: "user_removed",
  role_changed: "role_changed",

  // Super admin
  superadmin_dashboard_viewed: "superadmin_dashboard_viewed",
  school_viewed: "school_viewed",
  school_selected: "school_selected",
  account_status_changed: "account_status_changed",
  subscription_viewed: "subscription_viewed",

  // Route / page
  page_viewed: "page_viewed",

  // First-time activation milestones
  first_family_created: "first_family_created",
  first_student_created: "first_student_created",
  first_payment_recorded: "first_payment_recorded",
  first_report_generated: "first_report_generated",
  first_message_sent: "first_message_sent",
  first_planning_created: "first_planning_created",

  // Errors / failures
  action_failed: "action_failed",
  report_generation_failed: "report_generation_failed",
  form_submission_failed: "form_submission_failed",

  // Organic discovery (SEO/GEO/AEO measurement)
  organic_landing_viewed: "organic_landing_viewed",
  search_cta_clicked: "search_cta_clicked",
  seo_content_viewed: "seo_content_viewed",
  faq_expanded: "faq_expanded",
  internal_link_clicked: "internal_link_clicked",
  demo_cta_clicked: "demo_cta_clicked",
  contact_cta_clicked: "contact_cta_clicked",
} as const;

export type EventName = keyof typeof EVENTS;
export type EventNameValue = (typeof EVENTS)[EventName];

export function isEventName(value: string): value is EventNameValue {
  return (Object.values(EVENTS) as string[]).includes(value);
}
