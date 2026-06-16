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
function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.slice(i, i + chunk));
  }
  return btoa(binary);
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

// Transcribe a remote .ogg/.mp3/.m4a voice file via Lovable AI Gateway (Gemini).
// Auto-detects Bangla / English. Returns "" on failure.
// Accepts either a URL or pre-fetched (already-decrypted) bytes.
async function transcribeVoiceFile(
  audioUrl: string,
  prefetched?: { bytes: Uint8Array; mime: string } | null,
): Promise<string> {
  try {
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) {
      console.log("[stt] LOVABLE_API_KEY missing");
      return "";
    }
    let buf: Uint8Array;
    let ctype: string;
    if (prefetched?.bytes && prefetched.bytes.length > 0) {
      buf = prefetched.bytes;
      ctype = (prefetched.mime || "audio/ogg").split(";")[0].trim();
    } else {
      const audioRes = await fetch(audioUrl);
      if (!audioRes.ok) {
        console.log("[stt] download failed:", audioRes.status, audioUrl);
        return "";
      }
      ctype = (audioRes.headers.get("content-type") || "audio/ogg").split(";")[0].trim();
      buf = new Uint8Array(await audioRes.arrayBuffer());
    }
    // chunked base64 to avoid stack overflow on large audio
    let bin = "";
    const CHUNK = 0x8000;
    for (let i = 0; i < buf.length; i += CHUNK) {
      bin += String.fromCharCode.apply(null, Array.from(buf.subarray(i, i + CHUNK)) as any);
    }
    const b64 = btoa(bin);
    console.log("[stt] audio bytes:", buf.length, "mime:", ctype);

    const fmt = ctype.includes("mp3") || ctype.includes("mpeg") ? "mp3"
      : ctype.includes("wav") ? "wav"
      : ctype.includes("m4a") || ctype.includes("mp4") || ctype.includes("aac") ? "m4a"
      : "ogg";
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You are an automatic speech-to-text engine. Transcribe the user's audio verbatim into text. The audio may be in Bangla, English, or a mix. Output ONLY the transcript text — no quotes, no explanations, no language labels. If the audio has no speech, output an empty string.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Transcribe this voice note:" },
              { type: "input_audio", input_audio: { data: b64, format: fmt } },
            ],
          },
        ],
      }),
    });
    const data: any = await r.json().catch(() => ({}));
    if (!r.ok) {
      console.log("[stt] gateway error:", r.status, JSON.stringify(data).slice(0, 400));
      return "";
    }
    const text = String(data?.choices?.[0]?.message?.content || "").trim();
    console.log("[stt] transcribed", text.length, "chars");
    return text;
  } catch (e) {
    console.log("[stt] exception:", (e as Error)?.message);
    return "";
  }
}

function jsonResp(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Rough token estimator: ~4 chars per token, +4 tokens per message for role overhead
function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

async function callAI(opts: {
  platform: string; model: string; apiKey: string;
  systemPrompt: string; userMessage: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  maxTokens?: number;
  temperature?: number;
}): Promise<{ text: string; tokens: number; promptTokens: number; completionTokens: number }> {
  const { platform, model, apiKey, userMessage } = opts;
  let systemPrompt = opts.systemPrompt;
  let history = Array.isArray(opts.history) ? opts.history.filter((m) => m && m.content && m.content.trim()) : [];
  // Total budget cap (input + output combined). Hard ceiling 8000.
  const budget = Math.max(150, Math.min(8000, Number(opts.maxTokens) || 2000));
  const temperature = Math.max(0, Math.min(2, typeof opts.temperature === "number" ? opts.temperature : 0.7));

  // Reserve at least 20% (min 120) for the model's reply so it's not cut off.
  const minOutputReserve = Math.max(120, Math.floor(budget * 0.2));
  let promptBudget = budget - minOutputReserve;

  // 1) Drop oldest history turns until we fit.
  const sysTokens = () => estimateTokens(systemPrompt) + 4;
  const userTokens = () => estimateTokens(userMessage) + 4;
  const histTokens = () => history.reduce((s, m) => s + estimateTokens(m.content) + 4, 0);
  while (history.length > 0 && sysTokens() + userTokens() + histTokens() > promptBudget) {
    history.shift();
  }
  // 2) If still over (huge system prompt), truncate system prompt from the end.
  let overflow = sysTokens() + userTokens() + histTokens() - promptBudget;
  if (overflow > 0) {
    const keepChars = Math.max(400, (estimateTokens(systemPrompt) - overflow) * 4);
    if (systemPrompt.length > keepChars) {
      systemPrompt = systemPrompt.slice(0, keepChars) + "\n…[truncated to fit token budget]";
    }
  }
  // 3) If user message itself is enormous, truncate from the middle.
  overflow = sysTokens() + userTokens() + histTokens() - promptBudget;
  if (overflow > 0) {
    const keepChars = Math.max(200, userMessage.length - overflow * 4);
    // mutate via reassignment isn't possible; use a local
  }

  const estimatedPrompt = sysTokens() + userTokens() + histTokens();
  // Output cap = remaining budget after estimated input, clamped 80..budget.
  const outputCap = Math.max(80, Math.min(budget, budget - estimatedPrompt));

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
          ...history.map((m) => ({ role: m.role, content: m.content })),
          { role: "user", content: userMessage },
        ],
        max_tokens: outputCap,
        temperature,
      }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data?.error?.message || `AI error ${r.status}`);
    const text = data.choices?.[0]?.message?.content?.trim() || "";
    const promptTokens = Number(data?.usage?.prompt_tokens) || 0;
    const completionTokens = Number(data?.usage?.completion_tokens) || 0;
    return { text, tokens: completionTokens, promptTokens, completionTokens };
  }

  if (platform === "gemini") {
    const contents = [
      ...history.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
      { role: "user", parts: [{ text: userMessage }] },
    ];
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents,
          generationConfig: { maxOutputTokens: outputCap, temperature },
        }),
      }
    );
    const data = await r.json();
    if (!r.ok) throw new Error(data?.error?.message || `Gemini error ${r.status}`);
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
    const um = data?.usageMetadata || {};
    const promptTokens = Number(um.promptTokenCount) || 0;
    const completionTokens = Number(um.candidatesTokenCount) || 0;
    return { text, tokens: completionTokens, promptTokens, completionTokens };
  }

  throw new Error(`Unsupported platform: ${platform}`);
}


// Fetch the last N (incoming + outgoing) messages for this customer in this session,
// merged + sorted oldest→newest, so the AI has conversation memory.
async function fetchConversationHistory(
  admin: any,
  sessionId: string,
  fromNumber: string,
  excludeIncomingId: string | null,
  limit = 20,
): Promise<Array<{ role: "user" | "assistant"; content: string }>> {
  try {
    const [{ data: incoming }, { data: outgoing }] = await Promise.all([
      admin
        .from("incoming_messages")
        .select("id, message_text, message_type, image_caption, transcribed_text, received_at")
        .eq("session_id", sessionId)
        .eq("from_number", fromNumber)
        .order("received_at", { ascending: false })
        .limit(limit),
      admin
        .from("message_logs")
        .select("payload, message_type, created_at")
        .eq("session_id", sessionId)
        .eq("to_number", fromNumber)
        .order("created_at", { ascending: false })
        .limit(limit),
    ]);

    const items: Array<{ role: "user" | "assistant"; content: string; t: number }> = [];

    for (const m of incoming || []) {
      if (excludeIncomingId && (m as any).id === excludeIncomingId) continue;
      const text =
        (m as any).message_text ||
        (m as any).transcribed_text ||
        (m as any).image_caption ||
        ((m as any).message_type === "image" ? "[Customer sent an image]" :
         (m as any).message_type === "audio" ? "[Customer sent a voice message]" : "");
      if (!text) continue;
      items.push({ role: "user", content: String(text).slice(0, 1000), t: new Date((m as any).received_at).getTime() });
    }
    for (const m of outgoing || []) {
      const p = (m as any).payload || {};
      const text = p.text || p.reply || p.message || "";
      if (!text) continue;
      items.push({ role: "assistant", content: String(text).slice(0, 1500), t: new Date((m as any).created_at).getTime() });
    }

    items.sort((a, b) => a.t - b.t);
    // Keep only last `limit` total
    const trimmed = items.slice(-limit);
    return trimmed.map(({ role, content }) => ({ role, content }));
  } catch (e) {
    console.log("[ai-reply] fetchConversationHistory failed:", (e as Error)?.message);
    return [];
  }
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
    if ((nk === "imagemessage" || nk === "image_message") && obj[k] != null && typeof obj[k] === "object") return true;
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

// Direct vision-based product matching. Sends the customer image PLUS each
// product's match images to OpenAI vision and asks which product (by index)
// is the same item. Much more accurate than keyword similarity.
// Returns the matched product row + confidence, or null.
async function matchProductByVision(
  apiKey: string,
  customerImageUrl: string,
  products: Array<{ id: string; name: string; match_image_urls: string[] | null; image_url: string | null }>,
): Promise<{ product: any; confidence: number } | null> {
  // Build candidate list: 1 image per product (first match image, or fallback to image_url).
  const candidates = products
    .map((p) => {
      const img = (Array.isArray(p.match_image_urls) && p.match_image_urls[0]) || p.image_url || null;
      return img ? { id: p.id, name: p.name, img, row: p } : null;
    })
    .filter(Boolean) as Array<{ id: string; name: string; img: string; row: any }>;
  if (!candidates.length) return null;

  // OpenAI vision can handle many images; cap at 20 to keep cost/latency sane.
  const slice = candidates.slice(0, 20);

  const content: any[] = [
    {
      type: "text",
      text:
        `You are a product visual-matching expert. The FIRST image is what the CUSTOMER sent. The remaining ${slice.length} images are CATALOG products (labeled 1..${slice.length}).\n\n` +
        `Decide which catalog product (if any) is the SAME product the customer is asking about. Consider garment shape, print, pattern, colors, neckline, sleeve length, and overall look. Allow color variations of the SAME printed design to match. Reject clearly different products.\n\n` +
        `Catalog:\n${slice.map((c, i) => `${i + 1}. ${c.name}`).join("\n")}\n\n` +
        `Return STRICT JSON: {"index": <1-based number or 0 if none>, "confidence": <0-100 integer>, "reason": "<short>"}.`,
    },
    { type: "image_url", image_url: { url: customerImageUrl } },
    ...slice.map((c) => ({ type: "image_url" as const, image_url: { url: c.img } })),
  ];

  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [{ role: "user", content }],
        max_tokens: 200,
      }),
    });
    const data = await r.json();
    if (!r.ok) {
      console.log("[vision-match] api error", data?.error?.message || r.status);
      return null;
    }
    const raw = data.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw);
    const idx = Number(parsed?.index) || 0;
    const conf = Math.max(0, Math.min(100, Number(parsed?.confidence) || 0));
    console.log("[vision-match] result", { idx, conf, reason: parsed?.reason });
    if (idx >= 1 && idx <= slice.length && conf >= 55) {
      return { product: slice[idx - 1].row, confidence: conf };
    }
    return null;
  } catch (e) {
    console.log("[vision-match] failed:", (e as Error)?.message);
    return null;
  }
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

