import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const API_KEY = Deno.env.get("SMS_API_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const { phone_number, transaction_id, amount, order_id, payment_method, api_key } = body;

    if (api_key !== API_KEY) {
      return new Response(JSON.stringify({ success: false, error: "Invalid API key" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!order_id || !transaction_id) {
      return new Response(JSON.stringify({ success: false, error: "Missing order_id or transaction_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const txid = String(transaction_id).toUpperCase().trim();

    // Update the order with submitted info
    const { data: order, error: ordErr } = await supabase
      .from("orders")
      .update({
        transaction_id: txid,
        buyer_phone: phone_number,
        payment_method,
      })
      .eq("order_id", order_id)
      .select()
      .single();

    if (ordErr || !order) {
      return new Response(JSON.stringify({ success: false, message: "Order not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Look for matching SMS
    const { data: sms } = await supabase
      .from("sms_transactions")
      .select("*")
      .eq("transaction_id", txid)
      .eq("is_used", false)
      .maybeSingle();

    if (sms) {
      const smsAmount = Number(sms.amount || 0);
      const orderAmount = Number(order.amount || amount || 0);
      if (Math.abs(smsAmount - orderAmount) <= 10) {
        const { data: updated } = await supabase
          .from("orders")
          .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
          .eq("id", order.id)
          .select()
          .single();
        await supabase.from("sms_transactions").update({ is_used: true }).eq("id", sms.id);
        return new Response(JSON.stringify({ success: true, message: "Payment confirmed", order: updated }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ success: false, message: "Amount mismatch", order }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: false, message: "Transaction not found yet, waiting for SMS", order }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
