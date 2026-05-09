import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Auth client to identify the user
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ success: false, error: "Invalid auth" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { payment_tx_id } = body;
    if (!payment_tx_id) {
      return new Response(JSON.stringify({ success: false, error: "Missing payment_tx_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Service client for privileged ops
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: tx, error: txErr } = await admin
      .from("payment_transactions")
      .select("*")
      .eq("id", payment_tx_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (txErr || !tx) {
      return new Response(JSON.stringify({ success: false, error: "Transaction not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (tx.status === "approved") {
      return new Response(JSON.stringify({ success: true, matched: true, message: "Already approved" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const trx = String(tx.transaction_id || "").toUpperCase().trim();
    if (!trx) {
      return new Response(JSON.stringify({ success: false, matched: false, message: "No transaction ID" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Look for matching SMS
    const { data: sms } = await admin
      .from("sms_transactions")
      .select("*")
      .eq("transaction_id", trx)
      .eq("is_used", false)
      .maybeSingle();

    if (!sms) {
      return new Response(JSON.stringify({
        success: true, matched: false,
        message: "Waiting for SMS confirmation. Will auto-activate within 1-2 minutes when SMS arrives.",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // SMS amounts are in BDT. Convert tx.amount → BDT based on the customer's chosen currency.
    const USD_TO_BDT = 122;
    const expectedBdt = (tx.currency === "BDT")
      ? Number(tx.amount)
      : Number(tx.amount) * USD_TO_BDT;
    const smsAmount = Number(sms.amount || 0);
    if (smsAmount > 0 && Math.abs(smsAmount - expectedBdt) > 50) {
      return new Response(JSON.stringify({
        success: false, matched: false,
        message: `Amount mismatch: SMS shows ৳${smsAmount}, expected ৳${expectedBdt.toFixed(0)}`,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get plan details
    const { data: plan } = await admin
      .from("plan_pricing")
      .select("*")
      .eq("plan_name", tx.plan)
      .maybeSingle();
    if (!plan) {
      return new Response(JSON.stringify({ success: false, error: "Plan not found" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Approve payment
    await admin.from("payment_transactions").update({
      status: "approved",
      reviewed_at: new Date().toISOString(),
      admin_note: "Auto-verified via SMS",
    }).eq("id", tx.id);

    // Mark SMS as used
    await admin.from("sms_transactions").update({ is_used: true }).eq("id", sms.id);

    // Activate subscription
    const { data: existing } = await admin
      .from("subscriptions")
      .select("id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      await admin.from("subscriptions").update({
        plan: tx.plan, max_sessions: plan.max_sessions, status: "active",
      }).eq("id", existing.id);
    } else {
      await admin.from("subscriptions").insert({
        user_id: user.id, plan: tx.plan, max_sessions: plan.max_sessions, status: "active",
      });
    }

    await admin.from("profiles").update({
      plan: tx.plan, max_sessions: plan.max_sessions,
    }).eq("id", user.id);

    await admin.from("sales").insert({
      user_id: user.id, plan: tx.plan, amount: tx.amount,
      payment_method: tx.payment_method, payment_status: "paid",
    });

    return new Response(JSON.stringify({
      success: true, matched: true, message: "Payment auto-verified! Plan activated.",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
