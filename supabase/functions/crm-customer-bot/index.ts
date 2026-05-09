// Public endpoint invoked by the incoming_messages trigger.
// Handles two flows: Return Request bot + COD YES/NO confirmation reply.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const RETURN_TRIGGERS = [/রিটার্ন/i, /\breturn\b/i, /ফেরত/i];
const TRACKING_TRIGGERS = [/অর্ডার\s*কোথায়/i, /\btracking\b/i, /\btrack\b/i, /কোথায়\s*আছে/i];
const COD_TRIGGERS = [/\bcod\b/i, /\bconfirm\b/i, /কনফার্ম/i];
const YES_RE = /^(yes|হ্যাঁ|হা|y|হ্যা|yes please|ok)$/i;
const NO_RE = /^(no|না|n|cancel|বাতিল)$/i;

async function sendWA(admin: any, userId: string, to: string, text: string) {
  const { data: s } = await admin.from("sessions")
    .select("id, api_token").eq("user_id", userId).eq("status", "connected")
    .order("last_active", { ascending: false, nullsFirst: false }).limit(1).maybeSingle();
  if (!s) {
    console.log("[stub] no connected session, would send →", to, text);
    return false;
  }
  const GATEWAY = Deno.env.get("WHATSAPP_GATEWAY_URL") || "https://alvi-waapi.duckdns.org/waapi";
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (s.api_token) headers.Authorization = `Bearer ${s.api_token}`;
  try {
    const r = await fetch(`${GATEWAY}/api/session/${s.id}/send`, {
      method: "POST", headers,
      body: JSON.stringify({ to, message: text }),
    });
    const ok = r.ok;
    if (!ok) console.log("[gateway error]", r.status, await r.text().catch(() => ""));
    // mirror to message_logs so it appears in inbox thread
    await admin.from("message_logs").insert({
      user_id: userId, session_id: s.id, to_number: to,
      message_type: "text", payload: { text }, status: ok ? "sent" : "failed",
    });
    return ok;
  } catch (e) {
    console.error("WA send error", e);
    return false;
  }
}

