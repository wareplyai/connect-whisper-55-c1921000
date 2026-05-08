import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CreditCard, CheckCircle2, MessageSquare, Wifi } from "lucide-react";
import { CartesianGrid, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { NoActiveSubscriptionBanner } from "@/components/NoActiveSubscriptionBanner";
import { Skeleton } from "@/components/ui/skeleton";

const DashboardHome = () => {
  const { profile } = useAuth();
  const [planInfo, setPlanInfo] = useState<{ plan: string; status: string } | null>(null);
  const [sessionCount, setSessionCount] = useState(0);
  const [connectedSessions, setConnectedSessions] = useState(0);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [failed, setFailed] = useState<any[]>([]);
  const [chart, setChart] = useState<{ day: string; sent: number; failed: number; pending: number }[]>([]);
  const [stats, setStats] = useState({ total: 0, sent: 0, failed: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
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
      setLoading(false);
    })();
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
