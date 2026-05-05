import { Link } from "react-router-dom";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  to?: string;
  className?: string;
}

export const NoActiveSubscriptionBanner = ({ to = "/dashboard/subscription/plans", className = "" }: Props) => {
  return (
    <div className={`rounded-xl border border-border bg-card p-5 flex items-start gap-4 ${className}`}>
      <div className="rounded-full bg-muted p-2.5 shrink-0">
        <UserPlus className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold">No Active Subscription</p>
        <p className="text-sm text-muted-foreground mt-0.5">
          You don't have an active subscription or trial. Start a free trial or subscribe to a plan to get access.
        </p>
      </div>
      <Button asChild variant="secondary" className="shrink-0">
        <Link to={to}>View Plans</Link>
      </Button>
    </div>
  );
};

export default NoActiveSubscriptionBanner;
