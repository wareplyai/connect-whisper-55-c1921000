// Shared helpers for token->session proxy edge functions
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

export const GATEWAY = Deno.env.get("WHATSAPP_GATEWAY_URL") || "https://api.wareplyai.com";

export const ACCOUNT_PROTECTION_WINDOW_MS = 5000;
export const ACCOUNT_PROTECTION_ERROR_TITLE =
  "The service is receiving too many requests from you";
export const ACCOUNT_PROTECTION_ERROR_DETAIL =
  "You have account protection enabled. You can only send 1 message every 5 seconds.";

export async function resolveSession(req: Request) {
  const auth = req.headers.get("Authorization") || req.headers.get("authorization");
  if (!auth?.toLowerCase().startsWith("bearer ")) {
    return { error: json({ error: "Missing Authorization: Bearer <api_token>" }, 401) };
  }
  const token = auth.slice(7).trim();
  if (!token) return { error: json({ error: "Empty token" }, 401) };

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: session } = await admin
    .from("sessions")
    .select(
      "id, user_id, status, api_token, enable_account_protection, show_typing_indicator, read_incoming_messages, always_online",
    )
    .eq("api_token", token)
    .maybeSingle();

  if (!session) return { error: json({ error: "Invalid access token" }, 401) };
  if (session.status !== "connected") {
    return { error: json({ error: `Session not connected (status: ${session.status})` }, 409) };
  }
  return { session, admin };
}

/**
 * Enforces the 5-second-per-session rate limit when account protection is on.
 * Returns a 429 Response when the caller is over the limit, otherwise null.
 * Looks at the most recent outgoing message for this session.
 */
export async function enforceAccountProtection(
  admin: ReturnType<typeof createClient>,
  session: any,
): Promise<Response | null> {
  if (session?.enable_account_protection === false) return null;
  try {
    const sinceIso = new Date(Date.now() - ACCOUNT_PROTECTION_WINDOW_MS).toISOString();
    const { data: recent } = await admin
      .from("message_logs")
      .select("created_at")
      .eq("session_id", session.id)
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (recent?.created_at) {
      const last = new Date(recent.created_at).getTime();
      const elapsed = Date.now() - last;
      if (elapsed < ACCOUNT_PROTECTION_WINDOW_MS) {
        const retryAfter = Math.ceil((ACCOUNT_PROTECTION_WINDOW_MS - elapsed) / 1000);
        return new Response(
          JSON.stringify({
            error: ACCOUNT_PROTECTION_ERROR_TITLE,
            message: ACCOUNT_PROTECTION_ERROR_DETAIL,
            account_protection: true,
            retry_after_seconds: retryAfter,
          }),
          {
            status: 429,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
              "Retry-After": String(retryAfter),
            },
          },
        );
      }
    }
  } catch (e) {
    console.error("enforceAccountProtection check failed", e);
  }
  return null;
}

function gatewayHeaders(apiToken: string | null): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (apiToken) h.Authorization = `Bearer ${apiToken}`;
  return h;
}

/**
 * Best-effort typing indicator on the recipient's phone before send.
 * Tries multiple gateway endpoints for compatibility, then waits for the duration.
 */
export async function showTypingIndicator(
  sessionId: string,
  apiToken: string | null,
  to: string,
  durationMs: number,
) {
  const headers = gatewayHeaders(apiToken);
  const body = { to, state: "composing", presence: "composing", duration: durationMs };
  const attempts = [
    `${GATEWAY}/api/session/${sessionId}/typing`,
    `${GATEWAY}/api/session/${sessionId}/presence`,
    `${GATEWAY}/api/session/${sessionId}/chat-state`,
  ];
  for (const url of attempts) {
    try {
      const r = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
      if (r.ok) break;
    } catch { /* try next */ }
  }
  await new Promise((res) => setTimeout(res, durationMs));
}

/**
 * Push presence "available" so the session appears online.
 */
export async function setAlwaysOnline(sessionId: string, apiToken: string | null) {
  const headers = gatewayHeaders(apiToken);
  const body = { presence: "available" };
  const attempts = [
    `${GATEWAY}/api/session/${sessionId}/presence`,
    `${GATEWAY}/api/session/${sessionId}/online`,
  ];
  for (const url of attempts) {
    try {
      const r = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
      if (r.ok) return;
    } catch { /* ignore */ }
  }
}

/**
 * Mark a chat as read (blue tick). Best-effort.
 */
export async function markChatRead(sessionId: string, apiToken: string | null, to: string) {
  const headers = gatewayHeaders(apiToken);
  const body = { to, read: true };
  const attempts = [
    `${GATEWAY}/api/session/${sessionId}/read`,
    `${GATEWAY}/api/session/${sessionId}/mark-read`,
    `${GATEWAY}/api/session/${sessionId}/chat-read`,
  ];
  for (const url of attempts) {
    try {
      const r = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
      if (r.ok) return;
    } catch { /* ignore */ }
  }
}

/**
 * Apply per-session preferences before sending: always_online presence,
 * read receipts on the target chat, and typing indicator.
 *
 * `messageLength` is used to pick a natural typing duration (capped 800-4000ms).
 */
export async function applySendPreferences(opts: {
  session: any;
  to: string;
  messageLength?: number;
  showTyping?: boolean;
}) {
  const { session, to } = opts;
  const tasks: Promise<unknown>[] = [];
  if (session?.always_online) {
    tasks.push(setAlwaysOnline(session.id, session.api_token));
  }
  if (session?.read_incoming_messages) {
    tasks.push(markChatRead(session.id, session.api_token, to));
  }
  // Don't await presence/read in parallel with typing — typing must finish
  // before we return so the message is sent AFTER the typing indicator.
  await Promise.allSettled(tasks);

  if (opts.showTyping !== false && session?.show_typing_indicator !== false) {
    const len = Math.max(1, opts.messageLength ?? 0);
    const duration = Math.max(800, Math.min(4000, len * 30));
    await showTypingIndicator(session.id, session.api_token, to, duration);
  }
}

export async function forwardToGateway(
  sessionId: string,
  apiToken: string | null,
  endpoint: string,
  body: unknown,
) {
  const r = await fetch(`${GATEWAY}/api/session/${sessionId}/${endpoint}`, {
    method: "POST",
    headers: gatewayHeaders(apiToken),
    body: JSON.stringify(body),
  });
  const text = await r.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { ok: r.ok, status: r.status, data };
}
