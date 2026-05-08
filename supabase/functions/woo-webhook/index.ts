// Public webhook endpoint for WooCommerce. The user pastes
//   https://<project>.supabase.co/functions/v1/woo-webhook?token=<webhook_secret>
// into WooCommerce → Settings → Advanced → Webhooks. Topics handled:
//   product.created / product.updated / product.deleted
//   order.created   → also sends WhatsApp confirmation to the customer

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};
const ok = (b: unknown = { ok: true }, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

function digitsOnly(s: string) { return String(s || "").replace(/\D/g, ""); }

function buildConfirmation(order: any, currency: string): string {
  const num = order.number || order.id;
  const total = order.total || "";
  const items = (order.line_items || []).map((it: any) =>
    `• ${it.name} × ${it.quantity}`).join("\n");
  return [
    `🎉 Assalamu Alaikum! Apnar order confirm hoyeche.`,
    `Order #${num}`,
    items,
    `Total: ${total} ${currency}`,
    ``,
    `Hello! Your order has been received.`,
    `Order #${num} — Total: ${total} ${currency}`,
    `We will contact you shortly. Thank you!`,
  ].filter(Boolean).join("\n");
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

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: conn } = await admin
      .from("woo_connections").select("*").eq("webhook_secret", token).maybeSingle();
    if (!conn) return ok({ error: "invalid token" }, 401);

    // Health check / WooCommerce ping (GET or empty body)
    if (req.method === "GET") return ok({ ok: true, ping: true });

    const topic = (req.headers.get("x-wc-webhook-topic") || "").toLowerCase();
    const raw = await req.text();
    let payload: any = {};
    try { payload = raw ? JSON.parse(raw) : {}; } catch { payload = {}; }

    // PRODUCT events
    if (topic.startsWith("product.")) {
      const p = payload;
      const action = topic.split(".")[1];
      if (action === "deleted") {
        if (p?.id) {
          await admin.from("products")
            .update({ is_active: false })
            .eq("user_id", conn.user_id)
            .eq("woo_product_id", p.id);
        }
        return ok({ handled: "product.deleted" });
      }
      if (p?.id) {
        await admin.from("products").upsert({
          user_id: conn.user_id,
          woo_product_id: p.id,
          source: "woocommerce",
          name: String(p.name || `Product ${p.id}`).slice(0, 500),
          price: Number(p.price || p.regular_price || 0) || 0,
          description: (p.short_description || p.description || "").replace(/<[^>]*>/g, "").trim().slice(0, 4000),
          category: Array.isArray(p.categories) && p.categories[0]?.name ? p.categories[0].name : null,
          stock: typeof p.stock_quantity === "number" ? p.stock_quantity : 0,
          image_url: Array.isArray(p.images) && p.images[0]?.src ? p.images[0].src : null,
          is_active: (p.status || "publish") === "publish",
          ai_tags_status: "pending",
        }, { onConflict: "user_id,woo_product_id" });
      }
      return ok({ handled: topic });
    }

    // ORDER events
    if (topic.startsWith("order.")) {
      const o = payload;
      if (!o?.id) return ok({ skipped: "no order id" });

      const phone = digitsOnly(o.billing?.phone || "");
      const customerName = `${o.billing?.first_name || ""} ${o.billing?.last_name || ""}`.trim();
      const currency = o.currency || "BDT";

      // Insert (idempotent via unique constraint)
      const { error: insErr } = await admin.from("woo_orders").insert({
        user_id: conn.user_id,
        woo_order_id: o.id,
        order_number: String(o.number || o.id),
        status: o.status,
        total: Number(o.total || 0) || 0,
        currency,
        customer_name: customerName || null,
        customer_phone: phone || null,
        customer_email: o.billing?.email || null,
        line_items: o.line_items || [],
        raw: o,
      });
      // duplicate webhook → skip silently
      if (insErr && !String(insErr.message).includes("duplicate")) {
        console.error("woo_orders insert error:", insErr.message);
      }

      // Send WhatsApp confirmation if we have a phone + a session
      if (phone && conn.default_session_id && topic === "order.created") {
        try {
          const { data: ses } = await admin
            .from("sessions")
            .select("id, api_token, status")
            .eq("id", conn.default_session_id)
            .maybeSingle();
          if (ses) {
            const message = buildConfirmation(o, currency);
            await sendWhatsApp(ses.id, ses.api_token, phone, message);
            await admin.from("woo_orders")
              .update({ confirmation_sent: true, confirmation_sent_at: new Date().toISOString() })
              .eq("user_id", conn.user_id)
              .eq("woo_order_id", o.id);
            await admin.from("message_logs").insert({
              user_id: conn.user_id,
              session_id: ses.id,
              to_number: phone,
              message_type: "text",
              payload: { text: message, source: "woo_order_confirmation", order_id: o.id },
              status: "sent",
            });
          }
        } catch (e: any) {
          await admin.from("woo_orders")
            .update({ confirmation_error: String(e?.message || e).slice(0, 500) })
            .eq("user_id", conn.user_id)
            .eq("woo_order_id", o.id);
        }
      }
      return ok({ handled: topic, order_id: o.id });
    }

    return ok({ ignored: topic || "unknown" });
  } catch (e: any) {
    console.error("woo-webhook error:", e);
    return ok({ error: e?.message || "Internal error" }, 500);
  }
});
