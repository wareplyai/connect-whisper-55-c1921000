import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { RefreshCw, Pencil, RotateCcw, BarChart3, DollarSign, Cpu, Users, Trash2, Gauge } from "lucide-react";

interface TaskBreakdownItem {
  task_type: string;
  count: number;
  total_tokens: number;
  total_cost_usd: number;
}

interface Row {
  user_id: string;
  email: string | null;
  full_name: string | null;
  plan: string;
  reply_quota: number;
  replies_used: number;
  remaining: number;
  quota_period_start: string | null;
  quota_period_end: string | null;
  max_tokens: number;
  tokens_used: number;
  prompt_tokens_total: number;
  completion_tokens_total: number;
  total_cost_usd: number;
  reply_count: number;
  last_used_at: string | null;
  task_breakdown: TaskBreakdownItem[] | null;
  global_task_breakdown: TaskBreakdownItem[] | null;
}

interface Totals {
  total_cost_usd: number;
  total_tokens: number;
  total_replies: number;
  active_users: number;
  active_platform: string | null;
  active_model: string | null;
  active_scope: string | null;
}

interface Detail {
  id: string;
  created_at: string;
  session_id: string | null;
  session_phone: string | null;
  from_number: string | null;
  platform: string;
  model: string;
  key_scope: string | null;
  task_type: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  total_cost_usd: number;
}

const TASK_LABELS: Record<string, { label: string; desc: string; tone: string }> = {
  text_reply: {
    label: "Text reply",
    desc: "Customer-er text question-er AI reply (main chat completion).",
    tone: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  },
  image_describe: {
    label: "Image describe",
    desc: "Customer-er pathano photo OpenAI vision diye describe kora (keywords).",
    tone: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  },
  vision_match: {
    label: "Vision match",
    desc: "Customer-er image-ke catalog product image-er sathe vision diye match kora.",
    tone: "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
  },
  image_extract: {
    label: "Image extract",
    desc: "Image theke product name / order number extract kora (vision JSON).",
    tone: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  },
  voice_transcribe: {
    label: "Voice → Text",
    desc: "Customer-er voice note Whisper/Gemini diye Bangla/English text-e transcribe kora (per-second billing).",
    tone: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  },
  product_image_tag: {
    label: "Product image tag",
    desc: "Admin-er upload kora product image-er auto keyword/tag generate (vision low-detail).",
    tone: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  },
};

const taskMeta = (t: string) =>
  TASK_LABELS[t] || { label: t, desc: "", tone: "bg-muted text-foreground" };

const fmtUSD = (n: number) =>
  `$${(Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 6 })}`;

