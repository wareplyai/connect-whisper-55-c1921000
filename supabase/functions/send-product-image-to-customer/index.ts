// Sends a product image to a customer via the WhatsApp gateway.
// Body: { session_id, to, product_id, caption? }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { session_id, to, product_id, caption } = await req.json().catch(() => ({}));
    if (!session_id || !to || !product_id) {
      return json({ error: "session_id, to and product_id are required" }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: product } = await admin
      .from("products")
      .select("id, user_id, name, price, description, image_url")
      .eq("id", product_id)
      .maybeSingle();

    if (!product || !product.image_url) {
      return json({ error: "No image for product" }, 400);
    }

    const { data: session } = await admin
      .from("sessions")
      .select("id, user_id, api_token")
      .eq("id", session_id)
      .maybeSingle();
    if (!session) return json({ error: "Session not found" }, 404);
    if (session.user_id !== product.user_id) {
      return json({ error: "Session/product owner mismatch" }, 403);
    }

    const GATEWAY = Deno.env.get("WHATSAPP_GATEWAY_URL") || "https://api.wareplyai.com";
    const candidate = String(to).replace(/\D/g, "") || String(to);
    const captionText = caption ||
      `🛍️ ${product.name}\n💰 মূল্য: ৳${product.price}${product.description ? `\n📝 ${product.description}` : ""}`;

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (session.api_token) headers.Authorization = `Bearer ${session.api_token}`;

    const attempts = [
      { path: `/api/session/${session_id}/send-image`, body: { to: candidate, imageUrl: product.image_url, caption: captionText } },
      { path: `/api/session/${session_id}/send-image`, body: { to: candidate, url: product.image_url, caption: captionText } },
      { path: `/api/session/${session_id}/sendImage`, body: { to: candidate, url: product.image_url, caption: captionText } },
    ];
    let okData: unknown = null;
    let lastErr: string | null = null;
    for (const a of attempts) {
      try {
        const r = await fetch(`${GATEWAY}${a.path}`, { method: "POST", headers, body: JSON.stringify(a.body) });
        const data = await r.json().catch(() => ({}));
        const failed = (data as any)?.success === false || (data as any)?.ok === false || Boolean((data as any)?.error);
        if (r.ok && !failed) { okData = data; break; }
        lastErr = (data as any)?.error || (data as any)?.message || `gateway ${r.status}`;
      } catch (e: any) {
        lastErr = e?.message || "gateway unreachable";
      }
    }
    if (!okData) return json({ ok: false, error: lastErr || "image send failed" }, 502);

    await admin.from("message_logs").insert({
      user_id: product.user_id,
      session_id,
      to_number: candidate,
      message_type: "image",
      payload: { url: product.image_url, caption: captionText, source: "ai_product_image", product_id: product.id, gateway_response: okData },
      status: "sent",
      image_url: product.image_url,
      image_caption: captionText,
    });

    return json({ ok: true, result: okData });
  } catch (e: any) {
    console.error("send-product-image-to-customer error", e);
    return json({ error: e?.message || "Internal" }, 500);
  }
});
