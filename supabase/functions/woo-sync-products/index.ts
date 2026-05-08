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

function normalizeStoreUrl(input: string): string {
  let u = String(input || "").trim();
  if (!u) return "";
  if (!/^https?:\/\//i.test(u)) u = "https://" + u;
  return u.replace(/\/+$/, "");
}

function htmlToMessage(text: string): string {
  const title = text.match(/<title[^>]*>(.*?)<\/title>/is)?.[1]
    ?.replace(/\s+/g, " ")
    .trim();
  if (title) return title;
  return text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 240) || "HTML response";
}

// RFC3986 percent-encode
function pe(s: string): string {
  return encodeURIComponent(s).replace(/[!*'()]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
}

async function hmacSha1Base64(key: string, msg: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw", enc.encode(key), { name: "HMAC", hash: "SHA-1" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(msg));
  let bin = "";
  const bytes = new Uint8Array(sig);
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

// Build a signed WooCommerce URL using OAuth 1.0a (one-legged) for HTTP stores.
async function signedWooUrl(
  baseUrl: string,
  method: string,
  consumerKey: string,
  consumerSecret: string,
  extra: Record<string, string>,
): Promise<string> {
  const oauth: Record<string, string> = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: crypto.randomUUID().replace(/-/g, ""),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_version: "1.0",
  };
  const all: Record<string, string> = { ...extra, ...oauth };
  const sortedKeys = Object.keys(all).sort();
  const paramStr = sortedKeys.map((k) => `${pe(k)}=${pe(all[k])}`).join("&");
  const baseStr = [method.toUpperCase(), pe(baseUrl), pe(paramStr)].join("&");
  const signingKey = `${pe(consumerSecret)}&`;
  const signature = await hmacSha1Base64(signingKey, baseStr);
  all.oauth_signature = signature;
  const qs = Object.keys(all).sort().map((k) => `${pe(k)}=${pe(all[k])}`).join("&");
  return `${baseUrl}?${qs}`;
}

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

    const storeUrl = normalizeStoreUrl(conn.store_url);
    const isHttps = /^https:\/\//i.test(storeUrl);
    const basic = "Basic " + btoa(`${conn.consumer_key}:${conn.consumer_secret}`);
    let page = 1;
    const perPage = 100;
    let total = 0;
    const errors: string[] = [];

    while (page <= 50) {
      const baseUrl = `${storeUrl}/wp-json/wc/v3/products`;
      const params = { per_page: String(perPage), page: String(page), status: "publish" };
      let url: string;
      let headers: Record<string, string> = {};
      if (isHttps) {
        url = `${baseUrl}?${new URLSearchParams(params).toString()}`;
        headers = { Authorization: basic };
      } else {
        // HTTP store — use OAuth 1.0a signed request (Basic Auth not allowed without SSL)
        url = await signedWooUrl(baseUrl, "GET", conn.consumer_key, conn.consumer_secret, params);
      }
      const r = await fetch(url, { headers });
      const text = await r.text();
      if (!r.ok) {
        errors.push(`page ${page}: WooCommerce returned ${r.status} — ${htmlToMessage(text)}`);
        break;
      }
      let items: any[];
      try {
        const parsed = JSON.parse(text);
        if (!Array.isArray(parsed)) {
          errors.push(`page ${page}: WooCommerce returned an unexpected response instead of a products list`);
          break;
        }
        items = parsed;
      } catch {
        errors.push(`page ${page}: WooCommerce returned HTML instead of JSON — ${htmlToMessage(text)}. Check store URL, REST API availability, permalink settings, or security/Cloudflare rules.`);
        break;
      }
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

    return json({ ok: errors.length === 0, total, errors, error: errors.length ? errors.join(" | ").slice(0, 1000) : undefined });
  } catch (e: any) {
    return json({ error: e?.message || "Internal error" }, 500);
  }
});
