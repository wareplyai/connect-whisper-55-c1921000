import { friendlyError } from "@/lib/friendlyError";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Lock, ArrowRight } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthInput } from "@/components/auth/AuthInput";

const ResetPassword = () => {
  const nav = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
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
    if (error) return toast.error(friendlyError(error));
    toast.success("Password updated");
    nav("/dashboard");
  };

  return (
    <AuthShell
      title="Set a new password"
      subtitle="Choose a strong password you haven't used before"
      footer={
        <Link to="/login" className="text-foreground font-medium underline underline-offset-4 hover:text-primary transition-colors">
          Back to login
        </Link>
      }
    >
      <form onSubmit={onSubmit} className="space-y-5">
        <AuthInput
          id="password"
          label="New password"
          type="password"
          required
          minLength={6}
          placeholder="At least 6 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          icon={<Lock className="h-4 w-4" />}
          togglePassword
        />
        <AuthInput
          id="confirm"
          label="Confirm password"
          type="password"
          required
          placeholder="Re-enter password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          icon={<Lock className="h-4 w-4" />}
          togglePassword
        />
        <Button
          type="submit"
          disabled={loading || !ready}
          className="group w-full h-12 rounded-xl bg-primary text-primary-foreground hover:bg-primary-hover font-medium disabled:opacity-50 shadow-[0_8px_30px_-8px_hsl(var(--primary)/0.6)]"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : ready ? (
            <>
              Update password
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </>
          ) : (
            "Waiting for recovery link..."
          )}
        </Button>
      </form>
    </AuthShell>
  );
};

export default ResetPassword;
