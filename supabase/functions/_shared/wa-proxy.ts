// Shared helpers for token->session proxy edge functions
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

export const GATEWAY = Deno.env.get("WHATSAPP_GATEWAY_URL") || "https://api.wareplyai.com";

export async function resolveSession(req: Request) {
  const auth = req.headers.get("Authorization") || req.headers.get("authorization");
  if (!auth?.toLowerCase().startsWith("bearer ")) {
    return { error: json({ error: "Missing Authorization: Bearer <api_token>" }, 401) };
  }
  const token = auth.slice(7).trim();
  if (!token) return { error: json({ error: "Empty token" }, 401) };

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: session } = await admin
    .from("sessions")
    .select("id, user_id, status, api_token")
    .eq("api_token", token)
    .maybeSingle();

  if (!session) return { error: json({ error: "Invalid access token" }, 401) };
  if (session.status !== "connected") {
    return { error: json({ error: `Session not connected (status: ${session.status})` }, 409) };
  }
  return { session, admin };
}

export async function forwardToGateway(
  sessionId: string,
  apiToken: string | null,
  endpoint: string,
  body: unknown,
) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiToken) headers.Authorization = `Bearer ${apiToken}`;
  const r = await fetch(`${GATEWAY}/api/session/${sessionId}/${endpoint}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const text = await r.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { ok: r.ok, status: r.status, data };
}
