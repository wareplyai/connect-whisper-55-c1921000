import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Bell, Save } from "lucide-react";

type CourierKey = "pathao" | "steadfast" | "redx";

const COURIERS: { key: CourierKey; name: string }[] = [
  { key: "pathao", name: "Pathao" },
  { key: "steadfast", name: "Steadfast" },
  { key: "redx", name: "RedX" },
];

const STATUS_COLOR: Record<string, string> = {
  in_transit: "bg-blue-500/15 text-blue-500",
  delivered: "bg-success/15 text-success",
  failed: "bg-destructive/15 text-destructive",
  pending: "bg-warning/15 text-warning",
};

export default function CRMCourier() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoBooking, setAutoBooking] = useState(false);
  const [defaultCourier, setDefaultCourier] = useState<CourierKey>("pathao");
  const [keys, setKeys] = useState<Record<CourierKey, { apiKey: string; secret: string; enabled: boolean }>>({
    pathao: { apiKey: "", secret: "", enabled: false },
    steadfast: { apiKey: "", secret: "", enabled: false },
    redx: { apiKey: "", secret: "", enabled: false },
  });

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from("crm_orders").select("*").eq("user_id", user.id).not("courier_name", "is", null).order("updated_at", { ascending: false });
    setOrders(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  useEffect(() => {
    const saved = localStorage.getItem("crm_courier_settings");
    if (saved) {
      try {
        const p = JSON.parse(saved);
        if (p.autoBooking !== undefined) setAutoBooking(p.autoBooking);
        if (p.defaultCourier) setDefaultCourier(p.defaultCourier);
        if (p.keys) setKeys((k) => ({ ...k, ...p.keys }));
      } catch {}
    }
  }, []);

  const saveSettings = () => {
    localStorage.setItem("crm_courier_settings", JSON.stringify({ autoBooking, defaultCourier, keys }));
    console.log("[stub] courier settings saved →", { autoBooking, defaultCourier, keys });
    toast.success("Settings saved");
  };

  const notifyFailed = (o: any) => {
    console.log("[stub] WhatsApp notify failed delivery →", o.customer_phone, o.tracking_id);
    toast.success(`Notification sent to ${o.customer_phone}`);
  };

  const failed = orders.filter((o) => o.courier_status === "failed" || o.order_status === "returned");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Courier</h1>
        <p className="text-sm text-muted-foreground">Auto-booking, tracking & failed deliveries</p>
      </div>

      <Tabs defaultValue="auto">
        <TabsList>
          <TabsTrigger value="auto">Auto Booking</TabsTrigger>
          <TabsTrigger value="tracking">Tracking</TabsTrigger>
          <TabsTrigger value="failed">Failed Deliveries</TabsTrigger>
        </TabsList>

        <TabsContent value="auto" className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Auto Booking</p>
                  <p className="text-xs text-muted-foreground">Automatically book courier when order is confirmed</p>
                </div>
                <Switch checked={autoBooking} onCheckedChange={setAutoBooking} />
              </div>
              <div>
                <Label>Default Courier</Label>
                <div className="flex gap-2 mt-2">
                  {COURIERS.map((c) => (
                    <Button key={c.key} variant={defaultCourier === c.key ? "default" : "outline"} size="sm" onClick={() => setDefaultCourier(c.key)}>
                      {c.name}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {COURIERS.map((c) => (
            <Card key={c.key}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{c.name} API</p>
                  <Switch
                    checked={keys[c.key].enabled}
                    onCheckedChange={(v) => setKeys({ ...keys, [c.key]: { ...keys[c.key], enabled: v } })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>API Key</Label>
                    <Input value={keys[c.key].apiKey} onChange={(e) => setKeys({ ...keys, [c.key]: { ...keys[c.key], apiKey: e.target.value } })} placeholder="••••••••" />
                  </div>
                  <div>
                    <Label>Secret</Label>
                    <Input type="password" value={keys[c.key].secret} onChange={(e) => setKeys({ ...keys, [c.key]: { ...keys[c.key], secret: e.target.value } })} placeholder="••••••••" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          <Button onClick={saveSettings}><Save className="h-4 w-4 mr-2" /> Save Settings</Button>
        </TabsContent>

        <TabsContent value="tracking">
          <Card>
            <CardContent className="p-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Courier</TableHead>
                      <TableHead>Tracking</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">Loading...</TableCell></TableRow>
                    ) : orders.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">No bookings yet</TableCell></TableRow>
                    ) : orders.map((o) => (
                      <TableRow key={o.id}>
                        <TableCell className="font-mono text-xs">{o.woo_order_id || o.id.slice(0, 8)}</TableCell>
                        <TableCell>{o.customer_name}</TableCell>
                        <TableCell className="uppercase text-xs">{o.courier_name}</TableCell>
                        <TableCell className="font-mono text-xs">{o.tracking_id}</TableCell>
                        <TableCell><span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLOR[o.courier_status] || "bg-muted"}`}>{o.courier_status || "pending"}</span></TableCell>
                        <TableCell className="text-xs text-muted-foreground">{new Date(o.updated_at).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="failed">
          <Card>
            <CardContent className="p-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Courier</TableHead>
                      <TableHead>Tracking</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {failed.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">No failed deliveries</TableCell></TableRow>
                    ) : failed.map((o) => (
                      <TableRow key={o.id}>
                        <TableCell className="font-mono text-xs">{o.woo_order_id || o.id.slice(0, 8)}</TableCell>
                        <TableCell>{o.customer_name}</TableCell>
                        <TableCell className="text-xs">{o.customer_phone}</TableCell>
                        <TableCell className="uppercase text-xs">{o.courier_name}</TableCell>
                        <TableCell className="font-mono text-xs">{o.tracking_id}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" onClick={() => notifyFailed(o)}>
                            <Bell className="h-4 w-4 mr-1" /> Notify
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
