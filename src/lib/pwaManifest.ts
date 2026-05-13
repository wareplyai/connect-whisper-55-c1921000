// Dynamically attach PWA manifest + install meta tags. Used ONLY inside
// the HeadAdmin panel so install prompts never appear on the landing page
// or the regular user dashboard.
const TAGS: { tag: string; attrs: Record<string, string> }[] = [
  { tag: "link", attrs: { rel: "manifest", href: "/manifest.json", "data-pwa": "headadmin" } },
  { tag: "meta", attrs: { name: "theme-color", content: "#10b981", "data-pwa": "headadmin" } },
  { tag: "meta", attrs: { name: "mobile-web-app-capable", content: "yes", "data-pwa": "headadmin" } },
  { tag: "meta", attrs: { name: "apple-mobile-web-app-capable", content: "yes", "data-pwa": "headadmin" } },
  { tag: "meta", attrs: { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent", "data-pwa": "headadmin" } },
  { tag: "meta", attrs: { name: "apple-mobile-web-app-title", content: "WA Admin", "data-pwa": "headadmin" } },
];

export function attachHeadAdminPwaManifest() {
  const head = document.head;
  const created: HTMLElement[] = [];
  for (const { tag, attrs } of TAGS) {
    const el = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    head.appendChild(el);
    created.push(el);
  }
  return () => {
    created.forEach((el) => el.parentNode?.removeChild(el));
    // Also evict any in-memory beforeinstallprompt by removing leftover tags
    document.querySelectorAll('[data-pwa="headadmin"]').forEach((el) => el.remove());
  };
}
