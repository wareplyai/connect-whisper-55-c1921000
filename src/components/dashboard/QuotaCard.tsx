import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Sparkles, AlertTriangle } from "lucide-react";

interface QuotaStatus {
  plan: string;
  reply_quota: number;
  replies_used: number;
  remaining: number;
  period_start: string | null;
  period_end: string | null;
  max_tokens: number;
}

export function QuotaCard() {
  const [status, setStatus] = useState<QuotaStatus | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.rpc("get_user_quota_status", { _user_id: user.id });
      const row = Array.isArray(data) ? data[0] : data;
      if (mounted && row) setStatus(row as QuotaStatus);
    };
    load();
    const t = setInterval(load, 60_000);
    return () => { mounted = false; clearInterval(t); };
  }, []);

  if (!status) return null;
  const quota = Number(status.reply_quota || 0);
  const used = Number(status.replies_used || 0);
  const remaining = Math.max(quota - used, 0);
  const pct = quota > 0 ? Math.min(100, Math.round((used / quota) * 100)) : 0;
  const danger = quota > 0 && remaining === 0;
  const warning = quota > 0 && remaining > 0 && pct >= 80;

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="font-semibold">AI Reply Usage</h3>
            <Badge variant="secondary" className="capitalize">{status.plan}</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Monthly reply quota — resets {status.period_end ? new Date(status.period_end).toLocaleDateString() : "soon"}
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold tabular-nums">{used.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground">of {quota.toLocaleString()}</div>
        </div>
      </div>
      <Progress value={pct} className="h-2" />
      <div className="flex items-center justify-between mt-2 text-xs">
        <span className={danger ? "text-destructive font-medium" : warning ? "text-orange-500 font-medium" : "text-muted-foreground"}>
          {danger ? (<><AlertTriangle className="h-3 w-3 inline mr-1" />Quota exhausted — AI replies paused</>)
            : warning ? (<><AlertTriangle className="h-3 w-3 inline mr-1" />{remaining.toLocaleString()} replies left</>)
            : `${remaining.toLocaleString()} replies left`}
        </span>
        <span className="text-muted-foreground">Max {status.max_tokens} tokens / reply</span>
      </div>
    </Card>
  );
}
