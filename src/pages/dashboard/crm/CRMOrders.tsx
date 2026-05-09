import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Truck, Send, Eye, Plus, Trash2 } from "lucide-react";

type Order = any;

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-warning/15 text-warning",
  confirmed: "bg-primary/15 text-primary",
  shipped: "bg-blue-500/15 text-blue-500",
  delivered: "bg-success/15 text-success",
  returned: "bg-destructive/15 text-destructive",
  cancelled: "bg-muted text-muted-foreground",
};

export default function CRMOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [bookingOrder, setBookingOrder] = useState<Order | null>(null);
  const [viewOrder, setViewOrder] = useState<Order | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [courier, setCourier] = useState("pathao");
  const [weight, setWeight] = useState("1");
  const [bookNotes, setBookNotes] = useState("");

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from("crm_orders").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setOrders(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const filtered = orders.filter(o => {
    if (statusFilter !== "all" && o.order_status !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (o.customer_name || "").toLowerCase().includes(s) || (o.customer_phone || "").includes(s) || (o.woo_order_id || "").toLowerCase().includes(s);
    }
    return true;
  });

  const bookCourier = async () => {
    if (!bookingOrder) return;
    const trackingId = `${courier.toUpperCase()}-${Date.now().toString().slice(-8)}`;
    await supabase.from("crm_orders").update({ courier_name: courier, tracking_id: trackingId, courier_status: "in_transit", order_status: "shipped" }).eq("id", bookingOrder.id);
    toast.success(`Booked with ${courier.toUpperCase()} • ${trackingId}`);
    console.log("[stub] courier API call →", { courier, weight, notes: bookNotes, trackingId });
    toast.message("WhatsApp tracking message would be sent to customer");
    setBookingOrder(null); setBookNotes(""); setWeight("1");
    load();
  };

  const sendTracking = (o: Order) => {
    if (!o.tracking_id) { toast.error("Book courier first"); return; }
    console.log("[stub] WhatsApp send tracking →", o.customer_phone, o.tracking_id);
    toast.success(`Tracking sent to ${o.customer_phone}`);
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this order?")) return;
    await supabase.from("crm_orders").delete().eq("id", id);
    toast.success("Deleted"); load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Orders</h1>
          <p className="text-sm text-muted-foreground">All WooCommerce orders</p>
        </div>
        <Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4 mr-2" /> Add Order</Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex gap-3 flex-wrap mb-4">
            <Input placeholder="Search name, phone, order ID..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {["pending", "confirmed", "shipped", "delivered", "returned", "cancelled"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Courier</TableHead>
                  <TableHead>Tracking</TableHead>
                  <TableHead>COD</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={10} className="text-center py-6 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={10} className="text-center py-10 text-muted-foreground">No orders. Click "Add Order" to create one.</TableCell></TableRow>
                ) : filtered.map(o => (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-xs">{o.woo_order_id || o.id.slice(0, 8)}</TableCell>
                    <TableCell>{o.customer_name || "-"}</TableCell>
                    <TableCell className="text-xs">{o.customer_phone || "-"}</TableCell>
                    <TableCell>৳{o.total_amount}</TableCell>
                    <TableCell><Badge variant="outline">{o.payment_method}</Badge></TableCell>
                    <TableCell><span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLOR[o.order_status] || "bg-muted"}`}>{o.order_status}</span></TableCell>
                    <TableCell className="text-xs uppercase">{o.courier_name || "-"}</TableCell>
                    <TableCell className="font-mono text-xs">{o.tracking_id || "-"}</TableCell>
                    <TableCell>{o.payment_method === "COD" ? (o.cod_confirmed ? <Badge className="bg-success/15 text-success">Yes</Badge> : <Badge variant="outline">No</Badge>) : "-"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => setBookingOrder(o)} title="Book courier"><Truck className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => sendTracking(o)} title="Send tracking"><Send className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => setViewOrder(o)} title="View"><Eye className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => remove(o.id)} title="Delete"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Booking modal */}
      <Dialog open={!!bookingOrder} onOpenChange={(o) => !o && setBookingOrder(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Book Courier</DialogTitle></DialogHeader>
          {bookingOrder && (
            <div className="space-y-3 text-sm">
              <div className="bg-muted p-3 rounded-lg space-y-1">
                <p><b>{bookingOrder.customer_name}</b> — {bookingOrder.customer_phone}</p>
                <p className="text-muted-foreground">{bookingOrder.customer_address || "No address"}</p>
                <p>Amount: ৳{bookingOrder.total_amount}</p>
              </div>
              <div>
                <Label>Courier</Label>
                <Select value={courier} onValueChange={setCourier}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pathao">Pathao</SelectItem>
                    <SelectItem value="steadfast">Steadfast</SelectItem>
                    <SelectItem value="redx">RedX</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Weight (kg)</Label>
                <Input type="number" step="0.1" value={weight} onChange={e => setWeight(e.target.value)} />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea value={bookNotes} onChange={e => setBookNotes(e.target.value)} rows={2} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setBookingOrder(null)}>Cancel</Button>
            <Button onClick={bookCourier}>Book Now</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View modal */}
      <Dialog open={!!viewOrder} onOpenChange={(o) => !o && setViewOrder(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Order Details</DialogTitle></DialogHeader>
          {viewOrder && (
            <div className="space-y-2 text-sm">
              {Object.entries(viewOrder).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-b border-border pb-1">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="text-right">{String(v ?? "-")}</span>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AddOrderDialog open={addOpen} onOpenChange={setAddOpen} onSaved={load} />
    </div>
  );
}

function AddOrderDialog({ open, onOpenChange, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; onSaved: () => void }) {
  const { user } = useAuth();
  const [form, setForm] = useState({ woo_order_id: "", customer_name: "", customer_phone: "", customer_address: "", total_amount: "", payment_method: "COD", order_status: "pending" });
  const save = async () => {
    if (!user) return;
    if (!form.customer_name || !form.customer_phone) { toast.error("Name & phone required"); return; }
    const { error } = await supabase.from("crm_orders").insert({
      user_id: user.id, ...form, total_amount: Number(form.total_amount) || 0,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Order added");
    setForm({ woo_order_id: "", customer_name: "", customer_phone: "", customer_address: "", total_amount: "", payment_method: "COD", order_status: "pending" });
    onOpenChange(false); onSaved();
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add Order</DialogTitle></DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Order ID</Label><Input value={form.woo_order_id} onChange={e => setForm({ ...form, woo_order_id: e.target.value })} /></div>
            <div><Label>Amount (৳)</Label><Input type="number" value={form.total_amount} onChange={e => setForm({ ...form, total_amount: e.target.value })} /></div>
            <div><Label>Customer Name *</Label><Input value={form.customer_name} onChange={e => setForm({ ...form, customer_name: e.target.value })} /></div>
            <div><Label>Phone *</Label><Input value={form.customer_phone} onChange={e => setForm({ ...form, customer_phone: e.target.value })} /></div>
          </div>
          <div><Label>Address</Label><Textarea value={form.customer_address} onChange={e => setForm({ ...form, customer_address: e.target.value })} rows={2} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Payment</Label>
              <Select value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="COD">COD</SelectItem><SelectItem value="Online">Online</SelectItem></SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.order_status} onValueChange={(v) => setForm({ ...form, order_status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["pending", "confirmed", "shipped", "delivered", "returned", "cancelled"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={save}>Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
