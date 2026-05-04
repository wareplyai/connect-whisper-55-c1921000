import { useEffect, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Loader2,
  RefreshCw,
  ChevronRight,
  Smartphone,
  Settings,
  Link2,
  QrCode,
  Pencil,
  Webhook,
  Trash2,
  ShieldAlert,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { backendApi } from "@/lib/backend";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const QR_LIFETIME = 30; // seconds

const ConnectSession = () => {
  const { id } = useParams();
  const nav = useNavigate();
  const [status, setStatus] = useState("qr_pending");
  const [session, setSession] = useState<any>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(QR_LIFETIME);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<"scan" | "tips">("scan");
  const redirectedRef = useRef(false);

  // Load session
  useEffect(() => {
    if (!id) return;
    supabase.from("sessions").select("*").eq("id", id).maybeSingle().then(({ data }) => {
      setSession(data);
      if (data?.status) setStatus(data.status);
    });
  }, [id]);

  const fetchQr = async () => {
    if (!id) return;
    try {
      const data = await backendApi.getQr(id);
      if (data?.qr) {
        setQr(data.qr);
        setSecondsLeft(QR_LIFETIME);
      }
      if (data?.status) {
        setStatus(data.status);
        await supabase.from("sessions").update({
          status: data.status,
          last_active: new Date().toISOString(),
        }).eq("id", id);

        if (data.status === "connected" && !redirectedRef.current) {
          redirectedRef.current = true;
          toast.success("WhatsApp connected!");
          setTimeout(() => nav(`/dashboard/sessions/${id}`), 1500);
        }
      }
      setError(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Poll backend every 3s
  useEffect(() => {
    if (!id) return;
    fetchQr();
    const interval = setInterval(fetchQr, 3000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Countdown timer
  useEffect(() => {
    if (status === "connected") return;
    const t = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [status]);

  // Auto refresh QR every 30s
  useEffect(() => {
    if (secondsLeft === 0 && status !== "connected") {
      handleRefresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft]);

  const handleRefresh = async () => {
    if (!id || refreshing) return;
    setRefreshing(true);
    try {
      await backendApi.restart(id);
      setQr(null);
      setSecondsLeft(QR_LIFETIME);
      await fetchQr();
      toast.success("QR refreshed");
    } catch (e: any) {
      toast.error(e.message || "Failed to refresh");
    } finally {
      setRefreshing(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    if (!confirm("Delete this session?")) return;
    try {
      await backendApi.logout(id).catch(() => {});
      await supabase.from("sessions").delete().eq("id", id);
      toast.success("Session deleted");
      nav("/dashboard/sessions");
    } catch (e: any) {
      toast.error(e.message || "Failed");
    }
  };

  const qrSrc = qr
    ? (qr.startsWith("data:") || qr.startsWith("http")
        ? qr
        : `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(qr)}`)
    : null;

  const isConnected = status === "connected";

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/dashboard" className="hover:text-foreground">Dashboard</Link>
        <ChevronRight className="h-4 w-4" />
        <Link to="/dashboard/sessions" className="hover:text-foreground">WhatsApp Sessions</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">{session?.session_name || "Session"}</span>
      </nav>

      {/* Header actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{session?.session_name || "Connect Session"}</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Pencil className="h-4 w-4 mr-2" /> Edit
          </Button>
          <Button variant="outline" size="sm">
            <Webhook className="h-4 w-4 mr-2" /> Manage Webhook
          </Button>
          <Button variant="outline" size="sm" onClick={handleDelete} className="text-destructive hover:text-destructive">
            <Trash2 className="h-4 w-4 mr-2" /> Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        {/* Left panel */}
        <aside className="rounded-2xl border border-border bg-card p-6 space-y-5 h-fit">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Session Name</p>
            <p className="font-semibold mt-1">{session?.session_name || "—"}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Phone Number</p>
            <p className="font-semibold mt-1">{session?.phone_number || "Not connected yet"}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Status</p>
            {isConnected ? (
              <Badge className="bg-primary text-primary-foreground hover:bg-primary">
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Connected
              </Badge>
            ) : (
              <Badge className="bg-blue-500 text-white hover:bg-blue-500">
                <QrCode className="h-3.5 w-3.5 mr-1" /> Needs QR Scan
              </Badge>
            )}
          </div>
          <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground leading-relaxed">
            Scan the QR code with WhatsApp on your phone to connect this session. The QR auto-refreshes every {QR_LIFETIME} seconds.
          </div>
        </aside>

        {/* Main panel */}
        <main className="rounded-2xl border border-border bg-card p-6 space-y-6">
          {/* Tabs */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setTab("scan")}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                tab === "scan"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              <QrCode className="inline h-4 w-4 mr-2" />
              How to Scan QR Code
            </button>
            <button
              onClick={() => setTab("tips")}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                tab === "tips"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              <ShieldAlert className="inline h-4 w-4 mr-2" />
              Tips to avoid bans
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* QR area */}
            <div className="flex flex-col items-center text-center space-y-4">
              {isConnected ? (
                <div className="space-y-3 py-12">
                  <CheckCircle2 className="mx-auto h-20 w-20 text-primary" />
                  <Badge className="bg-primary text-primary-foreground hover:bg-primary text-base px-4 py-1">
                    Connected ✅
                  </Badge>
                  <p className="text-sm text-muted-foreground">Redirecting...</p>
                </div>
              ) : (
                <>
                  <div className="rounded-2xl border-4 border-primary p-4 bg-white shadow-lg">
                    {qrSrc ? (
                      <img src={qrSrc} alt="WhatsApp QR code" className="block w-[280px] h-[280px]" />
                    ) : (
                      <div className="w-[280px] h-[280px] flex flex-col items-center justify-center gap-2 text-muted-foreground">
                        <Loader2 className="h-10 w-10 animate-spin" />
                        <span className="text-sm">Waiting for QR…</span>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Expires in <span className="font-semibold text-foreground">{secondsLeft}</span> seconds
                  </p>
                  <Button onClick={handleRefresh} disabled={refreshing} variant="outline">
                    <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
                    Refresh QR Code
                  </Button>
                  {error && <p className="text-xs text-destructive">{error}</p>}
                </>
              )}
            </div>

            {/* Instructions / Tips */}
            <div>
              {tab === "scan" ? (
                <ol className="space-y-4">
                  {[
                    { icon: Smartphone, text: "Open WhatsApp on your phone" },
                    { icon: Settings, text: "Go to Settings → Linked Devices" },
                    { icon: Link2, text: 'Tap "Link a Device"' },
                    { icon: QrCode, text: "Scan this QR code" },
                  ].map((step, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm">
                        {i + 1}
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <step.icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{step.text}</span>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex gap-2"><span className="text-primary">•</span> Avoid sending bulk messages to unknown numbers.</li>
                  <li className="flex gap-2"><span className="text-primary">•</span> Warm up new numbers gradually over several days.</li>
                  <li className="flex gap-2"><span className="text-primary">•</span> Personalize messages — avoid identical content.</li>
                  <li className="flex gap-2"><span className="text-primary">•</span> Respect opt-outs and respond to user replies.</li>
                  <li className="flex gap-2"><span className="text-primary">•</span> Don't log in/out repeatedly in short periods.</li>
                </ul>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ConnectSession;
