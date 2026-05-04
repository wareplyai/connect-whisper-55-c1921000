import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export interface TrialInfo {
  loading: boolean;
  isTrial: boolean;
  trialEndsAt: Date | null;
  daysRemaining: number;
  expired: boolean;
}

export const useTrial = (): TrialInfo => {
  const { user } = useAuth();
  const [info, setInfo] = useState<TrialInfo>({
    loading: true, isTrial: false, trialEndsAt: null, daysRemaining: 0, expired: false,
  });

  useEffect(() => {
    if (!user) { setInfo((i) => ({ ...i, loading: false })); return; }
    (async () => {
      const { data } = await supabase
        .from("subscriptions")
        .select("plan, status, trial_ends_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!data || data.plan !== "trial") {
        setInfo({ loading: false, isTrial: false, trialEndsAt: null, daysRemaining: 0, expired: false });
        return;
      }
      const ends = data.trial_ends_at ? new Date(data.trial_ends_at) : null;
      const ms = ends ? ends.getTime() - Date.now() : 0;
      const days = Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
      setInfo({
        loading: false,
        isTrial: true,
        trialEndsAt: ends,
        daysRemaining: days,
        expired: !!ends && ms <= 0,
      });
    })();
  }, [user]);

  return info;
};
