import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const VAPID_PUBLIC =
  "BHF9qJpggWDbLbpCAp3wCGliRljAPL7f4ME1aVAyN48-OTHqHjvcpTAJpyEqypyfZjOe5o0aaBKz8wTEsX_YxcM";
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
const VAPID_SUBJECT =
  Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@wareply.app";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!VAPID_PRIVATE) throw new Error("VAPID_PRIVATE_KEY not configured");

    const body = await req.json().catch(() => ({}));
    const title = body.title || "Notification";
    const message = body.body || "";
    const url = body.url || "/headadmin/m";
    const kind = body.kind || "info";

    const { data: subs, error } = await admin
      .from("push_subscriptions")
      .select("id,endpoint,p256dh,auth");
    if (error) throw error;

    const payload = JSON.stringify({ title, body: message, url, kind });

    const results = await Promise.allSettled(
      (subs || []).map(async (s: any) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            payload,
          );
        } catch (e: any) {
          console.error("push send failed", {
            id: s.id,
            statusCode: e?.statusCode,
            body: e?.body,
            message: e?.message,
          });
          if (e?.statusCode === 410 || e?.statusCode === 404) {
            await admin.from("push_subscriptions").delete().eq("id", s.id);
          }
          throw e;
        }
      }),
    );

    const sent = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.length - sent;
    const errors = results
      .filter((r) => r.status === "rejected")
      .map((r: any) => ({
        statusCode: r.reason?.statusCode,
        body: r.reason?.body,
        message: r.reason?.message,
      }));

    return new Response(JSON.stringify({ sent, failed, total: results.length, errors }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
