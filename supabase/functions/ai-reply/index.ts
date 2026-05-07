// Public webhook endpoint for the WhatsApp backend.
// Backend POSTs incoming WhatsApp messages here with the session's webhook_secret.
// We run AI generation and return a reply for the backend to send back to WhatsApp.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const enc = new TextEncoder();
const dec = new TextDecoder();

async function getCryptoKey(): Promise<CryptoKey> {
  const secret = Deno.env.get("APP_ENCRYPTION_KEY")!;
  const hash = await crypto.subtle.digest("SHA-256", enc.encode(secret));
  return crypto.subtle.importKey("raw", hash, { name: "AES-GCM" }, false, ["decrypt"]);
}
function b64decode(s: string): Uint8Array {
  const binary = atob(s);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
async function decryptKey(payload: string): Promise<string> {
  const [ivB64, ctB64] = payload.split(".");
  const key = await getCryptoKey();
  const iv = b64decode(ivB64) as BufferSource;
  const ciphertext = b64decode(ctB64) as BufferSource;
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext
  );
  return dec.decode(pt);
}

function jsonResp(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function callAI(opts: {
  platform: string; model: string; apiKey: string;
  systemPrompt: string; userMessage: string;
}): Promise<string> {
  const { platform, model, apiKey, systemPrompt, userMessage } = opts;

  if (platform === "openai" || platform === "deepseek") {
    const url = platform === "openai"
      ? "https://api.openai.com/v1/chat/completions"
      : "https://api.deepseek.com/v1/chat/completions";
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
      }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data?.error?.message || `AI error ${r.status}`);
    return data.choices?.[0]?.message?.content?.trim() || "";
  }

  if (platform === "gemini") {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: userMessage }] }],
        }),
      }
    );
    const data = await r.json();
    if (!r.ok) throw new Error(data?.error?.message || `Gemini error ${r.status}`);
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
  }

  throw new Error(`Unsupported platform: ${platform}`);
}

function recipientVariants(input: string): string[] {
  const raw = String(input ?? "").trim();
  // Strip any @lid / @s.whatsapp.net suffix and use digits only
  const digits = raw.replace(/\D/g, "");
  if (!digits) return [raw].filter(Boolean);
  const variants = [digits, `${digits}@s.whatsapp.net`, `+${digits}`];
  if (digits.startsWith("0") && digits.length >= 10) {
    variants.push(`88${digits.slice(1)}`, `+88${digits.slice(1)}`, `${digits.slice(1)}@s.whatsapp.net`);
  }
  return [...new Set(variants.filter(Boolean))];
}

function digitsOnly(value: unknown): string {
  return String(value ?? "").replace(/\D/g, "");
}

function bdComparable(value: unknown): string {
  const digits = digitsOnly(value);
  if (digits.startsWith("880") && digits.length === 13) return digits.slice(2);
  if (digits.startsWith("0") && digits.length === 11) return digits.slice(1);
  return digits;
}

function samePhone(a: unknown, b: unknown): boolean {
  const ad = digitsOnly(a);
  const bd = digitsOnly(b);
  if (!ad || !bd) return false;
  if (ad === bd) return true;
  const ac = bdComparable(a);
  const bc = bdComparable(b);
  return ac.length >= 10 && bc.length >= 10 && ac === bc;
}

function numberFromValue(value: unknown, allowLid = false): string | null {
  const text = String(value ?? "").trim();
  if (!text || /@g\.us|status@broadcast|@broadcast/i.test(text)) return null;
  if (!allowLid && /@lid/i.test(text)) return null;
  const beforeAt = text.includes("@") ? text.split("@")[0] : text;
  const digits = beforeAt.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 16 ? digits : null;
}

function collectLidNumbers(value: unknown, out: Set<string>, depth = 0): void {
  if (depth > 5 || value == null) return;
  if (typeof value === "string") {
    if (/@lid/i.test(value)) {
      const n = numberFromValue(value, true);
      if (n) out.add(n);
    }
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value.slice(0, 20)) collectLidNumbers(item, out, depth + 1);
    return;
  }
  if (typeof value !== "object") return;
  for (const child of Object.values(value as Record<string, unknown>)) collectLidNumbers(child, out, depth + 1);
}

