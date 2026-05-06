import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/marketing/Navbar";
import { Button } from "@/components/ui/button";
import {
  Search, Rocket, Smartphone, MessageSquare, CreditCard,
  Handshake, Zap, ArrowRight, ChevronDown, Facebook, Instagram, Linkedin, Star,
} from "lucide-react";
import wareplyLogo from "@/assets/wareply-logo.png";
import { Footer } from "@/components/marketing/Footer";

type Category = {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  articles: string[];
  initial?: number;
};

const categories: Category[] = [
  {
    icon: Rocket,
    title: "Getting Started",
    subtitle: "Learn the basics of using WaReply AI",
    articles: [
      "Creating your first WhatsApp session",
      "Understanding the dashboard",
    ],
  },
  {
    icon: Smartphone,
    title: "WhatsApp Sessions",
    subtitle: "Manage your WhatsApp connections",
    articles: [
      "Troubleshooting connection issues",
      "Couldn't Link Device – QR Code Fails",
      "Managing multiple sessions",
      "Missing Push Notifications After Connecting",
      "Keeping your session alive 24/7",
      "Re-linking after phone reset",
    ],
    initial: 4,
  },
  {
    icon: MessageSquare,
    title: "Messaging",
    subtitle: "Send and manage WhatsApp messages",
    articles: [
      "Using webhooks",
      "Key compliance points to avoid account flags",
      "Processing Media Messages from Webhooks",
      "How to Use Polls as Buttons in WhatsApp",
    ],
  },
  {
    icon: CreditCard,
    title: "Account & Billing",
    subtitle: "Manage your subscription and billing",
    articles: [
      "Understanding subscription plans",
      "Managing billing information",
      "Payment Error E-403: Country Not Supported",
    ],
  },
  {
    icon: Handshake,
    title: "Partner Program",
    subtitle: "Learn about our white-label partner opportunities",
    articles: ["Partner Program Details"],
  },
  {
    icon: Zap,
    title: "Integrations",
    subtitle: "Connect WaReply AI with other platforms",
    articles: ["Integrating with n8n", "Integrating with Make"],
  },
];

function CategoryCard({ cat, delay }: { cat: Category; delay: number }) {
  const [expanded, setExpanded] = useState(false);
  const initial = cat.initial ?? cat.articles.length;
  const visible = expanded ? cat.articles : cat.articles.slice(0, initial);
  const hasMore = cat.articles.length > initial;
  const Icon = cat.icon;

  return (
    <div
      className="group relative flex h-full flex-col rounded-xl border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/60 hover:shadow-[0_0_30px_hsl(var(--primary)/0.25)] animate-fade-in"
      style={{ animationDelay: `${delay}ms`, animationFillMode: "both" }}
    >
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/30">
          <Icon className="h-5 w-5" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">{cat.title}</h3>
      </div>
      <p className="mb-5 text-sm text-muted-foreground">{cat.subtitle}</p>

      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-primary/80">
        Popular Articles
      </p>
      <ul className="space-y-2">
        {visible.map((a) => (
          <li key={a}>
            <a
              href="#"
              className="group/link flex items-start gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
            >
              <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 transition-transform group-hover/link:translate-x-0.5" />
              <span>{a}</span>
            </a>
          </li>
        ))}
      </ul>

      <div className="mt-auto flex items-center justify-between pt-5">
        {hasMore ? (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary"
          >
            {expanded ? "Show less" : `Show ${cat.articles.length - initial} more`}
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
          </button>
        ) : <span />}
        <a href="#" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
          View All <ArrowRight className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );
}

export default function Help() {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return categories;
    const q = query.toLowerCase();
    return categories
      .map((c) => ({
        ...c,
        articles: c.articles.filter((a) => a.toLowerCase().includes(q) || c.title.toLowerCase().includes(q)),
      }))
      .filter((c) => c.articles.length > 0);
  }, [query]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            backgroundImage:
              "radial-gradient(hsl(var(--primary)/0.15) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
            maskImage: "radial-gradient(ellipse at center, black 40%, transparent 75%)",
          }}
        />
        <div className="absolute inset-0 bg-hero" />

        <div className="container relative mx-auto px-5 py-20 text-center md:py-28">
          <h1 className="font-display text-4xl font-bold tracking-tight text-foreground md:text-6xl">
            WaReply AI
          </h1>
          <h2 className="mt-2 bg-gradient-to-r from-primary to-[hsl(142_70%_60%)] bg-clip-text font-display text-3xl font-bold text-transparent md:text-5xl">
            Help Center
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground md:text-lg">
            Find answers to common questions about WaReply AI and learn how to use our WhatsApp messaging platform.
          </p>

          <div className="mx-auto mt-10 max-w-2xl">
            <div className="group relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for help articles..."
                className="h-14 w-full rounded-xl border border-border bg-card pl-12 pr-4 text-base text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary focus:shadow-[0_0_0_4px_hsl(var(--primary)/0.15),0_0_30px_hsl(var(--primary)/0.25)]"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="container mx-auto px-5 py-16">
        {filtered.length === 0 ? (
          <p className="text-center text-muted-foreground">No articles found for "{query}".</p>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4 auto-rows-fr items-stretch">
            {filtered.map((cat, i) => (
              <CategoryCard key={cat.title} cat={cat} delay={i * 80} />
            ))}
          </div>
        )}
      </section>

      {/* Still Need Help */}
      <section className="container mx-auto px-5 pb-20">
        <div className="relative mx-auto max-w-3xl overflow-hidden rounded-2xl border border-border bg-card p-10 text-center">
          <div className="absolute inset-0 bg-hero opacity-70" />
          <div className="relative">
            <h3 className="font-display text-3xl font-bold text-foreground">Still Need Help?</h3>
            <p className="mt-3 text-muted-foreground">
              Can't find what you're looking for? Our support team is here to help.
            </p>
            <Button
              size="lg"
              className="mt-6 bg-primary text-primary-foreground shadow-[0_0_25px_hsl(var(--primary)/0.45)] hover:bg-primary-hover"
            >
              Contact Support <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
