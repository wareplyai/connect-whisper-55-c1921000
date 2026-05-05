import { useEffect, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft, Copy, Eye, EyeOff, RefreshCw, Trash2, Edit, Webhook, Loader2, ChevronLeft, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { backendApi } from "@/lib/backend";

const PAGE_SIZE = 25;

const genHexToken = () => {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
};

const TokenField = ({
  value, onRegenerate, regenerating, label, title, subtitle,
}: {
  value: string;
  onRegenerate?: () => void;
  regenerating?: boolean;
  label: string;
  title: string;
  subtitle: string;
}) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="flex items-center gap-2 rounded-lg border border-border bg-card-elevated px-3 py-2 font-mono text-xs">
        <span className="flex-1 break-all">
          {"•".repeat(Math.min(value.length, 64))}
        </span>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-muted-foreground hover:text-foreground shrink-0"
          aria-label="View"
          title="View"
        >
          <Eye className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => { navigator.clipboard.writeText(value); toast.success("Copied!"); }}
          className="text-muted-foreground hover:text-foreground shrink-0"
          aria-label="Copy"
          title="Copy"
        >
          <Copy className="h-4 w-4" />
        </button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{subtitle}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-xs">{label}</Label>
              <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-border bg-card-elevated px-3 py-2">
                <input
                  readOnly
                  value={value}
                  className="flex-1 bg-transparent text-xs font-mono outline-none break-all"
                />
                <button
                  type="button"
                  onClick={() => { navigator.clipboard.writeText(value); toast.success("Copied!"); }}
                  className="text-muted-foreground hover:text-foreground shrink-0"
                  aria-label="Copy"
                  title="Copy"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div>
              <Label className="text-xs">Header Example</Label>
              <pre className="mt-1.5 rounded-lg bg-[#0d0d0d] text-foreground/90 p-3 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all">
{`Authorization: Bearer ${value}`}
              </pre>
            </div>

            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
              ⚠ Never share this key with client-side code.
            </div>
          </div>

          <DialogFooter>
            {onRegenerate && (
              <Button
                onClick={onRegenerate}
                disabled={regenerating}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${regenerating ? "animate-spin" : ""}`} />
                Regenerate Key
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

const SessionDetail = () => {
  const { id } = useParams();
  const nav = useNavigate();
  const [s, setS] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const [totalLogs, setTotalLogs] = useState(0);
  const [to, setTo] = useState("");
  const [text, setText] = useState("");
  const [msgType, setMsgType] = useState("text");
  const [sending, setSending] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const [regenApi, setRegenApi] = useState(false);
  const [regenWh, setRegenWh] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ session_name: "", phone_number: "" });
  const [savingEdit, setSavingEdit] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [confirmRegen, setConfirmRegen] = useState<null | "api_token" | "webhook_secret">(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const channelRef = useRef<any>(null);

  const loadSession = async () => {
    if (!id) return;
    const { data } = await supabase.from("sessions").select("*").eq("id", id).maybeSingle();
    setS(data);
  };

  const loadLogs = async (p = page) => {
    if (!id) return;
    const from = p * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data, count } = await supabase
      .from("message_logs")
      .select("*", { count: "exact" })
      .eq("session_id", id)
      .order("created_at", { ascending: false })
      .range(from, to);
    setLogs(data || []);
    setTotalLogs(count || 0);
  };

  useEffect(() => { loadSession(); loadLogs(0); setPage(0); /* eslint-disable-next-line */ }, [id]);
  useEffect(() => { loadLogs(page); /* eslint-disable-next-line */ }, [page]);

  // Poll backend status + auto-update last_active every 30s
  useEffect(() => {
    if (!id) return;
    const tick = async () => {
      try {
        const st = await backendApi.getStatus(id);
        const update: any = {};
        if (st?.status) update.status = st.status;
        if (st?.phone) update.phone_number = st.phone;
        if (st?.name) update.whatsapp_name = st.name;
        if (st?.status === "connected") update.last_active = new Date().toISOString();
        if (Object.keys(update).length) {
          await supabase.from("sessions").update(update).eq("id", id);
          loadSession();
        }
      } catch { /* ignore */ }
    };
    tick();
    const i = setInterval(tick, s?.status === "connected" ? 10000 : 30000);
    return () => clearInterval(i);
  }, [id, s?.status]);

  // Realtime message_logs
  useEffect(() => {
    if (!id) return;
    const ch = supabase
      .channel(`logs:${id}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "message_logs", filter: `session_id=eq.${id}` },
        () => { if (page === 0) loadLogs(0); else loadLogs(page); }
      )
      .subscribe();
    channelRef.current = ch;
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line
  }, [id, page]);

  const openEdit = () => {
    if (!s) return;
    setEditForm({ session_name: s.session_name || "", phone_number: s.phone_number || "" });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!s) return;
    setSavingEdit(true);
    const { error } = await supabase.from("sessions").update({
      session_name: editForm.session_name,
      phone_number: editForm.phone_number || null,
    }).eq("id", s.id);
    setSavingEdit(false);
    if (error) return toast.error(error.message);
    toast.success("Session updated!");
    setEditOpen(false);
    loadSession();
  };

  const send = async () => {
    if (!s) return;
    if (!to) return toast.error("Enter recipient");
    if (!text) return toast.error("Enter a message");
    const { data: activeOk } = await supabase.rpc("has_active_service", { _user_id: s.user_id });
    if (!activeOk) {
      toast.error("Your trial has ended. Subscribe to a paid plan to send messages.");
      nav("/dashboard/subscription/plans");
      return;
    }
    setSending(true);
    try {
      await backendApi.sendMessage(s.id, to, text);
      await supabase.from("message_logs").insert({
        user_id: s.user_id, session_id: s.id, to_number: to,
        message_type: msgType, payload: { text }, status: "sent",
      });
      toast.success("Message sent!");
      setText(""); setTo("");
      setPage(0); loadLogs(0);
    } catch (err: any) {
      await supabase.from("message_logs").insert({
        user_id: s.user_id, session_id: s.id, to_number: to,
        message_type: msgType, payload: { text }, status: "failed", error_message: err.message,
      });
      toast.error(`Send failed: ${err.message}`);
      loadLogs(page);
    } finally {
      setSending(false);
    }
  };

  const disconnect = async () => {
    if (!s) return;
    setDisconnecting(true);
    try {
      await backendApi.logout(s.id);
      await supabase.from("sessions").update({ status: "disconnected" }).eq("id", s.id);
      toast.success("Session disconnected successfully");
      loadSession();
    } catch (err: any) {
      toast.error(`Disconnect failed: ${err.message}`);
    } finally {
      setDisconnecting(false);
      setConfirmDisconnect(false);
    }
  };

  const restart = async () => {
    if (!s) return;
    setRestarting(true);
    try {
      await backendApi.restart(s.id);
      await supabase.from("sessions").update({ status: "qr_pending" }).eq("id", s.id);
      toast.success("Session restarting...");
      nav(`/dashboard/sessions/${s.id}/connect`);
    } catch (err: any) {
      toast.error(`Restart failed: ${err.message}`);
    } finally {
      setRestarting(false);
    }
  };

  const remove = async () => {
    if (!s) return;
    await backendApi.logout(s.id).catch(() => {});
    await supabase.from("sessions").delete().eq("id", s.id);
    toast.success("Session deleted");
    nav("/dashboard/sessions");
  };

  const doRegenerate = async (field: "api_token" | "webhook_secret") => {
    if (!s) return;
    const setLoad = field === "api_token" ? setRegenApi : setRegenWh;
    setLoad(true);
    const newVal = genHexToken();
    const update: any = { [field]: newVal };
    const { error } = await supabase.from("sessions").update(update).eq("id", s.id);
    setLoad(false);
    setConfirmRegen(null);
    if (error) return toast.error(error.message);
    toast.success(`${field === "api_token" ? "API token" : "Webhook secret"} regenerated`);
    loadSession();
  };

  if (!s) return <div className="text-muted-foreground">Loading...</div>;

  const connected = s.status === "connected";
  const totalPages = Math.max(1, Math.ceil(totalLogs / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <Link to="/dashboard/sessions" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-semibold text-lg">{s.session_name}</h2>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  connected
                    ? "bg-green-500/15 text-green-500"
                    : "bg-red-500/15 text-red-500"
                }`}>
                  ● {connected ? "Connected" : "Disconnected"}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{s.phone_number || "No number"}</p>
            </div>
            <div className="flex gap-1">
              <Button size="icon" variant="outline" onClick={() => { loadSession(); loadLogs(page); }}><RefreshCw className="h-4 w-4" /></Button>
              <Button size="icon" variant="outline" onClick={() => nav(`/dashboard/sessions/${s.id}/edit`)}><Edit className="h-4 w-4" /></Button>
              <Button size="icon" variant="outline"><Webhook className="h-4 w-4" /></Button>
              <Button size="icon" variant="outline" onClick={() => setConfirmDelete(true)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-muted-foreground">Status</dt><dd className="capitalize">{s.status}</dd></div>
            <div><dt className="text-muted-foreground">Last Active</dt><dd>{s.last_active ? new Date(s.last_active).toLocaleString() : "Never"}</dd></div>
            <div><dt className="text-muted-foreground">WhatsApp Account</dt><dd>{s.whatsapp_name || s.phone_number || "—"}</dd></div>
            <div><dt className="text-muted-foreground">Connected Phone</dt><dd>{s.phone_number || "—"}</dd></div>
            <div><dt className="text-muted-foreground">Created</dt><dd>{new Date(s.created_at).toLocaleDateString()}</dd></div>
          </dl>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setConfirmDisconnect(true)} disabled={disconnecting}>
              {disconnecting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Disconnect
            </Button>
            <Button className="flex-1 bg-primary text-primary-foreground hover:bg-primary-hover" onClick={restart} disabled={restarting}>
              {restarting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Restart
            </Button>
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
                <div className="mt-1.5">
                  <TokenField
                    value={s.api_token}
                    onRegenerate={() => setConfirmRegen("api_token")}
                    regenerating={regenApi}
                    label="Private API Key"
                    title="API Access Key"
                    subtitle="Use this key to authenticate your requests"
                  />
                </div>
              </div>
              <div>
                <Label>Webhook Secret</Label>
                <div className="mt-1.5">
                  <TokenField
                    value={s.webhook_secret}
                    onRegenerate={() => setConfirmRegen("webhook_secret")}
                    regenerating={regenWh}
                    label="Webhook Secret"
                    title="Webhook Secret"
                    subtitle="Use this secret to verify incoming webhook requests"
                  />
                </div>
              </div>
              <Button variant="outline" className="w-full">API Documentation →</Button>
            </TabsContent>

            <TabsContent value="test" className="space-y-3 mt-4">
              <div><Label>To (with country code)</Label><Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="+1234567890" className="mt-1.5" /></div>
              <div>
                <Label>Type</Label>
                <Select value={msgType} onValueChange={setMsgType}><SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="image">Image</SelectItem>
                    <SelectItem value="document">Document</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Message</Label><Textarea value={text} onChange={(e) => setText(e.target.value)} className="mt-1.5" rows={4} /></div>
              <Button onClick={send} disabled={sending} className="w-full bg-primary text-primary-foreground hover:bg-primary-hover">
                {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Send Test Message
              </Button>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label className="text-xs">cURL Command</Label>
                  <button
                    type="button"
                    onClick={() => {
                      const cmd = `curl -X POST "https://alvi-waapi.duckdns.org/api/session/${s.id}/send" \\\n  -H "Authorization: Bearer ${s.api_token}" \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify({ to: to || "+1234567890", message: text || "Hello!" })}'`;
                      navigator.clipboard.writeText(cmd);
                      toast.success("Copied!");
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                  >
                    <Copy className="h-3 w-3" /> Copy
                  </button>
                </div>
                <pre className="rounded-lg bg-[#0d0d0d] text-foreground/90 p-3 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all">
{`curl -X POST "https://alvi-waapi.duckdns.org/api/session/${s.id}/send" \\
  -H "Authorization: Bearer ${s.api_token}" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify({ to: to || "+1234567890", message: text || "Hello!" })}'`}
                </pre>
              </div>
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
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{totalLogs} total · live</span>
          </div>
        </div>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No messages yet.</p>
        ) : (
          <div className="space-y-2">
            {logs.map((l) => {
              const preview = typeof l.payload === "object"
                ? (l.payload?.text || JSON.stringify(l.payload))
                : String(l.payload || "");
              return (
                <div key={l.id} className="rounded-lg border border-border bg-card-elevated p-3 text-sm">
                  <div className="flex justify-between items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">TO {l.to_number || "—"}</p>
                      <p className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString()}</p>
                      <p className="mt-1 text-xs text-muted-foreground truncate">{preview}</p>
                      {l.error_message && <p className="text-xs text-destructive mt-1">{l.error_message}</p>}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${l.status === "sent" ? "bg-green-500/15 text-green-500" : "bg-destructive/15 text-destructive"}`}>{l.status}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Prev
            </Button>
            <span className="text-xs text-muted-foreground">Page {page + 1} of {totalPages}</span>
            <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </div>

      {/* Regenerate Confirm */}
      <AlertDialog open={!!confirmRegen} onOpenChange={(o) => !o && setConfirmRegen(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerate {confirmRegen === "api_token" ? "API Token" : "Webhook Secret"}?</AlertDialogTitle>
            <AlertDialogDescription>Are you sure? This will invalidate your current {confirmRegen === "api_token" ? "token" : "secret"}.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmRegen && doRegenerate(confirmRegen)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Regenerate</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Session</DialogTitle>
            <DialogDescription>Update the session details below.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Session Name</Label>
              <Input value={editForm.session_name} onChange={(e) => setEditForm((f) => ({ ...f, session_name: e.target.value }))} className="mt-1.5" />
            </div>
            <div>
              <Label>Phone Number</Label>
              <Input value={editForm.phone_number} onChange={(e) => setEditForm((f) => ({ ...f, phone_number: e.target.value }))} placeholder="+1234567890" className="mt-1.5" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={saveEdit} disabled={savingEdit} className="bg-primary text-primary-foreground hover:bg-primary-hover">
              {savingEdit ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disconnect Confirm */}
      <AlertDialog open={confirmDisconnect} onOpenChange={setConfirmDisconnect}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to disconnect this WhatsApp session?</AlertDialogTitle>
            <AlertDialogDescription>You'll need to scan the QR again to reconnect. The phone number can then be reused in a new session.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={disconnect}>Disconnect</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirm */}
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this session?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={remove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SessionDetail;
