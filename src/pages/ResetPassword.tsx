import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const ResetPassword = () => {
  const nav = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase puts the recovery token in the URL hash and emits PASSWORD_RECOVERY
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    // Also accept if the user already has a recovery session
    supabase.auth.getSession().then(({ data }) => { if (data.session) setReady(true); });
    return () => sub.subscription.unsubscribe();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return toast.error("Password must be at least 6 characters");
    if (password !== confirm) return toast.error("Passwords do not match");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated");
    nav("/dashboard");
  };

  return (
    <div className="min-h-screen grid place-items-center bg-background p-4">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center mb-6">
          <span className="text-4xl font-black tracking-tight">Ws</span>
        </Link>
        <h1 className="text-2xl font-bold text-center text-foreground">Set a new password</h1>
        <p className="text-center text-sm text-muted-foreground mt-1.5">
          Enter your new password below
        </p>

        <form onSubmit={onSubmit} className="mt-7 space-y-4">
          <div>
            <Label htmlFor="password" className="text-sm font-medium">New password</Label>
            <Input id="password" type="password" required minLength={6} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5 h-11" />
          </div>
          <div>
            <Label htmlFor="confirm" className="text-sm font-medium">Confirm password</Label>
            <Input id="confirm" type="password" required placeholder="Confirm password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="mt-1.5 h-11" />
          </div>
          <Button type="submit" disabled={loading || !ready} className="w-full h-11 bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : ready ? "Update password" : "Waiting for recovery link..."}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link to="/login" className="text-foreground underline underline-offset-4">Back to login</Link>
        </p>
      </div>
    </div>
  );
};

export default ResetPassword;
