// Send a manual reply from the dashboard Inbox UI to a WhatsApp customer.
// Authenticated end-user call. Verifies the caller owns the session, then
// forwards the message via the WhatsApp gateway and logs to message_logs.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResp(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function recipientVariants(input: string): string[] {
  const digits = String(input ?? "").replace(/\D/g, "");
  if (!digits) return [String(input ?? "")].filter(Boolean);
  const variants = [digits, `${digits}@s.whatsapp.net`, `+${digits}`];
  if (digits.startsWith("0") && digits.length >= 10) {
    variants.push(`88${digits.slice(1)}`, `+88${digits.slice(1)}`, `${digits.slice(1)}@s.whatsapp.net`);
  }
  return [...new Set(variants.filter(Boolean))];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResp({ error: "Method not allowed" }, 405);

  try {
    const auth = req.headers.get("Authorization") || "";
    const jwt = auth.replace(/^Bearer\s+/i, "");
    if (!jwt) return jsonResp({ error: "Missing auth token" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: `Bearer ${jwt}` } } }
    );
    const { data: userRes, error: uErr } = await userClient.auth.getUser();
    if (uErr || !userRes?.user) return jsonResp({ error: "Invalid auth" }, 401);
    const userId = userRes.user.id;

    const body = await req.json().catch(() => ({}));
    const sessionId = String(body.session_id || "").trim();
    const toNumber = String(body.to_number || "").trim();
    const message = String(body.message || "").trim();
    if (!sessionId || !toNumber || !message) {
      return jsonResp({ error: "session_id, to_number and message are required" }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: session } = await admin
      .from("sessions")
      .select("id, user_id, api_token, status")
      .eq("id", sessionId)
      .maybeSingle();
    if (!session) return jsonResp({ error: "Session not found" }, 404);
    if (session.user_id !== userId) return jsonResp({ error: "Not authorized" }, 403);

    const GATEWAY = Deno.env.get("WHATSAPP_GATEWAY_URL") || "https://alvi-waapi.duckdns.org";
    const errors: string[] = [];
    let sentTo: string | null = null;

    for (const candidate of recipientVariants(toNumber)) {
      try {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (session.api_token) headers.Authorization = `Bearer ${session.api_token}`;
        const r = await fetch(`${GATEWAY}/api/session/${sessionId}/send`, {
          method: "POST",
          headers,
          body: JSON.stringify({ to: candidate, message }),
        });
        const data = await r.json().catch(() => ({}));
        const failed = data?.success === false || data?.ok === false || data?.sent === false ||
          data?.status === "failed" || Boolean(data?.error);
        if (r.ok && !failed) { sentTo = candidate; break; }
        errors.push(`${candidate}: ${data?.error || data?.message || `gateway ${r.status}`}`);
      } catch (e: any) {
        errors.push(`${candidate}: ${e?.message || "gateway unreachable"}`);
      }
    }

    if (!sentTo) {
      return jsonResp({ ok: false, error: errors.join("; ") || "gateway send failed" }, 502);
    }

    await admin.from("message_logs").insert({
      user_id: userId,
      session_id: sessionId,
      to_number: sentTo,
      message_type: "text",
      payload: { text: message, source: "manual" },
      status: "sent",
    });

    return jsonResp({ ok: true, sent_to: sentTo });
  } catch (e: any) {
    console.error("send-manual-reply error:", e);
    return jsonResp({ error: e?.message || "Internal error" }, 500);
  }
});
