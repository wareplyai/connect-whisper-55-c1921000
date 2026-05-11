import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Truck, Send, Eye, Plus, Trash2, FileText, RefreshCw, CheckCircle2, XCircle } from "lucide-react";

type Order = any;

const STATUS_OPTIONS = ["pending", "confirmed", "shipped", "delivered", "returned", "cancelled"];

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-warning/15 text-warning border-warning/30",
  confirmed: "bg-primary/15 text-primary border-primary/30",
  shipped: "bg-blue-500/15 text-blue-500 border-blue-500/30",
  delivered: "bg-success/15 text-success border-success/30",
  returned: "bg-destructive/15 text-destructive border-destructive/30",
  cancelled: "bg-muted text-muted-foreground border-border",
};

const AUTO_SYNC_KEY = "crm_orders_auto_sync";

export default function CRMOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [bookingOrder, setBookingOrder] = useState<Order | null>(null);
  const [viewOrder, setViewOrder] = useState<Order | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [courier, setCourier] = useState("pathao");
  const [weight, setWeight] = useState("1");
  const [bookNotes, setBookNotes] = useState("");
  const [autoSync, setAutoSync] = useState<boolean>(() => localStorage.getItem(AUTO_SYNC_KEY) === "1");
  const [syncing, setSyncing] = useState(false);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from("crm_orders").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setOrders(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  // Realtime updates so manual + AI/automation stay in sync
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("crm_orders_rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "crm_orders", filter: `user_id=eq.${user.id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  // Auto-sync courier statuses from API every 2 minutes when toggle is ON
  useEffect(() => {
    if (!autoSync) return;
    const tick = () => syncCourierStatuses(true);
    tick();
    const t = setInterval(tick, 120_000);
    return () => clearInterval(t);
  }, [autoSync, orders.length]);

  const filtered = useMemo(() => orders.filter(o => {
    if (statusFilter !== "all" && o.order_status !== statusFilter) return false;
    if (sourceFilter !== "all" && (o.source || "woocommerce") !== sourceFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (o.customer_name || "").toLowerCase().includes(s) || (o.customer_phone || "").includes(s) || (o.woo_order_id || "").toLowerCase().includes(s);
    }
    return true;
  }), [orders, statusFilter, sourceFilter, search]);

  const counts = {
    all: orders.length,
    woocommerce: orders.filter(o => (o.source || "woocommerce") === "woocommerce").length,
    whatsapp: orders.filter(o => o.source === "whatsapp").length,
    pending: orders.filter(o => o.order_status === "pending").length,
    delivered: orders.filter(o => o.order_status === "delivered").length,
  };

  const updateStatus = async (o: Order, status: string) => {
    const prev = o.order_status;
    setOrders(s => s.map(x => x.id === o.id ? { ...x, order_status: status } : x));
    const { error } = await supabase.from("crm_orders").update({ order_status: status }).eq("id", o.id);
    if (error) {
      toast.error("Status update failed");
      setOrders(s => s.map(x => x.id === o.id ? { ...x, order_status: prev } : x));
    } else {
      toast.success(`Status → ${status}`);
    }
  };

  const toggleCod = async (o: Order, val: boolean) => {
    setOrders(s => s.map(x => x.id === o.id ? { ...x, cod_confirmed: val } : x));
    const { error } = await supabase.from("crm_orders").update({ cod_confirmed: val }).eq("id", o.id);
    if (error) { toast.error("COD update failed"); load(); }
    else toast.success(val ? "COD confirmed" : "COD unconfirmed");
  };

  const bookCourier = async () => {
    if (!bookingOrder) return;
    toast.message(`Booking with ${courier.toUpperCase()}...`);
    const { data, error } = await supabase.functions.invoke("crm-book-courier", {
      body: { order_id: bookingOrder.id, courier, notes: bookNotes, weight },
    });
    if (error || data?.error) {
      toast.error(error?.message || data?.error || "Booking failed");
      return;
    }
    toast.success(`Booked • ${data.tracking_id}${data.stub ? " (stub)" : ""}`);
    setBookingOrder(null); setBookNotes(""); setWeight("1");
    load();
  };

  const sendTracking = (o: Order) => {
    if (!o.tracking_id) { toast.error("Book courier first"); return; }
    toast.success(`Tracking sent to ${o.customer_phone}`);
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this order?")) return;
    await supabase.from("crm_orders").delete().eq("id", id);
    toast.success("Deleted"); load();
  };

  // Stub: in real automation an edge function polls courier APIs. Here we no-op silently
  // unless invoked manually. Wire to your courier-sync edge function when ready.
  const syncCourierStatuses = async (silent = false) => {
    const booked = orders.filter(o => o.tracking_id);
    if (!booked.length) {
      if (!silent) toast.info("No booked orders to sync");
      return;
    }
    if (!silent) setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("crm-book-courier", {
        body: { sync_only: true, order_ids: booked.map(b => b.id) },
      });
      if (!silent) {
        if (error) toast.error(error.message);
        else toast.success(`Synced ${data?.updated ?? booked.length} order(s)`);
      }
      load();
    } catch (e: any) {
      if (!silent) toast.error(e.message || "Sync failed");
    } finally {
      if (!silent) setSyncing(false);
    }
  };

  const toggleAutoSync = (v: boolean) => {
    setAutoSync(v);
    localStorage.setItem(AUTO_SYNC_KEY, v ? "1" : "0");
    toast.success(v ? "Auto-sync ON (every 2 min)" : "Auto-sync OFF");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Orders</h1>
          <p className="text-sm text-muted-foreground">All orders from WooCommerce & WhatsApp — manual + AI automation</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card">
            <RefreshCw className={`h-4 w-4 ${autoSync ? "text-success" : "text-muted-foreground"}`} />
            <span className="text-xs">Auto-sync</span>
            <Switch checked={autoSync} onCheckedChange={toggleAutoSync} />
          </div>
          <Button variant="outline" onClick={() => syncCourierStatuses(false)} disabled={syncing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} /> Sync now
          </Button>
          <Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4 mr-2" /> Add Order</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { k: "all", label: "All Orders", v: counts.all },
          { k: "woocommerce", label: "WooCommerce", v: counts.woocommerce },
          { k: "whatsapp", label: "WhatsApp", v: counts.whatsapp },
          { k: "pending-stat", label: "Pending", v: counts.pending },
          { k: "delivered-stat", label: "Delivered", v: counts.delivered },
        ].map(s => {
          const active =
            (s.k === "all" && sourceFilter === "all" && statusFilter === "all") ||
            (s.k === "woocommerce" && sourceFilter === "woocommerce") ||
            (s.k === "whatsapp" && sourceFilter === "whatsapp") ||
            (s.k === "pending-stat" && statusFilter === "pending") ||
            (s.k === "delivered-stat" && statusFilter === "delivered");
          return (
            <button
              key={s.k}
              onClick={() => {
                if (s.k === "all") { setSourceFilter("all"); setStatusFilter("all"); }
                else if (s.k === "woocommerce" || s.k === "whatsapp") setSourceFilter(s.k);
                else if (s.k === "pending-stat") setStatusFilter("pending");
                else if (s.k === "delivered-stat") setStatusFilter("delivered");
              }}
              className={`text-left p-3 rounded-xl border transition ${active ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-muted/40"}`}
            >
              <div className="text-xs text-muted-foreground">{s.label}</div>
              <div className="text-2xl font-bold">{s.v}</div>
            </button>
          );
        })}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex gap-3 flex-wrap mb-4">
            <Input placeholder="Search name, phone, order ID..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="woocommerce">WooCommerce</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Source</TableHead>
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
                  <TableRow><TableCell colSpan={11} className="text-center py-6 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={11} className="text-center py-10 text-muted-foreground">No orders.</TableCell></TableRow>
                ) : filtered.map(o => (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-xs">{o.woo_order_id || o.id.slice(0, 8)}</TableCell>
                    <TableCell>
                      {o.source === "whatsapp"
                        ? <Badge className="bg-green-500/15 text-green-600">WhatsApp</Badge>
                        : <Badge className="bg-purple-500/15 text-purple-600">WooCommerce</Badge>}
                    </TableCell>
                    <TableCell>{o.customer_name || "-"}</TableCell>
                    <TableCell className="text-xs">{o.customer_phone || "-"}</TableCell>
                    <TableCell>৳{o.total_amount}</TableCell>
                    <TableCell><Badge variant="outline">{o.payment_method}</Badge></TableCell>
                    <TableCell>
                      <Select value={o.order_status} onValueChange={(v) => updateStatus(o, v)}>
                        <SelectTrigger className={`h-8 w-32 text-xs border ${STATUS_COLOR[o.order_status] || ""}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-xs uppercase">
                      {o.courier_name || "-"}
                      {o.courier_status && <div className="text-[10px] text-muted-foreground normal-case">{o.courier_status}</div>}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{o.tracking_id || "-"}</TableCell>
                    <TableCell>
                      {o.payment_method === "COD" ? (
                        <button
                          onClick={() => toggleCod(o, !o.cod_confirmed)}
                          className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border ${o.cod_confirmed ? "bg-success/15 text-success border-success/30" : "bg-muted text-muted-foreground border-border"}`}
                          title="Click to toggle (manual). AI auto-confirms on payment."
                        >
                          {o.cod_confirmed ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                          {o.cod_confirmed ? "Confirmed" : "Pending"}
                        </button>
                      ) : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => printInvoice(o)} title="Invoice"><FileText className="h-4 w-4" /></Button>
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
            <div className="space-y-2 text-sm max-h-[60vh] overflow-auto">
              {Object.entries(viewOrder).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-b border-border pb-1">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="text-right break-all">{String(v ?? "-")}</span>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            {viewOrder && <Button onClick={() => printInvoice(viewOrder)}><FileText className="h-4 w-4 mr-2" /> Invoice</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AddOrderDialog open={addOpen} onOpenChange={setAddOpen} onSaved={load} />
    </div>
  );
}