export default function ReplyUsage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [edit, setEdit] = useState<Row | null>(null);
  const [tokens, setTokens] = useState("");
  const [quota, setQuota] = useState("");
  const [detailUser, setDetailUser] = useState<Row | null>(null);
  const [details, setDetails] = useState<Detail[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [limitUser, setLimitUser] = useState<Row | null>(null);
  const [limitTokenCap, setLimitTokenCap] = useState("");
  const [limitCostCap, setLimitCostCap] = useState("");
  const [disabledTasks, setDisabledTasks] = useState<Set<string>>(new Set());
  const [limitCurrent, setLimitCurrent] = useState<{ tokens: number; cost: number } | null>(null);
  const [limitSaving, setLimitSaving] = useState(false);

  const openLimits = async (r: Row) => {
    setLimitUser(r);
    setLimitTokenCap("");
    setLimitCostCap("");
    setDisabledTasks(new Set());
    setLimitCurrent(null);
    const { data } = await supabase
      .from("user_ai_limits" as any)
      .select("monthly_token_cap, monthly_cost_cap_usd, disabled_tasks")
      .eq("user_id", r.user_id)
      .maybeSingle();
    if (data) {
      setLimitTokenCap(String((data as any).monthly_token_cap || ""));
      setLimitCostCap(String((data as any).monthly_cost_cap_usd || ""));
      setDisabledTasks(new Set(((data as any).disabled_tasks || []) as string[]));
    }
    // Show current month spend
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    const { data: usage } = await supabase
      .from("ai_usage_logs")
      .select("total_tokens, total_cost_usd")
      .eq("user_id", r.user_id)
      .gte("created_at", monthStart.toISOString());
    const tokens = (usage || []).reduce((s: number, u: any) => s + Number(u.total_tokens || 0), 0);
    const cost = (usage || []).reduce((s: number, u: any) => s + Number(u.total_cost_usd || 0), 0);
    setLimitCurrent({ tokens, cost });
  };

  const toggleTask = (task: string) => {
    setDisabledTasks((prev) => {
      const next = new Set(prev);
      if (next.has(task)) next.delete(task);
      else next.add(task);
      return next;
    });
  };

  const saveLimits = async () => {
    if (!limitUser) return;
    setLimitSaving(true);
    const payload = {
      user_id: limitUser.user_id,
      monthly_token_cap: Math.max(0, Number(limitTokenCap) || 0),
      monthly_cost_cap_usd: Math.max(0, Number(limitCostCap) || 0),
      disabled_tasks: Array.from(disabledTasks),
    };
    const { error } = await supabase
      .from("user_ai_limits" as any)
      .upsert(payload as any, { onConflict: "user_id" });
    setLimitSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("AI limits saved");
    setLimitUser(null);
  };

  const clearLimits = async () => {
    if (!limitUser) return;
    if (!confirm("Remove all AI limits for this user?")) return;
    const { error } = await supabase.from("user_ai_limits" as any).delete().eq("user_id", limitUser.user_id);
    if (error) { toast.error(error.message); return; }
    toast.success("AI limits cleared");
    setLimitUser(null);
  };

  const load = async () => {
    setLoading(true);
    const [{ data, error }, { data: t }] = await Promise.all([
      supabase.rpc("headadmin_list_user_usage"),
      supabase.rpc("headadmin_usage_totals"),
    ]);
    if (error) toast.error(error.message);
    setRows((data || []) as unknown as Row[]);
    if (Array.isArray(t) && t[0]) setTotals(t[0] as Totals);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel("headadmin-reply-usage")
      .on("postgres_changes", { event: "*", schema: "public", table: "subscriptions" }, () => load())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "ai_usage_logs" }, () => load())
      .subscribe();
    const t = setInterval(load, 15_000);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(t);
    };
  }, []);

  const openDetails = async (r: Row) => {
    setDetailUser(r);
    setDetailLoading(true);
    setDetails([]);
    const { data, error } = await supabase.rpc("headadmin_user_usage_detail", {
      _user_id: r.user_id,
      _limit: 200,
    });
    if (error) toast.error(error.message);
    setDetails((data || []) as Detail[]);
    setDetailLoading(false);
  };

  const filtered = rows.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (r.email || "").toLowerCase().includes(q) || (r.full_name || "").toLowerCase().includes(q);
  });

  const openEdit = (r: Row) => {
    setEdit(r);
    setTokens(String(r.max_tokens || ""));
    setQuota(String(r.reply_quota || ""));
  };

  const save = async () => {
    if (!edit) return;
    const patch: any = {};
    const t = Number(tokens);
    const q = Number(quota);
    if (Number.isFinite(t) && t > 0) patch.max_tokens = t;
    if (Number.isFinite(q) && q >= 0) patch.reply_quota = q;
    const { data: sub } = await supabase
      .from("subscriptions").select("id")
      .eq("user_id", edit.user_id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!sub) { toast.error("No subscription for this user"); return; }
    const { error } = await supabase.from("subscriptions").update(patch).eq("id", sub.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Updated");
    setEdit(null);
    load();
  };

  const resetUsage = async (r: Row) => {
    if (!confirm(`Reset reply counter for ${r.email}?`)) return;
    const { data: sub } = await supabase
      .from("subscriptions").select("id")
      .eq("user_id", r.user_id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!sub) return;
    const now = new Date();
    const end = new Date(now.getTime() + 30 * 86400 * 1000);
    const { error } = await supabase.from("subscriptions").update({
      replies_used: 0,
      quota_period_start: now.toISOString(),
      quota_period_end: end.toISOString(),
    }).eq("id", sub.id);
    if (error) toast.error(error.message); else { toast.success("Usage reset"); load(); }
  };

  const purgeUser = async (r: Row) => {
    if (!confirm(`⚠️ Delete ALL token usage history & cost for ${r.email}?\n\nThis will:\n• Erase every AI reply log\n• Reset replies used to 0\n• Start the user fresh\n\nThis cannot be undone.`)) return;
    const { error } = await supabase.rpc("headadmin_purge_user_usage", { _user_id: r.user_id });
    if (error) { toast.error(error.message); return; }
    toast.success("User usage fully wiped — fresh start");
    load();
  };


  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Reply Usage & Cost</h1>
          <p className="text-sm text-muted-foreground">Real-time OpenAI/Gemini token usage and USD cost per user</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* Totals strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><DollarSign className="h-3.5 w-3.5" /> Total cost</div>
          <div className="text-xl font-bold tabular-nums">{fmtUSD(totals?.total_cost_usd || 0)}</div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><BarChart3 className="h-3.5 w-3.5" /> Total tokens</div>
          <div className="text-xl font-bold tabular-nums">{Number(totals?.total_tokens || 0).toLocaleString()}</div>
        </Card>
        <Card
          className="p-3"
          title={`Active users: ${Number(totals?.active_users || 0)} (users who have used at least 1 reply)\nReplies used: ${Number(totals?.total_replies || 0)} (total replies consumed by those users)`}
        >
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5" /> Active users · Replies used
          </div>
          <div className="text-xl font-bold tabular-nums">
            {Number(totals?.active_users || 0)} <span className="text-muted-foreground font-normal">·</span> {Number(totals?.total_replies || 0)}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            {Number(totals?.active_users || 0)} user(s) used {Number(totals?.total_replies || 0)} reply(s)
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><Cpu className="h-3.5 w-3.5" /> Global key model</div>
          <div className="text-sm font-semibold truncate">
            {totals?.active_platform ? `${totals.active_platform} · ${totals.active_model || "default"}` : "— not set —"}
          </div>
        </Card>
      </div>

      <Card className="p-3">
        <Input placeholder="Search by email or name…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </Card>

      <VoiceTranscribeDebug rows={rows} />



      <Card className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Replies (used / quota)</TableHead>
              <TableHead className="min-w-[220px]">AI tasks used (global key)</TableHead>
              <TableHead className="text-right">Input tok</TableHead>
              <TableHead className="text-right">Output tok</TableHead>
              <TableHead className="text-right">Total tok</TableHead>
              <TableHead className="text-right">Cost (USD)</TableHead>
              <TableHead>Max / reply</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && <TableRow><TableCell colSpan={10} className="text-center py-8">Loading…</TableCell></TableRow>}
            {!loading && filtered.length === 0 && <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">No users</TableCell></TableRow>}
            {filtered.map((r) => {
              const pct = r.reply_quota > 0 ? Math.min(100, Math.round((r.replies_used / r.reply_quota) * 100)) : 0;
              const totalTok = Number(r.prompt_tokens_total || 0) + Number(r.completion_tokens_total || 0);
              const tasks = Array.isArray(r.task_breakdown) ? r.task_breakdown : [];
              const globalTasks = Array.isArray(r.global_task_breakdown) ? r.global_task_breakdown : [];
              return (
                <TableRow key={r.user_id} className="cursor-pointer hover:bg-muted/40" onClick={() => openDetails(r)}>
                  <TableCell>
                    <div className="font-medium">{r.full_name || "—"}</div>
                    <div className="text-xs text-muted-foreground">{r.email}</div>
                  </TableCell>
                  <TableCell><Badge variant="secondary" className="capitalize">{r.plan}</Badge></TableCell>
                  <TableCell className="min-w-[180px]">
                    <div className="flex items-center gap-2 text-xs mb-1">
                      <span className="font-medium">{r.replies_used.toLocaleString()}</span>
                      <span className="text-muted-foreground">/ {r.reply_quota.toLocaleString()}</span>
                      <span className="ml-auto">{pct}%</span>
                    </div>
                    <Progress value={pct} className="h-1.5" />
                  </TableCell>
                  <TableCell className="min-w-[220px]">
                    {tasks.length === 0 ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {tasks.map((tb) => {
                          const meta = taskMeta(tb.task_type);
                          const gTok = globalTasks.find((g) => g.task_type === tb.task_type)?.total_tokens || 0;
                          return (
                            <span
                              key={tb.task_type}
                              className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${meta.tone}`}
                              title={`${meta.label} — ${meta.desc}\nCalls: ${tb.count}\nTokens: ${Number(tb.total_tokens || 0).toLocaleString()}${gTok ? ` (global key: ${gTok.toLocaleString()})` : ""}\nCost: ${fmtUSD(tb.total_cost_usd)}`}
                            >
                              {meta.label}
                              <span className="opacity-70">·{tb.count}</span>
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-xs">{Number(r.prompt_tokens_total || 0).toLocaleString()}</TableCell>
                  <TableCell className="text-right tabular-nums text-xs">{Number(r.completion_tokens_total || 0).toLocaleString()}</TableCell>
                  <TableCell className="text-right tabular-nums font-medium">{totalTok.toLocaleString()}</TableCell>
                  <TableCell className="text-right tabular-nums font-semibold text-emerald-600">{fmtUSD(r.total_cost_usd)}</TableCell>
                  <TableCell className="text-xs">{r.max_tokens.toLocaleString()}</TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(r)} title="Edit reply quota / max tokens"><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => openLimits(r)} title="Set AI limits (token cap, cost cap, disable tasks)"><Gauge className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => resetUsage(r)} title="Reset reply counter"><RotateCcw className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => purgeUser(r)} title="Delete ALL usage & cost history (fresh start)" className="text-destructive hover:text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>

                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {/* Edit dialog */}
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit limits — {edit?.email}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Reply quota (per month)</Label>
              <Input type="number" min={0} value={quota} onChange={(e) => setQuota(e.target.value)} />
              <p className="text-xs text-muted-foreground mt-1">Overrides plan default. Set 0 to disable AI replies.</p>
            </div>
            <div>
              <Label>Max tokens per reply (TOTAL budget: input + output)</Label>
              <Input type="number" min={150} max={8000} value={tokens} onChange={(e) => setTokens(e.target.value)} />
              <p className="text-xs text-muted-foreground mt-1">
                Hard cap on combined prompt + completion tokens for one reply. If the system prompt + chat history exceeds the budget, the oldest history turns and extra context are trimmed automatically so total usage stays within this limit. Min 150, max 8000.
              </p>
            </div>

          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEdit(null)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail dialog */}
      <Dialog open={!!detailUser} onOpenChange={(o) => !o && setDetailUser(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Usage detail — {detailUser?.full_name || detailUser?.email}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <Card className="p-2">
                <div className="text-[11px] text-muted-foreground">Replies</div>
                <div className="font-bold tabular-nums">{Number(detailUser?.reply_count || 0).toLocaleString()}</div>
              </Card>
              <Card className="p-2">
                <div className="text-[11px] text-muted-foreground">Total tokens</div>
                <div className="font-bold tabular-nums">
                  {(Number(detailUser?.prompt_tokens_total || 0) + Number(detailUser?.completion_tokens_total || 0)).toLocaleString()}
                </div>
              </Card>
              <Card className="p-2">
                <div className="text-[11px] text-muted-foreground">Total cost</div>
                <div className="font-bold text-emerald-600 tabular-nums">{fmtUSD(detailUser?.total_cost_usd || 0)}</div>
              </Card>
            </div>

            {/* Per-task breakdown for this user */}
            {Array.isArray(detailUser?.task_breakdown) && (detailUser?.task_breakdown?.length || 0) > 0 && (
              <div>
                <div className="text-xs font-semibold text-muted-foreground mb-2">
                  AI tasks the user-admin spent tokens on
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(detailUser?.task_breakdown || []).map((tb) => {
                    const meta = taskMeta(tb.task_type);
                    const gTok = (detailUser?.global_task_breakdown || []).find((g) => g.task_type === tb.task_type)?.total_tokens || 0;
                    return (
                      <Card key={tb.task_type} className="p-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium ${meta.tone}`}>
                            {meta.label}
                          </span>
                          <span className="text-[11px] text-muted-foreground tabular-nums">
                            {tb.count} calls · {Number(tb.total_tokens || 0).toLocaleString()} tok
                          </span>
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-1">{meta.desc}</div>
                        <div className="flex items-center justify-between gap-2 mt-1">
                          <span className="text-[10px] text-muted-foreground">
                            Global-key tokens: <span className="tabular-nums font-medium">{Number(gTok).toLocaleString()}</span>
                          </span>
                          <span className="text-[11px] font-semibold text-emerald-600 tabular-nums">{fmtUSD(tb.total_cost_usd)}</span>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">When</TableHead>
                    <TableHead className="text-xs">Task</TableHead>
                    <TableHead className="text-xs">From (customer)</TableHead>
                    <TableHead className="text-xs">Session #</TableHead>
                    <TableHead className="text-xs">Model</TableHead>
                    <TableHead className="text-xs">Scope</TableHead>
                    <TableHead className="text-right text-xs">In</TableHead>
                    <TableHead className="text-right text-xs">Out</TableHead>
                    <TableHead className="text-right text-xs">Total</TableHead>
                    <TableHead className="text-right text-xs">Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detailLoading && <TableRow><TableCell colSpan={10} className="text-center py-6">Loading…</TableCell></TableRow>}
                  {!detailLoading && details.length === 0 && (
                    <TableRow><TableCell colSpan={10} className="text-center py-6 text-muted-foreground text-xs">No AI replies yet</TableCell></TableRow>
                  )}
                  {details.map((d) => {
                    const meta = taskMeta(d.task_type || "text_reply");
                    return (
                      <TableRow key={d.id}>
                        <TableCell className="text-xs whitespace-nowrap">{new Date(d.created_at).toLocaleString()}</TableCell>
                        <TableCell className="text-xs">
                          <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium ${meta.tone}`} title={meta.desc}>
                            {meta.label}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs">{d.from_number || "—"}</TableCell>
                        <TableCell className="text-xs">{d.session_phone || "—"}</TableCell>
                        <TableCell className="text-xs">{d.platform}/{d.model}</TableCell>
                        <TableCell className="text-xs">
                          <Badge variant={d.key_scope === "global" ? "default" : "secondary"} className="text-[10px]">{d.key_scope || "user"}</Badge>
                        </TableCell>
                        <TableCell className="text-right text-xs tabular-nums">{d.prompt_tokens.toLocaleString()}</TableCell>
                        <TableCell className="text-right text-xs tabular-nums">{d.completion_tokens.toLocaleString()}</TableCell>
                        <TableCell className="text-right text-xs tabular-nums font-medium">{d.total_tokens.toLocaleString()}</TableCell>
                        <TableCell className="text-right text-xs tabular-nums font-semibold text-emerald-600">{fmtUSD(d.total_cost_usd)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// Voice Transcribe Debug Panel
// Shows the exact ai_usage_logs filters used + latest voice_transcribe
// insert per user, with status badges so we can confirm logging works.
// ============================================================
interface VoiceRow {
  id: string;
  user_id: string;
  created_at: string;
  model: string;
  platform: string;
  key_scope: string | null;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  input_cost_usd: number | null;
  total_cost_usd: number | null;
  session_id: string | null;
  from_number: string | null;
}

function VoiceTranscribeDebug({ rows }: { rows: Row[] }) {
  const [voiceLogs, setVoiceLogs] = useState<VoiceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState<number | null>(null);

  const fetchVoice = async () => {
    setLoading(true);
    const { data, error, count } = await supabase
      .from("ai_usage_logs")
      .select(
        "id,user_id,created_at,model,platform,key_scope,prompt_tokens,completion_tokens,total_tokens,input_cost_usd,total_cost_usd,session_id,from_number",
        { count: "exact" }
      )
      .eq("task_type", "voice_transcribe")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) toast.error(error.message);
    setVoiceLogs((data || []) as VoiceRow[]);
    setTotalCount(count ?? null);
    setLoading(false);
  };

  useEffect(() => {
    fetchVoice();
    const ch = supabase
      .channel("voice-debug")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ai_usage_logs", filter: "task_type=eq.voice_transcribe" },
        () => fetchVoice()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  // Latest log per user
  const latestByUser = new Map<string, VoiceRow>();
  for (const v of voiceLogs) {
    if (!latestByUser.has(v.user_id)) latestByUser.set(v.user_id, v);
  }

  const userMeta = (uid: string) => rows.find((r) => r.user_id === uid);

  return (
    <Card className="p-4 border-emerald-500/30 bg-emerald-500/5">
      <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
        <div>
          <div className="flex items-center gap-2">
            <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white">Voice Transcribe Debug</Badge>
            <span className="text-xs text-muted-foreground">
              Live `ai_usage_logs` rows where <code className="px-1 rounded bg-muted text-foreground">task_type = 'voice_transcribe'</code>
            </span>
          </div>
          <div className="text-[11px] text-muted-foreground mt-1 font-mono">
            SELECT … FROM ai_usage_logs WHERE task_type = 'voice_transcribe' ORDER BY created_at DESC LIMIT 50
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="tabular-nums">
            Total rows: {totalCount ?? "…"}
          </Badge>
          <Badge variant="outline" className="tabular-nums">
            Users with voice: {latestByUser.size}
          </Badge>
          <Button variant="outline" size="sm" onClick={fetchVoice} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? "animate-spin" : ""}`} /> Reload
          </Button>
        </div>
      </div>

      {loading && voiceLogs.length === 0 && (
        <div className="text-center text-sm text-muted-foreground py-6">Loading voice logs…</div>
      )}

      {!loading && voiceLogs.length === 0 && (
        <div className="rounded border border-dashed p-4 text-center text-sm text-muted-foreground">
          <div className="font-medium text-foreground mb-1">⚠ No voice_transcribe rows yet</div>
          <div className="text-xs">
            Code wired ase, but kono customer ekhono voice note pathayni. WhatsApp/Messenger e ekta voice
            message ashlei <code className="px-1 rounded bg-muted text-foreground">ai-reply</code> function ekhane row insert korbe.
          </div>
        </div>
      )}

      {latestByUser.size > 0 && (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Last voice insert</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead className="text-right">Tokens</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from(latestByUser.entries()).map(([uid, v]) => {
                const u = userMeta(uid);
                const cost = Number(v.total_cost_usd || v.input_cost_usd || 0);
                const isWhisper = /whisper/i.test(v.model);
                const tokenBased = v.total_tokens > 0;
                let statusLabel = "Logged";
                let statusTone = "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300";
                if (isWhisper && !tokenBased) {
                  statusLabel = "Whisper (per-sec)";
                  statusTone = "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300";
                } else if (tokenBased) {
                  statusLabel = "Gemini (token)";
                  statusTone = "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300";
                }
                return (
                  <TableRow key={v.id}>
                    <TableCell>
                      <div className="font-medium text-sm">{u?.full_name || "—"}</div>
                      <div className="text-[11px] text-muted-foreground">{u?.email || uid.slice(0, 8)}</div>
                    </TableCell>
                    <TableCell className="text-xs tabular-nums">
                      {new Date(v.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-xs">
                      <span className="font-mono">{v.platform}/{v.model}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={v.key_scope === "global" ? "default" : "secondary"} className="text-[10px]">
                        {v.key_scope || "user"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-xs">
                      {tokenBased ? Number(v.total_tokens).toLocaleString() : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-xs font-semibold text-emerald-600">
                      {fmtUSD(cost)}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${statusTone}`}>
                        {statusLabel}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
}

