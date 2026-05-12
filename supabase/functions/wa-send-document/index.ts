// POST /functions/v1/wa-send-document
// Body: { to, documentUrl, filename?, caption? }
import { corsHeaders, json, resolveSession, forwardToGateway } from "../_shared/wa-proxy.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const r = await resolveSession(req);
    if ("error" in r) return r.error;
    const { to, documentUrl, url, filename, caption } = await req.json().catch(() => ({}));
    const doc = documentUrl ?? url;
    if (!to || !doc) return json({ error: "to and documentUrl are required" }, 400);
    const out = await forwardToGateway(r.session.id, r.session.api_token, "send-document", { to, documentUrl: doc, filename, caption });
    return json({ ok: out.ok, session_id: r.session.id, ...out.data }, out.ok ? 200 : 502);
  } catch (e: any) {
    return json({ error: e?.message || "Internal" }, 500);
  }
});
