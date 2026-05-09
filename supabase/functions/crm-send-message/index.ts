// Authenticated send-from-CRM endpoint. Sends a WhatsApp message via the
// gateway using the user's most recent connected session and logs it into
// crm_messages. Called by the CRM Inbox UI.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

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

    const body = await req.json().catch(() => ({}));
    const { conversation_id, text, session_id } = body || {};
    if (!conversation_id || !text) return json({ error: "conversation_id and text required" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: conv } = await admin.from("crm_conversations")
      .select("id, phone, user_id").eq("id", conversation_id).maybeSingle();
    if (!conv || conv.user_id !== userId) return json({ error: "conversation not found" }, 404);

    let sessionId = session_id as string | undefined;
    let apiToken: string | null = null;
    if (sessionId) {
      const { data: s } = await admin.from("sessions").select("id, api_token, user_id").eq("id", sessionId).maybeSingle();
      if (!s || s.user_id !== userId) return json({ error: "session not allowed" }, 403);
      apiToken = s.api_token;
    } else {
      const { data: s } = await admin.from("sessions")
        .select("id, api_token").eq("user_id", userId).eq("status", "connected")
        .order("last_active", { ascending: false, nullsFirst: false }).limit(1).maybeSingle();
      if (!s) return json({ error: "no connected WhatsApp session" }, 400);
      sessionId = s.id; apiToken = s.api_token;
    }

    const GATEWAY = Deno.env.get("WHATSAPP_GATEWAY_URL") || "https://alvi-waapi.duckdns.org/waapi";
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (apiToken) headers.Authorization = `Bearer ${apiToken}`;
    let gatewayOk = false; let gatewayError: string | null = null;
    try {
      const r = await fetch(`${GATEWAY}/api/session/${sessionId}/send`, {
        method: "POST", headers,
        body: JSON.stringify({ to: conv.phone, message: text }),
      });
      const data = await r.json().catch(() => ({}));
      gatewayOk = r.ok && data?.success !== false && data?.error == null;
      if (!gatewayOk) gatewayError = data?.error || data?.message || `gateway ${r.status}`;
    } catch (e: any) {
      gatewayError = e?.message || "gateway unreachable";
    }

    // Always log the agent message so the UI reflects intent
    await admin.from("crm_messages").insert({
      user_id: userId, conversation_id: conv.id,
      sender: "agent", message_text: text, message_type: "text",
    });
    await admin.from("crm_conversations").update({
      last_message: text, last_message_time: new Date().toISOString(),
    }).eq("id", conv.id);

    if (!gatewayOk) return json({ ok: false, error: gatewayError }, 502);
    return json({ ok: true });
  } catch (e: any) {
    console.error("crm-send-message error", e);
    return json({ error: e?.message || "Internal" }, 500);
  }
});
