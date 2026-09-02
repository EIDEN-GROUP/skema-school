/**
 * Central analytics wrapper.
 *
 * - The ONLY file allowed to import the Amplitude SDK. Application code uses
 *   `analytics.*` from `./index.ts`.
 * - Client-only, lazy-loaded, never throws, never blocks rendering.
 * - Consent-gated: while consent is pending events are buffered in-memory
 *   (never transmitted); on decline they are dropped; on accept they are sent.
 * - Safe when the API key is missing, when analytics is disabled, and on the
 *   server (SSR) where everything is a no-op.
 */

import { EVENTS, type EventName } from "./events";
import { getConsent, isConsentAccepted, setConsentState } from "./privacy";
import { startReplayIfAllowed } from "./replay";
import type { EventProperties, Locale, UserRole } from "./types";

type AmplitudeModule = typeof import("@amplitude/analytics-browser");

const API_KEY = import.meta.env.VITE_AMPLITUDE_API_KEY as string | undefined;
const ENABLED = (import.meta.env.VITE_ANALYTICS_ENABLED ?? "true") !== "false";
const DEBUG = (import.meta.env.VITE_ANALYTICS_DEBUG ?? "false") === "true";

const MAX_BUFFER = 200;

let sdkPromise: Promise<AmplitudeModule | null> | null = null;
let sdkRef: AmplitudeModule | null = null;
let coreReady = false;

const buffer: Array<{ name: string; props?: Record<string, unknown> }> = [];

let currentRole: UserRole | undefined;
let currentLocale: Locale | undefined;

function debugLog(message: string, ...args: unknown[]): void {
  if (DEBUG && typeof console !== "undefined") {
    console.log(`[analytics] ${message}`, ...args);
  }
}

/** Analytics is only usable on the client, when enabled AND a key is configured. */
export function isAnalyticsEnabled(): boolean {
  return Boolean(ENABLED && typeof window !== "undefined" && API_KEY);
}

async function loadSdk(): Promise<AmplitudeModule | null> {
  if (!isAnalyticsEnabled()) return null;
  if (!sdkPromise) {
    sdkPromise = import("@amplitude/analytics-browser")
      .then((m) => m as AmplitudeModule)
      .catch((err: unknown) => {
        debugLog("SDK load failed", err);
        return null;
      });
  }
  return sdkPromise;
}

function bufferEvent(name: string, props?: Record<string, unknown>): void {
  if (buffer.length >= MAX_BUFFER) buffer.shift();
  buffer.push({ name, props });
}

function flushBuffer(): void {
  if (getConsent() !== "accepted" || !sdkRef) return;
  while (buffer.length > 0) {
    const { name, props } = buffer.shift() as { name: string; props?: Record<string, unknown> };
    try {
      sdkRef.track(name, props);
    } catch {
      /* analytics must never break the app */
    }
  }
}

function trackRaw(name: string, props?: Record<string, unknown>): void {
  const consent = getConsent();
  if (consent === "declined") return; // drop
  if (consent !== "accepted" || !sdkRef) {
    bufferEvent(name, props);
    return;
  }
  try {
    sdkRef.track(name, props);
  } catch (err) {
    debugLog("track failed", err);
  }
}

/**
 * Initialize the SDK. Idempotent and safe to call multiple times.
 * Call once at application startup (client only) — see RootComponent.
 */
export async function init(): Promise<void> {
  if (typeof window === "undefined" || coreReady) return;
  coreReady = true;
  if (!isAnalyticsEnabled()) {
    buffer.length = 0;
    return;
  }
  const sdk = await loadSdk();
  sdkRef = sdk;
  if (!sdk) {
    buffer.length = 0;
    return;
  }
  try {
    sdk.init(API_KEY as string, undefined, {
      optOut: !isConsentAccepted(),
      defaultTracking: false,
      ...(DEBUG ? { debugLogsEnabled: true } : {}),
      ...(DEBUG ? { logLevel: sdk.Types.LogLevel.Debug } : {}),
    });
  } catch (err) {
    debugLog("init failed", err);
    buffer.length = 0;
    return;
  }
  if (isConsentAccepted()) flushBuffer();
}

