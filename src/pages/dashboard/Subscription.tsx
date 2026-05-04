import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PaymentModal } from "@/components/PaymentModal";

type Plan = {
  id: string;
  plan_name: string;
  display_name: string;
  price_monthly: number;
  price_yearly: number;
  max_sessions: number;
  features: string[] | null;
  is_active: boolean;
};

const Subscription = () => {
  const { user } = useAuth();
  const [yearly, setYearly] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  const [selected, setSelected] = useState<Plan | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("plan_pricing").select("*").eq("is_active", true).order("price_monthly");
      setPlans(((data as any[]) || []).filter((p) => p.plan_name !== "trial") as Plan[]);
      if (user) {
        const { data: sub } = await supabase
          .from("subscriptions").select("plan,status").eq("user_id", user.id)
          .order("created_at", { ascending: false }).limit(1).maybeSingle();
        setCurrentPlan(sub?.plan || null);
      }
      setLoading(false);
    })();
  }, [user]);

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Subscription Plans</h1>
        <p className="text-sm text-muted-foreground mt-1">Choose the plan that fits your needs.</p>
        <div className="mt-5 inline-flex items-center gap-1 rounded-full border border-border bg-card p-1 text-sm">
          <button onClick={() => setYearly(false)} className={`px-4 py-1.5 rounded-full transition ${!yearly ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Monthly</button>
          <button onClick={() => setYearly(true)} className={`px-4 py-1.5 rounded-full transition ${yearly ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Yearly · Save 15%</button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((p) => {
            const popular = p.plan_name === "pro";
            const isCurrent = currentPlan === p.plan_name;
            const price = yearly ? p.price_yearly : p.price_monthly;
            return (
              <div key={p.id} className={`relative rounded-xl border-2 bg-card p-6 flex flex-col ${isCurrent ? "border-green-500" : popular ? "border-primary glow-primary" : "border-border"}`}>
                {popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">Most Popular</span>
                )}
                {isCurrent && (
                  <span className="absolute -top-3 right-3 rounded-full bg-green-500 px-3 py-0.5 text-xs font-semibold text-white">Active</span>
                )}
                <h3 className="font-semibold">{p.display_name}</h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-3xl font-bold">${price}</span>
                  <span className="text-sm text-muted-foreground">/{yearly ? "yr" : "mo"}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{p.max_sessions} session{p.max_sessions > 1 ? "s" : ""}</p>
                <ul className="mt-4 space-y-1.5 text-xs flex-1">
                  {(p.features || []).map((f) => (
                    <li key={f} className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-primary" /> {f}</li>
                  ))}
                </ul>
                <Button
                  onClick={() => setSelected(p)}
                  disabled={isCurrent}
                  className="mt-5 w-full bg-primary text-primary-foreground hover:bg-primary-hover"
                >
                  {isCurrent ? "Current Plan" : popular ? "Get Started" : "Choose Plan"}
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <PaymentModal open={!!selected} onOpenChange={(v) => !v && setSelected(null)} plan={selected} yearly={yearly} />
    </div>
  );
};

export default Subscription;
