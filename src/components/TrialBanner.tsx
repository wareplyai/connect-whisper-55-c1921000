import { Link } from "react-router-dom";
import { Clock, AlertTriangle, ArrowRight } from "lucide-react";
import { useTrial } from "@/hooks/useTrial";

export const TrialBanner = () => {
  const { loading, isTrial, trialEndsAt, daysRemaining, expired } = useTrial();
  if (loading || !isTrial) return null;

  const dateStr = trialEndsAt
    ? trialEndsAt.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    : "—";

  if (expired) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
        <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
        <div className="flex-1">
          <span className="font-medium text-destructive">Trial Expired</span>{" "}
          <span className="text-muted-foreground">— Upgrade to continue with full features.</span>
        </div>
        <Link to="/dashboard/subscription" className="inline-flex items-center gap-1 rounded-lg bg-destructive text-destructive-foreground px-3 py-1.5 text-xs font-medium hover:opacity-90">
          Upgrade Now <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
      <Clock className="h-4 w-4 text-warning shrink-0" />
      <div className="flex-1">
        <span className="font-medium">⏰ Trial Period Active</span>{" "}
        <span className="text-muted-foreground">— Your trial ends on {dateStr} — {daysRemaining} day{daysRemaining === 1 ? "" : "s"} remaining</span>
      </div>
      <Link to="/dashboard/subscription" className="inline-flex items-center gap-1 rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-xs font-medium hover:bg-primary-hover">
        Upgrade Now <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
};
