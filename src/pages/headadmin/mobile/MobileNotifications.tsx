import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { UserPlus, CreditCard, Loader2, Filter } from "lucide-react";
import { toast } from "sonner";

type Item = {
  id: string;
  kind: "registration" | "payment";
  title: string;
  subtitle?: string;
  created_at: string;
};

const PAGE = 25;

function timeAgo(iso: string) {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return `${Math.max(1, Math.floor(d))} sec ago`;
  if (d < 3600) return `${Math.floor(d / 60)} min ago`;
  if (d < 86400) return `${Math.floor(d / 3600)} hr ago`;
  return `${Math.floor(d / 86400)} day ago`;
}

async function fetchPage(beforeIso: string | null, limit: number): Promise<Item[]> {
  const regQ = supabase
    .from("profiles")
    .select("id,full_name,email,created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  const payQ = supabase
    .from("payment_transactions")
    .select("id,amount,currency,status,created_at,user_id,profiles:user_id(full_name,email)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (beforeIso) {
    regQ.lt("created_at", beforeIso);
    payQ.lt("created_at", beforeIso);
  }
  const [{ data: regs }, { data: pays }] = await Promise.all([regQ, payQ]);
  return [
    ...((regs || []).map((r: any) => ({
      id: `reg-${r.id}`,
      kind: "registration" as const,
      title: `${r.full_name || r.email || "User"} registered`,
      created_at: r.created_at,
    }))),
    ...((pays || []).map((p: any) => {
      const name = p.profiles?.full_name || p.profiles?.email || "User";
      const sym = p.currency === "BDT" ? "৳" : "$";
      const amt = Number(p.amount || 0);
      const formatted = p.currency === "BDT" ? Math.round(amt).toLocaleString() : amt.toFixed(amt % 1 === 0 ? 0 : 2);
      return {
        id: `pay-${p.id}`,
        kind: "payment" as const,
        title: `${name} sent ${sym}${formatted}`,
        subtitle: p.status,
        created_at: p.created_at,
      };
    })),
  ]
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
    .slice(0, limit);
}

export default function MobileNotifications() {
  const [items, setItems] = useState<Item[]>([]);
  const [filter, setFilter] = useState<"all" | "registration" | "payment">("all");
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const knownRef = useRef<Set<string>>(new Set());
  const initRef = useRef(false);

  const refresh = async () => {
    const fresh = await fetchPage(null, PAGE);
    setItems((prev) => {
      const map = new Map<string, Item>();
      [...fresh, ...prev].forEach((i) => map.set(i.id, i));
      return Array.from(map.values()).sort(
        (a, b) => +new Date(b.created_at) - +new Date(a.created_at)
      );
    });
    if (!initRef.current) {
      fresh.forEach((i) => knownRef.current.add(i.id));
      initRef.current = true;
      return;
    }
    fresh
      .filter((i) => !knownRef.current.has(i.id))
      .slice(0, 3)
      .forEach((n) => {
        knownRef.current.add(n.id);
        if (n.kind === "payment") toast.success(n.title);
        else toast(n.title);
      });
    fresh.forEach((i) => knownRef.current.add(i.id));
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore || items.length === 0) return;
    setLoadingMore(true);
    const more = await fetchPage(items[items.length - 1].created_at, PAGE);
    if (more.length === 0) setHasMore(false);
    setItems((prev) => {
      const map = new Map<string, Item>();
      [...prev, ...more].forEach((i) => map.set(i.id, i));
      return Array.from(map.values()).sort(
        (a, b) => +new Date(b.created_at) - +new Date(a.created_at)
      );
    });
    setLoadingMore(false);
  };

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 20000);
    const ch = supabase
      .channel("ha-mobile-notif")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "profiles" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "payment_transactions" }, refresh)
      .subscribe();
    return () => {
      clearInterval(t);
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = items.filter((i) => filter === "all" || i.kind === filter);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Notifications</h1>
        <p className="text-xs text-white/60 mt-0.5 flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Live updates from your platform
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {[
          { k: "all", label: "All" },
          { k: "registration", label: "Registrations" },
          { k: "payment", label: "Payments" },
        ].map((f) => (
          <button
            key={f.k}
            onClick={() => setFilter(f.k as any)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
              filter === f.k
                ? "bg-emerald-500 text-black"
                : "bg-white/5 border border-white/10 text-white/60"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div
        className="space-y-2"
        onScroll={(e) => {
          const el = e.currentTarget;
          if (el.scrollHeight - el.scrollTop - el.clientHeight < 80) loadMore();
        }}
      >
        {filtered.length === 0 && (
          <div className="text-center py-12 text-white/60 text-sm">
            <Filter className="h-8 w-8 mx-auto mb-2 opacity-30" />
            No notifications
          </div>
        )}
        {filtered.map((it) => {
          const Icon = it.kind === "payment" ? CreditCard : UserPlus;
          const tone =
            it.kind === "payment"
              ? "bg-amber-500/15 text-amber-400"
              : "bg-emerald-500/15 text-emerald-400";
          return (
            <div
              key={it.id}
              className="flex gap-3 p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur"
            >
              <div className={`h-11 w-11 rounded-2xl grid place-items-center shrink-0 ${tone}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold leading-snug">{it.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-[11px] text-white/60">{timeAgo(it.created_at)}</p>
                  {it.subtitle && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-white/5 text-white/60 uppercase">
                      {it.subtitle}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {hasMore && filtered.length > 0 && (
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="w-full py-3 rounded-2xl bg-white/5 border border-white/10 text-xs font-semibold text-white/60 flex items-center justify-center gap-2"
          >
            {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : "Load more"}
          </button>
        )}
      </div>
    </div>
  );
}
