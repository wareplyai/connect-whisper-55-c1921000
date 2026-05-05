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
          <a href="#features" className="hover:text-foreground transition-colors">{t("nav.features")}</a>
          <a href="#how" className="hover:text-foreground transition-colors">{t("nav.how")}</a>
          <a href="#pricing" className="hover:text-foreground transition-colors">{t("nav.pricing")}</a>
          <a href="#faq" className="hover:text-foreground transition-colors">{t("nav.docs")}</a>
          <a href="#faq" className="hover:text-foreground transition-colors">{t("nav.help")}</a>
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
