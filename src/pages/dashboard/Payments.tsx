import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

type Tx = {
  id: string;
  created_at: string;
  plan: string;
  amount: number;
  payment_method: string;
  transaction_id: string | null;
  status: string | null;
  admin_note: string | null;
};

const statusBadge = (s: string | null) => {
  const map: Record<string, string> = {
    pending: "bg-yellow-500/15 text-yellow-600 border-yellow-500/40",
    approved: "bg-green-500/15 text-green-600 border-green-500/40",
    rejected: "bg-red-500/15 text-red-600 border-red-500/40",
  };
  return map[s || "pending"] || map.pending;
};

const Payments = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from("payment_transactions").select("*").eq("user_id", user.id).order("created_at", { ascending: false })
      .then(({ data }) => { setRows((data as Tx[]) || []); setLoading(false); });
  }, [user]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Payments</h1>
        <p className="text-sm text-muted-foreground">All your payment transactions and their status</p>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="py-16 grid place-items-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">No payments yet</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
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
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border align-top">
                  <td className="px-4 py-3 whitespace-nowrap">{new Date(r.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 capitalize">{r.plan}</td>
                  <td className="px-4 py-3">${r.amount}</td>
                  <td className="px-4 py-3 capitalize">{r.payment_method}</td>
                  <td className="px-4 py-3 font-mono text-xs">{r.transaction_id}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${statusBadge(r.status)}`}>
                      {r.status || "pending"}
                    </span>
                    {r.status === "rejected" && r.admin_note && (
                      <p className="text-xs text-red-500 mt-1 max-w-xs">Reason: {r.admin_note}</p>
                    )}
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

export default Payments;
