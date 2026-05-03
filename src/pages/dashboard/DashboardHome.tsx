import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowRight, Smartphone, CreditCard, Activity, X } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const DashboardHome = () => {
  const { profile } = useAuth();
  const [sessionCount, setSessionCount] = useState(0);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [failed, setFailed] = useState<any[]>([]);
  const [chart, setChart] = useState<{ day: string; count: number }[]>([]);
  const [showBanner, setShowBanner] = useState(true);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const { count } = await supabase.from("sessions").select("*", { count: "exact", head: true }).eq("user_id", profile.id);
      setSessionCount(count || 0);

      const { data: logs } = await supabase
        .from("message_logs").select("*").eq("user_id", profile.id)
        .order("created_at", { ascending: false }).limit(50);
      setRecentLogs((logs || []).slice(0, 3));
      setFailed((logs || []).filter((l) => l.status === "failed").slice(0, 5));

      // last 7 days
      const days: { day: string; count: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        const label = d.toLocaleDateString(undefined, { weekday: "short" });
        days.push({ day: label, count: (logs || []).filter((l) => l.created_at?.startsWith(key)).length });
      }
      setChart(days);
    })();
  }, [profile]);

  return (
    <div className="space-y-6">
      {showBanner && (
        <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
          <div className="flex-1 text-sm">
            <span className="font-medium">Automate WhatsApp in n8n —</span>{" "}
            <span className="text-muted-foreground">Use our official n8n community node.</span>{" "}
            <a href="#" className="text-primary hover:underline">view docs →</a>
          </div>
          <button onClick={() => setShowBanner(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold">Welcome back{profile?.full_name ? `, ${profile.full_name}` : ""}</h1>
        <p className="text-muted-foreground text-sm">Here's what's happening with your sessions today.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">Subscription</span>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold capitalize">{profile?.plan || "Free"}</p>
          <span className="mt-1 inline-block text-xs px-2 py-0.5 rounded-full bg-warning/10 text-warning">No active plan</span>
          <Button asChild size="sm" variant="outline" className="mt-4 w-full">
            <Link to="/dashboard/subscription">View Plans <ArrowRight className="ml-2 h-3 w-3" /></Link>
          </Button>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">WhatsApp Sessions</span>
            <Smartphone className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold">{sessionCount}</p>
          <p className="mt-1 text-xs text-muted-foreground">{sessionCount === 0 ? "No active session" : `${sessionCount} session${sessionCount > 1 ? "s" : ""} created`}</p>
          <Button asChild size="sm" className="mt-4 w-full bg-primary text-primary-foreground hover:bg-primary-hover">
            <Link to="/dashboard/sessions">Manage Sessions</Link>
          </Button>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">Recent Activity</span>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </div>
          {recentLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No recent activity yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {recentLogs.map((l) => (
                <li key={l.id} className="flex justify-between gap-2">
                  <span className="truncate text-muted-foreground">{l.to_number}</span>
                  <span className={l.status === "failed" ? "text-destructive" : "text-primary"}>{l.status}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-semibold mb-4">Message Activity</h3>
          {chart.every((c) => c.count === 0) ? (
            <div className="h-56 grid place-items-center text-sm text-muted-foreground">0 messages in the last 7 days</div>
          ) : (
            <ResponsiveContainer width="100%" height={224}>
              <LineChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))" }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-semibold mb-4">Last 5 Failed Messages</h3>
          {failed.length === 0 ? (
            <div className="h-56 grid place-items-center text-sm text-muted-foreground">No failed messages recently</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr><th className="text-left py-2">To</th><th className="text-left">Error</th><th className="text-right">When</th></tr>
              </thead>
              <tbody>
                {failed.map((f) => (
                  <tr key={f.id} className="border-t border-border">
                    <td className="py-2">{f.to_number}</td>
                    <td className="text-destructive truncate max-w-[160px]">{f.error_message}</td>
                    <td className="text-right text-muted-foreground">{new Date(f.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;
