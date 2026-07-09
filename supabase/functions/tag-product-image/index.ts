// Generates AI description tags for a product image using the headadmin's global OpenAI key.
// Called once at upload time, stores result in products.ai_tags.
// Uses vision detail "low" + low max_tokens to keep cost ~85 input tokens per image
// (vs ~25,000 at detail "high"). All calls are logged to ai_usage_logs so they
// appear on the Reply Usage dashboard.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const enc = new TextEncoder();
const dec = new TextDecoder();

function b64decode(s: string): Uint8Array {
  const bin = atob(s);
  const a = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
  return a;
}
async function decryptKey(payload: string): Promise<string> {
  const [ivB64, ctB64] = payload.split(".");
  const secret = Deno.env.get("APP_ENCRYPTION_KEY")!;
  const hash = await crypto.subtle.digest("SHA-256", enc.encode(secret));
  const key = await crypto.subtle.importKey("raw", hash, { name: "AES-GCM" }, false, ["decrypt"]);
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: b64decode(ivB64) as BufferSource },
    key,
    b64decode(ctB64) as BufferSource,
  );
  return dec.decode(pt);
}

async function describeImage(
  apiKey: string,
  imageUrl: string,
  productHint: string,
  detail: "low" | "high" | "auto",
  maxTokens: number,
): Promise<{ tags: string; promptTokens: number; completionTokens: number; model: string }> {
  const model = "gpt-4o-mini";
  const body = JSON.stringify({
    model,
    messages: [
      {
        role: "system",
        content:
          "You are a product image tagger. Return ONLY a comma-separated list of 6-12 short keywords (English): object type, colors, material, pattern, style. No sentences.",
      },
      {
        role: "user",
        content: [
          { type: "text", text: `Product context: ${productHint || "(none)"}\n\nReturn only keywords.` },
          { type: "image_url", image_url: { url: imageUrl, detail } },
        ],
      },
    ],
    max_tokens: Math.max(40, Math.min(400, maxTokens)),
  });

  // Retry on transient image-download timeouts (OpenAI fetches the storage URL
  // and freshly-uploaded objects sometimes take a moment to become reachable).
  let lastErr = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 1500 * attempt));
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body,
    });
    const data = await r.json().catch(() => ({}));
    if (r.ok) {
      const tags = (data.choices?.[0]?.message?.content || "").trim();
      return {
        tags,
        promptTokens: Number(data?.usage?.prompt_tokens) || 0,
        completionTokens: Number(data?.usage?.completion_tokens) || 0,
        model,
      };
    }
    lastErr = data?.error?.message || `Vision error ${r.status}`;
    // Only retry on image-download timeouts / transient upstream errors.
    const retryable = /timeout|download|fetch|temporar|unavailable|429|502|503|504/i.test(lastErr) || [429, 500, 502, 503, 504].includes(r.status);
    if (!retryable) break;
  }
  throw new Error(lastErr || "vision failed");
}

async function logUsage(admin: any, ctx: {
  userId: string; platform: string; model: string; taskType: string;
  promptTokens: number; completionTokens: number;
}) {
  try {
    const pt = Number(ctx.promptTokens) || 0;
    const ct = Number(ctx.completionTokens) || 0;
    if (pt + ct <= 0) return;
    const { data: priceRow } = await admin
      .from("ai_model_pricing")
      .select("input_price_per_1m_usd, output_price_per_1m_usd")
      .eq("platform", ctx.platform)
      .eq("model", ctx.model)
      .maybeSingle();
    const inP = Number(priceRow?.input_price_per_1m_usd) || 0;
    const outP = Number(priceRow?.output_price_per_1m_usd) || 0;
    const inputCost = (pt / 1_000_000) * inP;
    const outputCost = (ct / 1_000_000) * outP;
    await admin.from("ai_usage_logs").insert({
      user_id: ctx.userId,
      platform: ctx.platform,
      model: ctx.model,
      key_scope: "global",
      task_type: ctx.taskType,
      prompt_tokens: pt,
      completion_tokens: ct,
      total_tokens: pt + ct,
      input_price_per_1m_usd: inP,
      output_price_per_1m_usd: outP,
      input_cost_usd: inputCost,
      output_cost_usd: outputCost,
      total_cost_usd: inputCost + outputCost,
    });
  } catch (e) {
    console.log("[tag-product-image] usage log failed:", (e as Error)?.message);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: u } = await userClient.auth.getUser(auth.replace("Bearer ", ""));
    if (!u?.user?.id) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    const userId = u.user.id;

    const { productId } = await req.json();
    if (!productId) return new Response(JSON.stringify({ error: "productId required" }), { status: 400, headers: corsHeaders });

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: product, error: pErr } = await admin
      .from("products")
      .select("id, user_id, name, description, image_url")
      .eq("id", productId)
      .maybeSingle();
    if (pErr || !product) return new Response(JSON.stringify({ error: "Product not found" }), { status: 404, headers: corsHeaders });
    if (product.user_id !== userId) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });
    if (!product.image_url) return new Response(JSON.stringify({ error: "No image" }), { status: 400, headers: corsHeaders });

    // Use the headadmin's GLOBAL OpenAI key (set in headadmin panel) for all users.
    const { data: keyRow } = await admin
      .from("ai_api_keys")
      .select("encrypted_key, platform")
      .eq("is_global", true)
      .eq("is_active", true)
      .eq("platform", "openai")
      .maybeSingle();
    if (!keyRow) {
      await admin.from("products").update({ ai_tags_status: "failed", ai_tags: "no_global_openai_key" }).eq("id", productId);
      return new Response(JSON.stringify({ error: "Headadmin global OpenAI key not configured" }), { status: 400, headers: corsHeaders });
    }

    // Honour headadmin-controlled vision detail + max tokens (re-uses image_describe limits).
    let detail: "low" | "high" | "auto" = "low";
    let maxTokens = 150;
    try {
      const { data: limits } = await admin.rpc("get_ai_task_limits");
      const r: any = Array.isArray(limits) ? limits[0] : limits;
      if (r?.vision_detail) detail = r.vision_detail;
      if (r?.image_describe_max_tokens) maxTokens = Number(r.image_describe_max_tokens) || 150;
    } catch (_) { /* fall back to defaults */ }

    const apiKey = await decryptKey(keyRow.encrypted_key);
    const hint = `${product.name || ""} ${product.description || ""}`.trim();

    let tags = "";
    try {
      const res = await describeImage(apiKey, product.image_url, hint, detail, maxTokens);
      tags = res.tags;
      await logUsage(admin, {
        userId: product.user_id,
        platform: "openai",
        model: res.model,
        taskType: "product_image_tag",
        promptTokens: res.promptTokens,
        completionTokens: res.completionTokens,
      });
    } catch (e: any) {
      await admin.from("products").update({ ai_tags_status: "failed", ai_tags: String(e?.message || "vision_failed").slice(0, 500) }).eq("id", productId);
      return new Response(JSON.stringify({ error: e?.message || "vision failed" }), { status: 500, headers: corsHeaders });
    }

    await admin.from("products").update({ ai_tags: tags, ai_tags_status: "ready" }).eq("id", productId);
    return new Response(JSON.stringify({ ok: true, tags }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("tag-product-image error:", e);
    return new Response(JSON.stringify({ error: e?.message || "Internal error" }), { status: 500, headers: corsHeaders });
  }
});
