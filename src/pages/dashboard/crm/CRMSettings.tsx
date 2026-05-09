import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Save, Plug, Plus, Trash2, Settings as SettingsIcon } from "lucide-react";

const STORAGE_KEY = "crm_settings";

type Agent = { id: string; name: string; phone: string; role: "agent" | "manager"; assign: boolean };

type SettingsState = {
  whatsapp: { apiUrl: string; token: string; phoneNumberId: string };
  pathao: { clientId: string; clientSecret: string; storeId: string };
  steadfast: { apiKey: string; secret: string };
  redx: { apiKey: string };
  woo: { siteUrl: string; consumerKey: string; consumerSecret: string };
  agents: Agent[];
};

const DEFAULTS: SettingsState = {
  whatsapp: { apiUrl: "", token: "", phoneNumberId: "" },
  pathao: { clientId: "", clientSecret: "", storeId: "" },
  steadfast: { apiKey: "", secret: "" },
  redx: { apiKey: "" },
  woo: { siteUrl: "", consumerKey: "", consumerSecret: "" },
  agents: [],
};

export default function CRMSettings() {
  const [s, setS] = useState<SettingsState>(DEFAULTS);
  const [agentOpen, setAgentOpen] = useState(false);
  const [agentForm, setAgentForm] = useState<Agent>({ id: "", name: "", phone: "", role: "agent", assign: true });

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) try { setS({ ...DEFAULTS, ...JSON.parse(raw) }); } catch {}
    (async () => {
      const { data: { user } } = await (await import("@/integrations/supabase/client")).supabase.auth.getUser();
      if (!user) return;
      const { supabase } = await import("@/integrations/supabase/client");
      const { data } = await supabase.from("crm_courier_settings").select("*").eq("user_id", user.id).maybeSingle();
      if (data) {
        setS((prev) => ({
          ...prev,
          pathao: { clientId: data.pathao_client_id || "", clientSecret: data.pathao_client_secret || "", storeId: data.pathao_store_id || "" },
          steadfast: { apiKey: data.steadfast_api_key || "", secret: data.steadfast_secret || "" },
          redx: { apiKey: data.redx_api_key || "" },
        }));
      }
    })();
  }, []);

  const save = async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    const { supabase } = await import("@/integrations/supabase/client");
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("crm_courier_settings").upsert({
        user_id: user.id,
        pathao_client_id: s.pathao.clientId,
        pathao_client_secret: s.pathao.clientSecret,
        pathao_store_id: s.pathao.storeId,
        pathao_enabled: !!(s.pathao.clientId && s.pathao.clientSecret),
        steadfast_api_key: s.steadfast.apiKey,
        steadfast_secret: s.steadfast.secret,
        steadfast_enabled: !!(s.steadfast.apiKey && s.steadfast.secret),
        redx_api_key: s.redx.apiKey,
        redx_enabled: !!s.redx.apiKey,
      }, { onConflict: "user_id" });
    }
    console.log("[stub] CRM settings saved →", s);
    toast.success("Settings saved");
  };

  const testConn = (name: string) => {
    console.log(`[stub] Test connection: ${name}`);
    toast.message(`Testing ${name}...`);
    setTimeout(() => toast.success(`${name} connection OK (stub)`), 800);
  };

  const addAgent = () => {
    if (!agentForm.name || !agentForm.phone) { toast.error("Name & phone required"); return; }
    setS({ ...s, agents: [...s.agents, { ...agentForm, id: crypto.randomUUID() }] });
    setAgentForm({ id: "", name: "", phone: "", role: "agent", assign: true });
    setAgentOpen(false);
    toast.success("Agent added");
  };

  const removeAgent = (id: string) => {
    setS({ ...s, agents: s.agents.filter((a) => a.id !== id) });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><SettingsIcon className="h-6 w-6 text-primary" /> CRM Settings</h1>
          <p className="text-sm text-muted-foreground">API credentials, integrations & team</p>
        </div>
        <Button onClick={save}><Save className="h-4 w-4 mr-2" /> Save All</Button>
      </div>

      <Tabs defaultValue="whatsapp">
        <TabsList>
          <TabsTrigger value="whatsapp">WhatsApp API</TabsTrigger>
          <TabsTrigger value="couriers">Courier APIs</TabsTrigger>
          <TabsTrigger value="woo">WooCommerce</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
        </TabsList>

        <TabsContent value="whatsapp">
          <Card>
            <CardContent className="p-4 space-y-3">
              <div><Label>API URL</Label><Input value={s.whatsapp.apiUrl} onChange={(e) => setS({ ...s, whatsapp: { ...s.whatsapp, apiUrl: e.target.value } })} placeholder="https://graph.facebook.com/v20.0" /></div>
              <div><Label>Access Token</Label><Input type="password" value={s.whatsapp.token} onChange={(e) => setS({ ...s, whatsapp: { ...s.whatsapp, token: e.target.value } })} placeholder="EAAG..." /></div>
              <div><Label>Phone Number ID</Label><Input value={s.whatsapp.phoneNumberId} onChange={(e) => setS({ ...s, whatsapp: { ...s.whatsapp, phoneNumberId: e.target.value } })} /></div>
              <Button variant="outline" onClick={() => testConn("WhatsApp")}><Plug className="h-4 w-4 mr-2" /> Test Connection</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="couriers" className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-3">
              <p className="font-medium">Pathao</p>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Client ID</Label><Input value={s.pathao.clientId} onChange={(e) => setS({ ...s, pathao: { ...s.pathao, clientId: e.target.value } })} /></div>
                <div><Label>Client Secret</Label><Input type="password" value={s.pathao.clientSecret} onChange={(e) => setS({ ...s, pathao: { ...s.pathao, clientSecret: e.target.value } })} /></div>
              </div>
              <div><Label>Store ID</Label><Input value={s.pathao.storeId} onChange={(e) => setS({ ...s, pathao: { ...s.pathao, storeId: e.target.value } })} /></div>
              <Button variant="outline" size="sm" onClick={() => testConn("Pathao")}><Plug className="h-4 w-4 mr-2" /> Test Connection</Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-3">
              <p className="font-medium">Steadfast</p>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>API Key</Label><Input value={s.steadfast.apiKey} onChange={(e) => setS({ ...s, steadfast: { ...s.steadfast, apiKey: e.target.value } })} /></div>
                <div><Label>Secret</Label><Input type="password" value={s.steadfast.secret} onChange={(e) => setS({ ...s, steadfast: { ...s.steadfast, secret: e.target.value } })} /></div>
              </div>
              <Button variant="outline" size="sm" onClick={() => testConn("Steadfast")}><Plug className="h-4 w-4 mr-2" /> Test Connection</Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-3">
              <p className="font-medium">RedX</p>
              <div><Label>API Key</Label><Input value={s.redx.apiKey} onChange={(e) => setS({ ...s, redx: { ...s.redx, apiKey: e.target.value } })} /></div>
              <Button variant="outline" size="sm" onClick={() => testConn("RedX")}><Plug className="h-4 w-4 mr-2" /> Test Connection</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="woo">
          <Card>
            <CardContent className="p-4 space-y-3">
              <div><Label>Site URL</Label><Input value={s.woo.siteUrl} onChange={(e) => setS({ ...s, woo: { ...s.woo, siteUrl: e.target.value } })} placeholder="https://yourstore.com" /></div>
              <div><Label>Consumer Key</Label><Input value={s.woo.consumerKey} onChange={(e) => setS({ ...s, woo: { ...s.woo, consumerKey: e.target.value } })} placeholder="ck_..." /></div>
              <div><Label>Consumer Secret</Label><Input type="password" value={s.woo.consumerSecret} onChange={(e) => setS({ ...s, woo: { ...s.woo, consumerSecret: e.target.value } })} placeholder="cs_..." /></div>
              <Button variant="outline" onClick={() => testConn("WooCommerce")}><Plug className="h-4 w-4 mr-2" /> Test Connection</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team">
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex justify-between items-center">
                <p className="font-medium">Agents ({s.agents.length})</p>
                <Button size="sm" onClick={() => setAgentOpen(true)}><Plus className="h-4 w-4 mr-2" /> Add Agent</Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Assign</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {s.agents.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">No agents yet</TableCell></TableRow>
                  ) : s.agents.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>{a.name}</TableCell>
                      <TableCell className="text-xs">{a.phone}</TableCell>
                      <TableCell className="capitalize">{a.role}</TableCell>
                      <TableCell>
                        <Switch checked={a.assign} onCheckedChange={(v) => setS({ ...s, agents: s.agents.map((x) => x.id === a.id ? { ...x, assign: v } : x) })} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="icon" variant="ghost" onClick={() => removeAgent(a.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={agentOpen} onOpenChange={setAgentOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Agent</DialogTitle></DialogHeader>
          <div className="space-y-3 text-sm">
            <div><Label>Name</Label><Input value={agentForm.name} onChange={(e) => setAgentForm({ ...agentForm, name: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={agentForm.phone} onChange={(e) => setAgentForm({ ...agentForm, phone: e.target.value })} /></div>
            <div>
              <Label>Role</Label>
              <Select value={agentForm.role} onValueChange={(v: any) => setAgentForm({ ...agentForm, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="agent">Agent</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label>Assign Conversations</Label>
              <Switch checked={agentForm.assign} onCheckedChange={(v) => setAgentForm({ ...agentForm, assign: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAgentOpen(false)}>Cancel</Button>
            <Button onClick={addAgent}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
