import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check, Loader2 } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
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

const FAQS = [
  { q: "How are payments processed?", a: "Payments are processed manually. After you submit your transaction, our team verifies and activates your plan within 1-24 hours." },
  { q: "What payment methods are accepted?", a: "We accept bKash, Nagad, Rocket, and direct bank transfers." },
  { q: "What happens if prices increase?", a: "Existing active subscriptions keep their current price until the next renewal cycle." },
  { q: "Will my subscription renew automatically?", a: "No. All renewals are manual — you'll receive a reminder before your plan expires." },
  { q: "Can I cancel anytime?", a: "Yes, you can stop renewing at any time. Your plan stays active until the end of the paid period." },
  { q: "Will I receive an invoice?", a: "Yes, every approved payment generates an invoice visible in your Billing History." },
];

const Plans = () => {
  const { user } = useAuth();
  const [yearly, setYearly] = useState(false);
  const [currency, setCurrency] = useState<"USD" | "BDT">("USD");
  const USD_TO_BDT = 122;
  const fmt = (usd: number) => {
    if (usd === 0) return "Free";
    if (currency === "BDT") return `৳${Math.round(usd * USD_TO_BDT).toLocaleString()}`;
    return `$${Number(usd).toFixed(2)}`;
  };
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  const [maxSessions, setMaxSessions] = useState(1);
  const [usedSessions, setUsedSessions] = useState(0);
  const [selected, setSelected] = useState<Plan | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("plan_pricing").select("*").eq("is_active", true).order("price_monthly");
      setPlans((data as Plan[]) || []);
      if (user) {
        const [{ data: sub }, { data: prof }, { count }] = await Promise.all([
          supabase.from("subscriptions").select("plan,max_sessions,status").eq("user_id", user.id)
            .eq("status", "active").order("created_at", { ascending: false }).limit(1).maybeSingle(),
          supabase.from("profiles").select("plan,max_sessions").eq("id", user.id).maybeSingle(),
          supabase.from("sessions").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        ]);
        setCurrentPlan(sub?.plan || prof?.plan || null);
        setMaxSessions(sub?.max_sessions ?? prof?.max_sessions ?? 1);
        setUsedSessions(count || 0);
      }
      setLoading(false);
    })();
  }, [user]);

  return (
    <div className="space-y-8">
      {/* Current plan banner */}
      <div className="rounded-xl border border-border bg-card px-5 py-4 flex flex-wrap items-center gap-3">
        <p className="text-sm flex-1">
          <span className="text-muted-foreground">Current Plan:</span>{" "}
          <span className="font-semibold capitalize">{currentPlan || "—"}</span>
          <span className="text-muted-foreground"> — {usedSessions} of {maxSessions} WhatsApp sessions available</span>
        </p>
        <Link to="/dashboard/subscription">
          <Button variant="outline" size="sm">Manage Subscription</Button>
        </Link>
      </div>

      <div className="text-center">
        <h1 className="text-3xl font-bold">Choose Your Plan</h1>
        <p className="text-sm text-muted-foreground mt-1">Pick a plan that fits your business needs.</p>
        <div className="mt-5 inline-flex items-center gap-1 rounded-full border border-border bg-card p-1 text-sm">
          <button onClick={() => setYearly(false)} className={`px-4 py-1.5 rounded-full transition ${!yearly ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Monthly</button>
          <button onClick={() => setYearly(true)} className={`px-4 py-1.5 rounded-full transition flex items-center gap-2 ${yearly ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
            Yearly
            <span className="rounded-full bg-green-500/20 text-green-500 text-[10px] font-semibold px-1.5 py-0.5">Save 15%</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
          {plans.map((p) => {
            const popular = p.plan_name === "pro";
            const isCurrent = currentPlan === p.plan_name;
            const price = yearly ? p.price_yearly : p.price_monthly;
            const perSession = price > 0 && p.max_sessions > 0 ? (price / p.max_sessions) : 0;
            return (
              <div key={p.id} className={`relative rounded-xl border-2 bg-[#111111] p-5 flex flex-col transition hover:shadow-lg ${isCurrent ? "border-white" : popular ? "border-green-500" : "border-border hover:border-border/80"}`}>
                {popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-green-500 px-3 py-0.5 text-[11px] font-semibold text-white">Most Popular</span>
                )}
                {isCurrent && (
                  <span className="absolute -top-3 right-3 rounded-full bg-white px-3 py-0.5 text-[11px] font-semibold text-black">Current</span>
                )}
                <h3 className="font-semibold">{p.display_name}</h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-3xl font-bold">{price === 0 ? "Free" : `$${Number(price).toFixed(2)}`}</span>
                  {price > 0 && <span className="text-sm text-muted-foreground">/{yearly ? "yr" : "mo"}</span>}
                </div>
                {perSession > 0 && (
                  <p className="text-xs text-muted-foreground mt-0.5">${perSession.toFixed(2)}/session</p>
                )}
                <p className="text-sm text-muted-foreground mt-2">{p.max_sessions} session{p.max_sessions > 1 ? "s" : ""}</p>
                <ul className="mt-4 space-y-1.5 text-xs flex-1">
                  {(p.features || []).map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" /> <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={() => !isCurrent && p.plan_name !== "trial" && setSelected(p)}
                  disabled={isCurrent || p.plan_name === "trial"}
                  className={`mt-5 w-full ${isCurrent ? "bg-muted text-foreground hover:bg-muted" : ""}`}
                >
                  {isCurrent ? "Manage Plan" : p.plan_name === "trial" ? "Start Trial" : "Choose Plan"}
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* FAQ */}
      <div className="max-w-3xl mx-auto pt-6">
        <h2 className="text-2xl font-bold text-center mb-6">Frequently Asked Questions</h2>
        <Accordion type="single" collapsible className="rounded-xl border border-border bg-card divide-y divide-border">
          {FAQS.map((f, i) => (
            <AccordionItem key={i} value={`q-${i}`} className="px-4 border-0">
              <AccordionTrigger className="text-sm font-medium">{f.q}</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      <PaymentModal open={!!selected} onOpenChange={(v) => !v && setSelected(null)} plan={selected} yearly={yearly} />
    </div>
  );
};

export default Plans;
