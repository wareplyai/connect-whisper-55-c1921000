import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, MessageSquareText, Power } from "lucide-react";
import { toast } from "sonner";
import { backendApi, BACKEND_URL } from "@/lib/backend";
import { friendlyError } from "@/lib/friendlyError";

type Rule = {
  id: string;
  rule_name: string;
  keywords: string[];
  match_type: string;
  reply_template: string;
  is_active: boolean;
  priority: number;
  match_count: number;
  session_id: string | null;
  category: string | null;
  description: string | null;
  image_url: string | null;
};

type Session = { id: string; session_name: string };

type GatewaySession = { id: string; status?: string; phone?: string };

const parseKeywords = (value: string) =>
    Array.from(
      new Set(
        value
          .split(",")
          .map((k) => k.trim().toLowerCase())
          .filter(Boolean)
      )
    );

const empty: Partial<Rule> = {
  rule_name: "",
  keywords: [],
  match_type: "contains",
  reply_template: "",
  is_active: true,
  priority: 0,
  session_id: null,
  category: "",
  description: "",
  image_url: "",
};

const AutoReplies = () => {
  const { profile } = useAuth();
  const [rules, setRules] = useState<Rule[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Rule>>(empty);
  const [keywordsText, setKeywordsText] = useState("");
  const [gatewaySessions, setGatewaySessions] = useState<GatewaySession[]>([]);
  const [gatewayError, setGatewayError] = useState<string | null>(null);

  const load = async () => {
    if (!profile) return;
    setLoading(true);
    const [r, s] = await Promise.all([
      supabase.from("auto_reply_rules").select("*").eq("user_id", profile.id).order("priority", { ascending: false }),
      supabase.from("sessions").select("id, session_name").eq("user_id", profile.id),
    ]);
    setRules((r.data as Rule[]) || []);
    setSessions((s.data as Session[]) || []);
    try {
      setGatewaySessions(await backendApi.listSessions());
      setGatewayError(null);
    } catch (error: any) {
      setGatewaySessions([]);
      setGatewayError(error?.message || "Gateway not reachable");
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [profile]);

  const openNew = () => {
    setEditing(empty);
    setKeywordsText("");
    setOpen(true);
  };
  const openEdit = (r: Rule) => {
    setEditing(r);
    setKeywordsText(r.keywords.join(", "));
    setOpen(true);
  };

  const save = async () => {
    if (!profile) return;
    if (!editing.rule_name || !editing.reply_template || !keywordsText.trim()) {
      toast.error("Rule name, keywords, and reply are required");
      return;
    }
    const keywords = parseKeywords(keywordsText);
    const rawImageUrl = (editing.image_url || "").trim();
    if (rawImageUrl && !/^https?:\/\//i.test(rawImageUrl)) {
      toast.error("Image URL must start with http:// or https://");
      return;
    }
    const payload = {
      rule_name: editing.rule_name!,
      keywords,
      match_type: editing.match_type || "contains",
      reply_template: editing.reply_template!,
      is_active: editing.is_active ?? true,
      priority: Number(editing.priority) || 0,
      session_id: editing.session_id || null,
      category: editing.category || null,
      description: editing.description || null,
      image_url: rawImageUrl || null,
      user_id: profile.id,
    };

    const { error } = editing.id
      ? await supabase.from("auto_reply_rules").update(payload).eq("id", editing.id)
      : await supabase.from("auto_reply_rules").insert(payload);

    if (error) { toast.error(friendlyError(error)); return; }
    toast.success(editing.id ? "Rule updated" : "Rule created");
    setOpen(false);
    load();
  };

  const setReplyMode = async (mode: "ai_agent" | "auto_reply" | "none") => {
    if (!profile) return;
    await supabase
      .from("business_profiles")
      .upsert({
        user_id: profile.id,
        active_reply_mode: mode,
        ai_enabled: mode === "ai_agent",
      }, { onConflict: "user_id" });
  };

  const disableAIIfOn = async () => {
    if (!profile) return;
    const { data: biz } = await supabase
      .from("business_profiles")
      .select("ai_enabled, active_reply_mode")
      .eq("user_id", profile.id)
      .maybeSingle();
    if (biz?.ai_enabled || biz?.active_reply_mode === "ai_agent") {
      await supabase
        .from("business_profiles")
        .update({ ai_enabled: false, active_reply_mode: "auto_reply" })
        .eq("user_id", profile.id);
      toast.info("AI Agent has been turned off. Auto-Reply is now active.");
    }
  };

  const toggleActive = async (r: Rule) => {
    if (!r.is_active) await disableAIIfOn();
    const { error } = await supabase.from("auto_reply_rules").update({ is_active: !r.is_active }).eq("id", r.id);
    if (error) { toast.error(friendlyError(error)); return; }
    // Sync mode
    const { data: remaining } = await supabase
      .from("auto_reply_rules")
      .select("id")
      .eq("user_id", profile!.id)
      .eq("is_active", true)
      .limit(1);
    await setReplyMode((remaining && remaining.length > 0) ? "auto_reply" : "none");
    load();
  };

  const allActive = rules.length > 0 && rules.every((r) => r.is_active);
  const anyActive = rules.some((r) => r.is_active);

  const toggleAll = async (turnOn: boolean) => {
    if (!profile || rules.length === 0) {
      toast.error("Create a rule first");
      return;
    }
    if (turnOn) await disableAIIfOn();
    const { error } = await supabase
      .from("auto_reply_rules")
      .update({ is_active: turnOn })
      .eq("user_id", profile.id);
    if (error) { toast.error(friendlyError(error)); return; }
    await setReplyMode(turnOn ? "auto_reply" : "none");
    toast.success(turnOn ? "All auto-replies turned ON" : "All auto-replies turned OFF");
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this rule?")) return;
    const { error } = await supabase.from("auto_reply_rules").delete().eq("id", id);
    if (error) toast.error(friendlyError(error)); else { toast.success("Deleted"); load(); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Auto-Reply Rules</h1>
          <p className="text-sm text-muted-foreground">Set keywords to automatically reply to incoming WhatsApp messages</p>
        </div>
        <Button onClick={openNew} className="bg-primary text-primary-foreground hover:bg-primary-hover">
          <Plus className="h-4 w-4 mr-1.5" /> New Rule
        </Button>
      </div>

      <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${anyActive ? "border-green-500/40 bg-green-500/10" : "border-border bg-card"}`}>
        <Power className={`h-5 w-5 ${anyActive ? "text-green-500" : "text-muted-foreground"}`} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold">{anyActive ? "Auto-Replies are ON" : "Auto-Replies are OFF"}</p>
          <p className="text-xs text-muted-foreground">
            {rules.length === 0
              ? "Create a rule to enable auto-replies"
              : anyActive
                ? `${rules.filter(r => r.is_active).length} of ${rules.length} rules active`
                : "Toggle on to enable all rules"}
          </p>
        </div>
        <Switch checked={allActive} onCheckedChange={(v) => toggleAll(v)} disabled={rules.length === 0} />
      </div>

      {loading ? (
        <div className="grid gap-3">{[1, 2].map((i) => <div key={i} className="h-24 rounded-xl border border-border bg-card animate-pulse" />)}</div>
      ) : rules.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <MessageSquareText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold">No Auto-Reply Rules Yet</h3>
          <p className="text-sm text-muted-foreground mt-1">Create your first rule to start auto-replying to WhatsApp messages.</p>
          <Button onClick={openNew} className="mt-4 bg-primary text-primary-foreground hover:bg-primary-hover">
            <Plus className="h-4 w-4 mr-1.5" /> Create Rule
          </Button>
        </div>
      ) : (
        <div className="grid gap-3">
          {rules.map((r) => (
            <div key={r.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold">{r.rule_name}</h3>
                    {r.is_active ? (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-green-500/15 text-green-500 font-medium">● Active</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground">● Paused</span>
                    )}
                    <span className="px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground capitalize">{r.match_type}</span>
                    {r.category && <span className="px-2 py-0.5 rounded-full text-xs bg-accent text-accent-foreground">{r.category}</span>}
                    <span className="px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground">{r.session_id ? (sessions.find(s=>s.id===r.session_id)?.session_name || "Session") : "All sessions"}</span>
                    <span className="text-xs text-muted-foreground">Matched: {r.match_count}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {r.keywords.map((k, i) => (
                      <span key={i} className="px-2 py-0.5 rounded text-xs bg-primary/10 text-primary">{k}</span>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2"><b>Reply:</b> {r.reply_template}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button variant="outline" size="sm" onClick={() => toggleActive(r)}>
                    <Power className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => openEdit(r)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => remove(r.id)} className="text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing.id ? "Edit Rule" : "New Auto-Reply Rule"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Rule Name</Label>
              <Input value={editing.rule_name || ""} onChange={(e) => setEditing({ ...editing, rule_name: e.target.value })} placeholder="e.g. Greeting Reply" />
            </div>
            <div>
              <Label>Keywords (comma-separated)</Label>
              <Input value={keywordsText} onChange={(e) => setKeywordsText(e.target.value)} placeholder="hi hello hey salam" />
              <p className="text-xs text-muted-foreground mt-1">Case-insensitive. Matches based on Match Type below.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Match Type</Label>
                <Select value={editing.match_type || "contains"} onValueChange={(v) => setEditing({ ...editing, match_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contains">Contains</SelectItem>
                    <SelectItem value="exact">Exact match</SelectItem>
                    <SelectItem value="starts_with">Starts with</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Input type="number" value={editing.priority ?? 0} onChange={(e) => setEditing({ ...editing, priority: Number(e.target.value) })} />
              </div>
            </div>
            <div>
              <Label>Apply To Session</Label>
              <Select
                value={editing.session_id || "all"}
                onValueChange={(v) => setEditing({ ...editing, session_id: v === "all" ? null : v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All my sessions</SelectItem>
                  {sessions.map((s) => <SelectItem key={s.id} value={s.id}>{s.session_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Business Category</Label>
                <Input value={editing.category || ""} onChange={(e) => setEditing({ ...editing, category: e.target.value })} placeholder="e.g. Restaurant, Shop, Clinic" />
              </div>
              <div>
                <Label>Internal Note</Label>
                <Input value={editing.description || ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} placeholder="Optional description" />
              </div>
            </div>
            <div>
              <Label>Reply Message</Label>
              <Textarea rows={4} value={editing.reply_template || ""} onChange={(e) => setEditing({ ...editing, reply_template: e.target.value })} placeholder="Hi! Thanks for messaging. We'll get back to you soon." />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={editing.is_active ?? true} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} className="bg-primary text-primary-foreground hover:bg-primary-hover">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AutoReplies;
