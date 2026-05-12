// POST /functions/v1/wa-send-voice
// Body: { to, audioUrl }
import { corsHeaders, json, resolveSession, forwardToGateway } from "../_shared/wa-proxy.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const r = await resolveSession(req);
    if ("error" in r) return r.error;
    const { to, audioUrl, url } = await req.json().catch(() => ({}));
    const audio = audioUrl ?? url;
    if (!to || !audio) return json({ error: "to and audioUrl are required" }, 400);
    const out = await forwardToGateway(r.session.id, r.session.api_token, "send-voice", { to, audioUrl: audio });
    return json({ ok: out.ok, session_id: r.session.id, ...out.data }, out.ok ? 200 : 502);
  } catch (e: any) {
    return json({ error: e?.message || "Internal" }, 500);
  }
});
