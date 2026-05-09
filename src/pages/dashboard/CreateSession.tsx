import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ArrowLeft, ChevronDown, QrCode, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { backendApi } from "@/lib/backend";
import { CountryCodeSelect } from "@/components/CountryCodeSelect";
import { DEFAULT_COUNTRY, Country, validatePhoneForCountry } from "@/lib/countries";
import { friendlyError } from "@/lib/friendlyError";

const ALL_EVENTS = [
  "messages.received","messages-group.received","messages-newsletter.received","messages-personal.received",
  "call","message.sent","session.status","qrcode.updated","messages.upsert","messages.update",
  "messages.delete","message-receipt.update","messages.reaction","chats.upsert","chats.update","chats.delete",
  "groups.upsert","groups.update","group-participants.update","contacts.upsert","contacts.update","poll.results"
];

const CreateSession = () => {
  const { profile, user } = useAuth();
  const nav = useNavigate();
  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [phoneNum, setPhoneNum] = useState("");
  const AI_REPLY_WEBHOOK_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/ai-reply`;
  const [form, setForm] = useState({
    session_name: "",
    enable_account_protection: true,
    enable_message_logging: true,
    enable_webhook: true,
    webhook_url: AI_REPLY_WEBHOOK_URL,
    webhook_events: ["messages.received", "message.sent"] as string[],
    read_incoming_messages: false,
    auto_reject_calls: false,
    always_online: true,
    ignore_groups: true,
    ignore_broadcasts: true,
    ignore_channels: true,
    proxy_url: "",
    show_typing_indicator: true,
    auto_replies_enabled: true,
  });
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));
  const toggleEvent = (e: string) => {
    setForm((f) => ({
      ...f,
      webhook_events: f.webhook_events.includes(e) ? f.webhook_events.filter((x) => x !== e) : [...f.webhook_events, e],
    }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    const userId = profile?.id || user?.id;
    if (!userId) { setLoading(false); toast.error("You must be signed in to create a session."); return; }

    // Block if user has no active service (expired trial / no paid plan)
    const { data: activeOk } = await supabase.rpc("has_active_service", { _user_id: userId });
    if (!activeOk) {
      setLoading(false);
      toast.error("Your trial has ended. Subscribe to a paid plan to create sessions.");
      nav("/dashboard/subscription/plans");
      return;
    }

    // Phone validation (country-specific)
    const v = validatePhoneForCountry(phoneNum, country);
    if (!v.ok) {
      setLoading(false);
      toast.error(v.message || "The phone number field must be a valid number.");
      return;
    }
    const fullPhone = `${country.code}${v.digits}`;

    // Webhook validation
    if (form.enable_webhook) {
      if (!form.webhook_url.trim()) { setLoading(false); toast.error("Please enter a webhook URL to receive notifications."); return; }
      if (!/^https:\/\//i.test(form.webhook_url.trim())) { setLoading(false); toast.error("Webhook URL must start with https://"); return; }
    }

    // Duplicate phone check — own sessions (any status)
    const { data: ownExisting } = await supabase
      .from("sessions")
      .select("id, session_name")
      .eq("user_id", userId)
      .eq("phone_number", fullPhone)
      .maybeSingle();
    if (ownExisting) {
      setLoading(false);
      toast.error(`This phone number is already linked to your session "${ownExisting.session_name}". Delete that session first to reuse this number.`);
      return;
    }

    // Platform-wide check — across all users / accounts (any status)
    const { count: anyCount } = await supabase
      .from("sessions")
      .select("id", { count: "exact", head: true })
      .eq("phone_number", fullPhone);
    if ((anyCount ?? 0) > 0) {
      setLoading(false);
      toast.error("This WhatsApp number is already linked to another account on this platform. One number can only be used in one session at a time.");
      return;
    }

    const { data, error } = await supabase.from("sessions").insert({
      user_id: userId,
      session_name: form.session_name,
      phone_number: fullPhone,
      enable_account_protection: form.enable_account_protection,
      enable_message_logging: form.enable_message_logging,
      enable_webhook: form.enable_webhook,
      webhook_url: form.webhook_url || null,
      webhook_events: form.webhook_events,
      read_incoming_messages: form.read_incoming_messages,
      auto_reject_calls: form.auto_reject_calls,
      always_online: form.always_online,
      ignore_groups: form.ignore_groups,
      ignore_broadcasts: form.ignore_broadcasts,
      ignore_channels: form.ignore_channels,
      proxy_url: form.proxy_url || null,
      show_typing_indicator: form.show_typing_indicator,
      auto_replies_enabled: form.auto_replies_enabled,
      status: "qr_pending",
    }).select().single();

    if (error) {
      setLoading(false);
      if ((error as any).code === "23505" || /unique/i.test(error.message)) {
        return toast.error("The phone number has already been taken. Disconnect the existing session first.");
      }
      return toast.error(friendlyError(error));
    }

    try {
      await backendApi.createSession(data.id);
      toast.success("Session created!");
      nav(`/dashboard/sessions/${data.id}/connect`);
    } catch (err: any) {
      toast.error(`Backend error: ${friendlyError(err)}`);
      nav(`/dashboard/sessions/${data.id}/connect`);
    } finally {
      setLoading(false);
    }
  };

  const phoneCheck = phoneNum.trim() ? validatePhoneForCountry(phoneNum, country) : null;
  const showPhoneError = !!phoneCheck && !phoneCheck.ok;

  return (
    <div className="max-w-3xl space-y-6">
      <Link to="/dashboard/sessions" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Sessions
      </Link>
      <h1 className="text-2xl font-bold">Create WhatsApp Session</h1>

      <form onSubmit={submit} className="rounded-xl border border-border bg-card p-6 space-y-6">
        <div>
          <h2 className="font-semibold">Link Your WhatsApp Number</h2>
          <p className="text-sm text-muted-foreground">Set up a new WhatsApp session. You'll scan a QR code to connect after creating.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label>Session Name</Label>
            <Input required value={form.session_name} onChange={(e) => set("session_name", e.target.value)} placeholder="My WhatsApp Session" className="mt-1.5" />
          </div>
          <div>
            <Label>Phone Number</Label>
            <div className="flex gap-2 mt-1.5">
              <CountryCodeSelect value={country} onChange={setCountry} />
              <Input
                required
                value={phoneNum}
                onChange={(e) => setPhoneNum(e.target.value)}
                placeholder="1712345678"
                className={`flex-1 ${showPhoneError ? "border-destructive focus-visible:ring-destructive" : ""}`}
              />
            </div>
            {showPhoneError && (
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
          { k: "enable_webhook", label: "Enable Webhook Notifications (Optional)", desc: "When enabled, events will be sent to the webhook URL below." },
        ].map((c) => (
          <label key={c.k} className="flex items-start gap-3 cursor-pointer">
            <Checkbox checked={(form as any)[c.k]} onCheckedChange={(v) => set(c.k, !!v)} className="mt-1" />
            <div>
              <p className="text-sm font-medium">{c.label}</p>
              <p className="text-xs text-muted-foreground">{c.desc}</p>
            </div>
          </label>
        ))}

        {form.enable_webhook && (
          <div className="space-y-4 rounded-lg border border-border bg-card-elevated p-4">
            <div>
              <Label>Webhook URL (POST) <span className="text-destructive">*</span></Label>
              <Input
                value={form.webhook_url}
                onChange={(e) => set("webhook_url", e.target.value)}
                placeholder={AI_REPLY_WEBHOOK_URL}
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

        <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
          <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover:text-primary">
            <ChevronDown className={`h-4 w-4 transition-transform ${advancedOpen ? "rotate-180" : ""}`} /> Advanced Settings
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4 space-y-4">
            {[
              { k: "show_typing_indicator", label: "Show Typing Indicator", desc: "Show 'typing…' on customer's phone before reply is sent. Recommended ON — feels more human." },
              { k: "auto_replies_enabled", label: "Enable Auto Replies", desc: "Master on/off for keyword auto-replies on this session. Independent from AI Agent panel." },
              { k: "read_incoming_messages", label: "Read Incoming Messages (Blue Tick)", desc: "Mark messages as read on WhatsApp (double blue tick). OFF = stays gray/delivered." },
              { k: "auto_reject_calls", label: "Auto Reject Calls", desc: "Incoming calls will be automatically rejected." },
              { k: "always_online", label: "Always Online", desc: "Your session will always appear online." },
            ].map((c) => (
              <label key={c.k} className="flex items-start gap-3 cursor-pointer">
                <Checkbox checked={(form as any)[c.k]} onCheckedChange={(v) => set(c.k, !!v)} className="mt-1" />
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
                  <Checkbox checked={(form as any)[c.k]} onCheckedChange={(v) => set(c.k, !!v)} className="mt-1" />
                  <div>
                    <p className="text-sm font-medium">{c.label}</p>
                    <p className="text-xs text-muted-foreground">{c.desc}</p>
                  </div>
                </label>
              ))}
            </div>
            <div>
              <Label>Proxy URL (Optional)</Label>
              <Input value={form.proxy_url} onChange={(e) => set("proxy_url", e.target.value)} placeholder="socks5://user:pass@proxy.example.com:1080" className="mt-1.5" />
              <p className="text-xs text-muted-foreground mt-1">Allowed: http, https, socks5. Public domain only.</p>
            </div>
          </CollapsibleContent>
        </Collapsible>

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={loading} className="bg-primary text-primary-foreground hover:bg-primary-hover">
            <QrCode className="h-4 w-4 mr-2" /> {loading ? "Creating..." : "Create & Connect Session"}
          </Button>
          <Button type="button" variant="outline" onClick={() => nav("/dashboard/sessions")}>Cancel</Button>
        </div>
      </form>
    </div>
  );
};

export default CreateSession;
