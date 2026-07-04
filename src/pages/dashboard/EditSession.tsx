import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, ChevronDown, Edit, Loader2, Zap } from "lucide-react";
import { toast } from "sonner";
import { CountryCodeSelect } from "@/components/CountryCodeSelect";
import { splitPhone, DEFAULT_COUNTRY, Country, validatePhoneForCountry } from "@/lib/countries";
import { AlertCircle } from "lucide-react";
import { friendlyError } from "@/lib/friendlyError";
import { AI_REPLY_WEBHOOK_URL } from "@/lib/backend";

const ALL_EVENTS = [
  "messages.received","messages-group.received","messages-newsletter.received","messages-personal.received",
  "call","message.sent","session.status","qrcode.updated","messages.upsert","messages.update",
  "messages.delete","message-receipt.update","messages.reaction","chats.upsert","chats.update","chats.delete",
  "groups.upsert","groups.update","group-participants.update","contacts.upsert","contacts.update","poll.results",
];

const EditSession = () => {
  const { id } = useParams();
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [name, setName] = useState("");
  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [num, setNum] = useState("");
  const [form, setForm] = useState<any>(null);
  const [builtIn, setBuiltIn] = useState(true);

  useEffect(() => {
    (async () => {
      if (!id) return;
      const { data, error } = await supabase.from("sessions").select("*").eq("id", id).maybeSingle();
      if (error || !data) { toast.error("Session not found"); nav("/dashboard/sessions"); return; }
      setName(data.session_name || "");
      const sp = splitPhone(data.phone_number);
      setCountry(sp.country); setNum(sp.number);
      const savedUrl = data.webhook_url || AI_REPLY_WEBHOOK_URL;
      setBuiltIn(!data.webhook_url || savedUrl === AI_REPLY_WEBHOOK_URL);
      setForm({
        enable_account_protection: data.enable_account_protection,
        enable_message_logging: data.enable_message_logging,
        enable_webhook: data.enable_webhook,
        webhook_url: savedUrl,
        webhook_events: data.webhook_events || [],
        read_incoming_messages: data.read_incoming_messages,
        auto_reject_calls: data.auto_reject_calls,
        always_online: data.always_online,
        ignore_groups: data.ignore_groups,
        ignore_broadcasts: data.ignore_broadcasts,
        ignore_channels: data.ignore_channels,
        proxy_url: data.proxy_url || "",
        show_typing_indicator: (data as any).show_typing_indicator ?? true,
        auto_replies_enabled: (data as any).auto_replies_enabled ?? true,
      });
      setLoading(false);
    })();
  }, [id, nav]);

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  const toggleEvent = (e: string) =>
    setForm((f: any) => ({
      ...f,
      webhook_events: f.webhook_events.includes(e) ? f.webhook_events.filter((x: string) => x !== e) : [...f.webhook_events, e],
    }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    const effectiveWebhookUrl = builtIn ? AI_REPLY_WEBHOOK_URL : (form.webhook_url || "").trim();
    const effectiveEnableWebhook = builtIn ? true : form.enable_webhook;
    if (effectiveEnableWebhook) {
      if (!effectiveWebhookUrl) { toast.error("Please enter a webhook URL to receive notifications."); return; }
      if (!/^https:\/\//i.test(effectiveWebhookUrl)) { toast.error("Webhook URL must start with https://"); return; }
    }
    let phone: string | null = null;
    if (num.trim()) {
      const v = validatePhoneForCountry(num, country);
      if (!v.ok) { toast.error(v.message || "The phone number field must be a valid number."); return; }
      phone = `${country.code}${v.digits}`;
    }
    setSaving(true);
    const { error } = await supabase.from("sessions").update({
      session_name: name,
      phone_number: phone,
      ...form,
      enable_webhook: effectiveEnableWebhook,
      proxy_url: form.proxy_url || null,
      webhook_url: effectiveWebhookUrl || null,
    }).eq("id", id);
    setSaving(false);
    if (error) return toast.error(friendlyError(error));
    toast.success("Session updated successfully");
    nav(`/dashboard/sessions/${id}`);
  };

  if (loading || !form) {
    return <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>;
  }

  return (
    <div className="max-w-3xl space-y-6">
      <Link to={`/dashboard/sessions/${id}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Session
      </Link>

      <div>
        <h1 className="text-2xl font-bold">Edit {name} Session</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Update your WhatsApp session settings. This will not disconnect your active session.
        </p>
      </div>

      <form onSubmit={submit} className="rounded-xl border border-border bg-card p-6 space-y-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label>Session Name</Label>
            <Input required value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label>Phone Number</Label>
            <div className="flex gap-2 mt-1.5">
              <CountryCodeSelect value={country} onChange={setCountry} />
              <Input
                value={num}
                onChange={(e) => setNum(e.target.value)}
                placeholder="234567890"
                className={`flex-1 ${num.trim() && !validatePhoneForCountry(num, country).ok ? "border-destructive focus-visible:ring-destructive" : ""}`}
              />
            </div>
            {num.trim() && !validatePhoneForCountry(num, country).ok && (
              <p className="mt-1.5 text-xs text-destructive flex items-start gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                The phone number field must be a valid number.
              </p>
            )}
          </div>
        </div>

        {[
          { k: "enable_account_protection", label: "Enable Account Protection", desc: "Helps prevent WhatsApp from restricting your account by controlling sending frequency." },
          { k: "enable_message_logging", label: "Enable Message Logging", desc: "When disabled, only delivery statuses are recorded. When enabled, full content is stored." },
        ].map((c) => (
          <label key={c.k} className="flex items-start gap-3 cursor-pointer">
            <Checkbox checked={form[c.k]} onCheckedChange={(v) => set(c.k, !!v)} className="mt-1" />
            <div>
              <p className="text-sm font-medium">{c.label}</p>
              <p className="text-xs text-muted-foreground">{c.desc}</p>
            </div>
          </label>
        ))}

        {/* Built-in Processing Toggle */}
        <div className="rounded-lg border border-border bg-card-elevated p-4 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <Zap className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium">Built-in Processing</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {builtIn
                    ? "ON — All messages are processed inside our platform. No data leaves the system. (Recommended)"
                    : "OFF — Forward events to your own webhook (n8n, Make, custom server, etc)."}
                </p>
              </div>
            </div>
            <Switch checked={builtIn} onCheckedChange={setBuiltIn} />
          </div>
        </div>

        {!builtIn && (
          <>
            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox checked={form.enable_webhook} onCheckedChange={(v) => set("enable_webhook", !!v)} className="mt-1" />
              <div>
                <p className="text-sm font-medium">Enable Webhook Notifications</p>
                <p className="text-xs text-muted-foreground">When enabled, events will be sent to the webhook URL below.</p>
              </div>
            </label>

            {form.enable_webhook && (
              <div className="space-y-4 rounded-lg border border-border bg-card-elevated p-4">
                <div>
                  <Label>Webhook URL (POST)</Label>
                  <Input
                    value={form.webhook_url === AI_REPLY_WEBHOOK_URL ? "" : form.webhook_url}
                    onChange={(e) => set("webhook_url", e.target.value)}
                    placeholder="https://your-server.com/webhook"
                    className="mt-1.5"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">URL must start with https://</p>
                </div>
                <div>
                  <Label className="mb-2 block">Webhook Events</Label>
                  <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-2">
                    {ALL_EVENTS.map((e) => (
                      <label key={e} className="flex items-center gap-2 text-xs cursor-pointer">
                        <Checkbox checked={form.webhook_events.includes(e)} onCheckedChange={() => toggleEvent(e)} />
                        <span className="font-mono">{e}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground">
                  Note: Your webhook endpoint must be publicly accessible, accept POST requests, and respond with 200 within 60s.
                </div>
              </div>
            )}
          </>
        )}

        <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
          <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover:text-primary">
            <ChevronDown className={`h-4 w-4 transition-transform ${advancedOpen ? "rotate-180" : ""}`} /> Advanced Settings
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4 space-y-4">
            {[
              { k: "show_typing_indicator", label: "Show Typing Indicator", desc: "Show 'typing…' on customer's phone before reply is sent. Recommended ON — feels more human." },
              { k: "auto_replies_enabled", label: "Enable Auto Replies", desc: "Master on/off for keyword auto-replies on this session. Independent from AI Agent panel." },
              { k: "read_incoming_messages", label: "Read Incoming Messages (Blue Tick)", desc: "Mark customer messages as read on WhatsApp (double blue tick). OFF = stays at delivered (gray)." },
              { k: "auto_reject_calls", label: "Auto Reject Calls", desc: "Incoming voice/video calls will be automatically rejected." },
              { k: "always_online", label: "Always Online", desc: "Your session will always appear online to customers." },
            ].map((c) => (
              <label key={c.k} className="flex items-start gap-3 cursor-pointer">
                <Checkbox checked={form[c.k]} onCheckedChange={(v) => set(c.k, !!v)} className="mt-1" />
                <div>
                  <p className="text-sm font-medium">{c.label}</p>
                  <p className="text-xs text-muted-foreground">{c.desc}</p>
                </div>
              </label>
            ))}
            <div className="border-t border-border pt-4">
              <p className="text-sm font-medium mb-2">Message Filtering</p>
              {[
                { k: "ignore_groups", label: "Ignore Groups", desc: "Skip group messages." },
                { k: "ignore_broadcasts", label: "Ignore Broadcasts", desc: "Skip broadcast lists." },
                { k: "ignore_channels", label: "Ignore Channels", desc: "Skip channel updates." },
              ].map((c) => (
                <label key={c.k} className="flex items-start gap-3 cursor-pointer mt-2">
                  <Checkbox checked={form[c.k]} onCheckedChange={(v) => set(c.k, !!v)} className="mt-1" />
                  <div>
                    <p className="text-sm font-medium">{c.label}</p>
                    <p className="text-xs text-muted-foreground">{c.desc}</p>
                  </div>
                </label>
              ))}
            </div>
            <div>
              <Label>Proxy URL (Optional)</Label>
              <Input value={form.proxy_url} onChange={(e) => set("proxy_url", e.target.value)} placeholder="socks5://username:password@proxy.example.com:1080" className="mt-1.5" />
              <p className="text-xs text-muted-foreground mt-1">Allowed protocols: http, https, socks5. Use a public domain only.</p>
            </div>
          </CollapsibleContent>
        </Collapsible>

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={saving} variant="outline" className="border-foreground/40">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Edit className="h-4 w-4 mr-2" />}
            Save Changes
          </Button>
          <Button type="button" variant="ghost" onClick={() => nav(`/dashboard/sessions/${id}`)}>Cancel</Button>
        </div>
      </form>
    </div>
  );
};

export default EditSession;
