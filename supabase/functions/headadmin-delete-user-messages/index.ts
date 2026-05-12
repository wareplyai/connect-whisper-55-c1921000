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

    // Verify caller is headadmin
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

    const body = await req.json();
    const { user_id, from_date, to_date, scope } = body || {};
    // scope: 'all' | 'message_logs' | 'incoming_messages'  (default 'all')
    if (!user_id) {
      return new Response(JSON.stringify({ error: "Missing user_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!from_date || !to_date) {
      return new Response(JSON.stringify({ error: "Missing from_date or to_date" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fromIso = new Date(from_date).toISOString();
    // include the entire 'to_date' day
    const toEnd = new Date(to_date);
    toEnd.setHours(23, 59, 59, 999);
    const toIso = toEnd.toISOString();

    const result: Record<string, number> = { message_logs: 0, incoming_messages: 0 };
    const targetScope = scope || "all";
    const BATCH = 500;
    const MAX_MS = 50_000; // stay under edge function/statement timeout
    const started = Date.now();
    let truncated = false;

    const batchDelete = async (
      table: "message_logs" | "incoming_messages",
      tsCol: "created_at" | "received_at",
    ) => {
      while (true) {
        if (Date.now() - started > MAX_MS) { truncated = true; return; }
        const { data: ids, error: selErr } = await admin
          .from(table)
          .select("id")
          .eq("user_id", user_id)
          .gte(tsCol, fromIso)
          .lte(tsCol, toIso)
          .limit(BATCH);
        if (selErr) throw selErr;
        if (!ids || ids.length === 0) return;
        const idList = ids.map((r: any) => r.id);
        const { error: delErr } = await admin.from(table).delete().in("id", idList);
        if (delErr) throw delErr;
        result[table] += idList.length;
        if (idList.length < BATCH) return;
      }
    };

    if (targetScope === "all" || targetScope === "message_logs") {
      await batchDelete("message_logs", "created_at");
    }
    if (targetScope === "all" || targetScope === "incoming_messages") {
      await batchDelete("incoming_messages", "received_at");
    }

    await admin.from("activity_logs").insert({
      action: "messages.bulk_delete",
      actor_type: "headadmin",
      actor_id: user.id,
      target_type: "user",
      target_id: user_id,
      metadata: { from: fromIso, to: toIso, scope: targetScope, deleted: result },
    });

    return new Response(JSON.stringify({ success: true, deleted: result, truncated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
