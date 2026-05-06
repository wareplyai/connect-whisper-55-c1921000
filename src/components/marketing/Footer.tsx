import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { useLanguage } from "@/contexts/LanguageContext";

export const Footer = () => {
  const { t } = useLanguage();
  const cols = [
    { title: t("foot.product"), links: [{ label: t("foot.features"), href: "/#features" }, { label: t("foot.pricing"), href: "/#pricing" }, { label: t("foot.docs"), href: "/docs" }] },
    { title: t("foot.company"), links: [{ label: t("foot.about"), href: "/about" }, { label: t("foot.blog"), href: "#" }, { label: t("foot.partner"), href: "#" }] },
    { title: t("foot.resources"), links: [{ label: t("foot.help"), href: "/help" }, { label: t("foot.status"), href: "#" }, { label: t("foot.changelog"), href: "#" }] },
  ];
  return (
    <footer className="border-t border-border mt-10">
      <div className="container py-12 grid md:grid-cols-5 gap-8">
        <div className="md:col-span-2">
          <Logo size={32} textClassName="text-base" />
          <p className="mt-3 text-sm text-muted-foreground max-w-xs">{t("foot.tagline")}</p>
        </div>
        {cols.map((c) => (
          <div key={c.title}>
            <h4 className="font-semibold mb-3 text-sm">{c.title}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {c.links.map((l) => (
                <li key={l.label}>
                  {l.href.startsWith("/") || l.href.startsWith("#") === false ? (
                    <Link to={l.href} className="hover:text-foreground">{l.label}</Link>
                  ) : (
                    <a href={l.href} className="hover:text-foreground">{l.label}</a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} WaReply AI. {t("foot.rights")}
      </div>
    </footer>
  );
};

export default Footer;
