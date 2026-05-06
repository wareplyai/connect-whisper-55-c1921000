import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Menu, X } from "lucide-react";
import { useState, useEffect } from "react";

export const Navbar = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const goToSection = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    setOpen(false);
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

  const goHome = (e: React.MouseEvent) => {
    setOpen(false);
    if (location.pathname === "/") {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
      history.replaceState(null, "", "/");
    }
  };

  const displayName = profile?.full_name || profile?.email?.split("@")[0] || "Account";

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <nav className="container flex h-16 items-center justify-between gap-2">
        <Link to="/" className="flex items-center" onClick={goHome}>
          <Logo size={32} textClassName="text-base" />
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
          <Link to="/" onClick={goHome} className="hover:text-foreground transition-colors">Home</Link>
          <a href="/#how" onClick={(e) => goToSection(e, "how")} className="hover:text-foreground transition-colors">{t("nav.how")}</a>
          <a href="/#pricing" onClick={(e) => goToSection(e, "pricing")} className="hover:text-foreground transition-colors">{t("nav.pricing")}</a>
          <Link to="/docs" className="hover:text-foreground transition-colors">{t("nav.docs")}</Link>
          <Link to="/help" className="hover:text-foreground transition-colors">{t("nav.help")}</Link>
        </div>

        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-2">
          <LanguageToggle />
          <ThemeToggle />
          {user ? (
            <Button asChild size="sm" variant="outline" className="gap-1.5">
              <Link to="/dashboard">
                <ArrowLeft className="h-3.5 w-3.5" />
                <span className="max-w-[140px] truncate">{displayName}</span>
              </Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="outline" size="sm">
                <Link to="/login">{t("nav.login")}</Link>
              </Button>
              <Button asChild size="sm" className="bg-primary text-primary-foreground hover:bg-primary-hover">
                <Link to="/register">{t("nav.getStarted")}</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile actions */}
        <div className="flex md:hidden items-center gap-1">
          <LanguageToggle />
          <ThemeToggle />
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="p-2 rounded-lg hover:bg-foreground/5 text-foreground transition-colors"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile menu panel */}
      <div
        className={`md:hidden overflow-hidden border-t border-border/60 bg-background/95 backdrop-blur-xl transition-[max-height,opacity] duration-300 ease-out ${
          open ? "max-h-[80vh] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="container py-4 flex flex-col gap-1 text-sm">
          <Link to="/" onClick={goHome} className="px-3 py-3 rounded-lg hover:bg-foreground/5 text-foreground">Home</Link>
          <a href="/#how" onClick={(e) => goToSection(e, "how")} className="px-3 py-3 rounded-lg hover:bg-foreground/5 text-foreground">{t("nav.how")}</a>
          <a href="/#pricing" onClick={(e) => goToSection(e, "pricing")} className="px-3 py-3 rounded-lg hover:bg-foreground/5 text-foreground">{t("nav.pricing")}</a>
          <Link to="/docs" className="px-3 py-3 rounded-lg hover:bg-foreground/5 text-foreground">{t("nav.docs")}</Link>
          <Link to="/help" className="px-3 py-3 rounded-lg hover:bg-foreground/5 text-foreground">{t("nav.help")}</Link>

          <div className="mt-3 pt-3 border-t border-border/60 flex items-center justify-between gap-2">
            {user ? (
              <Button asChild size="sm" variant="outline" className="gap-1.5 flex-1">
                <Link to="/dashboard">
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span className="truncate">{displayName}</span>
                </Link>
              </Button>
            ) : (
              <div className="flex items-center gap-2 flex-1 justify-end">
                <Button asChild variant="outline" size="sm">
                  <Link to="/login">{t("nav.login")}</Link>
                </Button>
                <Button asChild size="sm" className="bg-primary text-primary-foreground hover:bg-primary-hover">
                  <Link to="/register">{t("nav.getStarted")}</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
