// Public WhatsApp webhook → upserts CRM conversation + inserts incoming message.
// Gateway POSTs here with header x-webhook-secret matching sessions.webhook_secret.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const digits = (s: string) => String(s || "").replace(/\D/g, "");

function pickFromPayload(p: any): { phone: string; text: string; type: string; mediaUrl: string | null; name: string | null; isGroup: boolean } {
  const remoteJid = p.from || p.remoteJid || p.chatId || p.key?.remoteJid || p.message?.key?.remoteJid || "";
  const isGroup = String(remoteJid).includes("@g.us");
  const phone = digits(String(remoteJid).split("@")[0] || p.sender || p.fromNumber || "");
  const text =
    p.message?.conversation ||
    p.message?.extendedTextMessage?.text ||
    p.message?.imageMessage?.caption ||
    p.text || p.body || p.messageText || p.message_text || "";
  const type = p.type || p.message_type || (p.message?.imageMessage ? "image" : "text");
  const mediaUrl = p.mediaUrl || p.image_url || p.media_url || null;
  const name = p.pushName || p.notifyName || p.senderName || null;
  return { phone, text: String(text || ""), type: String(type), mediaUrl, name, isGroup };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method === "GET") return json({ ok: true });
  try {
    const url = new URL(req.url);
    const secret = req.headers.get("x-webhook-secret") || url.searchParams.get("secret") || "";
    if (!secret) return json({ error: "missing secret" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: ses } = await admin.from("sessions")
      .select("id, user_id").eq("webhook_secret", secret).maybeSingle();
    if (!ses) return json({ error: "invalid secret" }, 401);

    const payload = await req.json().catch(() => ({}));
    const fromMe = payload?.fromMe ?? payload?.message?.key?.fromMe ?? false;
    if (fromMe) return json({ skipped: "fromMe" });

    const { phone, text, type, mediaUrl, name, isGroup } = pickFromPayload(payload);
    if (isGroup || !phone) return json({ skipped: "no-phone-or-group" });

    // Upsert conversation
    const { data: existing } = await admin.from("crm_conversations")
      .select("id, unread_count, customer_name")
      .eq("user_id", ses.user_id).eq("phone", phone).maybeSingle();

    let convId: string;
    if (existing) {
      convId = existing.id;
      await admin.from("crm_conversations").update({
        last_message: text || `[${type}]`,
        last_message_time: new Date().toISOString(),
        unread_count: (existing.unread_count || 0) + 1,
        customer_name: existing.customer_name || name,
      }).eq("id", convId);
    } else {
      const { data: created, error } = await admin.from("crm_conversations").insert({
        user_id: ses.user_id, phone, customer_name: name,
        last_message: text || `[${type}]`,
        last_message_time: new Date().toISOString(),
        unread_count: 1, status: "bot",
      }).select("id").single();
      if (error) return json({ error: error.message }, 500);
      convId = created.id;
    }

    await admin.from("crm_messages").insert({
      user_id: ses.user_id, conversation_id: convId,
      sender: "customer", message_text: text || null,
      message_type: type === "image" ? "image" : "text",
      media_url: mediaUrl,
    });

    return json({ ok: true, conversation_id: convId });
  } catch (e: any) {
    console.error("crm-whatsapp-webhook error", e);
    return json({ error: e?.message || "Internal" }, 500);
  }
});
