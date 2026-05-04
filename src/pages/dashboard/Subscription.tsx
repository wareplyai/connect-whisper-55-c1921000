import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Clock, XCircle, MessageSquare, Loader2, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type Sub = {
  plan: string;
  status: string;
  max_sessions: number | null;
  trial_ends_at: string | null;
  display_name?: string;
};

type Tx = {
  id: string;
  created_at: string;
  plan: string;
  amount: number;
  payment_method: string;
  transaction_id: string | null;
  status: string | null;
};

const statusBadge = (s: string | null) => ({
  pending: "bg-yellow-500/15 text-yellow-500 border-yellow-500/40",
  approved: "bg-green-500/15 text-green-500 border-green-500/40",
  rejected: "bg-red-500/15 text-red-500 border-red-500/40",
}[s || "pending"] || "bg-muted text-muted-foreground border-border");

const Subscription = () => {
  const { user } = useAuth();
  const [sub, setSub] = useState<Sub | null>(null);
  const [usedSessions, setUsedSessions] = useState(0);
  const [planPrice, setPlanPrice] = useState(0);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: s }, { count }, { data: t }] = await Promise.all([
        supabase.from("subscriptions").select("plan,status,max_sessions,trial_ends_at")
          .eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("sessions").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("payment_transactions").select("id,created_at,plan,amount,payment_method,transaction_id,status")
          .eq("user_id", user.id).order("created_at", { ascending: false }),
      ]);
      setSub(s as Sub | null);
      setUsedSessions(count || 0);
      setTxs((t as Tx[]) || []);
      if (s?.plan && s.plan !== "trial") {
        const { data: p } = await supabase.from("plan_pricing").select("price_monthly").eq("plan_name", s.plan).maybeSingle();
        setPlanPrice(Number(p?.price_monthly || 0));
      }
      setLoading(false);
    })();
  }, [user]);

  if (loading) return <div className="py-20 grid place-items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  const isTrial = sub?.plan === "trial";
  const trialEnds = sub?.trial_ends_at ? new Date(sub.trial_ends_at) : null;
  const trialExpired = isTrial && trialEnds ? trialEnds.getTime() < Date.now() : false;
  const max = sub?.max_sessions || 1;
  const usagePct = Math.min(100, Math.round((usedSessions / max) * 100));
  const dateStr = trialEnds?.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) || "—";

  return (
    <div className="space-y-6">
      {/* Trial status banner */}
      {isTrial && !trialExpired && (
        <div className="rounded-xl border border-border bg-[#1a1a1a] p-4 flex flex-wrap items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <Clock className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-white">Trial Period Active</p>
            <p className="text-xs text-muted-foreground mt-0.5">Your trial ends on {dateStr}</p>
          </div>
          <Link to="/dashboard/subscription/plans" className="inline-flex items-center rounded-lg bg-white text-black px-4 py-1.5 text-sm font-semibold hover:bg-white/90">
            Upgrade Now
          </Link>
        </div>
      )}

      {trialExpired && (
        <div className="rounded-xl border border-red-500/40 bg-[#2a0a0a] p-4 flex flex-wrap items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-red-500/10 text-red-500">
            <XCircle className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-red-500">Trial Period Expired</p>
            <p className="text-xs text-red-400/70 mt-0.5">Your trial has ended. Subscribe now to continue using our services.</p>
          </div>
          <Link to="/dashboard/subscription/plans" className="inline-flex items-center rounded-lg bg-red-500 text-white px-4 py-1.5 text-sm font-semibold hover:bg-red-600">
            Subscribe Now
          </Link>
        </div>
      )}

      <div className="grid lg:grid-cols-10 gap-6">
        {/* Current Plan card */}
        <div className="lg:col-span-7 rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="rounded-md border border-border px-2 py-0.5 text-xs font-medium capitalize">{sub?.plan || "—"}</span>
              {trialExpired ? (
                <span className="rounded-full bg-red-500/15 text-red-500 border border-red-500/40 px-2 py-0.5 text-xs font-medium">Expired</span>
              ) : (
                <span className="rounded-full bg-green-500/15 text-green-500 border border-green-500/40 px-2 py-0.5 text-xs font-medium">Active</span>
              )}
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">${planPrice.toFixed(2)}<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">Manage your current plan features</p>

          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <span>WhatsApp Sessions</span>
              </div>
              <span className="text-muted-foreground">{usedSessions} / {max} available</span>
            </div>
            <Progress value={usagePct} className="h-2 [&>div]:bg-green-500" />
          </div>

          <Link to="/dashboard/subscription/plans" className="block">
            <Button className="w-full bg-primary hover:bg-primary/90">Upgrade For Full Features</Button>
          </Link>
        </div>

        {/* Right sidebar */}
        <div className="lg:col-span-3 space-y-4">
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-3xl font-bold">$0.00</p>
            <p className="text-xs text-muted-foreground mt-1">Available Credit</p>
            <p className="text-xs text-muted-foreground mt-3">No credits available.</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-sm font-semibold">Payment Method</p>
            <p className="text-xs text-muted-foreground mt-1">Securely manage your payment details.</p>
            <Link to="/dashboard/payments" className="inline-flex items-center text-xs text-primary mt-3 hover:underline">
              Manage Payment <ArrowRight className="h-3 w-3 ml-1" />
            </Link>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-sm font-semibold">Need help with billing?</p>
            <p className="text-xs text-muted-foreground mt-1">Contact support for billing issues.</p>
            <a href="mailto:support@warereply.ai" className="inline-flex items-center text-xs text-primary mt-3 hover:underline">
              Contact Support <ArrowRight className="h-3 w-3 ml-1" />
            </a>
          </div>
        </div>
      </div>

      {/* Billing history */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="font-semibold">Billing History</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Your recent invoices and payment history</p>
        </div>
        {txs.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">No billing history available</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">Date</th>
                <th className="text-left px-4 py-3">Plan</th>
                <th className="text-left px-4 py-3">Amount</th>
                <th className="text-left px-4 py-3">Method</th>
                <th className="text-left px-4 py-3">TrxID</th>
                <th className="text-left px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {txs.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-4 py-3 whitespace-nowrap">{new Date(r.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 capitalize">{r.plan}</td>
                  <td className="px-4 py-3">${r.amount}</td>
                  <td className="px-4 py-3 capitalize">{r.payment_method}</td>
                  <td className="px-4 py-3 font-mono text-xs">{r.transaction_id}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${statusBadge(r.status)}`}>
                      {r.status || "pending"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Subscription;
