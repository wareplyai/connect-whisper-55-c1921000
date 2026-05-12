// Send media (image/voice/video/document) from Inbox to a WhatsApp customer
// via the Baileys gateway. Mirrors send-manual-reply pattern.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

type MediaKind = "image" | "voice" | "video" | "document";

const ENDPOINT: Record<MediaKind, string> = {
  image: "send-image",
  voice: "send-voice",
  video: "send-video",
  document: "send-document",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const auth = req.headers.get("Authorization") || "";
    const jwt = auth.replace(/^Bearer\s+/i, "");
    if (!jwt) return json({ error: "Missing auth token" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: `Bearer ${jwt}` } } },
    );
    const { data: userRes, error: uErr } = await userClient.auth.getUser();
    if (uErr || !userRes?.user) return json({ error: "Invalid auth" }, 401);
    const userId = userRes.user.id;

    const body = await req.json().catch(() => ({}));
    const sessionId = String(body.session_id || "").trim();
    const toNumber = String(body.to_number || "").trim();
    const url = String(body.url || "").trim();
    const kind = String(body.kind || "").trim() as MediaKind;
    const caption = String(body.caption || "").trim();
    const filename = String(body.filename || "").trim();

    if (!sessionId || !toNumber || !url || !ENDPOINT[kind]) {
      return json({ error: "session_id, to_number, url and valid kind are required" }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: session } = await admin
      .from("sessions")
      .select("id, user_id, api_token")
      .eq("id", sessionId)
      .maybeSingle();
    if (!session) return json({ error: "Session not found" }, 404);
    if (session.user_id !== userId) return json({ error: "Not authorized" }, 403);

    const GATEWAY = Deno.env.get("WHATSAPP_GATEWAY_URL") || "https://api.wareplyai.com";
    const to = String(toNumber).replace(/\D/g, "") || toNumber;

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (session.api_token) headers.Authorization = `Bearer ${session.api_token}`;

    let payload: Record<string, unknown> = { to };
    if (kind === "image") { payload.imageUrl = url; if (caption) payload.caption = caption; }
    if (kind === "voice") { payload.audioUrl = url; }
    if (kind === "video") { payload.videoUrl = url; if (caption) payload.caption = caption; }
    if (kind === "document") {
      payload.documentUrl = url;
      if (filename) payload.filename = filename;
      if (caption) payload.caption = caption;
    }

    const r = await fetch(`${GATEWAY}/api/session/${sessionId}/${ENDPOINT[kind]}`, {
      method: "POST", headers, body: JSON.stringify(payload),
    });
    const data = await r.json().catch(() => ({}));
    const failed = data?.success === false || data?.ok === false || data?.sent === false ||
      data?.status === "failed" || Boolean(data?.error);
    if (!r.ok || failed) {
      return json({ ok: false, error: data?.error || data?.message || `gateway ${r.status}` }, 502);
    }

    const messageType = kind === "voice" ? "audio" : kind;
    await admin.from("message_logs").insert({
      user_id: userId,
      session_id: sessionId,
      to_number: to,
      message_type: messageType,
      payload: { url, caption: caption || null, filename: filename || null, kind, source: "manual" },
      status: "sent",
      image_url: kind === "image" ? url : null,
      image_caption: caption || null,
    });

    return json({ ok: true, sent_to: to });
  } catch (e: any) {
    console.error("send-manual-media error:", e);
    return json({ error: e?.message || "Internal error" }, 500);
  }
});
