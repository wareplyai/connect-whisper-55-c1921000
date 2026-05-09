// Public WooCommerce webhook → saves into crm_orders.
// URL: https://<project>.supabase.co/functions/v1/crm-woo-order-webhook?token=<woo_connections.webhook_secret>
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const digits = (s: string) => String(s || "").replace(/\D/g, "");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token") || "";
    if (!token) return json({ error: "missing token" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: conn } = await admin
      .from("woo_connections").select("user_id").eq("webhook_secret", token).maybeSingle();
    if (!conn) return json({ error: "invalid token" }, 401);

    if (req.method === "GET") return json({ ok: true, ping: true });

    const topic = (req.headers.get("x-wc-webhook-topic") || "").toLowerCase();
    const raw = await req.text();
    let o: any = {};
    try { o = raw ? JSON.parse(raw) : {}; } catch { o = {}; }

    if (topic && !topic.startsWith("order.")) return json({ ignored: topic });
    if (!o?.id) return json({ skipped: "no order id" });

    const phone = digits(o.billing?.phone || "");
    const name = `${o.billing?.first_name || ""} ${o.billing?.last_name || ""}`.trim() || null;
    const address = [o.billing?.address_1, o.billing?.address_2, o.billing?.city, o.billing?.state]
      .filter(Boolean).join(", ") || null;
    const paymentMethod = (o.payment_method_title || o.payment_method || "").toLowerCase().includes("cash")
      ? "COD" : (o.payment_method_title || o.payment_method || null);

    const row = {
      user_id: conn.user_id,
      woo_order_id: String(o.number || o.id),
      customer_name: name,
      customer_phone: phone || null,
      customer_address: address,
      total_amount: Number(o.total || 0) || 0,
      payment_method: paymentMethod,
      order_status: String(o.status || "pending"),
      cod_confirmed: false,
      notes: (o.customer_note || "").slice(0, 1000) || null,
    };

    // upsert by (user_id, woo_order_id) — best-effort: try update first, then insert
    const { data: existing } = await admin
      .from("crm_orders").select("id")
      .eq("user_id", conn.user_id).eq("woo_order_id", row.woo_order_id).maybeSingle();

    let orderId: string | null = null;
    if (existing) {
      await admin.from("crm_orders").update(row).eq("id", existing.id);
      orderId = existing.id;
    } else {
      const { data: ins, error } = await admin.from("crm_orders").insert(row).select("id").single();
      if (error) {
        console.error("insert error", error);
        return json({ error: error.message }, 500);
      }
      orderId = ins?.id || null;
    }

    // Auto-book courier if enabled and order is "processing"
    try {
      if (orderId && row.order_status.toLowerCase() === "processing") {
        const { data: cs } = await admin
          .from("crm_courier_settings").select("auto_book").eq("user_id", conn.user_id).maybeSingle();
        if (cs?.auto_book) {
          const fnUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/crm-book-courier`;
          fetch(fnUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-internal-secret": Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
            },
            body: JSON.stringify({ order_id: orderId, user_id: conn.user_id }),
          }).catch((e) => console.error("auto-book invoke error", e));
          console.log("[auto-book] triggered for order", orderId);
        }
      }
    } catch (e) {
      console.error("auto-book check error", e);
    }

    return json({ ok: true, woo_order_id: row.woo_order_id });
  } catch (e: any) {
    console.error("crm-woo-order-webhook error", e);
    return json({ error: e?.message || "Internal error" }, 500);
  }
});
