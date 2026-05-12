// POST /functions/v1/wa-send-text
// Body: { to: string, message: string }
// Header: Authorization: Bearer <session.api_token>
import { corsHeaders, json, resolveSession, forwardToGateway } from "../_shared/wa-proxy.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const r = await resolveSession(req);
    if ("error" in r) return r.error;
    const { to, message, text } = await req.json().catch(() => ({}));
    const msg = message ?? text;
    if (!to || !msg) return json({ error: "to and message are required" }, 400);
    const out = await forwardToGateway(r.session.id, r.session.api_token, "send", { to, message: msg });
    return json({ ok: out.ok, session_id: r.session.id, ...out.data }, out.ok ? 200 : 502);
  } catch (e: any) {
    return json({ error: e?.message || "Internal" }, 500);
  }
});
