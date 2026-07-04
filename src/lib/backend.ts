// Backend API helper for the WhatsApp gateway server
const BASE_URL =
  import.meta.env.VITE_GATEWAY_URL ||
  import.meta.env.VITE_BACKEND_URL ||
  "https://api.wareplyai.com";

export const AI_REPLY_WEBHOOK_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/ai-reply`;
export const WA_WEBHOOK_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/wa-webhook`;

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
  const url = new URL(`${WA_WEBHOOK_URL}/${encodeURIComponent(sessionId)}`);
  if (webhookSecret) url.searchParams.set("secret", webhookSecret);
  return url.toString();
}

class GatewayRequestError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = "GatewayRequestError";
    this.status = status;
    this.data = data;
  }
}

function webhookPayload(sessionId: string, webhookSecret?: string | null, events: string[] = ["messages.received", "messages.upsert", "message.sent"]) {
  const webhookUrl = buildGatewayWebhookUrl(sessionId, webhookSecret);
  return {
    sessionId,
    session_id: sessionId,
    webhook_url: webhookUrl,
    webhookUrl,
    url: webhookUrl,
    callback_url: webhookUrl,
    events,
    webhook_events: events,
    webhook_secret: webhookSecret || undefined,
    webhookSecret: webhookSecret || undefined,
    secret: webhookSecret || undefined,
    enable_webhook: true,
  };
}

async function requestRaw<T = any>(path: string, init?: RequestInit): Promise<{ data: T; status: number }> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    const msg = (data && (data.error || data.message)) || `Request failed: ${res.status}`;
    throw new GatewayRequestError(msg, res.status, data);
  }
  return { data: data as T, status: res.status };
}

async function request<T = any>(path: string, init?: RequestInit): Promise<T> {
  const { data } = await requestRaw<T>(path, init);
  return data;
}

export const backendApi = {
  createSession: (sessionId: string, webhookSecret?: string | null, events?: string[]) =>
    request("/api/session/create", {
      method: "POST",
      body: JSON.stringify(webhookPayload(sessionId, webhookSecret, events)),
    }),

  configureWebhook: (
    sessionId: string,
    apiToken: string,
    webhookSecret?: string | null,
    events: string[] = ["messages.received", "messages.upsert", "message.sent"],
  ) => (async () => {
    const body = JSON.stringify(webhookPayload(sessionId, webhookSecret, events));
    const headers = apiToken ? { Authorization: `Bearer ${apiToken}` } : undefined;
    const paths = [
      `/api/session/${sessionId}/config`,
      `/api/session/${sessionId}/webhook`,
      `/api/session/${sessionId}/set-webhook`,
    ];

    let lastError: unknown = null;
    for (const path of paths) {
      try {
        return await request(path, { method: "POST", headers, body });
      } catch (err) {
        lastError = err;
        if (!(err instanceof GatewayRequestError) || err.status !== 404) throw err;
      }
    }

    try {
      return await request("/api/session/create", { method: "POST", headers, body });
    } catch (err) {
      throw lastError || err;
    }
  })(),

  getQr: (sessionId: string) =>
    request<{ qr?: string; status?: string }>(`/api/session/${sessionId}/qr?raw=1`),

  getStatus: (sessionId: string) =>
    request<{ status?: string; phone?: string; name?: string; apiToken?: string; api_token?: string; token?: string }>(`/api/session/${sessionId}/status`),

  sendMessage: (sessionId: string, to: string, message: string, apiToken?: string | null) =>
    request(`/api/session/${sessionId}/send`, {
      method: "POST",
      headers: apiToken ? { Authorization: `Bearer ${apiToken}` } : undefined,
      body: JSON.stringify({ to, message }),
    }),

  logout: (sessionId: string) =>
    request(`/api/session/${sessionId}/logout`, { method: "POST" }),

  restart: (sessionId: string, webhookSecret?: string | null, events?: string[]) =>
    request("/api/session/create", {
      method: "POST",
      body: JSON.stringify(webhookPayload(sessionId, webhookSecret, events)),
    }),

  listSessions: () =>
    request<Array<{ id: string; status?: string; phone?: string }>>("/api/sessions"),
};

export const BACKEND_URL = BASE_URL;