export function looksLikeCustomerPhone(value: unknown): boolean {
  const digits = digitsOnly(value);
  if (!digits) return false;
  return digits.length >= 8 && digits.length <= 15 && !isWhatsAppLID(digits);
}

export function isWhatsAppLID(value: unknown): boolean {
  const digits = digitsOnly(value);
  return /^(23|13)\d{13}$/.test(digits);
}

export function looksLikeLidIdentifier(_value: unknown): boolean {
  return false; // Disabled - always send to @s.whatsapp.net
}

export function looksLikeSendableRecipient(value: unknown): boolean {
  return looksLikeCustomerPhone(value);
}

function collectPhoneCandidates(value: unknown, out: Array<{ num: string; trusted: boolean }>, depth = 0): void {
  if (depth > 5 || value == null) return;
  if (Array.isArray(value)) {
    for (const item of value.slice(0, 20)) collectPhoneCandidates(item, out, depth + 1);
    return;
  }
  if (typeof value !== "object") return;

  const candidateKeys = new Set([
    "customer", "customer_number", "customernumber", "from", "from_real", "fromreal", "from_number", "fromnumber",
    "sender", "senderpn", "sender_pn", "cleanedsenderpn", "cleaned_sender_pn", "participant", "participantalt", "participant_alt",
    "author", "remotejid", "remote_jid", "remotejidalt", "remote_jid_alt",
    "chatid", "chat_id", "jid",
  ]);
  // Keys that, when their value contains "@s.whatsapp.net", carry the real customer phone.
  // We mark these as "trusted" so they win over Baileys-generated ids in body.from.
  const trustedKeys = new Set([
    "remotejid", "remote_jid", "remotejidalt", "remote_jid_alt",
    "senderpn", "sender_pn", "cleanedsenderpn", "cleaned_sender_pn", "participant", "participantalt", "participant_alt",
    "chatid", "chat_id", "jid", "customer", "customer_number", "customernumber", "from_real", "fromreal",
  ]);

  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const normalizedKey = key.toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (candidateKeys.has(normalizedKey)) {
      const n = numberFromValue(child);
      if (n) {
        const raw = String(child ?? "");
        const trusted = trustedKeys.has(normalizedKey) && (normalizedKey.includes("cleanedsenderpn") || normalizedKey.includes("fromreal") || /@s\.whatsapp\.net/i.test(raw));
        out.push({ num: n, trusted });
      }
    }
    if (typeof child === "object" && child !== null) collectPhoneCandidates(child, out, depth + 1);
  }
}

function hasDeepTruthy(value: unknown, keys: Set<string>, depth = 0): boolean {
  if (depth > 5 || value == null || typeof value !== "object") return false;
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const normalizedKey = key.toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (keys.has(normalizedKey) && child === true) return true;
    if (typeof child === "object" && child !== null && hasDeepTruthy(child, keys, depth + 1)) return true;
  }
  return false;
}

function hasGroupJid(value: unknown, depth = 0): boolean {
  if (depth > 5 || value == null) return false;
  if (typeof value === "string") return /@g\.us/i.test(value);
  if (Array.isArray(value)) return value.slice(0, 20).some((item) => hasGroupJid(item, depth + 1));
  if (typeof value !== "object") return false;
  return Object.values(value as Record<string, unknown>).some((child) => hasGroupJid(child, depth + 1));
}

export function resolveCustomerNumber(body: Record<string, unknown>, sessionPhone?: string | null): string {
  const candidates: Array<{ num: string; trusted: boolean }> = [];
  const lidNumbers = new Set<string>();
  collectLidNumbers(body, lidNumbers);
  collectPhoneCandidates(body, candidates);
  const notSession = candidates.filter((c) => !samePhone(c.num, sessionPhone) && !isWhatsAppLID(c.num) && !lidNumbers.has(c.num));
  // 1) Prefer trusted (@s.whatsapp.net) jids that look like real phones
  const trustedPhone = notSession.find((c) => c.trusted && looksLikeCustomerPhone(c.num));
  if (trustedPhone) return trustedPhone.num;
  // 2) Otherwise fall back to first candidate that looks like a customer phone
  const anyPhone = notSession.find((c) => looksLikeCustomerPhone(c.num));
  if (anyPhone) return anyPhone.num;
  return notSession[0]?.num || "";
}

