import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Copy, RefreshCw, Plug, ShoppingCart, CheckCircle2, XCircle, Loader2 } from "lucide-react";

interface Conn {
  id: string;
  store_url: string;
  consumer_key: string;
  consumer_secret: string;
  webhook_secret: string;
  default_session_id: string | null;
  is_active: boolean;
  last_sync_at: string | null;
  last_sync_status: string | null;
  last_sync_error: string | null;
  total_synced: number;
}

interface WooOrder {
  id: string;
  order_number: string;
  customer_name: string | null;
  customer_phone: string | null;
  total: number;
  currency: string;
  confirmation_sent: boolean;
  confirmation_error: string | null;
  created_at: string;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export default function WooCommerce() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [conn, setConn] = useState<Conn | null>(null);
  const [sessions, setSessions] = useState<Array<{ id: string; session_name: string; status: string }>>([]);
  const [orders, setOrders] = useState<WooOrder[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [connecting, setConnecting] = useState(false);

  // form
  const [storeUrl, setStoreUrl] = useState("");
  const [ck, setCk] = useState("");
  const [cs, setCs] = useState("");
  const [sessionId, setSessionId] = useState<string>("");

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: c }, { data: s }, { data: o }] = await Promise.all([
      supabase.from("woo_connections" as any).select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("sessions").select("id, session_name, status").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("woo_orders" as any).select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
    ]);
    setConn(c as any);
    setSessions((s as any) || []);
    setOrders((o as any) || []);
    if (c) {
      setStoreUrl((c as any).store_url || "");
      setCk((c as any).consumer_key || "");
      setCs((c as any).consumer_secret || "");
      setSessionId((c as any).default_session_id || "");
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.id]);

  const connect = async () => {
    if (!storeUrl || !ck || !cs) {
      toast({ title: "Missing fields", description: "Store URL, Consumer Key & Secret required", variant: "destructive" });
      return;
    }
    setConnecting(true);
    const { data, error } = await supabase.functions.invoke("woo-connect", {
      body: { store_url: storeUrl, consumer_key: ck, consumer_secret: cs, default_session_id: sessionId || null },
    });
    setConnecting(false);
    if (error || (data as any)?.error) {
      toast({ title: "Connect failed", description: (data as any)?.error || error?.message, variant: "destructive" });
      return;
    }
    toast({ title: "✅ Connected", description: "WooCommerce store verified successfully" });
    await load();
  };

  const sync = async () => {
    setSyncing(true);
    const { data, error } = await supabase.functions.invoke("woo-sync-products", { body: {} });
    setSyncing(false);
    const message = (data as any)?.error || (Array.isArray((data as any)?.errors) ? (data as any).errors.join(" | ") : "") || error?.message;
    if (error || (data as any)?.error || (data as any)?.ok === false) {
      toast({ title: "Sync failed", description: message || "WooCommerce sync failed", variant: "destructive" });
      await load();
      return;
    }
    toast({ title: "✅ Sync complete", description: `${(data as any)?.total || 0} products synced` });
    await load();
  };

  const disconnect = async () => {
    if (!conn || !confirm("Disconnect WooCommerce? Synced products will remain.")) return;
    await supabase.from("woo_connections" as any).delete().eq("id", conn.id);
    setConn(null);
    toast({ title: "Disconnected" });
    load();
  };

  const copy = (txt: string, label: string) => {
    navigator.clipboard.writeText(txt);
    toast({ title: `${label} copied` });
  };

  const deliveryUrl = conn ? `${SUPABASE_URL}/functions/v1/woo-webhook?token=${conn.webhook_secret}` : "";

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <ShoppingCart className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">WooCommerce Integration</h1>
          <p className="text-sm text-muted-foreground">Sync products & receive orders directly into WaReply</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plug className="h-5 w-5" />
            {conn ? "Store Connection" : "Connect Your Store"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <Label>Store URL</Label>
              <Input placeholder="https://yourstore.com" value={storeUrl} onChange={(e) => setStoreUrl(e.target.value)} />
            </div>
            <div>
              <Label>Consumer Key (ck_...)</Label>
              <Input placeholder="ck_xxxxxxxxxxxx" value={ck} onChange={(e) => setCk(e.target.value)} />
            </div>
            <div>
              <Label>Consumer Secret (cs_...)</Label>
              <Input type="password" placeholder="cs_xxxxxxxxxxxx" value={cs} onChange={(e) => setCs(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <Label>Default WhatsApp Session (for order confirmation SMS)</Label>
              <Select value={sessionId} onValueChange={setSessionId}>
                <SelectTrigger><SelectValue placeholder="Choose a session" /></SelectTrigger>
                <SelectContent>
                  {sessions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.session_name} — {s.status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={connect} disabled={connecting}>
              {connecting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plug className="h-4 w-4 mr-2" />}
              {conn ? "Update Connection" : "Connect & Verify"}
            </Button>
            {conn && (
              <Button variant="destructive" onClick={disconnect}>Disconnect</Button>
            )}
          </div>
        </CardContent>
      </Card>

      {conn && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Webhook Setup (paste in WooCommerce)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Delivery URL</Label>
                <div className="flex gap-2">
                  <Input readOnly value={deliveryUrl} className="font-mono text-xs" />
                  <Button size="icon" variant="outline" onClick={() => copy(deliveryUrl, "Delivery URL")}><Copy className="h-4 w-4" /></Button>
                </div>
              </div>
              <div>
                <Label>Secret</Label>
                <div className="flex gap-2">
                  <Input readOnly value={conn.webhook_secret} className="font-mono text-xs" />
                  <Button size="icon" variant="outline" onClick={() => copy(conn.webhook_secret, "Secret")}><Copy className="h-4 w-4" /></Button>
                </div>
              </div>
              <div className="text-sm text-muted-foreground bg-muted p-4 rounded-md space-y-2">
                <p className="font-semibold text-foreground">📖 Steps (WooCommerce admin):</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>WooCommerce → <b>Settings → Advanced → Webhooks</b> → <b>Add webhook</b></li>
                  <li>Status: <b>Active</b>, API Version: <b>WP REST API v3</b></li>
                  <li>Create <b>4 webhooks</b>, one per Topic: <b>Product created</b>, <b>Product updated</b>, <b>Product deleted</b>, <b>Order created</b></li>
                  <li>Paste the <b>Delivery URL</b> and <b>Secret</b> above into each webhook</li>
                  <li>Save — done! New products & orders will appear here automatically.</li>
                </ol>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Product Sync</span>
                <Button size="sm" onClick={sync} disabled={syncing}>
                  {syncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                  Sync All Products Now
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <p>Total synced: <b>{conn.total_synced}</b></p>
              <p>Last sync: {conn.last_sync_at ? new Date(conn.last_sync_at).toLocaleString() : "—"}</p>
              <p>Status: <Badge variant={conn.last_sync_status === "ok" ? "default" : conn.last_sync_status ? "destructive" : "secondary"}>{conn.last_sync_status || "never"}</Badge></p>
              {conn.last_sync_error && <p className="text-destructive text-xs">{conn.last_sync_error}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Recent Orders (last 10)</CardTitle></CardHeader>
            <CardContent>
              {orders.length === 0 ? (
                <p className="text-sm text-muted-foreground">No orders yet. Once an order comes in, you'll see it here.</p>
              ) : (
                <div className="space-y-2">
                  {orders.map((o) => (
                    <div key={o.id} className="flex items-center justify-between p-3 rounded-md border">
                      <div>
                        <p className="font-medium">#{o.order_number} — {o.customer_name || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">{o.customer_phone || "no phone"} • {new Date(o.created_at).toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{o.total} {o.currency}</p>
                        {o.confirmation_sent ? (
                          <Badge variant="default" className="gap-1"><CheckCircle2 className="h-3 w-3" />Sent</Badge>
                        ) : o.confirmation_error ? (
                          <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Failed</Badge>
                        ) : (
                          <Badge variant="secondary">No SMS</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
