"use client";

import { createClient } from "@/lib/supabase/client";
import {
  INACTIVITY_TIMEOUT_MS,
  LAST_ACTIVITY_KEY,
  clearLastActivity,
  readLastActivity,
  writeLastActivity,
} from "@/lib/inactivity";
import { useEffect } from "react";

// Events that count as the user interacting with the app.
const ACTIVITY_EVENTS = [
  "pointerdown",
  "mousemove",
  "keydown",
  "scroll",
  "touchstart",
  "wheel",
] as const;

const CHECK_INTERVAL_MS = 1000;
const WRITE_THROTTLE_MS = 5000;

// Guards against a second effect run (e.g. React Strict Mode in development)
// starting a duplicate sign-out.
let logoutInProgress = false;

/**
 * Signs the user out after 10 minutes without interaction and sends them to
 * the sign-in page with the "Logged out due to inactivity" message.
 *
 * The last activity timestamp is persisted, so returning to the site after the
 * window has elapsed (including after closing the tab or waking the machine)
 * also triggers the logout.
 */
export function InactivityLogout() {
  useEffect(() => {
    const storedActivity = readLastActivity();
    const now = Date.now();
    let lastActivity = storedActivity ?? now;
    let lastWrite = lastActivity;
    let stopped = false;

    async function logOutForInactivity() {
      if (logoutInProgress) return;
      logoutInProgress = true;
      stopped = true;
      clearLastActivity();

      const redirect = () => window.location.replace("/?reason=inactivity");
      // Don't let a slow/offline revoke request keep the user on the page.
      const redirectTimer = window.setTimeout(redirect, 2000);

      try {
        const supabase = createClient();
        // "local" clears this browser's session before the best-effort
        // server-side revoke, so the redirect below can't bounce back.
        await supabase.auth.signOut({ scope: "local" });
      } catch {
        // Best effort: send the user to the sign-in page even if the network
        // request fails, so they can't keep using the page.
      } finally {
        window.clearTimeout(redirectTimer);
        redirect();
      }
    }

    function recordActivity() {
      lastActivity = Date.now();

      if (lastActivity - lastWrite >= WRITE_THROTTLE_MS) {
        lastWrite = lastActivity;
        writeLastActivity(lastActivity);
      }
    }

    function checkInactivity() {
      if (stopped) return;

      if (Date.now() - lastActivity >= INACTIVITY_TIMEOUT_MS) {
        void logOutForInactivity();
      }
    }

    if (storedActivity === null) {
      // First visit with this feature: start the clock now.
      writeLastActivity(now);
    } else if (now - storedActivity >= INACTIVITY_TIMEOUT_MS) {
      // The user returned after the inactivity window had already elapsed
      // (tab closed, machine asleep, or browser restored from bfcache).
      void logOutForInactivity();
      return;
    }

    function persistActivity() {
      if (stopped) return;

      lastWrite = Date.now();
      writeLastActivity(lastActivity);
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        persistActivity();
      } else {
        checkInactivity();
      }
    }

    function handleStorage(event: StorageEvent) {
      if (event.key !== LAST_ACTIVITY_KEY) return;

      // Another tab is active, so the user is still interacting with the app.
      const stored = readLastActivity();
      if (stored !== null && stored > lastActivity) {
        lastActivity = stored;
        lastWrite = Date.now();
      }
    }

    ACTIVITY_EVENTS.forEach((event) =>
      window.addEventListener(event, recordActivity, { passive: true })
    );
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", persistActivity);
    window.addEventListener("pageshow", checkInactivity);
    window.addEventListener("focus", checkInactivity);
    window.addEventListener("storage", handleStorage);

    const intervalId = window.setInterval(checkInactivity, CHECK_INTERVAL_MS);

    return () => {
      stopped = true;
      ACTIVITY_EVENTS.forEach((event) =>
        window.removeEventListener(event, recordActivity)
      );
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", persistActivity);
      window.removeEventListener("pageshow", checkInactivity);
      window.removeEventListener("focus", checkInactivity);
      window.removeEventListener("storage", handleStorage);
      window.clearInterval(intervalId);
    };
  }, []);

  return null;
}