async function notifyMerchant(admin: any, userId: string, text: string) {
  const { data: prof } = await admin.from("profiles").select("phone").eq("id", userId).maybeSingle();
  const merchantPhone = (prof as any)?.phone;
  if (!merchantPhone) {
    console.log("[stub] merchant has no phone, skip notify →", text);
    return;
  }
  await sendWA(admin, userId, merchantPhone, text);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const { user_id, from, text, message_type, image_url } = body || {};
    if (!user_id || !from) return json({ skipped: "missing fields" });

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const phone = String(from);
    const msg = String(text || "").trim();
    const lower = msg.toLowerCase();

    // 0) Per-conversation Bot/Human mode — Human disables all auto-replies
    const { data: crs } = await admin.from("customer_reply_settings")
      .select("mode, ai_paused").eq("user_id", user_id).eq("phone_number", phone).maybeSingle();
    if (crs && (crs.mode === "human" || crs.ai_paused)) {
      return json({ ok: true, skipped: "human_mode" });
    }

    // 1) Check active flows for this customer
    const { data: states } = await admin.from("crm_bot_state")
      .select("*").eq("user_id", user_id).eq("phone", phone).neq("step", "done");

    const codState = states?.find((s: any) => s.flow === "cod_confirm");
    const returnState = states?.find((s: any) => s.flow === "return");

    // ---- COD reply handling ----
    if (codState && codState.step === "await_yesno") {
      if (YES_RE.test(lower)) {
        await admin.from("crm_orders").update({
          cod_confirmed: true, order_status: "confirmed",
        }).eq("id", codState.order_id);
        await admin.from("crm_bot_state").update({ step: "done", data: { ...codState.data, reply: "yes" } }).eq("id", codState.id);
        await sendWA(admin, user_id, phone, "ধন্যবাদ! আপনার অর্ডার কনফার্ম করা হলো। শীঘ্রই ডেলিভারি হবে।");
        return json({ ok: true, action: "cod_yes" });
      }
      if (NO_RE.test(lower)) {
        await admin.from("crm_orders").update({
          cod_confirmed: false, order_status: "cancelled",
        }).eq("id", codState.order_id);
        await admin.from("crm_bot_state").update({ step: "done", data: { ...codState.data, reply: "no" } }).eq("id", codState.id);
        await sendWA(admin, user_id, phone, "আপনার অর্ডার বাতিল করা হলো। আবার অর্ডার দিতে আমাদের সাইটে ভিজিট করুন।");
        await notifyMerchant(admin, user_id, `❌ COD CANCELLED by ${phone} — order ${codState.order_id}`);
        return json({ ok: true, action: "cod_no" });
      }
    }

    // ---- Return flow continuation ----
    if (returnState) {
      const data = returnState.data || {};
      if (returnState.step === "await_order") {
        const orderNum = msg.replace(/[^a-z0-9-]/gi, "");
        if (!orderNum) {
          await sendWA(admin, user_id, phone, "অনুগ্রহ করে আপনার অর্ডার নম্বর পাঠান।");
          return json({ ok: true });
        }
        const { data: order } = await admin.from("crm_orders").select("id")
          .eq("user_id", user_id).eq("woo_order_id", orderNum).maybeSingle();
        await admin.from("crm_bot_state").update({
          step: "await_reason",
          data: { ...data, order_number: orderNum },
          order_id: order?.id || null,
        }).eq("id", returnState.id);
        await sendWA(admin, user_id, phone, "ধন্যবাদ। এখন রিটার্নের কারণ লিখে পাঠান।");
        return json({ ok: true });
      }
      if (returnState.step === "await_reason") {
        await admin.from("crm_bot_state").update({
          step: "await_photo", data: { ...data, reason: msg },
        }).eq("id", returnState.id);
        await sendWA(admin, user_id, phone, "প্রোডাক্টের একটি ছবি পাঠান।");
        return json({ ok: true });
      }
      if (returnState.step === "await_photo") {
        const photo = (message_type === "image" && image_url) ? image_url : null;
        const { data: ret } = await admin.from("crm_returns").insert({
          user_id,
          order_id: returnState.order_id,
          customer_phone: phone,
          reason: data.reason || null,
          photo_url: photo,
          status: "requested",
          notes: `Order #${data.order_number || ""}`,
        }).select("id").single();
        await admin.from("crm_bot_state").update({
          step: "done", return_id: ret?.id, data: { ...data, photo_url: photo },
        }).eq("id", returnState.id);
        await sendWA(admin, user_id, phone, "✅ আপনার রিটার্ন রিকোয়েস্ট সাবমিট হয়েছে। আমরা শীঘ্রই যোগাযোগ করব।");
        await notifyMerchant(admin, user_id, `🔁 New return request from ${phone}\nOrder: ${data.order_number || "?"}\nReason: ${data.reason || ""}`);
        return json({ ok: true, action: "return_done", return_id: ret?.id });
      }
    }

    // ---- New return flow trigger ----
    if (RETURN_TRIGGERS.some((re) => re.test(msg))) {
      // reset any old state
      await admin.from("crm_bot_state").delete().eq("user_id", user_id).eq("phone", phone).eq("flow", "return");
      await admin.from("crm_bot_state").insert({
        user_id, phone, flow: "return", step: "await_order", data: {},
      });
      await sendWA(admin, user_id, phone, "রিটার্ন রিকোয়েস্ট শুরু হলো।\nঅনুগ্রহ করে আপনার অর্ডার নম্বর পাঠান।");
      return json({ ok: true, action: "return_started" });
    }

    return json({ ok: true, noop: true });
  } catch (e: any) {
    console.error("crm-customer-bot error", e);
    return json({ error: e?.message || "internal" }, 500);
  }
});
