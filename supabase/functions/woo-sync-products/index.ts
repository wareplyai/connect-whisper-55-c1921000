// Pulls all products from a user's WooCommerce store and upserts them into
// `products`. Existing manual products are not touched. Synced products are
// matched by (user_id, woo_product_id).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const auth = req.headers.get("Authorization") || "";
    const jwt = auth.replace(/^Bearer\s+/i, "");
    if (!jwt) return json({ error: "Missing auth" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return json({ error: "Invalid auth" }, 401);
    const userId = u.user.id;

    const admin = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: conn } = await admin
      .from("woo_connections")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (!conn) return json({ error: "WooCommerce not connected" }, 400);

    const basic = "Basic " + btoa(`${conn.consumer_key}:${conn.consumer_secret}`);
    let page = 1;
    const perPage = 100;
    let total = 0;
    const errors: string[] = [];

    while (page <= 50) {
      const url = `${conn.store_url}/wp-json/wc/v3/products?per_page=${perPage}&page=${page}&status=publish`;
      const r = await fetch(url, { headers: { Authorization: basic } });
      if (!r.ok) {
        errors.push(`page ${page}: ${r.status} ${(await r.text()).slice(0, 200)}`);
        break;
      }
      const items: any[] = await r.json();
      if (!Array.isArray(items) || items.length === 0) break;

      const rows = items.map((p) => ({
        user_id: userId,
        woo_product_id: p.id,
        source: "woocommerce",
        name: String(p.name || "").slice(0, 500) || `Product ${p.id}`,
        price: Number(p.price || p.regular_price || 0) || 0,
        description: (p.short_description || p.description || "").replace(/<[^>]*>/g, "").trim().slice(0, 4000),
        category: Array.isArray(p.categories) && p.categories[0]?.name ? p.categories[0].name : null,
        stock: typeof p.stock_quantity === "number" ? p.stock_quantity : 0,
        image_url: Array.isArray(p.images) && p.images[0]?.src ? p.images[0].src : null,
        is_active: p.status === "publish",
        ai_tags_status: "pending",
      }));

      const { error: upErr } = await admin
        .from("products")
        .upsert(rows, { onConflict: "user_id,woo_product_id" });
      if (upErr) errors.push(`page ${page}: ${upErr.message}`);
      else total += rows.length;

      if (items.length < perPage) break;
      page += 1;
    }

    await admin.from("woo_connections").update({
      last_sync_at: new Date().toISOString(),
      last_sync_status: errors.length ? "partial" : "ok",
      last_sync_error: errors.length ? errors.join(" | ").slice(0, 1000) : null,
      total_synced: total,
    }).eq("id", conn.id);

    // Fire-and-forget: trigger AI tagging for synced products with images
    try {
      const { data: needTag } = await admin
        .from("products")
        .select("id")
        .eq("user_id", userId)
        .eq("source", "woocommerce")
        .eq("ai_tags_status", "pending")
        .not("image_url", "is", null)
        .limit(20);
      for (const p of needTag || []) {
        fetch(`${SUPABASE_URL}/functions/v1/tag-product-image`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ product_id: p.id }),
        }).catch(() => {});
      }
    } catch {}

    return json({ ok: true, total, errors });
  } catch (e: any) {
    return json({ error: e?.message || "Internal error" }, 500);
  }
});
