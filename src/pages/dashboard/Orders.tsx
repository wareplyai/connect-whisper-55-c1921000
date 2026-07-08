import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import {
  ShoppingCart, Search, Phone, MapPin, Package, RefreshCw,
  CheckCircle2, Truck, XCircle, Clock, Trash2, MessageSquareText,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

type Order = {
  id: string;
  user_id: string;
  session_id: string | null;
  customer_phone: string;
  customer_name: string | null;
  product_name: string | null;
  quantity: number | null;
  unit_price: number | null;
  total_price: number | null;
  address: string | null;
  notes: string | null;
  raw_summary: string | null;
  status: string;
  source: string;
  created_at: string;
};

const STATUSES = [
  { value: "new", label: "New", icon: Clock, tone: "bg-primary/15 text-primary border-primary/30" },
  { value: "confirmed", label: "Confirmed", icon: CheckCircle2, tone: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  { value: "shipped", label: "Shipped", icon: Truck, tone: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  { value: "delivered", label: "Delivered", icon: CheckCircle2, tone: "bg-green-600/15 text-green-500 border-green-600/30" },
  { value: "cancelled", label: "Cancelled", icon: XCircle, tone: "bg-destructive/15 text-destructive border-destructive/30" },
];

const statusMeta = (s: string) => STATUSES.find((x) => x.value === s) || STATUSES[0];

export default function Orders() {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editing, setEditing] = useState<Order | null>(null);
  const [notesDraft, setNotesDraft] = useState("");

  const load = async () => {
    if (!profile?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("customer_orders" as any)
      .select("*")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) toast({ title: "Failed to load", description: error.message, variant: "destructive" });
    setOrders(((data as any) || []) as Order[]);
    setLoading(false);
  };

  useEffect(() => {
    if (!profile?.id) return;
    load();
    const ch = supabase
      .channel(`orders-${profile.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "customer_orders", filter: `user_id=eq.${profile.id}` },
        () => load(),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        (o.customer_phone || "").toLowerCase().includes(q) ||
        (o.customer_name || "").toLowerCase().includes(q) ||
        (o.product_name || "").toLowerCase().includes(q) ||
        (o.raw_summary || "").toLowerCase().includes(q)
      );
    });
  }, [orders, search, statusFilter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: orders.length };
    STATUSES.forEach((s) => { c[s.value] = orders.filter((o) => o.status === s.value).length; });
    return c;
  }, [orders]);

  const totalRevenue = useMemo(
    () => orders.filter((o) => o.status !== "cancelled").reduce((s, o) => s + (Number(o.total_price) || 0), 0),
    [orders],
  );

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("customer_orders" as any).update({ status }).eq("id", id);
    if (error) toast({ title: "Update failed", description: error.message, variant: "destructive" });
    else toast({ title: "Order updated" });
  };

  const deleteOrder = async (id: string) => {
    if (!confirm("Delete this order?")) return;
    const { error } = await supabase.from("customer_orders" as any).delete().eq("id", id);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else toast({ title: "Order deleted" });
  };

  const saveNotes = async () => {
    if (!editing) return;
    const { error } = await supabase.from("customer_orders" as any).update({ notes: notesDraft }).eq("id", editing.id);
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Notes saved" }); setEditing(null); }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-[hsl(150_45%_9%)] via-[hsl(145_40%_11%)] to-[hsl(142_55%_13%)] p-6 shadow-[0_20px_60px_-20px_hsl(142_70%_30%/0.5)]">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-xs font-medium text-primary mb-2">
              <ShoppingCart className="h-3 w-3" /> Customer Orders
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Orders received via AI Agent</h1>
            <p className="text-sm text-white/70 mt-1">Every order captured from live customer chats appears here in real-time.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={load} disabled={loading} className="border-primary/30">
              <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-6">
          <StatCard label="Total" value={counts.all} tone="text-primary" />
          <StatCard label="New" value={counts.new || 0} tone="text-primary" />
          <StatCard label="Confirmed" value={counts.confirmed || 0} tone="text-emerald-400" />
          <StatCard label="Delivered" value={counts.delivered || 0} tone="text-green-500" />
          <StatCard label="Revenue" value={`৳${totalRevenue.toLocaleString()}`} tone="text-primary" />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by phone, name, product…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses ({counts.all})</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label} ({counts[s.value] || 0})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading orders…</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <ShoppingCart className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
          <h3 className="font-semibold">No orders yet</h3>
          <p className="text-sm text-muted-foreground mt-1">
            When customers place an order via WhatsApp chat, the AI Agent will capture it here.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((o) => {
            const meta = statusMeta(o.status);
            const Icon = meta.icon;
            return (
              <div key={o.id} className="rounded-xl border border-border bg-card p-4 hover:border-primary/40 transition-colors">
                <div className="flex flex-col md:flex-row md:items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${meta.tone}`}>
                        <Icon className="h-3 w-3" /> {meta.label}
                      </span>
                      <Badge variant="outline" className="text-[10px]">{o.source}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(o.created_at).toLocaleString()}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center gap-2 font-semibold">
                      <Package className="h-4 w-4 text-primary" />
                      {o.product_name || <span className="text-muted-foreground italic">Product not identified</span>}
                      {o.quantity && o.quantity > 1 ? <span className="text-muted-foreground text-sm">× {o.quantity}</span> : null}
                      {o.total_price ? (
                        <span className="ml-auto text-primary font-bold">৳{Number(o.total_price).toLocaleString()}</span>
                      ) : null}
                    </div>

                    <div className="mt-2 grid sm:grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Phone className="h-3.5 w-3.5" /> {o.customer_phone}
                      </div>
                      {o.address && (
                        <div className="flex items-start gap-1.5 text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                          <span className="line-clamp-2">{o.address}</span>
                        </div>
                      )}
                    </div>

                    {o.raw_summary && (
                      <div className="mt-2 text-xs text-muted-foreground bg-muted/40 rounded-lg p-2 line-clamp-2">
                        <MessageSquareText className="h-3 w-3 inline mr-1" />
                        {o.raw_summary}
                      </div>
                    )}

                    {o.notes && (
                      <div className="mt-2 text-xs text-foreground/80 bg-primary/5 border border-primary/20 rounded-lg p-2">
                        <strong>Notes:</strong> {o.notes}
                      </div>
                    )}
                  </div>

                  <div className="flex md:flex-col gap-2 md:w-[180px]">
                    <Select value={o.status} onValueChange={(v) => updateStatus(o.id, v)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => { setEditing(o); setNotesDraft(o.notes || ""); }}>
                      Notes
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 text-xs text-destructive hover:text-destructive" onClick={() => deleteOrder(o.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Order notes</DialogTitle></DialogHeader>
          <Textarea
            value={notesDraft}
            onChange={(e) => setNotesDraft(e.target.value)}
            placeholder="Add internal notes for this order…"
            rows={5}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveNotes}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: React.ReactNode; tone: string }) {
  return (
    <div className="rounded-xl bg-black/30 border border-primary/15 p-3">
      <p className="text-[10px] uppercase tracking-wider text-primary/70 font-semibold">{label}</p>
      <p className={`text-xl font-bold mt-1 ${tone}`}>{value}</p>
    </div>
  );
}
