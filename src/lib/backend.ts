// Backend API helper for the WhatsApp gateway server
const BASE_URL =
  import.meta.env.VITE_GATEWAY_URL ||
  import.meta.env.VITE_BACKEND_URL ||
  "https://api.wareplyai.com";

export const AI_REPLY_WEBHOOK_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/ai-reply`;

export function extractGatewayApiToken(value: unknown, depth = 0): string | null {
  if (!value || depth > 5) return null;
  if (typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;
  const tokenKeys = ["apiToken", "api_token", "accessToken", "access_token", "sessionToken", "session_token", "token"];
  for (const key of tokenKeys) {
    const token = obj[key];
    if (typeof token === "string" && token.trim().length >= 20) return token.trim();
  }
  for (const child of Object.values(obj)) {
    const found = extractGatewayApiToken(child, depth + 1);
    if (found) return found;
  }
  return null;
}

export function buildGatewayWebhookUrl(sessionId: string, webhookSecret?: string | null) {
  const url = new URL(AI_REPLY_WEBHOOK_URL);
  url.searchParams.set("session_id", sessionId);
  if (webhookSecret) url.searchParams.set("secret", webhookSecret);
  return url.toString();
}

async function request<T = any>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    const msg = (data && (data.error || data.message)) || `Request failed: ${res.status}`;
    throw new Error(msg);
  }
  return data as T;
}

export const backendApi = {
  createSession: (sessionId: string) =>
    request("/api/session/create", { method: "POST", body: JSON.stringify({ sessionId }) }),

  configureWebhook: (
    sessionId: string,
    apiToken: string,
    webhookSecret?: string | null,
    events: string[] = ["messages.received", "message.sent"],
  ) => {
    const webhookUrl = buildGatewayWebhookUrl(sessionId, webhookSecret);
    return request(`/api/session/${sessionId}/config`, {
      method: "POST",
      headers: apiToken ? { Authorization: `Bearer ${apiToken}` } : undefined,
      body: JSON.stringify({
        webhook_url: webhookUrl,
        webhookUrl,
        url: webhookUrl,
        events,
        webhook_events: events,
        webhook_secret: webhookSecret || undefined,
        secret: webhookSecret || undefined,
      }),
    });
  },

  getQr: (sessionId: string) =>
    request<{ qr?: string; status?: string }>(`/api/session/${sessionId}/qr?raw=1`),

  getStatus: (sessionId: string) =>
    request<{ status?: string; phone?: string; name?: string; apiToken?: string; api_token?: string; token?: string }>(`/api/session/${sessionId}/status`),

  sendMessage: (sessionId: string, to: string, message: string) =>
    request(`/api/session/${sessionId}/send`, {
      method: "POST",
      body: JSON.stringify({ to, message }),
    }),

  logout: (sessionId: string) =>
    request(`/api/session/${sessionId}/logout`, { method: "POST" }),

  restart: (sessionId: string) =>
    request("/api/session/create", { method: "POST", body: JSON.stringify({ sessionId }) }),

  listSessions: () =>
    request<Array<{ id: string; status?: string; phone?: string }>>("/api/sessions"),
};

export const BACKEND_URL = BASE_URL;
