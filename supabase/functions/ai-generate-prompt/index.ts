// Generates an enhanced professional system prompt for a business.
// Primary: Lovable AI Gateway (global LOVABLE_API_KEY).
// Fallback (on 402/429/5xx or missing global key): the user's own saved AI API key
// (OpenAI / Gemini / DeepSeek) resolved via `resolve_ai_api_key` RPC.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
  const ct = b64decode(ctB64) as BufferSource;
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  return dec.decode(pt);
}

const SYSTEM_MSG = "You output only the requested prompt text. No preamble.";

function buildUserPrompt(business: any, products: any[], baseInstructions: string) {
  const productList = products.length
    ? products.map((p: any) => {
        const parts = [p.name];
        if (p.price) parts.push(`${p.price} ${p.currency || "tk"}`);
        if (p.stock !== null && p.stock !== undefined && p.stock !== "") parts.push(`stock: ${p.stock}`);
        if (p.category) parts.push(p.category);
        return `- ${parts.join(" — ")}`;
      }).join("\n")
    : "(no products)";

  const businessSummary = `Name: ${business.name || "(unnamed)"}
Type: ${business.business_type || "N/A"}
Description: ${business.description || "N/A"}
Location: ${business.location || "N/A"}
Working Hours: ${business.working_hours || "N/A"}
Contact: ${business.contact || "N/A"}
Website: ${business.website || "N/A"}

PRODUCTS:
${productList}`;

  return `You are an expert prompt engineer. Build a POLISHED, PROFESSIONAL WhatsApp customer-support system prompt for the business below.

RULES you MUST follow when writing the prompt:
1. Start with the "CORE INSTRUCTIONS" block I provide verbatim (do not rewrite it, do not shorten it).
2. Then add a clean "BUSINESS PROFILE" section using the real data below.
3. Then add a "PRODUCT CATALOG" section (from the list I give — never invent items).
4. Then generate a "COMMON QUESTIONS & ANSWERS" section with 12–18 realistic short Q&A pairs a real customer would ask THIS specific business (price, availability, delivery, location, hours, contact, how to order, return/exchange, payment method, warranty, discount, size/color options, bulk order, image request, greeting, off-topic redirect, etc.). Answers must be short (1–2 lines), natural, human, and reference the actual business data where relevant.
5. Language for the Q&A section: write each answer template in BOTH pure Bangla script AND English (label them "BN:" and "EN:"). NEVER use Banglish (Bangla words in English letters).
6. No emojis anywhere. No markdown asterisks. Plain clean text.
7. End with a short "FALLBACK" block in Bangla + English for unknown questions.
8. Keep the whole prompt under ~1800 tokens. Be dense, no filler.

=== CORE INSTRUCTIONS (include verbatim at the top) ===
${baseInstructions}

=== BUSINESS DATA ===
${businessSummary}

Now output ONLY the final system prompt text. No preamble, no explanation, no code fences.`;
}

async function callLovableGateway(userPrompt: string, apiKey: string) {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      max_tokens: 2000,
      messages: [
        { role: "system", content: SYSTEM_MSG },
        { role: "user", content: userPrompt },
      ],
    }),
  });
  const text = await res.text();
  let json: any = null; try { json = JSON.parse(text); } catch {}
  return { ok: res.ok, status: res.status, text, json };
}

async function callOpenAI(userPrompt: string, apiKey: string, model: string) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: model || "gpt-4o-mini",
      max_tokens: 2000,
      messages: [
        { role: "system", content: SYSTEM_MSG },
        { role: "user", content: userPrompt },
      ],
    }),
  });
  const text = await res.text();
  let json: any = null; try { json = JSON.parse(text); } catch {}
  return { ok: res.ok, status: res.status, text, json };
}

async function callGemini(userPrompt: string, apiKey: string, model: string) {
  const m = model || "gemini-1.5-flash";
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: `${SYSTEM_MSG}\n\n${userPrompt}` }] }],
        generationConfig: { maxOutputTokens: 2000, temperature: 0.7 },
      }),
    },
  );
  const text = await res.text();
  let json: any = null; try { json = JSON.parse(text); } catch {}
  return { ok: res.ok, status: res.status, text, json };
}

