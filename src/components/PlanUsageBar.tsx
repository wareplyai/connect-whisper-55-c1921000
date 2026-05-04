import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export const PlanUsageBar = () => {
  const { user } = useAuth();
  const [plan, setPlan] = useState<string>("Trial");
  const [used, setUsed] = useState(0);
  const [max, setMax] = useState(1);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: sub }, { data: prof }, { count }] = await Promise.all([
        supabase
          .from("subscriptions")
          .select("plan, max_sessions, status")
          .eq("user_id", user.id)
          .in("status", ["active", "trial_active"])
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("plan, max_sessions")
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          .from("sessions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
      ]);
      const planName = sub?.plan || prof?.plan || "trial";
      const maxS = sub?.max_sessions ?? prof?.max_sessions ?? 1;
      setPlan(planName.charAt(0).toUpperCase() + planName.slice(1));
      setMax(maxS);
      setUsed(count || 0);
    })();
  }, [user]);

  const pct = max > 0 ? Math.min(100, (used / max) * 100) : 0;

  return (
    <div className="rounded-xl border border-border bg-card p-4 flex flex-wrap items-center gap-4">
      <div className="flex-1 min-w-[220px]">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold">Current Plan: {plan}</p>
          <p className="text-xs text-muted-foreground">{used} of {max} WhatsApp sessions used</p>
        </div>
        <Progress value={pct} className="h-2 mt-2" />
      </div>
      <Button asChild variant="outline" size="sm">
        <Link to="/dashboard/subscription">View Plans</Link>
      </Button>
    </div>
  );
};