function printInvoice(o: Order) {
  const orderId = o.woo_order_id || `WA-${String(o.id).slice(0, 8).toUpperCase()}`;
  const date = new Date(o.created_at || Date.now()).toLocaleString();
  const subtotal = Number(o.total_amount || 0);
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Invoice ${orderId}</title>
  <style>
    *{box-sizing:border-box} body{font-family:'Inter',-apple-system,Segoe UI,sans-serif;margin:0;padding:40px;color:#0f172a;background:#f8fafc}
    .inv{max-width:800px;margin:auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,.08)}
    .head{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;padding:32px 40px;display:flex;justify-content:space-between;align-items:flex-start}
    .head h1{margin:0;font-size:32px;letter-spacing:-.5px}
    .head .sub{opacity:.85;font-size:13px;margin-top:4px}
    .meta{text-align:right;font-size:13px}
    .meta b{font-size:18px;display:block;margin-bottom:4px}
    .body{padding:32px 40px}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:24px}
    .box{background:#f1f5f9;border-radius:12px;padding:16px}
    .box h3{margin:0 0 8px;font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#64748b}
    .box p{margin:2px 0;font-size:14px}
    table{width:100%;border-collapse:collapse;margin-top:12px}
    th{text-align:left;padding:12px;background:#0f172a;color:#fff;font-size:12px;text-transform:uppercase;letter-spacing:.5px}
    th:last-child,td:last-child{text-align:right}
    td{padding:14px 12px;border-bottom:1px solid #e2e8f0;font-size:14px}
    .totals{margin-top:16px;margin-left:auto;width:280px;font-size:14px}
    .totals .row{display:flex;justify-content:space-between;padding:6px 0}
    .totals .grand{border-top:2px solid #0f172a;margin-top:8px;padding-top:12px;font-size:18px;font-weight:700}
    .badge{display:inline-block;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.5px}
    .b-paid{background:#dcfce7;color:#16a34a}.b-pend{background:#fef3c7;color:#d97706}
    .foot{padding:24px 40px;background:#f8fafc;text-align:center;color:#64748b;font-size:12px;border-top:1px solid #e2e8f0}
    .foot b{color:#0f172a}
    @media print{body{background:#fff;padding:0}.inv{box-shadow:none}.noprint{display:none}}
    .noprint{position:fixed;top:16px;right:16px}
    .btn{background:#6366f1;color:#fff;border:0;padding:10px 18px;border-radius:8px;font-weight:600;cursor:pointer}
  </style></head><body>
  <div class="noprint"><button class="btn" onclick="window.print()">🖨 Print / Save PDF</button></div>
  <div class="inv">
    <div class="head">
      <div><h1>INVOICE</h1><div class="sub">Thank you for your order</div></div>
      <div class="meta"><b>#${orderId}</b>${date}<br/><span class="badge ${o.cod_confirmed || o.payment_method !== "COD" ? "b-paid" : "b-pend"}">${o.cod_confirmed ? "PAID" : o.payment_method === "COD" ? "COD PENDING" : "PAID"}</span></div>
    </div>
    <div class="body">
      <div class="grid">
        <div class="box"><h3>Bill To</h3>
          <p><b>${esc(o.customer_name || "Customer")}</b></p>
          <p>${esc(o.customer_phone || "")}</p>
          <p>${esc(o.customer_address || "")}</p>
        </div>
        <div class="box"><h3>Order Info</h3>
          <p>Source: <b>${esc((o.source || "woocommerce").toUpperCase())}</b></p>
          <p>Payment: <b>${esc(o.payment_method || "-")}</b></p>
          <p>Status: <b>${esc(o.order_status || "-")}</b></p>
          ${o.courier_name ? `<p>Courier: <b>${esc(o.courier_name.toUpperCase())}</b></p>` : ""}
          ${o.tracking_id ? `<p>Tracking: <b>${esc(o.tracking_id)}</b></p>` : ""}
        </div>
      </div>
      <table>
        <thead><tr><th>#</th><th>Description</th><th>Qty</th><th>Amount</th></tr></thead>
        <tbody><tr><td>1</td><td>Order ${esc(orderId)}</td><td>1</td><td>৳${subtotal.toFixed(2)}</td></tr></tbody>
      </table>
      <div class="totals">
        <div class="row"><span>Subtotal</span><span>৳${subtotal.toFixed(2)}</span></div>
        <div class="row"><span>Delivery</span><span>৳0.00</span></div>
        <div class="row grand"><span>Total</span><span>৳${subtotal.toFixed(2)}</span></div>
      </div>
    </div>
    <div class="foot">Generated automatically • <b>Thank you for shopping with us!</b></div>
  </div>
  <script>setTimeout(()=>window.print(),300)</script>
  </body></html>`;
  const w = window.open("", "_blank", "width=900,height=1000");
  if (!w) { return; }
  w.document.write(html); w.document.close();
}

function esc(s: any) { return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!)); }

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
                <SelectContent>{STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={save}>Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
