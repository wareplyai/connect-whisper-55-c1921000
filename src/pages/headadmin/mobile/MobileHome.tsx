import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuickStats } from "@/hooks/useHeadAdminStats";
import { Link } from "react-router-dom";
import {
  TrendingUp, Users, Smartphone, DollarSign, Receipt,
  UserPlus, CreditCard, ArrowUpRight, Bell,
} from "lucide-react";
import { toast } from "sonner";

type Activity = {
  id: string;
  kind: "registration" | "payment";
  title: string;
  amount?: number;
  currency?: string;
  status?: string;
  created_at: string;
};

function fmtMoney(amount: number, currency?: string) {
  const sym = currency === "BDT" ? "৳" : "$";
  return currency === "BDT"
    ? `${sym}${Math.round(amount).toLocaleString()}`
    : `${sym}${amount.toFixed(amount % 1 === 0 ? 0 : 2)}`;
}

function timeAgo(iso: string) {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return `${Math.max(1, Math.floor(d))}s`;
  if (d < 3600) return `${Math.floor(d / 60)}m`;
  if (d < 86400) return `${Math.floor(d / 3600)}h`;
  return `${Math.floor(d / 86400)}d`;
}

export default function MobileHome() {
  const stats = useQuickStats();
  const [activity, setActivity] = useState<Activity[]>([]);
  const [revenue, setRevenue] = useState(0);
  const seenRef = useRef<Set<string>>(new Set());
  const initRef = useRef(false);

  const load = async () => {
    const [{ data: regs }, { data: pays }, { data: salesData }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id,full_name,email,created_at")
        .order("created_at", { ascending: false })
        .limit(15),
      supabase
        .from("payment_transactions")
        .select("id,amount,currency,status,created_at,user_id,profiles:user_id(full_name,email)")
        .order("created_at", { ascending: false })
        .limit(15),
      supabase.from("sales").select("amount"),
    ]);
    setRevenue((salesData || []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0));

    const merged: Activity[] = [
      ...((regs || []).map((r: any) => ({
        id: `reg-${r.id}`,
        kind: "registration" as const,
        title: r.full_name || r.email || "New user",
        created_at: r.created_at,
      }))),
      ...((pays || []).map((p: any) => ({
        id: `pay-${p.id}`,
        kind: "payment" as const,
        title: p.profiles?.full_name || p.profiles?.email || "User",
        amount: Number(p.amount || 0),
        currency: p.currency || "USD",
        status: p.status,
        created_at: p.created_at,
      }))),
    ]
      .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
      .slice(0, 25);

    if (!initRef.current) {
      merged.forEach((m) => seenRef.current.add(m.id));
      initRef.current = true;
    } else {
      merged
        .filter((m) => !seenRef.current.has(m.id))
        .slice(0, 3)
        .forEach((n) => {
          seenRef.current.add(n.id);
          if (n.kind === "payment")
            toast.success(`💰 ${n.title} sent ${fmtMoney(n.amount || 0, n.currency)}`);
          else toast(`👤 ${n.title} just registered`);
        });
      merged.forEach((m) => seenRef.current.add(m.id));
    }

    setActivity(merged);
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 20000);
    const ch = supabase
      .channel("ha-mobile-home")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "profiles" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "payment_transactions" }, load)
      .subscribe();
    return () => {
      clearInterval(t);
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-5">
      {/* Hero balance card */}
      <div className="relative overflow-hidden rounded-3xl p-5 bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600 text-black shadow-2xl shadow-emerald-500/30">
        <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/20 blur-2xl" />
        <p className="text-xs font-semibold uppercase tracking-wider opacity-80">
          Total Revenue
        </p>
        <p className="text-4xl font-bold mt-1 tracking-tight">
          ৳{revenue.toLocaleString()}
        </p>
        <div className="flex items-center gap-1.5 mt-2 text-[12px] font-semibold">
          <TrendingUp className="h-3.5 w-3.5" />
          <span>{stats[0]?.delta}</span>
          <span className="opacity-70">growth</span>
        </div>
        <div className="grid grid-cols-2 gap-2.5 mt-5">
          <div className="rounded-2xl bg-black/25 backdrop-blur p-3">
            <p className="text-[10px] font-semibold opacity-70">Users</p>
            <p className="text-lg font-bold">{stats[0]?.value}</p>
          </div>
          <div className="rounded-2xl bg-black/25 backdrop-blur p-3">
            <p className="text-[10px] font-semibold opacity-70">Pending</p>
            <p className="text-lg font-bold">{stats[3]?.value}</p>
          </div>
        </div>
      </div>

      {/* Quick stat tiles */}
      <div className="grid grid-cols-2 gap-3">
        <StatTile icon={Users} label="Total Users" value={stats[0]?.value || "0"} accent="emerald" />
        <StatTile icon={Smartphone} label="Active Sessions" value={stats[1]?.value || "0"} accent="cyan" />
        <StatTile icon={DollarSign} label="Messages" value={stats[2]?.value || "0"} accent="violet" />
        <StatTile icon={Receipt} label="Pending Pay" value={stats[3]?.value || "0"} accent="amber" />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-4 gap-2">
        <QuickAction to="/headadmin/m/payments" icon={Receipt} label="Approve" />
        <QuickAction to="/headadmin/m/users" icon={Users} label="Users" />
        <QuickAction to="/headadmin/m/notifications" icon={Bell} label="Alerts" />
        <QuickAction to="/headadmin" icon={ArrowUpRight} label="Web" />
      </div>

      {/* Live feed */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-base font-bold">Recent Activity</h2>
          <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            LIVE
          </span>
        </div>
        <div className="rounded-3xl bg-white/5 border border-white/10 overflow-hidden backdrop-blur">
          {activity.length === 0 && (
            <p className="text-center text-sm text-white/60 py-8">No activity yet</p>
          )}
          {activity.map((a, idx) => {
            const Icon = a.kind === "payment" ? CreditCard : UserPlus;
            const tone =
              a.kind === "payment"
                ? "bg-amber-500/15 text-amber-400"
                : "bg-emerald-500/15 text-emerald-400";
            return (
              <div
                key={a.id}
                className={`flex items-center gap-3 px-4 py-3 ${
                  idx !== activity.length - 1 ? "border-b border-white/5" : ""
                }`}
              >
                <div className={`h-10 w-10 rounded-2xl grid place-items-center shrink-0 ${tone}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">
                    {a.kind === "payment"
                      ? `${a.title} • ${fmtMoney(a.amount || 0, a.currency)}`
                      : `${a.title} registered`}
                  </p>
                  <p className="text-[11px] text-white/60">
                    {a.kind === "payment" ? a.status : "New user"} • {timeAgo(a.created_at)} ago
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatTile({
  icon: Icon, label, value, accent,
}: { icon: any; label: string; value: string; accent: string }) {
  const tones: any = {
    emerald: "from-emerald-500/20 to-emerald-500/5 text-emerald-400 border-emerald-500/20",
    cyan: "from-cyan-500/20 to-cyan-500/5 text-cyan-400 border-cyan-500/20",
    violet: "from-violet-500/20 to-violet-500/5 text-violet-400 border-violet-500/20",
    amber: "from-amber-500/20 to-amber-500/5 text-amber-400 border-amber-500/20",
  };
  return (
    <div className={`rounded-2xl border p-3.5 bg-gradient-to-br ${tones[accent]}`}>
      <Icon className="h-5 w-5 mb-2" />
      <p className="text-[11px] text-white/60 font-medium">{label}</p>
      <p className="text-xl font-bold text-white">{value}</p>
    </div>
  );
}

function QuickAction({
  to, icon: Icon, label,
}: { to: string; icon: any; label: string }) {
  return (
    <Link
      to={to}
      className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
    >
      <div className="h-9 w-9 rounded-xl bg-emerald-500/20 text-emerald-400 grid place-items-center">
        <Icon className="h-4 w-4" />
      </div>
      <span className="text-[10px] font-semibold text-white">{label}</span>
    </Link>
  );
}
