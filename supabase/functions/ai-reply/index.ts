// Public webhook endpoint for the WhatsApp backend.
// Backend POSTs incoming WhatsApp messages here with the session's webhook_secret.
// We run AI generation and return a reply for the backend to send back to WhatsApp.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const enc = new TextEncoder();
const dec = new TextDecoder();

async function getCryptoKey(): Promise<CryptoKey> {
  const secret = Deno.env.get("APP_ENCRYPTION_KEY")!;
  const hash = await crypto.subtle.digest("SHA-256", enc.encode(secret));
  return crypto.subtle.importKey("raw", hash, { name: "AES-GCM" }, false, ["decrypt"]);
}
function b64decode(s: string): Uint8Array {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}
async function decryptKey(payload: string): Promise<string> {
  const [ivB64, ctB64] = payload.split(".");
  const key = await getCryptoKey();
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: b64decode(ivB64) },
    key,
    b64decode(ctB64)
  );
  return dec.decode(pt);
}

function jsonResp(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function callAI(opts: {
  platform: string; model: string; apiKey: string;
  systemPrompt: string; userMessage: string;
}): Promise<string> {
  const { platform, model, apiKey, systemPrompt, userMessage } = opts;

  if (platform === "openai" || platform === "deepseek") {
    const url = platform === "openai"
      ? "https://api.openai.com/v1/chat/completions"
      : "https://api.deepseek.com/v1/chat/completions";
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
      }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data?.error?.message || `AI error ${r.status}`);
    return data.choices?.[0]?.message?.content?.trim() || "";
  }

  if (platform === "gemini") {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: userMessage }] }],
        }),
      }
    );
    const data = await r.json();
    if (!r.ok) throw new Error(data?.error?.message || `Gemini error ${r.status}`);
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
  }

  throw new Error(`Unsupported platform: ${platform}`);
}

function recipientVariants(input: string): string[] {
  const raw = input.trim();
  const digits = raw.replace(/\D/g, "");
  const variants = [raw];
  if (digits) variants.push(digits, `+${digits}`, `${digits}@s.whatsapp.net`);
  if (digits.startsWith("0") && digits.length >= 10) {
    variants.push(`88${digits}`, `+88${digits}`, `88${digits.slice(1)}`, `+88${digits.slice(1)}`);
  }
  return [...new Set(variants.filter(Boolean))];
}

