import { lazy, ComponentType } from "react";

const RELOAD_KEY = "lovable:chunk-reload";

// Wraps React.lazy so that a failed dynamic import (usually a stale hash
// after a redeploy) triggers a one-time hard reload instead of a blank screen.
export function lazyWithReload<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
) {
  return lazy(async () => {
    try {
      return await factory();
    } catch (err: any) {
      const msg = String(err?.message || err);
      const isChunkError =
        msg.includes("Failed to fetch dynamically imported module") ||
        msg.includes("Importing a module script failed") ||
        msg.includes("error loading dynamically imported module");

      if (isChunkError && typeof window !== "undefined") {
        const alreadyReloaded = sessionStorage.getItem(RELOAD_KEY);
        if (!alreadyReloaded) {
          sessionStorage.setItem(RELOAD_KEY, "1");
          window.location.reload();
          // Return a never-resolving promise while the reload happens.
          return new Promise(() => {}) as any;
        }
      }
      throw err;
    }
  });
}

// Clear the reload guard after a successful load session.
if (typeof window !== "undefined") {
  window.addEventListener("load", () => {
    sessionStorage.removeItem(RELOAD_KEY);
  });
}
