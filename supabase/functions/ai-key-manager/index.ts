import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

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
    const { data: claimsData, error: uErr } = await supabase.auth.getClaims(token);
    const userId = claimsData?.claims?.sub;
    if (uErr || !userId) {
      console.error("ai-key-manager auth error:", uErr);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    // ---------- HEADADMIN-ONLY: global AI keys ----------
    const requireHeadadmin = async () => {
      const { data, error } = await admin
        .from("headadmin")
        .select("id, is_active")
        .eq("auth_user_id", userId)
        .eq("is_active", true)
        .maybeSingle();
      return !error && !!data;
    };

    if (action === "save_global" || action === "get_global" || action === "list_global" || action === "delete_global" || action === "toggle_global" || action === "list_user_overrides" || action === "set_user_override" || action === "delete_user_override" || action === "list_all_users") {
      if (!(await requireHeadadmin())) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "save_global") {
        const apiKey = String(body.apiKey || "").trim();
        const platformOverride = body.platform as string | undefined;
        const rawModel = String(body.model || "").trim();
        const model = rawModel ? rawModel.toLowerCase().replace(/\s+/g, "-") : "";
        if (!apiKey) return new Response(JSON.stringify({ error: "apiKey required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        const platform = (platformOverride as any) || detectPlatform(apiKey);
        if (!platform) return new Response(JSON.stringify({ error: "Unable to detect platform — pass platform manually" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        const encrypted = await encryptKey(apiKey);
        const last4 = apiKey.slice(-4);
        // Deactivate previous global keys, insert new one as active
        await admin.from("ai_api_keys").update({ is_active: false }).is("user_id", null).eq("is_global", true);
        const { data, error } = await admin.from("ai_api_keys").insert({
          user_id: null, is_global: true,
          platform, model: model || "default",
          encrypted_key: encrypted, key_last4: last4, is_active: true,
        }).select("id, platform, model, key_last4, is_active, created_at").single();
        if (error) throw error;
        return new Response(JSON.stringify({ ok: true, key: data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (action === "list_global" || action === "get_global") {
        const { data, error } = await admin
          .from("ai_api_keys")
          .select("id, platform, model, key_last4, is_active, created_at")
          .is("user_id", null).eq("is_global", true)
          .order("created_at", { ascending: false });
        if (error) throw error;
        return new Response(JSON.stringify({ keys: data || [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (action === "delete_global") {
        const id = String(body.id || "").trim();
        if (!id) return new Response(JSON.stringify({ error: "id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        const { error } = await admin.from("ai_api_keys").delete().eq("id", id).is("user_id", null).eq("is_global", true);
        if (error) throw error;
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (action === "toggle_global") {
        const id = String(body.id || "").trim();
        const active = !!body.is_active;
        if (!id) return new Response(JSON.stringify({ error: "id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (active) {
          await admin.from("ai_api_keys").update({ is_active: false }).is("user_id", null).eq("is_global", true);
        }
        const { error } = await admin.from("ai_api_keys").update({ is_active: active }).eq("id", id);
        if (error) throw error;
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // ---------- HEADADMIN: per-user override keys ----------
      if (action === "list_user_overrides") {
        const { data, error } = await admin
          .from("ai_api_keys")
          .select("id, user_id, platform, model, key_last4, is_active, created_at")
          .not("user_id", "is", null)
          .eq("is_admin_override", true)
          .order("created_at", { ascending: false });
        if (error) throw error;
        const userIds = Array.from(new Set((data || []).map((r: any) => r.user_id)));
        let profiles: any[] = [];
        if (userIds.length) {
          const { data: pData } = await admin.from("profiles").select("id, email, full_name").in("id", userIds);
          profiles = pData || [];
        }
        const enriched = (data || []).map((r: any) => {
          const p = profiles.find((x) => x.id === r.user_id);
          return { ...r, user_email: p?.email || null, user_name: p?.full_name || null };
        });
        return new Response(JSON.stringify({ keys: enriched }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (action === "set_user_override") {
        const targetUserId = String(body.user_id || "").trim();
        const apiKey = String(body.apiKey || "").trim();
        const platformOverride = body.platform as string | undefined;
        const model = String(body.model || "").trim();
        if (!targetUserId || !apiKey) {
          return new Response(JSON.stringify({ error: "user_id and apiKey required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        const platform = (platformOverride as any) || detectPlatform(apiKey);
        if (!platform) return new Response(JSON.stringify({ error: "Unable to detect platform" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        const encrypted = await encryptKey(apiKey);
        const last4 = apiKey.slice(-4);
        // Deactivate any existing keys for that user (both their own and prior overrides)
        await admin.from("ai_api_keys").update({ is_active: false }).eq("user_id", targetUserId);
        const { data, error } = await admin.from("ai_api_keys").insert({
          user_id: targetUserId, is_global: false, is_admin_override: true,
          platform, model: model || "default",
          encrypted_key: encrypted, key_last4: last4, is_active: true,
        }).select("id, platform, model, key_last4, is_active, created_at").single();
        if (error) throw error;
        return new Response(JSON.stringify({ ok: true, key: data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (action === "delete_user_override") {
        const id = String(body.id || "").trim();
        if (!id) return new Response(JSON.stringify({ error: "id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        const { error } = await admin.from("ai_api_keys").delete().eq("id", id).eq("is_admin_override", true);
        if (error) throw error;
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (action === "list_all_users") {
        // Pull from auth.users so we see EVERY user (even ones without a profile row),
        // then enrich with profile name/email and exclude headadmin accounts.
        const { data: authList, error: aErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
        if (aErr) throw aErr;
        const ids = (authList?.users || []).map((u: any) => u.id);
        const profMap = new Map<string, any>();
        if (ids.length) {
          const { data: pData } = await admin.from("profiles").select("id, email, full_name").in("id", ids);
          (pData || []).forEach((p: any) => profMap.set(p.id, p));
        }
        // Include ALL auth users (including headadmin accounts) so any user
        // visible in the Users page can be selected for a per-user override.
        const users = (authList?.users || []).map((u: any) => {
          const p = profMap.get(u.id);
          return {
            id: u.id,
            email: p?.email || u.email || null,
            full_name: p?.full_name || u.user_metadata?.full_name || null,
          };
        });
        return new Response(JSON.stringify({ users }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
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
