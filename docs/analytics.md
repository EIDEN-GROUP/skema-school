# Analytics — Developer Guide

## Stack

- **Provider:** Amplitude (browser SDK v2.45.8)
- **Wrapper:** `src/lib/analytics/` — the ONLY file that imports the Amplitude SDK
- **Consent:** Non-blocking banner, gated via `optOut` in Amplitude init
- **Session replay:** Public marketing pages only, after consent

## Initialization

Analytics is initialized automatically in `src/routes/__root.tsx`:

```ts
useEffect(() => { void init(); }, []);
```

`init()` is idempotent, client-only, and never throws. It loads the Amplitude SDK lazily (dynamic import) so the initial bundle is not affected.

## How to add a new event

1. Add the event name to `src/lib/analytics/events.ts` (the `EVENTS` const)
2. Add property types to `src/lib/analytics/types.ts` (the `EventPropertiesMap` interface)
3. Call `track("event_name", { ...props })` from your mutation success handler or user interaction point

## Event naming rules

- `snake_case` only
- Stable: once published, never rename (renames split history in Amplitude)
- No prefixes like `skema_` — the event name itself describes the action
- Group: `noun_verb` (e.g. `family_created`, `payment_failed`)

## Property naming rules

- `snake_case` for property keys
- Never include PII (names, emails, phones, addresses, notes, message bodies)
- Monetary values: use `amountBucket(value)` which returns a coarse bucket string
- Payment modes: use `paymentMethod(mode)` which returns a normalized type
- Error types: use `errorType(err)` which returns a coarse, non-sensitive category
- No raw stack traces, no tokens, no secrets

## PII rules — NEVER send

| Do NOT send | Safe alternative |
|---|---|
| student/parent names | omitted |
| phone numbers | omitted |
| email addresses | omitted |
| addresses | omitted |
| notes / free text | omitted |
| message bodies | omitted |
| passwords / tokens | omitted |
| Supabase access tokens | omitted |
| raw amounts (MAD) | `amountBucket(value)` |
| raw error messages | `errorType(err)` |
| payment card info | omitted |
| invoice numbers | omitted |

## Consent rules

- Consent state is stored in `localStorage` key `skema_analytics_consent`
- Possible values: `"accepted"`, `"declined"`, or absent (pending)
- While pending: events are buffered in-memory (max 200) — never transmitted
- On decline: buffer is cleared, SDK `setOptOut(true)` — no events sent
- On accept: buffer is flushed, SDK `setOptOut(false)` — normal operation
- The consent banner is rendered on every page while consent is pending
- The app works identically whether analytics is on or off

## User identity

- User ID = Supabase user `id` (UUID, not email)
- Identity is set in `AnalyticsPageTracker` (see `src/components/analytics-page-tracker.tsx`)
- Set on login success, cleared on logout
- Safe user properties: `role`, `locale`
- Group attribution: `setGroup("school", centerId)` using the primary center from `center_admins`

## School / group identity

- Every authenticated event is attributed to a school via `setGroup("school", centerId)`
- The center ID is resolved from the authenticated user's `center_admins` table
- Resolved via `getCurrentSchool` server function in `src/lib/server-school.ts`

## Environment configuration

| Variable | Where | Purpose |
|---|---|---|
| `VITE_AMPLITUDE_API_KEY` | Vercel (prod/preview) + `.env` | Amplitude project API key |
| `VITE_ANALYTICS_ENABLED` | Vercel (prod: `true`, preview: `false`) | Gate analytics on/off |
| `VITE_ANALYTICS_DEBUG` | `.env` (dev only) | Enable debug logging |
| `PUBLIC_SITE_URL` | Vercel (prod) | Canonical site URL (optional; defaults to production) |

**Single Amplitude project strategy:** One Amplitude project is used for production. Preview/staging deployments set `VITE_ANALYTICS_ENABLED=false` so no dev traffic reaches the project. If you later need separate environments, create distinct Amplitude projects and set `VITE_AMPLITUDE_API_KEY` per Vercel environment.

## How to verify events

1. **Browser DevTools Console:** Set `VITE_ANALYTICS_DEBUG=true` locally → see `[analytics]` logs
2. **Amplitude Debug View:** In the Amplitude dashboard, use the Debug View to see live events
3. **Network tab:** Filter by `api2.amplitude.com` to see the outgoing requests
4. **Session Replay:** In the Amplitude dashboard, open the Session Replay section