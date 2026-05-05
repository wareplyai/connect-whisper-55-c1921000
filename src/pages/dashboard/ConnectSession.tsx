import { useEffect, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  CheckCircle2,
  Loader2,
  RefreshCw,
  ChevronRight,
  Smartphone,
  Settings,
  Link2,
  QrCode,
  Pencil,
  Webhook,
  Trash2,
  ShieldAlert,
  ShieldCheck,
  X,
  Eye,
  EyeOff,
  Copy,
  Globe,
  Radio,
  RotateCw,
  ExternalLink,
  Save,
  ArrowLeft,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { backendApi } from "@/lib/backend";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const QR_LIFETIME = 50; // seconds

const ALL_EVENTS = [
  "messages.received","messages-group.received","messages-newsletter.received","messages-personal.received",
  "call","message.sent","session.status","qrcode.updated","messages.upsert","messages.update",
  "messages.delete","message-receipt.update","messages.reaction","chats.upsert","chats.update","chats.delete",
  "groups.upsert","groups.update","group-participants.update","contacts.upsert","contacts.update","poll.results",
];

const ConnectSession = () => {
  const { id } = useParams();
  const nav = useNavigate();
  const [status, setStatus] = useState("qr_pending");
  const [session, setSession] = useState<any>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(QR_LIFETIME);
  const [expired, setExpired] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [tipsOpen, setTipsOpen] = useState(false);
  const [webhookOpen, setWebhookOpen] = useState(false);
  const redirectedRef = useRef(false);
  const qrLoadedRef = useRef(false);

  // Load session
  useEffect(() => {
    if (!id) return;
    supabase.from("sessions").select("*").eq("id", id).maybeSingle().then(({ data }) => {
      setSession(data);
      if (data?.status) setStatus(data.status);
    });
  }, [id]);

  const fetchQrOnce = async () => {
    if (!id) return;
    try {
      const data = await backendApi.getQr(id);
      if (data?.qr && !qrLoadedRef.current) {
        setQr(data.qr);
        setSecondsLeft(QR_LIFETIME);
        setExpired(false);
        qrLoadedRef.current = true;
      }
      if (data?.status) {
        setStatus(data.status);
      }
      setError(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const pollStatus = async () => {
    if (!id) return;
    try {
      const data = await backendApi.getStatus(id);
      if (data?.status) {
        setStatus(data.status);
        if (data.status === "connected" && !redirectedRef.current) {
          redirectedRef.current = true;
          await supabase.from("sessions").update({
            status: "connected",
            last_active: new Date().toISOString(),
          }).eq("id", id);
          toast.success("WhatsApp connected!");
          setTimeout(() => nav(`/dashboard/sessions/${id}`), 1500);
        }
      }
    } catch {}
  };

  // Initial QR fetch
  useEffect(() => {
    if (!id) return;
    fetchQrOnce();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Poll status every 3s (no QR overwrite)
  useEffect(() => {
    if (!id) return;
    const t = setInterval(pollStatus, 3000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Countdown
  useEffect(() => {
    if (status === "connected" || expired || !qr) return;
    const t = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          setExpired(true);
          clearInterval(t);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [status, expired, qr]);

  const handleRefresh = async () => {
    if (!id || refreshing) return;
    setRefreshing(true);
    try {
      qrLoadedRef.current = false;
      setQr(null);
      setExpired(false);
      setSecondsLeft(QR_LIFETIME);
      await backendApi.restart(id);
      // wait briefly for backend to generate
      await new Promise((r) => setTimeout(r, 1500));
      await fetchQrOnce();
      // retry a few times if still no QR
      let tries = 0;
      while (!qrLoadedRef.current && tries < 8) {
        await new Promise((r) => setTimeout(r, 1500));
        await fetchQrOnce();
        tries++;
      }
      toast.success("New QR generated");
    } catch (e: any) {
      toast.error(e.message || "Failed to refresh");
    } finally {
      setRefreshing(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    if (!confirm("Delete this session?")) return;
    try {
      await backendApi.logout(id).catch(() => {});
      await supabase.from("sessions").delete().eq("id", id);
      toast.success("Session deleted");
      nav("/dashboard/sessions");
    } catch (e: any) {
      toast.error(e.message || "Failed");
    }
  };

  const qrSrc = qr
    ? (qr.startsWith("data:") || qr.startsWith("http")
        ? qr
        : `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(qr)}`)
    : null;

  const isConnected = status === "connected";

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/dashboard" className="hover:text-foreground">Dashboard</Link>
        <ChevronRight className="h-4 w-4" />
        <Link to="/dashboard/sessions" className="hover:text-foreground">WhatsApp Sessions</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">{session?.session_name || "Session"}</span>
      </nav>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{session?.session_name || "Connect Session"}</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => nav(`/dashboard/sessions/${id}/edit`)}>
            <Pencil className="h-4 w-4 mr-2" /> Edit
          </Button>
          <Button variant="outline" size="sm" onClick={() => setWebhookOpen(true)} className="border-primary/40 text-primary hover:bg-primary/10">
            <Webhook className="h-4 w-4 mr-2" /> Manage Webhook
          </Button>
          <Button variant="outline" size="sm" onClick={handleDelete} className="text-destructive hover:text-destructive">
            <Trash2 className="h-4 w-4 mr-2" /> Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        <aside className="rounded-2xl border border-border bg-card p-6 space-y-5 h-fit">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Session Name</p>
            <p className="font-semibold mt-1">{session?.session_name || "—"}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Phone Number</p>
            <p className="font-semibold mt-1">{session?.phone_number || "Not connected yet"}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Status</p>
            {isConnected ? (
              <Badge className="bg-primary text-primary-foreground hover:bg-primary">
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Connected
              </Badge>
            ) : (
              <Badge className="bg-blue-500 text-white hover:bg-blue-500">
                <QrCode className="h-3.5 w-3.5 mr-1" /> Needs QR Scan
              </Badge>
            )}
          </div>
          <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground leading-relaxed">
            Scan the QR code with WhatsApp on your phone. The QR is valid for {QR_LIFETIME} seconds.
          </div>
        </aside>

        <main className="rounded-2xl border border-border bg-card p-6 space-y-6">
          <div className="flex flex-wrap gap-2">
            <button
              className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground"
            >
              <QrCode className="inline h-4 w-4 mr-2" />
              How to Scan QR Code
            </button>
            <button
              onClick={() => setTipsOpen(true)}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-muted text-muted-foreground hover:bg-muted/80"
            >
              <ShieldAlert className="inline h-4 w-4 mr-2" />
              Tips to avoid bans
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <div className="flex flex-col items-center text-center space-y-4">
              {isConnected ? (
                <div className="space-y-3 py-12">
                  <CheckCircle2 className="mx-auto h-20 w-20 text-primary" />
                  <Badge className="bg-primary text-primary-foreground hover:bg-primary text-base px-4 py-1">
                    Connected ✅
                  </Badge>
                  <p className="text-sm text-muted-foreground">Redirecting...</p>
                </div>
              ) : (
                <>
                  <div className={cn(
                    "rounded-2xl border-4 p-4 bg-white shadow-lg relative",
                    expired ? "border-muted" : "border-primary"
                  )}>
                    {qrSrc ? (
                      <>
                        <img src={qrSrc} alt="WhatsApp QR code" className={cn("block w-[280px] h-[280px]", expired && "opacity-30 blur-sm")} />
                        {expired && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="px-3 py-1.5 rounded-md bg-background/90 text-foreground text-sm font-semibold border border-border">
                              QR Code expired
                            </span>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="w-[280px] h-[280px] flex flex-col items-center justify-center gap-2 text-muted-foreground">
                        <Loader2 className="h-10 w-10 animate-spin" />
                        <span className="text-sm">Waiting for QR…</span>
                      </div>
                    )}
                  </div>
                  {!expired ? (
                    <p className="text-sm text-muted-foreground">
                      Expires in <span className="font-semibold text-foreground">{secondsLeft}</span> seconds
                    </p>
                  ) : (
                    <p className="text-sm text-destructive font-medium">QR code expired. Click below to get a new one.</p>
                  )}
                  <Button onClick={handleRefresh} disabled={refreshing} variant={expired ? "default" : "outline"}>
                    <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
                    {expired ? "Get New QR Code" : "Refresh QR Code"}
                  </Button>
                  {error && <p className="text-xs text-destructive">{error}</p>}
                </>
              )}
            </div>

            <div>
              <ol className="space-y-4">
                {[
                  { icon: Smartphone, text: "Open WhatsApp on your phone" },
                  { icon: Settings, text: "Go to Settings → Linked Devices" },
                  { icon: Link2, text: 'Tap "Link a Device"' },
                  { icon: QrCode, text: "Scan this QR code" },
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm">
                      {i + 1}
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <step.icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{step.text}</span>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </main>
      </div>

      {/* Account health popup */}
      <AccountHealthDialog open={tipsOpen} onOpenChange={setTipsOpen} />

      {/* Webhook configuration popup */}
      <WebhookConfigDialog
        open={webhookOpen}
        onOpenChange={setWebhookOpen}
        session={session}
        onSaved={(s) => setSession(s)}
      />
    </div>
  );
};

/* ------------------- Account health popup ------------------- */
const AccountHealthDialog = ({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-xl p-0 overflow-hidden bg-card border-border">
      <div className="p-6 space-y-5">
        <div>
          <h2 className="text-2xl font-bold">Keep your account healthy</h2>
          <p className="text-sm text-muted-foreground mt-1">Simple tips to reduce the chance of flagging or blocking</p>
        </div>

        <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-1.5">
          <div className="flex items-center gap-2 font-semibold">
            <ShieldCheck className="h-4 w-4 text-primary" /> Recommended usage
          </div>
          <p className="text-sm text-muted-foreground">
            Our API is best suited for reply-based automation and for messaging existing contacts. If you initiate messages to unsaved contacts, do it carefully and only with permission.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-1.5">
          <div className="flex items-center gap-2 font-semibold">
            <ShieldCheck className="h-4 w-4 text-primary" /> Warm up new numbers
          </div>
          <p className="text-sm text-muted-foreground">
            If the number is newly registered, use it normally with real contacts for a few days. Send and receive messages and media, and ideally wait at least 3 days before linking to any API or scanning the QR.
          </p>
        </div>

        <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5">
          <li>Start small and increase volume gradually; avoid big blasts to unsaved contacts.</li>
          <li>Message people who opted in and keep content relevant. Offer an easy opt-out.</li>
          <li>Vary your wording and timing; avoid lots of identical, back-to-back messages.</li>
          <li>Reply to incoming messages to keep healthy engagement signals.</li>
        </ul>

        <p className="text-sm text-muted-foreground">
          For more guidance, see{" "}
          <a
            href="https://faq.whatsapp.com/5957850900902049"
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-foreground underline inline-flex items-center gap-1"
          >
            key compliance points <ExternalLink className="h-3 w-3" />
          </a>
          .
        </p>

        <div className="flex justify-center pt-2">
          <Button onClick={() => onOpenChange(false)} className="px-8">Got it</Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
);

/* ------------------- Webhook config popup ------------------- */
const WebhookConfigDialog = ({
  open, onOpenChange, session, onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  session: any;
  onSaved: (s: any) => void;
}) => {
  const [enabled, setEnabled] = useState(false);
  const [url, setUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [events, setEvents] = useState<string[]>([]);
  const [ignoreGroups, setIgnoreGroups] = useState(true);
  const [ignoreBroadcasts, setIgnoreBroadcasts] = useState(true);
  const [ignoreChannels, setIgnoreChannels] = useState(true);
  const [showSecret, setShowSecret] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!session) return;
    setEnabled(!!session.enable_webhook);
    setUrl(session.webhook_url || "");
    setSecret(session.webhook_secret || "");
    setEvents(session.webhook_events || []);
    setIgnoreGroups(!!session.ignore_groups);
    setIgnoreBroadcasts(!!session.ignore_broadcasts);
    setIgnoreChannels(!!session.ignore_channels);
  }, [session, open]);

  const toggle = (e: string) =>
    setEvents((arr) => (arr.includes(e) ? arr.filter((x) => x !== e) : [...arr, e]));

  const rotate = () => {
    const s = crypto.randomUUID();
    setSecret(s);
    toast.success("Webhook secret rotated");
  };

  const copySecret = async () => {
    await navigator.clipboard.writeText(secret);
    toast.success("Secret copied");
  };

  const save = async () => {
    if (!session?.id) return;
    if (enabled) {
      if (!url.trim()) { toast.error("Please enter a payload URL"); return; }
      if (!/^https:\/\//i.test(url.trim())) { toast.error("URL must start with https://"); return; }
    }
    setSaving(true);
    const { data, error } = await supabase.from("sessions").update({
      enable_webhook: enabled,
      webhook_url: url.trim() || null,
      webhook_secret: secret,
      webhook_events: events,
      ignore_groups: ignoreGroups,
      ignore_broadcasts: ignoreBroadcasts,
      ignore_channels: ignoreChannels,
    }).eq("id", session.id).select().maybeSingle();
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Webhook configuration saved");
    if (data) onSaved(data);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl p-0 overflow-hidden bg-card border-border">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <button onClick={() => onOpenChange(false)} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h2 className="text-xl font-bold">Webhook Configuration</h2>
              <p className="text-xs text-muted-foreground">Manage real-time event notifications</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button size="sm" onClick={save} disabled={saving}>
              <Save className="h-4 w-4 mr-2" /> {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6 p-6 max-h-[75vh] overflow-y-auto">
          {/* Endpoint settings */}
          <div className={cn(
            "rounded-xl border border-border bg-muted/20 p-5 space-y-5 h-fit transition-opacity",
            !enabled && "opacity-60"
          )}>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                  <Webhook className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold">Endpoint Settings</p>
                  <p className="text-xs text-muted-foreground">Destination for POST requests</p>
                </div>
              </div>
              <Switch checked={enabled} onCheckedChange={setEnabled} />
            </div>

            <div className={cn("space-y-4", !enabled && "pointer-events-none")}>
              <div>
                <label className="text-xs uppercase tracking-wide text-muted-foreground">Payload URL</label>
                <div className="relative mt-1.5">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://api.your-domain.com/webhook"
                    className="pl-9"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs uppercase tracking-wide text-muted-foreground">Webhook Secret</label>
                  <button onClick={rotate} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                    <RotateCw className="h-3 w-3" /> Rotate
                  </button>
                </div>
                <div className="relative mt-1.5">
                  <Input
                    value={secret}
                    readOnly
                    type={showSecret ? "text" : "password"}
                    className="pr-20 font-mono text-xs"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button onClick={() => setShowSecret((v) => !v)} className="p-1 text-muted-foreground hover:text-foreground">
                      {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                    <button onClick={copySecret} className="p-1 text-muted-foreground hover:text-foreground">
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-card p-3 space-y-3">
                <div>
                  <p className="font-semibold text-sm">Message Filtering</p>
                  <p className="text-xs text-muted-foreground">Choose which types of messages to ignore. Ignored messages won't trigger webhooks or be processed.</p>
                </div>
                {[
                  { state: ignoreGroups, set: setIgnoreGroups, label: "Ignore Groups", desc: "Skip group messages" },
                  { state: ignoreBroadcasts, set: setIgnoreBroadcasts, label: "Ignore Broadcasts", desc: "Skip broadcast lists" },
                  { state: ignoreChannels, set: setIgnoreChannels, label: "Ignore Channels", desc: "Skip channel updates" },
                ].map((c) => (
                  <label key={c.label} className="flex items-start gap-2 cursor-pointer">
                    <Checkbox checked={c.state} onCheckedChange={(v) => c.set(!!v)} className="mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">{c.label}</p>
                      <p className="text-xs text-muted-foreground">{c.desc}</p>
                    </div>
                  </label>
                ))}
              </div>

              <div className="flex items-start gap-2 text-xs text-muted-foreground border-t border-border pt-3">
                <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0" />
                <span><strong className="text-foreground">Security:</strong> Verify the <code className="px-1 py-0.5 rounded bg-muted text-foreground">X-Webhook-Signature</code> header.</span>
              </div>
            </div>
          </div>

          {/* Subscriptions */}
          <div className={cn(
            "rounded-xl border border-border bg-muted/20 p-5 space-y-4 transition-opacity",
            !enabled && "opacity-60"
          )}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                  <Radio className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold">Subscriptions</p>
                  <p className="text-xs text-muted-foreground">Trigger events</p>
                </div>
              </div>
              <Badge variant="secondary" className="text-xs">{enabled ? events.length : 0} Active</Badge>
            </div>

            <div className={cn(
              "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2",
              !enabled && "pointer-events-none"
            )}>
              {ALL_EVENTS.map((ev) => {
                const checked = events.includes(ev);
                return (
                  <button
                    key={ev}
                    type="button"
                    onClick={() => toggle(ev)}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                      checked
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border bg-card hover:bg-muted/40"
                    )}
                  >
                    <Checkbox checked={checked} className="pointer-events-none" />
                    <span className="font-mono text-xs flex-1 truncate">{ev}</span>
                    <ExternalLink className="h-3 w-3 text-muted-foreground" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ConnectSession;
