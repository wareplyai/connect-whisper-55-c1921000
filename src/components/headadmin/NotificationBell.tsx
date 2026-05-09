import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, UserPlus, CreditCard, X, Loader2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Item = {
  id: string;
  kind: "registration" | "payment";
  title: string;
  subtitle?: string;
  created_at: string;
};

const LS_SEEN = "headadmin_notifications_last_seen";
const PAGE = 20;

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
    .select("id,amount,status,created_at,user_id,profiles:user_id(full_name,email)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (beforeIso) {
    regQ.lt("created_at", beforeIso);
    payQ.lt("created_at", beforeIso);
  }
  const [{ data: regs }, { data: pays }] = await Promise.all([regQ, payQ]);
  const merged: Item[] = [
    ...((regs || []).map((r: any) => ({
      id: `reg-${r.id}`,
      kind: "registration" as const,
      title: `New user ${r.full_name || r.email || "registered"} registered`,
      created_at: r.created_at,
    }))),
    ...((pays || []).map((p: any) => {
      const name = p.profiles?.full_name || p.profiles?.email || "User";
      return {
        id: `pay-${p.id}`,
        kind: "payment" as const,
        title: `${name} submitted ৳${Number(p.amount || 0)} payment`,
        subtitle: p.status,
        created_at: p.created_at,
      };
    })),
  ].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
  return merged.slice(0, limit);
}

export function NotificationBell() {
  const [items, setItems] = useState<Item[]>([]);
  const [open, setOpen] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const openRef = useRef(open);
  const knownIdsRef = useRef<Set<string>>(new Set());
  const initialLoadedRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [lastSeen, setLastSeen] = useState<number>(() => {
    const v = localStorage.getItem(LS_SEEN);
    return v ? Number(v) : Date.now();
  });

  useEffect(() => { openRef.current = open; }, [open]);

  const refreshTop = async () => {
    const fresh = await fetchPage(null, PAGE);
    setItems((prev) => {
      const map = new Map<string, Item>();
      [...fresh, ...prev].forEach((i) => map.set(i.id, i));
      const arr = Array.from(map.values()).sort(
        (a, b) => +new Date(b.created_at) - +new Date(a.created_at)
      );
      return arr;
    });

    if (!initialLoadedRef.current) {
      fresh.forEach((i) => knownIdsRef.current.add(i.id));
      initialLoadedRef.current = true;
      return;
    }

    const newOnes = fresh.filter((i) => !knownIdsRef.current.has(i.id));
    newOnes.forEach((i) => knownIdsRef.current.add(i.id));

    if (!openRef.current && newOnes.length > 0) {
      newOnes.slice(0, 3).forEach((n) => {
        if (n.kind === "payment") toast.success(n.title);
        else toast(n.title, { description: "New registration" });
      });
    }
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore || items.length === 0) return;
    setLoadingMore(true);
    const oldest = items[items.length - 1].created_at;
    const more = await fetchPage(oldest, PAGE);
    if (more.length === 0) setHasMore(false);
    setItems((prev) => {
      const map = new Map<string, Item>();
      [...prev, ...more].forEach((i) => map.set(i.id, i));
      return Array.from(map.values()).sort(
        (a, b) => +new Date(b.created_at) - +new Date(a.created_at)
      );
    });
    more.forEach((i) => knownIdsRef.current.add(i.id));
    setLoadingMore(false);
  };

  useEffect(() => {
    refreshTop();
    const t = setInterval(refreshTop, 30000);
    const ch = supabase
      .channel("headadmin-notif")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "profiles" }, refreshTop)
      .on("postgres_changes", { event: "*", schema: "public", table: "payment_transactions" }, refreshTop)
      .subscribe();
    return () => {
      clearInterval(t);
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const unread = useMemo(
    () => items.filter((i) => +new Date(i.created_at) > lastSeen).length,
    [items, lastSeen]
  );

  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 60) {
      loadMore();
    }
  };

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) {
          const now = Date.now();
          localStorage.setItem(LS_SEEN, String(now));
          setLastSeen(now);
        }
      }}
    >
      <PopoverTrigger asChild>
        <button
          aria-label="Notifications"
          className="relative p-2 rounded-lg hover:bg-foreground/5 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Bell className="h-[18px] w-[18px]" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-primary text-[10px] font-bold text-primary-foreground grid place-items-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[360px] p-0 bg-card border border-border shadow-xl z-[100]"
        sideOffset={8}
      >
        <div className="flex items-center justify-between px-4 h-11 border-b border-border">
          <p className="text-sm font-semibold">Notifications</p>
          <button
            onClick={() => setOpen(false)}
            className="p-1 rounded hover:bg-foreground/5 text-muted-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div
          ref={scrollRef}
          onScroll={onScroll}
          className="max-h-[420px] overflow-y-auto"
        >
          {items.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No notifications
            </div>
          )}
          {items.map((it) => {
            const isNew = +new Date(it.created_at) > lastSeen;
            const Icon = it.kind === "payment" ? CreditCard : UserPlus;
            const tone =
              it.kind === "payment"
                ? "text-success bg-success/10"
                : "text-primary bg-primary/10";
            return (
              <div
                key={it.id}
                className="flex gap-3 px-4 py-3 border-b border-border/60 hover:bg-foreground/5 transition-colors"
              >
                <div className={`shrink-0 h-9 w-9 rounded-full grid place-items-center ${tone}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground leading-snug">{it.title}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {timeAgo(it.created_at)}
                  </p>
                </div>
                {isNew && (
                  <span className="self-center h-2 w-2 rounded-full bg-primary shrink-0" />
                )}
              </div>
            );
          })}
          {loadingMore && (
            <div className="flex justify-center py-3 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          )}
          {!hasMore && items.length > 0 && (
            <div className="text-center text-[11px] text-muted-foreground py-2.5">
              No more notifications
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
