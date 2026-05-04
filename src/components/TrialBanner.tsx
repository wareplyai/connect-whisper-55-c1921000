import { Link } from "react-router-dom";
import { Clock, AlertTriangle } from "lucide-react";
import { useTrial } from "@/hooks/useTrial";

export const TrialBanner = () => {
  const { loading, isTrial, trialEndsAt, expired } = useTrial();
  if (loading || !isTrial) return null;

  const dateStr = trialEndsAt
    ? trialEndsAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "—";

  return (
    <div className="rounded-xl border border-border bg-card p-4 flex flex-wrap items-center gap-3">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
        {expired ? <AlertTriangle className="h-5 w-5 text-destructive" /> : <Clock className="h-5 w-5" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">{expired ? "Trial Expired" : "Trial Period Active"}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {expired ? "Upgrade to continue with full features." : `Your trial ends on ${dateStr}`}
        </p>
      </div>
      <Link
        to="/dashboard/subscription"
        className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-card-elevated"
      >
        Upgrade Now
      </Link>
    </div>
  );
};
