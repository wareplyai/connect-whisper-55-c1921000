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
    const basic = "Basic " + btoa(`${consumer_key}:${consumer_secret}`);
    const verifyUrl = `${store_url}/wp-json/wc/v3/products?per_page=1`;
    let storeName = "";
    try {
      const r = await fetch(verifyUrl, { headers: { Authorization: basic } });
      const text = await r.text();
      if (!r.ok) {
        return json({ error: `WooCommerce verify failed (${r.status}): ${text.slice(0, 300)}` }, 400);
      }
      try {
        const sysR = await fetch(`${store_url}/wp-json/wc/v3/system_status`, { headers: { Authorization: basic } });
        if (sysR.ok) {
          const sys: any = await sysR.json();
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
