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

const Login = () => {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back!");
    nav("/dashboard");
  };

  const oauth = async (provider: "google" | "github") => {
    setOauthLoading(provider);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
    if (error) { setOauthLoading(null); toast.error(error.message); }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-background p-4">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center mb-6">
          <Logo size={56} showText={false} />
        </Link>
        <h1 className="text-2xl font-bold text-center text-foreground">Log in to your account</h1>
        <p className="text-center text-sm text-muted-foreground mt-1.5">
          Enter your email and password below to log in
        </p>

        <div className="mt-7 grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={!!oauthLoading}
            onClick={() => oauth("github")}
            className="h-11"
          >
            {oauthLoading === "github" ? <Loader2 className="h-4 w-4 animate-spin" /> : (
              <>
                <svg viewBox="0 0 24 24" className="h-4 w-4 mr-2 fill-current"><path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.27-1.69-1.27-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.68 1.24 3.34.95.1-.74.4-1.24.72-1.53-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.18-3.1-.12-.3-.51-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.21-1.49 3.18-1.18 3.18-1.18.62 1.59.23 2.75.11 3.05.74.81 1.18 1.84 1.18 3.1 0 4.43-2.69 5.4-5.26 5.69.41.36.78 1.06.78 2.15v3.18c0 .31.21.67.8.55C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z"/></svg>
                Continue with GitHub
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!!oauthLoading}
            onClick={() => oauth("google")}
            className="h-11"
          >
            {oauthLoading === "google" ? <Loader2 className="h-4 w-4 animate-spin" /> : (
              <>
                <svg viewBox="0 0 24 24" className="h-4 w-4 mr-2"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.07H2.18A11 11 0 0 0 1 12c0 1.77.43 3.45 1.18 4.93l3.66-2.83z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.46 2.1 14.97 1 12 1A11 11 0 0 0 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z"/></svg>
                Continue with Google
              </>
            )}
          </Button>
        </div>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="email" className="text-sm font-medium">Email address</Label>
            <Input
              id="email"
              type="email"
              required
              placeholder="email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 h-11"
            />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <Link to="/forgot-password" className="text-sm text-foreground underline-offset-4 hover:underline">
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              required
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 h-11"
            />
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <Checkbox checked={remember} onCheckedChange={(v) => setRemember(!!v)} />
            Remember me
          </label>
          <Button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-foreground text-background hover:bg-foreground/90"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Log in"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Link to="/register" className="text-foreground underline underline-offset-4">Sign up</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
