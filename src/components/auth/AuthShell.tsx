import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}

export const AuthShell = ({ title, subtitle, children, footer }: AuthShellProps) => {
  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background px-4 py-10 overflow-hidden">
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 h-[520px] w-[520px] rounded-full bg-primary/20 blur-[140px]" />
        <div className="absolute bottom-[-30%] right-[-10%] h-[420px] w-[420px] rounded-full bg-primary/10 blur-[140px]" />
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
      </div>

      <div className="relative w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <Link to="/" className="group">
            <div className="relative rounded-2xl p-3 bg-card/60 border border-border/60 backdrop-blur-md shadow-[0_10px_40px_-10px_hsl(var(--primary)/0.4)] transition-transform group-hover:scale-105">
              <Logo size={44} showText={false} />
            </div>
          </Link>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card/70 backdrop-blur-xl shadow-[0_24px_80px_-20px_rgba(0,0,0,0.6)] p-7 sm:p-8">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
            <p className="text-sm text-muted-foreground mt-2">{subtitle}</p>
          </div>

          {children}
        </div>

        {footer && (
          <p className="mt-6 text-center text-sm text-muted-foreground">{footer}</p>
        )}
      </div>
    </div>
  );
};
