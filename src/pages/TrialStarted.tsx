import { Link } from "react-router-dom";
import { CheckCircle2, ArrowRight, Infinity as Inf, Zap, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

const TrialStarted = () => {
  return (
    <div className="min-h-screen grid place-items-center bg-hero p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-card p-8 md:p-10 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-primary/10 text-primary">
          <CheckCircle2 className="h-9 w-9" />
        </div>
        <h1 className="mt-5 text-3xl font-bold">Your Free Trial Has Started!</h1>
        <p className="mt-2 text-muted-foreground">
          You now have full access for 3 days to all premium features.
        </p>

        <div className="mt-8 grid sm:grid-cols-2 gap-3 text-left">
          <Card icon={<Calendar className="h-4 w-4" />} label="Plan" value="Free Trial (3 Days)" />
          <Card icon={<Inf className="h-4 w-4" />} label="WhatsApp Sessions" value="Unlimited" />
          <Card icon={<Zap className="h-4 w-4" />} label="API Requests" value="Unlimited" />
          <Card icon={<CheckCircle2 className="h-4 w-4" />} label="Status" value="Trial Active" highlight />
        </div>

        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild className="bg-primary text-primary-foreground hover:bg-primary-hover">
            <Link to="/dashboard/sessions/create">Create WhatsApp Session <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/dashboard/subscription">View Subscription Details</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

const Card = ({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: string; highlight?: boolean }) => (
  <div className={`rounded-xl border p-4 ${highlight ? "border-primary/40 bg-primary/5" : "border-border bg-card-elevated"}`}>
    <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
      {icon} {label}
    </div>
    <p className={`mt-1.5 text-base font-semibold ${highlight ? "text-primary" : ""}`}>{value}</p>
  </div>
);

export default TrialStarted;
