import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { Loader2 } from "lucide-react";

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
    if (error) { setLoading(false); return toast.error(error.message); }
    setLoading(false);
    toast.success("Account created!");
    nav("/dashboard");
  };

  return (
    <div className="min-h-screen grid place-items-center bg-background p-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center mb-6">
          <Logo size={56} showText={false} />
        </Link>
        <h1 className="text-2xl font-bold text-center text-foreground">Create an account</h1>
        <p className="text-center text-sm text-muted-foreground mt-1.5">
          Enter your details below to create your account
        </p>

        <form onSubmit={onSubmit} className="mt-7 space-y-4">
          <div>
            <Label htmlFor="name" className="text-sm font-medium">Name</Label>
            <Input id="name" required placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1.5 h-11" />
          </div>
          <div>
            <Label htmlFor="email" className="text-sm font-medium">Email address</Label>
            <Input id="email" type="email" required placeholder="email@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5 h-11" />
          </div>
          <div>
            <Label htmlFor="password" className="text-sm font-medium">Password</Label>
            <Input id="password" type="password" required minLength={6} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5 h-11" />
          </div>
          <div>
            <Label htmlFor="confirm" className="text-sm font-medium">Confirm password</Label>
            <Input id="confirm" type="password" required placeholder="Confirm password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="mt-1.5 h-11" />
          </div>
          <label className="flex items-start gap-2 text-sm cursor-pointer select-none">
            <Checkbox checked={agree} onCheckedChange={(v) => setAgree(!!v)} className="mt-0.5" />
            <span className="text-muted-foreground">
              I agree to the <Link to="/terms" className="text-foreground underline underline-offset-4">Terms of Service</Link> and{" "}
              <Link to="/privacy" className="text-foreground underline underline-offset-4">Privacy Policy</Link>
            </span>
          </label>
          <Button type="submit" disabled={loading || !agree} className="w-full h-11 bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create account"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="text-foreground underline underline-offset-4">Log in</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
