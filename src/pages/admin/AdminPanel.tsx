import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, Smartphone, MessageSquare, CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";

type PresetKey = "7d" | "30d" | "90d" | "all" | "custom";

const presets: { key: PresetKey; label: string }[] = [
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "90d", label: "Last 90 days" },
  { key: "all", label: "All time" },
];

function rangeFromPreset(key: PresetKey): DateRange | undefined {
  if (key === "all") return undefined;
  const to = new Date();
  const from = new Date();
  const days = key === "7d" ? 7 : key === "30d" ? 30 : key === "90d" ? 90 : 0;
  from.setDate(from.getDate() - days + 1);
  from.setHours(0, 0, 0, 0);
  return { from, to };
}

const AdminPanel = () => {
  const [stats, setStats] = useState({ customers: 0, sessions: 0, messages: 0 });
  const [preset, setPreset] = useState<PresetKey>("7d");
  const [range, setRange] = useState<DateRange | undefined>(rangeFromPreset("7d"));
  const [loading, setLoading] = useState(false);

  const rangeLabel = useMemo(() => {
    if (preset !== "custom") return presets.find((p) => p.key === preset)?.label || "";
    if (range?.from && range?.to) return `${format(range.from, "MMM d, yyyy")} – ${format(range.to, "MMM d, yyyy")}`;
    if (range?.from) return `From ${format(range.from, "MMM d, yyyy")}`;
    return "Custom range";
  }, [preset, range]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) {
        setStats({ customers: 0, sessions: 0, messages: 0 });
        setLoading(false);
        return;
      }

      let msgQ = supabase
        .from("incoming_messages")
        .select("*", { count: "exact", head: true })
        .eq("user_id", uid);
      if (range?.from) msgQ = msgQ.gte("received_at", range.from.toISOString());
      if (range?.to) {
        const end = new Date(range.to);
        end.setHours(23, 59, 59, 999);
        msgQ = msgQ.lte("received_at", end.toISOString());
      }

      const [custRes, sessRes, msgRes] = await Promise.all([
        supabase
          .from("incoming_messages")
          .select("from_number")
          .eq("user_id", uid)
          .eq("is_group", false),
        supabase
          .from("sessions")
          .select("*", { count: "exact", head: true })
          .eq("user_id", uid),
        msgQ,
      ]);

      const distinct = new Set((custRes.data || []).map((r: any) => r.from_number).filter(Boolean));
      setStats({
        customers: distinct.size,
        sessions: sessRes.count || 0,
        messages: msgRes.count || 0,
      });
      setLoading(false);
    })();
  }, [range?.from?.getTime(), range?.to?.getTime()]);

  const cards = [
    { label: "My Customers", value: stats.customers, icon: Users, sub: "All time" },
    { label: "My Sessions", value: stats.sessions, icon: Smartphone, sub: "All time" },
    { label: "My Messages", value: stats.messages, icon: MessageSquare, sub: rangeLabel },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Admin Panel</h1>
          <p className="text-sm text-muted-foreground">Your account overview and customer activity.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {presets.map((p) => (
            <Button
              key={p.key}
              size="sm"
              variant={preset === p.key ? "default" : "outline"}
              onClick={() => {
                setPreset(p.key);
                setRange(rangeFromPreset(p.key));
              }}
            >
              {p.key === "all" ? "All" : p.key.toUpperCase()}
            </Button>
          ))}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                size="sm"
                variant={preset === "custom" ? "default" : "outline"}
                className={cn("gap-2", !range && "text-muted-foreground")}
              >
                <CalendarIcon className="h-4 w-4" />
                {preset === "custom" && range?.from
                  ? range.to
                    ? `${format(range.from, "MMM d")} – ${format(range.to, "MMM d")}`
                    : format(range.from, "MMM d, yyyy")
                  : "Custom"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="range"
                numberOfMonths={2}
                selected={range}
                onSelect={(r) => {
                  setPreset("custom");
                  setRange(r);
                }}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card/50 px-4 py-2.5 text-xs text-muted-foreground">
        Message analytics filtered by: <span className="text-foreground font-medium">{rangeLabel}</span>
        {loading && <span className="ml-2 opacity-70">· loading…</span>}
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">{c.label}</span>
              <c.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-3xl font-bold">{c.value.toLocaleString()}</p>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground mt-1.5">{c.sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminPanel;
