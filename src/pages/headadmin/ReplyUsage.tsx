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
import { RefreshCw, Pencil, RotateCcw } from "lucide-react";

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
}

export default function ReplyUsage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [edit, setEdit] = useState<Row | null>(null);
  const [tokens, setTokens] = useState("");
  const [quota, setQuota] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("headadmin_list_user_usage");
    if (error) toast.error(error.message);
    setRows((data || []) as Row[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

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
    if (!confirm(`Reset usage counter for ${r.email}?`)) return;
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

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Reply Usage</h1>
          <p className="text-sm text-muted-foreground">Monthly AI reply quota per user (5k / 10k / 20k by plan)</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      <Card className="p-3">
        <Input placeholder="Search by email or name…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </Card>

      <Card className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Usage</TableHead>
              <TableHead>Max tokens</TableHead>
              <TableHead>Period ends</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && <TableRow><TableCell colSpan={6} className="text-center py-8">Loading…</TableCell></TableRow>}
            {!loading && filtered.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No users</TableCell></TableRow>}
            {filtered.map((r) => {
              const pct = r.reply_quota > 0 ? Math.min(100, Math.round((r.replies_used / r.reply_quota) * 100)) : 0;
              return (
                <TableRow key={r.user_id}>
                  <TableCell>
                    <div className="font-medium">{r.full_name || "—"}</div>
                    <div className="text-xs text-muted-foreground">{r.email}</div>
                  </TableCell>
                  <TableCell><Badge variant="secondary" className="capitalize">{r.plan}</Badge></TableCell>
                  <TableCell className="min-w-[200px]">
                    <div className="flex items-center gap-2 text-xs mb-1">
                      <span className="font-medium">{r.replies_used.toLocaleString()}</span>
                      <span className="text-muted-foreground">/ {r.reply_quota.toLocaleString()}</span>
                      <span className="ml-auto">{pct}%</span>
                    </div>
                    <Progress value={pct} className="h-1.5" />
                  </TableCell>
                  <TableCell>{r.max_tokens.toLocaleString()}</TableCell>
                  <TableCell className="text-xs">
                    {r.quota_period_end ? new Date(r.quota_period_end).toLocaleDateString() : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(r)} title="Edit"><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => resetUsage(r)} title="Reset usage"><RotateCcw className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

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
              <Label>Max tokens per reply</Label>
              <Input type="number" min={50} max={8000} value={tokens} onChange={(e) => setTokens(e.target.value)} />
              <p className="text-xs text-muted-foreground mt-1">Caps the length of every AI response for this user.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEdit(null)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