async function callDeepSeek(userPrompt: string, apiKey: string, model: string) {
  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: model || "deepseek-chat",
      max_tokens: 2000,
      messages: [
        { role: "system", content: SYSTEM_MSG },
        { role: "user", content: userPrompt },
      ],
    }),
  });
  const text = await res.text();
  let json: any = null; try { json = JSON.parse(text); } catch {}
  return { ok: res.ok, status: res.status, text, json };
}

function extractContent(platform: string, json: any): string {
  if (!json) return "";
  if (platform === "gemini") {
    return String(json?.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();
  }
  return String(json?.choices?.[0]?.message?.content || "").trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const business = body.business ?? {};
    const products = Array.isArray(body.products) ? body.products.slice(0, 30) : [];
    const baseInstructions = String(body.baseInstructions || "").slice(0, 6000);

    const userPrompt = buildUserPrompt(business, products, baseInstructions);

    // --- Attempt 1: Lovable AI Gateway (global) -------------------------
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    let gatewayErr: { status: number; message: string } | null = null;
    if (LOVABLE_API_KEY) {
      const r = await callLovableGateway(userPrompt, LOVABLE_API_KEY);
      if (r.ok) {
        const prompt = String(r.json?.choices?.[0]?.message?.content || "").trim();
        if (prompt) {
          return new Response(JSON.stringify({ prompt, source: "lovable" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
      gatewayErr = { status: r.status, message: (r.json?.error?.message || r.text || "").slice(0, 400) };
      console.log("[ai-generate-prompt] gateway failed:", r.status, gatewayErr.message);
    } else {
      gatewayErr = { status: 500, message: "LOVABLE_API_KEY not configured" };
    }

    // --- Attempt 2: user's own saved API key ----------------------------
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const auth = req.headers.get("Authorization") || "";
    const jwt = auth.replace(/^Bearer\s+/i, "").trim();
    let userId: string | null = null;
    if (jwt) {
      const authClient = createClient(SUPABASE_URL, SERVICE_ROLE);
      const { data: u } = await authClient.auth.getUser(jwt);
      userId = u?.user?.id || null;
    }

    if (userId) {
      const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
      let keyRow: any = null;
      try {
        const { data: resolved } = await admin.rpc("resolve_ai_api_key", { _user_id: userId, _platform: null });
        const r = Array.isArray(resolved) ? resolved[0] : resolved;
        if (r?.encrypted_key) keyRow = r;
      } catch (e) {
        console.log("[ai-generate-prompt] resolve rpc failed:", (e as Error).message);
      }
      if (!keyRow) {
        const { data: legacy } = await admin
          .from("ai_api_keys")
          .select("id, encrypted_key, platform, model")
          .eq("user_id", userId).eq("is_active", true).maybeSingle();
        if (legacy) keyRow = legacy;
      }

      if (keyRow?.encrypted_key) {
        try {
          const apiKey = await decryptKey(keyRow.encrypted_key);
          const platform = String(keyRow.platform || "").toLowerCase();
          const model = keyRow.model && keyRow.model !== "default" ? keyRow.model : "";
          let r;
          if (platform === "openai") r = await callOpenAI(userPrompt, apiKey, model);
          else if (platform === "gemini") r = await callGemini(userPrompt, apiKey, model);
          else if (platform === "deepseek") r = await callDeepSeek(userPrompt, apiKey, model);
          else r = null;

          if (r?.ok) {
            const prompt = extractContent(platform, r.json);
            if (prompt) {
              return new Response(JSON.stringify({ prompt, source: `user:${platform}` }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              });
            }
          } else if (r) {
            console.log("[ai-generate-prompt] user key failed:", platform, r.status, r.text.slice(0, 200));
            gatewayErr = { status: r.status, message: `Your ${platform} key: ${r.status} — ${(r.json?.error?.message || r.text).toString().slice(0, 200)}` };
          }
        } catch (e) {
          console.log("[ai-generate-prompt] user-key path failed:", (e as Error).message);
        }
      }
    }

    // --- All paths failed --------------------------------------------------
    const status = gatewayErr?.status ?? 500;
    let message = gatewayErr?.message || "Failed to generate prompt";
    if (status === 402) {
      message = "Global AI credits exhausted. Add your own AI API key in the 'AI API Key' tab, then try again.";
    } else if (status === 429) {
      message = "AI rate limit reached — try again in a moment.";
    }
    return new Response(JSON.stringify({ error: message }), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("ai-generate-prompt error:", e);
    return new Response(JSON.stringify({ error: e?.message || "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
