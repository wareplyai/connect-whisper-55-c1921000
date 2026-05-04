import { Link } from "react-router-dom";
import { Clock, XCircle } from "lucide-react";
import { useTrial } from "@/hooks/useTrial";

export const TrialBanner = () => {
  const { loading, isTrial, trialEndsAt, expired } = useTrial();
  if (loading || !isTrial) return null;

  const dateStr = trialEndsAt
    ? trialEndsAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "—";

  if (expired) {
    return (
      <div className="rounded-xl border border-red-500/40 bg-[#2a0a0a] p-4 flex flex-wrap items-center gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-red-500/10 text-red-500">
          <XCircle className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-red-500">Trial Period Expired</p>
          <p className="text-xs text-red-400/70 mt-0.5">Your trial has ended. Subscribe now to continue using our services.</p>
        </div>
        <Link
          to="/dashboard/subscription/plans"
          className="inline-flex items-center rounded-lg bg-red-500 text-white px-4 py-1.5 text-xs font-semibold hover:bg-red-600"
        >
          Subscribe Now
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 flex flex-wrap items-center gap-3">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
        <Clock className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">Trial Period Active</p>
        <p className="text-xs text-muted-foreground mt-0.5">Your trial ends on {dateStr}</p>
      </div>
      <Link
        to="/dashboard/subscription/plans"
        className="inline-flex items-center gap-1 rounded-lg bg-white text-black px-4 py-1.5 text-xs font-semibold hover:bg-white/90"
      >
        Upgrade Now
      </Link>
    </div>
  );
};
