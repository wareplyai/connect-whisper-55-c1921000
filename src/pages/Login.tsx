import { friendlyError } from "@/lib/friendlyError";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, Mail, Lock, ArrowRight } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthInput } from "@/components/auth/AuthInput";

const Login = () => {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data: signIn, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      const msg = (error.message || "").toLowerCase();
      if (msg.includes("not confirmed") || msg.includes("email not confirmed")) {
        return toast.error("Please confirm your email first. Check your inbox for the confirmation link.");
      }
      return toast.error(friendlyError(error));
    }

    const { data: prof } = await supabase
      .from("profiles")
      .select("is_active, approval_status")
      .eq("id", signIn.user!.id)
      .maybeSingle();

    if (!prof || prof.is_active === false) {
      await supabase.auth.signOut();
      setLoading(false);
      return toast.error("Your account has been deactivated. Please contact support.");
    }

    if ((prof as any).approval_status === 'rejected') {
      await supabase.auth.signOut();
      setLoading(false);
      return toast.error("Your account has been rejected. Contact admin: 01948695672", { duration: 10000 });
    }

    if ((prof as any).approval_status !== 'approved') {
      await supabase.auth.signOut();
      setLoading(false);
      return toast.error("Apnar account pending. Approval er jonno admin er sathe contact korun: 01948695672 (WhatsApp/Call). Approved hole login korte parben.", { duration: 12000 });
    }

    setLoading(false);
    toast.success("Welcome back!");
    nav("/dashboard");
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to continue to your dashboard"
      footer={
        <>
          Don't have an account?{" "}
          <Link to="/register" className="text-foreground font-medium underline underline-offset-4 hover:text-primary transition-colors">
            Sign up
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-5">
        <AuthInput
          id="email"
          label="Email address"
          type="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          icon={<Mail className="h-4 w-4" />}
        />
        <AuthInput
          id="password"
          label="Password"
          type="password"
          required
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          icon={<Lock className="h-4 w-4" />}
          togglePassword
          rightSlot={
            <Link to="/forgot-password" className="text-xs text-primary hover:underline underline-offset-4">
              Forgot password?
            </Link>
          }
        />

        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
          <Checkbox checked={remember} onCheckedChange={(v) => setRemember(!!v)} />
          Keep me signed in
        </label>

        <Button
          type="submit"
          disabled={loading}
          className="group w-full h-12 rounded-xl bg-primary text-primary-foreground hover:bg-primary-hover font-medium shadow-[0_8px_30px_-8px_hsl(var(--primary)/0.6)]"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              Sign in
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </>
          )}
        </Button>
      </form>
    </AuthShell>
  );
};

export default Login;
