import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useLanguage } from "@/contexts/LanguageContext";

export const Navbar = () => {
  const { t } = useLanguage();
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <nav className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center">
          <Logo size={32} textClassName="text-base" />
        </Link>
        <div className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
          <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
          <Link to="/#how" className="hover:text-foreground transition-colors">{t("nav.how")}</Link>
          <Link to="/#pricing" className="hover:text-foreground transition-colors">{t("nav.pricing")}</Link>
          <Link to="/docs" className="hover:text-foreground transition-colors">{t("nav.docs")}</Link>
          <Link to="/#faq" className="hover:text-foreground transition-colors">{t("nav.help")}</Link>
        </div>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <ThemeToggle />
          <Button asChild variant="outline" size="sm">
            <Link to="/login">{t("nav.login")}</Link>
          </Button>
          <Button asChild size="sm" className="bg-primary text-primary-foreground hover:bg-primary-hover">
            <Link to="/register">{t("nav.getStarted")}</Link>
          </Button>
        </div>
      </nav>
    </header>
  );
};
