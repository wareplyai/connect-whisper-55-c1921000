import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search, User, Smartphone, Calendar } from "lucide-react";

type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  plan: string | null;
  max_sessions: number | null;
  created_at: string;
};

export default function MobileUsers() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [q, setQ] = useState("");
  const [planFilter, setPlanFilter] = useState<string>("all");

  const load = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id,full_name,email,plan,max_sessions,created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    setUsers((data as any) || []);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("ha-mobile-users")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const plans = useMemo(() => {
    const s = new Set<string>();
    users.forEach((u) => u.plan && s.add(u.plan));
    return ["all", ...Array.from(s)];
  }, [users]);

  const filtered = users.filter((u) => {
    const ql = q.toLowerCase();
    const matchQ =
      !ql ||
      u.full_name?.toLowerCase().includes(ql) ||
      u.email?.toLowerCase().includes(ql);
    const matchPlan = planFilter === "all" || u.plan === planFilter;
    return matchQ && matchPlan;
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Users</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          {users.length} total users
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name or email..."
          className="w-full h-11 pl-10 pr-4 rounded-2xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-emerald-500/50"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {plans.map((p) => (
          <button
            key={p}
            onClick={() => setPlanFilter(p)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap uppercase ${
              planFilter === p
                ? "bg-emerald-500 text-black"
                : "bg-white/5 border border-white/10 text-muted-foreground"
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            <User className="h-8 w-8 mx-auto mb-2 opacity-30" />
            No users found
          </div>
        )}
        {filtered.map((u) => (
          <div
            key={u.id}
            className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur"
          >
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 grid place-items-center text-black font-bold text-sm shrink-0">
              {(u.full_name || u.email || "U").slice(0, 1).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">
                {u.full_name || "Unnamed"}
              </p>
              <p className="text-[11px] text-muted-foreground truncate">{u.email}</p>
              <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Smartphone className="h-3 w-3" />
                  {u.max_sessions || 0}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(u.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
            <span
              className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase shrink-0 ${
                u.plan === "trial"
                  ? "bg-amber-500/15 text-amber-400"
                  : u.plan
                  ? "bg-emerald-500/15 text-emerald-400"
                  : "bg-white/5 text-muted-foreground"
              }`}
            >
              {u.plan || "free"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
