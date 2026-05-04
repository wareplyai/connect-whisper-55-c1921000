import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { BarChart, Bar, Line, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

export default function Revenue() {
  const [sales, setSales] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [profilesPlans, setProfilesPlans] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const [{ data: s }, { data: p }] = await Promise.all([
        supabase.from("sales").select("*").order("created_at", { ascending: false }),
        supabase.from("profiles").select("id,full_name,email,plan"),
      ]);
      const pm: Record<string, any> = {};
      p?.forEach((u: any) => pm[u.id] = u);
      setProfiles(pm); setProfilesPlans(p || []); setSales(s || []);
    })();
  }, []);

  const total = sales.reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const now = new Date();
  const thisMonth = sales.filter((r) => new Date(r.created_at).getMonth() === now.getMonth() && new Date(r.created_at).getFullYear() === now.getFullYear());
  const lastMonthDate = new Date(now); lastMonthDate.setMonth(now.getMonth() - 1);
  const lastMonth = sales.filter((r) => new Date(r.created_at).getMonth() === lastMonthDate.getMonth() && new Date(r.created_at).getFullYear() === lastMonthDate.getFullYear());
  const thisRev = thisMonth.reduce((s, r) => s + Number(r.amount || 0), 0);
  const lastRev = lastMonth.reduce((s, r) => s + Number(r.amount || 0), 0);
  const mrr = thisRev;

  const planMap: Record<string, { count: number; amount: number }> = {};
  sales.forEach((r) => {
    if (!planMap[r.plan]) planMap[r.plan] = { count: 0, amount: 0 };
    planMap[r.plan].count++; planMap[r.plan].amount += Number(r.amount || 0);
  });
  const planRows = Object.entries(planMap).map(([plan, v]) => ({ plan, ...v, pct: total ? ((v.amount / total) * 100).toFixed(1) : "0" }));

  // last 12 months chart
  const monthsData: any[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    const key = d.toISOString().slice(0, 7);
    const inMonth = sales.filter((r) => r.created_at?.slice(0, 7) === key);
    monthsData.push({
      month: d.toLocaleString("en", { month: "short" }),
      revenue: inMonth.reduce((s, r) => s + Number(r.amount || 0), 0),
      subscribers: inMonth.length,
    });
  }

  const exportCSV = () => {
    const rows = [["Date", "User", "Email", "Plan", "Amount", "Status", "Method"]];
    sales.forEach((r) => {
      const u = profiles[r.user_id];
      rows.push([r.created_at, u?.full_name || "", u?.email || "", r.plan, r.amount, r.payment_status, r.payment_method || ""]);
    });
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" }); const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "sales.csv"; a.click();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Revenue & Sales</h1>
        <p className="text-sm text-muted-foreground">Financial overview</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4 bg-card border-border"><p className="text-xs text-muted-foreground">Total Revenue</p><p className="text-2xl font-semibold text-primary">${total.toFixed(2)}</p></Card>
        <Card className="p-4 bg-card border-border"><p className="text-xs text-muted-foreground">This Month</p><p className="text-2xl font-semibold">${thisRev.toFixed(2)}</p></Card>
        <Card className="p-4 bg-card border-border"><p className="text-xs text-muted-foreground">Last Month</p><p className="text-2xl font-semibold">${lastRev.toFixed(2)}</p></Card>
        <Card className="p-4 bg-card border-border"><p className="text-xs text-muted-foreground">MRR</p><p className="text-2xl font-semibold">${mrr.toFixed(2)}</p></Card>
      </div>

      <Card className="p-5 bg-card border-border">
        <h3 className="text-sm font-semibold mb-4">Plan Revenue Breakdown</h3>
        <Table>
          <TableHeader><TableRow><TableHead>Plan</TableHead><TableHead>Subscribers</TableHead><TableHead>Revenue</TableHead><TableHead>% of Total</TableHead></TableRow></TableHeader>
          <TableBody>
            {planRows.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No data</TableCell></TableRow>}
            {planRows.map((r) => (
              <TableRow key={r.plan}>
                <TableCell className="capitalize font-medium">{r.plan}</TableCell>
                <TableCell>{r.count}</TableCell>
                <TableCell>${r.amount.toFixed(2)}</TableCell>
                <TableCell>{r.pct}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Card className="p-5 bg-card border-border">
        <h3 className="text-sm font-semibold mb-4">Revenue — Last 12 Months</h3>
        <div className="h-72">
          <ResponsiveContainer>
            <ComposedChart data={monthsData}>
              <CartesianGrid stroke="#1a1a1a" />
              <XAxis dataKey="month" stroke="#888" fontSize={11} />
              <YAxis yAxisId="l" stroke="#888" fontSize={11} />
              <YAxis yAxisId="r" orientation="right" stroke="#888" fontSize={11} />
              <Tooltip contentStyle={{ background: "#0d0d0d", border: "1px solid #2a2a2a", borderRadius: 8 }} />
              <Legend />
              <Bar yAxisId="l" dataKey="revenue" fill="#25D366" radius={[4, 4, 0, 0]} />
              <Line yAxisId="r" type="monotone" dataKey="subscribers" stroke="#facc15" strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="bg-card border-border">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h3 className="text-sm font-semibold">Sales Transactions</h3>
          <Button variant="outline" size="sm" onClick={exportCSV}><Download className="h-4 w-4" />Export CSV</Button>
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>User</TableHead><TableHead>Email</TableHead><TableHead>Plan</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>Method</TableHead></TableRow></TableHeader>
          <TableBody>
            {sales.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                No sales recorded yet. Sales will appear here when users subscribe via Paddle/LemonSqueezy.
              </TableCell></TableRow>
            )}
            {sales.map((r) => {
              const u = profiles[r.user_id];
              return (
                <TableRow key={r.id}>
                  <TableCell className="text-xs">{new Date(r.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>{u?.full_name || "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{u?.email}</TableCell>
                  <TableCell className="capitalize">{r.plan}</TableCell>
                  <TableCell>${Number(r.amount).toFixed(2)} {r.currency}</TableCell>
                  <TableCell><span className="text-xs px-2 py-0.5 rounded bg-primary/15 text-primary">{r.payment_status}</span></TableCell>
                  <TableCell className="text-xs">{r.payment_method || "—"}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {sales.length === 0 && (
          <div className="p-4 border-t border-border text-xs text-muted-foreground">
            Note: To track revenue, integrate Paddle webhook to insert into <code className="text-primary">sales</code> table.
          </div>
        )}
      </Card>
    </div>
  );
}
