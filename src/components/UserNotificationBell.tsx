import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Bell, X, Info, AlertTriangle, CheckCircle2, AlertOctagon } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  target: string;
  target_user_id: string | null;
  is_active: boolean;
  created_at: string;
}

const DISMISS_KEY = "dismissed_admin_notifications";

const typeStyles: Record<string, { icon: any; color: string; bg: string }> = {
  info: { icon: Info, color: "text-blue-500", bg: "bg-blue-500/10 border-blue-500/30" },
  warning: { icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/30" },
  success: { icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/30" },
  danger: { icon: AlertOctagon, color: "text-red-500", bg: "bg-red-500/10 border-red-500/30" },
};

export const UserNotificationBell = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
  const [dismissed, setDismissed] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(DISMISS_KEY) || "[]");
    } catch {
      return [];
    }
  });

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("admin_notifications")
      .select("*")
      .eq("is_active", true)
      .or(`target.eq.all,and(target.eq.user,target_user_id.eq.${user.id})`)
      .order("created_at", { ascending: false })
      .limit(50);
    setItems((data as Notification[]) || []);
  };

  useEffect(() => {
    if (!user) return;
    load();
    const channel = supabase
      .channel("admin_notifications_user")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "admin_notifications" },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const dismiss = (id: string) => {
    const next = [...dismissed, id];
    setDismissed(next);
    localStorage.setItem(DISMISS_KEY, JSON.stringify(next.slice(-500)));
  };

  const visible = items.filter((n) => !dismissed.includes(n.id));
  const unreadCount = visible.length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          aria-label="Notifications"
          className="relative h-9 w-9 grid place-items-center rounded-lg hover:bg-foreground/5 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Bell className="h-[18px] w-[18px]" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 grid place-items-center rounded-full bg-red-500 text-white text-[10px] font-bold ring-2 ring-background">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] p-0 max-h-[500px] overflow-hidden flex flex-col">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">Notifications</p>
            <p className="text-xs text-muted-foreground">
              {unreadCount === 0 ? "You're all caught up" : `${unreadCount} new`}
            </p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {visible.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-40" />
              No new notifications
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {visible.map((n) => {
                const style = typeStyles[n.type] || typeStyles.info;
                const Icon = style.icon;
                return (
                  <div
                    key={n.id}
                    className={`relative rounded-lg border p-3 ${style.bg}`}
                  >
                    <button
                      onClick={() => dismiss(n.id)}
                      className="absolute top-2 right-2 h-6 w-6 grid place-items-center rounded-md hover:bg-foreground/10 text-muted-foreground"
                      aria-label="Dismiss"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <div className="flex items-start gap-2.5 pr-6">
                      <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${style.color}`} />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">{n.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-wrap break-words">
                          {n.message}
                        </p>
                        <p className="text-[10px] text-muted-foreground/70 mt-1.5">
                          {new Date(n.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
