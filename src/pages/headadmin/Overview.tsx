import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Users, Smartphone, MessageSquare, DollarSign, UserPlus, AlertTriangle,
  Zap, Send, ArrowUpRight, ArrowDownRight, MoreHorizontal, Activity,
  AlertCircle, CheckCircle2, XCircle, Clock, Bot, MessageSquareText, ShoppingBag, ShoppingBasket,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { useHeadAdminStats } from "@/hooks/useHeadAdminStats";

const PIE_COLORS = ["#4ade80", "#f97316", "#60a5fa", "#facc15", "#a855f7"];

const StatCard = ({
  icon: Icon, label, value, delta, up = true, accent = "primary",
}: any) => (
  <div className="rounded-2xl border border-border bg-card p-5 hover:border-border/80 transition-colors">
    <div className="flex items-start justify-between mb-4">
      <div className={`h-10 w-10 grid place-items-center rounded-xl ${
        accent === "primary" ? "bg-primary/10 text-primary" :
        accent === "warning" ? "bg-warning/10 text-warning" :
        accent === "destructive" ? "bg-destructive/10 text-destructive" :
        "bg-muted text-foreground"
      }`}>
        <Icon className="h-5 w-5" />
      </div>
      {delta != null && (
        <span className={`inline-flex items-center gap-0.5 text-[11px] font-semibold px-2 py-1 rounded-full border ${
          up ? "text-success bg-success/10 border-success/30"
             : "text-destructive bg-destructive/10 border-destructive/30"
        }`}>
          {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {delta}
        </span>
      )}
    </div>
    <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground font-medium">{label}</p>
    <p className="text-[26px] font-bold mt-1 leading-tight tracking-tight">{value}</p>
  </div>
);

const ChartCard = ({ title, subtitle, children, action }: any) => (
  <div className="rounded-2xl border border-border bg-card p-5">
    <div className="flex items-center justify-between mb-4">
      <div>
        <h3 className="text-[15px] font-semibold">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {action || (
        <button className="text-muted-foreground hover:text-foreground p-1">
          <MoreHorizontal className="h-4 w-4" />
        </button>
      )}
    </div>
    {children}
  </div>
);

export default function HeadAdminOverview() {
  const stats = useHeadAdminStats();
  const [growth, setGrowth] = useState<any[]>([]);
  const [msgWeek, setMsgWeek] = useState<any[]>([]);
  const [planDist, setPlanDist] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [todayStats, setTodayStats] = useState({ newToday: 0, failedToday: 0, activeUsers: 0, msgsToday: 0 });
  const [aStats, setAStats] = useState({ received: 0, incomplete: 0, completed: 0, sent: 0 });
  const [aRecent, setARecent] = useState<any[]>([]);
  const [featurePerms, setFeaturePerms] = useState<{ key: string; label: string; icon: any; enabled: number; total: number; globalOn: boolean }[]>([]);
  const [aiSpend, setAiSpend] = useState<{ tokens: number; cost: number; lastCost: number; activeUsers: number; top: any[] } | null>(null);
  const [loadingExtra, setLoadingExtra] = useState(true);

  const loadAiSpend = async () => {
    const { data } = await supabase.rpc("headadmin_ai_spend_summary" as any);
    const row: any = Array.isArray(data) ? data[0] : data;
    if (row) {
      setAiSpend({
        tokens: Number(row.this_month_tokens || 0),
        cost: Number(row.this_month_cost || 0),
        lastCost: Number(row.last_month_cost || 0),
        activeUsers: Number(row.active_users_this_month || 0),
        top: Array.isArray(row.top_users) ? row.top_users : [],
      });
    }
  };

  const loadFeaturePerms = async () => {
    const [{ data: globals }, { data: overrides }, { data: profilesData }] = await Promise.all([
      supabase.from("global_feature_settings" as any).select("feature, show_to_users"),
      supabase.from("user_feature_access" as any).select("user_id, feature, enabled"),
      supabase.from("profiles").select("id"),
    ]);
    const profileIds = new Set((profilesData || []).map((p: any) => p.id));
    const total = profileIds.size;
    const gMap: Record<string, boolean> = { ai_agent: true, auto_replies: true, abandoned_cart: true, products: true };
    (globals || []).forEach((g: any) => { gMap[g.feature] = !!g.show_to_users; });
    const features = [
      { key: "ai_agent", label: "AI Agent", icon: Bot },
      { key: "auto_replies", label: "Auto-Replies", icon: MessageSquareText },
      { key: "abandoned_cart", label: "Incomplete (Abandoned)", icon: ShoppingBag },
      { key: "products", label: "Products", icon: ShoppingBasket },
    ];
    const result = features.map((f) => {
      // Only consider overrides for users that still exist in profiles.
      // Deduplicate per user (latest row wins via Map).
      const perUser = new Map<string, boolean>();
      (overrides || [])
        .filter((o: any) => o.feature === f.key && profileIds.has(o.user_id))
        .forEach((o: any) => perUser.set(o.user_id, !!o.enabled));
      const overrideEnabled = Array.from(perUser.values()).filter(Boolean).length;
      const nonOverridden = Math.max(0, total - perUser.size);
      const rawEnabled = overrideEnabled + (gMap[f.key] ? nonOverridden : 0);
      const enabled = Math.min(rawEnabled, total); // clamp so it never exceeds total
      return { ...f, enabled, total, globalOn: gMap[f.key] };
    });
    setFeaturePerms(result);
  };


  const loadAbandoned = async () => {
    const [{ data: conns }, { data: rows }] = await Promise.all([
      (supabase.from("abandoned_connections" as any) as any).select("total_received,total_incomplete,total_completed,total_sent"),
      (supabase.from("abandoned_orders" as any) as any).select("id,customer_name,customer_phone_full,customer_phone,product_name,status,sms_sent,sms_error,created_at")
        .eq("status", "incomplete").order("created_at", { ascending: false }).limit(10),
    ]);
    const agg = (conns || []).reduce((acc: any, c: any) => ({
      received: acc.received + (c.total_received || 0),
      incomplete: acc.incomplete + (c.total_incomplete || 0),
      completed: acc.completed + (c.total_completed || 0),
      sent: acc.sent + (c.total_sent || 0),
    }), { received: 0, incomplete: 0, completed: 0, sent: 0 });
    setAStats(agg);
    setARecent((rows as any) || []);
  };

  const loadExtra = async () => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const monthAgo = new Date(); monthAgo.setDate(monthAgo.getDate() - 30);
    const dayAgo = new Date(); dayAgo.setHours(dayAgo.getHours() - 24);
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);

    const [newToday, failedToday, activeUsers, msgsToday, profilesGrowth, msgsWeek, profilesAll, recent] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", today.toISOString()),
      supabase.from("message_logs").select("id", { count: "exact", head: true }).eq("status", "failed").gte("created_at", today.toISOString()),
      supabase.from("sessions").select("id", { count: "exact", head: true }).gte("last_active", dayAgo.toISOString()),
      supabase.from("message_logs").select("id", { count: "exact", head: true }).gte("created_at", today.toISOString()),
      supabase.from("profiles").select("created_at").gte("created_at", monthAgo.toISOString()),
      supabase.from("message_logs").select("created_at").gte("created_at", weekAgo.toISOString()),
      supabase.from("profiles").select("plan"),
      supabase.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(8),
    ]);

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
    const labels = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    const wkLabels: Record<string,string> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
      const k = d.toISOString().slice(0, 10);
      wk[k] = 0; wkLabels[k] = labels[d.getDay()];
    }
    (msgsWeek.data || []).forEach((m: any) => {
      const k = m.created_at?.slice(0, 10);
      if (k in wk) wk[k]++;
    });
    setMsgWeek(Object.entries(wk).map(([date, count]) => ({ day: wkLabels[date], count })));

    const planMap: Record<string, number> = {};
    (profilesAll.data || []).forEach((p: any) => {
      planMap[p.plan || "free"] = (planMap[p.plan || "free"] || 0) + 1;
    });
    setPlanDist(Object.entries(planMap).map(([name, value]) => ({ name, value })));

    setTodayStats({
      newToday: newToday.count || 0,
      failedToday: failedToday.count || 0,
      activeUsers: activeUsers.count || 0,
      msgsToday: msgsToday.count || 0,
    });
    setActivity(recent.data || []);
    setLoadingExtra(false);
  };

  useEffect(() => {
    loadExtra();
    loadAbandoned();
    loadFeaturePerms();
    const t = setInterval(() => { loadExtra(); loadAbandoned(); loadFeaturePerms(); }, 30000);
    const ch = supabase
      .channel(`ha-overview-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => { loadExtra(); loadFeaturePerms(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "message_logs" }, loadExtra)
      .on("postgres_changes", { event: "*", schema: "public", table: "activity_logs" }, loadExtra)
      .on("postgres_changes", { event: "*", schema: "public", table: "sessions" }, loadExtra)
      .on("postgres_changes", { event: "*", schema: "public", table: "abandoned_orders" }, loadAbandoned)
      .on("postgres_changes", { event: "*", schema: "public", table: "abandoned_connections" }, loadAbandoned)
      .on("postgres_changes", { event: "*", schema: "public", table: "global_feature_settings" }, loadFeaturePerms)
      .on("postgres_changes", { event: "*", schema: "public", table: "user_feature_access" }, loadFeaturePerms)
      .subscribe();
    return () => { clearInterval(t); supabase.removeChannel(ch); };
  }, []);

  const growthPct = stats.prevUsers30d > 0
    ? (((stats.newUsers30d - stats.prevUsers30d) / stats.prevUsers30d) * 100).toFixed(1)
    : "100";
  const growthUp = !growthPct.startsWith("-");

  if (stats.loading || loadingExtra) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">Dashboard Overview</h1>
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
            </span>
            Live · Updated {new Date().toLocaleTimeString()}
          </p>
        </div>
      </div>

      {/* Top stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="Total Users" value={stats.totalUsers.toLocaleString()}
          delta={`${growthUp ? "+" : ""}${growthPct}%`} up={growthUp} accent="primary" />
        <StatCard icon={Smartphone} label="Active Sessions" value={stats.activeSessions.toLocaleString()}
          delta="live" up accent="primary" />
        <StatCard icon={MessageSquare} label="Total Messages" value={stats.totalMessages.toLocaleString()}
          delta={`${todayStats.msgsToday} today`} up accent="warning" />
        <StatCard icon={DollarSign} label="Total Revenue" value={`$${stats.totalRevenue.toFixed(2)}`}
          delta={stats.pendingPayments > 0 ? `${stats.pendingPayments} pending` : "all clear"}
          up={stats.pendingPayments === 0} accent="primary" />
      </div>

      {/* Today row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={UserPlus} label="New Users Today" value={todayStats.newToday} accent="primary" />
        <StatCard icon={AlertTriangle} label="Failed Today" value={todayStats.failedToday}
          accent={todayStats.failedToday > 0 ? "destructive" : "primary"} />
        <StatCard icon={Zap} label="Active (24h)" value={todayStats.activeUsers} accent="warning" />
        <StatCard icon={Send} label="Messages Today" value={todayStats.msgsToday} accent="primary" />
      </div>

      {/* Feature permissions row */}
      <ChartCard
        title="Feature Permissions"
        subtitle={`How many users currently have access to each feature · ${featurePerms[0]?.total || 0} total users`}
        action={<a href="/headadmin/feature-access" className="text-xs text-primary hover:underline">Manage</a>}
      >
        <div className="grid gap-4 md:grid-cols-3">
          {featurePerms.map((f) => {
            const pct = f.total > 0 ? Math.round((f.enabled / f.total) * 100) : 0;
            const disabled = f.total - f.enabled;
            return (
              <div key={f.key} className="rounded-xl border border-border bg-card-elevated p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 grid place-items-center rounded-lg bg-primary/10 text-primary">
                      <f.icon className="h-[18px] w-[18px]" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{f.label}</p>
                      <p className="text-[11px] text-muted-foreground">Global: {f.globalOn ? "ON" : "OFF"}</p>
                    </div>
                  </div>
                  <span className={`text-[11px] font-semibold px-2 py-1 rounded-full border ${
                    f.globalOn ? "text-success bg-success/10 border-success/30"
                               : "text-destructive bg-destructive/10 border-destructive/30"
                  }`}>{pct}%</span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold tracking-tight">{f.enabled}</span>
                  <span className="text-xs text-muted-foreground">/ {f.total} users</span>
                </div>
                <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
                <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-success" /> {f.enabled} enabled</span>
                  <span className="inline-flex items-center gap-1"><XCircle className="h-3 w-3 text-destructive" /> {disabled} disabled</span>
                </div>
              </div>
            );
          })}
        </div>
      </ChartCard>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ChartCard
            title="User Growth"
            subtitle="Last 30 days · real-time"
            action={
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                30 Days
              </span>
            }
          >
            <div className="h-72">
              <ResponsiveContainer>
                <AreaChart data={growth}>
                  <defs>
                    <linearGradient id="growthFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4ade80" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#4ade80" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 10, fontSize: 12, color: "hsl(var(--foreground))" }} itemStyle={{ color: "hsl(var(--foreground))" }} labelStyle={{ color: "hsl(var(--foreground))" }} />
                  <Area type="monotone" dataKey="count" stroke="#4ade80" strokeWidth={2.5} fill="url(#growthFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>

        <ChartCard title="Plan Distribution" subtitle="By active plan">
          <div className="h-72">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={planDist} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}
                     label={(p: any) => `${p.name} ${(p.percent * 100).toFixed(0)}%`}
                     labelLine={false} fontSize={11}>
                  {planDist.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="hsl(var(--card))" strokeWidth={2} />)}
                </Pie>
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 10, fontSize: 12, color: "hsl(var(--foreground))" }} itemStyle={{ color: "hsl(var(--foreground))" }} labelStyle={{ color: "hsl(var(--foreground))" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* Bottom row */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ChartCard title="Messages Sent" subtitle="Last 7 days">
            <div className="h-72">
              <ResponsiveContainer>
                <BarChart data={msgWeek}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: "hsl(var(--muted))" }} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 10, fontSize: 12, color: "hsl(var(--foreground))" }} itemStyle={{ color: "hsl(var(--foreground))" }} labelStyle={{ color: "hsl(var(--foreground))" }} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={28}>
                    {msgWeek.map((entry, i) => {
                      const max = Math.max(...msgWeek.map((m) => m.count));
                      return <Cell key={i} fill={entry.count === max && max > 0 ? "#4ade80" : "#f97316"} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>

        <ChartCard title="Recent Activity" subtitle="Latest events" action={<a href="/headadmin/logs" className="text-xs text-primary hover:underline">View all</a>}>
          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {activity.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">No activity yet</p>
            )}
            {activity.map((a) => (
              <div key={a.id} className="flex items-start gap-3 py-1.5">
                <div className="h-8 w-8 rounded-full bg-primary/10 text-primary grid place-items-center shrink-0">
                  <Activity className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{a.action}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {a.actor_type || "system"} · {a.target_type || "—"}
                  </p>
                </div>
                <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                  {new Date(a.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
