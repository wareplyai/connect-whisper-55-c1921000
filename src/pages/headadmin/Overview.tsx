import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Users, Smartphone, MessageSquare, DollarSign, UserPlus, AlertTriangle, Zap, Send } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const StatCard = ({ icon: Icon, label, value, sub, color = "text-primary" }: any) => (
  <Card className="p-5 bg-card border-border">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-semibold mt-2">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </div>
      <div className={`h-10 w-10 rounded-lg bg-primary/10 grid place-items-center ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
    </div>
  </Card>
);

const PIE_COLORS = ["#25D366", "#22c55e", "#facc15", "#f97316", "#a855f7"];

export default function HeadAdminOverview() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>({});
  const [growth, setGrowth] = useState<any[]>([]);
  const [msgWeek, setMsgWeek] = useState<any[]>([]);
  const [planDist, setPlanDist] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const monthAgo = new Date(); monthAgo.setDate(monthAgo.getDate() - 30);
      const lastMonth = new Date(); lastMonth.setDate(lastMonth.getDate() - 60);
      const dayAgo = new Date(); dayAgo.setHours(dayAgo.getHours() - 24);
      const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);

      const [
        usersAll, usersLastMonth, sessionsConn, msgs, sales,
        newToday, failedToday, activeUsers, msgsToday,
        profilesGrowth, msgsWeek, profilesAll, recent,
      ] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }).lt("created_at", monthAgo.toISOString()),
        supabase.from("sessions").select("id", { count: "exact", head: true }).eq("status", "connected"),
        supabase.from("message_logs").select("id", { count: "exact", head: true }),
        supabase.from("sales").select("amount"),
        supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", today.toISOString()),
        supabase.from("message_logs").select("id", { count: "exact", head: true }).eq("status", "failed").gte("created_at", today.toISOString()),
        supabase.from("sessions").select("id", { count: "exact", head: true }).gte("last_active", dayAgo.toISOString()),
        supabase.from("message_logs").select("id", { count: "exact", head: true }).gte("created_at", today.toISOString()),
        supabase.from("profiles").select("created_at").gte("created_at", monthAgo.toISOString()),
        supabase.from("message_logs").select("created_at").gte("created_at", weekAgo.toISOString()),
        supabase.from("profiles").select("plan"),
        supabase.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(10),
      ]);

      const totalRevenue = (sales.data || []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
      const usersCount = usersAll.count || 0;
      const usersLM = usersLastMonth.count || 0;
      const growthPct = usersLM > 0 ? (((usersCount - usersLM) / usersLM) * 100).toFixed(1) : "—";

      // build daily growth buckets
      const buckets: Record<string, number> = {};
      for (let i = 29; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
        buckets[d.toISOString().slice(0, 10)] = 0;
      }
      (profilesGrowth.data || []).forEach((p: any) => {
        const k = p.created_at?.slice(0, 10);
        if (k in buckets) buckets[k]++;
      });
      setGrowth(Object.entries(buckets).map(([date, count]) => ({ date: date.slice(5), count })));

      const wk: Record<string, number> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
        wk[d.toISOString().slice(0, 10)] = 0;
      }
      (msgsWeek.data || []).forEach((m: any) => {
        const k = m.created_at?.slice(0, 10);
        if (k in wk) wk[k]++;
      });
      setMsgWeek(Object.entries(wk).map(([date, count]) => ({ date: date.slice(5), count })));

      const planMap: Record<string, number> = {};
      (profilesAll.data || []).forEach((p: any) => {
        planMap[p.plan || "free"] = (planMap[p.plan || "free"] || 0) + 1;
      });
      setPlanDist(Object.entries(planMap).map(([name, value]) => ({ name, value })));

      setStats({
        users: usersCount, growthPct,
        active: sessionsConn.count || 0,
        messages: msgs.count || 0,
        revenue: totalRevenue,
        newToday: newToday.count || 0,
        failedToday: failedToday.count || 0,
        activeUsers: activeUsers.count || 0,
        msgsToday: msgsToday.count || 0,
      });
      setActivity(recent.data || []);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-28" />)}
      </div>
    );
  }

  const actionColor = (a: string) => {
    if (a.includes("delete")) return "text-destructive";
    if (a.includes("create")) return "text-primary";
    if (a.includes("edit") || a.includes("update")) return "text-blue-400";
    if (a.includes("login")) return "text-muted-foreground";
    return "text-foreground";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Overview</h1>
        <p className="text-sm text-muted-foreground">Platform-wide metrics and activity</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="Total Users" value={stats.users} sub={`${stats.growthPct}% vs last month`} />
        <StatCard icon={Smartphone} label="Active Sessions" value={stats.active} />
        <StatCard icon={MessageSquare} label="Total Messages" value={stats.messages} />
        <StatCard icon={DollarSign} label="Total Revenue" value={`$${stats.revenue.toFixed(2)}`} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={UserPlus} label="New Users Today" value={stats.newToday} />
        <StatCard icon={AlertTriangle} label="Failed Today" value={stats.failedToday} color="text-destructive" />
        <StatCard icon={Zap} label="Active (24h)" value={stats.activeUsers} />
        <StatCard icon={Send} label="Messages Today" value={stats.msgsToday} />
      </div>

      <Card className="p-5 bg-card border-border">
        <h3 className="text-sm font-semibold mb-4">User Growth — Last 30 Days</h3>
        <div className="h-64">
          <ResponsiveContainer>
            <LineChart data={growth}>
              <CartesianGrid stroke="#1a1a1a" />
              <XAxis dataKey="date" stroke="#888" fontSize={11} />
              <YAxis stroke="#888" fontSize={11} />
              <Tooltip contentStyle={{ background: "#0d0d0d", border: "1px solid #2a2a2a", borderRadius: 8 }} />
              <Line type="monotone" dataKey="count" stroke="#25D366" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5 bg-card border-border">
          <h3 className="text-sm font-semibold mb-4">Messages Sent — Last 7 Days</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={msgWeek}>
                <CartesianGrid stroke="#1a1a1a" />
                <XAxis dataKey="date" stroke="#888" fontSize={11} />
                <YAxis stroke="#888" fontSize={11} />
                <Tooltip contentStyle={{ background: "#0d0d0d", border: "1px solid #2a2a2a", borderRadius: 8 }} />
                <Bar dataKey="count" fill="#25D366" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5 bg-card border-border">
          <h3 className="text-sm font-semibold mb-4">Plan Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={planDist} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} label={(p: any) => `${p.name} ${(p.percent * 100).toFixed(0)}%`}>
                  {planDist.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="p-5 bg-card border-border">
        <h3 className="text-sm font-semibold mb-4">Recent Activity</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activity.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No activity yet</TableCell></TableRow>
            )}
            {activity.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</TableCell>
                <TableCell className="text-xs">{a.actor_type || "—"}</TableCell>
                <TableCell className={`text-xs font-medium ${actionColor(a.action)}`}>{a.action}</TableCell>
                <TableCell className="text-xs">{a.target_type || "—"}</TableCell>
                <TableCell className="text-xs text-muted-foreground truncate max-w-xs">{a.details ? JSON.stringify(a.details) : "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
