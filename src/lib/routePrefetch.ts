// Route prefetch map — calls the same dynamic imports used in App.tsx.
// Vite dedupes imports, so once a chunk is fetched it stays cached.
const prefetchers: Record<string, () => Promise<unknown>> = {
  "/dashboard": () => import("@/pages/dashboard/DashboardHome"),
  "/dashboard/sessions": () => import("@/pages/dashboard/Sessions"),
  "/dashboard/sessions/create": () => import("@/pages/dashboard/CreateSession"),
  "/dashboard/inbox": () => import("@/pages/dashboard/Inbox"),
  "/dashboard/auto-replies": () => import("@/pages/dashboard/AutoReplies"),
  "/dashboard/ai-agent": () => import("@/pages/dashboard/AIAgent"),
  "/dashboard/behavior": () => import("@/pages/dashboard/BehaviorSettings"),
  "/dashboard/products": () => import("@/pages/dashboard/Products"),
  "/dashboard/abandoned-cart": () => import("@/pages/dashboard/AbandonedCart"),
  "/dashboard/subscription": () => import("@/pages/dashboard/Subscription"),
  "/dashboard/subscription/plans": () => import("@/pages/dashboard/Plans"),
  "/dashboard/payments": () => import("@/pages/dashboard/Payments"),
  "/admin": () => import("@/pages/admin/AdminPanel"),
  "/docs": () => import("@/pages/docs/DocsIndex"),
};

const prefetched = new Set<string>();

export function prefetchRoute(path: string) {
  if (prefetched.has(path)) return;
  const fn = prefetchers[path];
  if (!fn) return;
  prefetched.add(path);
  fn().catch(() => prefetched.delete(path));
}

// Prefetch all top-level dashboard sections in the background after first paint.
export function prefetchDashboardRoutes() {
  if (typeof window === "undefined") return;
  const run = () => {
    Object.keys(prefetchers)
      .filter((p) => p.startsWith("/dashboard"))
      .forEach(prefetchRoute);
  };
  if ("requestIdleCallback" in window) {
    (window as any).requestIdleCallback(run, { timeout: 2000 });
  } else {
    setTimeout(run, 1200);
  }
}
