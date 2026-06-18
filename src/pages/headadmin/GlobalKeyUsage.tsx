import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, DollarSign, Cpu, Activity, KeyRound } from "lucide-react";

type Row = {
  id: string;
  created_at: string;
  user_id: string | null;
  platform: string;
  model: string;
  task_type: string | null;
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
];

export default function GlobalKeyUsage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState("30");

  const load = async () => {
    setLoading(true);
    const since = new Date(Date.now() - Number(days) * 24 * 3600 * 1000).toISOString();
    const { data, error } = await supabase
      .from("ai_usage_logs")
      .select("id,created_at,user_id,platform,model,task_type,prompt_tokens,completion_tokens,total_tokens,total_cost_usd")
      .eq("key_scope", "global")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(5000);
    if (!error) setRows((data as Row[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [days]);

  const totals = useMemo(() => {
    const t = { calls: rows.length, prompt: 0, completion: 0, total: 0, cost: 0, users: new Set<string>() };
    for (const r of rows) {
      t.prompt += r.prompt_tokens || 0;
      t.completion += r.completion_tokens || 0;
      t.total += r.total_tokens || 0;
      t.cost += Number(r.total_cost_usd || 0);
      if (r.user_id) t.users.add(r.user_id);
    }
    return t;
  }, [rows]);

  const byModel = useMemo(() => {
    const m = new Map<string, { platform: string; model: string; calls: number; prompt: number; completion: number; total: number; cost: number }>();
    for (const r of rows) {
      const key = `${r.platform}:${r.model}`;
      const cur = m.get(key) || { platform: r.platform, model: r.model, calls: 0, prompt: 0, completion: 0, total: 0, cost: 0 };
      cur.calls += 1;
      cur.prompt += r.prompt_tokens || 0;
      cur.completion += r.completion_tokens || 0;
      cur.total += r.total_tokens || 0;
      cur.cost += Number(r.total_cost_usd || 0);
      m.set(key, cur);
    }
    return [...m.values()].sort((a, b) => b.cost - a.cost);
  }, [rows]);

  const byTask = useMemo(() => {
    const m = new Map<string, { task: string; calls: number; total: number; cost: number }>();
    for (const r of rows) {
      const task = r.task_type || "unknown";
      const cur = m.get(task) || { task, calls: 0, total: 0, cost: 0 };
      cur.calls += 1;
      cur.total += r.total_tokens || 0;
      cur.cost += Number(r.total_cost_usd || 0);
      m.set(task, cur);
    }
    return [...m.values()].sort((a, b) => b.cost - a.cost);
  }, [rows]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2"><KeyRound className="h-6 w-6 text-primary" /> Global Key Usage</h1>
          <p className="text-sm text-muted-foreground">
            Only headadmin-set global API key usage. User-owned keys are excluded.
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

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-5"><div className="text-xs text-muted-foreground flex items-center gap-1.5"><DollarSign className="h-3.5 w-3.5" /> Total cost (USD)</div><div className="text-2xl font-semibold mt-1">${totals.cost.toFixed(4)}</div></Card>
        <Card className="p-5"><div className="text-xs text-muted-foreground flex items-center gap-1.5"><Cpu className="h-3.5 w-3.5" /> Total tokens</div><div className="text-2xl font-semibold mt-1">{totals.total.toLocaleString()}</div><div className="text-[11px] text-muted-foreground mt-1">in {totals.prompt.toLocaleString()} • out {totals.completion.toLocaleString()}</div></Card>
        <Card className="p-5"><div className="text-xs text-muted-foreground flex items-center gap-1.5"><Activity className="h-3.5 w-3.5" /> API calls</div><div className="text-2xl font-semibold mt-1">{totals.calls.toLocaleString()}</div></Card>
        <Card className="p-5"><div className="text-xs text-muted-foreground">Distinct users</div><div className="text-2xl font-semibold mt-1">{totals.users.size}</div></Card>
      </div>

      <Card className="p-5">
        <h3 className="text-sm font-semibold mb-3">By model</h3>
        <Table>
          <TableHeader><TableRow>
            <TableHead>Platform</TableHead><TableHead>Model</TableHead>
            <TableHead className="text-right">Calls</TableHead>
            <TableHead className="text-right">Input tokens</TableHead>
            <TableHead className="text-right">Output tokens</TableHead>
            <TableHead className="text-right">Total tokens</TableHead>
            <TableHead className="text-right">Cost (USD)</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {byModel.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">No global-key usage in this period.</TableCell></TableRow>}
            {byModel.map(m => (
              <TableRow key={`${m.platform}:${m.model}`}>
                <TableCell><Badge variant="outline">{m.platform}</Badge></TableCell>
                <TableCell className="font-mono text-xs">{m.model}</TableCell>
                <TableCell className="text-right">{m.calls}</TableCell>
                <TableCell className="text-right">{m.prompt.toLocaleString()}</TableCell>
                <TableCell className="text-right">{m.completion.toLocaleString()}</TableCell>
                <TableCell className="text-right">{m.total.toLocaleString()}</TableCell>
                <TableCell className="text-right font-medium">${m.cost.toFixed(4)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Card className="p-5">
        <h3 className="text-sm font-semibold mb-3">By task</h3>
        <Table>
          <TableHeader><TableRow>
            <TableHead>Task</TableHead>
            <TableHead className="text-right">Calls</TableHead>
            <TableHead className="text-right">Tokens</TableHead>
            <TableHead className="text-right">Cost (USD)</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {byTask.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No data.</TableCell></TableRow>}
            {byTask.map(t => (
              <TableRow key={t.task}>
                <TableCell className="font-mono text-xs">{t.task}</TableCell>
                <TableCell className="text-right">{t.calls}</TableCell>
                <TableCell className="text-right">{t.total.toLocaleString()}</TableCell>
                <TableCell className="text-right font-medium">${t.cost.toFixed(4)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
