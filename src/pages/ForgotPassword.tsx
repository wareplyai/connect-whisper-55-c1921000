import { friendlyError } from "@/lib/friendlyError";
import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Mail, ArrowRight, CheckCircle2 } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthInput } from "@/components/auth/AuthInput";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) return toast.error(friendlyError(error));
    setSent(true);
    toast.success("Check your email for the reset link");
  };

  return (
    <AuthShell
      title="Forgot password?"
      subtitle="We'll email you a secure reset link"
      footer={
        <>
          Remember your password?{" "}
          <Link to="/login" className="text-foreground font-medium underline underline-offset-4 hover:text-primary transition-colors">
            Log in
          </Link>
        </>
      }
    >
      {sent ? (
        <div className="flex flex-col items-center text-center gap-3 py-4">
          <div className="h-14 w-14 rounded-full bg-primary/10 grid place-items-center text-primary">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <p className="text-sm text-muted-foreground">
            We've sent a password reset link to{" "}
            <span className="font-medium text-foreground">{email}</span>.
          </p>
        </div>
      ) : (
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
          <Button
            type="submit"
            disabled={loading}
            className="group w-full h-12 rounded-xl bg-primary text-primary-foreground hover:bg-primary-hover font-medium shadow-[0_8px_30px_-8px_hsl(var(--primary)/0.6)]"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Send reset link
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </Button>
        </form>
      )}
    </AuthShell>
  );
};

export default ForgotPassword;