/** Apply (or revoke) analytics consent. Never blocks the UI. */
export function setConsent(accepted: boolean): void {
  setConsentState(accepted ? "accepted" : "declined");
  if (accepted) {
    void (async () => {
      await init();
      if (sdkRef) {
        try {
          sdkRef.setOptOut(false);
        } catch {
          /* ignore */
        }
      }
      flushBuffer();
      // Replay (public marketing pages only) may begin now that consent exists.
      if (typeof window !== "undefined") {
        void startReplayIfAllowed(window.location.pathname);
      }
    })();
  } else {
    if (sdkRef) {
      try {
        sdkRef.setOptOut(true);
      } catch {
        /* ignore */
      }
    }
    buffer.length = 0;
  }
}

/** Sync user identity (Supabase user id) and safe user properties. */
export function setUser(userId: string | null, props?: Record<string, unknown>): void {
  if (!userId) {
    reset();
    return;
  }
  void (async () => {
    const sdk = await loadSdk();
    if (!sdk || getConsent() !== "accepted") return;
    try {
      sdk.setUserId(userId);
      const identify = new sdk.Identify();
      for (const [key, value] of Object.entries(props ?? {})) {
        if (value != null && typeof value !== "object")
          identify.set(key, value as string | number | boolean);
      }
      sdk.identify(identify);
    } catch (err) {
      debugLog("identify failed", err);
    }
  })();
}

/** Attribute events to an organization/school (Amplitude groups). */
export function setGroup(groupType: string, groupName: string): void {
  void (async () => {
    const sdk = await loadSdk();
    if (!sdk || getConsent() !== "accepted") return;
    try {
      sdk.setGroup(groupType, groupName);
    } catch (err) {
      debugLog("setGroup failed", err);
    }
  })();
}

/** Clear the user identity (e.g. on logout). */
export function reset(): void {
  currentRole = undefined;
  void (async () => {
    const sdk = await loadSdk();
    if (!sdk || getConsent() !== "accepted") return;
    try {
      sdk.reset();
    } catch (err) {
      debugLog("reset failed", err);
    }
  })();
}

/** Remember current role/locale so they are attached to every event. */
export function setUserContext(context: { role?: UserRole | null; locale?: Locale }): void {
  currentRole = context.role ?? undefined;
  currentLocale = context.locale ?? "fr";
}

export function track<T extends EventName>(name: T, props?: EventProperties<T>): void {
  const merged: Record<string, unknown> = { ...props };
  if (props?.role === undefined && currentRole) merged.role = currentRole;
  if (props?.locale === undefined) merged.locale = currentLocale ?? "fr";
  debugLog(name, merged);
  trackRaw(EVENTS[name], merged);
  // Ensure startup init runs even if the app root never invoked it explicitly.
  void init();
}

/** Page/screen view, with a sanitized route (no query params / secrets). */
export function trackPage(page: {
  route: string;
  page_name: string;
  role?: UserRole | null;
  authenticated: boolean;
  locale?: Locale;
}): void {
  track("page_viewed", {
    route: page.route,
    page_name: page.page_name,
    role: page.role ?? undefined,
    authenticated: page.authenticated,
    locale: page.locale,
  });
}

const FIRST_EVENT_PREFIX = "skema_first_";

/**
 * Fire a one-time activation milestone event. The event is tracked at most
 * once per browser (persisted in localStorage) so repeated visits never
 * inflate first-time metrics.
 */
export function trackFirstOnce(
  storageKey: string,
  eventName: EventName,
  props?: EventProperties<typeof eventName>,
): void {
  if (typeof window === "undefined") return;
  const fullKey = `${FIRST_EVENT_PREFIX}${storageKey}`;
  try {
    if (localStorage.getItem(fullKey)) return;
    localStorage.setItem(fullKey, "1");
  } catch {
    /* private mode — still fire, fire once */
  }
  track(eventName, props);
}
