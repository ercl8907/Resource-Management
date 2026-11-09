/**
 * Shared state for the client-side inactivity timer.
 *
 * The last interaction time is kept in localStorage (rather than only in
 * memory) so it survives a closed tab, a sleeping machine, or a bfcache
 * restore. That lets us detect a user who comes back to the site after the
 * inactivity window has already elapsed.
 */

export const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000;

export const LAST_ACTIVITY_KEY = "resource-management:last-activity";

export function readLastActivity(): number | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(LAST_ACTIVITY_KEY);
    if (!raw) return null;

    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  } catch {
    // localStorage can be unavailable (private mode, blocked storage).
    return null;
  }
}

export function writeLastActivity(value: number) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(LAST_ACTIVITY_KEY, String(value));
  } catch {
    // The in-memory timer still protects the current tab.
  }
}

export function clearLastActivity() {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(LAST_ACTIVITY_KEY);
  } catch {
    // Nothing to clean up if storage is unavailable.
  }
}
