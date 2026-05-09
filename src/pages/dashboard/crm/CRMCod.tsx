import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Send, Check, X } from "lucide-react";

export default function CRMCod() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("crm_orders")
      .select("*")
      .eq("user_id", user.id)
      .eq("payment_method", "COD")
      .order("created_at", { ascending: false });
    setOrders(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  // Realtime: refresh when bot updates an order based on YES/NO reply
  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel(`crm_orders_cod_${user.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "crm_orders", filter: `user_id=eq.${user.id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const pending = orders.filter((o) => !o.cod_confirmed);

  const toggle = (id: string) => {
    const s = new Set(selected);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelected(s);
  };

  const toggleAll = () => {
    setSelected(selected.size === pending.length ? new Set() : new Set(pending.map((o) => o.id)));
  };

  const sendBulk = async () => {
    if (selected.size === 0) { toast.error("Select orders first"); return; }
    toast.message(`Sending to ${selected.size} customer(s)...`);
    const { data, error } = await supabase.functions.invoke("crm-cod-send", {
      body: { order_ids: Array.from(selected) },
    });
    if (error || data?.error) {
      toast.error(error?.message || data?.error || "Send failed");
      return;
    }
    toast.success(`Sent ${data.sent}/${data.total} • ${data.stub} stubbed`);
    setSelected(new Set());
    load();
  };

  const setStatus = async (o: any, confirmed: boolean) => {
    await supabase.from("crm_orders").update({ cod_confirmed: confirmed, order_status: confirmed ? "confirmed" : "cancelled" }).eq("id", o.id);
    toast.success(confirmed ? "Marked YES" : "Marked NO");
    load();
  };

  const yesCount = orders.filter((o) => o.cod_confirmed).length;
  const noCount = orders.filter((o) => !o.cod_confirmed && o.order_status === "cancelled").length;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">COD Confirmation</h1>
        <p className="text-sm text-muted-foreground">Send bulk confirmations and track YES/NO responses</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Pending</p><p className="text-2xl font-bold">{pending.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Confirmed (YES)</p><p className="text-2xl font-bold text-success">{yesCount}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Declined (NO)</p><p className="text-2xl font-bold text-destructive">{noCount}</p></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{selected.size} selected</p>
            <Button onClick={sendBulk} disabled={selected.size === 0}>
              <Send className="h-4 w-4 mr-2" /> Send Bulk Confirmation
            </Button>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox checked={pending.length > 0 && selected.size === pending.length} onCheckedChange={toggleAll} />
                  </TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>COD</TableHead>
                  <TableHead className="text-right">Mark</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : orders.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">No COD orders</TableCell></TableRow>
                ) : orders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell>
                      {!o.cod_confirmed && <Checkbox checked={selected.has(o.id)} onCheckedChange={() => toggle(o.id)} />}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{o.woo_order_id || o.id.slice(0, 8)}</TableCell>
                    <TableCell>{o.customer_name}</TableCell>
                    <TableCell className="text-xs">{o.customer_phone}</TableCell>
                    <TableCell>৳{o.total_amount}</TableCell>
                    <TableCell>
                      {o.cod_confirmed ? (
                        <Badge className="bg-success/15 text-success">YES</Badge>
                      ) : o.order_status === "cancelled" ? (
                        <Badge className="bg-destructive/15 text-destructive">NO</Badge>
                      ) : (
                        <Badge variant="outline">Pending</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => setStatus(o, true)} title="Mark YES">
                          <Check className="h-4 w-4 text-success" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setStatus(o, false)} title="Mark NO">
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
