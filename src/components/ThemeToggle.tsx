import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

export const ThemeToggle = ({ className = "" }: { className?: string }) => {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className={`p-2 rounded-lg hover:bg-foreground/5 text-muted-foreground hover:text-foreground transition-colors ${className}`}
    >
      {theme === "dark" ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
    </button>
  );
};

export default ThemeToggle;
