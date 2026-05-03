import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const ConnectSession = () => {
  const { id } = useParams();
  const [status, setStatus] = useState("qr_pending");
  const [session, setSession] = useState<any>(null);
  const [seconds, setSeconds] = useState(60);

  useEffect(() => {
    if (!id) return;
    supabase.from("sessions").select("*").eq("id", id).maybeSingle().then(({ data }) => {
      setSession(data); setStatus(data?.status || "qr_pending");
    });

    const ch = supabase.channel(`s-${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "sessions", filter: `id=eq.${id}` },
        (p: any) => setStatus(p.new.status))
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [id]);

  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => (s <= 1 ? 60 : s - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  const qrSvg = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&bgcolor=111111&color=25D366&qzone=2&data=wa-session-${id}-${seconds}`;

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
            <p className="text-sm text-muted-foreground">Your WhatsApp is linked.</p>
            <Button asChild className="bg-primary text-primary-foreground hover:bg-primary-hover">
              <Link to={`/dashboard/sessions/${id}`}>Continue</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="my-6 inline-block rounded-xl border-2 border-primary p-3 bg-white">
              <img src={qrSvg} alt="QR code" className="block" />
            </div>
            <p className="text-xs text-muted-foreground">QR refreshes in {seconds}s</p>
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
