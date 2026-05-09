import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Check, X, Receipt, Clock, Loader2, Eye } from "lucide-react";
import { toast } from "sonner";

type Tx = {
  id: string;
  user_id: string | null;
  plan: string;
  amount: number;
  payment_method: string;
  transaction_id: string | null;
  sender_number: string | null;
  status: string;
  created_at: string;
  screenshot_url: string | null;
  profile?: { full_name: string | null; email: string | null };
};

export default function MobilePayments() {
  const [rows, setRows] = useState<Tx[]>([]);
  const [tab, setTab] = useState<"pending" | "approved" | "rejected">("pending");
  const [working, setWorking] = useState<string | null>(null);
  const [rejectFor, setRejectFor] = useState<Tx | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [viewImage, setViewImage] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from("payment_transactions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    const txs = (data as Tx[]) || [];
    const userIds = [...new Set(txs.map((t) => t.user_id).filter(Boolean) as string[])];
    if (userIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id,full_name,email")
        .in("id", userIds);
      const map = new Map((profs || []).map((p: any) => [p.id, p]));
      txs.forEach((t) => {
        if (t.user_id) t.profile = map.get(t.user_id) as any;
      });
    }
    setRows(txs);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("ha-mobile-pay")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payment_transactions" },
        load
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const approve = async (tx: Tx) => {
    if (!tx.user_id) return;
    setWorking(tx.id);
    try {
      const { data: plan } = await supabase
        .from("plan_pricing")
        .select("*")
        .eq("plan_name", tx.plan)
        .maybeSingle();
      if (!plan) throw new Error("Plan not found");
      await supabase
        .from("payment_transactions")
        .update({ status: "approved", reviewed_at: new Date().toISOString() })
        .eq("id", tx.id);
      const { data: existing } = await supabase
        .from("subscriptions")
        .select("id")
        .eq("user_id", tx.user_id)
        .maybeSingle();
      if (existing) {
        await supabase
          .from("subscriptions")
          .update({ plan: tx.plan, max_sessions: plan.max_sessions, status: "active" })
          .eq("id", existing.id);
      } else {
        await supabase.from("subscriptions").insert({
          user_id: tx.user_id,
          plan: tx.plan,
          max_sessions: plan.max_sessions,
          status: "active",
        });
      }
      await supabase
        .from("profiles")
        .update({ plan: tx.plan, max_sessions: plan.max_sessions })
        .eq("id", tx.user_id);
      await supabase.from("sales").insert({
        user_id: tx.user_id,
        plan: tx.plan,
        amount: tx.amount,
        payment_method: tx.payment_method,
        payment_status: "paid",
      });
      toast.success("✓ Payment approved & plan activated");
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setWorking(null);
    }
  };

  const reject = async () => {
    if (!rejectFor) return;
    await supabase
      .from("payment_transactions")
      .update({
        status: "rejected",
        admin_note: rejectNote,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", rejectFor.id);
    toast.success("Payment rejected");
    setRejectFor(null);
    setRejectNote("");
    load();
  };

  const filtered = rows.filter((r) => r.status === tab);
  const counts = {
    pending: rows.filter((r) => r.status === "pending").length,
    approved: rows.filter((r) => r.status === "approved").length,
    rejected: rows.filter((r) => r.status === "rejected").length,
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Payments</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Approve or reject pending transactions
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {(["pending", "approved", "rejected"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`p-3 rounded-2xl text-left transition-colors ${
              tab === t
                ? "bg-emerald-500 text-black"
                : "bg-white/5 border border-white/10 text-muted-foreground"
            }`}
          >
            <p className="text-[10px] font-bold uppercase tracking-wide">{t}</p>
            <p className="text-xl font-bold">{counts[t]}</p>
          </button>
        ))}
      </div>

      <div className="space-y-2.5">
        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            <Receipt className="h-8 w-8 mx-auto mb-2 opacity-30" />
            No {tab} payments
          </div>
        )}
        {filtered.map((tx) => (
          <div
            key={tx.id}
            className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-3 backdrop-blur"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate">
                  {tx.profile?.full_name || tx.profile?.email || "User"}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {tx.profile?.email}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-lg font-bold text-emerald-400">৳{tx.amount}</p>
                <p className="text-[10px] text-muted-foreground uppercase font-semibold">
                  {tx.plan}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="rounded-lg bg-black/30 px-2.5 py-1.5">
                <p className="text-muted-foreground">Method</p>
                <p className="font-semibold uppercase">{tx.payment_method}</p>
              </div>
              <div className="rounded-lg bg-black/30 px-2.5 py-1.5">
                <p className="text-muted-foreground">From</p>
                <p className="font-semibold truncate">{tx.sender_number || "-"}</p>
              </div>
              <div className="rounded-lg bg-black/30 px-2.5 py-1.5 col-span-2">
                <p className="text-muted-foreground">Trx ID</p>
                <p className="font-semibold truncate font-mono">
                  {tx.transaction_id || "-"}
                </p>
              </div>
            </div>

            {tx.screenshot_url && (
              <button
                onClick={() => setViewImage(tx.screenshot_url)}
                className="w-full py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold flex items-center justify-center gap-1.5 text-muted-foreground"
              >
                <Eye className="h-3.5 w-3.5" /> View screenshot
              </button>
            )}

            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <Clock className="h-3 w-3" />
              {new Date(tx.created_at).toLocaleString()}
            </div>

            {tx.status === "pending" && (
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setRejectFor(tx)}
                  className="flex-1 py-2.5 rounded-xl bg-red-500/15 text-red-400 border border-red-500/30 font-semibold text-sm flex items-center justify-center gap-1.5"
                >
                  <X className="h-4 w-4" /> Reject
                </button>
                <button
                  onClick={() => approve(tx)}
                  disabled={working === tx.id}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-black font-bold text-sm flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/30 disabled:opacity-50"
                >
                  {working === tx.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="h-4 w-4" /> Approve
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Reject modal */}
      {rejectFor && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm grid place-items-center p-4"
          onClick={() => setRejectFor(null)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-card border border-white/10 p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold">Reject Payment</h3>
            <textarea
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="Reason for rejection..."
              className="w-full h-24 p-3 rounded-xl bg-black/40 border border-white/10 text-sm resize-none focus:outline-none focus:border-emerald-500/50"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setRejectFor(null)}
                className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={reject}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-bold text-sm"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image viewer */}
      {viewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 grid place-items-center p-4"
          onClick={() => setViewImage(null)}
        >
          <img
            src={viewImage}
            alt="Payment screenshot"
            className="max-w-full max-h-[85vh] rounded-2xl"
          />
        </div>
      )}
    </div>
  );
}
