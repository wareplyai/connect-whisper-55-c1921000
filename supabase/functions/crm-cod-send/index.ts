// Authenticated: send COD confirmation prompt to selected orders.
// Creates a crm_bot_state row per order so YES/NO replies can be matched.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const COD_TEXT =
  "আপনার অর্ডার আগামীকাল ডেলিভারি হবে। রিসিভ করবেন? YES লিখুন অথবা NO লিখুন";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: claims } = await userClient.auth.getClaims(auth.replace("Bearer ", ""));
    const userId = claims?.claims?.sub;
    if (!userId) return json({ error: "Unauthorized" }, 401);

    const { order_ids } = (await req.json().catch(() => ({}))) as { order_ids?: string[] };
    if (!order_ids?.length) return json({ error: "order_ids required" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: orders } = await admin.from("crm_orders").select("*")
      .in("id", order_ids).eq("user_id", userId);
    if (!orders?.length) return json({ error: "no orders" }, 404);

    // Resolve a connected session for sending
    const { data: sess } = await admin.from("sessions")
      .select("id, api_token").eq("user_id", userId).eq("status", "connected")
      .order("last_active", { ascending: false, nullsFirst: false }).limit(1).maybeSingle();

    const GATEWAY = Deno.env.get("WHATSAPP_GATEWAY_URL") || "https://api.wareplyai.com";
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (sess?.api_token) headers.Authorization = `Bearer ${sess.api_token}`;

    let sent = 0; let stub = 0; let skipped = 0;
    for (const o of orders) {
      const phone = (o as any).customer_phone;
      if (!phone) { skipped++; continue; }

      // upsert bot state for this customer & order
      await admin.from("crm_bot_state").upsert({
        user_id: userId, phone, flow: "cod_confirm", step: "await_yesno",
        order_id: o.id, data: { order_number: o.woo_order_id },
      }, { onConflict: "user_id,phone,flow" });

      if (sess) {
        try {
          const r = await fetch(`${GATEWAY}/api/session/${sess.id}/send`, {
            method: "POST", headers,
            body: JSON.stringify({ to: phone, message: COD_TEXT }),
          });
          if (r.ok) sent++; else { stub++; console.log("[gateway non-ok]", r.status); }
          await admin.from("message_logs").insert({
            user_id: userId, session_id: sess.id, to_number: phone,
            message_type: "text", payload: { text: COD_TEXT },
            status: r.ok ? "sent" : "failed",
          });
        } catch (e) {
          stub++;
          console.log("[stub] WA send →", phone, COD_TEXT, e);
        }
      } else {
        stub++;
        console.log("[stub] no session, would send →", phone, COD_TEXT);
      }
    }

    return json({ ok: true, sent, stub, skipped, total: orders.length });
  } catch (e: any) {
    console.error("crm-cod-send error", e);
    return json({ error: e?.message || "internal" }, 500);
  }
});
