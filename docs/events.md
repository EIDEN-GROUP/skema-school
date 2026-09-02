# Event Catalog

Single source of truth for every Amplitude event. Event names are defined in
`src/lib/analytics/events.ts`; property contracts in `src/lib/analytics/types.ts`.

## Conventions

- All properties are optional unless noted (`*` = always sent).
- Role is auto-attached when known (`admin` / `superadmin`).
- No PII is ever sent. Monetary values use `amount_bucket`.

## Acquisition (public landing)

| Event | Properties | When |
|---|---|---|
| `landing_viewed` | pathname, referrer_category | Landing page viewed |
| `organic_landing_viewed` | pathname, referrer_category | Landing viewed from a search engine |
| `pricing_viewed` | source | Pricing section scrolled into view |
| `pricing_plan_selected`* | plan, tier, billing_period | A pricing plan card selected |
| `pricing_tier_selected`* | tier | Enrolment slider changed |
| `pricing_billing_selected`* | billing_period | Monthly/annual toggle |
| `demo_form_started` | source | First keystroke in the demo form |
| `demo_request_submitted` | plan, tier, billing_period, locale | Demo form submitted successfully |
| `demo_cta_clicked` | page_name, cta_location | Nav/hero/pricing "request demo" CTA |
| `contact_cta_clicked` | page_name, cta_location | "Talk to an expert" / contact CTA |
| `faq_expanded` | question_index, page_name | A FAQ item opened |
| `internal_link_clicked` | page_name, target | In-page nav anchor |

## Authentication

| Event | Properties | When |
|---|---|---|
| `login_started` | auth_method | Login form submitted |
| `login_succeeded` | auth_method, role | Supabase sign-in succeeded |
| `login_failed` | auth_method, error_type | Sign-in failed (coarse error only) |
| `logout` | role | User signed out |

## Activation

| Event | Properties | When |
|---|---|---|
| `dashboard_viewed` | role | Dashboard page opened (per visit) |
| `first_dashboard_view` | role | First ever dashboard view (localStorage-once) |
| `onboarding_started` | step | Add-family wizard opened |
| `onboarding_step_completed` | step | Wizard step advanced |
| `onboarding_completed` | steps | Family wizard finished |

First-time milestones (each fires once per browser via `trackFirstOnce`):

| Event | Key in localStorage |
|---|---|
| `first_family_created` | `skema_first_family_created` |
| `first_student_created` | `skema_first_student_created` |
| `first_payment_recorded` | `skema_first_payment_recorded` |
| `first_message_sent` | `skema_first_message_sent` |
| `first_planning_created` | `skema_first_planning_created` |

## Families / students

| Event | Properties | When |
|---|---|---|
| `families_viewed` | role | Families page opened |
| `family_created` | source (`wizard`/`import`) | Client created |
| `family_updated` | role | Client edited |
| `family_deleted` | role | Client deleted |
| `family_search_used` | role | Search query entered (debounced) |
| `family_filter_used` | filter_type (`niveau`/`service`) | Filter changed |
| `family_import_completed` | imported, errors | CSV import finished |
| `student_created` | family_count | Child added in wizard |
| `student_updated` | role | Child edited |
| `student_deleted` | role | Child removed |

## Payments / finance

| Event | Properties | When |
|---|---|---|
| `payments_viewed` | role | Payments page opened |
| `payment_started` | source | Payment dialog opened |
| `payment_created` | payment_method, amount_bucket | Payment saved |
| `payment_updated` | role | Payment record updated |
| `payment_failed` | payment_method, error_type | Payment mutation failed |
| `payments_exported` | rows, format | Payments CSV export |
| `receipt_generated` | role | Receipt PDF generated |
| `receipt_sent` | channel | Receipt sent (email/WhatsApp) |
| `payment_reminder_sent` | channel, message_type, recipient_count, success/failure_count | Reminder(s) sent |
| `payment_status_filtered` | filter_type | Payments list filter changed |
| `invoice_viewed` | role | Invoice opened |
| `invoice_generated` | role | Invoice created |
| `invoice_exported` | format, rows | Invoice exported |

## Planning / calendar

| Event | Properties | When |
|---|---|---|
| `calendar_viewed` | role | Calendar page opened |
| `planning_viewed` | role | Planning page opened |
| `planning_created` | planning_type (`planification`/`holiday`/`vacation`) | Planning entry created |
| `planning_updated` | planning_type | Planning entry updated |
| `planning_deleted` | planning_type | Planning entry deleted |
| `appointment_created` / `updated` / `deleted` | planning_type | Appointments (future) |

## Reports

| Event | Properties | When |
|---|---|---|
| `reports_viewed` | role | Reports page opened |
| `report_generated` / `exported` / `downloaded` | report_type, format | (future reporting features) |

## Messaging / WhatsApp

| Event | Properties | When |
|---|---|---|
| `messaging_viewed` | role | Message centre sheet opened |
| `message_started` | channel, mode | Compose started |
| `message_sent` | channel, message_type, recipient_count | Message delivered |
| `message_failed` | channel, error_type | Message failed |
| `broadcast_sent` | channel, recipient_count, success/failure_count | Broadcast sent |

Recipient phone numbers and message bodies are never sent.

## Settings / administration

| Event | Properties | When |
|---|---|---|
| `settings_viewed` | role | Settings page opened |
| `settings_updated` | section (`scolarite`/`paiements`/`etablissement`/`recu`) | Settings saved |
| `user_invited` | role | Admin invited |
| `user_removed` | role | Admin removed |
| `role_changed` | from, to | Role changed |

Configuration values, API keys and environment secrets are never sent.

## Super admin

| Event | Properties | When |
|---|---|---|
| `superadmin_dashboard_viewed` | role | Superadmin overview opened |
| `school_viewed` | plan, status | School opened/edited |
| `school_selected` | role | School created from a demo request |
| `account_status_changed` | status | School suspended/activated |
| `subscription_viewed` | role | Subscription details opened |

## Routing

| Event | Properties | When |
|---|---|---|
| `page_viewed` | route, page_name, role, authenticated, locale | Any route change (sanitized, no query params) |

## Errors / failures

| Event | Properties | When |
|---|---|---|
| `action_failed` | action, module, error_type | Route error boundary / generic failure |
| `payment_failed` | payment_method, error_type | Payment failed |
| `message_failed` | channel, error_type | Message send failed |
| `report_generation_failed` | report_type, error_type | Report generation failed |
| `form_submission_failed` | form, error_type | Form submission failed |

Raw error messages and stack traces are never sent — only the coarse `error_type`.

## Organic discovery (SEO/GEO/AEO)

| Event | Properties | When |
|---|---|---|
| `search_cta_clicked` | page_name, cta_location | Demo CTA from search results intent |
| `seo_content_viewed` | content_type, page_name | FAQ / answer content viewed |
| `contact_cta_clicked` | page_name, cta_location | Contact CTA |

Raw search queries are never captured.
