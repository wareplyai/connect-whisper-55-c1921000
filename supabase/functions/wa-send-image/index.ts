// POST /functions/v1/wa-send-image
// Body: { to, imageUrl, caption? }
import { corsHeaders, json, resolveSession, forwardToGateway } from "../_shared/wa-proxy.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const r = await resolveSession(req);
    if ("error" in r) return r.error;
    const { to, imageUrl, url, caption } = await req.json().catch(() => ({}));
    const img = imageUrl ?? url;
    if (!to || !img) return json({ error: "to and imageUrl are required" }, 400);
    const out = await forwardToGateway(r.session.id, r.session.api_token, "send-image", { to, imageUrl: img, caption });
    if (out.ok) {
      await r.admin.from("message_logs").insert({
        user_id: r.session.user_id,
        session_id: r.session.id,
        to_number: String(to).replace(/\D/g, "") || String(to),
        message_type: "image",
        payload: { url: img, caption: caption || null, source: "api_wa_send_image", gateway_response: out.data },
        status: "sent",
        image_url: img,
        image_caption: caption || null,
      }).then(() => {}, () => {});
    }
    return json({ ok: out.ok, session_id: r.session.id, ...out.data }, out.ok ? 200 : 502);
  } catch (e: any) {
    return json({ error: e?.message || "Internal" }, 500);
  }
});
