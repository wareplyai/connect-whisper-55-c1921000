import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { image_url, user_id } = await req.json();
    if (!image_url || !user_id) {
      return new Response(JSON.stringify({ error: "image_url and user_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: products } = await supabase
      .from("product_images")
      .select("id, product_name, product_price, product_description, product_image_url")
      .eq("user_id", user_id);

    if (!products || products.length === 0) {
      return new Response(JSON.stringify({ match: false, reason: "no_products" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    // Download every image ourselves and convert to base64 data URLs. This avoids
    // the AI provider failing to fetch Supabase storage URLs (we saw 400s).
    async function toDataUrl(url: string): Promise<string | null> {
      try {
        const r = await fetch(url);
        if (!r.ok) { console.log("[match] fetch fail", r.status, url); return null; }
        const ct = (r.headers.get("content-type") || "image/jpeg").split(";")[0];
        const buf = new Uint8Array(await r.arrayBuffer());
        let bin = "";
        for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
        return `data:${ct};base64,${btoa(bin)}`;
      } catch (e) {
        console.log("[match] fetch error", url, (e as Error).message);
        return null;
      }
    }

    const customerData = await toDataUrl(image_url);
    if (!customerData) {
      return new Response(JSON.stringify({ match: false, reason: "customer_image_unfetchable" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const productData: { p: any; data: string }[] = [];
    for (const p of products) {
      const d = await toDataUrl(p.product_image_url);
      if (d) productData.push({ p, data: d });
    }
    if (productData.length === 0) {
      return new Response(JSON.stringify({ match: false, reason: "no_fetchable_products" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const content: any[] = [
      {
        type: "text",
        text:
          `You are a product matching assistant. The FIRST image is a photo a customer sent on WhatsApp. ` +
          `The remaining images are products from a catalog, each preceded by "Product #N: <name>". ` +
          `Decide which catalog product is the SAME product as the customer's photo (color, shape, design must match; ignore background, lighting, angle, watermark differences). ` +
          `Reply STRICTLY as JSON: {"index": <number>, "confidence": "high"|"medium"|"low"}. ` +
          `Use index = -1 if none clearly matches. Only say "high" if you are sure it's the same product.`,
      },
      { type: "text", text: "CUSTOMER IMAGE:" },
      { type: "image_url", image_url: { url: customerData } },
    ];

    productData.forEach(({ p }, i) => {
      content.push({ type: "text", text: `Product #${i}: ${p.product_name}` });
      content.push({ type: "image_url", image_url: { url: productData[i].data } });
    });

    const aiRes = await fetch(LOVABLE_AI_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content }],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      console.log("[match-product-image] AI error", aiRes.status, txt);
      return new Response(JSON.stringify({ match: false, reason: "ai_error", status: aiRes.status }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiRes.json();
    const raw = aiJson?.choices?.[0]?.message?.content || "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(raw); } catch { parsed = {}; }
    const idx = typeof parsed.index === "number" ? parsed.index : -1;
    const confidence = parsed.confidence || "low";

    console.log("[match-product-image] AI result:", { idx, confidence, raw });

    if (idx >= 0 && idx < products.length && confidence !== "low") {
      const best = products[idx];
      return new Response(JSON.stringify({
        match: true,
        confidence,
        product: {
          id: best.id,
          name: best.product_name,
          price: best.product_price,
          description: best.product_description,
          image_url: best.product_image_url,
        },
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ match: false, confidence, ai_index: idx }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.log("[match-product-image] error:", (e as Error).message);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
