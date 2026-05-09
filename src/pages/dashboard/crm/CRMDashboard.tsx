import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { ShoppingCart, Banknote, Users, RotateCcw, AlertTriangle } from "lucide-react";

const COLORS = ["hsl(var(--primary))", "hsl(var(--success))", "hsl(var(--warning))", "hsl(var(--destructive))", "hsl(var(--muted-foreground))"];

export default function CRMDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ todayOrders: 0, pendingCOD: 0, activeLeads: 0, returns: 0, failed: 0 });
  const [statusDist, setStatusDist] = useState<{ name: string; value: number }[]>([]);
  const [daily, setDaily] = useState<{ day: string; orders: number }[]>([]);
  const [activity, setActivity] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const [{ data: orders }, { data: leads }] = await Promise.all([
        supabase.from("crm_orders").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(500),
        supabase.from("crm_leads").select("id,status").eq("user_id", user.id),
      ]);
      const o = orders || [];
      const todayOrders = o.filter(x => new Date(x.created_at) >= today).length;
      const pendingCOD = o.filter(x => x.payment_method === "COD" && !x.cod_confirmed).length;
      const returns = o.filter(x => x.order_status === "returned").length;
      const failed = o.filter(x => x.courier_status === "failed").length;
      setStats({ todayOrders, pendingCOD, activeLeads: (leads || []).filter(l => l.status !== "lost" && l.status !== "converted").length, returns, failed });

      const dist: Record<string, number> = {};
      o.forEach(x => { dist[x.order_status] = (dist[x.order_status] || 0) + 1; });
      setStatusDist(Object.entries(dist).map(([name, value]) => ({ name, value })));

      const days: { day: string; orders: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
        const next = new Date(d); next.setDate(d.getDate() + 1);
        days.push({ day: d.toLocaleDateString("en", { weekday: "short" }), orders: o.filter(x => new Date(x.created_at) >= d && new Date(x.created_at) < next).length });
      }
      setDaily(days);
      setActivity(o.slice(0, 8));
    };
    load();
    const ch = supabase.channel("crm-dash").on("postgres_changes", { event: "*", schema: "public", table: "crm_orders" }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const cards = [
    { label: "Today's Orders", value: stats.todayOrders, icon: ShoppingCart, color: "text-primary" },
    { label: "Pending COD", value: stats.pendingCOD, icon: Banknote, color: "text-warning" },
    { label: "Active Leads", value: stats.activeLeads, icon: Users, color: "text-success" },
    { label: "Return Requests", value: stats.returns, icon: RotateCcw, color: "text-muted-foreground" },
    { label: "Failed Deliveries", value: stats.failed, icon: AlertTriangle, color: "text-destructive" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">CRM Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of your orders, leads & customer activity</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {cards.map(c => (
          <Card key={c.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-muted-foreground">{c.label}</p>
                <c.icon className={`h-4 w-4 ${c.color}`} />
              </div>
              <p className="text-2xl font-bold">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Order Status Distribution</CardTitle></CardHeader>
          <CardContent>
            {statusDist.length === 0 ? (
              <p className="text-sm text-muted-foreground py-12 text-center">No orders yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={statusDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {statusDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Daily Orders (Last 7 Days)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={daily}>
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Line type="monotone" dataKey="orders" stroke="hsl(var(--primary))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Recent Activity</CardTitle></CardHeader>
        <CardContent>
          {activity.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No activity yet</p>
          ) : (
            <div className="divide-y divide-border">
              {activity.map(o => (
                <div key={o.id} className="py-3 flex justify-between items-center text-sm">
                  <div>
                    <p className="font-medium">{o.customer_name || "Unknown"} • {o.customer_phone || "-"}</p>
                    <p className="text-xs text-muted-foreground">Order {o.woo_order_id || o.id.slice(0, 8)} • ৳{o.total_amount}</p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-muted">{o.order_status}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
