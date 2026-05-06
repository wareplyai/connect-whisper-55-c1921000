import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";
import { Link } from "react-router-dom";
import { Sparkles, ShieldCheck, Heart, Award, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const values = [
  {
    icon: Sparkles,
    title: "Innovation",
    desc: "We continuously push the boundaries of what's possible with WhatsApp integration, developing new features that help businesses connect with customers more effectively.",
  },
  {
    icon: ShieldCheck,
    title: "Reliability",
    desc: "Our platform is built on a foundation of robust infrastructure, ensuring your WhatsApp communications are delivered reliably and securely, every time.",
  },
  {
    icon: Heart,
    title: "Customer Success",
    desc: "We measure our success by the success of our customers. Our dedicated support team works tirelessly to ensure you get the most out of our platform.",
  },
  {
    icon: Award,
    title: "Excellence",
    desc: "We strive for excellence in everything we do, from code quality to customer service, ensuring our platform meets the highest standards in the industry.",
  },
];

const About = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border/60">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.12),transparent_60%)]" />
        <div className="container py-20 md:py-28 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/50 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            About WaReply AI
          </div>
          <h1 className="mt-5 text-4xl md:text-6xl font-display font-semibold tracking-tight">
            Building the future of{" "}
            <span className="bg-gradient-to-r from-primary to-emerald-400 bg-clip-text text-transparent">
              WhatsApp messaging
            </span>
          </h1>
          <p className="mt-5 max-w-2xl mx-auto text-muted-foreground text-base md:text-lg">
            Learn about the team behind WaReply AI — the most powerful WhatsApp API
            platform helping thousands of businesses scale customer conversations.
          </p>
        </div>
      </section>

      {/* STORY + MISSION */}
      <section className="container py-16 md:py-24 grid lg:grid-cols-2 gap-10">
        <div className="rounded-2xl border border-border/60 bg-card/40 p-8 md:p-10 backdrop-blur">
          <div className="text-xs font-semibold uppercase tracking-widest text-primary">01 — Our Story</div>
          <h2 className="mt-3 text-2xl md:text-3xl font-semibold tracking-tight">
            From a simple idea to powering millions of messages
          </h2>
          <div className="mt-5 space-y-4 text-muted-foreground leading-relaxed">
            <p>
              WaReply AI is a leading provider of <strong className="text-foreground">WhatsApp API solutions</strong>,
              founded to empower businesses with advanced messaging capabilities. We
              recognized the growing need for seamless WhatsApp integration for
              companies aiming to connect with customers at scale.
            </p>
            <p>
              Our founders, experts in technology and business strategy, saw that
              while WhatsApp is the world's most popular messaging platform,
              businesses lacked reliable tools for automation and engagement. We set
              out to bridge this gap with a robust, developer-friendly platform.
            </p>
            <p>
              Today, WaReply AI powers communications for thousands of businesses
              worldwide — a low-cost, high-reliability platform built for startups
              and enterprises alike.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-primary/5 to-transparent p-8 md:p-10">
          <div className="text-xs font-semibold uppercase tracking-widest text-primary">02 — Our Mission</div>
          <h2 className="mt-3 text-2xl md:text-3xl font-semibold tracking-tight">
            Make WhatsApp integration accessible for every business
          </h2>
          <div className="mt-5 space-y-4 text-muted-foreground leading-relaxed">
            <p>
              We believe effective communication through WhatsApp is essential to
              building strong customer relationships. We're committed to providing
              innovative automation tools, reliable infrastructure, and a powerful
              chatbot API.
            </p>
            <p>
              Our platform is designed for scalability, security, and ease of use —
              enabling companies to automate, personalize, and optimize their
              messaging strategies without technical barriers or high costs.
            </p>
            <p>
              With continuous innovation and dedicated support, WaReply AI remains
              at the forefront of WhatsApp business integration.
            </p>
          </div>
        </div>
      </section>

      {/* VALUES */}
      <section className="container pb-20 md:pb-28">
        <div className="text-center max-w-2xl mx-auto">
          <div className="text-xs font-semibold uppercase tracking-widest text-primary">Our Values</div>
          <h2 className="mt-3 text-3xl md:text-4xl font-semibold tracking-tight">What we stand for</h2>
          <p className="mt-4 text-muted-foreground">
            The principles that guide every decision we make and every line of code we ship.
          </p>
        </div>

        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {values.map((v) => (
            <div
              key={v.title}
              className="group relative rounded-2xl border border-border/60 bg-card/40 p-6 backdrop-blur hover:border-primary/40 hover:-translate-y-1 transition-all"
            >
              <div className="absolute inset-0 -z-10 rounded-2xl bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <v.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold tracking-tight">{v.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{v.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* TRADEMARK */}
      <section className="container pb-20">
        <div className="rounded-2xl border border-border/60 bg-muted/30 p-6 md:p-8 text-sm text-muted-foreground">
          <h3 className="font-semibold text-foreground mb-2">Trademark Notice</h3>
          <p>
            WaReply AI is an independent software platform. It is not affiliated
            with, endorsed by, or associated with WhatsApp, Meta, or any other
            product, company, or service. All third-party names and trademarks are
            the property of their respective owners.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="container pb-24">
        <div className="rounded-3xl border border-border/60 bg-gradient-to-br from-primary/10 via-card/40 to-transparent p-10 md:p-14 text-center">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">
            Ready to transform your messaging?
          </h2>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
            Join thousands of businesses already using WaReply AI to scale customer conversations.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="gap-2">
              <Link to="/register">
                Get started free <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/docs">Read the docs</Link>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default About;
