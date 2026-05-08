import { forwardRef, InputHTMLAttributes, ReactNode, useState } from "react";
import { cn } from "@/lib/utils";
import { Eye, EyeOff } from "lucide-react";

interface AuthInputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: ReactNode;
  label: string;
  rightSlot?: ReactNode;
  togglePassword?: boolean;
}

export const AuthInput = forwardRef<HTMLInputElement, AuthInputProps>(
  ({ icon, label, rightSlot, togglePassword, type = "text", className, id, ...props }, ref) => {
    const [show, setShow] = useState(false);
    const isPwd = togglePassword && type === "password";
    const effectiveType = isPwd && show ? "text" : type;

    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor={id} className="text-xs font-medium text-muted-foreground tracking-wide uppercase">
            {label}
          </label>
          {rightSlot}
        </div>
        <div
          className={cn(
            "group relative flex items-center rounded-xl border border-border/70 bg-background/40 backdrop-blur-sm",
            "transition-all focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/20 hover:border-border"
          )}
        >
          {icon && (
            <div className="pl-3.5 pr-2 text-muted-foreground group-focus-within:text-primary transition-colors">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={id}
            type={effectiveType}
            className={cn(
              "flex-1 h-12 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground/60",
              icon ? "pl-0" : "pl-4",
              isPwd ? "pr-10" : "pr-4",
              className
            )}
            {...props}
          />
          {isPwd && (
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-3 text-muted-foreground hover:text-foreground transition-colors"
              tabIndex={-1}
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          )}
        </div>
      </div>
    );
  }
);
AuthInput.displayName = "AuthInput";
