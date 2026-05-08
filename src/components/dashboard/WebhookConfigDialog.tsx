import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowLeft, Webhook as WebhookIcon, Radio, Eye, EyeOff, Copy, RefreshCw,
  ShieldCheck, Globe, ExternalLink, Zap, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { friendlyError } from "@/lib/friendlyError";

const ALL_EVENTS = [
  "messages.received", "messages-group.received", "messages-newsletter.received",
  "messages-personal.received", "call", "message.sent",
  "session.status", "qrcode.updated", "messages.upsert",
  "messages.update", "messages.delete", "message-receipt.update",
  "messages.reaction", "chats.upsert", "chats.update",
  "chats.delete", "groups.upsert", "groups.update",
  "group-participants.update", "contacts.upsert", "contacts.update",
  "poll.results",
];

const HIGHLIGHT = new Set(["messages.received"]);

const genHexToken = () => {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
};

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  session: any;
  onSaved: () => void;
}

const WebhookConfigDialog = ({ open, onOpenChange, session, onSaved }: Props) => {
  const [enabled, setEnabled] = useState(false);
  const [url, setUrl] = useState("");
  const [forwardUrl, setForwardUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [events, setEvents] = useState<string[]>([]);
  const [ignoreGroups, setIgnoreGroups] = useState(true);
  const [ignoreBroadcasts, setIgnoreBroadcasts] = useState(true);
  const [ignoreChannels, setIgnoreChannels] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const sendTest = async () => {
    if (!session) return;
    if (!enabled || !url.trim()) {
      toast.error("Enable webhook and enter a URL first, then Save.");
      return;
    }
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("webhook-test", {
        body: { session_id: session.id, event_type: "messages.received" },
      });
      if (error) throw error;
      if (data?.ok) {
        toast.success(`Test delivered ✓ (HTTP ${data.status})`);
      } else {
        toast.error(`Test failed: ${data?.error || `HTTP ${data?.status}`}`, {
          description: (data?.response || "").slice(0, 200),
        });
      }
    } catch (e: any) {
      toast.error(e?.message || "Test failed");
    } finally {
      setTesting(false);
    }
  };

  useEffect(() => {
    if (!session || !open) return;
    setEnabled(!!session.enable_webhook);
    setUrl(session.webhook_url || `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/ai-reply`);
    setForwardUrl(session.forward_webhook_url || "");
    setSecret(session.webhook_secret || "");
    setEvents(session.webhook_events || ["messages.received"]);
    setIgnoreGroups(session.ignore_groups ?? true);
    setIgnoreBroadcasts(session.ignore_broadcasts ?? true);
    setIgnoreChannels(session.ignore_channels ?? true);
  }, [session, open]);

  const toggleEvent = (e: string) => {
    setEvents((prev) => prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]);
  };

  const rotateSecret = () => {
    setSecret(genHexToken());
    toast.success("New secret generated. Click Save to apply.");
  };

  const copy = async (val: string, label: string) => {
    await navigator.clipboard.writeText(val);
    toast.success(`${label} copied`);
  };

  const save = async () => {
    if (!session) return;
    if (enabled) {
      if (!url.trim()) return toast.error("Please enter the gateway webhook URL (ai-reply).");
      if (!/^https:\/\//i.test(url.trim())) return toast.error("Webhook URL must start with https://");
      if (forwardUrl.trim() && !/^https:\/\//i.test(forwardUrl.trim())) return toast.error("Forward URL must start with https://");
    }
    setSaving(true);
    const { error } = await supabase.from("sessions").update({
      enable_webhook: enabled,
      webhook_url: url || null,
      forward_webhook_url: null,
      webhook_secret: secret,
      webhook_events: events,
      ignore_groups: ignoreGroups,
      ignore_broadcasts: ignoreBroadcasts,
      ignore_channels: ignoreChannels,
    }).eq("id", session.id);
    setSaving(false);
    if (error) return toast.error(friendlyError(error));
    toast.success("Webhook configuration saved");
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl p-0 overflow-hidden bg-card border-border">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div className="flex items-center gap-3">
            <button onClick={() => onOpenChange(false)} className="p-1 rounded hover:bg-card-elevated">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h2 className="text-lg font-semibold">Webhook Configuration</h2>
              <p className="text-xs text-muted-foreground">Manage real-time event notifications</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button variant="outline" onClick={sendTest} disabled={testing || !enabled}>
              {testing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
              Send Test Event
            </Button>
            <Button onClick={save} disabled={saving} className="bg-primary text-primary-foreground hover:bg-primary-hover">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-0 max-h-[75vh] overflow-y-auto">
          {/* LEFT - Endpoint Settings */}
          <div className="p-6 border-r border-border space-y-5">
            <div className="rounded-xl border border-border bg-card-elevated p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-background flex items-center justify-center">
                    <WebhookIcon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Endpoint Settings</p>
                    <p className="text-xs text-muted-foreground">Destination for POST requests</p>
                  </div>
                </div>
                <Switch checked={enabled} onCheckedChange={setEnabled} />
              </div>
            </div>

            <div className={enabled ? "" : "opacity-50 pointer-events-none"}>
              <div className="space-y-2">
                <p className="text-[11px] font-semibold tracking-wider text-muted-foreground">GATEWAY PAYLOAD URL (ai-reply)</p>
                <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
                  <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder={`https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/ai-reply`}
                    className="border-0 bg-transparent p-0 h-auto text-xs font-mono focus-visible:ring-0"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">WhatsApp gateway sends incoming messages directly to this endpoint. AI reply, product image match, and auto-replies are all handled here. No external service (n8n etc.) is needed.</p>
              </div>

              <div className="space-y-2 mt-5">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold tracking-wider text-muted-foreground">WEBHOOK SECRET</p>
                  <button onClick={rotateSecret} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                    <RefreshCw className="h-3 w-3" /> Rotate
                  </button>
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
                  <span className="flex-1 font-mono text-xs truncate">
                    {showSecret ? (secret || "—") : "•".repeat(Math.min(secret.length || 32, 36))}
                  </span>
                  <button onClick={() => setShowSecret((s) => !s)} className="p-1 hover:bg-card-elevated rounded">
                    {showSecret ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                  <button onClick={() => copy(secret, "Webhook secret")} className="p-1 hover:bg-card-elevated rounded">
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card-elevated p-4 mt-5">
                <p className="text-sm font-semibold">Message Filtering</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Choose which types of messages to ignore. Ignored messages won't trigger webhooks or be processed.
                </p>
                <div className="space-y-2 mt-4">
                  {[
                    { k: "g", label: "Ignore Groups", desc: "Skip group messages", val: ignoreGroups, set: setIgnoreGroups },
                    { k: "b", label: "Ignore Broadcasts", desc: "Skip broadcast lists", val: ignoreBroadcasts, set: setIgnoreBroadcasts },
                    { k: "c", label: "Ignore Channels", desc: "Skip channel updates", val: ignoreChannels, set: setIgnoreChannels },
                  ].map((row) => (
                    <label key={row.k} className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2 cursor-pointer">
                      <Checkbox checked={row.val} onCheckedChange={(v) => row.set(!!v)} />
                      <div className="flex-1">
                        <p className="text-sm font-medium leading-tight">{row.label}</p>
                        <p className="text-xs text-muted-foreground">{row.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-4">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Security: Verify the <code className="px-1.5 py-0.5 rounded bg-card-elevated font-mono">X-Webhook-Signature</code> header.</span>
              </div>
            </div>
          </div>

          {/* RIGHT - Subscriptions */}
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-card-elevated flex items-center justify-center">
                  <Radio className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Subscriptions</p>
                  <p className="text-xs text-muted-foreground">Trigger events</p>
                </div>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-card-elevated border border-border">
                {events.length} Active
              </span>
            </div>

            <div className={`grid grid-cols-3 gap-2 ${enabled ? "" : "opacity-50 pointer-events-none"}`}>
              {ALL_EVENTS.map((e) => {
                const checked = events.includes(e);
                return (
                  <label
                    key={e}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 cursor-pointer text-xs transition-colors ${
                      checked ? "border-primary bg-primary/5" : "border-border bg-background hover:border-border-hover"
                    }`}
                  >
                    <Checkbox checked={checked} onCheckedChange={() => toggleEvent(e)} />
                    <span className="font-mono truncate flex-1">{e}</span>
                    {HIGHLIGHT.has(e) && <Zap className="h-3 w-3 text-yellow-500 shrink-0" />}
                    <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WebhookConfigDialog;
