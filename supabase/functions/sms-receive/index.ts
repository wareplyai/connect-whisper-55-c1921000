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

function extractTxId(msg: string): string | null {
  // Common bKash/Nagad/Rocket TrxID: 8-12 alphanumeric uppercase
  const patterns = [
    /TrxID[:\s]+([A-Z0-9]{6,15})/i,
    /Transaction\s*ID[:\s]+([A-Z0-9]{6,15})/i,
    /\b([A-Z0-9]{8,12})\b/,
  ];
  for (const re of patterns) {
    const m = msg.match(re);
    if (m) return m[1].toUpperCase();
  }
  return null;
}

function extractAmount(msg: string): number | null {
  const patterns = [
    /Tk\s*([\d,]+\.?\d*)/i,
    /BDT\s*([\d,]+\.?\d*)/i,
    /([\d,]+\.?\d*)\s*BDT/i,
    /amount[:\s]+([\d,]+\.?\d*)/i,
  ];
  for (const re of patterns) {
    const m = msg.match(re);
    if (m) return parseFloat(m[1].replace(/,/g, ""));
  }
  return null;
}

function detectMethod(sender: string, msg: string): string {
  const t = (sender + " " + msg).toLowerCase();
  if (t.includes("bkash")) return "bkash";
  if (t.includes("nagad")) return "nagad";
  if (t.includes("rocket") || t.includes("dbbl")) return "rocket";
  return "unknown";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const { sender, message, api_key } = body;

    if (api_key !== API_KEY) {
      return new Response(JSON.stringify({ success: false, error: "Invalid API key" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!message) {
      return new Response(JSON.stringify({ success: false, error: "Missing message" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const transaction_id = extractTxId(message);
    const amount = extractAmount(message);
    const payment_method = detectMethod(sender || "", message);

    if (!transaction_id) {
      return new Response(JSON.stringify({ success: false, error: "Could not extract transaction ID" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert SMS (ignore duplicate)
    const { error: insErr } = await supabase
      .from("sms_transactions")
      .insert({ sender, message, transaction_id, amount, payment_method });

    if (insErr && !insErr.message.includes("duplicate")) {
      throw insErr;
    }

    let matched = false;

    // Auto-match pending orders (one-off products)
    const { data: orders } = await supabase
      .from("orders")
      .select("*")
      .eq("transaction_id", transaction_id)
      .eq("status", "pending");

    if (orders && orders.length > 0) {
      for (const order of orders) {
        if (Math.abs(Number(order.amount) - Number(amount || 0)) <= 10) {
          await supabase.from("orders").update({
            status: "confirmed",
            confirmed_at: new Date().toISOString(),
          }).eq("id", order.id);
          await supabase.from("sms_transactions").update({ is_used: true }).eq("transaction_id", transaction_id);
          matched = true;
        }
      }
    }

    // Auto-match pending plan payment_transactions (subscriptions)
    const USD_TO_BDT = 122;
    const { data: ptxs } = await supabase
      .from("payment_transactions")
      .select("*")
      .eq("transaction_id", transaction_id)
      .eq("status", "pending");

    if (ptxs && ptxs.length > 0) {
      for (const ptx of ptxs) {
        const expectedBdt = Number(ptx.amount) * USD_TO_BDT;
        if (amount && Math.abs(Number(amount) - expectedBdt) > 50) continue;

        const { data: plan } = await supabase
          .from("plan_pricing").select("*").eq("plan_name", ptx.plan).maybeSingle();
        if (!plan) continue;

        await supabase.from("payment_transactions").update({
          status: "approved",
          reviewed_at: new Date().toISOString(),
          admin_note: "Auto-verified via SMS",
        }).eq("id", ptx.id);
        await supabase.from("sms_transactions").update({ is_used: true }).eq("transaction_id", transaction_id);

        const { data: existing } = await supabase
          .from("subscriptions").select("id").eq("user_id", ptx.user_id)
          .order("created_at", { ascending: false }).limit(1).maybeSingle();
        if (existing) {
          await supabase.from("subscriptions").update({
            plan: ptx.plan, max_sessions: plan.max_sessions, status: "active",
          }).eq("id", existing.id);
        } else {
          await supabase.from("subscriptions").insert({
            user_id: ptx.user_id, plan: ptx.plan, max_sessions: plan.max_sessions, status: "active",
          });
        }
        await supabase.from("profiles").update({
          plan: ptx.plan, max_sessions: plan.max_sessions,
        }).eq("id", ptx.user_id);
        await supabase.from("sales").insert({
          user_id: ptx.user_id, plan: ptx.plan, amount: ptx.amount,
          payment_method: ptx.payment_method, payment_status: "paid",
        });
        matched = true;
      }
    }

    return new Response(JSON.stringify({ success: true, transaction_id, amount, matched }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
