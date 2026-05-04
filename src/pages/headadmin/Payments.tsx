import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Check, X, Loader2, Download } from "lucide-react";

type Tx = {
  id: string;
  user_id: string | null;
  plan: string;
  amount: number;
  payment_method: string;
  transaction_id: string | null;
  sender_number: string | null;
  status: string | null;
  admin_note: string | null;
  created_at: string;
  screenshot_url: string | null;
  profile?: { full_name: string | null; email: string | null } | null;
};

const badge = (s: string | null) => ({
  pending: "bg-yellow-500/15 text-yellow-600 border-yellow-500/40",
  approved: "bg-green-500/15 text-green-600 border-green-500/40",
  rejected: "bg-red-500/15 text-red-600 border-red-500/40",
}[s || "pending"]);

export default function HAPayments() {
  const [rows, setRows] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMethod, setFilterMethod] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [rejectFor, setRejectFor] = useState<Tx | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [working, setWorking] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("payment_transactions").select("*").order("created_at", { ascending: false });
    const txs = (data as Tx[]) || [];
    const userIds = [...new Set(txs.map((t) => t.user_id).filter(Boolean) as string[])];
    if (userIds.length) {
      const { data: profs } = await supabase.from("profiles").select("id,full_name,email").in("id", userIds);
      const map = new Map((profs || []).map((p: any) => [p.id, p]));
      txs.forEach((t) => { if (t.user_id) t.profile = map.get(t.user_id) as any; });
    }
    setRows(txs);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const approve = async (tx: Tx) => {
    if (!tx.user_id) return;
    setWorking(tx.id);
    try {
      const { data: plan } = await supabase.from("plan_pricing").select("*").eq("plan_name", tx.plan).maybeSingle();
      if (!plan) throw new Error("Plan not found");
      await supabase.from("payment_transactions").update({ status: "approved", reviewed_at: new Date().toISOString() }).eq("id", tx.id);
      const { data: existing } = await supabase.from("subscriptions").select("id").eq("user_id", tx.user_id).maybeSingle();
      if (existing) {
        await supabase.from("subscriptions").update({ plan: tx.plan, max_sessions: plan.max_sessions, status: "active" }).eq("id", existing.id);
      } else {
        await supabase.from("subscriptions").insert({ user_id: tx.user_id, plan: tx.plan, max_sessions: plan.max_sessions, status: "active" });
      }
      await supabase.from("profiles").update({ plan: tx.plan, max_sessions: plan.max_sessions }).eq("id", tx.user_id);
      await supabase.from("sales").insert({ user_id: tx.user_id, plan: tx.plan, amount: tx.amount, payment_method: tx.payment_method, payment_status: "paid" });
      toast.success("Payment approved & plan activated");
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally { setWorking(null); }
  };

  const reject = async () => {
    if (!rejectFor) return;
    await supabase.from("payment_transactions").update({ status: "rejected", admin_note: rejectNote, reviewed_at: new Date().toISOString() }).eq("id", rejectFor.id);
    toast.success("Payment rejected");
    setRejectFor(null); setRejectNote(""); load();
  };

  const pending = rows.filter((r) => r.status === "pending");
  const filtered = rows.filter((r) =>
    (!filterMethod || r.payment_method === filterMethod) &&
    (!filterStatus || r.status === filterStatus)
  );
  const totalRevenue = rows.filter((r) => r.status === "approved").reduce((s, r) => s + Number(r.amount), 0);

  const exportCsv = () => {
    const header = "Date,User,Email,Plan,Amount,Method,TrxID,Sender,Status\n";
    const body = filtered.map((r) =>
      [r.created_at, r.profile?.full_name || "", r.profile?.email || "", r.plan, r.amount, r.payment_method, r.transaction_id, r.sender_number, r.status].map((v) => `"${(v ?? "").toString().replace(/"/g, '""')}"`).join(",")
    ).join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "transactions.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const Row = ({ r, showActions }: { r: Tx; showActions?: boolean }) => (
    <tr className="border-t border-border">
      <td className="px-3 py-2 text-xs">{new Date(r.created_at).toLocaleDateString()}</td>
      <td className="px-3 py-2 text-xs">
        <div className="font-medium">{r.profile?.full_name || "—"}</div>
        <div className="text-muted-foreground">{r.profile?.email}</div>
      </td>
      <td className="px-3 py-2 text-xs capitalize">{r.plan}</td>
      <td className="px-3 py-2 text-xs">${r.amount}</td>
      <td className="px-3 py-2 text-xs capitalize">{r.payment_method}</td>
      <td className="px-3 py-2 text-xs font-mono">{r.transaction_id}</td>
      <td className="px-3 py-2 text-xs">{r.sender_number}</td>
      <td className="px-3 py-2 text-xs">
        <span className={`inline-block rounded-full border px-2 py-0.5 capitalize ${badge(r.status)}`}>{r.status}</span>
      </td>
      {showActions && (
        <td className="px-3 py-2 text-xs">
          <div className="flex gap-1">
            <Button size="sm" disabled={working === r.id} onClick={() => approve(r)} className="h-7 bg-green-600 hover:bg-green-700 text-white">
              {working === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
            </Button>
            <Button size="sm" variant="destructive" onClick={() => setRejectFor(r)} className="h-7">
              <X className="h-3 w-3" />
            </Button>
          </div>
        </td>
      )}
    </tr>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Payment Management</h1>
        <p className="text-sm text-muted-foreground">Approve payments and manage transactions</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Total Revenue</p>
          <p className="text-2xl font-bold mt-1">${totalRevenue.toFixed(2)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Pending</p>
          <p className="text-2xl font-bold mt-1">{pending.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">All Transactions</p>
          <p className="text-2xl font-bold mt-1">{rows.length}</p>
        </div>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
          <TabsTrigger value="all">All Transactions</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <div className="rounded-xl border border-border bg-card overflow-x-auto">
            {loading ? <div className="py-12 grid place-items-center"><Loader2 className="h-5 w-5 animate-spin" /></div> :
              pending.length === 0 ? <div className="py-12 text-center text-sm text-muted-foreground">No pending payments</div> :
              <table className="w-full">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground"><tr>
                  <th className="text-left px-3 py-2">Date</th><th className="text-left px-3 py-2">User</th><th className="text-left px-3 py-2">Plan</th>
                  <th className="text-left px-3 py-2">Amount</th><th className="text-left px-3 py-2">Method</th><th className="text-left px-3 py-2">TrxID</th>
                  <th className="text-left px-3 py-2">Sender</th><th className="text-left px-3 py-2">Status</th><th className="text-left px-3 py-2">Actions</th>
                </tr></thead>
                <tbody>{pending.map((r) => <Row key={r.id} r={r} showActions />)}</tbody>
              </table>
            }
          </div>
        </TabsContent>

        <TabsContent value="all">
          <div className="flex flex-wrap gap-2 mb-3">
            <select value={filterMethod} onChange={(e) => setFilterMethod(e.target.value)} className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm">
              <option value="">All methods</option>
              <option value="bkash">bKash</option><option value="nagad">Nagad</option><option value="rocket">Rocket</option><option value="bank">Bank</option>
            </select>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm">
              <option value="">All statuses</option>
              <option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option>
            </select>
            <Button variant="outline" size="sm" onClick={exportCsv} className="ml-auto"><Download className="h-4 w-4 mr-1" /> Export CSV</Button>
          </div>
          <div className="rounded-xl border border-border bg-card overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground"><tr>
                <th className="text-left px-3 py-2">Date</th><th className="text-left px-3 py-2">User</th><th className="text-left px-3 py-2">Plan</th>
                <th className="text-left px-3 py-2">Amount</th><th className="text-left px-3 py-2">Method</th><th className="text-left px-3 py-2">TrxID</th>
                <th className="text-left px-3 py-2">Sender</th><th className="text-left px-3 py-2">Status</th>
              </tr></thead>
              <tbody>{filtered.map((r) => <Row key={r.id} r={r} />)}</tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={!!rejectFor} onOpenChange={(v) => !v && setRejectFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject Payment</DialogTitle></DialogHeader>
          <Textarea value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} placeholder="Enter rejection reason (visible to user)" rows={4} />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setRejectFor(null)}>Cancel</Button>
            <Button variant="destructive" onClick={reject}>Reject</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
