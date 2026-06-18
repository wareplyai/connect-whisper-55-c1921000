import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, KeyRound } from "lucide-react";

type KeyRow = {
  id: string;
  platform: string;
  model: string;
  key_last4: string | null;
  is_active: boolean;
  is_global: boolean;
  is_admin_override: boolean;
  user_id: string | null;
  created_at: string;
};

type Usage = {
  api_key_id: string | null;
  platform: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  total_cost_usd: number;
};

const RANGES = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "365", label: "Last 365 days" },
  { value: "all", label: "All time" },
];

export default function KeyBreakdown() {
  const [keys, setKeys] = useState<KeyRow[]>([]);
  const [usage, setUsage] = useState<Usage[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState("30");

  const load = async () => {
    setLoading(true);
    const sinceIso = days === "all" ? null : new Date(Date.now() - Number(days) * 24 * 3600 * 1000).toISOString();
    let q = supabase
      .from("ai_usage_logs")
      .select("api_key_id,platform,model,prompt_tokens,completion_tokens,total_tokens,total_cost_usd")
      .limit(50000);
    if (sinceIso) q = q.gte("created_at", sinceIso);
    const [{ data: kRows }, { data: uRows }] = await Promise.all([
      supabase.from("ai_api_keys").select("id,platform,model,key_last4,is_active,is_global,is_admin_override,user_id,created_at").order("is_global", { ascending: false }).order("created_at", { ascending: false }),
      q,
    ]);
    setKeys((kRows as KeyRow[]) || []);
    setUsage((uRows as Usage[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [days]);

  const byKey = useMemo(() => {
    const m = new Map<string, { calls: number; prompt: number; completion: number; total: number; cost: number }>();
    const legacy = { calls: 0, prompt: 0, completion: 0, total: 0, cost: 0 };
    for (const r of usage) {
      const entry = r.api_key_id ? (m.get(r.api_key_id) || { calls: 0, prompt: 0, completion: 0, total: 0, cost: 0 }) : legacy;
      entry.calls += 1;
      entry.prompt += r.prompt_tokens || 0;
      entry.completion += r.completion_tokens || 0;
      entry.total += r.total_tokens || 0;
      entry.cost += Number(r.total_cost_usd || 0);
      if (r.api_key_id) m.set(r.api_key_id, entry);
    }
    return { perKey: m, legacy };
  }, [usage]);

  const rows = useMemo(() => {
    return keys.map(k => {
      const u = byKey.perKey.get(k.id) || { calls: 0, prompt: 0, completion: 0, total: 0, cost: 0 };
      const scope = k.is_global ? "global" : k.is_admin_override ? "admin-set for user" : "user";
      return { ...k, scope, ...u };
    }).sort((a, b) => b.cost - a.cost);
  }, [keys, byKey]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2"><KeyRound className="h-6 w-6 text-primary" /> API Key Breakdown</h1>
          <p className="text-sm text-muted-foreground">
            Per-key totals: input/output tokens, calls and estimated cost. Includes all keys (global, admin-set, user).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>{RANGES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      <Card className="p-5">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Key</TableHead>
            <TableHead>Platform</TableHead>
            <TableHead>Model</TableHead>
            <TableHead>Scope</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Calls</TableHead>
            <TableHead className="text-right">Input</TableHead>
            <TableHead className="text-right">Output</TableHead>
            <TableHead className="text-right">Total tokens</TableHead>
            <TableHead className="text-right">Cost (USD)</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {rows.length === 0 && <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-6">No keys found.</TableCell></TableRow>}
            {rows.map(r => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs">••••{r.key_last4 || "----"}</TableCell>
                <TableCell><Badge variant="outline">{r.platform}</Badge></TableCell>
                <TableCell className="font-mono text-xs">{r.model}</TableCell>
                <TableCell>
                  {r.scope === "global"
                    ? <Badge className="bg-primary/15 text-primary">global</Badge>
                    : r.scope === "admin-set for user"
                      ? <Badge className="bg-amber-500/15 text-amber-500">admin-set</Badge>
                      : <Badge variant="outline">user</Badge>}
                </TableCell>
                <TableCell>{r.is_active ? <Badge className="bg-emerald-500/15 text-emerald-500">active</Badge> : <Badge variant="outline">inactive</Badge>}</TableCell>
                <TableCell className="text-right">{r.calls}</TableCell>
                <TableCell className="text-right">{r.prompt.toLocaleString()}</TableCell>
                <TableCell className="text-right">{r.completion.toLocaleString()}</TableCell>
                <TableCell className="text-right">{r.total.toLocaleString()}</TableCell>
                <TableCell className="text-right font-medium">${r.cost.toFixed(4)}</TableCell>
              </TableRow>
            ))}
            {(byKey.legacy.calls > 0) && (
              <TableRow className="opacity-70">
                <TableCell className="text-xs italic">legacy (no key id)</TableCell>
                <TableCell colSpan={4} className="text-xs text-muted-foreground">Usage logged before per-key tracking was enabled.</TableCell>
                <TableCell className="text-right">{byKey.legacy.calls}</TableCell>
                <TableCell className="text-right">{byKey.legacy.prompt.toLocaleString()}</TableCell>
                <TableCell className="text-right">{byKey.legacy.completion.toLocaleString()}</TableCell>
                <TableCell className="text-right">{byKey.legacy.total.toLocaleString()}</TableCell>
                <TableCell className="text-right font-medium">${byKey.legacy.cost.toFixed(4)}</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
