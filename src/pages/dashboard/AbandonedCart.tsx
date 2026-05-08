import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Copy, Loader2, ShoppingBag, Save, RefreshCw, ExternalLink, CheckCircle2, XCircle, Clock } from "lucide-react";

interface Conn {
  id: string;
  webhook_secret: string;
  default_session_id: string | null;
  country_code: string;
  is_active: boolean;
  total_received: number;
  total_incomplete: number;
  total_completed: number;
  total_sent: number;
}

interface AOrder {
  id: string;
  status: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  customer_phone_full: string | null;
  customer_address: string | null;
  product_name: string | null;
  product_link: string | null;
  order_date: string | null;
  site_name: string | null;
  whatsapp_message: string | null;
  sms_sent: boolean;
  sms_sent_at: string | null;
  sms_error: string | null;
  created_at: string;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export default function AbandonedCart() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [conn, setConn] = useState<Conn | null>(null);
  const [sessions, setSessions] = useState<Array<{ id: string; session_name: string; status: string }>>([]);
  const [orders, setOrders] = useState<AOrder[]>([]);
  const [sessionId, setSessionId] = useState("");
  const [country, setCountry] = useState("88");

  const load = async () => {
    if (!user) return;
    setLoading(true);
    let { data: c } = await supabase.from("abandoned_connections" as any)
      .select("*").eq("user_id", user.id).maybeSingle();

    // Auto-create connection if missing
    if (!c) {
      const { data: created } = await supabase.from("abandoned_connections" as any)
        .insert({ user_id: user.id }).select().maybeSingle();
      c = created;
    }

    const [{ data: s }, { data: o }] = await Promise.all([
      supabase.from("sessions").select("id, session_name, status").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("abandoned_orders" as any).select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100),
    ]);
    setConn(c as any);
    setSessions((s as any) || []);
    setOrders((o as any) || []);
    if (c) {
      setSessionId((c as any).default_session_id || "");
      setCountry((c as any).country_code || "88");
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.id]);

  const save = async () => {
    if (!conn) return;
    setSaving(true);
    const { error } = await supabase.from("abandoned_connections" as any)
      .update({ default_session_id: sessionId || null, country_code: country || "88" })
      .eq("id", conn.id);
    setSaving(false);
    if (error) { toast({ title: "Save failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "✅ Settings saved" });
    load();
  };

  const copy = (txt: string, label: string) => {
    navigator.clipboard.writeText(txt);
    toast({ title: `${label} copied` });
  };

  const webhookUrl = conn ? `${SUPABASE_URL}/functions/v1/abandoned-webhook?token=${conn.webhook_secret}` : "";
  const incomplete = orders.filter((o) => o.status === "incomplete");
  const completed = orders.filter((o) => o.status === "completed");

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <ShoppingBag className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Abandoned Cart Recovery</h1>
          <p className="text-sm text-muted-foreground">WordPress plugin → WhatsApp recovery message for incomplete orders</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total received</p><p className="text-2xl font-bold">{conn?.total_received || 0}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Incomplete</p><p className="text-2xl font-bold text-orange-500">{conn?.total_incomplete || 0}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Completed</p><p className="text-2xl font-bold text-green-500">{conn?.total_completed || 0}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">SMS sent</p><p className="text-2xl font-bold text-primary">{conn?.total_sent || 0}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Webhook URL (paste in your WordPress plugin)</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Your unique URL</Label>
            <div className="flex gap-2">
              <Input readOnly value={webhookUrl} className="font-mono text-xs" />
              <Button size="icon" variant="outline" onClick={() => copy(webhookUrl, "Webhook URL")}><Copy className="h-4 w-4" /></Button>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>WhatsApp Session (sends recovery messages)</Label>
              <Select value={sessionId} onValueChange={setSessionId}>
                <SelectTrigger><SelectValue placeholder="Choose a session" /></SelectTrigger>
                <SelectContent>
                  {sessions.map((s) => (<SelectItem key={s.id} value={s.id}>{s.session_name} — {s.status}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Country code (digits only, e.g. 88 or 880)</Label>
              <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="88" />
            </div>
          </div>
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />} Save settings
          </Button>
          <div className="text-sm text-muted-foreground bg-muted p-4 rounded-md space-y-1">
            <p className="font-semibold text-foreground">How it works:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Plugin sends every order (status: <b>incomplete</b> or <b>completed</b>) to your webhook URL.</li>
              <li>Only <b>incomplete</b> orders trigger a WhatsApp message — completed orders are stored for record only.</li>
              <li>The plugin's <code>whatsapp_message</code> field is sent to <code>customer_phone</code> (with country code <b>{country}</b> auto-prefixed).</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Incoming orders</span>
            <Button size="sm" variant="outline" onClick={load}><RefreshCw className="h-4 w-4 mr-2" />Refresh</Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="incomplete">
            <TabsList>
              <TabsTrigger value="incomplete">Incomplete ({incomplete.length})</TabsTrigger>
              <TabsTrigger value="completed">Completed ({completed.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="incomplete" className="space-y-3 mt-4">
              {incomplete.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No incomplete orders yet.</p>
              ) : incomplete.map((o) => <OrderCard key={o.id} o={o} />)}
            </TabsContent>
            <TabsContent value="completed" className="space-y-3 mt-4">
              {completed.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No completed orders yet.</p>
              ) : completed.map((o) => <OrderCard key={o.id} o={o} />)}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function OrderCard({ o }: { o: AOrder }) {
  const isIncomplete = o.status === "incomplete";
  return (
    <div className="border rounded-lg p-4 space-y-2">
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <p className="font-semibold">{o.customer_name || "Unknown"} <span className="text-xs text-muted-foreground font-normal">{new Date(o.created_at).toLocaleString()}</span></p>
          <p className="text-xs text-muted-foreground">{o.site_name || "—"}</p>
        </div>
        <div className="flex gap-2">
          <Badge variant={isIncomplete ? "destructive" : "default"}>{o.status}</Badge>
          {isIncomplete && (
            o.sms_sent ? <Badge variant="default" className="gap-1"><CheckCircle2 className="h-3 w-3" />SMS sent</Badge>
            : o.sms_error ? <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />SMS failed</Badge>
            : <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />pending</Badge>
          )}
        </div>
      </div>
      <div className="grid gap-1 text-sm md:grid-cols-2">
        <p><span className="text-muted-foreground">Phone:</span> {o.customer_phone || "—"}{o.customer_phone_full && o.customer_phone_full !== o.customer_phone ? ` → ${o.customer_phone_full}` : ""}</p>
        <p><span className="text-muted-foreground">Email:</span> {o.customer_email || "—"}</p>
        <p className="md:col-span-2"><span className="text-muted-foreground">Address:</span> {o.customer_address || "—"}</p>
        <p className="md:col-span-2"><span className="text-muted-foreground">Product:</span> {o.product_name || "—"}{o.product_link && (<a href={o.product_link} target="_blank" rel="noreferrer" className="ml-2 inline-flex items-center text-primary hover:underline"><ExternalLink className="h-3 w-3 mr-1" />open</a>)}</p>
      </div>
      {o.whatsapp_message && (
        <div className="bg-muted p-2 rounded text-xs whitespace-pre-wrap font-mono">{o.whatsapp_message}</div>
      )}
      {o.sms_error && <p className="text-xs text-destructive">Error: {o.sms_error}</p>}
    </div>
  );
}
