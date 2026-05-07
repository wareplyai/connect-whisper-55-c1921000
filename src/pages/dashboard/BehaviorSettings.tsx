import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldCheck, Clock, Gauge, Zap, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { friendlyError } from "@/lib/friendlyError";

const defaults = {
  fifo_enabled: true,
  typing_simulation: true,
  typing_min_ms: 1500,
  typing_max_ms: 4500,
  read_delay_min_ms: 800,
  read_delay_max_ms: 2500,
  reply_delay_min_ms: 2000,
  reply_delay_max_ms: 6000,
  max_replies_per_minute: 10,
  max_replies_per_hour: 200,
  auto_pause_threshold: 50,
  working_hours_enabled: false,
  working_hours_start: "09:00",
  working_hours_end: "22:00",
  timezone: "Asia/Dhaka",
  reply_only_first_in_burst: false,
  random_variation: true,
  online_presence: true,
};

type Settings = typeof defaults;

const Section = ({ icon: Icon, title, desc, children }: any) => (
  <section className="rounded-xl border border-border bg-card p-5 space-y-4">
    <div className="flex items-start gap-3">
      <div className="h-9 w-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h2 className="font-semibold">{title}</h2>
        {desc && <p className="text-xs text-muted-foreground">{desc}</p>}
      </div>
    </div>
    <div className="space-y-4">{children}</div>
  </section>
);