function findStringByKeys(value: unknown, keys: string[], depth = 0): string | null {
  if (depth > 8 || value == null) return null;
  if (typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;
  const wanted = new Set(keys.map((k) => k.toLowerCase()));
  for (const [key, val] of Object.entries(obj)) {
    if (wanted.has(key.toLowerCase()) && typeof val === "string" && val.trim()) return val.trim();
  }
  for (const val of Object.values(obj)) {
    const found = findStringByKeys(val, keys, depth + 1);
    if (found) return found;
  }
  return null;
}

function extractQuotedMediaUrl(value: unknown): string {
  return String(
    (value as any)?.quotedMediaUrl ||
    (value as any)?.quoted_media_url ||
    (value as any)?.quoted_image_url ||
    (value as any)?.quotedImageUrl ||
    findStringByKeys(value, ["quotedMediaUrl", "quoted_media_url", "quoted_image_url", "quotedImageUrl"]) ||
    ""
  ).trim();
}

function isSupabaseStorageUrl(value: string): boolean {
  const url = String(value || "").trim();
  if (!/^https?:\/\//i.test(url)) return false;
  try {
    const u = new URL(url);
    return u.hostname.endsWith(".supabase.co") && u.pathname.includes("/storage/v1/object/");
  } catch {
    return /\.supabase\.co\/storage\/v1\/object\//i.test(url);
  }
}

function isWhatsAppMediaUrl(value: string): boolean {
  const url = String(value || "").trim();
  if (!/^https?:\/\//i.test(url)) return false;
  try {
    const u = new URL(url);
    return u.hostname === "mmg.whatsapp.net" || u.hostname.endsWith(".whatsapp.net");
  } catch {
    return /\/\/[^/]*whatsapp\.net\//i.test(url);
  }
}

function isWebhookSafeMediaUrl(value: string): boolean {
  const url = String(value || "").trim();
  return /^https?:\/\//i.test(url) && !isSupabaseStorageUrl(url);
}

function extractWhatsappMediaUrl(value: unknown, depth = 0): string | null {
  if (depth > 10 || value == null) return null;
  if (typeof value === "string") {
    const v = value.trim();
    return isWhatsAppMediaUrl(v) ? v : null;
  }
  if (Array.isArray(value)) {
    for (const item of value.slice(0, 80)) {
      const found = extractWhatsappMediaUrl(item, depth + 1);
      if (found) return found;
    }
    return null;
  }
  if (typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;
  const preferred = ["url", "mediaUrl", "media_url", "imageUrl", "image_url", "quotedMediaUrl", "quoted_media_url", "quotedImageUrl", "quoted_image_url"];
  for (const key of preferred) {
    const found = extractWhatsappMediaUrl(obj[key], depth + 1);
    if (found) return found;
  }
  for (const child of Object.values(obj)) {
    const found = extractWhatsappMediaUrl(child, depth + 1);
    if (found) return found;
  }
  return null;
}

function firstWebhookSafeMediaUrl(...values: unknown[]): string | null {
  for (const value of values) {
    const url = typeof value === "string" ? value.trim() : "";
    if (url && isWhatsAppMediaUrl(url)) return url;
  }
  for (const value of values) {
    const url = typeof value === "string" ? value.trim() : "";
    if (url && isWebhookSafeMediaUrl(url)) return url;
  }
  return null;
}

function selectWebhookMediaUrl(payload: unknown, ...candidates: unknown[]): string {
  return extractWhatsappMediaUrl(payload) || firstWebhookSafeMediaUrl(...candidates) || "";
}

function sanitizeSupabaseStorageUrls(value: unknown, replacementUrl: string | null, depth = 0): unknown {
  if (depth > 10 || value == null) return value;
  if (typeof value === "string") {
    return isSupabaseStorageUrl(value) ? (replacementUrl || null) : value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeSupabaseStorageUrls(item, replacementUrl, depth + 1));
  }
  if (typeof value !== "object") return value;
  const out: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    out[key] = sanitizeSupabaseStorageUrls(child, replacementUrl, depth + 1);
  }
  return out;
}

function findImageMessageObject(value: unknown, depth = 0): Record<string, unknown> | null {
  if (depth > 10 || value == null || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;
  for (const [key, child] of Object.entries(obj)) {
    const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (normalized === "imagemessage" && child && typeof child === "object") {
      return child as Record<string, unknown>;
    }
  }
  for (const child of Object.values(obj)) {
    const found = findImageMessageObject(child, depth + 1);
    if (found) return found;
  }
  return null;
}

function buildWebhookImageMessage(payload: unknown, mediaUrl: string | null): Record<string, unknown> | null {
  const source = findImageMessageObject(payload);
  const cleaned = source ? sanitizeSupabaseStorageUrls(source, mediaUrl || null) as Record<string, unknown> : null;
  if (cleaned || mediaUrl) return { ...(cleaned || {}), ...(mediaUrl ? { url: mediaUrl } : {}) };
  return null;
}

function normalizeIncomingMessageType(body: Record<string, unknown>, rawType: unknown, messageText: string): string {
  const current = String(rawType || "").trim().toLowerCase();
  const mediaUrl = String((body as any).media_url || (body as any).mediaUrl || (body as any).image_url || (body as any).imageUrl || "").trim();
  const mime = String(findStringByKeys(body, ["mimetype", "mime_type", "contentType", "content_type"]) || "").toLowerCase();

  // Voice/audio MUST be detected before the deep image scan: WhatsApp voice payloads
  // carry an encrypted .enc media URL that the image heuristics can mistakenly match,
  // which would misroute the message into the image pipeline.
  const audioMsg = (body as any).audioMessage || (body as any)?.message?.audioMessage;
  const hasAudioObject = !!(audioMsg && typeof audioMsg === "object");
  if (/audio|voice|ptt/.test(current) || /^audio\//.test(mime) || hasAudioObject || /\.(ogg|oga|mp3|m4a|wav|aac)(\?|$)/i.test(mediaUrl)) return "audio";
  if (/image|photo|picture/.test(current) || /^image\//.test(mime) || payloadLooksLikeImage(body) || !!findImageUrl(body)) return "image";
  if (/video/.test(current) || /^video\//.test(mime) || /\.(mp4|mov|webm|mkv)(\?|$)/i.test(mediaUrl)) return "video";
  if (/document|file/.test(current) || /application\//.test(mime) || /\.(pdf|docx?|xlsx?|pptx?|csv|txt|zip)(\?|$)/i.test(mediaUrl)) return "document";
  if (current && !["other", "unknown", "message"].includes(current)) return current;
  if (messageText.trim() && !mediaUrl) return "text";
  return current || "text";
}

function extractQuotedMessageId(value: unknown, depth = 0): string | null {
  if (depth > 8 || value == null || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;
  for (const key of ["stanzaId", "quotedMessageId", "quoted_message_id", "quotedMsgId", "quoted_msg_id"]) {
    const v = obj[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  const context = (obj.contextInfo || obj.context_info || obj.quoted || obj.quotedMessageContext) as unknown;
  if (context && typeof context === "object") {
    const found = extractQuotedMessageId(context, depth + 1);
    if (found) return found;
  }
  for (const child of Object.values(obj)) {
    const found = extractQuotedMessageId(child, depth + 1);
    if (found) return found;
  }
  return null;
}

function normalizeTextForCompare(value: unknown): string {
  return String(value || "")
    .toLowerCase()
    .replace(/[\s\u200b\u200c\u200d]+/g, " ")
    .replace(/^[\s"'`]+|[\s"'`]+$/g, "")
    .trim();
}

function extractMessageTextDeep(value: unknown, depth = 0): string {
  if (depth > 7 || value == null) return "";
  if (typeof value === "string") return "";
  if (Array.isArray(value)) {
    for (const item of value.slice(0, 25)) {
      const found = extractMessageTextDeep(item, depth + 1);
      if (found) return found;
    }
    return "";
  }
  if (typeof value !== "object") return "";
  const obj = value as Record<string, unknown>;
  const directKeys = ["conversation", "text", "message", "message_text", "body", "caption"];
  for (const key of directKeys) {
    const child = obj[key];
    if (typeof child === "string" && child.trim()) return child.trim();
  }
  const nested = [
    (obj.message as any)?.conversation,
    (obj.message as any)?.extendedTextMessage?.text,
    (obj.message as any)?.imageMessage?.caption,
    (obj.extendedTextMessage as any)?.text,
    (obj.imageMessage as any)?.caption,
  ];
  for (const child of nested) {
    if (typeof child === "string" && child.trim()) return child.trim();
  }
  for (const child of Object.values(obj)) {
    const found = extractMessageTextDeep(child, depth + 1);
    if (found) return found;
  }
  return "";
}

function messageLooksFromMe(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  if (obj.fromMe === true || obj.from_me === true || obj.is_from_me === true) return true;
  const key = (obj.key || obj.rawKey) as Record<string, unknown> | undefined;
  return key?.fromMe === true || key?.from_me === true;
}

function collectMessageLikeObjects(value: unknown, out: unknown[] = [], seen = new Set<unknown>(), depth = 0): unknown[] {
  if (depth > 8 || value == null) return out;
  if (Array.isArray(value)) {
    for (const item of value.slice(0, 100)) collectMessageLikeObjects(item, out, seen, depth + 1);
    return out;
  }
  if (typeof value !== "object") return out;
  if (seen.has(value)) return out;
  seen.add(value);
  const obj = value as Record<string, unknown>;
  const hasMessageShape = Boolean(
    obj.key || obj.rawKey || obj.message || obj.contextInfo || obj.context_info ||
    obj.quoted || obj.quotedMessage || obj.extendedTextMessage || obj.imageMessage ||
    obj.messageTimestamp || obj.message_id || obj.messageId || obj.id
  );
  if (hasMessageShape) out.push(value);
  for (const child of Object.values(obj)) collectMessageLikeObjects(child, out, seen, depth + 1);
  return out;
}

function extractQuotedImageCandidate(value: unknown, depth = 0): {
  quotedMessageId: string | null;
  imageUrl: string | null;
  caption: string | null;
  source: string;
} | null {
  if (depth > 9 || value == null || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;
  const contexts = [obj.contextInfo, obj.context_info, obj.quotedMessageContext, obj.quoted].filter(Boolean);
  for (const context of contexts) {
    if (!context || typeof context !== "object") continue;
    const ctx = context as Record<string, unknown>;
    const quotedMessageId = String(
      ctx.stanzaId || ctx.quotedMessageId || ctx.quoted_message_id || ctx.id || ctx.messageId || ""
    ).trim() || null;
    const quotedMessage = (ctx.quotedMessage || ctx.message || ctx.quoted_message || ctx.quoted) as Record<string, unknown> | undefined;
    const imageUrl = findImageUrl(quotedMessage || ctx);
    const caption = findCaption(quotedMessage || ctx);
    if (quotedMessageId || imageUrl || payloadLooksLikeImage(quotedMessage || ctx)) {
      return { quotedMessageId, imageUrl, caption, source: "gateway_recent_message_context" };
    }
  }
  const directQuoted = (obj.quotedMessage || obj.quoted_message) as Record<string, unknown> | undefined;
  if (directQuoted) {
    const quotedMessageId = String(obj.stanzaId || obj.quotedMessageId || obj.messageId || obj.id || "").trim() || null;
    const imageUrl = findImageUrl(directQuoted);
    const caption = findCaption(directQuoted);
    if (quotedMessageId || imageUrl || payloadLooksLikeImage(directQuoted)) {
      return { quotedMessageId, imageUrl, caption, source: "gateway_recent_message_context" };
    }
  }
  for (const child of Object.values(obj)) {
    const found = extractQuotedImageCandidate(child, depth + 1);
    if (found) return found;
  }
  return null;
}

async function fetchGatewayQuotedImageFromRecentMessage(opts: {
  gateway: string; sessionId: string; apiToken?: string | null;
  remoteJid?: string | null; customerNumber?: string | null; messageText?: string | null;
}): Promise<{ quotedMessageId: string | null; imageUrl: string | null; caption: string | null; source: string } | null> {
  const { gateway, sessionId, apiToken, customerNumber, messageText } = opts;
  const digits = digitsOnly(customerNumber || "");
  const remoteJid = String(opts.remoteJid || (digits ? `${digits}@s.whatsapp.net` : "")).trim();
  if (!remoteJid) return null;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiToken) headers.Authorization = `Bearer ${apiToken}`;
  const jid = encodeURIComponent(remoteJid);
  const expectedText = normalizeTextForCompare(messageText || "");

  const attempts: Array<{ url: string; method: "GET" | "POST"; body?: unknown }> = [];
  for (const base of gatewayBaseVariants(gateway)) {
    attempts.push(
      { url: `${base}/api/session/${sessionId}/messages?chatId=${jid}&limit=20`, method: "GET" },
      { url: `${base}/api/session/${sessionId}/messages?jid=${jid}&limit=20`, method: "GET" },
      { url: `${base}/api/session/${sessionId}/chats/${jid}/messages?limit=20`, method: "GET" },
      { url: `${base}/api/session/${sessionId}/chat/${jid}/messages?limit=20`, method: "GET" },
      { url: `${base}/api/session/${sessionId}/messages`, method: "POST", body: { chatId: remoteJid, jid: remoteJid, remoteJid, limit: 20 } },
    );
  }

  for (const attempt of attempts) {
    try {
      const init: RequestInit = { method: attempt.method, headers: { ...headers } };
      if (attempt.method === "POST") init.body = JSON.stringify(attempt.body || {});
      const res = await fetch(attempt.url, init);
      if (!res.ok) continue;
      const data = await res.json().catch(() => null);
      if (!data) continue;
      const messages = collectMessageLikeObjects(data);
      const preferred = messages.filter((msg) => {
        if (messageLooksFromMe(msg)) return false;
        const candidateText = normalizeTextForCompare(extractMessageTextDeep(msg));
        if (!expectedText) return true;
        return candidateText === expectedText || candidateText.includes(expectedText) || expectedText.includes(candidateText);
      });
      for (const msg of [...preferred, ...messages]) {
        const quoted = extractQuotedImageCandidate(msg);
        if (!quoted) continue;
        let imageUrl = quoted.imageUrl;
        if (!imageUrl && quoted.quotedMessageId) {
          imageUrl = await fetchGatewayMediaDataUrl({
            gateway,
            sessionId,
            apiToken,
            messageId: quoted.quotedMessageId,
            remoteJid,
          });
        }
        if (quoted.quotedMessageId || imageUrl) {
          console.log("[gateway-quote] recovered quoted context", { source: attempt.url, quoted_message_id: quoted.quotedMessageId, has_image: !!imageUrl });
          return { ...quoted, imageUrl };
        }
      }
    } catch (e) {
      console.log("[gateway-quote] recent message lookup failed:", (e as Error)?.message);
    }
  }
  return null;
}

function collectPossibleMessageIds(value: unknown, out = new Set<string>(), depth = 0): Set<string> {
  if (depth > 8 || value == null) return out;
  if (typeof value === "string" || typeof value === "number") {
    const id = String(value).trim();
    if (id && id.length <= 200 && /[A-Za-z0-9]/.test(id)) out.add(id);
    return out;
  }
  if (Array.isArray(value)) {
    for (const item of value.slice(0, 50)) collectPossibleMessageIds(item, out, depth + 1);
    return out;
  }
  if (typeof value !== "object") return out;
  const idKeys = new Set(["id", "messageid", "message_id", "whatsappmessageid", "whatsapp_message_id", "stanzaid"]);
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const normalized = key.toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (idKeys.has(normalized) && (typeof child === "string" || typeof child === "number")) {
      const id = String(child).trim();
      if (id && id.length <= 200) out.add(id);
    }
    collectPossibleMessageIds(child, out, depth + 1);
  }
  return out;
}

function messageIdMatches(candidate: unknown, quotedId: string): boolean {
  const a = String(candidate || "").trim();
  const b = String(quotedId || "").trim();
  if (!a || !b) return false;
  if (a === b) return true;
  const strip = (v: string) => v.replace(/@.+$/, "").replace(/^wamid\./i, "").trim();
  const sa = strip(a);
  const sb = strip(b);
  return Boolean(sa && sb && (sa === sb || sa.endsWith(sb) || sb.endsWith(sa)));
}

async function findQuotedOrRecentOutgoingImage(admin: any, sessionId: string, fromNumber: string, quotedMessageId?: string | null) {
  const qid = String(quotedMessageId || "").trim();
  // 1) Outgoing images we sent to this customer (message_logs)
  try {
    const { data } = await admin
      .from("message_logs")
      .select("id, to_number, image_url, image_caption, payload, created_at, message_type")
      .eq("session_id", sessionId)
      .eq("message_type", "image")
      .order("created_at", { ascending: false })
      .limit(80);
    const rows = (Array.isArray(data) ? data : []).filter((row: any) => {
      const p = row?.payload || {};
      const url = String(row?.image_url || p.imageUrl || p.image_url || p.url || findImageUrl(p) || "").trim();
      return samePhone(row?.to_number, fromNumber) && !!url;
    });
    if (rows.length) {
      const matched = qid ? rows.find((row: any) => {
        const p = row?.payload || {};
        const ids = [p.gateway_message_id, p.message_id, p.id, p.key?.id, p.result?.key?.id, p.result?.id, p.gateway_response?.key?.id, p.gateway_response?.id, ...collectPossibleMessageIds(p.gateway_response || p)];
        return ids.some((id) => messageIdMatches(id, qid));
      }) : null;
      const row = matched || (!qid ? rows[0] : null);
      const p = row?.payload || {};
      const rowImageUrl = String(row?.image_url || p.imageUrl || p.image_url || p.url || findImageUrl(p) || "").trim();
      if (rowImageUrl) {
        return {
          image_url: rowImageUrl,
          caption: row.image_caption || row.payload?.caption || null,
          message_log_id: row.id,
          matched_by_quote: Boolean(matched),
          has_quote: Boolean(qid),
          quoted_message_id: qid || null,
          source: "outgoing_message_logs",
        };
      }
    }
  } catch (e) {
    console.log("[ai-reply] outgoing image lookup failed:", (e as Error)?.message);
  }

  // 2) Most recent INCOMING image from the same customer (incoming_messages).
  // Covers: customer earlier sent product photo, now follows up with text like
  // "ata koto" / "dam koto" without re-attaching the image.
  try {
    const { data } = await admin
      .from("incoming_messages")
      .select("id, image_url, media_url, image_caption, caption, mimetype, received_at, raw_payload")
      .eq("session_id", sessionId)
      .eq("from_number", fromNumber)
      .or("image_url.not.is.null,media_url.not.is.null")
      .order("received_at", { ascending: false })
      .limit(20);
    const rows = Array.isArray(data) ? data : [];
    const matched = qid ? rows.find((row: any) => {
      const r = row?.raw_payload || {};
      const ids = [row?.id, r.message_id, r.messageId, r.id, r.key?.id, r.rawKey?.id, ...collectPossibleMessageIds(r)];
      return ids.some((id) => messageIdMatches(id, qid));
    }) : null;
    const row = matched || (!qid ? rows.find((r: any) => {
      const url = String(r?.image_url || r?.media_url || "");
      const mt = String(r?.mimetype || "");
      return /\.(jpe?g|png|webp|gif|bmp|heic)(\?|$)/i.test(url) || /^image\//i.test(mt);
    }) : null);
    const url = String(row?.image_url || row?.media_url || "").trim();
    if (url) {
      return {
        image_url: url,
        caption: row?.image_caption || row?.caption || null,
        message_log_id: row?.id || null,
        matched_by_quote: Boolean(matched),
        has_quote: Boolean(qid),
        quoted_message_id: qid || null,
        source: "incoming_messages",
      };
    }
  } catch (e) {
    console.log("[ai-reply] incoming image lookup failed:", (e as Error)?.message);
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
        const b64 = bytesToBase64(buf);
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

// ---- WhatsApp encrypted media (.enc) decryption -------------------------
// Media downloaded straight from mmg.whatsapp.net is AES-256-CBC encrypted.
// The webhook payload carries imageMessage.mediaKey which lets us decrypt:
// HKDF-SHA256(mediaKey, info="WhatsApp <Type> Keys") -> iv(16)+cipherKey(32)+macKey(32),
// ciphertext = bytes minus trailing 10-byte MAC.
function sniffImageMime(bytes: Uint8Array): string | null {
  if (bytes.length < 12) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return "image/jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return "image/gif";
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return "image/webp";
  return null;
}

async function decryptWhatsAppMedia(
  encBytes: Uint8Array,
  mediaKeyB64: string,
  mediaType: "image" | "video" | "audio" | "document" = "image",
): Promise<Uint8Array | null> {
  try {
    const keyBin = atob(String(mediaKeyB64).trim());
    const mediaKey = new Uint8Array(keyBin.length);
    for (let i = 0; i < keyBin.length; i++) mediaKey[i] = keyBin.charCodeAt(i);
    if (mediaKey.length !== 32 || encBytes.length <= 26) return null;
    const infoMap = {
      image: "WhatsApp Image Keys",
      video: "WhatsApp Video Keys",
      audio: "WhatsApp Audio Keys",
      document: "WhatsApp Document Keys",
    } as const;
    const baseKey = await crypto.subtle.importKey("raw", mediaKey, "HKDF", false, ["deriveBits"]);
    const expanded = new Uint8Array(await crypto.subtle.deriveBits(
      {
        name: "HKDF",
        hash: "SHA-256",
        salt: new Uint8Array(32),
        info: new TextEncoder().encode(infoMap[mediaType]),
      },
      baseKey,
      112 * 8,
    ));
    const iv = expanded.slice(0, 16);
    const cipherKeyBytes = expanded.slice(16, 48);
    const ciphertext = encBytes.slice(0, encBytes.length - 10); // strip 10-byte MAC
    const cipherKey = await crypto.subtle.importKey("raw", cipherKeyBytes, { name: "AES-CBC" }, false, ["decrypt"]);
    const plain = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-CBC", iv }, cipherKey, ciphertext));
    return plain;
  } catch (e) {
    console.log("[wa-decrypt] failed:", (e as Error)?.message);
    return null;
  }
}

// Upload an image (data URL or http URL) to the chat-media storage bucket and return its public URL + mimetype.
async function uploadChatMediaImage(
  admin: any,
  userId: string,
  sessionId: string,
  source: string,
  mediaKey?: string | null,
): Promise<{ url: string; mime: string; signedUrl?: string | null } | null> {
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
      // WhatsApp CDN media is encrypted — decrypt with the payload mediaKey.
      if (!sniffImageMime(bytes) && mediaKey) {
        const dec = await decryptWhatsAppMedia(bytes, mediaKey, "image");
        const decMime = dec ? sniffImageMime(dec) : null;
        if (dec && decMime) {
          console.log("[wa-decrypt] decrypted media OK", { encLen: bytes.length, decLen: dec.length, mime: decMime });
          bytes = dec;
          mime = decMime;
        } else {
          console.log("[wa-decrypt] decryption did not yield a valid image");
        }
      }
      const sniffed = sniffImageMime(bytes);
      if (sniffed) mime = sniffed;
      else if (isWhatsAppMediaUrl(source)) {
        // Still encrypted garbage — don't store an unviewable blob.
        console.log("[chat-media] refusing to store non-image (likely encrypted) bytes");
        return null;
      }
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
    // Bucket is PRIVATE: the public URL 404s. Also mint a signed URL so the
    // vision model can actually download the image.
    let signedUrl: string | null = null;
    try {
      const { data: s } = await admin.storage.from("chat-media").createSignedUrl(path, 60 * 60);
      signedUrl = s?.signedUrl || null;
    } catch (_e) { /* non-fatal */ }
    return data?.publicUrl ? { url: data.publicUrl, mime, signedUrl } : null;
  } catch (e) {
    console.log("[chat-media] error:", (e as Error)?.message);
    return null;
  }
}

// Sniff common voice container headers. WhatsApp PTT is ogg/opus.
function sniffAudioMime(bytes: Uint8Array): string | null {
  if (bytes.length < 12) return null;
  // OggS
  if (bytes[0] === 0x4f && bytes[1] === 0x67 && bytes[2] === 0x67 && bytes[3] === 0x53) return "audio/ogg";
  // ID3 / MP3 frame sync (0xFFEx / 0xFFFx)
  if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) return "audio/mpeg";
  if (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0) return "audio/mpeg";
  // RIFF....WAVE
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x41 && bytes[10] === 0x56 && bytes[11] === 0x45) return "audio/wav";
  // ftyp -> mp4/m4a
  if (bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) return "audio/mp4";
  return null;
}

// Download (+ decrypt if encrypted WA CDN media) a voice file and upload to chat-media.
// Returns the stored URL + decrypted bytes (for transcription).
async function uploadChatMediaAudio(
  admin: any,
  userId: string,
  sessionId: string,
  source: string,
  mediaKey?: string | null,
): Promise<{ url: string; signedUrl: string | null; mime: string; bytes: Uint8Array } | null> {
  try {
    if (!/^https?:\/\//i.test(source)) return null;
    const r = await fetch(source);
    if (!r.ok) {
      console.log("[chat-media audio] fetch failed:", r.status);
      return null;
    }
    let mime = (r.headers.get("content-type") || "audio/ogg").split(";")[0];
    let bytes = new Uint8Array(await r.arrayBuffer());

    // WhatsApp CDN audio is AES-256-CBC encrypted — decrypt with the mediaKey.
    if (!sniffAudioMime(bytes) && mediaKey) {
      const dec = await decryptWhatsAppMedia(bytes, mediaKey, "audio");
      if (dec) {
        const decMime = sniffAudioMime(dec);
        console.log("[wa-decrypt] decrypted audio", { encLen: bytes.length, decLen: dec.length, mime: decMime });
        bytes = dec;
        if (decMime) mime = decMime;
        else mime = "audio/ogg";
      } else {
        console.log("[wa-decrypt] audio decryption failed");
      }
    }
    const sniffed = sniffAudioMime(bytes);
    if (sniffed) mime = sniffed;
    else if (isWhatsAppMediaUrl(source)) {
      console.log("[chat-media audio] refusing to store undecryptable bytes");
      return null;
    }

    const ext = mime.includes("mpeg") ? "mp3"
      : mime.includes("wav") ? "wav"
      : mime.includes("mp4") || mime.includes("aac") ? "m4a"
      : "ogg";
    const path = `${userId}/${sessionId}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await admin.storage.from("chat-media").upload(path, bytes, {
      contentType: mime,
      upsert: false,
    });
    if (upErr) {
      console.log("[chat-media audio] upload failed:", upErr.message);
      return null;
    }
    const { data } = admin.storage.from("chat-media").getPublicUrl(path);
    let signedUrl: string | null = null;
    try {
      const { data: s } = await admin.storage.from("chat-media").createSignedUrl(path, 60 * 60);
      signedUrl = s?.signedUrl || null;
    } catch { /* non-fatal */ }
    return { url: data?.publicUrl || "", signedUrl, mime, bytes };
  } catch (e) {
    console.log("[chat-media audio] error:", (e as Error)?.message);
    return null;
  }
}


async function findRecentWhatsappImageUrl(admin: any, fromNumber: string): Promise<string | null> {
  const digits = String(fromNumber || "").replace(/\D/g, "");
  if (!digits) return null;
  try {
    const since = new Date(Date.now() - 10 * 60_000).toISOString();
    const { data, error } = await admin.storage.from("whatsapp-media").list("whatsapp-media", {
      limit: 25,
      sortBy: { column: "created_at", order: "desc" },
    });
    if (error) {
      if (error) console.log("[ai-reply] storage image lookup failed:", error.message);
      return null;
    }
    const match = (data || []).find((item: any) =>
      String(item?.name || "").endsWith(`-${digits}.jpg`) &&
      (!item?.created_at || new Date(item.created_at).getTime() >= new Date(since).getTime())
    );
    if (!match?.name) return null;
    const { data: pub } = admin.storage.from("whatsapp-media").getPublicUrl(`whatsapp-media/${match.name}`);
    return pub?.publicUrl || null;
  } catch (e) {
    console.log("[ai-reply] storage image lookup exception:", (e as Error)?.message);
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
  const clean = String(gateway || "https://api.wareplyai.com").replace(/\/+$/, "");
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

  // If an image URL is provided, use the gateway's dedicated image endpoints.
  // IMPORTANT: never try the generic /send first — it ignores image fields,
  // sends text-only, and reports success, which silently drops the image.
  if (imageUrl) {
    const imageAttempts: Array<{ path: string; body: Record<string, unknown> }> = [
      // Proven shape — same as the working wa-send-image edge function.
      { path: `/api/session/${sessionId}/send-image`, body: { to: candidate, imageUrl, caption: message } },
      { path: `/api/session/${sessionId}/send-image`, body: { to: candidate, url: imageUrl, caption: message } },
      { path: `/api/session/${sessionId}/sendImage`, body: { to: candidate, imageUrl, url: imageUrl, caption: message } },
      { path: `/api/sendImage`, body: { session: sessionId, chatId: candidate, file: { url: imageUrl }, caption: message } },
    ];
    for (const attempt of imageAttempts) {
      try {
        const res = await fetch(`${gateway}${attempt.path}`, {
          method: "POST", headers, body: JSON.stringify(attempt.body),
        });
        const result = await interpret(res);
        console.log("[sendViaGateway] image attempt", attempt.path, "->", result.status, result.ok ? "OK" : JSON.stringify(result.data).slice(0, 200));
        if (result.ok) return { ok: true, to: candidate, error: null, data: result.data };
      } catch (e) {
        console.log("[sendViaGateway] image attempt failed", attempt.path, (e as Error)?.message);
      }
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
    console.log("INCOMING PAYLOAD:", JSON.stringify(body).slice(0, 2000));

    // ============================================================
    // PASSTHROUGH MODE — when user has set their own external webhook URL
    // (n8n / make / custom), we forward the RAW payload as-is and SKIP
    // every built-in step: no DB writes, no AI reply, no auto-reply,
    // no CRM bot, no media decryption, no inbox storage. The user's
    // own automation is fully responsible for handling the message.
    // ============================================================
    try {
      const ptSessionId = String((body as any)?.session_id || (body as any)?.sessionId || "").trim();
      const ptSecret =
        req.headers.get("x-webhook-secret") ||
        (req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ?? "");
      if (ptSessionId && ptSecret) {
        const ptAdmin = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        );
        const { data: ptSes } = await ptAdmin
          .from("sessions")
          .select("id, webhook_secret, api_token, enable_webhook, forward_webhook_url, webhook_url")
          .eq("id", ptSessionId)
          .maybeSingle();
        if (ptSes && ptSes.webhook_secret === ptSecret && ptSes.enable_webhook) {
          const externalUrl = String(
            ptSes.forward_webhook_url ||
            (isInternalAiReplyWebhook(String(ptSes.webhook_url || "")) ? "" : ptSes.webhook_url) ||
            ""
          ).trim();
          if (externalUrl && !isInternalAiReplyWebhook(externalUrl)) {
            const ev = String((body as any)?.event || "messages.received");
            const ptCustomer = resolveCustomerNumber(body as Record<string, unknown>, null) || digitsOnly((body as any)?.from_number || (body as any)?.from);
            const ptQuotedMessageId = extractQuotedMessageId(body);
            let passthroughBody: Record<string, unknown> = body as Record<string, unknown>;
            if (ptCustomer) {
              const ptRemoteJid = findStringByKeys(body, ["remoteJid", "remote_jid", "target_jid"]) || `${ptCustomer}@s.whatsapp.net`;
              const gatewayQuoted = !ptQuotedMessageId
                ? await fetchGatewayQuotedImageFromRecentMessage({
                    gateway: Deno.env.get("WHATSAPP_GATEWAY_URL") || "https://api.wareplyai.com",
                    sessionId: ptSes.id,
                    apiToken: ptSes.api_token,
                    customerNumber: ptCustomer,
                    remoteJid: ptRemoteJid,
                    messageText: String((body as any)?.message || (body as any)?.message_text || (body as any)?.text || ""),
                  })
                : null;
              const existingQuotedImageUrl = extractQuotedMediaUrl(body);
              const effectiveQuotedMessageIdForLookup = ptQuotedMessageId || gatewayQuoted?.quotedMessageId || null;
              const quotedGatewayMedia = gatewayQuoted?.imageUrl || ((!isWebhookSafeMediaUrl(existingQuotedImageUrl) && effectiveQuotedMessageIdForLookup)
                ? await fetchGatewayMediaDataUrl({
                    gateway: Deno.env.get("WHATSAPP_GATEWAY_URL") || "https://api.wareplyai.com",
                    sessionId: ptSes.id,
                    apiToken: ptSes.api_token,
                    messageId: effectiveQuotedMessageIdForLookup,
                    remoteJid: ptRemoteJid || undefined,
                  })
                : null);
              const effectiveQuotedImageUrl = selectWebhookMediaUrl(body, existingQuotedImageUrl, quotedGatewayMedia);
              const incomingMediaUrl = String((body as any)?.media_url || (body as any)?.mediaUrl || (body as any)?.image_url || (body as any)?.imageUrl || "").trim();
              const effectiveMediaUrl = selectWebhookMediaUrl(body, incomingMediaUrl, effectiveQuotedImageUrl);
              const webhookImageMessage = buildWebhookImageMessage(body, effectiveMediaUrl || effectiveQuotedImageUrl || null);
              const sanitizedBody = sanitizeSupabaseStorageUrls(body, effectiveMediaUrl || effectiveQuotedImageUrl || null) as Record<string, unknown>;
              const effectiveMessageType = (effectiveQuotedImageUrl || effectiveMediaUrl || webhookImageMessage) && !incomingMediaUrl
                ? "image"
                : String((body as any)?.message_type || (body as any)?.messageType || "other");
              const rawPayload = (body as any)?.raw_payload && typeof (body as any).raw_payload === "object"
                ? (body as any).raw_payload
                : null;
              passthroughBody = {
                ...sanitizedBody,
                message_type: effectiveMessageType,
                media_type: (effectiveQuotedImageUrl || effectiveMediaUrl || webhookImageMessage) ? "image" : ((body as any)?.media_type || effectiveMessageType),
                quoted_message_id: effectiveQuotedMessageIdForLookup || null,
                quoted_image_url: effectiveQuotedImageUrl || null,
                quotedImageUrl: effectiveQuotedImageUrl || null,
                quoted_image_caption: gatewayQuoted?.caption || null,
                quoted_image_matched: Boolean(quotedGatewayMedia || existingQuotedImageUrl || gatewayQuoted),
                quoted_image_source: gatewayQuoted ? gatewayQuoted.source : (quotedGatewayMedia ? "gateway_quoted_media" : (existingQuotedImageUrl ? "payload_quoted_image_url" : null)),
                image_url: effectiveMediaUrl || null,
                imageUrl: effectiveMediaUrl || null,
                media_url: effectiveMediaUrl || null,
                mediaUrl: effectiveMediaUrl || null,
                ...(webhookImageMessage ? { imageMessage: webhookImageMessage } : {}),
                raw_payload: rawPayload && (effectiveQuotedImageUrl || effectiveMediaUrl || webhookImageMessage) ? {
                  ...(sanitizeSupabaseStorageUrls(rawPayload, effectiveMediaUrl || effectiveQuotedImageUrl || null) as Record<string, unknown>),
                  message_type: "image",
                  media_type: "image",
                  media_url: effectiveMediaUrl || null,
                  mediaUrl: effectiveMediaUrl || null,
                  image_url: effectiveMediaUrl || null,
                  imageUrl: effectiveMediaUrl || null,
                  quoted_message_id: effectiveQuotedMessageIdForLookup || null,
                  quoted_image_url: effectiveQuotedImageUrl || null,
                  ...(webhookImageMessage ? { imageMessage: webhookImageMessage } : {}),
                } : sanitizedBody.raw_payload,
              };
            }
            let delivered = false;
            let error: string | null = null;
            try {
              const ctrl = new AbortController();
              const to = setTimeout(() => ctrl.abort(), 15_000);
              const r = await fetch(externalUrl, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "User-Agent": "WaReplyAI-Webhook/1.0",
                  "X-WaReply-Event": ev,
                  "X-WaReply-Session": ptSes.id,
                  "X-WaReply-Mode": "passthrough",
                },
                body: JSON.stringify(passthroughBody),
                signal: ctrl.signal,
              });
              clearTimeout(to);
              delivered = r.ok;
              if (!r.ok) error = `HTTP ${r.status}`;
            } catch (e: any) {
              error = e?.name === "AbortError" ? "timeout" : (e?.message || "fetch failed");
            }
            return jsonResp({ ok: delivered, mode: "passthrough", forwarded_to: externalUrl, error });
          }
        }
      }
    } catch (e) {
      console.log("[passthrough] check failed, falling through to built-in:", (e as Error)?.message);
    }
    // ============================================================
    // END PASSTHROUGH — below is the original built-in pipeline.
    // ============================================================

    console.log("media_url value:", (body as any)?.media_url ?? null);
    console.log("message_type:", (body as any)?.message_type ?? null);
    const sessionId = String(body.session_id || body.sessionId || "").trim();
    let rawText = String(body.message || body.text || body.message_text || "").trim();
    const isGroup = Boolean(body.is_group ?? body.isGroup ?? false) || hasGroupJid(body);
    let messageType = normalizeIncomingMessageType(body, body.message_type || body.messageType || body.type, rawText);
    (body as any).message_type = messageType;
    (body as any).media_type = messageType;
    const fromMe = Boolean(body.from_me ?? body.fromMe ?? body.is_from_me ?? false) ||
      hasDeepTruthy(body, new Set(["fromme", "from_me", "isfromme", "is_from_me"]));
    const sourceMessageId = String(body.source_message_id || "").trim();

    // ---- Voice / audio messages: decrypt (if WA CDN), upload to chat-media, then transcribe.
    // We replace body.media_url with the clean chat-media URL so the inbox can play it,
    // and expose transcribed_text so the inbox/AI agent can use the transcript as the message text.
    let voiceTranscript = "";
    let voiceUploadedMime: string | null = null;
    {
      const audioUrl = String((body as any).media_url || (body as any).mediaUrl || "").trim();
      const lowerType0 = messageType.toLowerCase();
      const isAudio = /audio|voice|ptt/.test(lowerType0);
      if (audioUrl && isAudio) {
        try {
          const admin0 = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
          );
          const { data: ses0 } = await admin0.from("sessions")
            .select("id, user_id")
            .eq("id", sessionId).maybeSingle();
          const audioMediaKey = String(
            (body as any)?.audioMessage?.mediaKey ||
            (body as any)?.message?.audioMessage?.mediaKey ||
            findStringByKeys(body, ["mediaKey", "media_key"]) ||
            ""
          ).trim() || null;
          let prefetched: { bytes: Uint8Array; mime: string } | null = null;
          if (ses0?.user_id) {
            const uploaded = await uploadChatMediaAudio(admin0, ses0.user_id, sessionId, audioUrl, audioMediaKey);
            if (uploaded) {
              (body as any).media_url = uploaded.url;
              (body as any).mediaUrl = uploaded.url;
              voiceUploadedMime = uploaded.mime;
              prefetched = { bytes: uploaded.bytes, mime: uploaded.mime };
              console.log("[voice] chat-media upload OK", { url: uploaded.url, mime: uploaded.mime, len: uploaded.bytes.length });
            } else {
              console.log("[voice] chat-media upload failed; will try transcribing the raw URL");
            }
          }
          if (!rawText) {
            const transcript = await transcribeVoiceFile(audioUrl, prefetched);
            if (transcript) {
              voiceTranscript = transcript;
              rawText = transcript;
              (body as any).message = transcript;
              (body as any).transcribed_text = transcript;
              (body as any).original_type = "audio";
              console.log("[stt] AI agent will reply to transcribed audio for session", sessionId);
            } else {
              console.log("[stt] empty transcript for", audioUrl);
            }
          }
        } catch (e) {
          console.log("[voice] pre-step failed:", (e as Error)?.message);
        }
      }
    }

    // ---- Non-image media we cannot transcribe (video/document/sticker), or audio when
    // transcription failed — log to inbox and skip AI reply. media_url is already the
    // decrypted chat-media URL for audio when uploadChatMediaAudio succeeded.
    {
      const mediaUrl = String((body as any).media_url || (body as any).mediaUrl || "").trim();
      const lowerType = messageType.toLowerCase();
      const isNonImageMedia = /audio|voice|ptt|video|document|file|sticker/.test(lowerType);
      if (mediaUrl && isNonImageMedia && !voiceTranscript) {
        const admin0 = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        );
        const { data: ses0 } = await admin0.from("sessions")
          .select("id, user_id, webhook_secret, phone_number")
          .eq("id", sessionId).maybeSingle();
        const provided0 =
          req.headers.get("x-webhook-secret") ||
          (req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ?? "");
        if (!ses0) return jsonResp({ error: "Session not found" }, 404);
        if (!provided0 || provided0 !== ses0.webhook_secret) {
          return jsonResp({ error: "Invalid webhook secret" }, 401);
        }
        if (fromMe || isGroup) return jsonResp({ ok: true, skipped: "from_me_or_group" });

        const fromDigits = String((body as any).from || (body as any).from_number || "").replace(/\D/g, "");
        if (!fromDigits) return jsonResp({ error: "from required" }, 400);

        const normType = /audio|voice|ptt/.test(lowerType) ? "audio"
          : /video/.test(lowerType) ? "video"
          : /document|file/.test(lowerType) ? "document"
          : lowerType;
        const caption = String((body as any).caption || (body as any).image_caption || "").trim() || null;
        const filename = String((body as any).filename || (body as any).media_filename || "").trim() || null;

        await admin0.from("incoming_messages").insert({
          session_id: sessionId,
          user_id: ses0.user_id,
          from_number: fromDigits,
          message_text: caption,
          message_type: normType,
          is_group: false,
          raw_payload: body,
          reply_sent: false,
          delivery_status: "skipped",
          received_at: new Date().toISOString(),
          media_url: mediaUrl,
          media_filename: filename,
          mimetype: voiceUploadedMime,
          caption,
        });
        return jsonResp({ ok: true, logged: normType });
      }
    }


    // ---- Image detection: scan body deeply for any image source (URL/dataURL/base64) ----
    const bodyMediaUrl = String((body as any).media_url || (body as any).mediaUrl || "").trim();
    const isAudioMessage = /audio|voice|ptt/.test(messageType.toLowerCase());
    let imageUrl = isAudioMessage ? "" : findImageUrl(body);
    const looksImageType = !isAudioMessage && /image|photo|picture/i.test(messageType);
    const payloadHasImage = !isAudioMessage && (looksImageType || payloadLooksLikeImage(body));
    // Tentatively flag as image — even when the customer added a caption/text.
    // For WhatsApp image+caption payloads, the caption may arrive in nested
    // imageMessage.caption instead of body.message. We must treat this as ONE
    // image message so product matching runs before the AI answers the caption.
    let isImageMessage = !isAudioMessage && (!!imageUrl || payloadHasImage);
    let messageText = rawText || "";
    let imageCaption: string | null = isImageMessage ? findCaption(body) : null;
    if (!messageText && imageCaption) {
      messageText = imageCaption;
      rawText = imageCaption;
      (body as any).message = imageCaption;
      (body as any).image_caption = imageCaption;
      console.log("[ai-reply] using image caption as customer text", { caption: imageCaption });
    }

    console.log("message_type:", messageType);
    console.log("media_url:", bodyMediaUrl || null);
    console.log("Image received, media_url:", isImageMessage ? (bodyMediaUrl || null) : null);

    console.log("[ai-reply] incoming", {
      sessionId,
      messageType,
      hasText: !!rawText,
      hasImage: !!imageUrl,
      media_url: bodyMediaUrl || null,
      image_url: imageUrl || null,
      image_url_length: imageUrl ? imageUrl.length : 0,
      image_base64_length: imageUrl?.startsWith("data:") ? (imageUrl.split(",").pop()?.length || 0) : 0,
      payloadHasImage,
      imageKind: imageUrl ? (imageUrl.startsWith("data:") ? "data-url" : "http") : "none",
      bodyKeys: Object.keys(body || {}),
    });

    if (!sessionId || (!messageText && !imageUrl && !payloadHasImage && !bodyMediaUrl)) {
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

    const GATEWAY = Deno.env.get("WHATSAPP_GATEWAY_URL") || "https://api.wareplyai.com";
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

    // WhatsApp "reply to image" often arrives as a plain text message with only
    // contextInfo.stanzaId and no media_url. Recover the image we previously sent
    // to this customer so n8n/webhooks and AI still know which product "ata" means.
    const quotedMessageId = extractQuotedMessageId(body);
    const bodyQuotedImageUrl = extractQuotedMediaUrl(body);
    let quotedOutgoingImage: Awaited<ReturnType<typeof findQuotedOrRecentOutgoingImage>> = null;
    let quotedGatewayImageUrl: string | null = null;
    if (!imageUrl && messageText && !isImageMessage && (quotedMessageId || bodyQuotedImageUrl)) {
      if (quotedMessageId && !bodyQuotedImageUrl) quotedOutgoingImage = await findQuotedOrRecentOutgoingImage(admin, sessionId, fromNumber, quotedMessageId);
      if (!bodyQuotedImageUrl && quotedMessageId && !quotedOutgoingImage?.image_url) {
        quotedGatewayImageUrl = await fetchGatewayMediaDataUrl({
          gateway: GATEWAY,
          sessionId,
          apiToken: session.api_token,
          messageId: quotedMessageId,
          remoteJid: String((body as any).target_jid || (body as any).remoteJid || (rawKey as any)?.remoteJid || (rawPayload as any)?.remoteJid || "").trim(),
        });
      }
      const recoveredQuotedUrl = bodyQuotedImageUrl || quotedOutgoingImage?.image_url || quotedGatewayImageUrl;
      if (recoveredQuotedUrl) {
        imageUrl = recoveredQuotedUrl;
        isImageMessage = true;
        imageCaption = imageCaption || quotedOutgoingImage?.caption || null;
        messageType = "image";
        (body as any).message_type = "image";
        (body as any).media_type = "image";
        (body as any).quoted_message_id = quotedOutgoingImage?.quoted_message_id || quotedMessageId;
        (body as any).quoted_image_url = recoveredQuotedUrl;
        (body as any).quoted_image_caption = quotedOutgoingImage?.caption || null;
        console.log("[ai-reply] recovered quoted outgoing image", quotedOutgoingImage || { source: bodyQuotedImageUrl ? "payload_quoted_image_url" : "gateway_quoted_media", quoted_message_id: quotedMessageId });
      }
    }

    if (!imageUrl && messageText && !isImageMessage && !quotedMessageId && !bodyQuotedImageUrl) {
      const gatewayQuoted = await fetchGatewayQuotedImageFromRecentMessage({
        gateway: GATEWAY,
        sessionId,
        apiToken: session.api_token,
        customerNumber: fromNumber,
        remoteJid: String((body as any).target_jid || (body as any).remoteJid || (rawKey as any)?.remoteJid || (rawPayload as any)?.remoteJid || `${fromNumber}@s.whatsapp.net`).trim(),
        messageText,
      });
      const recoveredQuotedUrl = gatewayQuoted?.imageUrl || (gatewayQuoted?.quotedMessageId
        ? await fetchGatewayMediaDataUrl({
            gateway: GATEWAY,
            sessionId,
            apiToken: session.api_token,
            messageId: gatewayQuoted.quotedMessageId,
            remoteJid: String((body as any).target_jid || (body as any).remoteJid || (rawKey as any)?.remoteJid || (rawPayload as any)?.remoteJid || `${fromNumber}@s.whatsapp.net`).trim(),
          })
        : null);
      if (recoveredQuotedUrl) {
        imageUrl = recoveredQuotedUrl;
        isImageMessage = true;
        imageCaption = imageCaption || gatewayQuoted?.caption || null;
        messageType = "image";
        (body as any).message_type = "image";
        (body as any).media_type = "image";
        (body as any).quoted_message_id = gatewayQuoted?.quotedMessageId || null;
        (body as any).quoted_image_url = recoveredQuotedUrl;
        (body as any).quoted_image_caption = gatewayQuoted?.caption || null;
        console.log("[ai-reply] recovered quoted image from gateway recent message", gatewayQuoted);
      }
    }

    // Per-customer mode: ai (default) | human (manual only) | auto_reply (keyword rules only)
    const { data: customerSetting } = await admin
      .from("customer_reply_settings")
      .select("mode, ai_paused")
      .eq("session_id", sessionId)
      .eq("phone_number", fromNumber)
      .maybeSingle();
    let customerMode: "ai" | "human" | "auto_reply" =
      (customerSetting?.mode as any) || (customerSetting?.ai_paused ? "human" : "ai");

    // AUTO HUMAN HANDOFF — if customer asks for a human / admin / real agent,
    // switch this customer to human mode automatically and stop AI replies.
    if (customerMode === "ai") {
      const lowerMsg = String(messageText || "").toLowerCase();
      const humanHandoffPatterns: RegExp[] = [
        // English — broad
        /\b(human|real\s*(person|agent|human)|live\s*(agent|person|support|chat)|customer\s*(service|support|care)|talk\s*to\s*(a\s*)?(human|person|agent|someone|admin|manager|representative|owner|staff)|speak\s*to\s*(a\s*)?(human|person|agent|admin|manager|owner|staff)|connect\s*(me\s*)?(to|with)\s*(a\s*)?(human|agent|admin|manager|owner|staff)|need\s*(a\s*)?(human|agent|admin|manager|owner|staff)|want\s*(a\s*)?(human|agent|admin|manager|owner|staff)|are\s*you\s*(a\s*)?(bot|ai|robot)|is\s*this\s*(a\s*)?(bot|ai|robot)|stop\s*bot|no\s*bot|not\s*(a\s*)?bot)\b/i,
        // Bangla script
        /(মানুষ|আসল\s*মানুষ|এডমিন|অ্যাডমিন|এজেন্ট|সাপোর্ট|কাস্টমার\s*কেয়ার|কাস্টমার\s*সাপোর্ট|ম্যানেজার|মালিক|বট\s*নয়|বট\s*না|বটের\s*সাথে|মানুষের\s*সাথে|রিয়েল\s*এজেন্ট|রিয়েল\s*মানুষ|কথা\s*বলতে\s*চাই|কথা\s*বলবো|কথা\s*বলব)/i,
        // Banglish — any mention of admin/agent/manager/owner/malik/manush/support + talk intent OR with chai/lagbe/sathe/sate/shate
        /\b(admin|agent|manager|owner|malik|manush|manusher|support|real\s*(manush|agent|admin|person))\b[^\n]{0,40}\b(chai|chy|lagbe|sathe|sate|shate|shate|sange|kotha|bolbo|bolba|bolte|bolte\s*chai|bolte\s*cai|baat|baath|baat\s*korbo|den|dao|deo|dorkar|needed|need|please|plz)\b/i,
        /\b(kotha|baat|baath)\s*(bol\w*|kor\w*)\b[^\n]{0,40}\b(admin|agent|manager|owner|malik|manush|manusher|real\s*manush|human|support)\b/i,
        /\b(bot|robot|ai)\s*(na|nay|noy|er\s*sathe|er\s*sate|er\s*shate)\b/i,
        /\b(tumi|apni|eta|tomra|apnara)\s*ki\s*(bot|robot|ai|manush)\b/i,
      ];
      const isHumanRequest = humanHandoffPatterns.some((re) => re.test(lowerMsg));
      if (isHumanRequest) {
        try {
          const { error: handoffError } = await admin.from("customer_reply_settings").upsert({
            user_id: session.user_id,
            session_id: sessionId,
            phone_number: fromNumber,
            mode: "human",
            ai_paused: true,
            paused_at: new Date().toISOString(),
          }, { onConflict: "user_id,session_id,phone_number" });
          if (handoffError) throw handoffError;
          console.log("[ai-reply] auto human handoff triggered for", fromNumber);
        } catch (e) {
          console.error("[ai-reply] failed to set human mode", e);
        }
        customerMode = "human";
      }
    }

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
    const batchingEnabled = (biz as any)?.message_batching_enabled === true;
    const batchWaitSeconds = batchingEnabled
      ? Math.max(0, Math.min(120, Number((biz as any)?.batch_wait_seconds ?? 10)))
      : 0;
    console.log("=== AI REPLY START ===");
    console.log("message_type:", messageType);
    console.log("message:", messageText || null);
    console.log("media_url:", bodyMediaUrl || null);
    console.log("batching_enabled:", batchingEnabled);
    console.log("reply_mode:", replyMode, "ai_enabled:", aiEnabled, "auto_reply_enabled:", autoReplyEnabled);
    console.log("======================");
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
      // Capture the public media URL the VPS sent us so the inbox can render it
      // immediately, even if the chat-media re-upload below fails.
      let payloadMediaUrl =
        bodyMediaUrl ||
        (isImageMessage && imageUrl && /^https?:\/\//i.test(imageUrl) ? imageUrl : null) ||
        null;
      const payloadCaption =
        (typeof (body as any).caption === "string" && (body as any).caption) ||
        (typeof (body as any).image_caption === "string" && (body as any).image_caption) ||
        imageCaption ||
        null;
      const payloadFilename =
        (typeof (body as any).media_filename === "string" && (body as any).media_filename) ||
        (typeof (body as any).filename === "string" && (body as any).filename) ||
        null;
      if (isImageMessage && !payloadMediaUrl && !quotedMessageId) {
        payloadMediaUrl = await findRecentWhatsappImageUrl(admin, fromNumber);
        if (payloadMediaUrl && !imageUrl) imageUrl = payloadMediaUrl;
      }
      console.log("[ai-reply] image media resolved before insert", {
        message_type: messageType,
        is_image: isImageMessage,
        media_url: payloadMediaUrl,
        image_url: imageUrl,
        image_url_kind: imageUrl ? (imageUrl.startsWith("data:") ? "data-url" : "url") : "none",
        image_base64_length: imageUrl?.startsWith("data:") ? (imageUrl.split(",").pop()?.length || 0) : 0,
      });
      const logRow: Record<string, unknown> = {
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
        media_url: payloadMediaUrl,
        media_filename: payloadFilename,
        caption: payloadCaption,
        image_url: isImageMessage ? payloadMediaUrl : null,
        mimetype: voiceUploadedMime,
        transcribed_text: voiceTranscript || null,
      };
      const { data: msgRow } = await admin
        .from("incoming_messages")
        .insert(logRow)
        .select("id")
        .single();
      messageId = msgRow?.id;
    }

    // Capture caption + mimetype from the raw payload (Baileys imageMessage.caption etc.)
    imageCaption = isImageMessage ? (imageCaption || findCaption(body)) : null;
    let imageMimetype: string | null = isImageMessage ? findMimetype(body) : null;

    // If we have an image (resolved from payload or recovered from gateway), upload it to
    // chat-media bucket and persist the public URL + mimetype on the message so it shows in the inbox.
    if (messageId && imageUrl) {
      try {
        const incomingMediaKey = String(
          (body as any)?.imageMessage?.mediaKey ||
          (body as any)?.quoted_image_mediaKey ||
          (rawPayload as any)?.imageMessage?.mediaKey ||
          (rawPayload as any)?.message?.imageMessage?.mediaKey ||
          findStringByKeys(body, ["mediaKey", "media_key"]) ||
          ""
        ).trim() || null;
        const uploaded = await uploadChatMediaImage(admin, userId, sessionId, imageUrl, incomingMediaKey);
        if (uploaded) {
          imageMimetype = imageMimetype || uploaded.mime;
          await admin.from("incoming_messages").update({
            image_url: uploaded.url,
            media_url: uploaded.url,
            mimetype: imageMimetype,
            image_caption: imageCaption,
          }).eq("id", messageId);
          // Use the SIGNED url for vision (bucket is private — public URL 404s).
          imageUrl = uploaded.signedUrl || uploaded.url;
          console.log("[ai-reply] saved chat-media url for message", {
            messageId,
            media_url: uploaded.url,
            image_url: imageUrl,
            mime: imageMimetype,
          });
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

    // Product image matching removed.
    let matchedProduct: any = null;

    const storedMessage = messageId ? await admin
      .from("incoming_messages")
      .select("media_url, image_url, mimetype, caption, image_caption")
      .eq("id", messageId)
      .maybeSingle() : { data: null };
    const effectiveImageMessage = isImageMessage || /^image\//i.test(String((storedMessage as any)?.data?.mimetype || ""));
    const webhookImageUrl = effectiveImageMessage ? selectWebhookMediaUrl(body, bodyMediaUrl, imageUrl) : "";
    const webhookMediaUrl = webhookImageUrl || "";
    const webhookQuotedImageUrl = firstWebhookSafeMediaUrl(bodyQuotedImageUrl, quotedGatewayImageUrl, quotedOutgoingImage?.image_url);
    const webhookImageMessage = effectiveImageMessage ? buildWebhookImageMessage(body, webhookMediaUrl || webhookQuotedImageUrl || null) : null;
    const webhookMimetype = imageMimetype || String((storedMessage as any)?.data?.mimetype || "") || findMimetype(body) || (effectiveImageMessage ? "image/jpeg" : null);
    const webhookMediaKey = findStringByKeys(body, ["mediaKey", "media_key"]);
    const webhookDirectPath = findStringByKeys(body, ["directPath", "direct_path"]);
    const webhookSourceMessageId = String(
      (body as any).message_id || (body as any).messageId || (rawKey as any)?.id || (rawPayload as any)?.messageId || ""
    ).trim() || null;
    const webhookRemoteJid = String(
      (body as any).target_jid || (body as any).remoteJid || (rawKey as any)?.remoteJid || (rawPayload as any)?.remoteJid || ""
    ).trim() || null;

    await deliverUserWebhook({
      admin,
      session,
      webhookUrl: body.forward_webhook_url as string | undefined,
      eventType: "messages.received",
      payload: {
        session_id: sessionId,
        message_id: messageId,
        source_message_id: webhookSourceMessageId,
        whatsapp_message_id: webhookSourceMessageId,
        target_jid: webhookRemoteJid,
        remote_jid: webhookRemoteJid,
        from: fromNumber,
        from_number: fromNumber,
        message: messageText,
        message_text: messageText,
        message_type: effectiveImageMessage ? "image" : messageType,
        media_url: webhookMediaUrl || null,
        mediaUrl: webhookMediaUrl || null,
        image_url: webhookImageUrl || null,
        imageUrl: webhookImageUrl || null,
        ...(webhookImageMessage ? { imageMessage: webhookImageMessage } : {}),
        mimetype: webhookMimetype,
        media_type: effectiveImageMessage ? "image" : messageType,
        mediaKey: webhookMediaKey,
        media_key: webhookMediaKey,
        directPath: webhookDirectPath,
        direct_path: webhookDirectPath,
        quoted_message_id: quotedMessageId,
        quoted_image_url: webhookQuotedImageUrl,
        quotedImageUrl: webhookQuotedImageUrl,
        quoted_image_caption: quotedOutgoingImage?.caption || null,
        quoted_message_log_id: quotedOutgoingImage?.message_log_id || null,
        quoted_image_matched: Boolean(quotedOutgoingImage?.matched_by_quote || quotedGatewayImageUrl || bodyQuotedImageUrl),
        quoted_image_source: quotedOutgoingImage?.source || (quotedGatewayImageUrl ? "gateway_quoted_media" : (bodyQuotedImageUrl ? "payload_quoted_image_url" : null)),
        caption: imageCaption || (storedMessage as any)?.data?.caption || null,
        image_caption: imageCaption || (storedMessage as any)?.data?.image_caption || null,
        is_group: isGroup,
        received_at: new Date().toISOString(),
        raw_payload: body.raw_payload ?? body,
      },
    });

    if (!sessionConnected) {
      return jsonResp({ ok: true, skipped: "session_not_connected", message_id: messageId });
    }

    // ===== Image + text coalescing =====
    // Customers often send a product photo and then immediately a short text
    // ("price koto", "ata ki ase") within a couple of seconds. Without this
    // block the agent replies twice — once for the image, once for the text.
    // Strategy:
    //   1) If THIS message is image-only, wait briefly for a follow-up text
    //      from the same customer; if one arrives, absorb its text into this
    //      reply and mark the text row as skipped.
    //   2) If THIS message is text-only, look back for a very recent image
    //      from the same customer; if found, treat it as part of this turn
    //      (run vision match), and mark the image row as skipped.
    if (aiEnabled && (isImageMessage || messageText)) {
      try {
        const coalesceWaitMs = 6000;
        const coalesceLookbackMs = 15000;

        if (isImageMessage && !messageText && messageId) {
          await new Promise((r) => setTimeout(r, coalesceWaitMs));
          const sinceIso = new Date(Date.now() - coalesceWaitMs - 2000).toISOString();
          const { data: newerText } = await admin
            .from("incoming_messages")
            .select("id, message_text, received_at, delivery_status, reply_sent")
            .eq("session_id", sessionId)
            .eq("from_number", fromNumber)
            .gte("received_at", sinceIso)
            .not("message_text", "is", null)
            .neq("id", messageId)
            .order("received_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          const newerStr = (newerText as any)?.message_text;
          if (newerText && typeof newerStr === "string" && newerStr.trim()) {
            messageText = newerStr.trim();
            await admin.from("incoming_messages").update({
              delivery_status: "skipped",
              reply_error: "coalesced_into_image_reply",
              processed_at: new Date().toISOString(),
            }).eq("id", (newerText as any).id);
            console.log("[ai-reply] coalesced follow-up text into image message", { absorbed: (newerText as any).id, text: messageText });
          }
        } else if (!isImageMessage && messageText && !imageUrl && messageId) {
          const sinceIso = new Date(Date.now() - coalesceLookbackMs).toISOString();
          const { data: recentImg } = await admin
            .from("incoming_messages")
            .select("id, image_url, media_url, image_caption, caption, mimetype, received_at, delivery_status, reply_sent")
            .eq("session_id", sessionId)
            .eq("from_number", fromNumber)
            .gte("received_at", sinceIso)
            .neq("id", messageId)
            .or("image_url.not.is.null,media_url.not.is.null")
            .order("received_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          const recImgUrl = (recentImg as any)?.image_url || (recentImg as any)?.media_url;
          // Only coalesce if image reply hasn't already been sent to the customer
          const alreadySent = (recentImg as any)?.reply_sent === true || (recentImg as any)?.delivery_status === "sent";
          if (recImgUrl && !alreadySent) {
            imageUrl = String(recImgUrl);
            imageCaption = imageCaption || (recentImg as any).image_caption || (recentImg as any).caption || null;
            isImageMessage = true;
            await admin.from("incoming_messages").update({
              delivery_status: "skipped",
              reply_error: "coalesced_into_followup_text",
              processed_at: new Date().toISOString(),
            }).eq("id", (recentImg as any).id);
            console.log("[ai-reply] coalesced recent image into follow-up text", { absorbed: (recentImg as any).id, imageUrl });
          }
        }
      } catch (e) {
        console.log("[ai-reply] coalescing error:", (e as Error)?.message);
      }
    }

    // ===== Message batching: collect rapid-fire customer messages, reply once =====
    // Safe default: batching is OFF unless the user explicitly enables it.
    // Even when ON, if wait_seconds is 0 we skip batching entirely.
    if (aiEnabled && batchingEnabled && batchWaitSeconds > 0 && !isImageMessage && !matchedProduct && messageText) {
      try {
        const nowMs = Date.now();
        const nowIso = new Date(nowMs).toISOString();
        // Window for "still actively batching"
        const cutoffIso = new Date(nowMs - batchWaitSeconds * 1000).toISOString();

        // Step 1 — absorb ANY older unprocessed batches for this customer (stale ones
        // whose previous edge invocation died before sending). We merge them into the
        // current message so nothing gets lost.
        const { data: stalePrev } = await admin
          .from("message_batches")
          .select("id, messages")
          .eq("session_id", sessionId)
          .eq("from_number", fromNumber)
          .eq("processed", false)
          .lt("last_message_at", cutoffIso);
        let absorbed: string[] = [];
        if (Array.isArray(stalePrev) && stalePrev.length > 0) {
          for (const row of stalePrev) {
            const arr = Array.isArray((row as any).messages) ? (row as any).messages as string[] : [];
            absorbed.push(...arr);
          }
          await admin.from("message_batches")
            .update({ processed: true })
            .in("id", stalePrev.map((r: any) => r.id));
          console.log("[ai-reply] absorbed", absorbed.length, "stale batched messages for", fromNumber);
        }

        // Step 2 — find an active (within wait window) batch and append to it,
        // or create a new one.
        const { data: existing } = await admin
          .from("message_batches")
          .select("id, messages, last_message_at")
          .eq("session_id", sessionId)
          .eq("from_number", fromNumber)
          .eq("processed", false)
          .gte("last_message_at", cutoffIso)
          .order("last_message_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        let batchId: string;
        let batchMessages: string[];
        if (existing) {
          batchId = (existing as any).id;
          const prev = Array.isArray((existing as any).messages) ? (existing as any).messages as string[] : [];
          batchMessages = [...prev, ...absorbed, messageText];
          await admin.from("message_batches").update({
            messages: batchMessages,
            last_message_at: nowIso,
          }).eq("id", batchId);
        } else {
          batchMessages = [...absorbed, messageText];
          const { data: created } = await admin.from("message_batches").insert({
            session_id: sessionId, user_id: userId, from_number: fromNumber,
            messages: batchMessages, first_message_at: nowIso, last_message_at: nowIso,
          }).select("id").single();
          batchId = (created as any)?.id;
        }

        const myStamp = nowIso;
        // Wait the configured window. Edge function timeout is generous enough for
        // typical 5–60s waits; absorption above guarantees no message is lost even
        // if this invocation dies.
        await new Promise((r) => setTimeout(r, batchWaitSeconds * 1000));

        const { data: latest } = await admin
          .from("message_batches")
          .select("id, messages, last_message_at, processed")
          .eq("id", batchId)
          .maybeSingle();

        if (!latest || (latest as any).processed) {
          if (messageId) {
            await admin.from("incoming_messages").update({
              delivery_status: "skipped",
              reply_error: "Batched into newer message",
              processed_at: new Date().toISOString(),
            }).eq("id", messageId);
          }
          return jsonResp({ ok: true, skipped: "batched_already_processed", message_id: messageId });
        }
        if (((latest as any).last_message_at || "") > myStamp) {
          if (messageId) {
            await admin.from("incoming_messages").update({
              delivery_status: "skipped",
              reply_error: "Superseded by newer message in batch",
              processed_at: new Date().toISOString(),
            }).eq("id", messageId);
          }
          return jsonResp({ ok: true, skipped: "superseded_in_batch", message_id: messageId });
        }

        // Atomic claim
        const { data: claimed } = await admin
          .from("message_batches")
          .update({ processed: true })
          .eq("id", batchId)
          .eq("processed", false)
          .select("id, messages")
          .maybeSingle();

        if (!claimed) {
          return jsonResp({ ok: true, skipped: "batch_already_claimed", message_id: messageId });
        }
        const arr: string[] = Array.isArray((claimed as any).messages) ? (claimed as any).messages : batchMessages;
        if (arr.length > 1) {
          messageText = arr.join("\n");
          console.log("[ai-reply] batched", arr.length, "messages →", fromNumber);
        }
        // Clear "Pending" status from earlier incoming_messages that were absorbed
        // into this batch. The current messageId will get its own final status after
        // the AI reply is sent below.
        try {
          const clearQ = admin
            .from("incoming_messages")
            .update({
              delivery_status: "skipped",
              reply_error: "Batched into combined reply",
              processed_at: new Date().toISOString(),
            })
            .eq("session_id", sessionId)
            .eq("from_number", fromNumber)
            .eq("reply_sent", false)
            .in("delivery_status", ["pending", "processing"]);
          if (messageId) clearQ.neq("id", messageId);
          await clearQ;
        } catch (e) {
          console.log("[ai-reply] clear pending error:", (e as Error)?.message);
        }
      } catch (e) {
        console.log("[ai-reply] batching error:", (e as Error)?.message);
      }
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
    if ((aiEnabled || autoReplyEnabled) && !matchedProduct && (!isImageMessage || !!messageText)) {
      const { data: fixed } = await admin
        .from("fixed_qa")
        .select("keyword, reply, match_type")
        .eq("user_id", userId)
        .eq("is_active", true);
      const fixedHit = (fixed || []).find((f: any) => {
        const raw = (f.keyword || "").toLowerCase();
        // Split on commas → multiple keywords per row. Any one match wins.
        const keywords = raw.split(",").map((k: string) => k.trim()).filter(Boolean);
        if (keywords.length === 0) return false;
        return keywords.some((k: string) =>
          f.match_type === "contains" ? lowerMsg.includes(k) : lowerMsg === k
        );
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

    if (autoReplyEnabled && !matchedProduct && (!isImageMessage || !!messageText)) {
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
            message_type: ruleImageUrl ? "image" : "text",
            payload: { text: reply, auto_reply: true, source: "keyword_rule", rule_id: ruleHit.id, image_url: ruleImageUrl || null, gateway_response: sendResult.data },
            status: "sent",
            image_url: ruleImageUrl || null,
            image_caption: ruleImageUrl ? reply : null,
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

    // ---- Quota check (monthly reply limit per plan) ----
    try {
      const { data: qStatus } = await admin.rpc("get_user_quota_status", { _user_id: userId });
      const qRow = Array.isArray(qStatus) ? qStatus[0] : qStatus;
      if (qRow && Number(qRow.reply_quota || 0) > 0 && Number(qRow.remaining || 0) <= 0) {
        if (messageId) {
          await admin.from("incoming_messages").update({
            reply_error: `Monthly reply quota exhausted (${qRow.replies_used}/${qRow.reply_quota})`,
            delivery_status: "failed",
            processed_at: new Date().toISOString(),
          }).eq("id", messageId);
        }
        return jsonResp({ error: "quota_exhausted", used: qRow.replies_used, quota: qRow.reply_quota }, 402);
      }
    } catch (qErr) {
      console.log("[ai-reply] quota check failed (continuing):", (qErr as Error)?.message);
    }

    // Load API key — try user's own first, fallback to global key set by headadmin
    let keyRow: { encrypted_key: string; platform: string; model: string; scope?: string } | null = null;
    try {
      const { data: resolved } = await admin.rpc("resolve_ai_api_key", { _user_id: userId, _platform: null });
      const r = Array.isArray(resolved) ? resolved[0] : resolved;
      if (r?.encrypted_key) keyRow = r as any;
    } catch (rErr) {
      console.log("[ai-reply] resolve_ai_api_key rpc failed:", (rErr as Error)?.message);
    }
    if (!keyRow) {
      // legacy fallback
      const { data: legacy } = await admin
        .from("ai_api_keys")
        .select("encrypted_key, platform, model")
        .eq("user_id", userId)
        .eq("is_active", true)
        .maybeSingle();
      if (legacy) keyRow = legacy as any;
    }
    if (!keyRow) {
      if (messageId) {
        await admin.from("incoming_messages").update({
          reply_error: "No active AI API key (user or global)", delivery_status: "failed",
          processed_at: new Date().toISOString(),
        }).eq("id", messageId);
      }
      return jsonResp({ error: "No active AI API key (user or global)" }, 400);
    }
    console.log("[ai-reply] using API key scope:", keyRow.scope || "user");

    const apiKey = await decryptKey(keyRow.encrypted_key);

    // Resolve max_tokens: per-user override → plan default → 1000
    let resolvedMaxTokens = 0;
    try {
      const { data: mt } = await admin.rpc("get_user_max_tokens", { _user_id: userId });
      resolvedMaxTokens = Number(mt) || 0;
    } catch { /* ignore */ }

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

    // Load product catalog so AI can reference real products in replies.
    const { data: catalogRows } = await admin
      .from("products")
      .select("id, name, price, description, category, stock, image_url, match_image_urls, real_image_urls")
      .eq("user_id", userId)
      .eq("is_active", true)
      .limit(100);

    const productCatalog = (catalogRows || []).length
      ? `\n\nPRODUCT CATALOG (use these exact names/prices when replying):\n${(catalogRows || [])
          .map((p: any) => `- ${p.name} | ৳${p.price}${p.stock > 0 ? ` | stock: ${p.stock}` : " | out of stock"}${p.category ? ` | ${p.category}` : ""}${p.description ? ` — ${String(p.description).slice(0, 120)}` : ""}`)
          .join("\n")}`
      : "";

    const productInstr = (catalogRows || []).length
      ? `\n\nআপনি যখন কোনো product সম্পর্কে reply দেবেন, তখন product এর সব details (নাম, দাম, বিবরণ) text এ দিন। একসাথে maximum 3টা product suggest করুন। When you mention a product, use its EXACT name from the catalog.\n\nRules for responding:\n1. IMAGE SENDING: You CAN send product images. If the customer asks to see a photo (words like 'দেখাও', 'ছবি', 'picture', 'photo', 'pic', 'den', 'dao', 'deo', 'show'), reply with ONLY a short confirmation (e.g. "এই নিন ছবি 📷" or "Here you go 📷") and mention the product name — the system will AUTOMATICALLY attach the product image to your reply. NEVER say you cannot send images, NEVER say "ছবি পাঠানোর ব্যবস্থা নেই" — that is FALSE.\n2. For delivery/price/stock/general questions → text reply only.\n3. Answer ALL the customer's questions in ONE comprehensive reply (customer may send several short messages — treat as one).\n4. Be concise but complete.`
      : "";

    const baseSystem = (biz?.system_prompt && biz.system_prompt.trim().length > 0)
      ? biz.system_prompt
      : `You are a helpful WhatsApp assistant for ${biz?.name || "this business"}. Reply in the customer's language. Be friendly, concise, human-like.`;
    const systemPrompt = `${baseSystem}${qaContext}${productCatalog}${productInstr}`;

    // If we have an image AND text in this turn (either originally or after
    // coalescing a recent image+text pair), run vision+match now so the AI
    // text flow can answer with the matched product details in a single reply.
    if (isImageMessage && imageUrl && messageText && !matchedProduct && keyRow?.platform === "openai" && apiKey) {
      try {
        const desc = await describeImageWithOpenAI(apiKey, imageUrl);
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
          .select("id, name, price, description, category, stock, image_url, ai_tags, match_image_urls, real_image_urls")
          .eq("user_id", userId)
          .eq("is_active", true)
          .limit(500);

        // ── Primary: direct vision comparison against each product's match image ──
        try {
          const vMatch = await matchProductByVision(apiKey, imageUrl, (productRows || []) as any);
          if (vMatch?.product) {
            matchedProduct = vMatch.product;
            console.log("[ai-reply] image+text vision-match", { name: vMatch.product?.name, conf: vMatch.confidence });
          }
        } catch (_e) { /* fall through to text similarity */ }

        // ── Fallback: keyword/text similarity using vision description ──
        if (!matchedProduct) {
          let best: { score: number; row: any } | null = null;
          const haystackQuery = [desc, structured.product_name, imageCaption, messageText].filter(Boolean).join(" ");
          for (const p of productRows || []) {
            const haystack = [p.name, p.description, p.category, p.ai_tags].filter(Boolean).join(" ");
            const score = textSimilarity(haystackQuery, haystack);
            if (!best || score > best.score) best = { score, row: p };
          }
          if (best && best.score >= 0.25) {
            matchedProduct = best.row;
            console.log("[ai-reply] image+text text-match", { name: best.row?.name, score: best.score });
          }
        }
      } catch (e) {
        console.log("[ai-reply] image+text pre-match failed:", (e as Error)?.message);
      }
    }

    // If we have a matched product (image match) and/or text from the customer,
    // route into the regular text-AI flow with extra context. Vision-only describe
    // path only runs when the customer sent ONLY an image (no text).
    const useTextFlow = !!messageText || !!matchedProduct;
    const matchedContext = matchedProduct
      ? `\n\n🆕 NEW IMAGE MATCH (HIGHEST PRIORITY — OVERRIDES HISTORY):\nThe customer JUST sent a NEW photo in this current message that matches this product from the catalog:\n- Name: "${matchedProduct.name}"${matchedProduct.price ? `\n- Price: ${matchedProduct.price}` : ""}${matchedProduct.description ? `\n- Description: ${String(matchedProduct.description).slice(0, 300)}` : ""}\n\nCRITICAL RULES:\n1. The customer is now asking about THIS product — NOT any previous product discussed earlier in the chat history.\n2. IGNORE any older product context from history. The newly-matched product above is the ONLY product the customer cares about right now.\n3. Reply with details (name, price, description) of THIS new product. If the customer's text caption asks "ata ki [color] ase" / "price koto" / "available?" — answer about THIS product.\n4. Do NOT say "we don't have it" referring to a previous product. The new image was successfully matched, so the product IS in catalog — share its actual details.`
      : "";
    const finalSystemPrompt = `${systemPrompt}${matchedContext}`;
    const finalUserMessage = matchedProduct
      ? `Customer sent a product photo that matched "${matchedProduct.name}".${messageText ? `\nCustomer caption/text: ${messageText}` : "\nCustomer caption/text: (none)"}`
      : messageText;

    let reply = "";
    let aiTokensUsed = 0;
    let aiPromptTokens = 0;
    let aiCompletionTokens = 0;
    let aiModelUsed = "";

    // ---- Image-message branch: vision describe + product match (image-only) ----
    // Only fire the "image received but couldn't open" fallback when there is REAL
    // image evidence on THIS incoming event (mimetype image/* OR a media/image URL
    // in the body). Without this guard, stray payloads that merely embed a quoted
    // image context (or duplicate gateway notifications) get classified as image
    // messages with no imageUrl and trigger a spurious fallback reply right after
    // the normal text answer — see customer report on 2026-06-08.
    const currentMime = String(findStringByKeys(body, ["mimetype", "mime_type", "contentType", "content_type"]) || "").toLowerCase();
    const hasRealIncomingImage = !!bodyMediaUrl || /^image\//.test(currentMime);
    if (isImageMessage && !imageUrl && !useTextFlow && !hasRealIncomingImage) {
      console.log("[ai-reply] skipping image-fallback: no real image evidence on this event", { isImageMessage, hasRealIncomingImage, messageType });
      if (messageId) {
        await admin.from("incoming_messages").update({
          reply_error: "skipped: image flag set but no real image on event",
          processed_at: new Date().toISOString(),
          delivery_status: "skipped",
        }).eq("id", messageId);
      }
      return jsonResp({ ok: true, skipped: "no_real_image_evidence" });
    }
    if (isImageMessage && !imageUrl && !useTextFlow) {
      reply = "ছবি receive করেছি ✅ কিন্তু এই মুহূর্তে ছবিটা analyze করা সম্ভব হচ্ছে না। দয়া করে product টির নাম / রঙ / size text এ লিখে পাঠান, আমি match করে details দিচ্ছি।\n\nGot your image but couldn't open it right now — please describe the product in text (name / color / size).";
    } else if (isImageMessage && imageUrl && !useTextFlow) {
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
            .select("id, name, price, description, category, stock, image_url, ai_tags, match_image_urls, real_image_urls")
            .eq("user_id", userId)
            .eq("is_active", true)
            .limit(500);

          // ── Primary: direct vision comparison against each product's match image ──
          let matched: any = null;
          let matchedConf = 0;
          try {
            const vMatch = await matchProductByVision(apiKey, imageUrl, (productRows || []) as any);
            if (vMatch?.product) {
              matched = vMatch.product;
              matchedConf = vMatch.confidence;
            }
          } catch (_e) { /* fall through */ }

          // ── Fallback: keyword similarity ──
          let best: { score: number; row: any } | null = null;
          if (!matched) {
            const haystackQuery = [desc, structured.product_name, imageCaption].filter(Boolean).join(" ");
            for (const p of productRows || []) {
              const haystack = [p.name, p.description, p.category, p.ai_tags].filter(Boolean).join(" ");
              const score = textSimilarity(haystackQuery, haystack);
              if (!best || score > best.score) best = { score, row: p };
            }
            if (best && best.score >= 0.25) {
              matched = best.row;
              matchedConf = Math.round(best.score * 100);
            }
          }

          if (matched) {
            const p = matched;
            reply = `আপনি যে ছবিটি দিয়েছেন তার ডিটেইলস নিচে দেওয়া হলো:\n\nProduct Name: ${p.name}\nPrice: ${p.price}${p.description ? `\nDescription: ${p.description}` : ""}`;
            // Attach a real image of the matched product (preferred) so customer
            // immediately sees what we matched.
            matchedProduct = p;
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
        const memLimitRaw = Number((biz as any)?.memory_message_limit);
        const memLimit = Number.isFinite(memLimitRaw) ? Math.max(0, Math.min(50, memLimitRaw)) : 10;
        const conversationHistory = memLimit > 0
          ? await fetchConversationHistory(admin, sessionId, fromNumber, messageId || null, memLimit)
          : [];
        console.log("[ai-reply] conversation history loaded", { count: conversationHistory.length, limit: memLimit, customer: fromNumber });

        // Recently matched product context removed (product image match feature removed).
        const recentMatchedProductBlock = "";

        const memoryInstruction = `\n\nCONVERSATION MEMORY RULES:\n- The previous turns of this WhatsApp chat are provided as message history above.\n- Use that history to remember which products were already shown / discussed with this customer.\n- If the customer says things like "order korte chai" / "ata nibo" / "dam koto" / "price koto" / "ar ekta dao" without naming a product, refer to the most recently discussed product (see RECENTLY MATCHED PRODUCT block if present, otherwise the last product mentioned in history).\n- NEVER ask the customer to repeat info (name, address, product) they already provided in the history.\n- NEVER reply "I don't have info about this product" / "এই পণ্যের তথ্য নেই" if a RECENTLY MATCHED PRODUCT block is provided above — use those details directly.\n- Maintain natural conversation continuity; do not greet again if you already greeted in this chat.`;

        const resolvedModel = keyRow.model && keyRow.model !== "default" ? keyRow.model : (
          keyRow.platform === "openai" ? "gpt-4o-mini" :
          keyRow.platform === "gemini" ? "gemini-1.5-flash" :
          "deepseek-chat"
        );
        aiModelUsed = resolvedModel;
        const aiResult = await callAI({
          platform: keyRow.platform,
          model: resolvedModel,
          apiKey,
          systemPrompt: finalSystemPrompt + recentMatchedProductBlock + memoryInstruction,
          userMessage: finalUserMessage,
          history: conversationHistory,
          maxTokens: resolvedMaxTokens || Number((biz as any)?.max_tokens) || 2000,
          temperature: typeof (biz as any)?.temperature === "number" ? Number((biz as any).temperature) : 0.7,
        });
        reply = aiResult.text;
        aiTokensUsed = aiResult.tokens || 0;
        aiPromptTokens = aiResult.promptTokens || 0;
        aiCompletionTokens = aiResult.completionTokens || 0;
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

    // ---- Attach product image if customer asked for a photo ----
    // The system prompt promises that asking for "ছবি/photo/pic/দেখাও/দাও/show"
    // will auto-attach the matching product's image. Implement that here:
    //   1. detect image-request intent in the customer's text
    //   2. pick the target product from: matchedProduct → product name mentioned
    //      in the AI reply → product name in customer text → most-recently-
    //      mentioned product from chat history
    //   3. if that product has an image_url, send as image with the AI reply as caption
    let outgoingImageUrl: string | null = null;
    let outgoingImageProductId: string | null = null;
    let extraRealImages: string[] = [];
    try {
      const askText = `${messageText || ""} ${imageCaption || ""}`.toLowerCase();
      const imageWanted = /(\bছবি\b|\bছবিটা\b|\bছবিটি\b|\bছবিগুলো\b|\bছবিগুল\b|\bছবি\s*দাও\b|\bছবি\s*দেন\b|\bphoto\b|\bpic\b|\bpicture\b|\bimage\b|\bsnap\b|\bdekha[ow]\b|\bdekhao\b|\bdekhaben\b|\bdao\b|\bden\b|\bdeo\b|\bdeben\b|\bshow\b|\bsend\b.*\b(photo|pic|picture|image)\b|\b(photo|pic|picture|image)\b.*\b(send|pathao|patha[ow]|den|dao)\b)/i.test(askText);

      if (imageWanted && (catalogRows || []).length) {
        const norm = (s: string) => String(s || "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
        const replyNorm = norm(reply);
        const askNorm = norm(askText);

        let target: any = matchedProduct || null;
        let matchedByName = !!target;
        if (!target) {
          let best: { row: any; len: number } | null = null;
          for (const p of catalogRows || []) {
            const n = norm(p.name);
            if (!n) continue;
            if (replyNorm.includes(n) && (!best || n.length > best.len)) best = { row: p, len: n.length };
          }
          if (!best) {
            for (const p of catalogRows || []) {
              const n = norm(p.name);
              if (!n) continue;
              if (askNorm.includes(n) && (!best || n.length > best.len)) best = { row: p, len: n.length };
            }
          }
          if (best) { target = best.row; matchedByName = true; }
        }

        if (!target) {
          try {
            const { data: recent } = await admin
              .from("incoming_messages")
              .select("message_text, reply_text")
              .eq("session_id", sessionId)
              .eq("from_number", fromNumber)
              .order("received_at", { ascending: false })
              .limit(15);
            const blob = norm(((recent || []) as any[]).map((r) => `${r.message_text || ""} ${r.reply_text || ""}`).join(" \n "));
            let best: { row: any; len: number } | null = null;
            for (const p of catalogRows || []) {
              const n = norm(p.name);
              if (!n) continue;
              if (blob.includes(n) && (!best || n.length > best.len)) best = { row: p, len: n.length };
            }
            if (best) { target = best.row; matchedByName = true; }
          } catch { /* ignore */ }
        }

        // Prefer real_image_urls (customer-facing photos) when product was
        // identified by NAME mention. Fallback to primary image_url otherwise.
        const realImgs: string[] = Array.isArray(target?.real_image_urls)
          ? (target.real_image_urls as any[]).map((u) => String(u || "").trim()).filter(Boolean)
          : [];
        if (target && matchedByName && realImgs.length > 0) {
          outgoingImageUrl = realImgs[0];
          extraRealImages = realImgs.slice(1, 2);
          outgoingImageProductId = target.id || null;
          console.log("[ai-reply] attaching REAL product images", { product: target.name, count: realImgs.length });
        } else if (target?.image_url) {
          outgoingImageUrl = String(target.image_url);
          outgoingImageProductId = target.id || null;
          console.log("[ai-reply] attaching product image (fallback)", { product: target.name });
        } else if (imageWanted) {
          console.log("[ai-reply] customer asked for image but no product image found");
        }
      }
    } catch (e) {
      console.log("[ai-reply] product-image attach failed:", (e as Error)?.message);
    }

    // If we're attaching a product image but the AI reply text is a generic
    // "sorry, no info" / contact-us style fallback, override with a friendly
    // caption so customers don't get a contradictory message + photo.
    if (outgoingImageUrl) {
      const replyStr = String(reply || "");
      const lower = replyStr.toLowerCase();
      const banglaNegatives = [
        "দুঃখিত", "ছবি নেই", "ছবিটি নেই", "ছবিটা নেই", "ছবিগুলো নেই",
        "আমাদের কাছে নেই", "আমার কাছে নেই", "তথ্য নেই", "বিস্তারিত নেই",
        "যোগাযোগ", "সাহায্য করতে পারব",
      ];
      const englishNegativeRe = /(sorry|don'?t have|do not have|no info|no details|contact us|reach out|help you out|unfortunately|unavailable)/i;
      const hasBanglaNegative = banglaNegatives.some((kw) => replyStr.includes(kw));
      const isNegative = englishNegativeRe.test(lower) || hasBanglaNegative || replyStr.trim().length < 5;
      if (isNegative) {
        const sentProduct = (catalogRows || []).find((p: any) => p.id === outgoingImageProductId);
        const pname = sentProduct?.name || "";
        const priceLine = sentProduct?.price ? `\nMRP: ${sentProduct.price}` : "";
        const descLine = sentProduct?.description ? `\n${String(sentProduct.description).slice(0, 200)}` : "";
        reply = `আপনি যে ছবিটি চেয়েছেন তার বিস্তারিত নিচে দেওয়া হলো:\n${pname ? `Name: ${pname}` : ""}${priceLine}${descLine}`.trim();
        console.log("[ai-reply] caption override applied (was negative)");
      }
    }


    // Send the reply back via WhatsApp gateway
    const sendResult = await sendViaGateway({
      gateway: GATEWAY,
      sessionId,
      apiToken: session.api_token,
      to: fromNumber,
      message: reply,
      imageUrl: outgoingImageUrl || undefined,
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
        message_type: outgoingImageUrl ? "image" : "text",
        payload: { text: reply, auto_reply: true, source: "ai", image_url: outgoingImageUrl, product_id: outgoingImageProductId },
        status: "sent",
        image_url: outgoingImageUrl || null,
        image_caption: outgoingImageUrl ? reply : null,
      });

      // Send additional real images (2nd photo) as a follow-up, no caption
      for (const extraUrl of extraRealImages) {
        try {
          const extraSend = await sendViaGateway({
            gateway: GATEWAY,
            sessionId,
            apiToken: session.api_token,
            to: fromNumber,
            message: "",
            imageUrl: extraUrl,
            showTyping: false,
            accountProtection,
          });
          if (extraSend.ok) {
            await admin.from("message_logs").insert({
              user_id: userId, session_id: sessionId, to_number: extraSend.to,
              message_type: "image",
              payload: { auto_reply: true, source: "ai", image_url: extraUrl, product_id: outgoingImageProductId, follow_up: true },
              status: "sent",
              image_url: extraUrl,
              image_caption: null,
            });
          } else {
            console.log("[ai-reply] extra real image send failed:", extraSend.error);
          }
        } catch (e) {
          console.log("[ai-reply] extra real image error:", (e as Error)?.message);
        }
      }

      // Increment monthly reply quota counter (auto-rolls period if expired)
      try {
        const { data: quotaResult, error: quotaError } = await admin.rpc("consume_reply_quota", { _user_id: userId });
        if (quotaError) {
          console.log("[ai-reply] consume_reply_quota failed:", quotaError.message);
        } else {
          console.log("[ai-reply] consume_reply_quota ok:", JSON.stringify(quotaResult));
        }

        if (aiTokensUsed > 0) {
          const { error: tokenError } = await admin.rpc("consume_tokens", { _user_id: userId, _tokens: aiTokensUsed });
          if (tokenError) console.log("[ai-reply] consume_tokens failed:", tokenError.message);
        }

        // Per-reply usage + cost log
        try {
          if ((aiPromptTokens + aiCompletionTokens) > 0 && aiModelUsed) {
            const { data: priceRow } = await admin
              .from("ai_model_pricing")
              .select("input_price_per_1m_usd, output_price_per_1m_usd")
              .eq("platform", keyRow.platform)
              .eq("model", aiModelUsed)
              .maybeSingle();
            const inP = Number(priceRow?.input_price_per_1m_usd) || 0;
            const outP = Number(priceRow?.output_price_per_1m_usd) || 0;
            const inputCost = (aiPromptTokens / 1_000_000) * inP;
            const outputCost = (aiCompletionTokens / 1_000_000) * outP;
            await admin.from("ai_usage_logs").insert({
              user_id: userId,
              session_id: sessionId,
              incoming_message_id: messageId,
              from_number: fromNumber,
              platform: keyRow.platform,
              model: aiModelUsed,
              key_scope: keyRow.scope || "user",
              prompt_tokens: aiPromptTokens,
              completion_tokens: aiCompletionTokens,
              total_tokens: aiPromptTokens + aiCompletionTokens,
              input_price_per_1m_usd: inP,
              output_price_per_1m_usd: outP,
              input_cost_usd: inputCost,
              output_cost_usd: outputCost,
              total_cost_usd: inputCost + outputCost,
            });
          }
        } catch (costErr) {
          console.log("[ai-reply] usage log failed:", (costErr as Error)?.message);
        }
      } catch (qErr) {
        console.log("[ai-reply] quota tracking failed:", (qErr as Error)?.message);
      }
    }

    return jsonResp({ ok: true, reply, sent: sendOk, send_error: sendErr, sent_to: sendResult.to, source: "ai", message_id: messageId });
  } catch (e: any) {
    console.error("ai-reply error:", e);
    return jsonResp({ error: e?.message || "Internal error" }, 500);
  }
});
