import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface HeadAdminStats {
  totalUsers: number;
  activeSessions: number;
  totalMessages: number;
  totalRevenue: number;
  pendingPayments: number;
  newUsers30d: number;
  prevUsers30d: number;
  loading: boolean;
}

const empty: HeadAdminStats = {
  totalUsers: 0, activeSessions: 0, totalMessages: 0, totalRevenue: 0,
  pendingPayments: 0, newUsers30d: 0, prevUsers30d: 0, loading: true,
};

export function useHeadAdminStats(refreshMs = 30000) {
  const [stats, setStats] = useState<HeadAdminStats>(empty);

  const load = async () => {
    const now = new Date();
    const d30 = new Date(now.getTime() - 30 * 86400000).toISOString();
    const d60 = new Date(now.getTime() - 60 * 86400000).toISOString();

    const [users, sessionsConn, msgs, sales, pending, new30, prev30] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("sessions").select("id", { count: "exact", head: true }).eq("status", "connected"),
      supabase.from("message_logs").select("id", { count: "exact", head: true }),
      supabase.from("sales").select("amount"),
      supabase.from("payment_transactions").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", d30),
      supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", d60).lt("created_at", d30),
    ]);

    const revenue = (sales.data || []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0);

    setStats({
      totalUsers: users.count || 0,
      activeSessions: sessionsConn.count || 0,
      totalMessages: msgs.count || 0,
      totalRevenue: revenue,
      pendingPayments: pending.count || 0,
      newUsers30d: new30.count || 0,
      prevUsers30d: prev30.count || 0,
      loading: false,
    });
  };

  useEffect(() => {
    load();
    const t = setInterval(load, refreshMs);

    // realtime: refresh when relevant tables change
    const ch = supabase
      .channel("ha-stats")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "sessions" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "sales" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "payment_transactions" }, load)
      .subscribe();

    return () => {
      clearInterval(t);
      supabase.removeChannel(ch);
    };
  }, [refreshMs]);

  return stats;
}

const fmt = (n: number) => n.toLocaleString();
const pct = (curr: number, prev: number) => {
  if (prev <= 0) return curr > 0 ? "+100%" : "0%";
  const v = ((curr - prev) / prev) * 100;
  return `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;
};

export function useQuickStats() {
  const s = useHeadAdminStats();
  const growth = pct(s.newUsers30d, s.prevUsers30d);
  return [
    { label: "Total Users", value: fmt(s.totalUsers), delta: growth, up: !growth.startsWith("-") },
    { label: "Active Sessions", value: fmt(s.activeSessions), delta: "live", up: true },
    { label: "Total Messages", value: fmt(s.totalMessages), delta: "all-time", up: true },
    { label: "Pending Payments", value: fmt(s.pendingPayments), delta: s.pendingPayments > 0 ? "review" : "ok", up: s.pendingPayments === 0 },
  ];
}
