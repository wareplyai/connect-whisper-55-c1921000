import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  CreditCard, CheckCircle2, MessageSquare, Wifi, Package, ShoppingCart,
  TrendingUp, TrendingDown, Clock, AlertCircle, Sparkles, Bot, Activity,
  ArrowUpRight, ArrowDownRight, Zap, Send, Plus, Eye, Wallet, DollarSign,
  Users, Bell,
} from "lucide-react";
import {
  CartesianGrid, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  Legend, ResponsiveContainer,
} from "recharts";
import { NoActiveSubscriptionBanner } from "@/components/NoActiveSubscriptionBanner";

type Period = "Today" | "Weekly" | "Monthly";

const DashboardHome = () => {
  const { profile } = useAuth();
  const { access } = useFeatureAccess();
  const [planInfo, setPlanInfo] = useState<{ plan: string; status: string } | null>(null);
  const [sessionCount, setSessionCount] = useState(0);
  const [connectedSessions, setConnectedSessions] = useState(0);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [failed, setFailed] = useState<any[]>([]);
  const [chart, setChart] = useState<{ day: string; sent: number; failed: number; pending: number }[]>([]);
  const [stats, setStats] = useState({ total: 0, sent: 0, failed: 0, pending: 0 });
  const [wooStats, setWooStats] = useState({ totalProducts: 0, totalOrders: 0, todayOrders: 0, todayRevenue: 0, weekRevenue: 0, monthRevenue: 0 });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [aStats, setAStats] = useState({ received: 0, incomplete: 0, completed: 0, sent: 0 });
  const [chartPeriod, setChartPeriod] = useState<Period>("Weekly");
  const [activeTab, setActiveTab] = useState<"Overview" | "Activity" | "Sessions" | "Commerce" | "Reports">("Overview");

  const loadAbandoned = async (uid: string) => {
    const { data: conn } = await supabase
      .from("abandoned_connections" as any)
      .select("total_received,total_incomplete,total_completed,total_sent")
      .eq("user_id", uid)
      .maybeSingle();
    const c: any = conn || {};
    setAStats({
      received: c.total_received || 0,
      incomplete: c.total_incomplete || 0,
      completed: c.total_completed || 0,
      sent: c.total_sent || 0,
    });
  };

  const loadWoo = async (uid: string) => {
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(); startOfWeek.setDate(startOfWeek.getDate() - 7);
    const startOfMonth = new Date(); startOfMonth.setDate(startOfMonth.getDate() - 30);

    const [{ count: productCount }, { count: orderCount }, { data: monthRows }, { data: recent }] = await Promise.all([
      supabase.from("products").select("id", { count: "exact", head: true }).eq("user_id", uid),
      supabase.from("woo_orders").select("id", { count: "exact", head: true }).eq("user_id", uid),
      supabase.from("woo_orders").select("total,created_at").eq("user_id", uid).gte("created_at", startOfMonth.toISOString()),
      supabase.from("woo_orders").select("id,order_number,status,total,currency,customer_name,customer_phone,created_at,confirmation_sent")
        .eq("user_id", uid).order("created_at", { ascending: false }).limit(6),
    ]);

    const todayRevenue = (monthRows || [])
      .filter((r: any) => new Date(r.created_at) >= startOfDay)
      .reduce((s: number, r: any) => s + (Number(r.total) || 0), 0);
    const weekRevenue = (monthRows || [])
      .filter((r: any) => new Date(r.created_at) >= startOfWeek)
      .reduce((s: number, r: any) => s + (Number(r.total) || 0), 0);
    const monthRevenue = (monthRows || []).reduce((s: number, r: any) => s + (Number(r.total) || 0), 0);
    const todayOrders = (monthRows || []).filter((r: any) => new Date(r.created_at) >= startOfDay).length;

    setWooStats({
      totalProducts: productCount || 0,
      totalOrders: orderCount || 0,
      todayOrders,
      todayRevenue,
      weekRevenue,
      monthRevenue,
    });
    setRecentOrders(recent || []);
  };

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const [{ data: sessionsRows }, { data: activeSub }, { data: latestProfile }] = await Promise.all([
        supabase.from("sessions").select("id,status").eq("user_id", profile.id),
        supabase
          .from("subscriptions")
          .select("plan,status")
          .eq("user_id", profile.id)
          .in("status", ["active", "trial_active"])
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase.from("profiles").select("plan").eq("id", profile.id).maybeSingle(),
      ]);
      setSessionCount(sessionsRows?.length || 0);
      setConnectedSessions((sessionsRows || []).filter((s: any) => s.status === "connected").length);
      const savedPlan = activeSub?.plan || latestProfile?.plan || profile.plan || "free";
      const activeByProfile = savedPlan !== "free";
      setPlanInfo({ plan: savedPlan, status: activeSub?.status || (activeByProfile ? "active" : "inactive") });

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
      sevenDaysAgo.setHours(0, 0, 0, 0);

      const { data: logs } = await supabase
        .from("message_logs").select("id,status,to_number,error_message,created_at")
        .eq("user_id", profile.id)
        .gte("created_at", sevenDaysAgo.toISOString())
        .order("created_at", { ascending: false })
        .limit(1000);
      const all = logs || [];
      setRecentLogs(all.slice(0, 6));
      setFailed(all.filter((l) => l.status === "failed").slice(0, 5));

      const sent = all.filter((l) => l.status === "sent").length;
      const failedN = all.filter((l) => l.status === "failed").length;
      const pending = all.filter((l) => !["sent", "failed"].includes(l.status)).length;
      setStats({ total: all.length, sent, failed: failedN, pending });

      const days: { day: string; sent: number; failed: number; pending: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        const label = d.toLocaleDateString(undefined, { weekday: "short" });
        const dayLogs = all.filter((l) => l.created_at?.startsWith(key));
        days.push({
          day: label,
          sent: dayLogs.filter((l) => l.status === "sent").length,
          failed: dayLogs.filter((l) => l.status === "failed").length,
          pending: dayLogs.filter((l) => !["sent", "failed"].includes(l.status)).length,
        });
      }
      setChart(days);

      await loadWoo(profile.id);
      await loadAbandoned(profile.id);
    })();

    if (!profile?.id) return;
    const channel = supabase
      .channel(`woo-orders-${profile.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "woo_orders", filter: `user_id=eq.${profile.id}` }, () => {
        loadWoo(profile.id);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "products", filter: `user_id=eq.${profile.id}` }, () => {
        loadWoo(profile.id);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "abandoned_orders", filter: `user_id=eq.${profile.id}` }, () => {
        loadAbandoned(profile.id);
      })
      .subscribe();
    const interval = setInterval(() => { loadWoo(profile.id); loadAbandoned(profile.id); }, 30000);
    return () => { supabase.removeChannel(channel); clearInterval(interval); };
  }, [profile]);

  const currentPlan = planInfo?.plan || profile?.plan || "free";
  const hasActivePlan = (planInfo?.status === "active" || planInfo?.status === "trial_active") && currentPlan !== "free";
  const successRate = stats.total > 0 ? Math.round((stats.sent / stats.total) * 100) : 0;

  const firstName = profile?.full_name?.split(" ")[0] || "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  // Hero balance metric driven by selected period
  const heroBalance = useMemo(() => {
    if (chartPeriod === "Today") return wooStats.todayRevenue;
    if (chartPeriod === "Weekly") return wooStats.weekRevenue;
    return wooStats.monthRevenue;
  }, [chartPeriod, wooStats]);

  const heroOrders = useMemo(() => {
    if (chartPeriod === "Today") return wooStats.todayOrders;
    return wooStats.totalOrders;
  }, [chartPeriod, wooStats]);

  const tabs: ("Overview" | "Activity" | "Sessions" | "Commerce" | "Reports")[] =
    ["Overview", "Activity", "Sessions", "Commerce", "Reports"];

  return (
    <div className="space-y-6">
      {/* Top tab strip + greeting */}
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-1 p-1 rounded-full bg-card-elevated/60 border border-border backdrop-blur-sm">
            {tabs.map((t) => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-full transition-all ${
                  activeTab === t
                    ? "bg-primary text-primary-foreground shadow-[0_0_20px_-4px_hsl(var(--primary)/0.6)]"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button className="relative h-9 w-9 grid place-items-center rounded-full border border-border bg-card hover:border-primary/40 transition-colors">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary animate-pulse" />
            </button>
            <div className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border border-border bg-card">
              <div className="grid h-7 w-7 place-items-center rounded-full bg-primary/15 text-primary text-xs font-semibold">
                {(profile?.full_name || profile?.email || "U").slice(0, 1).toUpperCase()}
              </div>
              <span className="text-xs font-medium">{firstName}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl md:text-[34px] font-bold tracking-tight">
              {greeting}, <span className="text-gradient">{firstName}</span>
            </h1>
            <p className="text-sm text-muted-foreground">
              Stay on top of your tasks, monitor progress, and track customer signals.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" className="rounded-full bg-primary hover:bg-primary-hover text-primary-foreground shadow-[0_0_24px_-6px_hsl(var(--primary))]">
              <Link to="/dashboard/sessions" className="flex items-center gap-1.5">
                <Send className="h-3.5 w-3.5" /> Quick Connect
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="rounded-full border-border bg-card hover:border-primary/40">
              <Link to="/dashboard/inbox" className="flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5" /> View Reports
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {!hasActivePlan && <NoActiveSubscriptionBanner />}

      {/* Top grid: hero balance + 4 small stats */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Hero "Total Balance" — bright primary */}
        <div className="lg:row-span-2 relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-[hsl(142_70%_38%)] text-primary-foreground p-6 md:p-7 shadow-[0_20px_60px_-20px_hsl(var(--primary)/0.5)]">
          <div className="absolute -top-20 -right-20 h-56 w-56 rounded-full bg-white/15 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-10 h-56 w-56 rounded-full bg-black/20 blur-3xl pointer-events-none" />

          <div className="relative flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider opacity-80">Total Revenue</span>
            <div className="grid place-items-center h-9 w-9 rounded-xl bg-black/15">
              <Wallet className="h-4 w-4" />
            </div>
          </div>

          <div className="relative mt-6">
            <div className="flex items-baseline gap-2">
              <p className="text-4xl md:text-5xl font-bold tracking-tight tabular-nums">
                ৳{heroBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </p>
              <span className="text-xs font-semibold opacity-80">BDT</span>
            </div>
            <p className="text-[11px] mt-1 opacity-80 inline-flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              {heroOrders} orders · {chartPeriod.toLowerCase()}
            </p>
          </div>

          <div className="relative mt-7 flex flex-wrap gap-2">
            <Button asChild size="sm" className="rounded-full bg-white text-[hsl(142_70%_25%)] hover:bg-white/90 font-semibold">
              <Link to="/dashboard/woocommerce" className="flex items-center gap-1.5">
                <Plus className="h-3.5 w-3.5" /> New Order
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="rounded-full bg-transparent border-white/40 text-primary-foreground hover:bg-white/10 hover:text-primary-foreground">
              <Link to="/dashboard/payments" className="flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5" /> Payments
              </Link>
            </Button>
          </div>

          {/* Decorative wallets row */}
          <div className="relative mt-7 pt-5 border-t border-white/15">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] uppercase tracking-wider font-semibold opacity-80">Plan & Sessions</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/15">{currentPlan}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-black/15 p-3">
                <p className="text-[10px] uppercase tracking-wider opacity-70">Sessions</p>
                <p className="text-lg font-bold mt-1">{connectedSessions}<span className="text-xs opacity-70">/{sessionCount}</span></p>
              </div>
              <div className="rounded-2xl bg-black/15 p-3">
                <p className="text-[10px] uppercase tracking-wider opacity-70">Success</p>
                <p className="text-lg font-bold mt-1">{successRate}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* 2x2 small stat tiles */}
        <StatTile
          label="Total Earnings"
          value={`৳${wooStats.weekRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          delta="+7.5% this week"
          deltaUp
          icon={TrendingUp}
        />
        <StatTile
          label="Messages Sent"
          value={stats.sent.toLocaleString()}
          delta={`${stats.failed} failed`}
          deltaUp={stats.failed === 0}
          icon={Send}
        />
        <StatTile
          label="Total Orders"
          value={wooStats.totalOrders.toLocaleString()}
          delta={`${wooStats.todayOrders} today`}
          deltaUp
          icon={ShoppingCart}
        />
        <StatTile
          label="Incomplete Orders"
          value={aStats.incomplete.toLocaleString()}
          delta={`${aStats.completed} recovered`}
          deltaUp={aStats.completed >= aStats.incomplete}
          icon={AlertCircle}
        />
      </div>

      {/* Wallets-style row + chart */}
      <div className="grid lg:grid-cols-5 gap-4">
        {/* Wallets card */}
        <div className="lg:col-span-2 rounded-3xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                <Wallet className="h-4 w-4 text-primary" /> Wallets
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Subscription · Sessions · AI</p>
            </div>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Live</span>
          </div>
          <div className="space-y-3">
            <WalletRow
              label={`Plan · ${currentPlan}`}
              value={hasActivePlan ? "Active" : "Inactive"}
              icon={CreditCard}
              tone={hasActivePlan ? "success" : "warning"}
            />
            <WalletRow
              label="WhatsApp Sessions"
              value={`${connectedSessions} / ${sessionCount}`}
              icon={Wifi}
              tone={connectedSessions > 0 ? "success" : "warning"}
            />
            <WalletRow
              label="AI Engine"
              value={access.ai_agent ? "Online" : "Disabled"}
              icon={Bot}
              tone={access.ai_agent ? "success" : "warning"}
            />
            <WalletRow
              label="Auto Replies"
              value={access.auto_replies ? "Enabled" : "Disabled"}
              icon={Zap}
              tone={access.auto_replies ? "success" : "warning"}
            />
          </div>
        </div>

        {/* Chart card */}
        <div className="lg:col-span-3 relative overflow-hidden rounded-3xl border border-border bg-card p-5">
          <div className="absolute -top-20 -right-20 h-56 w-56 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
          <div className="relative flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" /> Total Income
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Message throughput · last 7 days</p>
            </div>
            <div className="inline-flex items-center gap-0.5 p-0.5 rounded-full bg-card-elevated border border-border">
              {(["Monthly", "Weekly", "Today"] as Period[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setChartPeriod(p)}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-full transition-all ${
                    chartPeriod === p ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {stats.total === 0 ? (
            <div className="h-64 grid place-items-center text-sm text-muted-foreground">
              <div className="text-center">
                <Sparkles className="h-7 w-7 text-primary/40 mx-auto mb-2" />
                No activity in the last 7 days
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chart} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="grad-area" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.7} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ stroke: "hsl(var(--primary))", strokeWidth: 1, strokeDasharray: "4 4" }}
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 12,
                    boxShadow: "0 10px 30px -10px hsl(var(--primary) / 0.3)",
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="sent"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2.5}
                  fill="url(#grad-area)"
                  name="Sent"
                  activeDot={{ r: 5, strokeWidth: 2, stroke: "hsl(var(--card))" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Activity stream + Recent orders */}
      <div className="grid lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 rounded-3xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-primary" /> Recent Orders
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">{wooStats.totalProducts} products in catalogue</p>
            </div>
            <Button asChild size="sm" variant="ghost" className="text-xs text-primary hover:text-primary">
              <Link to="/dashboard/woocommerce">View all <ArrowUpRight className="h-3 w-3 ml-1" /></Link>
            </Button>
          </div>
          {recentOrders.length === 0 ? (
            <div className="h-48 grid place-items-center text-sm text-muted-foreground">No orders yet</div>
          ) : (
            <div className="space-y-2">
              {recentOrders.map((o: any) => (
                <div key={o.id} className="flex items-center gap-3 p-3 rounded-xl border border-border/60 hover:border-primary/30 hover:bg-card-elevated/50 transition-all">
                  <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary text-xs font-semibold">
                    #{(o.order_number || "").toString().slice(-3) || "00"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{o.customer_name || o.customer_phone || "Guest"}</p>
                    <p className="text-[11px] text-muted-foreground">{new Date(o.created_at).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular-nums">{(o.currency || "৳")}{Number(o.total || 0).toFixed(2)}</p>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{o.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 rounded-3xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Bot className="h-4 w-4 text-primary" /> AI Activity
            </h3>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Realtime</span>
          </div>
          {recentLogs.length === 0 ? (
            <div className="h-48 grid place-items-center text-sm text-muted-foreground text-center px-4">
              <div>
                <Sparkles className="h-6 w-6 text-primary/40 mx-auto mb-2" />
                Waiting for the first AI conversation…
              </div>
            </div>
          ) : (
            <ul className="space-y-2 text-sm">
              {recentLogs.map((l) => {
                const tone = l.status === "failed"
                  ? "bg-destructive/10 text-destructive border-destructive/20"
                  : l.status === "sent"
                  ? "bg-primary/10 text-primary border-primary/20"
                  : "bg-muted text-muted-foreground border-border";
                return (
                  <li key={l.id} className="group flex items-center gap-3 rounded-xl p-2.5 hover:bg-card-elevated transition-colors">
                    <div className="grid place-items-center h-8 w-8 rounded-lg bg-primary/10 text-primary shrink-0">
                      <ArrowUpRight className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium text-foreground/90 text-xs">{l.to_number}</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(l.created_at).toLocaleTimeString()}</p>
                    </div>
                    <span className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full border ${tone}`}>
                      {l.status}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {failed.length > 0 && (
        <div className="rounded-3xl border border-destructive/20 bg-card p-5">
          <h3 className="font-semibold mb-4 flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" /> Last Failed Messages
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr><th className="text-left py-2">To</th><th className="text-left">Error</th><th className="text-right">When</th></tr>
              </thead>
              <tbody>
                {failed.map((f) => (
                  <tr key={f.id} className="border-t border-border">
                    <td className="py-2.5 font-medium">{f.to_number}</td>
                    <td className="text-destructive truncate max-w-[260px]">{f.error_message || "—"}</td>
                    <td className="text-right text-muted-foreground">{new Date(f.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

/* ---------- Premium UI primitives ---------- */

function StatTile({
  label, value, delta, deltaUp, icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  delta?: string;
  deltaUp?: boolean;
  icon: any;
}) {
  return (
    <div className="group relative overflow-hidden rounded-3xl border border-border bg-card p-5 transition-all hover:border-primary/40 hover:shadow-[0_10px_40px_-15px_hsl(var(--primary)/0.4)]">
      <div className="absolute -top-10 -right-10 h-28 w-28 rounded-full bg-primary/10 blur-2xl opacity-70 group-hover:opacity-100 transition-opacity" />
      <div className="relative flex items-center justify-between mb-3">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</span>
        <div className="grid place-items-center h-8 w-8 rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="relative text-2xl font-bold tracking-tight tabular-nums">{value}</p>
      {delta && (
        <p className={`relative mt-1.5 text-[11px] inline-flex items-center gap-1 ${deltaUp ? "text-primary" : "text-warning"}`}>
          {deltaUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {delta}
        </p>
      )}
    </div>
  );
}

function WalletRow({
  label, value, icon: Icon, tone = "success",
}: {
  label: string;
  value: string;
  icon: any;
  tone?: "success" | "warning";
}) {
  const toneCls = tone === "success"
    ? "bg-primary/10 text-primary ring-primary/20"
    : "bg-warning/10 text-warning ring-warning/20";
  return (
    <div className="flex items-center gap-3 p-3 rounded-2xl border border-border/60 bg-card-elevated/40 hover:border-primary/30 transition-colors">
      <div className={`grid place-items-center h-9 w-9 rounded-xl ring-1 ${toneCls}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold capitalize">{value}</p>
      </div>
      <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
    </div>
  );
}

export default DashboardHome;
