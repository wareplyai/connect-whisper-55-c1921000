import { useEffect, useMemo, useState } from "react";
import { Bell, UserPlus, CreditCard, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

type Item = {
  id: string;
  kind: "registration" | "payment";
  title: string;
  subtitle?: string;
  created_at: string;
  href: string;
};

const LS_KEY = "headadmin_notifications_last_seen";

function timeAgo(iso: string) {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return `${Math.max(1, Math.floor(d))} sec ago`;
  if (d < 3600) return `${Math.floor(d / 60)} min ago`;
  if (d < 86400) return `${Math.floor(d / 3600)} hr ago`;
  return `${Math.floor(d / 86400)} day ago`;
}

export function NotificationBell() {
  const [items, setItems] = useState<Item[]>([]);
  const [open, setOpen] = useState(false);
  const [lastSeen, setLastSeen] = useState<number>(() => {
    const v = localStorage.getItem(LS_KEY);
    return v ? Number(v) : 0;
  });

  const load = async () => {
    const since = new Date(Date.now() - 7 * 86400000).toISOString();
    const [{ data: regs }, { data: pays }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id,full_name,email,created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(15),
      supabase
        .from("payment_transactions")
        .select("id,amount,status,created_at,user_id,profiles:user_id(full_name,email)")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(15),
    ]);

    const merged: Item[] = [
      ...((regs || []).map((r: any) => ({
        id: `reg-${r.id}`,
        kind: "registration" as const,
        title: `New user ${r.full_name || r.email || "registered"} registered`,
        created_at: r.created_at,
        href: "/headadmin/users",
      }))),
      ...((pays || []).map((p: any) => {
        const name = p.profiles?.full_name || p.profiles?.email || "User";
        return {
          id: `pay-${p.id}`,
          kind: "payment" as const,
          title: `${name} submitted ৳${Number(p.amount || 0)} payment`,
          subtitle: p.status,
          created_at: p.created_at,
          href: "/headadmin/payments",
        };
      })),
    ]
      .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
      .slice(0, 20);

    setItems(merged);
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    const ch = supabase
      .channel("headadmin-notif")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "profiles" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "payment_transactions" }, load)
      .subscribe();
    return () => {
      clearInterval(t);
      supabase.removeChannel(ch);
    };
  }, []);

  const unread = useMemo(
    () => items.filter((i) => +new Date(i.created_at) > lastSeen).length,
    [items, lastSeen]
  );

  const markSeen = () => {
    const now = Date.now();
    localStorage.setItem(LS_KEY, String(now));
    setLastSeen(now);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) markSeen();
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
        className="w-[360px] p-0 bg-card border-border"
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
        <div className="max-h-[420px] overflow-y-auto">
          {items.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No new notifications
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
              <Link
                key={it.id}
                to={it.href}
                onClick={() => setOpen(false)}
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
              </Link>
            );
          })}
        </div>
        <Link
          to="/headadmin/notifications"
          onClick={() => setOpen(false)}
          className="block text-center text-xs text-primary hover:underline py-2.5 border-t border-border"
        >
          View all
        </Link>
      </PopoverContent>
    </Popover>
  );
}
