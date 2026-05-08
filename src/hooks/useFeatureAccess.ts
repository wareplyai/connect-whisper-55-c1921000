import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type FeatureKey = "ai_agent" | "auto_replies" | "abandoned_cart";

export function useFeatureAccess() {
  const { user } = useAuth();
  const [access, setAccess] = useState<Record<FeatureKey, boolean>>({
    ai_agent: true,
    auto_replies: true,
    abandoned_cart: true,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
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
      const result: Record<FeatureKey, boolean> = { ai_agent: true, auto_replies: true };
      (globals || []).forEach((g: any) => {
        if (g.feature in result) result[g.feature as FeatureKey] = !!g.show_to_users;
      });
      (overrides || []).forEach((o: any) => {
        if (o.feature in result) result[o.feature as FeatureKey] = !!o.enabled;
      });
      setAccess(result);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return { access, loading };
}
