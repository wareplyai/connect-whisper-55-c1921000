import { useEffect, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { backendApi } from "@/lib/backend";
import { toast } from "sonner";

const ConnectSession = () => {
  const { id } = useParams();
  const nav = useNavigate();
  const [status, setStatus] = useState("qr_pending");
  const [session, setSession] = useState<any>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const redirectedRef = useRef(false);

  // Load session row
  useEffect(() => {
    if (!id) return;
    supabase.from("sessions").select("*").eq("id", id).maybeSingle().then(({ data }) => {
      setSession(data);
      if (data?.status) setStatus(data.status);
    });
  }, [id]);

  // Poll backend for QR / status every 3s
  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    const tick = async () => {
      try {
        const data = await backendApi.getQr(id);
        if (cancelled) return;
        if (data?.qr) setQr(data.qr);
        if (data?.status) {
          setStatus(data.status);
          // Sync to Supabase
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
        if (!cancelled) setError(err.message);
      }
    };

    tick();
    const interval = setInterval(tick, 3000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [id, nav]);

  // Render QR: backend may return data URL, raw string, or base64
  const qrSrc = qr
    ? (qr.startsWith("data:") || qr.startsWith("http")
        ? qr
        : `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(qr)}`)
    : null;

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <Link to="/dashboard/sessions" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
      <div className="rounded-2xl border border-border bg-card p-8 text-center">
        <h1 className="text-2xl font-bold">Scan QR Code</h1>
        <p className="text-sm text-muted-foreground mt-1">{session?.session_name}</p>

        {status === "connected" ? (
          <div className="my-12 space-y-3">
            <CheckCircle2 className="mx-auto h-16 w-16 text-primary" />
            <h2 className="text-xl font-semibold">Connected!</h2>
            <p className="text-sm text-muted-foreground">Redirecting...</p>
            <Button asChild className="bg-primary text-primary-foreground hover:bg-primary-hover">
              <Link to={`/dashboard/sessions/${id}`}>Continue</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="my-6 inline-block rounded-xl border-2 border-primary p-3 bg-white min-h-[260px] min-w-[260px] flex items-center justify-center">
              {qrSrc ? (
                <img src={qrSrc} alt="QR code" className="block w-[260px] h-[260px]" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="text-xs">Waiting for QR…</span>
                </div>
              )}
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <p className="text-xs text-muted-foreground">Auto-refreshing every 3s</p>
            <ol className="mt-6 text-left text-sm space-y-1.5 text-muted-foreground max-w-xs mx-auto">
              <li>1. Open WhatsApp on your phone</li>
              <li>2. Settings → Linked Devices</li>
              <li>3. Tap "Link a Device"</li>
              <li>4. Scan this QR code</li>
            </ol>
          </>
        )}
      </div>
    </div>
  );
};

export default ConnectSession;
