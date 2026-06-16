// Generates AI description tags for a product image using the user's stored OpenAI key.
// Called once at upload time, stores result in products.ai_tags.

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

async function describeImage(apiKey: string, imageUrl: string, productHint: string): Promise<string> {
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a product image tagger. Look at the image and return a comma-separated list of 8-15 short descriptive keywords/phrases (English). Cover: object type, colors, material, style, pattern, shape, brand if visible. No sentences, just keywords.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: `Product context: ${productHint || "(none)"}\n\nReturn only keywords.` },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        },
      ],
      max_tokens: 200,
    }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data?.error?.message || `Vision error ${r.status}`);
  return (data.choices?.[0]?.message?.content || "").trim();
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

    const apiKey = await decryptKey(keyRow.encrypted_key);
    const hint = `${product.name || ""} ${product.description || ""}`.trim();

    let tags = "";
    try {
      tags = await describeImage(apiKey, product.image_url, hint);
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