async function resolveFromGatewayMessageInfo(opts: {
  gateway: string; sessionId: string; apiToken?: string | null; messageId: string; sessionPhone?: string | null;
}): Promise<string> {
  const { gateway, sessionId, apiToken, messageId, sessionPhone } = opts;
  if (!messageId) return "";

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiToken) headers.Authorization = `Bearer ${apiToken}`;
  const encodedMessageId = encodeURIComponent(messageId);
  const paths = [
    `/api/messages/${encodedMessageId}/info`,
    `/api/session/${sessionId}/messages/${encodedMessageId}/info`,
  ];

  for (const path of paths) {
    try {
      const res = await fetch(`${gateway}${path}`, { method: "GET", headers });
      if (!res.ok) continue;
      const data = await res.json().catch(() => null);
      const resolved = resolveCustomerNumber({ gateway_message_info: data }, sessionPhone);
      if (resolved && looksLikeSendableRecipient(resolved)) return resolved;
    } catch {
      // Keep webhook processing deterministic; invalid payload handling below will mark the row failed.
    }
  }

  return "";
}

async function sendTypingIndicator(opts: {
  gateway: string; sessionId: string; apiToken?: string | null; to: string; durationMs: number;
}): Promise<void> {
  const { gateway, sessionId, apiToken, to, durationMs } = opts;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiToken) headers.Authorization = `Bearer ${apiToken}`;
  // Best-effort: try a few common gateway endpoints. The customer should see "typing…" on their phone.
  const attempts = [
    { path: `/api/session/${sessionId}/typing`, body: { to, state: "composing", duration: durationMs } },
    { path: `/api/session/${sessionId}/presence`, body: { to, presence: "composing", duration: durationMs } },
    { path: `/api/session/${sessionId}/chat-state`, body: { to, state: "composing", duration: durationMs } },
  ];
  for (const a of attempts) {
    try {
      const r = await fetch(`${gateway}${a.path}`, {
        method: "POST",
        headers,
        body: JSON.stringify(a.body),
      });
      const txt = await r.text().catch(() => "");
      console.log(`[typing] ${a.path} -> ${r.status} ${txt.slice(0, 200)}`);
      if (r.ok) return; // first endpoint that works wins
    } catch (e) {
      console.log(`[typing] ${a.path} failed:`, (e as Error)?.message);
    }
  }
  console.log(`[typing] all attempts failed for to=${to}`);
}

async function sendViaGateway(opts: {
  gateway: string; sessionId: string; apiToken?: string | null; to: string; message: string;
}): Promise<{ ok: boolean; to: string; error: string | null; data: unknown }> {
  const { gateway, sessionId, apiToken, to, message } = opts;

  // Send ONLY ONCE to a single canonical recipient to prevent duplicate replies.
  // The gateway accepts plain digits and resolves to @s.whatsapp.net internally.
  const digits = String(to).replace(/\D/g, "");
  const candidate = digits || String(to);

  // Show "typing…" on the customer's phone before sending. Duration scales with message length
  // (≈ 30ms per char, clamped to 800ms–4000ms) so it feels natural.
  const typingMs = Math.max(800, Math.min(4000, message.length * 30));
  await sendTypingIndicator({ gateway, sessionId, apiToken, to: candidate, durationMs: typingMs });
  await new Promise((res) => setTimeout(res, typingMs));

  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (apiToken) headers.Authorization = `Bearer ${apiToken}`;
    const sendRes = await fetch(`${gateway}/api/session/${sessionId}/send`, {
      method: "POST",
      headers,
      body: JSON.stringify({ to: candidate, message }),
    });
    const sendData = await sendRes.json().catch(() => ({}));
    const explicitFailure = sendData?.success === false || sendData?.ok === false || sendData?.sent === false ||
      sendData?.status === "failed" || Boolean(sendData?.error);
    if (sendRes.ok && !explicitFailure) return { ok: true, to: candidate, error: null, data: sendData };
    const err = `${candidate}: ${sendData?.error || sendData?.message || `gateway ${sendRes.status}`}`;
    return { ok: false, to: candidate, error: err, data: sendData };
  } catch (e: any) {
    return { ok: false, to: candidate, error: `${candidate}: ${e?.message || "gateway unreachable"}`, data: null };
  }
}

