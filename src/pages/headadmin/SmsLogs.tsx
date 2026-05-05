import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle2, RefreshCw, MessageSquare, ShoppingBag } from "lucide-react";

interface SmsTx {
  id: string;
  sender: string | null;
  message: string;
  transaction_id: string;
  amount: number | null;
  payment_method: string | null;
  is_used: boolean;
  received_at: string;
}

interface Order {
  id: string;
  order_id: string;
  product_name: string | null;
  buyer_email: string | null;
  buyer_phone: string | null;
  amount: number;
  transaction_id: string | null;
  status: string;
  payment_method: string | null;
  created_at: string;
  confirmed_at: string | null;
  download_url: string | null;
}

export default function SmsLogs() {
  const [sms, setSms] = useState<SmsTx[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"orders" | "sms">("orders");

  const load = async () => {
    setLoading(true);
    const [s, o] = await Promise.all([
      supabase.from("sms_transactions").select("*").order("received_at", { ascending: false }).limit(200),
      supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(200),
    ]);
    if (s.data) setSms(s.data as SmsTx[]);
    if (o.data) setOrders(o.data as Order[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("admin-sms-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "sms_transactions" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const approveOrder = async (order: Order) => {
    const { error } = await supabase
      .from("orders")
      .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
      .eq("id", order.id);
    if (error) return toast.error(error.message);
    if (order.transaction_id) {
      await supabase.from("sms_transactions").update({ is_used: true }).eq("transaction_id", order.transaction_id);
    }
    toast.success(`Order ${order.order_id} approved`);
    load();
  };

  const rejectOrder = async (order: Order) => {
    const { error } = await supabase.from("orders").update({ status: "rejected" }).eq("id", order.id);
    if (error) return toast.error(error.message);
    toast.success("Order rejected");
    load();
  };

  const statusColor = (s: string) =>
    s === "confirmed" ? "bg-success/15 text-success border-success/30"
    : s === "rejected" ? "bg-destructive/15 text-destructive border-destructive/30"
    : "bg-warning/15 text-warning border-warning/30";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">SMS Auto-Verify Logs</h1>
          <p className="text-sm text-muted-foreground">Incoming SMS and customer orders</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />Refresh
        </Button>
      </div>

      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => setTab("orders")}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${tab === "orders" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}
        >
          <ShoppingBag className="h-4 w-4 inline mr-1.5" />Orders ({orders.length})
        </button>
        <button
          onClick={() => setTab("sms")}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${tab === "sms" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}
        >
          <MessageSquare className="h-4 w-4 inline mr-1.5" />SMS ({sms.length})
        </button>
      </div>

      {tab === "orders" && (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2.5 text-left">Order ID</th>
                  <th className="px-3 py-2.5 text-left">Buyer</th>
                  <th className="px-3 py-2.5 text-left">Amount</th>
                  <th className="px-3 py-2.5 text-left">TrxID</th>
                  <th className="px-3 py-2.5 text-left">Method</th>
                  <th className="px-3 py-2.5 text-left">Status</th>
                  <th className="px-3 py-2.5 text-left">Created</th>
                  <th className="px-3 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-t border-border hover:bg-muted/20">
                    <td className="px-3 py-2.5 font-mono text-xs">{o.order_id}</td>
                    <td className="px-3 py-2.5">
                      <div className="text-foreground">{o.buyer_email || "—"}</div>
                      <div className="text-xs text-muted-foreground">{o.buyer_phone || "—"}</div>
                    </td>
                    <td className="px-3 py-2.5 font-semibold">৳{Number(o.amount).toFixed(0)}</td>
                    <td className="px-3 py-2.5 font-mono text-xs">{o.transaction_id || "—"}</td>
                    <td className="px-3 py-2.5 capitalize">{o.payment_method || "—"}</td>
                    <td className="px-3 py-2.5">
                      <Badge variant="outline" className={statusColor(o.status)}>{o.status}</Badge>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-right">
                      {o.status === "pending" && (
                        <div className="flex gap-1.5 justify-end">
                          <Button size="sm" variant="outline" onClick={() => approveOrder(o)}>
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />Approve
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => rejectOrder(o)}>Reject</Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && !loading && (
                  <tr><td colSpan={8} className="px-3 py-10 text-center text-muted-foreground">No orders yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "sms" && (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2.5 text-left">Sender</th>
                  <th className="px-3 py-2.5 text-left">Message</th>
                  <th className="px-3 py-2.5 text-left">TrxID</th>
                  <th className="px-3 py-2.5 text-left">Amount</th>
                  <th className="px-3 py-2.5 text-left">Method</th>
                  <th className="px-3 py-2.5 text-left">Used</th>
                  <th className="px-3 py-2.5 text-left">Received</th>
                </tr>
              </thead>
              <tbody>
                {sms.map((m) => (
                  <tr key={m.id} className="border-t border-border hover:bg-muted/20">
                    <td className="px-3 py-2.5">{m.sender || "—"}</td>
                    <td className="px-3 py-2.5 max-w-[300px] truncate text-xs text-muted-foreground" title={m.message}>{m.message}</td>
                    <td className="px-3 py-2.5 font-mono text-xs">{m.transaction_id}</td>
                    <td className="px-3 py-2.5 font-semibold">৳{Number(m.amount || 0).toFixed(0)}</td>
                    <td className="px-3 py-2.5 capitalize">{m.payment_method || "—"}</td>
                    <td className="px-3 py-2.5">
                      {m.is_used
                        ? <Badge variant="outline" className="bg-success/15 text-success border-success/30">Used</Badge>
                        : <Badge variant="outline" className="bg-muted text-muted-foreground">Free</Badge>}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{new Date(m.received_at).toLocaleString()}</td>
                  </tr>
                ))}
                {sms.length === 0 && !loading && (
                  <tr><td colSpan={7} className="px-3 py-10 text-center text-muted-foreground">No SMS received yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
