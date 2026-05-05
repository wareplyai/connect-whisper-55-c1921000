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
    let cancelled = false;
    const load = async () => {
      // Look at the latest trial subscription specifically (any status)
      const { data: trialSub } = await supabase
        .from("subscriptions")
        .select("plan, status, trial_ends_at")
        .eq("user_id", user.id)
        .eq("plan", "trial")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // If the user already has a non-trial active paid plan, don't show the trial banner
      const { data: paidSub } = await supabase
        .from("subscriptions")
        .select("plan, status")
        .eq("user_id", user.id)
        .eq("status", "active")
        .neq("plan", "trial")
        .limit(1)
        .maybeSingle();

      if (cancelled) return;

      if (paidSub || !trialSub) {
        setInfo({ loading: false, isTrial: false, trialEndsAt: null, daysRemaining: 0, expired: false });
        return;
      }

      const ends = trialSub.trial_ends_at ? new Date(trialSub.trial_ends_at) : null;
      // No trial_ends_at yet → don't flash "expired" – treat as not-loaded
      if (!ends) {
        setInfo({ loading: false, isTrial: false, trialEndsAt: null, daysRemaining: 0, expired: false });
        return;
      }
      const ms = ends.getTime() - Date.now();
      const expired = ms <= 0;
      const days = Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
      setInfo({ loading: false, isTrial: true, trialEndsAt: ends, daysRemaining: days, expired });

      // If expired but DB still says trial_active, ask backend to flip status & disconnect sessions
      if (expired && trialSub.status === "trial_active") {
        await supabase.rpc("expire_own_trial");
      }
    };
    load();
    return () => { cancelled = true; };
  }, [user]);

  return info;
};
