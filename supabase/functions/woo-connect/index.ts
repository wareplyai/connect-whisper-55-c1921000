// Save/update a user's WooCommerce connection. Verifies credentials by
// hitting the store's REST API, then returns the unique webhook URL the
// user pastes into WooCommerce → Settings → Advanced → Webhooks.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeStoreUrl(input: string): string {
  let u = String(input || "").trim();
  if (!u) return "";
  if (!/^https?:\/\//i.test(u)) u = "https://" + u;
  return u.replace(/\/+$/, "");
}

function pe(s: string): string {
  return encodeURIComponent(s).replace(/[!*'()]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
}
async function hmacSha1Base64(key: string, msg: string): Promise<string> {
  const enc = new TextEncoder();
  const ck = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", ck, enc.encode(msg));
  let bin = ""; const bytes = new Uint8Array(sig);
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
async function signedWooUrl(baseUrl: string, method: string, ck: string, cs: string, extra: Record<string,string> = {}): Promise<string> {
  const oauth: Record<string,string> = {
    oauth_consumer_key: ck,
    oauth_nonce: crypto.randomUUID().replace(/-/g, ""),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now()/1000).toString(),
    oauth_version: "1.0",
  };
  const all = { ...extra, ...oauth };
  const paramStr = Object.keys(all).sort().map(k => `${pe(k)}=${pe(all[k])}`).join("&");
  const baseStr = [method.toUpperCase(), pe(baseUrl), pe(paramStr)].join("&");
  const sig = await hmacSha1Base64(`${pe(cs)}&`, baseStr);
  (all as any).oauth_signature = sig;
  const qs = Object.keys(all).sort().map(k => `${pe(k)}=${pe((all as any)[k])}`).join("&");
  return `${baseUrl}?${qs}`;
}
async function wooFetch(storeUrl: string, path: string, ck: string, cs: string, params: Record<string,string> = {}) {
  const isHttps = /^https:\/\//i.test(storeUrl);
  const baseUrl = `${storeUrl}${path}`;
  if (isHttps) {
    const url = Object.keys(params).length ? `${baseUrl}?${new URLSearchParams(params)}` : baseUrl;
    return await fetch(url, { headers: { Authorization: "Basic " + btoa(`${ck}:${cs}`) } });
  }
  const url = await signedWooUrl(baseUrl, "GET", ck, cs, params);
  return await fetch(url);
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
    const { data: u, error: uErr } = await userClient.auth.getUser();
    if (uErr || !u?.user) return json({ error: "Invalid auth" }, 401);
    const userId = u.user.id;

    const body = await req.json().catch(() => ({}));
    const store_url = normalizeStoreUrl(body.store_url);
    const consumer_key = String(body.consumer_key || "").trim();
    const consumer_secret = String(body.consumer_secret || "").trim();
    const default_session_id = body.default_session_id ? String(body.default_session_id) : null;

    if (!store_url || !consumer_key || !consumer_secret) {
      return json({ error: "store_url, consumer_key and consumer_secret are required" }, 400);
    }
    if (!/^ck_/i.test(consumer_key) || !/^cs_/i.test(consumer_secret)) {
      return json({ error: "Invalid WooCommerce key/secret format (must start with ck_ / cs_)" }, 400);
    }

    // Verify credentials by calling /wp-json/wc/v3/products?per_page=1
    let storeName = "";
    try {
      const r = await wooFetch(store_url, "/wp-json/wc/v3/products", consumer_key, consumer_secret, { per_page: "1" });
      const text = await r.text();
      if (!r.ok) {
        return json({ error: `WooCommerce verify failed (${r.status}): ${text.slice(0, 300)}` }, 400);
      }
      try { JSON.parse(text); } catch {
        return json({ error: "WooCommerce returned HTML instead of JSON. Check store URL, REST API permalinks, or security plugins." }, 400);
      }
      try {
        const sysR = await wooFetch(store_url, "/wp-json/wc/v3/system_status", consumer_key, consumer_secret);
        if (sysR.ok) {
          const sys: any = await sysR.json().catch(() => ({}));
          storeName = sys?.environment?.site_url || "";
        }
      } catch {}
    } catch (e: any) {
      return json({ error: `Cannot reach store: ${e?.message || e}` }, 400);
    }

    const admin = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Upsert
    const { data: existing } = await admin
      .from("woo_connections")
      .select("id, webhook_secret")
      .eq("user_id", userId)
      .maybeSingle();

    let webhookSecret = existing?.webhook_secret;
    if (existing) {
      await admin.from("woo_connections").update({
        store_url, consumer_key, consumer_secret, default_session_id, is_active: true,
      }).eq("id", existing.id);
    } else {
      const { data: ins, error: insErr } = await admin.from("woo_connections").insert({
        user_id: userId, store_url, consumer_key, consumer_secret, default_session_id,
      }).select("webhook_secret").maybeSingle();
      if (insErr) return json({ error: insErr.message }, 500);
      webhookSecret = ins?.webhook_secret;
    }

    const deliveryUrl = `${SUPABASE_URL}/functions/v1/woo-webhook?token=${webhookSecret}`;
    return json({
      ok: true,
      store_url,
      store_name: storeName,
      delivery_url: deliveryUrl,
      webhook_secret: webhookSecret,
    });
  } catch (e: any) {
    return json({ error: e?.message || "Internal error" }, 500);
  }
});
