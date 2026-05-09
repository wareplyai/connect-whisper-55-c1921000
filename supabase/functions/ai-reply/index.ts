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
  maxTokens?: number;
}): Promise<string> {
  const { platform, model, apiKey, systemPrompt, userMessage } = opts;
  const maxTokens = Math.max(50, Math.min(4000, Number(opts.maxTokens) || 500));

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
        max_tokens: maxTokens,
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
          generationConfig: { maxOutputTokens: maxTokens },
        }),
      }
    );
    const data = await r.json();
    if (!r.ok) throw new Error(data?.error?.message || `Gemini error ${r.status}`);
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
  }

  throw new Error(`Unsupported platform: ${platform}`);
}

// Detect whether the payload looks image-related, even when the binary URL/base64 is stripped.
// Looks for: imageMessage object key, mimetype starting with image/, message_type/messageType containing "image".
function payloadLooksLikeImage(value: unknown, depth = 0): boolean {
  if (depth > 8 || value == null) return false;
  if (typeof value === "string") return /^image\//i.test(value);
  if (Array.isArray(value)) return value.slice(0, 50).some((v) => payloadLooksLikeImage(v, depth + 1));
  if (typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  for (const k of Object.keys(obj)) {
    const nk = k.toLowerCase();
    if (nk === "imagemessage" || nk === "image_message") return true;
    if ((nk === "mimetype" || nk === "mime_type" || nk === "contenttype" || nk === "content_type") && typeof obj[k] === "string" && /^image\//i.test(obj[k] as string)) return true;
    if ((nk === "messagetype" || nk === "message_type" || nk === "type") && typeof obj[k] === "string" && /image|photo|picture/i.test(obj[k] as string)) return true;
  }
  for (const v of Object.values(obj)) if (payloadLooksLikeImage(v, depth + 1)) return true;
  return false;
}

// Walk the payload deeply and return the first usable image source — either:
//   - a data: URL  (data:image/...;base64,...)
//   - an http(s) URL that looks like an image
//   - a base64 string we can wrap as a data URL (when paired with a mimetype field)
function findImageUrl(value: unknown, depth = 0): string | null {
  if (depth > 8 || value == null) return null;
  if (typeof value === "string") {
    const v = value.trim();
    if (/^data:image\/[a-z+.-]+;base64,/i.test(v)) return v;
    if (/^https?:\/\//i.test(v) && /\.(jpe?g|png|webp|gif)(\?|$)/i.test(v)) return v;
    return null;
  }
  if (Array.isArray(value)) {
    for (const item of value.slice(0, 50)) {
      const r = findImageUrl(item, depth + 1);
      if (r) return r;
    }
    return null;
  }
  if (typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;

  // Base64 fields paired with optional mimetype → wrap as data URL
  const b64Keys = ["image_base64", "imageBase64", "image_data", "imageData", "media_base64", "mediaBase64", "base64", "data"];
  for (const k of b64Keys) {
    const v = obj[k];
    if (typeof v === "string" && v.length > 100 && /^[A-Za-z0-9+/=\s]+$/.test(v.slice(0, 200))) {
      const mime = (obj.mimetype || obj.mime_type || obj.contentType || "image/jpeg") as string;
      return `data:${mime};base64,${v.replace(/\s+/g, "")}`;
    }
  }

  // Prefer common URL keys first
  const preferred = ["image_url", "imageUrl", "mediaUrl", "media_url", "url", "directPath", "fileUrl"];
  for (const k of preferred) {
    const v = obj[k];
    if (typeof v === "string") {
      if (/^data:image\//i.test(v)) return v;
      if (/^https?:\/\//i.test(v)) {
        if (/\.(jpe?g|png|webp|gif)(\?|$)/i.test(v) || /image|media/i.test(k)) return v;
      }
    }
  }
  for (const v of Object.values(obj)) {
    const r = findImageUrl(v, depth + 1);
    if (r) return r;
  }
  return null;
}

// Simple Jaccard-ish keyword overlap score in 0..1
function textSimilarity(a: string, b: string): number {
  const tokenize = (s: string) =>
    new Set(
      s.toLowerCase()
        .replace(/[^\p{L}\p{N}\s,]/gu, " ")
        .split(/[\s,]+/)
        .filter((t) => t.length >= 3),
    );
  const A = tokenize(a);
  const B = tokenize(b);
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  const union = A.size + B.size - inter;
  return union === 0 ? 0 : inter / union;
}

async function describeImageWithOpenAI(apiKey: string, imageUrl: string): Promise<string> {
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You describe a product photo. Reply with a comma-separated list of 8-15 short keywords (English): object, color, material, style, pattern, brand if visible. Keywords only.",
        },
        { role: "user", content: [{ type: "image_url", image_url: { url: imageUrl } }] },
      ],
      max_tokens: 200,
    }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data?.error?.message || `Vision error ${r.status}`);
  return (data.choices?.[0]?.message?.content || "").trim();
}

// Extracts structured fields (product_name, order_number) from optional image + caption.
// Uses OpenAI vision when available; falls back to regex on the caption text.
async function extractStructuredFromImage(opts: {
  apiKey?: string | null; platform?: string | null; imageUrl?: string | null; caption?: string | null;
}): Promise<{ product_name: string | null; order_number: string | null }> {
  const caption = (opts.caption || "").trim();
  // Regex fallback for order number
  const orderRegex = /(?:order|invoice|inv|#)\s*[:#-]?\s*([A-Z0-9-]{4,20})/i;
  const fallbackOrder = caption.match(orderRegex)?.[1] || null;

  if (opts.platform !== "openai" || !opts.apiKey || !opts.imageUrl) {
    return { product_name: null, order_number: fallbackOrder };
  }
  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${opts.apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Read the image (and caption if provided). Return STRICT JSON: {\"product_name\": string|null, \"order_number\": string|null}. product_name is the visible product/title; order_number is any visible order/invoice id. Use null if not present.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: `Caption: ${caption || "(none)"}\nReturn JSON only.` },
              { type: "image_url", image_url: { url: opts.imageUrl } },
            ],
          },
        ],
        max_tokens: 200,
      }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data?.error?.message || `extract error ${r.status}`);
    const txt = data.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(txt);
    return {
      product_name: parsed.product_name ? String(parsed.product_name).slice(0, 200) : null,
      order_number: (parsed.order_number ? String(parsed.order_number).slice(0, 60) : null) || fallbackOrder,
    };
  } catch (e) {
    console.log("[extract-structured] failed:", (e as Error)?.message);
    return { product_name: null, order_number: fallbackOrder };
  }
}

