import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function hammingDistance(a: string, b: string): number {
  const len = Math.min(a.length, b.length);
  let d = Math.abs(a.length - b.length);
  for (let i = 0; i < len; i++) if (a[i] !== b[i]) d++;
  return d;
}

// Lightweight 8x8 average-hash approximation from raw bytes (no image decoder
// available in Deno edge runtime). Same algorithm must be used for both
// customer image and stored product image so distances are comparable.
async function generateHash(imageUrl: string): Promise<string> {
  const res = await fetch(imageUrl);
  if (!res.ok) throw new Error(`fetch ${res.status}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  const sample = 64;
  if (buf.length < sample) throw new Error("image too small");
  const step = Math.floor(buf.length / sample);
  const pixels: number[] = [];
  for (let i = 0; i < sample; i++) pixels.push(buf[i * step]);
  const avg = pixels.reduce((a, b) => a + b, 0) / pixels.length;
  return pixels.map((p) => (p > avg ? "1" : "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { image_url, user_id, store_for_product_id } = await req.json();
    if (!image_url || (!user_id && !store_for_product_id)) {
      return new Response(JSON.stringify({ error: "image_url and user_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const hash = await generateHash(image_url);

    // Mode 1: backfill — store hash for an existing product row
    if (store_for_product_id) {
      const { error } = await supabase
        .from("product_images")
        .update({ image_hash: hash })
        .eq("id", store_for_product_id);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true, hash }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mode 2: match
    const { data: products } = await supabase
      .from("product_images")
      .select("id, product_name, product_price, product_description, product_image_url, image_hash")
      .eq("user_id", user_id);

    if (!products || products.length === 0) {
      return new Response(JSON.stringify({ match: false, reason: "no_products" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let best: any = null;
    let bestDist = 999;
    for (const p of products) {
      if (!p.image_hash) continue;
      const d = hammingDistance(hash, p.image_hash);
      if (d < bestDist) { bestDist = d; best = p; }
    }

    if (best && bestDist < 10) {
      return new Response(JSON.stringify({
        match: true,
        distance: bestDist,
        product: {
          id: best.id,
          name: best.product_name,
          price: best.product_price,
          description: best.product_description,
          image_url: best.product_image_url,
        },
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ match: false, distance: bestDist }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