const Row = ({ label, hint, children }: any) => (
  <div className="flex items-start justify-between gap-4 py-2">
    <div className="min-w-0">
      <Label className="text-sm">{label}</Label>
      {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
    </div>
    <div className="shrink-0">{children}</div>
  </div>
);

const RangeRow = ({ label, hint, min, max, step, valueMin, valueMax, onChange, suffix = "ms" }: any) => (
  <div className="space-y-2 py-2">
    <div className="flex items-center justify-between">
      <Label className="text-sm">{label}</Label>
      <span className="text-xs text-muted-foreground tabular-nums">{valueMin}–{valueMax} {suffix}</span>
    </div>
    {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    <Slider
      min={min} max={max} step={step}
      value={[valueMin, valueMax]}
      onValueChange={(v) => onChange(v[0], v[1])}
    />
  </div>
);

const BehaviorSettings = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [s, setS] = useState<Settings>(defaults);
  const [rowId, setRowId] = useState<string | null>(null);

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setS((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("behavior_settings")
        .select("*")
        .eq("user_id", user.id)
        .is("session_id", null)
        .maybeSingle();
      if (data) {
        setRowId(data.id);
        const { id, user_id, session_id, created_at, updated_at, is_active, ...rest } = data as any;
        setS({ ...defaults, ...rest });
      }
      setLoading(false);
    })();
  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const payload: any = { user_id: user.id, session_id: null, ...s };
    let error;
    if (rowId) {
      ({ error } = await supabase.from("behavior_settings").update(payload).eq("id", rowId));
    } else {
      const res = await supabase.from("behavior_settings").insert(payload).select("id").single();
      error = res.error;
      if (res.data) setRowId(res.data.id);
    }
    setSaving(false);
    if (error) toast.error(friendlyError(error));
    else toast.success("Behavior settings saved");
  };

  const reset = () => { setS(defaults); toast("Reset to safe defaults — click Save"); };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-7 w-7 text-primary" /> Behavior & Anti-Ban
          </h1>
          <p className="text-sm text-muted-foreground">Make your AI replies look human — protect your WhatsApp number.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={reset}>Reset Defaults</Button>
          <Button onClick={save} disabled={saving} className="bg-primary text-primary-foreground hover:bg-primary-hover">
            {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}Save
          </Button>
        </div>
      </div>

      {/* QUEUE */}
      <Section icon={Zap} title="Message Queue" desc="How incoming messages are processed.">
        <Row label="FIFO order (recommended)" hint="Reply to messages in the order they arrived — natural human flow.">
          <Switch checked={s.fifo_enabled} onCheckedChange={(v) => set("fifo_enabled", v)} />
        </Row>
        <Row label="Reply only to first in burst" hint="If user sends 5 messages quickly, reply once to the latest combined context.">
          <Switch checked={s.reply_only_first_in_burst} onCheckedChange={(v) => set("reply_only_first_in_burst", v)} />
        </Row>
        <Row label="Random response variation" hint="Slightly vary phrasing of similar replies to look less robotic.">
          <Switch checked={s.random_variation} onCheckedChange={(v) => set("random_variation", v)} />
        </Row>
      </Section>

      {/* HUMAN BEHAVIOR */}
      <Section icon={Clock} title="Human Behavior Simulation" desc="Realistic delays so WhatsApp doesn't flag your number.">
        <Row label="Show typing indicator" hint="Display 'typing...' while preparing reply.">
          <Switch checked={s.typing_simulation} onCheckedChange={(v) => set("typing_simulation", v)} />
        </Row>
        <Row label="Always-online presence" hint="Keep the account marked as online during working hours.">
          <Switch checked={s.online_presence} onCheckedChange={(v) => set("online_presence", v)} />
        </Row>

        <RangeRow
          label="Read delay (before opening message)"
          hint="Wait before marking as read."
          min={0} max={10000} step={100}
          valueMin={s.read_delay_min_ms} valueMax={s.read_delay_max_ms}
          onChange={(a: number, b: number) => { set("read_delay_min_ms", a); set("read_delay_max_ms", b); }}
        />
        <RangeRow
          label="Typing duration"
          hint="How long to show 'typing...' before sending."
          min={500} max={15000} step={100}
          valueMin={s.typing_min_ms} valueMax={s.typing_max_ms}
          onChange={(a: number, b: number) => { set("typing_min_ms", a); set("typing_max_ms", b); }}
        />
        <RangeRow
          label="Total reply delay"
          hint="Total time from message received → reply sent (read + think + type)."
          min={1000} max={30000} step={500}
          valueMin={s.reply_delay_min_ms} valueMax={s.reply_delay_max_ms}
          onChange={(a: number, b: number) => { set("reply_delay_min_ms", a); set("reply_delay_max_ms", b); }}
        />
      </Section>

      {/* RATE LIMIT */}
      <Section icon={Gauge} title="Anti-Ban Rate Limits" desc="Cap reply frequency to avoid WhatsApp's automation detection.">
        <Row label="Max replies / minute" hint="Hard cap. Recommended: 8–12.">
          <Input type="number" min={1} max={60} className="w-24"
            value={s.max_replies_per_minute}
            onChange={(e) => set("max_replies_per_minute", Number(e.target.value))} />
        </Row>
        <Row label="Max replies / hour" hint="Recommended: 150–300 for safe accounts.">
          <Input type="number" min={10} max={2000} className="w-24"
            value={s.max_replies_per_hour}
            onChange={(e) => set("max_replies_per_hour", Number(e.target.value))} />
        </Row>
        <Row label="Auto-pause threshold" hint="Pause replies for 5 min if this many messages arrive in 1 minute (likely spam/bot attack).">
          <Input type="number" min={5} max={500} className="w-24"
            value={s.auto_pause_threshold}
            onChange={(e) => set("auto_pause_threshold", Number(e.target.value))} />
        </Row>
      </Section>

      {/* WORKING HOURS */}
      <Section icon={Clock} title="Working Hours" desc="Only auto-reply during business hours.">
        <Row label="Enable working-hours filter">
          <Switch checked={s.working_hours_enabled} onCheckedChange={(v) => set("working_hours_enabled", v)} />
        </Row>
        {s.working_hours_enabled && (
          <div className="grid md:grid-cols-3 gap-3">
            <div>
              <Label>Start</Label>
              <Input type="time" value={s.working_hours_start} onChange={(e) => set("working_hours_start", e.target.value)} />
            </div>
            <div>
              <Label>End</Label>
              <Input type="time" value={s.working_hours_end} onChange={(e) => set("working_hours_end", e.target.value)} />
            </div>
            <div>
              <Label>Timezone</Label>
              <Select value={s.timezone} onValueChange={(v) => set("timezone", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Asia/Dhaka","Asia/Kolkata","Asia/Karachi","Asia/Dubai","Asia/Singapore","Europe/London","America/New_York","America/Los_Angeles","UTC"].map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </Section>
    </div>
  );
};

export default BehaviorSettings;
