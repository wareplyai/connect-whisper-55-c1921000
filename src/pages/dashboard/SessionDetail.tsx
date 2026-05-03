import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Copy, Eye, EyeOff, RefreshCw, Trash2, Edit, Webhook } from "lucide-react";
import { toast } from "sonner";

const Mask = ({ value }: { value: string }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-card-elevated px-3 py-2 font-mono text-sm">
      <span className="flex-1 truncate">{show ? value : `${value.slice(0, 6)}…${value.slice(-4)}`}</span>
      <button onClick={() => setShow((s) => !s)} className="text-muted-foreground hover:text-foreground">
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
      <button onClick={() => { navigator.clipboard.writeText(value); toast.success("Copied"); }} className="text-muted-foreground hover:text-foreground">
        <Copy className="h-4 w-4" />
      </button>
    </div>
  );
};

const SessionDetail = () => {
  const { id } = useParams();
  const [s, setS] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [to, setTo] = useState("");
  const [text, setText] = useState("");

  const load = async () => {
    if (!id) return;
    const { data } = await supabase.from("sessions").select("*").eq("id", id).maybeSingle();
    setS(data);
    const { data: l } = await supabase.from("message_logs").select("*").eq("session_id", id).order("created_at", { ascending: false }).limit(25);
    setLogs(l || []);
  };

  useEffect(() => { load(); }, [id]);

  const send = async () => {
    if (!s || !to) return toast.error("Enter recipient");
    const { error } = await supabase.from("message_logs").insert({
      user_id: s.user_id, session_id: s.id, to_number: to, payload: { text }, status: "sent",
    });
    if (error) return toast.error(error.message);
    toast.success("Test message logged");
    setText(""); setTo(""); load();
  };

  const remove = async () => {
    if (!confirm("Delete session?")) return;
    await supabase.from("sessions").delete().eq("id", s.id);
    window.location.href = "/dashboard/sessions";
  };

  if (!s) return <div className="text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6">
      <Link to="/dashboard/sessions" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-lg">{s.session_name}</h2>
                <span className={`px-2 py-0.5 rounded-full text-xs ${s.status === "connected" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                  ● {s.status}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{s.phone_number || "No number"}</p>
            </div>
            <div className="flex gap-1">
              <Button size="icon" variant="outline" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
              <Button size="icon" variant="outline"><Edit className="h-4 w-4" /></Button>
              <Button size="icon" variant="outline"><Webhook className="h-4 w-4" /></Button>
              <Button size="icon" variant="outline" onClick={remove} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-muted-foreground">Status</dt><dd className="capitalize">{s.status}</dd></div>
            <div><dt className="text-muted-foreground">Last Active</dt><dd>{s.last_active ? new Date(s.last_active).toLocaleString() : "Never"}</dd></div>
            <div><dt className="text-muted-foreground">WhatsApp Account</dt><dd>{s.whatsapp_name || "—"}</dd></div>
            <div><dt className="text-muted-foreground">Created</dt><dd>{new Date(s.created_at).toLocaleDateString()}</dd></div>
          </dl>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1">Disconnect</Button>
            <Button className="flex-1 bg-primary text-primary-foreground hover:bg-primary-hover">Restart</Button>
          </div>

          <div className="rounded-lg border border-border bg-card-elevated p-4">
            <h4 className="font-semibold text-sm mb-2">Next Steps</h4>
            <ol className="space-y-1.5 text-sm text-muted-foreground list-decimal list-inside">
              <li>Copy your API key from the Credentials tab</li>
              <li>Send your first test message via cURL or the Test Sending tab</li>
              <li>View the API Documentation for all endpoints</li>
            </ol>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <Tabs defaultValue="creds">
            <TabsList className="bg-card-elevated">
              <TabsTrigger value="creds">Credentials</TabsTrigger>
              <TabsTrigger value="test">Test Sending</TabsTrigger>
              <TabsTrigger value="webhook">Webhook Simulator</TabsTrigger>
            </TabsList>

            <TabsContent value="creds" className="space-y-4 mt-4">
              <div>
                <Label>API Access Token</Label>
                <div className="mt-1.5"><Mask value={s.api_token} /></div>
              </div>
              <div>
                <Label>Webhook Secret</Label>
                <div className="mt-1.5"><Mask value={s.webhook_secret} /></div>
              </div>
              <Button variant="outline" className="w-full">API Documentation →</Button>
            </TabsContent>

            <TabsContent value="test" className="space-y-3 mt-4">
              <div><Label>To</Label><Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="+1234567890" className="mt-1.5" /></div>
              <div>
                <Label>Type</Label>
                <Select defaultValue="text"><SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="image">Image</SelectItem>
                    <SelectItem value="document">Document</SelectItem>
                    <SelectItem value="audio">Audio</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Message</Label><Textarea value={text} onChange={(e) => setText(e.target.value)} className="mt-1.5" rows={4} /></div>
              <Button onClick={send} className="w-full bg-primary text-primary-foreground hover:bg-primary-hover">Send</Button>
            </TabsContent>

            <TabsContent value="webhook" className="space-y-3 mt-4">
              <div>
                <Label>Event Type</Label>
                <Select defaultValue="messages.received"><SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="messages.received">messages.received</SelectItem>
                    <SelectItem value="message.sent">message.sent</SelectItem>
                    <SelectItem value="session.status">session.status</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <pre className="rounded-lg bg-[#0d0d0d] p-3 text-xs font-mono overflow-x-auto">{`{
  "event": "messages.received",
  "session": "${s.session_name}",
  "data": { "from": "+1234567890", "text": "Hi!" }
}`}</pre>
              <Button className="w-full bg-primary text-primary-foreground hover:bg-primary-hover">Send Test Event</Button>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Outgoing Message Activity</h3>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">Clear All</Button>
            <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary-hover">Go Live</Button>
          </div>
        </div>
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground mb-3">
          This monitor only shows outgoing messages sent through our API.
        </div>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No messages yet.</p>
        ) : (
          <div className="space-y-2">
            {logs.map((l) => (
              <div key={l.id} className="rounded-lg border border-border bg-card-elevated p-3 text-sm">
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">TO {l.to_number}</p>
                    <p className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString()}</p>
                    <pre className="mt-1 text-xs font-mono text-muted-foreground truncate">{JSON.stringify(l.payload)}</pre>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${l.status === "sent" ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive"}`}>{l.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SessionDetail;