function isInternalAiReplyWebhook(url: string): boolean {
  return /\.supabase\.co\/functions\/v1\/ai-reply\/?$/i.test(url.trim());
}

async function deliverUserWebhook(opts: {
  admin: any;
  session: any;
  webhookUrl?: string | null;
  eventType: string;
  payload: Record<string, unknown>;
}): Promise<void> {
  const { admin, session, webhookUrl, eventType, payload } = opts;
  // Prefer the dedicated external forwarding URL (n8n etc). Fall back to webhook_url
  // ONLY when it's NOT the internal ai-reply endpoint (prevents loops).
  const fallback = isInternalAiReplyWebhook(String(session.webhook_url || "")) ? "" : (session.webhook_url || "");
  const url = String(webhookUrl || session.forward_webhook_url || fallback || "").trim();
  const events = Array.isArray(session.webhook_events) ? session.webhook_events : [];

  if (!session.enable_webhook || !url || !events.includes(eventType) || isInternalAiReplyWebhook(url)) return;

  const logPayload = { event: eventType, ...payload };
  let delivered = false;
  let error: string | null = null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "WaReplyAI-Webhook/1.0",
        "X-WaReply-Event": eventType,
        "X-WaReply-Session": session.id,
      },
      body: JSON.stringify(logPayload),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    delivered = res.ok;
    if (!res.ok) error = `Webhook returned HTTP ${res.status}`;
  } catch (e: any) {
    error = e?.name === "AbortError" ? "Webhook request timed out" : (e?.message || "Webhook request failed");
  }

  await admin.from("webhook_logs").insert({
    session_id: session.id,
    event_type: eventType,
    delivered,
    payload: error ? { ...logPayload, delivery_error: error } : logPayload,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResp({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const sessionId = String(body.session_id || body.sessionId || "").trim();
    const messageText = String(body.message || body.text || body.message_text || "").trim();
    const isGroup = Boolean(body.is_group ?? body.isGroup ?? false) || hasGroupJid(body);
    const messageType = String(body.message_type || "text");
    const fromMe = Boolean(body.from_me ?? body.fromMe ?? body.is_from_me ?? false) ||
      hasDeepTruthy(body, new Set(["fromme", "from_me", "isfromme", "is_from_me"]));
    const sourceMessageId = String(body.source_message_id || "").trim();

    if (!sessionId || !messageText) {
      return jsonResp({ error: "session_id and message required" }, 400);
    }

    // Skip messages sent BY the bot itself (prevents infinite loop)
    if (fromMe) {
      return jsonResp({ ok: true, skipped: "from_me" });
    }
    // Skip group messages
    if (isGroup) {
      return jsonResp({ ok: true, skipped: "group_message" });
    }

    const providedSecret =
      req.headers.get("x-webhook-secret") ||
      (req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ?? "");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Load session and validate webhook secret
    const { data: session, error: sErr } = await admin
      .from("sessions")
      .select("id, user_id, webhook_secret, status, api_token, phone_number, enable_webhook, webhook_url, forward_webhook_url, webhook_events, show_typing_indicator, auto_replies_enabled, read_incoming_messages, enable_message_logging, enable_account_protection")
      .eq("id", sessionId)
      .maybeSingle();
    if (sErr) throw sErr;
    if (!session) return jsonResp({ error: "Session not found" }, 404);
    if (!providedSecret || providedSecret !== session.webhook_secret) {
      return jsonResp({ error: "Invalid webhook secret" }, 401);
    }

    const GATEWAY = Deno.env.get("WHATSAPP_GATEWAY_URL") || "https://alvi-waapi.duckdns.org/waapi";
    const rawPayload = (body?.raw_payload as Record<string, unknown> | undefined) || {};
    const rawKey = (rawPayload?.key as Record<string, unknown> | undefined) || {};
    const pickRealNumber = (...values: unknown[]) => {
      for (const value of values) {
        const digits = digitsOnly(value);
        if (digits && looksLikeCustomerPhone(digits) && !samePhone(digits, session.phone_number)) return digits;
      }
      return "";
    };

    const resolveBody = {
      ...body,
      raw_payload: {
        ...(rawPayload as any),
        ...(((rawPayload as any).raw_payload && typeof (rawPayload as any).raw_payload === "object") ? (rawPayload as any).raw_payload : {}),
      },
    } as Record<string, unknown>;

    let fromNumber = pickRealNumber(
      rawKey.cleanedSenderPn,
      (rawPayload as any).cleanedSenderPn,
      (rawPayload as any)?.raw_payload?.key?.cleanedSenderPn,
      (rawPayload as any)?.raw_payload?.cleanedSenderPn,
      (body as any).cleanedSenderPn,
      rawKey.senderPn,
      (rawPayload as any).senderPn,
      (rawPayload as any)?.raw_payload?.key?.senderPn,
      (rawPayload as any)?.raw_payload?.senderPn,
      (body as any).senderPn,
      (body as any).from_real,
      (body as any).fromReal,
      (body as any).from_number,
      (body as any).fromNumber,
      (body as any).from,
      !/@lid/i.test(String(rawKey.remoteJid || "")) ? rawKey.remoteJid : "",
      resolveCustomerNumber(resolveBody, session.phone_number),
    );
    if (fromNumber && !looksLikeCustomerPhone(fromNumber)) {
      const recoveredNumber = await resolveFromGatewayMessageInfo({
        gateway: GATEWAY,
        sessionId,
        apiToken: session.api_token,
        messageId: fromNumber,
        sessionPhone: session.phone_number,
      });
      if (recoveredNumber && looksLikeCustomerPhone(recoveredNumber)) fromNumber = recoveredNumber;
    }
    if (!fromNumber) {
      return jsonResp({ error: "customer number required" }, 400);
    }
    // STRICT: only allow real customer phone numbers — never send AI replies to fake Baileys/LID ids
    if (!looksLikeCustomerPhone(fromNumber)) {
      if (sourceMessageId) {
        await admin.from("incoming_messages").update({
          delivery_status: "failed",
          reply_error: `Invalid customer number from webhook payload: ${fromNumber}`,
          processed_at: new Date().toISOString(),
        }).eq("id", sourceMessageId);
      }
      return jsonResp({
        ok: false,
        error: "invalid_customer_number",
        detail: "Webhook payload is sending an unsupported sender id instead of a customer WhatsApp phone or LID recipient.",
        from: fromNumber,
      }, 422);
    }
    if (samePhone(fromNumber, session.phone_number)) {
      return jsonResp({ ok: true, skipped: "own_session_number", from: fromNumber });
    }

    // Per-customer mode: ai (default) | human (manual only) | auto_reply (keyword rules only)
    const { data: customerSetting } = await admin
      .from("customer_reply_settings")
      .select("mode, ai_paused")
      .eq("session_id", sessionId)
      .eq("phone_number", fromNumber)
      .maybeSingle();
    const customerMode: "ai" | "human" | "auto_reply" =
      (customerSetting?.mode as any) || (customerSetting?.ai_paused ? "human" : "ai");
    if (customerMode === "human") {
      if (sourceMessageId) {
        await admin.from("incoming_messages").update({
          delivery_status: "skipped",
          reply_error: "Human takeover mode — AI paused for this customer",
          processed_at: new Date().toISOString(),
        }).eq("id", sourceMessageId);
      }
      return jsonResp({ ok: true, skipped: "human_mode_active", from: fromNumber });
    }

    // Skip if customer is blocked
    const { data: blockedRow } = await admin
      .from("blocked_customers")
      .select("id")
      .eq("session_id", sessionId)
      .eq("phone_number", fromNumber)
      .maybeSingle();
    if (blockedRow) {
      if (sourceMessageId) {
        await admin.from("incoming_messages").update({
          delivery_status: "skipped",
          reply_error: "Customer is blocked",
          processed_at: new Date().toISOString(),
        }).eq("id", sourceMessageId);
      }
      return jsonResp({ ok: true, skipped: "customer_blocked", from: fromNumber });
    }

    const userId = session.user_id;

    // Load business profile
    const { data: biz } = await admin
      .from("business_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    const replyMode: string = (biz as any)?.active_reply_mode
      ?? (biz?.ai_enabled ? "ai_agent" : "none");
    const aiEnabled = customerMode === "ai" && replyMode === "ai_agent";
    const autoReplyEnabled = customerMode === "auto_reply" || replyMode === "auto_reply";
    const connectedSessions: string[] = (biz?.connected_session_ids ?? []) as string[];
    const sessionConnected = connectedSessions.includes(sessionId);

    let messageId: string | undefined;

    if (sourceMessageId) {
      const { data: claimedRow, error: claimErr } = await admin
        .from("incoming_messages")
        .update({ delivery_status: "processing", reply_attempted_at: new Date().toISOString() })
        .eq("id", sourceMessageId)
        .eq("session_id", sessionId)
        .eq("reply_sent", false)
        .eq("delivery_status", "pending")
        .select("id")
        .maybeSingle();
      if (claimErr) throw claimErr;

      if (claimedRow?.id) {
        messageId = claimedRow.id;
      } else {
        return jsonResp({ ok: true, skipped: "already_claimed_or_processed", message_id: sourceMessageId });
      }
    }

    // DEDUPE: if same (session, from, text) seen in last 60 seconds, skip to prevent loops/retries
    const sinceIso = new Date(Date.now() - 60_000).toISOString();
    if (!messageId) {
      const { data: recent } = await admin
        .from("incoming_messages")
        .select("id, reply_sent, delivery_status")
        .eq("session_id", sessionId)
        .eq("from_number", fromNumber)
        .eq("message_text", messageText)
        .gte("received_at", sinceIso)
        .limit(1)
        .maybeSingle();
      if (recent) {
        return jsonResp({ ok: true, skipped: "duplicate_within_60s", message_id: recent.id });
      }
    }

    // RATE LIMIT: max 8 incoming from same number per minute
    const { count: recentCount } = await admin
      .from("incoming_messages")
      .select("id", { count: "exact", head: true })
      .eq("session_id", sessionId)
      .eq("from_number", fromNumber)
      .gte("received_at", sinceIso);
    if ((recentCount ?? 0) >= 8) {
      return jsonResp({ ok: true, skipped: "rate_limited" });
    }

    // Always log direct webhook messages. Trigger-queued messages reuse their existing row.
    if (!messageId) {
      const logRow = {
        session_id: sessionId,
        user_id: userId,
        from_number: fromNumber,
        message_text: messageText,
        message_type: messageType,
        is_group: isGroup,
        raw_payload: body,
        reply_sent: false,
        delivery_status: "processing" as const,
        received_at: new Date().toISOString(),
      };
      const { data: msgRow } = await admin
        .from("incoming_messages")
        .insert(logRow)
        .select("id")
        .single();
      messageId = msgRow?.id;
    }

    await deliverUserWebhook({
      admin,
      session,
      webhookUrl: body.forward_webhook_url as string | undefined,
      eventType: "messages.received",
      payload: {
        session_id: sessionId,
        message_id: messageId,
        from: fromNumber,
        from_number: fromNumber,
        message: messageText,
        message_text: messageText,
        message_type: messageType,
        is_group: isGroup,
        received_at: new Date().toISOString(),
        raw_payload: body.raw_payload ?? body,
      },
    });

    if (!sessionConnected) {
      return jsonResp({ ok: true, skipped: "session_not_connected", message_id: messageId });
    }

    const lowerMsg = messageText.toLowerCase();

    // MUTEX: route based on active_reply_mode (per-customer auto_reply overrides global "none")
    if (replyMode === "none" && customerMode !== "auto_reply") {
      if (messageId) {
        await admin.from("incoming_messages").update({
          delivery_status: "skipped",
          reply_error: "Reply mode is none — both AI Agent and Auto-Reply are off",
          processed_at: new Date().toISOString(),
        }).eq("id", messageId);
      }
      return jsonResp({ ok: true, skipped: "reply_mode_none", message_id: messageId });
    }

    if (autoReplyEnabled) {
      // Fixed Q&A
      const { data: fixed } = await admin
        .from("fixed_qa")
        .select("keyword, reply, match_type")
        .eq("user_id", userId)
        .eq("is_active", true);
      const fixedHit = (fixed || []).find((f: any) => {
        const k = (f.keyword || "").toLowerCase().trim();
        if (!k) return false;
        return f.match_type === "contains" ? lowerMsg.includes(k) : lowerMsg === k;
      });
      if (fixedHit) {
        const reply = fixedHit.reply;
        const sendResult = await sendViaGateway({
          gateway: GATEWAY, sessionId, apiToken: session.api_token, to: fromNumber, message: reply,
        });
        if (messageId) {
          await admin.from("incoming_messages").update({
            reply_text: reply, reply_sent: sendResult.ok,
            delivery_status: sendResult.ok ? "sent" : "failed",
            reply_error: sendResult.ok ? null : sendResult.error,
            processed_at: new Date().toISOString(),
            reply_attempted_at: new Date().toISOString(),
            reply_sent_at: sendResult.ok ? new Date().toISOString() : null,
          }).eq("id", messageId);
        }
        if (sendResult.ok) {
          await admin.from("message_logs").insert({
            user_id: userId, session_id: sessionId, to_number: sendResult.to,
            message_type: "text", payload: { text: reply, auto_reply: true, source: "fixed_qa" },
            status: "sent",
          });
        }
        return jsonResp({ ok: true, reply, sent: sendResult.ok, send_error: sendResult.error, sent_to: sendResult.to, source: "fixed_qa", message_id: messageId });
      }

      // Keyword rules
      const { data: rules } = await admin
        .from("auto_reply_rules")
        .select("id, keywords, match_type, reply_template, session_id, priority, match_count")
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("priority", { ascending: false });
      const applicableRules = (rules || []).filter((r: any) => !r.session_id || r.session_id === sessionId);
      const ruleHit = applicableRules.find((r: any) => {
        const kws: string[] = Array.isArray(r.keywords) ? r.keywords : [];
        return kws.some((k) => {
          const kw = String(k || "").toLowerCase().trim();
          if (!kw) return false;
          if (r.match_type === "exact") return lowerMsg === kw;
          if (r.match_type === "starts_with") return lowerMsg.startsWith(kw);
          return lowerMsg.includes(kw);
        });
      });
      if (ruleHit) {
        const reply = ruleHit.reply_template;
        const sendResult = await sendViaGateway({
          gateway: GATEWAY, sessionId, apiToken: session.api_token, to: fromNumber, message: reply,
        });
        if (messageId) {
          await admin.from("incoming_messages").update({
            reply_text: reply, reply_sent: sendResult.ok,
            delivery_status: sendResult.ok ? "sent" : "failed",
            reply_error: sendResult.ok ? null : sendResult.error,
            processed_at: new Date().toISOString(),
            reply_attempted_at: new Date().toISOString(),
            reply_sent_at: sendResult.ok ? new Date().toISOString() : null,
          }).eq("id", messageId);
        }
        if (sendResult.ok) {
          await admin.from("auto_reply_rules")
            .update({ match_count: (ruleHit.match_count || 0) + 1 })
            .eq("id", ruleHit.id);
          await admin.from("message_logs").insert({
            user_id: userId, session_id: sessionId, to_number: sendResult.to,
            message_type: "text", payload: { text: reply, auto_reply: true, source: "keyword_rule", rule_id: ruleHit.id },
            status: "sent",
          });
        }
        return jsonResp({ ok: true, reply, sent: sendResult.ok, send_error: sendResult.error, sent_to: sendResult.to, source: "keyword_rule", rule_id: ruleHit.id, message_id: messageId });
      }

      // No keyword match in auto_reply mode → skip (do not call AI)
      if (messageId) {
        await admin.from("incoming_messages").update({
          delivery_status: "skipped",
          reply_error: "Auto-reply mode: no matching keyword rule",
          processed_at: new Date().toISOString(),
        }).eq("id", messageId);
      }
      return jsonResp({ ok: true, skipped: "no_keyword_match", message_id: messageId });
    }

    // From here on: aiEnabled === true

    // Load API key
    const { data: keyRow } = await admin
      .from("ai_api_keys")
      .select("encrypted_key, platform, model")
      .eq("user_id", userId)
      .eq("is_active", true)
      .maybeSingle();
    if (!keyRow) {
      if (messageId) {
        await admin.from("incoming_messages").update({
          reply_error: "No active AI API key", delivery_status: "failed",
          processed_at: new Date().toISOString(),
        }).eq("id", messageId);
      }
      return jsonResp({ error: "No active AI API key for user" }, 400);
    }

    const apiKey = await decryptKey(keyRow.encrypted_key);

    // Load QA pairs as additional context
    const { data: qaRows } = await admin
      .from("qa_pairs")
      .select("question, answer")
      .eq("user_id", userId)
      .eq("is_active", true)
      .limit(50);

    const qaContext = (qaRows || []).length
      ? `\n\nKNOWLEDGE BASE (Q&A):\n${(qaRows || [])
          .map((q: any, i: number) => `Q${i + 1}: ${q.question}\nA${i + 1}: ${q.answer}`)
          .join("\n\n")}`
      : "";

    const baseSystem = (biz?.system_prompt && biz.system_prompt.trim().length > 0)
      ? biz.system_prompt
      : `You are a helpful WhatsApp assistant for ${biz?.name || "this business"}. Reply in the customer's language. Be friendly, concise, human-like.`;

    const systemPrompt = `${baseSystem}${qaContext}`;

    let reply = "";
    try {
      reply = await callAI({
        platform: keyRow.platform,
        model: keyRow.model && keyRow.model !== "default" ? keyRow.model : (
          keyRow.platform === "openai" ? "gpt-4o-mini" :
          keyRow.platform === "gemini" ? "gemini-1.5-flash" :
          "deepseek-chat"
        ),
        apiKey,
        systemPrompt,
        userMessage: messageText,
      });
    } catch (aiErr: any) {
      if (messageId) {
        await admin.from("incoming_messages").update({
          reply_error: aiErr?.message || "AI call failed",
          delivery_status: "failed",
          processed_at: new Date().toISOString(),
        }).eq("id", messageId);
      }
      throw aiErr;
    }

    if (!reply) {
      if (messageId) {
        await admin.from("incoming_messages").update({
          reply_error: "Empty AI response", delivery_status: "failed",
          processed_at: new Date().toISOString(),
        }).eq("id", messageId);
      }
      return jsonResp({ error: "Empty AI response" }, 502);
    }

    // Send the reply back via WhatsApp gateway
    const sendResult = await sendViaGateway({
      gateway: GATEWAY,
      sessionId,
      apiToken: session.api_token,
      to: fromNumber,
      message: reply,
    });
    const sendOk = sendResult.ok;
    const sendErr = sendResult.error;

    if (messageId) {
      await admin.from("incoming_messages").update({
        reply_text: reply,
        reply_sent: sendOk,
        delivery_status: sendOk ? "sent" : "failed",
        reply_error: sendOk ? null : sendErr,
        processed_at: new Date().toISOString(),
        reply_attempted_at: new Date().toISOString(),
        reply_sent_at: sendOk ? new Date().toISOString() : null,
      }).eq("id", messageId);
    }

    if (sendOk) {
      await admin.from("message_logs").insert({
        user_id: userId, session_id: sessionId, to_number: sendResult.to,
        message_type: "text", payload: { text: reply, auto_reply: true, source: "ai" },
        status: "sent",
      });
    }

    return jsonResp({ ok: true, reply, sent: sendOk, send_error: sendErr, sent_to: sendResult.to, source: "ai", message_id: messageId });
  } catch (e: any) {
    console.error("ai-reply error:", e);
    return jsonResp({ error: e?.message || "Internal error" }, 500);
  }
});