// Walk the raw webhook payload to find a caption + mimetype for image messages.
function findCaption(value: unknown, depth = 0): string | null {
  if (depth > 8 || value == null) return null;
  if (typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;
  for (const k of ["caption", "image_caption", "imageCaption", "text", "body"]) {
    const v = obj[k];
    if (typeof v === "string" && v.trim() && k !== "text" && k !== "body") return v.trim();
  }
  // imageMessage.caption is the canonical Baileys path
  if (obj.imageMessage && typeof obj.imageMessage === "object") {
    const c = (obj.imageMessage as any).caption;
    if (typeof c === "string" && c.trim()) return c.trim();
  }
  for (const v of Object.values(obj)) {
    const r = findCaption(v, depth + 1);
    if (r) return r;
  }
  return null;
}

function findMimetype(value: unknown, depth = 0): string | null {
  if (depth > 8 || value == null) return null;
  if (typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;
  for (const k of ["mimetype", "mime_type", "contentType", "content_type"]) {
    const v = obj[k];
    if (typeof v === "string" && /^image\//i.test(v)) return v;
  }
  for (const v of Object.values(obj)) {
    const r = findMimetype(v, depth + 1);
    if (r) return r;
  }
  return null;
}

// Best-effort: ask the Baileys gateway for the media bytes of a given message id.
// Returns a data: URL we can pass to the vision model, or null if every endpoint fails.
async function fetchGatewayMediaDataUrl(opts: {
  gateway: string; sessionId: string; apiToken?: string | null;
  messageId?: string; remoteJid?: string;
}): Promise<string | null> {
  const { gateway, sessionId, apiToken, messageId, remoteJid } = opts;
  if (!messageId) return null;
  const headers: Record<string, string> = {};
  if (apiToken) headers.Authorization = `Bearer ${apiToken}`;
  const mid = encodeURIComponent(messageId);
  const jid = remoteJid ? encodeURIComponent(remoteJid) : "";

  const candidates: Array<{ url: string; method: "GET" | "POST"; body?: unknown }> = [];
  for (const base of gatewayBaseVariants(gateway)) {
    candidates.push(
      { url: `${base}/api/session/${sessionId}/messages/${mid}/media`, method: "GET" },
      { url: `${base}/api/session/${sessionId}/messages/${mid}/download`, method: "GET" },
      { url: `${base}/api/session/${sessionId}/media/${mid}`, method: "GET" },
      { url: `${base}/api/session/${sessionId}/download`, method: "POST", body: { messageId, id: messageId, remoteJid } },
      { url: `${base}/api/session/${sessionId}/downloadMedia`, method: "POST", body: { messageId, id: messageId, remoteJid } },
      { url: `${base}/api/${sessionId}/media/${mid}`, method: "GET" },
    );
    if (jid) candidates.push({ url: `${base}/api/session/${sessionId}/chats/${jid}/messages/${mid}/media`, method: "GET" });
  }

  for (const c of candidates) {
    try {
      const init: RequestInit = { method: c.method, headers: { ...headers } };
      if (c.method === "POST") {
        (init.headers as Record<string, string>)["Content-Type"] = "application/json";
        init.body = JSON.stringify(c.body || {});
      }
      const res = await fetch(c.url, init);
      if (!res.ok) continue;
      const ctype = (res.headers.get("content-type") || "").toLowerCase();

      if (ctype.startsWith("image/")) {
        const buf = new Uint8Array(await res.arrayBuffer());
        const b64 = btoa(String.fromCharCode(...buf));
        console.log(`[gateway-media] got binary ${ctype} from ${c.url} (${buf.length} bytes)`);
        return `data:${ctype};base64,${b64}`;
      }
      if (ctype.includes("json")) {
        const j = await res.json().catch(() => null);
        if (!j) continue;
        const found = findImageUrl(j);
        if (found) {
          console.log(`[gateway-media] found image url in JSON from ${c.url}`);
          return found;
        }
      }
    } catch (e) {
      console.log(`[gateway-media] ${c.url} failed: ${(e as Error)?.message}`);
    }
  }
  console.log(`[gateway-media] no media endpoint succeeded for messageId=${messageId}`);
  return null;
}

// Upload an image (data URL or http URL) to the chat-media storage bucket and return its public URL + mimetype.
async function uploadChatMediaImage(
  admin: any,
  userId: string,
  sessionId: string,
  source: string,
): Promise<{ url: string; mime: string } | null> {
  try {
    let bytes: Uint8Array | null = null;
    let mime = "image/jpeg";
    if (source.startsWith("data:")) {
      const m = source.match(/^data:([^;]+);base64,(.+)$/);
      if (!m) return null;
      mime = m[1] || "image/jpeg";
      const bin = atob(m[2]);
      bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    } else if (/^https?:\/\//i.test(source)) {
      const r = await fetch(source);
      if (!r.ok) return null;
      mime = (r.headers.get("content-type") || "image/jpeg").split(";")[0];
      bytes = new Uint8Array(await r.arrayBuffer());
    } else {
      return null;
    }
    const ext = mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : mime.includes("gif") ? "gif" : "jpg";
    const path = `${userId}/${sessionId}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await admin.storage.from("chat-media").upload(path, bytes, {
      contentType: mime,
      upsert: false,
    });
    if (upErr) {
      console.log("[chat-media] upload failed:", upErr.message);
      return null;
    }
    const { data } = admin.storage.from("chat-media").getPublicUrl(path);
    return data?.publicUrl ? { url: data.publicUrl, mime } : null;
  } catch (e) {
    console.log("[chat-media] error:", (e as Error)?.message);
    return null;
  }
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

export function gatewayBaseVariants(gateway: string): string[] {
  const clean = String(gateway || "https://alvi-waapi.duckdns.org/waapi").replace(/\/+$/, "");
  const variants = [clean];
  try {
    const url = new URL(clean);
    if (url.pathname.replace(/\/+$/, "") === "/waapi") variants.push(url.origin);
  } catch {
    // Keep the original gateway when it is not a fully-qualified URL.
  }
  return [...new Set(variants.filter(Boolean))];
}

function compactBody(body: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(body).filter(([, value]) => value !== undefined && value !== null && value !== ""));
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

async function tryMarkAsReadOnce(opts: {
  gateway: string; sessionId: string; apiToken?: string | null; to: string; messageId?: string; messageKey?: Record<string, unknown> | null;
}): Promise<{ ok: boolean; endpoint?: string }> {
  const { gateway, sessionId, apiToken, to, messageId, messageKey } = opts;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiToken) headers.Authorization = `Bearer ${apiToken}`;
  const digits = String(to).replace(/\D/g, "");
  const jid = String(to).includes("@") ? String(to) : `${digits || to}@s.whatsapp.net`;
  const isUuid = (s?: string) => !!s && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
  const actualMessageId = messageId && !isUuid(messageId) ? messageId : undefined;
  // Build a fallback messageKey when an external one wasn't provided but we do have a real id
  const effectiveKey: Record<string, unknown> | null = messageKey && (messageKey as any).id && !isUuid(String((messageKey as any).id))
    ? messageKey
    : (actualMessageId ? { id: actualMessageId, remoteJid: jid, fromMe: false } : null);
  const chatBody = compactBody({ to: digits || to, jid, remoteJid: jid, chatId: jid, id: actualMessageId, messageId: actualMessageId });
  const attempts = [
    // Prefer endpoints that include a real messageKey (true blue-tick on WhatsApp)
    ...(effectiveKey ? [
      { path: `/api/session/${sessionId}/sendSeen`, body: { messageKey: effectiveKey } },
      { path: `/api/session/${sessionId}/sendSeen`, body: { key: effectiveKey, chatId: jid } },
      { path: `/api/session/${sessionId}/sendSeen`, body: { messages: [effectiveKey], chatId: jid } },
      { path: `/api/sendSeen`, body: { session: sessionId, messageKey: effectiveKey } },
      { path: `/api/messages/read`, body: { session: sessionId, messageKey: effectiveKey } },
    ] : []),
    // Fallbacks: chat-level seen (works without a messageKey on many gateways)
    { path: `/api/session/${sessionId}/sendSeen`, body: chatBody },
    { path: `/api/${sessionId}/sendSeen`, body: chatBody },
    { path: `/api/${sessionId}/chats/${encodeURIComponent(jid)}/read`, body: {} },
    { path: `/api/${sessionId}/chat/${encodeURIComponent(jid)}/seen`, body: {} },
    { path: `/api/markChatRead`, body: { session: sessionId, chatId: jid } },
    { path: `/api/sendReadAck`, body: { session: sessionId, chatId: jid } },
  ];
  for (const base of gatewayBaseVariants(gateway)) {
    for (const a of attempts) {
      try {
        const r = await fetch(`${base}${a.path}`, { method: "POST", headers, body: JSON.stringify(a.body) });
        const txt = await r.text().catch(() => "");
        console.log(`[markAsRead] ${base}${a.path} key=${effectiveKey ? "yes" : "no"} -> ${r.status} ${txt.slice(0, 160)}`);
        if (r.ok) return { ok: true, endpoint: `${base}${a.path}` };
      } catch (e) {
        console.log(`[markAsRead] ${base}${a.path} failed: ${(e as Error)?.message}`);
      }
    }
  }
  return { ok: false };
}

async function markAsRead(opts: {
  gateway: string; sessionId: string; apiToken?: string | null; to: string; messageId?: string; messageKey?: Record<string, unknown> | null;
}): Promise<boolean> {
  // Retry up to 3 times with exponential backoff (1s, 2s, 4s) until at least one endpoint succeeds.
  const delays = [0, 1000, 2000, 4000];
  for (let i = 0; i < delays.length; i++) {
    if (delays[i] > 0) await new Promise((r) => setTimeout(r, delays[i]));
    const res = await tryMarkAsReadOnce(opts);
    if (res.ok) {
      if (i > 0) console.log(`[markAsRead] succeeded after ${i} retries via ${res.endpoint}`);
      return true;
    }
    console.log(`[markAsRead] attempt ${i + 1}/${delays.length} failed for to=${opts.to}`);
  }
  console.log(`[markAsRead] all retry attempts exhausted for to=${opts.to}`);
  return false;
}

function normalizeIncomingMessageKey(candidate: unknown, fallbackJid: string): Record<string, unknown> | null {
  if (!candidate || typeof candidate !== "object") return null;
  const key = candidate as Record<string, unknown>;
  const id = String(key.id || key.messageId || key.message_id || key.msgId || key.msg_id || "").trim();
  if (!id || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null;
  const remoteJid = String(key.remoteJid || key.remote_jid || key.chatId || key.chat_id || key.jid || fallbackJid || "").trim();
  if (!remoteJid) return null;
  const messageKey: Record<string, unknown> = { id, remoteJid, fromMe: key.fromMe === true ? true : false };
  if (key.participant) messageKey.participant = key.participant;
  return messageKey;
}

function resolveIncomingMessageKey(body: Record<string, unknown>, fromNumber: string): Record<string, unknown> | null {
  const raw = (body.raw_payload && typeof body.raw_payload === "object" ? body.raw_payload : {}) as Record<string, unknown>;
  const nestedRaw = (raw.raw_payload && typeof raw.raw_payload === "object" ? raw.raw_payload : {}) as Record<string, unknown>;
  const fallbackJid = String(
    body.target_jid || body.remoteJid || raw.target_jid || raw.remoteJid || nestedRaw.target_jid || `${fromNumber}@s.whatsapp.net`,
  );
  const candidates = [body.messageKey, body.message_key, body.key, raw.messageKey, raw.message_key, raw.key, nestedRaw.messageKey, nestedRaw.message_key, nestedRaw.key];
  for (const candidate of candidates) {
    const messageKey = normalizeIncomingMessageKey(candidate, fallbackJid);
    if (messageKey) return messageKey;
  }
  return null;
}

async function sendViaGateway(opts: {
  gateway: string; sessionId: string; apiToken?: string | null; to: string; message: string;
  imageUrl?: string;
  showTyping?: boolean; accountProtection?: boolean;
}): Promise<{ ok: boolean; to: string; error: string | null; data: unknown }> {
  const { gateway, sessionId, apiToken, to, message, imageUrl, showTyping = true, accountProtection = true } = opts;

  const digits = String(to).replace(/\D/g, "");
  const candidate = digits || String(to);

  // Show typing indicator (only if enabled)
  if (showTyping) {
    const typingMs = Math.max(800, Math.min(4000, message.length * 30));
    await sendTypingIndicator({ gateway, sessionId, apiToken, to: candidate, durationMs: typingMs });
    await new Promise((res) => setTimeout(res, typingMs));
  } else if (accountProtection) {
    // Even without typing, add small human-like delay for account protection
    const delay = 1000 + Math.floor(Math.random() * 2000);
    await new Promise((res) => setTimeout(res, delay));
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiToken) headers.Authorization = `Bearer ${apiToken}`;

  // Helper to interpret a gateway response as success or failure
  const interpret = async (res: Response) => {
    const data = await res.json().catch(() => ({} as any));
    const explicitFailure = data?.success === false || data?.ok === false || data?.sent === false ||
      data?.status === "failed" || Boolean(data?.error);
    return { ok: res.ok && !explicitFailure, data, status: res.status };
  };

  // If an image URL is provided, try image-send endpoints first (Baileys gateway).
  // Try several common payload shapes so we work with most Baileys/WAHA-style gateways.
  if (imageUrl) {
    const imageAttempts: Array<{ path: string; body: Record<string, unknown> }> = [
      { path: `/api/session/${sessionId}/send`, body: { to: candidate, message, image: { url: imageUrl }, caption: message } },
      { path: `/api/session/${sessionId}/send`, body: { to: candidate, message, imageUrl, caption: message, type: "image" } },
      { path: `/api/session/${sessionId}/send-image`, body: { to: candidate, url: imageUrl, caption: message } },
      { path: `/api/session/${sessionId}/sendImage`, body: { to: candidate, url: imageUrl, caption: message } },
      { path: `/api/sendImage`, body: { session: sessionId, chatId: candidate, file: { url: imageUrl }, caption: message } },
    ];
    for (const attempt of imageAttempts) {
      try {
        const res = await fetch(`${gateway}${attempt.path}`, {
          method: "POST", headers, body: JSON.stringify(attempt.body),
        });
        const result = await interpret(res);
        if (result.ok) return { ok: true, to: candidate, error: null, data: result.data };
      } catch { /* try next */ }
    }
    // Image attempts failed → fall back to text-only with the URL appended so the
    // customer still receives the link.
    try {
      const fallbackText = `${message}\n\n${imageUrl}`.trim();
      const sendRes = await fetch(`${gateway}/api/session/${sessionId}/send`, {
        method: "POST", headers, body: JSON.stringify({ to: candidate, message: fallbackText }),
      });
      const result = await interpret(sendRes);
      if (result.ok) return { ok: true, to: candidate, error: null, data: result.data };
      return { ok: false, to: candidate, error: `${candidate}: image send failed (gateway ${result.status})`, data: result.data };
    } catch (e: any) {
      return { ok: false, to: candidate, error: `${candidate}: ${e?.message || "gateway unreachable"}`, data: null };
    }
  }

  try {
    const sendRes = await fetch(`${gateway}/api/session/${sessionId}/send`, {
      method: "POST",
      headers,
      body: JSON.stringify({ to: candidate, message }),
    });
    const result = await interpret(sendRes);
    if (result.ok) return { ok: true, to: candidate, error: null, data: result.data };
    const err = `${candidate}: ${(result.data as any)?.error || (result.data as any)?.message || `gateway ${result.status}`}`;
    return { ok: false, to: candidate, error: err, data: result.data };
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
    const rawText = String(body.message || body.text || body.message_text || "").trim();
    const isGroup = Boolean(body.is_group ?? body.isGroup ?? false) || hasGroupJid(body);
    const messageType = String(body.message_type || "text");
    const fromMe = Boolean(body.from_me ?? body.fromMe ?? body.is_from_me ?? false) ||
      hasDeepTruthy(body, new Set(["fromme", "from_me", "isfromme", "is_from_me"]));
    const sourceMessageId = String(body.source_message_id || "").trim();

    // ---- Image detection: scan body deeply for any image source (URL/dataURL/base64) ----
    let imageUrl = findImageUrl(body);
    const looksImageType = /image|photo|picture|media/i.test(messageType);
    const payloadHasImage = looksImageType || payloadLooksLikeImage(body);
    // Tentatively flag as image — we may resolve the actual binary from the gateway below.
    let isImageMessage = (!!imageUrl && (looksImageType || !rawText)) || (payloadHasImage && !rawText);
    const messageText = rawText || (isImageMessage ? "[customer sent an image]" : "");

    console.log("[ai-reply] incoming", {
      sessionId,
      messageType,
      hasText: !!rawText,
      hasImage: !!imageUrl,
      payloadHasImage,
      imageKind: imageUrl ? (imageUrl.startsWith("data:") ? "data-url" : "http") : "none",
      bodyKeys: Object.keys(body || {}),
    });

    if (!sessionId || (!messageText && !imageUrl && !payloadHasImage)) {
      return jsonResp({ error: "session_id and message or image required" }, 400);
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

    // If gateway stripped the image bytes but the payload hints image, try to download media from gateway.
    if (!imageUrl && payloadHasImage) {
      const candidateMessageId = String(
        (body as any).message_id ||
        (body as any).messageId ||
        (rawKey as any)?.id ||
        (rawPayload as any)?.messageId ||
        (rawPayload as any)?.id ||
        ""
      ).trim();
      const candidateJid = String(
        (body as any).target_jid ||
        (body as any).remoteJid ||
        (rawKey as any)?.remoteJid ||
        (rawPayload as any)?.remoteJid ||
        ""
      ).trim();
      if (candidateMessageId) {
        const fetched = await fetchGatewayMediaDataUrl({
          gateway: GATEWAY,
          sessionId,
          apiToken: session.api_token,
          messageId: candidateMessageId,
          remoteJid: candidateJid || undefined,
        });
        if (fetched) {
          imageUrl = fetched;
          isImageMessage = true;
          console.log("[ai-reply] gateway-media recovered image for messageId=", candidateMessageId);
        } else {
          console.log("[ai-reply] gateway-media unavailable, replying with image-help fallback");
        }
      }
    }

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
    const incomingMessageKey = resolveIncomingMessageKey(body, fromNumber);

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
    const autoReplyEnabled = (customerMode === "auto_reply" || replyMode === "auto_reply")
      && (session.auto_replies_enabled !== false)
      && ((biz as any)?.ai_auto_replies_enabled !== false);
    const connectedSessions: string[] = (biz?.connected_session_ids ?? []) as string[];
    const sessionConnected = connectedSessions.includes(sessionId);

    // Resolve effective behaviour flags (AI Agent panel overrides session for AI replies)
    const aiTyping = (biz as any)?.ai_show_typing !== false;
    const aiReadReceipts = (biz as any)?.ai_read_receipts !== false;
    const sessionTyping = session.show_typing_indicator !== false;
    const sessionReadReceipts = session.read_incoming_messages === true;
    const accountProtection = session.enable_account_protection !== false;
    const messageLogging = session.enable_message_logging !== false;

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
        message_text: messageLogging ? messageText : null,
        message_type: messageType,
        is_group: isGroup,
        raw_payload: messageLogging ? body : { logging_disabled: true },
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

    // Capture caption + mimetype from the raw payload (Baileys imageMessage.caption etc.)
    const imageCaption = isImageMessage ? findCaption(body) : null;
    let imageMimetype: string | null = isImageMessage ? findMimetype(body) : null;

    // If we have an image (resolved from payload or recovered from gateway), upload it to
    // chat-media bucket and persist the public URL + mimetype on the message so it shows in the inbox.
    if (messageId && imageUrl) {
      try {
        const uploaded = await uploadChatMediaImage(admin, userId, sessionId, imageUrl);
        if (uploaded) {
          imageMimetype = imageMimetype || uploaded.mime;
          await admin.from("incoming_messages").update({
            image_url: uploaded.url,
            mimetype: imageMimetype,
            image_caption: imageCaption,
          }).eq("id", messageId);
          imageUrl = uploaded.url;
          console.log("[ai-reply] saved chat-media url for message", messageId);
        } else if (imageCaption || imageMimetype) {
          await admin.from("incoming_messages").update({
            mimetype: imageMimetype,
            image_caption: imageCaption,
          }).eq("id", messageId);
        }
      } catch (e) {
        console.log("[ai-reply] chat-media save failed:", (e as Error)?.message);
      }
    } else if (messageId && (imageCaption || imageMimetype)) {
      await admin.from("incoming_messages").update({
        mimetype: imageMimetype,
        image_caption: imageCaption,
      }).eq("id", messageId);
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

    // Fixed Q&A — runs for both AI Agent and Auto-Reply modes (exact/contains match bypasses AI)
    if ((aiEnabled || autoReplyEnabled) && !isImageMessage) {
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
          showTyping: aiEnabled ? aiTyping : sessionTyping, accountProtection,
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
          if (sessionReadReceipts || aiReadReceipts) {
            await markAsRead({ gateway: GATEWAY, sessionId, apiToken: session.api_token, to: fromNumber, messageId, messageKey: incomingMessageKey });
          }
          await admin.from("message_logs").insert({
            user_id: userId, session_id: sessionId, to_number: sendResult.to,
            message_type: "text", payload: { text: reply, auto_reply: true, source: "fixed_qa" },
            status: "sent",
          });
        }
        return jsonResp({ ok: true, reply, sent: sendResult.ok, send_error: sendResult.error, sent_to: sendResult.to, source: "fixed_qa", message_id: messageId });
      }
    }

    if (autoReplyEnabled && !isImageMessage) {
      // Keyword rules
      const { data: rules } = await admin
        .from("auto_reply_rules")
        .select("id, keywords, match_type, reply_template, image_url, session_id, priority, match_count")
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
        const ruleImageUrl = (ruleHit.image_url || "").trim();
        const sendResult = await sendViaGateway({
          gateway: GATEWAY, sessionId, apiToken: session.api_token, to: fromNumber, message: reply,
          imageUrl: ruleImageUrl || undefined,
          showTyping: sessionTyping, accountProtection,
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
          if (sessionReadReceipts || aiReadReceipts) {
            await markAsRead({ gateway: GATEWAY, sessionId, apiToken: session.api_token, to: fromNumber, messageId, messageKey: incomingMessageKey });
          }
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

    // From here on: AI Agent must be explicitly ON. Image messages must not bypass
    // the master AI Agent switch, otherwise customers can receive AI fallback replies
    // while the dashboard says "AI Agent is OFF".
    if (!aiEnabled) {
      if (messageId) {
        await admin.from("incoming_messages").update({
          delivery_status: "skipped",
          reply_error: isImageMessage
            ? "Image received, but AI Agent is off"
            : "AI Agent is off",
          processed_at: new Date().toISOString(),
        }).eq("id", messageId);
      }
      return jsonResp({ ok: true, skipped: "ai_agent_off", message_id: messageId });
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

    // ---- Image-message branch: vision describe + product match ----
    if (isImageMessage && !imageUrl) {
      reply = "ছবি receive করেছি ✅ কিন্তু এই মুহূর্তে ছবিটা analyze করা সম্ভব হচ্ছে না। দয়া করে product টির নাম / রঙ / size text এ লিখে পাঠান, আমি match করে details দিচ্ছি।\n\nGot your image but couldn't open it right now — please describe the product in text (name / color / size).";
    } else if (isImageMessage && imageUrl) {
      if (keyRow.platform !== "openai") {
        reply = "Sorry, image search needs an OpenAI API key. Please describe the product in text. ছবি match করতে OpenAI key দরকার, দয়া করে product টি text এ describe করুন।";
      } else {
        try {
          const desc = await describeImageWithOpenAI(apiKey, imageUrl);

          // Extract structured fields (product name + order number) and persist them.
          const structured = await extractStructuredFromImage({
            apiKey, platform: keyRow.platform, imageUrl, caption: imageCaption,
          });
          if (messageId) {
            await admin.from("incoming_messages").update({
              extracted_product_name: structured.product_name,
              extracted_order_number: structured.order_number,
              image_analysis: { description: desc, ...structured },
              image_analyzed_at: new Date().toISOString(),
            }).eq("id", messageId);
          }

          const { data: productRows } = await admin
            .from("products")
            .select("id, name, price, description, category, stock, image_url, ai_tags")
            .eq("user_id", userId)
            .eq("is_active", true)
            .limit(500);

          let best: { score: number; row: any } | null = null;
          const haystackQuery = [desc, structured.product_name, imageCaption].filter(Boolean).join(" ");
          for (const p of productRows || []) {
            const haystack = [p.name, p.description, p.category, p.ai_tags].filter(Boolean).join(" ");
            const score = textSimilarity(haystackQuery, haystack);
            if (!best || score > best.score) best = { score, row: p };
          }

          if (best && best.score >= 0.18) {
            const p = best.row;
            const conf = Math.round(best.score * 100);
            reply = `✅ Match found (${conf}% confidence)\n\n📦 ${p.name}\n💰 Price: ${p.price}\n${p.stock > 0 ? `📊 Stock: ${p.stock}` : "❌ Out of stock"}\n${p.description ? `\n${p.description}` : ""}`;
          } else {
            // Log for admin notification
            await admin.from("unmatched_image_queries").insert({
              user_id: userId,
              session_id: sessionId,
              from_number: fromNumber,
              image_url: imageUrl,
              image_description: desc,
              best_match_score: best?.score ?? 0,
            });
            // Notify admin via WhatsApp (their own session)
            try {
              if (session.phone_number) {
                await sendViaGateway({
                  gateway: GATEWAY,
                  sessionId,
                  apiToken: session.api_token,
                  to: session.phone_number,
                  message: `🔔 Customer ${fromNumber} sent a product image we couldn't match.\nAI saw: ${desc.slice(0, 200)}`,
                  showTyping: false,
                  accountProtection: false,
                });
              }
            } catch (_e) { /* non-fatal */ }
            reply = "I couldn't find a matching product from your image. Could you please describe the product in text (name/color/size)? দুঃখিত, ছবি থেকে product খুঁজে পাইনি — দয়া করে product টি text এ describe করুন।";
          }
        } catch (visErr: any) {
          console.error("[image-match] error:", visErr?.message);
          reply = "Sorry, I couldn't read your image right now. Please describe the product in text.";
        }
      }
    } else {
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
          maxTokens: Number((biz as any)?.max_tokens) || 500,
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
    }

    // Skip the original try/catch wrapper below (now inlined)
    // (legacy duplicated block removed)

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
      showTyping: aiTyping,
      accountProtection,
    });

    const sendOk = sendResult.ok;
    const sendErr = sendResult.error;

    if (sendOk && (sessionReadReceipts || aiReadReceipts)) {
      await markAsRead({ gateway: GATEWAY, sessionId, apiToken: session.api_token, to: fromNumber, messageId, messageKey: incomingMessageKey });
    }

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
