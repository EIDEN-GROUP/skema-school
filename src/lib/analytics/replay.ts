/**
 * Session Replay — PUBLIC MARKETING PAGES ONLY.
 *
 * Replay is intentionally limited to the public, non-authenticated marketing
 * pages and only after analytics consent. The authenticated application
 * (families, students, payments, planning, messages, settings, admin,
 * superadmin) is NEVER recorded: private routes stop any running replay.
 *
 * The session-replay SDK is lazy-loaded so it never ships in the initial
 * bundle for the dashboard.
 */

import { getConsent, isReplayAllowedPath } from "./privacy";

const API_KEY = import.meta.env.VITE_AMPLITUDE_API_KEY as string | undefined;
const ENABLED = (import.meta.env.VITE_ANALYTICS_ENABLED ?? "true") !== "false";

/** Fraction of public sessions to record (Amplitude best practice: sample). */
const REPLAY_SAMPLE_RATE = 0.2;

let initialized = false;
let recording = false;

async function sdk(): Promise<typeof import("@amplitude/session-replay-browser") | null> {
  try {
    return await import("@amplitude/session-replay-browser");
  } catch {
    return null;
  }
}

async function matchingDeviceId(): Promise<string | undefined> {
  try {
    const amplitude = await import("@amplitude/analytics-browser");
    return amplitude.getDeviceId();
  } catch {
    return undefined;
  }
}

/** Start recording on an allowed public page (consent-gated, idempotent). */
export async function startReplayIfAllowed(pathname: string): Promise<void> {
  if (typeof window === "undefined" || !ENABLED || !API_KEY) return;
  if (getConsent() !== "accepted") return;
  if (!isReplayAllowedPath(pathname)) {
    await stopReplayIfRunning();
    return;
  }
  const sr = await sdk();
  if (!sr) return;
  if (!initialized) {
    initialized = true;
    try {
      sr.init(API_KEY, {
        sampleRate: REPLAY_SAMPLE_RATE,
        deviceId: await matchingDeviceId(),
        privacyConfig: {
          // Defensive: any sensitive block on the public pages gets masked/blocked.
          defaultMaskLevel: "medium",
          blockSelector: [
            "[data-replay-block]",
            'input[type="email"]',
            'input[type="tel"]',
            'input[type="password"]',
          ],
        },
      });
    } catch {
      initialized = false;
      return;
    }
  }
  if (!recording) {
    recording = true;
    try {
      sr.start();
    } catch {
      /* ignore */
    }
  }
}

/** Stop recording immediately (e.g. when navigating to a private route). */
export async function stopReplayIfRunning(): Promise<void> {
  if (!initialized || !recording) return;
  const sr = await sdk();
  if (!sr) return;
  recording = false;
  try {
    sr.stop();
  } catch {
    /* ignore */
  }
}
