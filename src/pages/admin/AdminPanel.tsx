import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, Smartphone, MessageSquare } from "lucide-react";

const AdminPanel = () => {
  const [stats, setStats] = useState({ users: 0, sessions: 0, messages: 0 });
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const [u, s, m, list] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("sessions").select("*", { count: "exact", head: true }),
        supabase.from("message_logs").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(20),
      ]);
      setStats({ users: u.count || 0, sessions: s.count || 0, messages: m.count || 0 });
      setUsers(list.data || []);
    })();
  }, []);

  const cards = [
    { label: "Total Users", value: stats.users, icon: Users },
    { label: "Total Sessions", value: stats.sessions, icon: Smartphone },
    { label: "Total Messages", value: stats.messages, icon: MessageSquare },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Panel</h1>
        <p className="text-sm text-muted-foreground">Platform-wide overview and user management.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">{c.label}</span>
              <c.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-3xl font-bold">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="font-semibold mb-4">All Users</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr><th className="text-left py-2">Name</th><th className="text-left">Email</th><th className="text-left">Plan</th><th className="text-left">Status</th><th className="text-right">Created</th></tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-border">
                  <td className="py-2.5">{u.full_name || "—"}</td>
                  <td>{u.email}</td>
                  <td><span className="px-2 py-0.5 rounded-full bg-card-elevated text-xs capitalize">{u.plan}</span></td>
                  <td><span className={`px-2 py-0.5 rounded-full text-xs ${u.is_active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>{u.is_active ? "Active" : "Inactive"}</span></td>
                  <td className="text-right text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">No users yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