async function sendViaGateway(opts: {
  gateway: string; sessionId: string; apiToken?: string | null; to: string; message: string;
}): Promise<{ ok: boolean; to: string; error: string | null; data: unknown }> {
  const { gateway, sessionId, apiToken, to, message } = opts;
  const errors: string[] = [];

  for (const candidate of recipientVariants(to)) {
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (apiToken) headers.Authorization = `Bearer ${apiToken}`;
      const sendRes = await fetch(`${gateway}/api/session/${sessionId}/send`, {
        method: "POST",
        headers,
        body: JSON.stringify({ to: candidate, message }),
      });
      const sendData = await sendRes.json().catch(() => ({}));
      const explicitFailure = sendData?.success === false || sendData?.ok === false || sendData?.sent === false ||
        sendData?.status === "failed" || Boolean(sendData?.error);
      if (sendRes.ok && !explicitFailure) return { ok: true, to: candidate, error: null, data: sendData };
      errors.push(`${candidate}: ${sendData?.error || sendData?.message || `gateway ${sendRes.status}`}`);
    } catch (e: any) {
      errors.push(`${candidate}: ${e?.message || "gateway unreachable"}`);
    }
  }

  return { ok: false, to, error: errors.join("; ") || "gateway send failed", data: null };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResp({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const sessionId = String(body.session_id || body.sessionId || "").trim();
    const fromNumber = String(body.from || body.from_number || "").trim();
    const messageText = String(body.message || body.text || body.message_text || "").trim();
    const isGroup = Boolean(body.is_group ?? false);
    const messageType = String(body.message_type || "text");
    const fromMe = Boolean(body.from_me ?? body.fromMe ?? body.is_from_me ?? false);
    const sourceMessageId = String(body.source_message_id || "").trim();

    if (!sessionId || !fromNumber || !messageText) {
      return jsonResp({ error: "session_id, from, and message required" }, 400);
    }

    // Skip messages sent BY the bot itself (prevents infinite loop)
    if (fromMe) {
      return jsonResp({ ok: true, skipped: "from_me" });
    }
    // Skip group messages
    if (isGroup) {
      return jsonResp({ ok: true, skipped: "group_message" });
    }

    const providedSecret =
      req.headers.get("x-webhook-secret") ||
      (req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ?? "");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Load session and validate webhook secret
    const { data: session, error: sErr } = await admin
      .from("sessions")
      .select("id, user_id, webhook_secret, status, api_token")
      .eq("id", sessionId)
      .maybeSingle();
    if (sErr) throw sErr;
    if (!session) return jsonResp({ error: "Session not found" }, 404);
    if (!providedSecret || providedSecret !== session.webhook_secret) {
      return jsonResp({ error: "Invalid webhook secret" }, 401);
    }

    const userId = session.user_id;

    // Load business profile
    const { data: biz } = await admin
      .from("business_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    const aiEnabled = Boolean(biz?.ai_enabled);
    const connectedSessions: string[] = (biz?.connected_session_ids ?? []) as string[];
    const sessionConnected = connectedSessions.includes(sessionId);

    let messageId: string | undefined;

    if (sourceMessageId) {
      const { data: claimedRow, error: claimErr } = await admin
        .from("incoming_messages")
        .update({ delivery_status: "processing", reply_attempted_at: new Date().toISOString() })
        .eq("id", sourceMessageId)
        .eq("session_id", sessionId)
        .eq("reply_sent", false)
        .eq("delivery_status", "pending")
        .select("id")
        .maybeSingle();
      if (claimErr) throw claimErr;

      if (claimedRow?.id) {
        messageId = claimedRow.id;
      } else {
        return jsonResp({ ok: true, skipped: "already_claimed_or_processed", message_id: sourceMessageId });
      }
    }

    // DEDUPE: if same (session, from, text) seen in last 60 seconds, skip to prevent loops/retries
    const sinceIso = new Date(Date.now() - 60_000).toISOString();
    if (!messageId) {
      const { data: recent } = await admin
        .from("incoming_messages")
        .select("id, reply_sent, delivery_status")
        .eq("session_id", sessionId)
        .eq("from_number", fromNumber)
        .eq("message_text", messageText)
        .gte("received_at", sinceIso)
        .limit(1)
        .maybeSingle();
      if (recent) {
        return jsonResp({ ok: true, skipped: "duplicate_within_60s", message_id: recent.id });
      }
    }

    // RATE LIMIT: max 8 incoming from same number per minute
    const { count: recentCount } = await admin
      .from("incoming_messages")
      .select("id", { count: "exact", head: true })
      .eq("session_id", sessionId)
      .eq("from_number", fromNumber)
      .gte("received_at", sinceIso);
    if ((recentCount ?? 0) >= 8) {
      return jsonResp({ ok: true, skipped: "rate_limited" });
    }

    // Always log direct webhook messages. Trigger-queued messages reuse their existing row.
    if (!messageId) {
      const logRow = {
        session_id: sessionId,
        user_id: userId,
        from_number: fromNumber,
        message_text: messageText,
        message_type: messageType,
        is_group: isGroup,
        raw_payload: body,
        reply_sent: false,
        delivery_status: "processing" as const,
        received_at: new Date().toISOString(),
      };
      const { data: msgRow } = await admin
        .from("incoming_messages")
        .insert(logRow)
        .select("id")
        .single();
      messageId = msgRow?.id;
    }

    if (!aiEnabled) {
      return jsonResp({ ok: true, skipped: "ai_disabled", message_id: messageId });
    }
    if (!sessionConnected) {
      return jsonResp({ ok: true, skipped: "session_not_connected", message_id: messageId });
    }

    // Check fixed Q&A first (exact / contains)
    const { data: fixed } = await admin
      .from("fixed_qa")
      .select("keyword, reply, match_type")
      .eq("user_id", userId)
      .eq("is_active", true);
    const lowerMsg = messageText.toLowerCase();
    const fixedHit = (fixed || []).find((f: any) => {
      const k = (f.keyword || "").toLowerCase().trim();
      if (!k) return false;
      return f.match_type === "contains" ? lowerMsg.includes(k) : lowerMsg === k;
    });
    if (fixedHit) {
      const reply = fixedHit.reply;
      const GATEWAY = Deno.env.get("WHATSAPP_GATEWAY_URL") || "https://alvi-waapi.duckdns.org";
      const sendResult = await sendViaGateway({
        gateway: GATEWAY,
        sessionId,
        apiToken: session.api_token,
        to: fromNumber,
        message: reply,
      });
      if (messageId) {
        await admin.from("incoming_messages").update({
          reply_text: reply,
          reply_sent: sendResult.ok,
          delivery_status: sendResult.ok ? "sent" : "failed",
          reply_error: sendResult.ok ? null : sendResult.error,
          processed_at: new Date().toISOString(),
          reply_attempted_at: new Date().toISOString(),
          reply_sent_at: sendResult.ok ? new Date().toISOString() : null,
        }).eq("id", messageId);
      }
      if (sendResult.ok) {
        await admin.from("message_logs").insert({
          user_id: userId, session_id: sessionId, to_number: sendResult.to,
          message_type: "text", payload: { text: reply, auto_reply: true, source: "fixed_qa" },
          status: "sent",
        });
      }
      return jsonResp({ ok: true, reply, sent: sendResult.ok, send_error: sendResult.error, sent_to: sendResult.to, source: "fixed_qa", message_id: messageId });
    }

    // Load API key
    const { data: keyRow } = await admin
      .from("ai_api_keys")
      .select("encrypted_key, platform, model")
      .eq("user_id", userId)
      .eq("is_active", true)
      .maybeSingle();
    if (!keyRow) {
      if (messageId) {
        await admin.from("incoming_messages").update({
          reply_error: "No active AI API key", delivery_status: "failed",
          processed_at: new Date().toISOString(),
        }).eq("id", messageId);
      }
      return jsonResp({ error: "No active AI API key for user" }, 400);
    }

    const apiKey = await decryptKey(keyRow.encrypted_key);

    // Load QA pairs as additional context
    const { data: qaRows } = await admin
      .from("qa_pairs")
      .select("question, answer")
      .eq("user_id", userId)
      .eq("is_active", true)
      .limit(50);

    const qaContext = (qaRows || []).length
      ? `\n\nKNOWLEDGE BASE (Q&A):\n${(qaRows || [])
          .map((q: any, i: number) => `Q${i + 1}: ${q.question}\nA${i + 1}: ${q.answer}`)
          .join("\n\n")}`
      : "";

    const baseSystem = (biz?.system_prompt && biz.system_prompt.trim().length > 0)
      ? biz.system_prompt
      : `You are a helpful WhatsApp assistant for ${biz?.name || "this business"}. Reply in the customer's language. Be friendly, concise, human-like.`;

    const systemPrompt = `${baseSystem}${qaContext}`;

    let reply = "";
    try {
      reply = await callAI({
        platform: keyRow.platform,
        model: keyRow.model && keyRow.model !== "default" ? keyRow.model : (
          keyRow.platform === "openai" ? "gpt-4o-mini" :
          keyRow.platform === "gemini" ? "gemini-1.5-flash" :
          "deepseek-chat"
        ),
        apiKey,
        systemPrompt,
        userMessage: messageText,
      });
    } catch (aiErr: any) {
      if (messageId) {
        await admin.from("incoming_messages").update({
          reply_error: aiErr?.message || "AI call failed",
          delivery_status: "failed",
          processed_at: new Date().toISOString(),
        }).eq("id", messageId);
      }
      throw aiErr;
    }

    if (!reply) {
      if (messageId) {
        await admin.from("incoming_messages").update({
          reply_error: "Empty AI response", delivery_status: "failed",
          processed_at: new Date().toISOString(),
        }).eq("id", messageId);
      }
      return jsonResp({ error: "Empty AI response" }, 502);
    }

    // Send the reply back via WhatsApp gateway
    const GATEWAY = Deno.env.get("WHATSAPP_GATEWAY_URL") || "https://alvi-waapi.duckdns.org";
    const sendResult = await sendViaGateway({
      gateway: GATEWAY,
      sessionId,
      apiToken: session.api_token,
      to: fromNumber,
      message: reply,
    });
    const sendOk = sendResult.ok;
    const sendErr = sendResult.error;

    if (messageId) {
      await admin.from("incoming_messages").update({
        reply_text: reply,
        reply_sent: sendOk,
        delivery_status: sendOk ? "sent" : "failed",
        reply_error: sendOk ? null : sendErr,
        processed_at: new Date().toISOString(),
        reply_attempted_at: new Date().toISOString(),
        reply_sent_at: sendOk ? new Date().toISOString() : null,
      }).eq("id", messageId);
    }

    if (sendOk) {
      await admin.from("message_logs").insert({
        user_id: userId, session_id: sessionId, to_number: sendResult.to,
        message_type: "text", payload: { text: reply, auto_reply: true },
        status: "sent",
      });
    }

    return jsonResp({ ok: true, reply, sent: sendOk, send_error: sendErr, sent_to: sendResult.to, source: "ai", message_id: messageId });
  } catch (e: any) {
    console.error("ai-reply error:", e);
    return jsonResp({ error: e?.message || "Internal error" }, 500);
  }
});
