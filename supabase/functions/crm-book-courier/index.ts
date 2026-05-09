import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function bookPathao(s: any, order: any) {
  if (!s.pathao_client_id || !s.pathao_client_secret || !s.pathao_store_id) {
    const tracking = `PATHAO-STUB-${Date.now().toString().slice(-8)}`;
    console.log("[stub] Pathao create order →", { order_id: order.id, tracking });
    return { tracking_id: tracking, stub: true };
  }
  // Real Pathao token + create call
  const tokenRes = await fetch("https://api-hermes.pathao.com/aladdin/api/v1/issue-token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: s.pathao_client_id,
      client_secret: s.pathao_client_secret,
      grant_type: "password",
    }),
  });
  const tokenJson = await tokenRes.json();
  const accessToken = tokenJson.access_token;
  if (!accessToken) throw new Error("Pathao auth failed");

  const createRes = await fetch("https://api-hermes.pathao.com/aladdin/api/v1/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({
      store_id: s.pathao_store_id,
      recipient_name: order.customer_name || "Customer",
      recipient_phone: order.customer_phone,
      recipient_address: order.customer_address || "N/A",
      delivery_type: 48,
      item_type: 2,
      item_quantity: 1,
      item_weight: 0.5,
      amount_to_collect: order.payment_method === "COD" ? Number(order.total_amount) : 0,
      item_description: order.notes || "Order",
    }),
  });
  const createJson = await createRes.json();
  const tracking = createJson?.data?.consignment_id || createJson?.data?.merchant_order_id;
  if (!tracking) throw new Error(`Pathao create failed: ${JSON.stringify(createJson)}`);
  return { tracking_id: tracking, raw: createJson };
}

async function bookSteadfast(s: any, order: any) {
  if (!s.steadfast_api_key || !s.steadfast_secret) {
    const tracking = `STEADFAST-STUB-${Date.now().toString().slice(-8)}`;
    console.log("[stub] Steadfast create order →", { order_id: order.id, tracking });
    return { tracking_id: tracking, stub: true };
  }
  const res = await fetch("https://portal.steadfast.com.bd/api/v1/create_order", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Api-Key": s.steadfast_api_key,
      "Secret-Key": s.steadfast_secret,
    },
    body: JSON.stringify({
      invoice: order.woo_order_id || order.id,
      recipient_name: order.customer_name || "Customer",
      recipient_phone: order.customer_phone,
      recipient_address: order.customer_address || "N/A",
      cod_amount: order.payment_method === "COD" ? Number(order.total_amount) : 0,
      note: order.notes || "",
    }),
  });
  const json = await res.json();
  const tracking = json?.consignment?.tracking_code || json?.consignment?.consignment_id;
  if (!tracking) throw new Error(`Steadfast create failed: ${JSON.stringify(json)}`);
  return { tracking_id: String(tracking), raw: json };
}

async function notifyCustomer(supabase: any, userId: string, order: any, tracking: string, courier: string) {
  const phone = order.customer_phone;
  if (!phone) return;
  const text = `📦 Hi ${order.customer_name || ""}, your order has been shipped via ${courier.toUpperCase()}. Tracking: ${tracking}`;

  // Find/create conversation
  const { data: conv } = await supabase
    .from("crm_conversations")
    .select("id")
    .eq("user_id", userId)
    .eq("phone", phone)
    .maybeSingle();

  let conversationId = conv?.id;
  if (!conversationId) {
    const { data: newConv } = await supabase
      .from("crm_conversations")
      .insert({ user_id: userId, phone, customer_name: order.customer_name, last_message: text, last_message_time: new Date().toISOString() })
      .select("id")
      .single();
    conversationId = newConv?.id;
  } else {
    await supabase.from("crm_conversations").update({ last_message: text, last_message_time: new Date().toISOString() }).eq("id", conversationId);
  }

  await supabase.from("crm_messages").insert({
    user_id: userId,
    conversation_id: conversationId,
    sender: "agent",
    message_text: text,
    message_type: "text",
  });

  const gateway = Deno.env.get("WHATSAPP_GATEWAY_URL");
  if (!gateway) {
    console.log("[stub] WhatsApp send →", phone, text);
    return;
  }
  const { data: session } = await supabase.from("sessions").select("id").eq("user_id", userId).eq("status", "connected").maybeSingle();
  if (!session) {
    console.log("[stub] no connected session, skipping WA send");
    return;
  }
  try {
    await fetch(`${gateway}/api/session/${session.id}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: phone, text }),
    });
  } catch (e) {
    console.error("WA send error", e);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    const isInternal = req.headers.get("x-internal-secret") === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    let userId: string | null = null;
    if (isInternal) {
      const body = await req.clone().json();
      userId = body.user_id;
    } else {
      if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
      userId = data?.claims?.sub || null;
    }
    if (!userId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { order_id, courier: courierOverride } = await req.json();
    if (!order_id) return new Response(JSON.stringify({ error: "order_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: order, error: oErr } = await admin.from("crm_orders").select("*").eq("id", order_id).eq("user_id", userId).maybeSingle();
    if (oErr || !order) return new Response(JSON.stringify({ error: "Order not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: settings } = await admin.from("crm_courier_settings").select("*").eq("user_id", userId).maybeSingle();
    const courier = courierOverride || settings?.default_courier || "pathao";

    let result: { tracking_id: string; stub?: boolean; raw?: any };
    if (courier === "steadfast") {
      result = await bookSteadfast(settings || {}, order);
    } else {
      result = await bookPathao(settings || {}, order);
    }

    await admin.from("crm_orders").update({
      courier_name: courier,
      tracking_id: result.tracking_id,
      courier_status: "in_transit",
      order_status: "shipped",
    }).eq("id", order_id);

    await admin.from("crm_courier_bookings").insert({
      user_id: userId,
      order_id,
      courier,
      tracking_id: result.tracking_id,
      status: "booked",
      cod_amount: order.payment_method === "COD" ? Number(order.total_amount) : 0,
      raw_response: result.raw || { stub: !!result.stub },
    });

    await notifyCustomer(admin, userId, order, result.tracking_id, courier);

    return new Response(JSON.stringify({ success: true, tracking_id: result.tracking_id, stub: !!result.stub }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("book-courier error", e);
    return new Response(JSON.stringify({ error: e.message || "Internal error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
