// POST /functions/v1/wa-download-media
// Body: { message_id: string, jid?: string }
// Header: Authorization: Bearer <session.api_token>
//
// Returns the decrypted media bytes for a WhatsApp message (image/video/audio/doc).
// Used by automations (n8n etc.) that received a webhook payload with an
// encrypted mmg.whatsapp.net/...enc URL and need the actual file.
import { corsHeaders, json, resolveSession, GATEWAY } from "../_shared/wa-proxy.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const r = await resolveSession(req);
    if ("error" in r) return r.error;

    let body: any = {};
    if (req.method === "GET") {
      const u = new URL(req.url);
      body = {
        message_id: u.searchParams.get("message_id") || u.searchParams.get("messageId"),
        jid: u.searchParams.get("jid") || undefined,
      };
    } else {
      body = await req.json().catch(() => ({}));
    }

    const messageId = String(body.message_id || body.messageId || "").trim();
    const jid = body.jid ? String(body.jid).trim() : "";
    if (!messageId) return json({ error: "message_id is required" }, 400);

    const sid = r.session.id;
    const headers: Record<string, string> = { Authorization: `Bearer ${r.session.api_token}` };

    const candidates = [
      `${GATEWAY}/api/session/${sid}/messages/${messageId}/media`,
      `${GATEWAY}/api/session/${sid}/media/${messageId}`,
      `${GATEWAY}/api/${sid}/messages/${messageId}/media`,
    ];
    if (jid) {
      candidates.unshift(
        `${GATEWAY}/api/session/${sid}/chats/${encodeURIComponent(jid)}/messages/${messageId}/media`,
      );
    }

    let lastStatus = 0;
    let lastText = "";
    for (const url of candidates) {
      try {
        const res = await fetch(url, { method: "GET", headers });
        const ctype = res.headers.get("content-type") || "";
        if (res.ok && !ctype.includes("application/json")) {
          // Binary stream — proxy as-is.
          const buf = await res.arrayBuffer();
          return new Response(buf, {
            status: 200,
            headers: {
              ...corsHeaders,
              "Content-Type": ctype || "application/octet-stream",
              "Content-Length": String(buf.byteLength),
              "Cache-Control": "private, max-age=300",
            },
          });
        }
        if (res.ok && ctype.includes("application/json")) {
          // Some gateways return { url, base64, mimetype } JSON
          const data = await res.json().catch(() => null);
          if (data) return json(data, 200);
        }
        lastStatus = res.status;
        lastText = await res.text().catch(() => "");
      } catch (e) {
        lastText = (e as Error)?.message || "fetch failed";
      }
    }
    return json(
      { error: "Media not found or decryption failed", gateway_status: lastStatus, detail: lastText.slice(0, 300) },
      404,
    );
  } catch (e: any) {
    return json({ error: e?.message || "Internal" }, 500);
  }
});
