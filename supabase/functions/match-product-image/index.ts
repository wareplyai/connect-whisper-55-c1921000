import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  let _logCtx: { user_id?: string; image_url?: string; customer_phone?: string | null } = {};
  let _supabaseAdmin: any = null;
  const writeLog = async (fields: Record<string, any>) => {
    try {
      if (!_supabaseAdmin || !_logCtx.user_id) return;
      await _supabaseAdmin.from("image_match_logs").insert({
        user_id: _logCtx.user_id,
        customer_phone: _logCtx.customer_phone || null,
        query_image_url: _logCtx.image_url || null,
        ...fields,
      });
    } catch (e) {
      console.log("[match-product-image] log error", (e as Error).message);
    }
  };
  try {
    const { image_url, user_id, customer_phone } = await req.json();
    _logCtx = { image_url, user_id, customer_phone: customer_phone || null };
    if (!image_url || !user_id) {
      return new Response(JSON.stringify({ error: "image_url and user_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[match-product-image] request", {
      user_id,
      image_url,
      image_url_kind: String(image_url).startsWith("data:") ? "data-url" : "url",
      image_url_length: String(image_url).length,
    });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: products } = await supabase
      .from("product_images")
      .select("id, product_name, product_price, product_description, product_image_url")
      .eq("user_id", user_id);

    console.log("[match-product-image] product count", products?.length || 0);

    if (!products || products.length === 0) {
      return new Response(JSON.stringify({ match: false, reason: "no_products" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    // Download every image ourselves and convert to base64 data URLs. This avoids
    // the AI provider failing to fetch Supabase storage URLs (we saw 400s).
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const base64Length = (dataUrl: string) => dataUrl.includes(",") ? dataUrl.split(",").pop()?.length || 0 : 0;
    const storagePathFromUrl = (url: string, bucket: string) => {
      try {
        const path = new URL(url).pathname;
        const markers = [`/storage/v1/object/public/${bucket}/`, `/storage/v1/object/${bucket}/`];
        const marker = markers.find((m) => path.includes(m));
        return marker ? decodeURIComponent(path.split(marker)[1] || "") : null;
      } catch {
        return null;
      }
    };

    async function toDataUrl(url: string, label: string): Promise<string | null> {
      try {
        console.log("[match-product-image] fetch start", { label, image_url: url, url_length: url.length });
        if (/^data:image\//i.test(url)) {
          console.log("[match-product-image] data-url input", { label, base64_length: base64Length(url), data_url_length: url.length });
          return url;
        }
        const chatMediaPath = storagePathFromUrl(url, "chat-media");
        let ct = "image/jpeg";
        let buf: Uint8Array;
        if (chatMediaPath) {
          const { data, error } = await supabase.storage.from("chat-media").download(chatMediaPath);
          if (error || !data) {
            console.log("[match-product-image] storage download fail", { label, bucket: "chat-media", path: chatMediaPath, error: error?.message });
            return null;
          }
          ct = (data.type || "image/jpeg").split(";")[0];
          buf = new Uint8Array(await data.arrayBuffer());
        } else {
          const r = await fetch(url, {
            headers: {
              apikey: serviceKey,
              Authorization: `Bearer ${serviceKey}`,
            },
          });
          if (!r.ok) {
            const body = await r.text().catch(() => "");
            console.log("[match-product-image] fetch fail", { label, status: r.status, image_url: url, body: body.slice(0, 300) });
            return null;
          }
          ct = (r.headers.get("content-type") || "image/jpeg").split(";")[0];
          buf = new Uint8Array(await r.arrayBuffer());
        }
        let bin = "";
        for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
        const b64 = btoa(bin);
        console.log("[match-product-image] fetch ok", { label, content_type: ct, bytes: buf.length, base64_length: b64.length });
        return `data:${ct};base64,${b64}`;
      } catch (e) {
        console.log("[match-product-image] fetch error", { label, image_url: url, error: (e as Error).message });
        return null;
      }
    }

    const customerData = await toDataUrl(image_url, "customer");
    if (!customerData) {
      console.log("[match-product-image] customer image unfetchable", { image_url });
      return new Response(JSON.stringify({ match: false, reason: "customer_image_unfetchable" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.log("[match-product-image] customer base64 ready", { base64_length: base64Length(customerData), data_url_length: customerData.length });

    const productData: { p: any; data: string }[] = [];
    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      const d = await toDataUrl(p.product_image_url, `product #${i} ${p.id}`);
      if (d) {
        console.log("[match-product-image] product base64 ready", { idx: i, id: p.id, name: p.product_name, base64_length: base64Length(d) });
        productData.push({ p, data: d });
      }
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

    console.log("[match-product-image] AI result:", {
      idx,
      confidence,
      raw,
      matched_product_id: idx >= 0 && idx < productData.length ? productData[idx].p.id : null,
      matched_product_name: idx >= 0 && idx < productData.length ? productData[idx].p.product_name : null,
    });

    if (idx >= 0 && idx < productData.length && confidence !== "low") {
      const best = productData[idx].p;
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
