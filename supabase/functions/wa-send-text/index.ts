// POST /functions/v1/wa-send-text
// Body: { to: string, message: string }
// Header: Authorization: Bearer <session.api_token>
import { corsHeaders, json, resolveSession, forwardToGateway } from "../_shared/wa-proxy.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const r = await resolveSession(req);
    if ("error" in r) return r.error;
    const { to, message, text, typing } = await req.json().catch(() => ({}));
    const msg = message ?? text;
    if (!to || !msg) return json({ error: "to and message are required" }, 400);
    // Normalize: keep digits only (gateway appends @s.whatsapp.net) so customer phone shows correctly.
    const toNorm = String(to).includes("@") ? String(to) : (String(to).replace(/\D/g, "") || String(to));
    const out = await forwardToGateway(r.session.id, r.session.api_token, "send", {
      to: toNorm,
      message: msg,
      typing: typing !== false,
      presence: "composing",
    });
    return json({ ok: out.ok, session_id: r.session.id, to: toNorm, ...out.data }, out.ok ? 200 : 502);
  } catch (e: any) {
    return json({ error: e?.message || "Internal" }, 500);
  }
});
