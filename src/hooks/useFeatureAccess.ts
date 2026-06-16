import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type FeatureKey =
  | "ai_agent"
  | "auto_replies"
  | "abandoned_cart"
  | "products"
  | "behavior";

const DEFAULTS: Record<FeatureKey, boolean> = {
  ai_agent: true,
  auto_replies: true,
  abandoned_cart: true,
  products: true,
  behavior: true,
};

export function useFeatureAccess() {
  const { user } = useAuth();
  const [access, setAccess] = useState<Record<FeatureKey, boolean>>({ ...DEFAULTS });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const loadAccess = async () => {
      const [{ data: globals }, { data: overrides }] = await Promise.all([
        supabase.from("global_feature_settings" as any).select("feature, show_to_users"),
        user
          ? supabase
              .from("user_feature_access" as any)
              .select("feature, enabled")
              .eq("user_id", user.id)
          : Promise.resolve({ data: [] as any[] }),
      ]);
      if (cancelled) return;
      const result: Record<FeatureKey, boolean> = { ...DEFAULTS };
      const globalAccess: Record<FeatureKey, boolean> = { ...DEFAULTS };
      (globals || []).forEach((g: any) => {
        if (g.feature in globalAccess) {
          globalAccess[g.feature as FeatureKey] = !!g.show_to_users;
          result[g.feature as FeatureKey] = !!g.show_to_users;
        }
      });
      (overrides || []).forEach((o: any) => {
        const feature = o.feature as FeatureKey;
        if (feature in result && globalAccess[feature]) result[feature] = !!o.enabled;
      });
      setAccess(result);
      setLoading(false);
    };

    loadAccess();

    const channelName = `feature-access-${user?.id || "guest"}-${Math.random().toString(36).slice(2)}`;
    const ch = supabase.channel(channelName);
    ch.on("postgres_changes", { event: "*", schema: "public", table: "global_feature_settings" }, loadAccess);
    if (user?.id) {
      ch.on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_feature_access", filter: `user_id=eq.${user.id}` },
        loadAccess,
      );
    } else {
      ch.on("postgres_changes", { event: "*", schema: "public", table: "user_feature_access" }, loadAccess);
    }
    ch.subscribe();
    const channel = ch;

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return { access, loading };
}
