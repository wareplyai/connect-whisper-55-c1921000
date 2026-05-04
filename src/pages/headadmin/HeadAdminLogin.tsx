import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Crown } from "lucide-react";
import { useHeadAdmin } from "@/contexts/HeadAdminContext";

export default function HeadAdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { headAdmin, refresh } = useHeadAdmin();

  useEffect(() => {
    if (headAdmin) navigate("/headadmin", { replace: true });
  }, [headAdmin, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data: signIn, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !signIn.user) {
      toast.error(error?.message || "Login failed");
      setLoading(false);
      return;
    }
    const { data: ha } = await supabase
      .from("headadmin")
      .select("*")
      .eq("auth_user_id", signIn.user.id)
      .eq("is_active", true)
      .maybeSingle();
    if (!ha) {
      await supabase.auth.signOut();
      toast.error("Access Denied — not a head admin");
      setLoading(false);
      return;
    }
    await supabase.from("headadmin").update({ last_login: new Date().toISOString() }).eq("id", ha.id);
    await supabase.from("activity_logs").insert({
      action: "headadmin.login", actor_type: "headadmin", actor_id: ha.id,
    });
    await refresh();
    toast.success("Welcome back");
    navigate("/headadmin", { replace: true });
  };

  return (
    <div className="min-h-screen grid place-items-center bg-hero p-4">
      <Card className="w-full max-w-md p-8 bg-card border-border">
        <div className="flex flex-col items-center mb-6">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 grid place-items-center text-primary mb-3">
            <Crown className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-semibold">Head Admin</h1>
          <p className="text-sm text-muted-foreground mt-1">Restricted area — owner access only</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Password</Label>
            <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
