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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import {
  Copy, Loader2, ShoppingBag, Save, RefreshCw, ExternalLink,
  CheckCircle2, XCircle, Clock, Eye, AlertCircle,
} from "lucide-react";
import { CountryCodeSelect } from "@/components/CountryCodeSelect";
import { ALL_COUNTRIES, DEFAULT_COUNTRY, type Country } from "@/lib/countries";

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
  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [viewing, setViewing] = useState<AOrder | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    let { data: c } = await supabase.from("abandoned_connections" as any)
      .select("*").eq("user_id", user.id).maybeSingle();

    if (!c) {
      const { data: created } = await supabase.from("abandoned_connections" as any)
        .insert({ user_id: user.id }).select().maybeSingle();
      c = created;
    }

    const [{ data: s }, { data: o }] = await Promise.all([
      supabase.from("sessions").select("id, session_name, status").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("abandoned_orders" as any).select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(200),
    ]);
    setConn(c as any);
    setSessions((s as any) || []);
    setOrders((o as any) || []);
    if (c) {
      setSessionId((c as any).default_session_id || "");
      const cc = String((c as any).country_code || "880").replace(/\D/g, "");
      const found = ALL_COUNTRIES.find((x) => x.code.replace("+", "") === cc);
      setCountry(found || DEFAULT_COUNTRY);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.id]);

  const save = async () => {
    if (!conn) return;
    setSaving(true);
    const { error } = await supabase.from("abandoned_connections" as any)
      .update({ default_session_id: sessionId || null, country_code: country.code.replace("+", "") })
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
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center gap-3">
        <ShoppingBag className="h-7 w-7 text-orange-500" />
        <div>
          <h1 className="text-2xl font-bold">Incomplete Orders</h1>
          <p className="text-sm text-muted-foreground">WordPress plugin → WhatsApp recovery for incomplete checkouts</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total received</p><p className="text-2xl font-bold">{conn?.total_received || 0}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Incomplete</p><p className="text-2xl font-bold text-orange-500">{conn?.total_incomplete || 0}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Completed</p><p className="text-2xl font-bold text-green-500">{conn?.total_completed || 0}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">SMS sent</p><p className="text-2xl font-bold text-orange-500">{conn?.total_sent || 0}</p></CardContent></Card>
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
              <Label>Customer country (auto-prefixed to incoming phone numbers)</Label>
              <div className="flex items-center gap-2">
                <CountryCodeSelect value={country} onChange={setCountry} />
                <span className="text-sm text-muted-foreground truncate">{country.name} ({country.code})</span>
              </div>
            </div>
          </div>
          <Button onClick={save} disabled={saving} className="bg-orange-500 hover:bg-orange-600 text-white">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />} Save settings
          </Button>
        </CardContent>
      </Card>

      <Card className="border-orange-200 dark:border-orange-900/40">
        <CardHeader className="bg-orange-50 dark:bg-orange-950/20 rounded-t-lg">
          <CardTitle className="flex items-center justify-between">
            <span className="text-orange-700 dark:text-orange-300">Incoming orders</span>
            <Button size="sm" variant="outline" onClick={load} className="border-orange-400 bg-white text-orange-600 hover:bg-orange-500 hover:text-white hover:border-orange-500 dark:bg-transparent dark:hover:bg-orange-500 dark:hover:text-white transition-colors">
              <RefreshCw className="h-4 w-4 mr-2" />Refresh
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs defaultValue="incomplete">
            <TabsList className="m-4">
              <TabsTrigger value="incomplete" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">
                Incomplete ({incomplete.length})
              </TabsTrigger>
              <TabsTrigger value="completed">Completed ({completed.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="incomplete" className="m-0">
              <OrdersTable rows={incomplete} onView={setViewing} theme="orange" />
            </TabsContent>
            <TabsContent value="completed" className="m-0">
              <OrdersTable rows={completed} onView={setViewing} theme="green" />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Order details</DialogTitle></DialogHeader>
          {viewing && <OrderDetails o={viewing} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function OrdersTable({ rows, onView, theme }: { rows: AOrder[]; onView: (o: AOrder) => void; theme: "orange" | "green" }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground py-12 text-center">No orders yet.</p>;
  }
  const headBg = theme === "orange" ? "bg-orange-100/70 dark:bg-orange-950/30" : "bg-green-100/70 dark:bg-green-950/30";
  const headText = theme === "orange" ? "text-orange-700 dark:text-orange-300" : "text-green-700 dark:text-green-300";

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className={`${headBg} hover:${headBg}`}>
            <TableHead className={`${headText} font-bold uppercase text-xs w-12`}>#</TableHead>
            <TableHead className={`${headText} font-bold uppercase text-xs`}>Customer</TableHead>
            <TableHead className={`${headText} font-bold uppercase text-xs`}>Contact</TableHead>
            <TableHead className={`${headText} font-bold uppercase text-xs`}>Address</TableHead>
            <TableHead className={`${headText} font-bold uppercase text-xs`}>Product</TableHead>
            <TableHead className={`${headText} font-bold uppercase text-xs text-center`}>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((o, i) => {
            const isIncomplete = o.status === "incomplete";
            return (
              <TableRow key={o.id} className="hover:bg-orange-50/40 dark:hover:bg-orange-950/10">
                <TableCell className="text-orange-500 font-medium">{i + 1}</TableCell>
                <TableCell>
                  <div className="font-semibold">{o.customer_name || "Unknown"}</div>
                  <div className="text-xs text-muted-foreground">{o.customer_email || "—"}</div>
                </TableCell>
                <TableCell className="text-orange-600 font-medium">
                  {o.customer_phone_full || o.customer_phone || "—"}
                </TableCell>
                <TableCell className="max-w-[220px] truncate" title={o.customer_address || ""}>
                  {o.customer_address || "—"}
                </TableCell>
                <TableCell className="max-w-[200px] truncate" title={o.product_name || ""}>
                  {o.product_name || "—"}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-center gap-2 flex-wrap">
                    <Button size="sm" variant="outline" onClick={() => onView(o)}
                      className="h-7 px-3 rounded-full border-orange-400 bg-white text-orange-600 hover:bg-orange-500 hover:text-white hover:border-orange-500 dark:bg-transparent dark:hover:bg-orange-500 dark:hover:text-white uppercase text-[10px] font-bold transition-colors">
                      <Eye className="h-3 w-3 mr-1" />View
                    </Button>
                    {isIncomplete ? (
                      <Badge className="rounded-full bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300 border border-orange-300 hover:bg-orange-100 gap-1 uppercase text-[10px] font-bold">
                        <AlertCircle className="h-3 w-3" /> Incomplete
                      </Badge>
                    ) : (
                      <Badge className="rounded-full bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300 border border-green-300 hover:bg-green-100 gap-1 uppercase text-[10px] font-bold">
                        <CheckCircle2 className="h-3 w-3" /> Completed
                      </Badge>
                    )}
                    {isIncomplete && o.sms_sent && (
                      <Badge className="rounded-full bg-green-500 hover:bg-green-500 text-white gap-1 uppercase text-[10px] font-bold">
                        <CheckCircle2 className="h-3 w-3" />SMS
                      </Badge>
                    )}
                    {isIncomplete && !o.sms_sent && o.sms_error && (
                      <Badge variant="destructive" className="rounded-full gap-1 uppercase text-[10px] font-bold">
                        <XCircle className="h-3 w-3" />SMS
                      </Badge>
                    )}
                    {isIncomplete && !o.sms_sent && !o.sms_error && (
                      <Badge variant="secondary" className="rounded-full gap-1 uppercase text-[10px] font-bold">
                        <Clock className="h-3 w-3" />Pending
                      </Badge>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function OrderDetails({ o }: { o: AOrder }) {
  return (
    <div className="space-y-3 text-sm">
      <div className="grid gap-2 md:grid-cols-2">
        <Info label="Customer" value={o.customer_name} />
        <Info label="Email" value={o.customer_email} />
        <Info label="Phone" value={o.customer_phone_full || o.customer_phone} />
        <Info label="Site" value={o.site_name} />
        <Info label="Order date" value={o.order_date || new Date(o.created_at).toLocaleString()} />
        <Info label="Status" value={o.status} />
      </div>
      <Info label="Address" value={o.customer_address} />
      <div>
        <div className="text-xs text-muted-foreground mb-1">Product</div>
        <div className="font-medium">{o.product_name || "—"}
          {o.product_link && (
            <a href={o.product_link} target="_blank" rel="noreferrer" className="ml-2 inline-flex items-center text-orange-600 hover:underline text-xs">
              <ExternalLink className="h-3 w-3 mr-1" />open
            </a>
          )}
        </div>
      </div>
      {o.whatsapp_message && (
        <div>
          <div className="text-xs text-muted-foreground mb-1">WhatsApp message</div>
          <div className="bg-muted p-3 rounded text-xs whitespace-pre-wrap font-mono">{o.whatsapp_message}</div>
        </div>
      )}
      {o.sms_error && <p className="text-xs text-destructive">SMS error: {o.sms_error}</p>}
      {o.sms_sent_at && <p className="text-xs text-orange-600">SMS sent at {new Date(o.sms_sent_at).toLocaleString()}</p>}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{value || "—"}</div>
    </div>
  );
}
