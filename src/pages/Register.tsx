import { friendlyError } from "@/lib/friendlyError";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, Mail, Lock, User, ArrowRight } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthInput } from "@/components/auth/AuthInput";

const Register = () => {
  const nav = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agree) return toast.error("Please accept the Terms and Privacy Policy");
    if (password !== confirm) return toast.error("Passwords do not match");
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { full_name: fullName },
      },
    });
    if (error) {
      setLoading(false);
      return toast.error(friendlyError(error));
    }
    setLoading(false);
    // If a session was returned (email confirmation disabled), sign out — account must be approved first
    if (data.session) {
      await supabase.auth.signOut();
    }
    toast.success("Account create hoyeche! Apnar account pending. Approval er jonno admin er sathe contact korun: 01948695672 (WhatsApp/Call).", { duration: 14000 });
    nav("/login");
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Start automating WhatsApp in seconds"
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="text-foreground font-medium underline underline-offset-4 hover:text-primary transition-colors">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <AuthInput
          id="name"
          label="Full name"
          required
          placeholder="Alvi AI"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          icon={<User className="h-4 w-4" />}
        />
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

        <label className="flex items-start gap-2 text-sm text-muted-foreground cursor-pointer select-none pt-1">
          <Checkbox checked={agree} onCheckedChange={(v) => setAgree(!!v)} className="mt-0.5" />
          <span>
            I agree to the{" "}
            <Link to="/privacy" className="text-foreground underline underline-offset-4 hover:text-primary">Terms of Service</Link>{" "}
            and{" "}
            <Link to="/privacy" className="text-foreground underline underline-offset-4 hover:text-primary">Privacy Policy</Link>
          </span>
        </label>

        <Button
          type="submit"
          disabled={loading || !agree}
          className="group w-full h-12 rounded-xl bg-primary text-primary-foreground hover:bg-primary-hover font-medium disabled:opacity-50 shadow-[0_8px_30px_-8px_hsl(var(--primary)/0.6)]"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              Create account
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </>
          )}
        </Button>
      </form>
    </AuthShell>
  );
};

export default Register;
