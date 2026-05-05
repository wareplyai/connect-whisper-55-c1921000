import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useLanguage } from "@/contexts/LanguageContext";

export const Navbar = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const goToSection = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    if (location.pathname !== "/") {
      navigate(`/#${id}`);
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
      history.replaceState(null, "", `/#${id}`);
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <nav className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center">
          <Logo size={32} textClassName="text-base" />
        </Link>
        <div className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
          <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
          <a href="/#how" onClick={(e) => goToSection(e, "how")} className="hover:text-foreground transition-colors">{t("nav.how")}</a>
          <a href="/#pricing" onClick={(e) => goToSection(e, "pricing")} className="hover:text-foreground transition-colors">{t("nav.pricing")}</a>
          <Link to="/docs" className="hover:text-foreground transition-colors">{t("nav.docs")}</Link>
          <a href="/#faq" onClick={(e) => goToSection(e, "faq")} className="hover:text-foreground transition-colors">{t("nav.help")}</a>
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

