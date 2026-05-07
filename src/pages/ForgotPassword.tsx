import { friendlyError } from "@/lib/friendlyError";
import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { Loader2 } from "lucide-react";

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
    <div className="min-h-screen grid place-items-center bg-background p-4">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center mb-6">
          <Logo size={56} showText={false} />
        </Link>
        <h1 className="text-2xl font-bold text-center text-foreground">Forgot your password?</h1>
        <p className="text-center text-sm text-muted-foreground mt-1.5">
          Enter your email and we'll send you a reset link
        </p>

        {sent ? (
          <div className="mt-7 rounded-lg border border-border bg-card p-5 text-sm text-center">
            We've sent a password reset link to <span className="font-medium text-foreground">{email}</span>.
            Check your inbox and follow the instructions.
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-7 space-y-4">
            <div>
              <Label htmlFor="email" className="text-sm font-medium">Email address</Label>
              <Input id="email" type="email" required placeholder="email@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5 h-11" />
            </div>
            <Button type="submit" disabled={loading} className="w-full h-11 bg-foreground text-background hover:bg-foreground/90">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send reset link"}
            </Button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Remember your password?{" "}
          <Link to="/login" className="text-foreground underline underline-offset-4">Log in</Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
