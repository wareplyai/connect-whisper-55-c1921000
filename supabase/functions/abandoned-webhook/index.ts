// Public webhook for the WordPress "Abandoned Cart" plugin.
// URL: https://<project>.supabase.co/functions/v1/abandoned-webhook?token=<secret>
// Plugin POSTs JSON with fields: customer_name, customer_email, customer_phone,
// customer_address, product_name, product_link, order_date, site_name, site_url,
// status (incomplete|completed), whatsapp_message
//
// Behaviour:
//   * status = "completed"  -> stored only (no SMS), so user can audit.
//   * status = "incomplete" -> stored + WhatsApp message sent to customer_phone
//                              via the user's default session.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};
const ok = (b: unknown = { ok: true }, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

function digitsOnly(s: any) { return String(s ?? "").replace(/\D/g, ""); }

// Normalize a raw phone into E.164-style digits with the user's country code.
function normalizePhone(raw: string, country: string): string {
  let d = digitsOnly(raw);
  const cc = digitsOnly(country) || "88";
  if (!d) return "";
  // Strip leading zeros (e.g., 01856... -> 1856...)
  d = d.replace(/^0+/, "");
  // If it already starts with the cc, keep as-is
  if (d.startsWith(cc)) return d;
  // 880 / 88 specific handling for Bangladesh: avoid double-prefix
  if (cc === "88" && d.startsWith("880")) return d;
  if (cc === "880" && d.startsWith("88") && !d.startsWith("880")) return "0" + d;
  return cc + d;
}

async function sendWhatsApp(sessionId: string, apiToken: string | null, phone: string, message: string) {
  const GATEWAY = Deno.env.get("WHATSAPP_GATEWAY_URL") || "https://alvi-waapi.duckdns.org/waapi";
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiToken) headers.Authorization = `Bearer ${apiToken}`;
  const r = await fetch(`${GATEWAY}/api/session/${sessionId}/send`, {
    method: "POST", headers,
    body: JSON.stringify({ to: phone, message }),
  });
  const data = await r.json().catch(() => ({}));
  const failed = data?.success === false || data?.ok === false || data?.sent === false || data?.error;
  if (!r.ok || failed) throw new Error(data?.error || data?.message || `gateway ${r.status}`);
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token") || "";
    if (!token) return ok({ error: "missing token" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: conn } = await admin
      .from("abandoned_connections")
      .select("*")
      .eq("webhook_secret", token)
      .maybeSingle();

    if (!conn) return ok({ error: "invalid token" }, 401);

    if (req.method === "GET") return ok({ ok: true, ping: true, user_id: conn.user_id });
    if (!conn.is_active) return ok({ skipped: "connection disabled" });

    const raw = await req.text();
    let payload: any = {};
    try { payload = raw ? JSON.parse(raw) : {}; } catch {}

    const status = String(payload.status || "").toLowerCase().trim() || "unknown";
    const phoneRaw = String(payload.customer_phone || "");
    const phoneFull = normalizePhone(phoneRaw, conn.country_code || "88");
    const whatsappMessage = String(payload.whatsapp_message || "").trim();

    // Insert record
    const { data: orderRow, error: insErr } = await admin
      .from("abandoned_orders")
      .insert({
        user_id: conn.user_id,
        status,
        customer_name: payload.customer_name || null,
        customer_email: payload.customer_email || null,
        customer_phone: phoneRaw || null,
        customer_phone_full: phoneFull || null,
        customer_address: payload.customer_address || null,
        product_name: payload.product_name || null,
        product_link: payload.product_link || null,
        order_date: payload.order_date || null,
        site_name: payload.site_name || null,
        site_url: payload.site_url || null,
        whatsapp_message: whatsappMessage || null,
        raw: payload,
      })
      .select()
      .single();

    if (insErr) {
      console.error("abandoned_orders insert error:", insErr);
      return ok({ error: insErr.message }, 500);
    }

    // Bump counters
    const counterPatch: any = { total_received: (conn.total_received || 0) + 1 };
    if (status === "completed") counterPatch.total_completed = (conn.total_completed || 0) + 1;
    else if (status === "incomplete") counterPatch.total_incomplete = (conn.total_incomplete || 0) + 1;
    await admin.from("abandoned_connections").update(counterPatch).eq("id", conn.id);

    // Skip SMS for completed / non-incomplete statuses
    if (status !== "incomplete") {
      return ok({ handled: true, status, sms: "skipped" });
    }

    // Need a session + phone + message to send
    if (!conn.default_session_id) {
      await admin.from("abandoned_orders")
        .update({ sms_error: "no default session configured" }).eq("id", orderRow.id);
      return ok({ handled: true, status, sms: "no session" });
    }
    if (!phoneFull || !whatsappMessage) {
      await admin.from("abandoned_orders")
        .update({ sms_error: "missing phone or whatsapp_message" }).eq("id", orderRow.id);
      return ok({ handled: true, status, sms: "missing data" });
    }

    const { data: ses } = await admin
      .from("sessions")
      .select("id, user_id, api_token, status")
      .eq("id", conn.default_session_id)
      .maybeSingle();

    if (!ses || ses.user_id !== conn.user_id) {
      await admin.from("abandoned_orders")
        .update({ sms_error: "session not found" }).eq("id", orderRow.id);
      return ok({ handled: true, status, sms: "session missing" });
    }

    try {
      await sendWhatsApp(ses.id, ses.api_token, phoneFull, whatsappMessage);
      await admin.from("abandoned_orders").update({
        sms_sent: true,
        sms_sent_at: new Date().toISOString(),
        session_id: ses.id,
      }).eq("id", orderRow.id);
      await admin.from("abandoned_connections")
        .update({ total_sent: (conn.total_sent || 0) + 1 })
        .eq("id", conn.id);
      await admin.from("message_logs").insert({
        user_id: conn.user_id,
        session_id: ses.id,
        to_number: phoneFull,
        message_type: "text",
        payload: { text: whatsappMessage, source: "abandoned_cart", order_id: orderRow.id },
        status: "sent",
      });
      return ok({ handled: true, status, sms: "sent", to: phoneFull });
    } catch (e: any) {
      const msg = String(e?.message || e).slice(0, 500);
      await admin.from("abandoned_orders")
        .update({ sms_error: msg, session_id: ses.id }).eq("id", orderRow.id);
      return ok({ handled: true, status, sms: "failed", error: msg });
    }
  } catch (e: any) {
    console.error("abandoned-webhook error:", e);
    return ok({ error: e?.message || "internal error" }, 500);
  }
});
