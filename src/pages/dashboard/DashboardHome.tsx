import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  CreditCard, CheckCircle2, MessageSquare, Wifi, Package, ShoppingCart,
  TrendingUp, Clock, AlertCircle, Sparkles, Bot, Activity, ArrowUpRight, Zap,
} from "lucide-react";
import { CartesianGrid, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { NoActiveSubscriptionBanner } from "@/components/NoActiveSubscriptionBanner";

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
  const [wooStats, setWooStats] = useState({ totalProducts: 0, totalOrders: 0, todayOrders: 0, todayRevenue: 0 });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [aStats, setAStats] = useState({ received: 0, incomplete: 0, completed: 0, sent: 0 });
  const [aRecent, setARecent] = useState<any[]>([]);

  const loadAbandoned = async (uid: string) => {
    const [{ data: conn }, { data: rows }] = await Promise.all([
      supabase.from("abandoned_connections" as any).select("total_received,total_incomplete,total_completed,total_sent").eq("user_id", uid).maybeSingle(),
      supabase.from("abandoned_orders" as any).select("id,customer_name,customer_phone_full,customer_phone,product_name,status,sms_sent,sms_error,created_at")
        .eq("user_id", uid).eq("status", "incomplete").order("created_at", { ascending: false }).limit(8),
    ]);
    const c: any = conn || {};
    setAStats({ received: c.total_received || 0, incomplete: c.total_incomplete || 0, completed: c.total_completed || 0, sent: c.total_sent || 0 });
    setARecent((rows as any) || []);
  };

  const loadWoo = async (uid: string) => {
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
    const [{ count: productCount }, { count: orderCount }, { data: todayRows }, { data: recent }] = await Promise.all([
      supabase.from("products").select("id", { count: "exact", head: true }).eq("user_id", uid),
      supabase.from("woo_orders").select("id", { count: "exact", head: true }).eq("user_id", uid),
      supabase.from("woo_orders").select("total").eq("user_id", uid).gte("created_at", startOfDay.toISOString()),
      supabase.from("woo_orders").select("id,order_number,status,total,currency,customer_name,customer_phone,created_at,confirmation_sent")
        .eq("user_id", uid).order("created_at", { ascending: false }).limit(8),
    ]);
    const todayRevenue = (todayRows || []).reduce((s: number, r: any) => s + (Number(r.total) || 0), 0);
    setWooStats({
      totalProducts: productCount || 0,
      totalOrders: orderCount || 0,
      todayOrders: (todayRows || []).length,
      todayRevenue,
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
      setRecentLogs(all.slice(0, 5));
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

  const firstName = profile?.full_name?.split(" ")[0] || "";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="crm-dash space-y-6 -m-4 md:-m-6 p-4 md:p-6 min-h-full bg-[radial-gradient(ellipse_at_top_left,hsl(142_70%_25%/0.18),transparent_55%),radial-gradient(ellipse_at_bottom_right,hsl(142_85%_45%/0.12),transparent_60%)]">
      {/* Premium AI hero header */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-[hsl(142_50%_8%)] via-[hsl(150_45%_10%)] to-[hsl(142_60%_14%)] p-6 md:p-8 shadow-[0_20px_60px_-20px_hsl(142_70%_30%/0.5)]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(142_90%_55%/0.18),transparent_60%)] pointer-events-none" />
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-[hsl(142_90%_50%/0.25)] blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-[hsl(142_80%_45%/0.18)] blur-3xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 backdrop-blur-sm text-xs font-medium text-primary">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-75 animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              AI Engine Online
              <Sparkles className="h-3 w-3" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                {greeting}{firstName ? `, ${firstName}` : ""} <span className="text-gradient">👋</span>
              </h1>
              <p className="text-muted-foreground text-sm mt-1.5 max-w-xl">
                Your AI CRM is monitoring conversations, orders and customer signals in real-time.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" className="bg-primary hover:bg-primary-hover text-primary-foreground shadow-[0_0_30px_-8px_hsl(var(--primary))]">
              <Link to="/dashboard/sessions" className="flex items-center gap-1.5">
                <Wifi className="h-4 w-4" /> Sessions
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="border-primary/30 hover:bg-primary/10">
              <Link to="/dashboard/ai-agent" className="flex items-center gap-1.5">
                <Bot className="h-4 w-4 text-primary" /> AI Agent
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {!hasActivePlan && <NoActiveSubscriptionBanner />}

      {/* Hero KPI cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Messages (7d)"
          value={stats.total.toLocaleString()}
          icon={MessageSquare}
          accent="primary"
          sub={`${stats.sent} sent · ${stats.failed} failed · ${stats.pending} pending`}
        />
        <KpiCard
          label="AI Success Rate"
          value={`${successRate}%`}
          icon={Sparkles}
          accent="primary"
          progress={successRate}
        />
        <KpiCard
          label="Sessions Connected"
          value={
            <>
              {connectedSessions}
              <span className="text-base text-muted-foreground font-medium"> / {sessionCount}</span>
            </>
          }
          icon={Wifi}
          accent="info"
          sub={connectedSessions > 0 ? "Live & syncing" : "No active sessions"}
        />
        <KpiCard
          label="Subscription"
          value={<span className="capitalize">{currentPlan}</span>}
          icon={CreditCard}
          accent={hasActivePlan ? "primary" : "warning"}
          sub={hasActivePlan ? "Active plan" : "No active plan"}
          badge
        />
      </div>

      {access.abandoned_cart && (
        <SectionWrap
          title="Incomplete Orders"
          subtitle="WordPress plugin · auto-recovery"
          icon={AlertCircle}
          tone="warning"
          action={<Link to="/dashboard/abandoned-cart">View all</Link>}
        >
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MiniStat label="Total received" value={aStats.received} icon={MessageSquare} tone="warning" />
            <MiniStat label="Incomplete" value={aStats.incomplete} icon={AlertCircle} tone="warning" highlight />
            <MiniStat label="Completed" value={aStats.completed} icon={CheckCircle2} tone="success" highlight />
            <MiniStat label="SMS sent" value={aStats.sent} icon={Zap} tone="warning" />
          </div>
        </SectionWrap>
      )}

      {/* WooCommerce */}
      <SectionWrap
        title="WooCommerce"
        subtitle="Live commerce intelligence"
        icon={ShoppingCart}
        tone="primary"
        action={<Link to="/dashboard/woocommerce">Manage</Link>}
      >
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MiniStat label="Total Products" value={wooStats.totalProducts} icon={Package} tone="primary" />
          <MiniStat label="Total Orders" value={wooStats.totalOrders} icon={ShoppingCart} tone="primary" />
          <MiniStat label="Today's Orders" value={wooStats.todayOrders} icon={Clock} tone="info" />
          <MiniStat label="Today's Revenue" value={wooStats.todayRevenue.toFixed(2)} icon={TrendingUp} tone="success" highlight />
        </div>
      </SectionWrap>

      {/* Chart + Activity */}
      <div className="grid lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 relative overflow-hidden rounded-2xl border border-border bg-card p-5">
          <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
          <div className="flex items-center justify-between mb-4 relative">
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" /> Message Throughput
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">Last 7 days · grouped by status</p>
            </div>
            <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">Live</span>
          </div>
          {stats.total === 0 ? (
            <div className="h-56 grid place-items-center text-sm text-muted-foreground">0 messages in the last 7 days</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chart}>
                <defs>
                  <linearGradient id="grad-sent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.55} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: "hsl(var(--primary) / 0.06)" }}
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, boxShadow: "0 10px 30px -10px hsl(var(--primary) / 0.3)" }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
                <Bar dataKey="sent" stackId="a" fill="url(#grad-sent)" name="Sent" radius={[6, 6, 0, 0]} />
                <Bar dataKey="pending" stackId="a" fill="hsl(var(--muted-foreground) / 0.5)" name="Pending" />
                <Bar dataKey="failed" stackId="a" fill="hsl(var(--destructive))" name="Failed" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Bot className="h-4 w-4 text-primary" /> AI Activity Stream
            </h3>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Realtime</span>
          </div>
          {recentLogs.length === 0 ? (
            <div className="h-56 grid place-items-center text-sm text-muted-foreground text-center px-4">
              <div>
                <Sparkles className="h-6 w-6 text-primary/40 mx-auto mb-2" />
                Waiting for the first AI conversation…
              </div>
            </div>
          ) : (
            <ul className="space-y-2.5 text-sm">
              {recentLogs.map((l) => {
                const tone = l.status === "failed"
                  ? "bg-destructive/10 text-destructive border-destructive/20"
                  : l.status === "sent"
                  ? "bg-primary/10 text-primary border-primary/20"
                  : "bg-muted text-muted-foreground border-border";
                return (
                  <li key={l.id} className="group flex items-center gap-3 rounded-lg p-2.5 -mx-1 hover:bg-card-elevated transition-colors">
                    <div className="grid place-items-center h-8 w-8 rounded-lg bg-primary/10 text-primary shrink-0">
                      <ArrowUpRight className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium text-foreground/90">{l.to_number}</p>
                      <p className="text-[11px] text-muted-foreground">{new Date(l.created_at).toLocaleTimeString()}</p>
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
        <div className="rounded-2xl border border-destructive/20 bg-card p-5">
          <h3 className="font-semibold mb-4 flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" /> Last 5 Failed Messages
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

type Tone = "primary" | "warning" | "info" | "success";

const toneStyles: Record<Tone, { ring: string; text: string; bg: string }> = {
  primary: { ring: "ring-primary/20", text: "text-primary", bg: "bg-primary/10" },
  warning: { ring: "ring-warning/20", text: "text-warning", bg: "bg-warning/10" },
  info:    { ring: "ring-info/20",    text: "text-info",    bg: "bg-info/10" },
  success: { ring: "ring-success/20", text: "text-success", bg: "bg-success/10" },
};

function KpiCard({
  label, value, icon: Icon, accent = "primary", sub, progress, badge,
}: {
  label: string;
  value: React.ReactNode;
  icon: any;
  accent?: Tone;
  sub?: React.ReactNode;
  progress?: number;
  badge?: boolean;
}) {
  const t = toneStyles[accent];
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-br from-[hsl(150_45%_9%)] via-[hsl(145_40%_11%)] to-[hsl(142_55%_13%)] p-5 transition-all hover:border-primary/50 hover:shadow-[0_15px_50px_-15px_hsl(142_90%_50%/0.5)]">
      <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-[hsl(142_90%_50%/0.18)] blur-2xl opacity-80 group-hover:opacity-100 transition-opacity" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      <div className="relative flex items-center justify-between mb-3">
        <span className="text-[11px] uppercase tracking-wider text-primary/70 font-semibold">{label}</span>
        <div className={`grid place-items-center h-9 w-9 rounded-xl bg-[hsl(142_90%_50%/0.15)] text-primary ring-1 ring-primary/30 shadow-[0_0_20px_-4px_hsl(142_90%_50%/0.5)]`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="relative text-2xl md:text-[28px] font-bold tracking-tight text-[hsl(120_100%_85%)] [text-shadow:0_0_30px_hsl(142_90%_50%/0.4)]">{value}</p>
      {progress != null && (
        <div className="relative mt-3 h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60 transition-all"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      )}
      {sub && (
        badge ? (
          <span className={`relative mt-2 inline-block text-[11px] px-2 py-0.5 rounded-full ${t.bg} ${t.text} ring-1 ${t.ring}`}>
            {sub}
          </span>
        ) : (
          <p className="relative mt-1.5 text-xs text-muted-foreground">{sub}</p>
        )
      )}
    </div>
  );
}

function SectionWrap({
  title, subtitle, icon: Icon, tone = "primary", action, children,
}: {
  title: string;
  subtitle?: string;
  icon: any;
  tone?: Tone;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const t = toneStyles[tone];
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`grid place-items-center h-9 w-9 rounded-xl ${t.bg} ${t.text} ring-1 ${t.ring}`}>
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-semibold leading-tight">{title}</h3>
            {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        {action && (
          <Button asChild size="sm" variant="outline" className="border-border hover:border-primary/40 hover:bg-primary/5">
            {action}
          </Button>
        )}
      </div>
      {children}
    </div>
  );
}

function MiniStat({
  label, value, icon: Icon, tone = "primary", highlight,
}: {
  label: string;
  value: React.ReactNode;
  icon: any;
  tone?: Tone;
  highlight?: boolean;
}) {
  const t = toneStyles[tone];
  return (
    <div className={`group relative overflow-hidden rounded-2xl border p-5 transition-all hover:shadow-[0_15px_40px_-15px_hsl(142_90%_50%/0.5)] ${
      highlight
        ? "border-primary/40 bg-gradient-to-br from-[hsl(142_70%_18%)] via-[hsl(145_65%_22%)] to-[hsl(140_75%_28%)] shadow-[0_10px_30px_-10px_hsl(142_90%_50%/0.4)]"
        : "border-primary/15 bg-gradient-to-br from-[hsl(150_45%_9%)] via-[hsl(145_40%_11%)] to-[hsl(142_55%_13%)] hover:border-primary/40"
    }`}>
      <div className="absolute -top-8 -right-8 h-24 w-24 rounded-full bg-[hsl(142_90%_55%/0.2)] blur-2xl opacity-70" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      <div className="relative flex items-center justify-between mb-3">
        <span className={`text-[11px] uppercase tracking-wider font-semibold ${highlight ? "text-[hsl(120_100%_88%)]" : "text-primary/70"}`}>{label}</span>
        <div className="grid place-items-center h-9 w-9 rounded-xl bg-[hsl(142_90%_50%/0.18)] text-primary ring-1 ring-primary/30 shadow-[0_0_18px_-4px_hsl(142_90%_50%/0.5)]">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className={`relative text-2xl font-bold tracking-tight ${highlight ? "text-white [text-shadow:0_0_30px_hsl(142_90%_50%/0.6)]" : "text-[hsl(120_100%_85%)] [text-shadow:0_0_25px_hsl(142_90%_50%/0.35)]"}`}>{value}</p>
    </div>
  );
}

export default DashboardHome;
