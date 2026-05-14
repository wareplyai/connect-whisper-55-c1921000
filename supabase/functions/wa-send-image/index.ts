// POST /functions/v1/wa-send-image
// Body: { to, imageUrl, caption? }
import {
  corsHeaders,
  json,
  resolveSession,
  forwardToGateway,
  enforceAccountProtection,
  applySendPreferences,
} from "../_shared/wa-proxy.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const r = await resolveSession(req);
    if ((r as any).error) return (r as any).error as Response;
    const { session, admin } = r as any;
    const { to, imageUrl, url, caption } = await req.json().catch(() => ({}));
    const img = imageUrl ?? url;
    if (!to || !img) return json({ error: "to and imageUrl are required" }, 400);

    const protectionResp = await enforceAccountProtection(admin, session);
    if (protectionResp) return protectionResp;

    const toNorm = String(to).includes("@") ? String(to) : (String(to).replace(/\D/g, "") || String(to));

    await applySendPreferences({
      session,
      to: toNorm,
      messageLength: caption ? String(caption).length : 20,
    });

    const out = await forwardToGateway(session.id, session.api_token, "send-image", { to: toNorm, imageUrl: img, caption });
    if (out.ok) {
      await admin.from("message_logs").insert({
        user_id: session.user_id,
        session_id: session.id,
        to_number: String(toNorm).replace(/\D/g, "") || String(toNorm),
        message_type: "image",
        payload: { url: img, caption: caption || null, source: "api_wa_send_image", gateway_response: out.data },
        status: "sent",
        image_url: img,
        image_caption: caption || null,
      }).then(() => {}, () => {});
    }
    return json({ ok: out.ok, session_id: session.id, ...(out.data || {}) }, out.ok ? 200 : 502);
  } catch (e: any) {
    return json({ error: e?.message || "Internal" }, 500);
  }
});
