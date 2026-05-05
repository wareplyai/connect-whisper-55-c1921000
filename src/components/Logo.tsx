import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";

interface LogoProps {
  size?: number;
  showText?: boolean;
  textClassName?: string;
  className?: string;
}

export const Logo = ({ size = 32, showText = true, textClassName, className }: LogoProps) => (
  <span className={cn("inline-flex items-center gap-2", className)}>
    <img
      src={logo}
      alt="WaReply AI"
      width={size}
      height={size}
      className="rounded-lg object-cover shrink-0"
      style={{ width: size, height: size }}
    />
    {showText && (
      <span className={cn("font-semibold tracking-tight", textClassName)}>WaReply AI</span>
    )}
  </span>
);

export default Logo;
