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
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Invalid auth" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: ha } = await admin
      .from("headadmin")
      .select("id")
      .eq("auth_user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();
    if (!ha) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { user_id, plan } = await req.json();
    if (!user_id || !plan) {
      return new Response(JSON.stringify({ error: "Missing user_id or plan" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get plan details
    const { data: planRow } = await admin
      .from("plan_pricing")
      .select("plan_name, max_sessions")
      .eq("plan_name", plan)
      .maybeSingle();

    const max_sessions = planRow?.max_sessions ?? 1;

    // Update profile
    await admin.from("profiles").update({ plan, max_sessions }).eq("id", user_id);

    // Expire any existing active subscriptions
    await admin.from("subscriptions")
      .update({ status: "expired" })
      .eq("user_id", user_id)
      .in("status", ["active", "trial_active"]);

    if (plan === "free") {
      // Disconnect all sessions for free plan
      await admin.from("sessions").update({ status: "disconnected" }).eq("user_id", user_id);
    } else if (plan === "trial") {
      await admin.from("subscriptions").insert({
        user_id, plan: "trial", max_sessions, status: "trial_active",
        trial_started_at: new Date().toISOString(),
        trial_ends_at: new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
      });
    } else {
      await admin.from("subscriptions").insert({
        user_id, plan, max_sessions, status: "active",
      });
    }

    await admin.from("activity_logs").insert({
      action: "user.plan_change", actor_type: "headadmin", actor_id: user.id,
      target_type: "user", target_id: user_id, details: { plan, max_sessions },
    });

    return new Response(JSON.stringify({ success: true, plan, max_sessions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
