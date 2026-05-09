import { supabase } from "@/integrations/supabase/client";

export const VAPID_PUBLIC_KEY =
  "BP5E0qoON11Ee4KcHCfO4vklmRpIVdlJxVdS0PNx3pIiR5oBXy1vgDFYizexIX-_9CEJjUJQwwTIPDnc5c3vLtc";

export function isPushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function isInPreviewIframe() {
  try {
    const inIframe = window.self !== window.top;
    const host = window.location.hostname;
    const previewHost =
      host.includes("id-preview--") ||
      host.includes("lovableproject.com") ||
      host.includes("lovable.dev");
    return inIframe || previewHost;
  } catch {
    return true;
  }
}

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export async function registerSW() {
  if (!isPushSupported() || isInPreviewIframe()) return null;
  return await navigator.serviceWorker.register("/sw.js");
}

export async function subscribeToPush(userId: string) {
  if (!isPushSupported()) throw new Error("Push not supported on this device");
  if (isInPreviewIframe())
    throw new Error("Open the published app on your phone to enable notifications");

  const perm = await Notification.requestPermission();
  if (perm !== "granted") throw new Error("Notification permission denied");

  const reg = (await navigator.serviceWorker.getRegistration()) ||
    (await navigator.serviceWorker.register("/sw.js"));
  await navigator.serviceWorker.ready;

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }

  const json = sub.toJSON() as any;
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint: sub.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
      user_agent: navigator.userAgent,
    },
    { onConflict: "endpoint" },
  );
  if (error) throw error;
  return sub;
}

export async function unsubscribeFromPush() {
  if (!isPushSupported()) return;
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
    await sub.unsubscribe();
  }
}

export async function getPushStatus(): Promise<"unsupported" | "preview" | "denied" | "granted" | "default"> {
  if (!isPushSupported()) return "unsupported";
  if (isInPreviewIframe()) return "preview";
  return Notification.permission as any;
}
