import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

export const LanguageToggle = () => {
  const { lang, toggle, t } = useLanguage();
  return (
    <Button
      onClick={toggle}
      variant="outline"
      size="sm"
      title={t("nav.langTooltip")}
      aria-label={t("nav.langTooltip")}
      className="gap-1.5 rounded-full border-border/70 bg-card/60 backdrop-blur hover:border-primary/40 hover:bg-card font-semibold"
    >
      <Languages className="h-4 w-4 text-primary" />
      <span className="text-xs tracking-wider">{lang.toUpperCase()}</span>
    </Button>
  );
};
