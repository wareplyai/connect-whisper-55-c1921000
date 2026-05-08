import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CreditCard, CheckCircle2, MessageSquare, Wifi, Package, ShoppingCart, TrendingUp, Clock, AlertCircle, XCircle } from "lucide-react";
import { CartesianGrid, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { NoActiveSubscriptionBanner } from "@/components/NoActiveSubscriptionBanner";

const DashboardHome = () => {
  const { profile } = useAuth();
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome back{profile?.full_name ? `, ${profile.full_name}` : ""}</h1>
        <p className="text-muted-foreground text-sm">Here's what's happening with your sessions today.</p>
      </div>

      {!hasActivePlan && <NoActiveSubscriptionBanner />}

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">Total Messages (7d)</span>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold">{stats.total}</p>
          <p className="mt-1 text-xs text-muted-foreground">{stats.sent} sent · {stats.failed} failed · {stats.pending} pending</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">Success Rate</span>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold">{successRate}%</p>
          <div className="mt-2 h-2 w-full rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary" style={{ width: `${successRate}%` }} />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">Sessions Connected</span>
            <Wifi className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold">{connectedSessions}<span className="text-sm text-muted-foreground font-normal"> / {sessionCount}</span></p>
          <Button asChild size="sm" variant="outline" className="mt-3 w-full">
            <Link to="/dashboard/sessions">Manage</Link>
          </Button>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">Subscription</span>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold capitalize">{currentPlan}</p>
          <span className={`mt-1 inline-block text-xs px-2 py-0.5 rounded-full ${hasActivePlan ? "bg-primary/10 text-primary" : "bg-warning/10 text-warning"}`}>
            {hasActivePlan ? "Active plan" : "No active plan"}
          </span>
        </div>
      </div>

      {/* WooCommerce Stats */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold flex items-center gap-2"><ShoppingCart className="h-4 w-4" /> WooCommerce <span className="text-xs text-muted-foreground font-normal">(live)</span></h3>
          <Button asChild size="sm" variant="outline"><Link to="/dashboard/woocommerce">Manage</Link></Button>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">Total Products</span>
              <Package className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold">{wooStats.totalProducts}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">Total Orders</span>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold">{wooStats.totalOrders}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">Today's Orders</span>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold">{wooStats.todayOrders}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">Today's Revenue</span>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold">{wooStats.todayRevenue.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Recent WooCommerce Orders */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="font-semibold mb-4 flex items-center gap-2"><ShoppingCart className="h-4 w-4" /> Recent Orders</h3>
        {recentOrders.length === 0 ? (
          <div className="py-8 grid place-items-center text-sm text-muted-foreground">No orders yet. Connect your WooCommerce store to start receiving orders.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left py-2">Order #</th>
                  <th className="text-left">Customer</th>
                  <th className="text-left">Phone</th>
                  <th className="text-left">Status</th>
                  <th className="text-right">Total</th>
                  <th className="text-center">WhatsApp</th>
                  <th className="text-right">When</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((o) => (
                  <tr key={o.id} className="border-t border-border">
                    <td className="py-2 font-medium">#{o.order_number || o.id.slice(0, 8)}</td>
                    <td>{o.customer_name || "—"}</td>
                    <td className="text-muted-foreground">{o.customer_phone || "—"}</td>
                    <td><span className="text-xs px-2 py-0.5 rounded-full bg-muted">{o.status || "—"}</span></td>
                    <td className="text-right">{o.currency || ""} {Number(o.total || 0).toFixed(2)}</td>
                    <td className="text-center">
                      {o.confirmation_sent
                        ? <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">Sent</span>
                        : <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">—</span>}
                    </td>
                    <td className="text-right text-muted-foreground text-xs">{new Date(o.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-semibold mb-4">Messages by Status (last 7 days)</h3>
          {stats.total === 0 ? (
            <div className="h-56 grid place-items-center text-sm text-muted-foreground">0 messages in the last 7 days</div>
          ) : (
            <ResponsiveContainer width="100%" height={224}>
              <BarChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="sent" stackId="a" fill="hsl(var(--primary))" name="Sent" />
                <Bar dataKey="pending" stackId="a" fill="hsl(var(--muted-foreground))" name="Pending" />
                <Bar dataKey="failed" stackId="a" fill="hsl(var(--destructive))" name="Failed" />
              </BarChart>
            </ResponsiveContainer>
          )}
      </div>

      {/* Incomplete Orders */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold flex items-center gap-2 text-orange-600">
            <AlertCircle className="h-4 w-4" /> Incomplete Orders <span className="text-xs text-muted-foreground font-normal">(WordPress plugin)</span>
          </h3>
          <Button asChild size="sm" variant="outline" className="border-orange-400 text-orange-600 hover:bg-orange-500 hover:text-white">
            <Link to="/dashboard/abandoned-cart">View all</Link>
          </Button>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div className="rounded-xl border border-orange-200 dark:border-orange-900/40 bg-card p-5">
            <div className="flex items-center justify-between mb-3"><span className="text-sm text-muted-foreground">Total received</span><MessageSquare className="h-4 w-4 text-orange-500" /></div>
            <p className="text-2xl font-bold">{aStats.received}</p>
          </div>
          <div className="rounded-xl border border-orange-200 dark:border-orange-900/40 bg-card p-5">
            <div className="flex items-center justify-between mb-3"><span className="text-sm text-muted-foreground">Incomplete</span><AlertCircle className="h-4 w-4 text-orange-500" /></div>
            <p className="text-2xl font-bold text-orange-600">{aStats.incomplete}</p>
          </div>
          <div className="rounded-xl border border-green-200 dark:border-green-900/40 bg-card p-5">
            <div className="flex items-center justify-between mb-3"><span className="text-sm text-muted-foreground">Completed</span><CheckCircle2 className="h-4 w-4 text-green-500" /></div>
            <p className="text-2xl font-bold text-green-600">{aStats.completed}</p>
          </div>
          <div className="rounded-xl border border-green-200 dark:border-green-900/40 bg-card p-5">
            <div className="flex items-center justify-between mb-3"><span className="text-sm text-muted-foreground">SMS sent</span><CheckCircle2 className="h-4 w-4 text-green-500" /></div>
            <p className="text-2xl font-bold text-green-600">{aStats.sent}</p>
          </div>
        </div>

        <div className="rounded-xl border border-orange-200 dark:border-orange-900/40 bg-card p-5">
          <h4 className="font-semibold mb-3 text-orange-700 dark:text-orange-300 text-sm uppercase tracking-wide">Latest incomplete</h4>
          {aRecent.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">No incomplete orders yet.</div>
          ) : (
            <ul className="divide-y divide-border">
              {aRecent.map((o) => (
                <li key={o.id} className="py-2 flex items-center gap-3 text-sm">
                  <span className="flex-1 truncate"><span className="font-medium">{o.customer_name || "Unknown"}</span> <span className="text-muted-foreground">· {o.customer_phone_full || o.customer_phone || "—"}</span></span>
                  <span className="hidden md:inline text-xs text-muted-foreground truncate max-w-[200px]">{o.product_name || "—"}</span>
                  {o.sms_sent ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500 text-white font-bold uppercase flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />SMS</span>
                  ) : o.sms_error ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-destructive text-destructive-foreground font-bold uppercase flex items-center gap-1"><XCircle className="h-3 w-3" />SMS</span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-bold uppercase flex items-center gap-1"><Clock className="h-3 w-3" />Pending</span>
                  )}
                  <span className="text-xs text-muted-foreground hidden sm:inline">{new Date(o.created_at).toLocaleTimeString()}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-semibold mb-4">Recent Activity</h3>
          {recentLogs.length === 0 ? (
            <div className="h-56 grid place-items-center text-sm text-muted-foreground">No recent activity yet</div>
          ) : (
            <ul className="space-y-2 text-sm">
              {recentLogs.map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-2 border-b border-border pb-2 last:border-0">
                  <span className="truncate text-muted-foreground flex-1">→ {l.to_number}</span>
                  <span className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleTimeString()}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${l.status === "failed" ? "bg-destructive/10 text-destructive" : l.status === "sent" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>{l.status}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {failed.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-semibold mb-4">Last 5 Failed Messages</h3>
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr><th className="text-left py-2">To</th><th className="text-left">Error</th><th className="text-right">When</th></tr>
            </thead>
            <tbody>
              {failed.map((f) => (
                <tr key={f.id} className="border-t border-border">
                  <td className="py-2">{f.to_number}</td>
                  <td className="text-destructive truncate max-w-[260px]">{f.error_message || "—"}</td>
                  <td className="text-right text-muted-foreground">{new Date(f.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default DashboardHome;
