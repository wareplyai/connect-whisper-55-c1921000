import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, RefreshCw, Search, Smartphone, Trash2, Eye, Edit, Link as LinkIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { AI_REPLY_WEBHOOK_URL, backendApi, extractGatewayApiToken } from "@/lib/backend";
import { PlanUsageBar } from "@/components/PlanUsageBar";
import { NoActiveSubscriptionBanner } from "@/components/NoActiveSubscriptionBanner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { friendlyError } from "@/lib/friendlyError";

const statusBadge = (s: string) => {
  if (s === "connected") return "bg-primary/15 text-primary";
  if (s === "qr_pending") return "bg-warning/15 text-warning";
  return "bg-muted text-muted-foreground";
};

const Sessions = () => {
  const { profile } = useAuth();
  const [sessions, setSessions] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [hasActive, setHasActive] = useState<boolean | null>(null);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const { data } = await supabase.rpc("has_active_service", { _user_id: profile.id });
      setHasActive(!!data);
    })();
  }, [profile]);

  const load = async () => {
    if (!profile) return;
    setLoading(true);
    const { data } = await supabase.from("sessions").select("*").eq("user_id", profile.id).order("created_at", { ascending: false });
    setSessions(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [profile]);

  // Poll backend status for each session every 10s
  useEffect(() => {
    if (sessions.length === 0) return;
    let cancelled = false;

    const pollAll = async () => {
      await Promise.all(sessions.map(async (s) => {
        try {
          const data = await backendApi.getStatus(s.id);
          if (cancelled) return;
          const apiToken = extractGatewayApiToken(data);
          const update: any = {};
          if (data?.status && data.status !== s.status) update.status = data.status;
          if (data?.phone && data.phone !== s.phone_number) update.phone_number = data.phone;
          if (data?.name && data.name !== s.whatsapp_name) update.whatsapp_name = data.name;
          if (apiToken && apiToken !== s.api_token) update.api_token = apiToken;
          if (data?.status === "connected") update.last_active = new Date().toISOString();
          if (Object.keys(update).length === 0) return;
          await supabase.from("sessions").update(update).eq("id", s.id);
          if (apiToken && s.enable_webhook && (!s.webhook_url || s.webhook_url === AI_REPLY_WEBHOOK_URL)) {
            await backendApi.configureWebhook(s.id, apiToken, s.webhook_secret, s.webhook_events || ["messages.received", "message.sent"]).catch(() => {});
          }
          if (!cancelled) {
            setSessions((prev) => prev.map((x) => x.id === s.id ? { ...x, ...update } : x));
          }
        } catch { /* ignore individual failures */ }
      }));
    };

    const interval = setInterval(pollAll, 10000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [sessions.length]);

  const remove = async (id: string) => {
    if (!confirm("Delete this session?")) return;
    await backendApi.logout(id).catch(() => {});
    const { error } = await supabase.from("sessions").delete().eq("id", id);
    if (error) toast.error(friendlyError(error)); else { toast.success("Session deleted"); load(); }
  };

  const visible = sessions.filter(
    (s) =>
      (filter === "all" || s.status === filter) &&
      (q === "" || s.session_name.toLowerCase().includes(q.toLowerCase()) || (s.phone_number || "").includes(q))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">WhatsApp Sessions</h1>
          <p className="text-sm text-muted-foreground">Manage your WhatsApp sessions and connections</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">Help Center</Button>
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1.5" /> Refresh</Button>
          {hasActive === false ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={0}>
                    <Button size="sm" disabled className="bg-primary text-primary-foreground opacity-60 cursor-not-allowed">
                      <Plus className="h-4 w-4 mr-1.5" /> New Session
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">You need an active subscription to create WhatsApp sessions.</p>
                  <Link to="/dashboard/subscription/plans" className="text-xs text-primary underline">View Subscription</Link>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <Button asChild size="sm" className="bg-primary text-primary-foreground hover:bg-primary-hover">
              <Link to="/dashboard/sessions/create"><Plus className="h-4 w-4 mr-1.5" /> New Session</Link>
            </Button>
          )}
        </div>
      </div>

      {hasActive === false && <NoActiveSubscriptionBanner />}

      <PlanUsageBar />

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search sessions..." className="pl-9" />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="connected">Connected</SelectItem>
            <SelectItem value="disconnected">Disconnected</SelectItem>
            <SelectItem value="qr_pending">QR Pending</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="grid gap-3">
          {[1, 2].map((i) => <div key={i} className="h-24 rounded-xl border border-border bg-card animate-pulse" />)}
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <Smartphone className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold">No WhatsApp Sessions</h3>
          <p className="text-sm text-muted-foreground mt-1">You haven't created any sessions yet. Create your first one to get started.</p>
          {hasActive === false ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={0} className="inline-block mt-4">
                    <Button disabled className="bg-primary text-primary-foreground opacity-60 cursor-not-allowed">
                      <Plus className="h-4 w-4 mr-1.5" /> New Session
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">You need an active subscription to create WhatsApp sessions.</p>
                  <Link to="/dashboard/subscription/plans" className="text-xs text-primary underline">View Subscription</Link>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <Button asChild className="mt-4 bg-primary text-primary-foreground hover:bg-primary-hover">
              <Link to="/dashboard/sessions/create"><Plus className="h-4 w-4 mr-1.5" /> New Session</Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-3">
          {visible.map((s) => {
            const isConnected = s.status === "connected";
            const needsQr = s.status === "qr_pending" || s.status === "pending";
            return (
              <div key={s.id} className="rounded-xl border border-border bg-card p-5 flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="font-semibold truncate">{s.session_name}</h3>
                    {isConnected ? (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-green-500/15 text-green-500 font-medium">● Connected</span>
                    ) : needsQr ? (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-blue-500/15 text-blue-500 font-medium">● Needs QR Scan</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-red-500/15 text-red-500 font-medium">● Disconnected</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{s.phone_number || "No phone linked"}</p>
                  <p className="text-xs text-muted-foreground mt-1">Last active: {s.last_active ? new Date(s.last_active).toLocaleString() : "Never"}</p>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {isConnected ? (
                    <>
                      <Button asChild variant="outline" size="sm"><Link to={`/dashboard/sessions/${s.id}`}><Eye className="h-4 w-4 mr-1" /> View</Link></Button>
                      <Button variant="outline" size="sm" onClick={() => remove(s.id)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                    </>
                  ) : (
                    <>
                      <Button asChild variant="outline" size="sm"><Link to={`/dashboard/sessions/${s.id}/edit`}><Edit className="h-4 w-4 mr-1" /> Edit</Link></Button>
                      <Button variant="outline" size="sm" onClick={() => remove(s.id)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4 mr-1" /> Delete</Button>
                      <Button asChild size="sm" className="bg-primary text-primary-foreground hover:bg-primary-hover">
                        <Link to={`/dashboard/sessions/${s.id}/connect`}><LinkIcon className="h-4 w-4 mr-1" /> Connect</Link>
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Sessions;
