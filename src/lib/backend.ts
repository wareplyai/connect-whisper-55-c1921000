// Backend API helper for the WhatsApp gateway server
const BASE_URL = import.meta.env.VITE_BACKEND_URL || "https://alvi-waapi.duckdns.org";

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

  getQr: (sessionId: string) =>
    request<{ qr?: string; status?: string }>(`/api/session/${sessionId}/qr?raw=1`),

  getStatus: (sessionId: string) =>
    request<{ status?: string; phone?: string; name?: string }>(`/api/session/${sessionId}/status`),

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
