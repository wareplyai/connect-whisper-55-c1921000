import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const { session_id, event_type = "messages.received" } = body;
    if (!session_id) {
      return new Response(JSON.stringify({ error: "session_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: session, error: sErr } = await admin
      .from("sessions")
      .select("*")
      .eq("id", session_id)
      .eq("user_id", userData.user.id)
      .maybeSingle();

    if (sErr || !session) {
      return new Response(JSON.stringify({ error: "Session not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = String(session.webhook_url || "").trim();
    if (!url) {
      return new Response(JSON.stringify({ error: "No webhook URL configured" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!session.enable_webhook) {
      return new Response(JSON.stringify({ error: "Webhook is disabled. Enable it first." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const samplePayload = {
      event: event_type,
      test: true,
      session_id,
      from: "8801739049039",
      message: "🧪 This is a test event from WaReply",
      timestamp: new Date().toISOString(),
      raw_payload: {
        key: {
          remoteJid: "8801739049039@s.whatsapp.net",
          fromMe: false,
          id: "TEST_" + crypto.randomUUID(),
        },
        message: { conversation: "🧪 This is a test event from WaReply" },
        messageTimestamp: Math.floor(Date.now() / 1000),
        pushName: "Test User",
      },
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    let status = 0;
    let responseText = "";
    let errorMsg: string | null = null;

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-WaReply-Event": event_type,
          "X-WaReply-Test": "true",
          ...(session.webhook_secret ? { "X-Webhook-Signature": session.webhook_secret } : {}),
        },
        body: JSON.stringify(samplePayload),
        signal: controller.signal,
      });
      status = res.status;
      responseText = (await res.text()).slice(0, 1000);
    } catch (e: any) {
      errorMsg = e?.name === "AbortError" ? "Request timed out (15s)" : (e?.message || String(e));
    } finally {
      clearTimeout(timeoutId);
    }

    await admin.from("webhook_logs").insert({
      session_id,
      event_type,
      delivered: status >= 200 && status < 300,
      payload: { ...samplePayload, _delivery: { url, status, response: responseText, error: errorMsg } },
    }).then(() => {}, () => {});

    const ok = status >= 200 && status < 300;
    return new Response(
      JSON.stringify({
        ok,
        status,
        url,
        response: responseText,
        error: errorMsg,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
