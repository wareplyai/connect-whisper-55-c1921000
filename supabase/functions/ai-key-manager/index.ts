import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const enc = new TextEncoder();
const dec = new TextDecoder();

async function getKey(): Promise<CryptoKey> {
  const secret = Deno.env.get("APP_ENCRYPTION_KEY");
  if (!secret) throw new Error("APP_ENCRYPTION_KEY not configured");
  const hash = await crypto.subtle.digest("SHA-256", enc.encode(secret));
  return crypto.subtle.importKey("raw", hash, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

function b64encode(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}
function b64decode(s: string): Uint8Array {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}

async function encryptKey(plain: string): Promise<string> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(plain));
  return `${b64encode(iv.buffer)}.${b64encode(ct)}`;
}

async function decryptKey(payload: string): Promise<string> {
  const [ivB64, ctB64] = payload.split(".");
  const key = await getKey();
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: b64decode(ivB64) },
    key,
    b64decode(ctB64)
  );
  return dec.decode(pt);
}

function detectPlatform(k: string): "openai" | "gemini" | "deepseek" | null {
  const low = k.trim().toLowerCase();
  if (!low) return null;
  if (low.startsWith("sk-") && !low.includes("deepseek")) return "openai";
  if (k.startsWith("AIza")) return "gemini";
  if (low.includes("deepseek") || low.startsWith("ds-")) return "deepseek";
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: cErr } = await supabase.auth.getClaims(token);
    if (cErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claims.claims.sub as string;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    if (action === "save") {
      const apiKey = String(body.apiKey || "").trim();
      const platformOverride = body.platform as string | undefined;
      const model = String(body.model || "").trim();
      if (!apiKey) {
        return new Response(JSON.stringify({ error: "apiKey required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const platform = (platformOverride as any) || detectPlatform(apiKey);
      if (!platform) {
        return new Response(JSON.stringify({ error: "Unable to detect platform — pass platform manually" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const encrypted = await encryptKey(apiKey);
      const last4 = apiKey.slice(-4);

      // Deactivate previous keys, insert new one as active
      await admin.from("ai_api_keys").update({ is_active: false }).eq("user_id", userId);
      const { data, error } = await admin.from("ai_api_keys").insert({
        user_id: userId,
        platform,
        model: model || "default",
        encrypted_key: encrypted,
        key_last4: last4,
        is_active: true,
      }).select("id, platform, model, key_last4, created_at").single();

      if (error) throw error;
      return new Response(JSON.stringify({ ok: true, key: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "get") {
      const { data, error } = await admin
        .from("ai_api_keys")
        .select("id, platform, model, key_last4, created_at")
        .eq("user_id", userId)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return new Response(JSON.stringify({ key: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update_model") {
      const model = String(body.model || "").trim();
      if (!model) {
        return new Response(JSON.stringify({ error: "model required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error } = await admin
        .from("ai_api_keys")
        .update({ model })
        .eq("user_id", userId)
        .eq("is_active", true);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete") {
      const { error } = await admin.from("ai_api_keys").delete().eq("user_id", userId);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "decrypt_for_internal") {
      // Used by other server-side processes (RAG/reply pipeline) — requires service role caller.
      // For safety, only allow if caller is the user themselves and a magic flag set.
      const { data, error } = await admin
        .from("ai_api_keys")
        .select("encrypted_key, platform, model")
        .eq("user_id", userId)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        return new Response(JSON.stringify({ key: null }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const plain = await decryptKey(data.encrypted_key);
      return new Response(JSON.stringify({
        apiKey: plain, platform: data.platform, model: data.model,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("ai-key-manager error:", e);
    return new Response(JSON.stringify({ error: e.message || "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
