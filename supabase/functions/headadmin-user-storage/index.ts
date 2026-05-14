import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const url = Deno.env.get("SUPABASE_URL")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Invalid auth" }, 401);

    const admin = createClient(url, service);
    const { data: ha } = await admin.from("headadmin").select("id").eq("auth_user_id", user.id).eq("is_active", true).maybeSingle();
    if (!ha) return json({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const action = body.action || "list";

    if (action === "list") {
      // Aggregate per-user storage (chat-media + product-images, folder = user_id)
      const { data: storageRows } = await admin.rpc("exec_sql_select" as any, {}).then(() => ({ data: null })).catch(() => ({ data: null }));
      // fallback: query storage.objects via service client
      const { data: objs } = await admin.schema("storage" as any).from("objects")
        .select("bucket_id, name, metadata")
        .in("bucket_id", ["chat-media", "product-images"])
        .limit(50000);

      const byUser = new Map<string, { chat_media_bytes: number; chat_media_count: number; product_images_bytes: number; product_images_count: number }>();
      for (const o of (objs || []) as any[]) {
        const folder = (o.name || "").split("/")[0];
        if (!folder || folder.length < 30) continue;
        const size = Number(o.metadata?.size || 0);
        const cur = byUser.get(folder) || { chat_media_bytes: 0, chat_media_count: 0, product_images_bytes: 0, product_images_count: 0 };
        if (o.bucket_id === "chat-media") { cur.chat_media_bytes += size; cur.chat_media_count += 1; }
        else { cur.product_images_bytes += size; cur.product_images_count += 1; }
        byUser.set(folder, cur);
      }

      const { data: profiles } = await admin.from("profiles").select("id, email, full_name, plan").order("created_at", { ascending: false });

      // counts per user
      const userIds = (profiles || []).map((p: any) => p.id);
      const fetchCounts = async (table: string, col = "user_id", filter?: (q: any) => any) => {
        const map = new Map<string, number>();
        for (const uid of userIds) {
          let q = admin.from(table).select("*", { count: "exact", head: true }).eq(col, uid);
          if (filter) q = filter(q);
          const { count } = await q;
          map.set(uid, count || 0);
        }
        return map;
      };

      // Use grouped queries instead of N queries
      const groupCount = async (table: string, where: any = {}) => {
        const { data } = await admin.from(table).select("user_id");
        const m = new Map<string, number>();
        for (const r of (data || []) as any[]) {
          if (where.source && r.source !== where.source) continue;
          m.set(r.user_id, (m.get(r.user_id) || 0) + 1);
        }
        return m;
      };

      const [productsAll, imageMatch, incoming] = await Promise.all([
        admin.from("products").select("user_id, source"),
        admin.from("image_match_logs").select("user_id"),
        admin.from("incoming_messages").select("user_id, message_type"),
      ]);

      const prodTotal = new Map<string, number>();
      const prodWoo = new Map<string, number>();
      const prodManual = new Map<string, number>();
      for (const r of (productsAll.data || []) as any[]) {
        prodTotal.set(r.user_id, (prodTotal.get(r.user_id) || 0) + 1);
        if (r.source === "woocommerce") prodWoo.set(r.user_id, (prodWoo.get(r.user_id) || 0) + 1);
        else prodManual.set(r.user_id, (prodManual.get(r.user_id) || 0) + 1);
      }
      const matchMap = new Map<string, number>();
      for (const r of (imageMatch.data || []) as any[]) matchMap.set(r.user_id, (matchMap.get(r.user_id) || 0) + 1);
      const incTotal = new Map<string, number>();
      const incMedia = new Map<string, number>();
      for (const r of (incoming.data || []) as any[]) {
        incTotal.set(r.user_id, (incTotal.get(r.user_id) || 0) + 1);
        if (r.message_type && r.message_type !== "text") incMedia.set(r.user_id, (incMedia.get(r.user_id) || 0) + 1);
      }

      const rows = (profiles || []).map((p: any) => {
        const s = byUser.get(p.id) || { chat_media_bytes: 0, chat_media_count: 0, product_images_bytes: 0, product_images_count: 0 };
        return {
          user_id: p.id,
          email: p.email,
          full_name: p.full_name,
          plan: p.plan,
          ...s,
          total_bytes: s.chat_media_bytes + s.product_images_bytes,
          products_total: prodTotal.get(p.id) || 0,
          products_woo: prodWoo.get(p.id) || 0,
          products_manual: prodManual.get(p.id) || 0,
          image_match_count: matchMap.get(p.id) || 0,
          incoming_total: incTotal.get(p.id) || 0,
          incoming_media: incMedia.get(p.id) || 0,
        };
      });

      rows.sort((a, b) => b.total_bytes - a.total_bytes);
      return json({ rows });
    }

    if (action === "delete") {
      const { user_id, scope } = body;
      if (!user_id || !scope) return json({ error: "user_id and scope required" }, 400);
      const result: Record<string, number> = {};

      const deleteFolder = async (bucket: string) => {
        const { data: list } = await admin.storage.from(bucket).list(user_id, { limit: 1000 });
        if (!list || list.length === 0) return 0;
        // recursive: list subfolders
        const paths: string[] = [];
        const walk = async (prefix: string) => {
          const { data } = await admin.storage.from(bucket).list(prefix, { limit: 1000 });
          for (const item of data || []) {
            const full = `${prefix}/${item.name}`;
            if (item.id === null || (item.metadata == null && !item.name.includes("."))) {
              await walk(full);
            } else {
              paths.push(full);
            }
          }
        };
        await walk(user_id);
        if (paths.length === 0) return 0;
        // chunk delete
        let total = 0;
        for (let i = 0; i < paths.length; i += 100) {
          const chunk = paths.slice(i, i + 100);
          const { data: del } = await admin.storage.from(bucket).remove(chunk);
          total += del?.length || 0;
        }
        return total;
      };

      if (scope === "chat_media" || scope === "all") {
        result.chat_media = await deleteFolder("chat-media");
      }
      if (scope === "product_images_storage" || scope === "all") {
        result.product_images_storage = await deleteFolder("product-images");
      }
      if (scope === "image_match_logs" || scope === "all") {
        const { count } = await admin.from("image_match_logs").delete({ count: "exact" }).eq("user_id", user_id);
        result.image_match_logs = count || 0;
      }
      if (scope === "products_woo" || scope === "all") {
        const { count } = await admin.from("products").delete({ count: "exact" }).eq("user_id", user_id).eq("source", "woocommerce");
        result.products_woo = count || 0;
      }
      if (scope === "products_manual") {
        const { count } = await admin.from("products").delete({ count: "exact" }).eq("user_id", user_id).neq("source", "woocommerce");
        result.products_manual = count || 0;
      }
      if (scope === "products_all" || scope === "all") {
        const { count } = await admin.from("products").delete({ count: "exact" }).eq("user_id", user_id);
        result.products_all = count || 0;
      }
      if (scope === "incoming_media" || scope === "all") {
        const { count } = await admin.from("incoming_messages").delete({ count: "exact" }).eq("user_id", user_id).neq("message_type", "text");
        result.incoming_media = count || 0;
      }

      await admin.from("activity_logs").insert({
        action: "storage.delete",
        actor_type: "headadmin",
        actor_id: user.id,
        target_type: "user",
        target_id: user_id,
        metadata: { scope, result },
      });

      return json({ success: true, result });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e: any) {
    return json({ error: String(e?.message || e) }, 500);
  }

  function json(obj: any, status = 200) {
    return new Response(JSON.stringify(obj), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
