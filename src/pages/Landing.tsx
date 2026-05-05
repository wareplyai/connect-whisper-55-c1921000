import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/marketing/Navbar";
import { WhatsAppMockup } from "@/components/WhatsAppMockup";
import { Logo } from "@/components/Logo";
import {
  ArrowRight, Check, Star, MessageSquare, QrCode, BarChart3,
  Headset, Bell, Bot, Users, ShoppingBag, LineChart, Image as ImageIcon,
  FileText, Mic, MapPin, Contact, Zap, Sparkles
} from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const codeSamples: Record<string, string> = {
  JS: `import axios from 'axios';

await axios.post(
  'https://api.wasendapi.com/send-message',
  { to: '+1234567890', text: 'Hello from WaSendAPI 👋' },
  { headers: { Authorization: 'Bearer YOUR_API_KEY' } }
);`,
  PHP: `<?php
$ch = curl_init('https://api.wasendapi.com/send-message');
curl_setopt_array($ch, [
  CURLOPT_POST => true,
  CURLOPT_HTTPHEADER => ['Authorization: Bearer YOUR_API_KEY', 'Content-Type: application/json'],
  CURLOPT_POSTFIELDS => json_encode(['to' => '+1234567890', 'text' => 'Hello!']),
  CURLOPT_RETURNTRANSFER => true,
]);
echo curl_exec($ch);`,
  Python: `import requests

requests.post(
    "https://api.wasendapi.com/send-message",
    json={"to": "+1234567890", "text": "Hello from WaSendAPI 👋"},
    headers={"Authorization": "Bearer YOUR_API_KEY"},
)`,
  cURL: `curl -X POST https://api.wasendapi.com/send-message \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"to":"+1234567890","text":"Hello!"}'`,
};

const useCases = [
  { icon: Headset, title: "Customer Support Automation", desc: "Auto-reply, route tickets, and escalate to humans seamlessly." },
  { icon: Bell, title: "Real-time Business Alerts", desc: "Send order updates, stock alerts and reminders instantly." },
  { icon: Bot, title: "AI-Powered Virtual Assistants", desc: "Pair with LLMs to handle conversations 24/7." },
  { icon: Users, title: "Dynamic Lead Nurturing", desc: "Drip-feed leads through personalized sequences." },
  { icon: ShoppingBag, title: "E-commerce Engagement", desc: "Cart recovery, order confirmations, post-purchase flows." },
  { icon: LineChart, title: "Advanced Analytics", desc: "Pipe message events into your data warehouse." },
];

const USD_TO_BDT = 122;

type DbPlan = {
  plan_name: string;
  display_name: string;
  price_monthly: number;
  price_yearly: number;
  max_sessions: number;
  features: string[] | null;
  is_active: boolean;
  description: string | null;
  is_popular: boolean;
  sort_order: number;
  cta_label: string | null;
};

const faqs = [
  { q: "Do you charge per message?", a: "No. All paid plans include unlimited messages with no per-message fees." },
  { q: "How many WhatsApp numbers can I connect?", a: "It depends on your plan: Basic 1, Pro 3, Plus 6, Business 10. Need more? Contact us." },
  { q: "Is a credit card required for the trial?", a: "No, you can start your 3-day trial without entering any payment details." },
  { q: "Will my WhatsApp account get banned?", a: "Account Protection enforces safe sending limits. As with any unofficial API, follow WhatsApp's policies." },
  { q: "Do you provide an n8n integration?", a: "Yes, we maintain an official n8n community node. See our docs for installation." },
  { q: "Can I send media (images, video, documents)?", a: "Yes — text, image, video, audio, document, location, contact, sticker and poll messages." },
  { q: "Are webhooks supported?", a: "Absolutely. Subscribe to 20+ event types per session and receive JSON POSTs to your URL." },
  { q: "Can I cancel any time?", a: "Yes, cancel from your dashboard at any point. No long-term contracts." },
];

const Landing = () => {
  const [tab, setTab] = useState("JS");
  const [yearly, setYearly] = useState(false);
  const [currency, setCurrency] = useState<"USD" | "BDT">("USD");
  const [plans, setPlans] = useState<DbPlan[]>([]);
  const fmtPrice = (usd: number) =>
    currency === "USD" ? `$${usd.toFixed(usd % 1 === 0 ? 0 : 2)}` : `৳${Math.round(usd * USD_TO_BDT)}`;

  useEffect(() => {
    supabase
      .from("plan_pricing")
      .select("*")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => setPlans((data as DbPlan[]) || []));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* HERO */}
      <section className="relative overflow-hidden">
        {/* Background layers */}
        <div className="absolute inset-0 bg-hero" />
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,hsl(var(--primary)/0.18),transparent_60%)]" />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 -z-10 opacity-[0.18]"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage:
              "radial-gradient(ellipse at center, black 40%, transparent 75%)",
            WebkitMaskImage:
              "radial-gradient(ellipse at center, black 40%, transparent 75%)",
          }}
        />
        {/* Floating glows */}
        <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-[480px] w-[820px] rounded-full bg-primary/20 blur-[140px]" />
        <div className="pointer-events-none absolute top-1/3 -left-32 h-[320px] w-[320px] rounded-full bg-primary/10 blur-[120px]" />
        <div className="pointer-events-none absolute top-1/2 -right-32 h-[320px] w-[320px] rounded-full bg-primary/10 blur-[120px]" />

        <div className="container relative py-28 md:py-36 text-center">
          {/* Premium top badge */}
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card/70 backdrop-blur-md px-4 py-1.5 text-xs font-medium shadow-[0_8px_30px_-10px_hsl(var(--primary)/0.4)]">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            <span className="text-foreground/90">New</span>
            <span className="h-3 w-px bg-border" />
            <span className="text-muted-foreground">Trusted by 10,000+ developers worldwide</span>
            <ArrowRight className="h-3 w-3 text-primary" />
          </div>

          {/* Headline */}
          <h1 className="mt-8 text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1]">
            The All-in-One <br className="hidden md:block" />
            <span className="relative inline-block">
              <span className="text-gradient">WhatsApp API + AI Automation</span>
              <span className="absolute -bottom-2 left-0 h-[3px] w-full rounded-full bg-gradient-to-r from-transparent via-primary to-transparent opacity-70" />
            </span>{" "}
            <span className="text-foreground">Platform</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-sm md:text-base text-muted-foreground leading-relaxed">
            Send unlimited messages, manage multiple sessions, and power smart AI-driven conversations — all without per-message fees or complicated setup.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Button
              asChild
              size="lg"
              className="group h-14 px-8 rounded-full bg-primary text-primary-foreground hover:bg-primary-hover shadow-[0_20px_50px_-15px_hsl(var(--primary)/0.7)] hover:shadow-[0_25px_60px_-15px_hsl(var(--primary)/0.9)] hover:-translate-y-0.5 transition-all duration-300 text-base font-semibold"
            >
              <Link to="/register">
                Start Your Free Trial
                <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-14 px-8 rounded-full border-border/80 bg-card/50 backdrop-blur hover:bg-card hover:border-primary/40 text-base font-medium transition-all"
            >
              <a href="#features">View API Docs <ArrowRight className="ml-1 h-4 w-4" /></a>
            </Button>
          </div>

          {/* Trust row */}
          <div className="mt-8 flex flex-wrap justify-center items-center gap-x-7 gap-y-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-primary" /> No credit card required</span>
            <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-primary" /> 3-day free trial</span>
            <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-primary" /> Cancel anytime</span>
          </div>

          {/* Stats strip */}
          <div className="mt-14 mx-auto max-w-3xl grid grid-cols-2 md:grid-cols-4 gap-px overflow-hidden rounded-2xl border border-border bg-border/60 backdrop-blur">
            {[
              { v: "10K+", l: "Active Developers" },
              { v: "50M+", l: "Messages Sent" },
              { v: "99.9%", l: "Uptime SLA" },
              { v: "4.9★", l: "Customer Rating" },
            ].map((s) => (
              <div key={s.l} className="bg-card/80 backdrop-blur px-4 py-5 text-center">
                <div className="text-2xl md:text-3xl font-bold text-gradient">{s.v}</div>
                <div className="mt-1 text-xs text-muted-foreground">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CODE DEMO */}
      <section id="features" className="container py-20">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
            WhatsApp Integration Made <span className="text-gradient">Effortless</span>
          </h2>
          <p className="mt-4 text-muted-foreground">Drop a few lines of code. Start sending in minutes.</p>
        </div>
        <div className="mx-auto max-w-3xl rounded-xl border border-border bg-card overflow-hidden">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="bg-card-elevated rounded-none w-full justify-start p-0 h-auto border-b border-border">
              {Object.keys(codeSamples).map((k) => (
                <TabsTrigger
                  key={k}
                  value={k}
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary px-5 py-3"
                >
                  {k}
                </TabsTrigger>
              ))}
            </TabsList>
            {Object.entries(codeSamples).map(([k, v]) => (
              <TabsContent key={k} value={k} className="m-0">
                <pre className="p-6 text-sm overflow-x-auto bg-[#0d0d0d] text-foreground/90"><code>{v}</code></pre>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="container py-24">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground mb-4">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            Simple 3-step process
          </div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
            How It <span className="text-gradient">Works</span>
          </h2>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto">From zero to sending messages in under 2 minutes.</p>
        </div>

        <div className="relative mx-auto max-w-5xl">
          <div className="grid md:grid-cols-3 gap-6 md:gap-8">
            {[
              { icon: QrCode, title: "Connect Your WhatsApp", desc: "Scan a QR code from your phone to link a session in seconds." },
              { icon: MessageSquare, title: "Create Your Message", desc: "Build text, media, polls, locations or contacts via the API." },
              { icon: BarChart3, title: "Send & Analyze", desc: "Track delivery, receipts and webhooks in real time." },
            ].map((s, i) => (
              <div
                key={i}
                className="hiw-card group relative rounded-2xl border border-border bg-card/60 backdrop-blur p-7 overflow-hidden transition-all duration-500 hover:border-primary/50 hover:-translate-y-1 hover:shadow-[0_20px_60px_-20px_hsl(var(--primary)/0.4)]"
                style={{ animationDelay: `${i * 0.15}s` }}
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 hiw-shimmer pointer-events-none" />
                <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-primary/10 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                <div className="absolute top-5 right-5 text-5xl font-bold text-primary/10 group-hover:text-primary/20 transition-colors leading-none select-none">
                  0{i + 1}
                </div>

                <div className="relative inline-flex">
                  <div className="hiw-ring relative grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30">
                    <s.icon className="h-6 w-6 text-primary hiw-icon-float" />
                  </div>
                </div>

                <h3 className="mt-6 font-semibold text-xl tracking-tight">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.desc}</p>

                {i < 2 && (
                  <div className="hidden md:flex absolute top-1/2 -right-5 -translate-y-1/2 z-10 h-10 w-10 items-center justify-center rounded-full bg-background border border-border text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <ArrowRight className="h-4 w-4" />
                  </div>
                )}

                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
              </div>
            ))}
          </div>

          <div className="mt-14 flex justify-center">
            <Button asChild size="lg" className="group relative h-14 px-8 rounded-full bg-primary text-primary-foreground hover:bg-primary-hover font-semibold text-base shadow-[0_20px_50px_-15px_hsl(var(--primary)/0.6)] hover:shadow-[0_25px_60px_-15px_hsl(var(--primary)/0.8)] hover:-translate-y-0.5 transition-all duration-300">
              <Link to="/register">
                Start Your Free Trial
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* MESSAGE TYPES + WHATSAPP CHAT MOCKUP */}
      <section className="container py-24 grid md:grid-cols-2 gap-16 items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground mb-4">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            Real-time AI conversations
          </div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
            Every message type, <br />
            <span className="text-gradient">handled by AI</span>
          </h2>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            WaReply AI auto-replies to your customers across text, image, voice, video and more — in seconds, in their language.
          </p>

          <h3 className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Supported Message Types</h3>
          <div className="grid grid-cols-2 gap-2 mb-6">
            {[
              { i: MessageSquare, l: "Text" },
              { i: ImageIcon, l: "Image & Video" },
              { i: FileText, l: "Document" },
              { i: Mic, l: "Voice" },
              { i: Contact, l: "Contact" },
              { i: MapPin, l: "Location" },
            ].map((it, idx) => (
              <div
                key={it.l}
                className="wa-feature group flex items-center gap-2.5 rounded-xl border border-border bg-card/60 backdrop-blur px-3 py-2.5 hover:border-primary/50 hover:bg-card transition-all duration-300 hover:-translate-y-0.5"
                style={{ animationDelay: `${idx * 0.08}s` }}
              >
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 text-primary group-hover:scale-110 transition-transform">
                  <it.i className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium">{it.l}</span>
              </div>
            ))}
          </div>
          <h3 className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Supported Senders</h3>
          <div className="flex gap-2">
            {["Users", "Groups", "Channels"].map((s) => (
              <span key={s} className="rounded-full border border-border bg-card px-4 py-1.5 text-sm hover:border-primary/50 transition-colors">{s}</span>
            ))}
          </div>
        </div>

        {/* iPhone mockup with animated WhatsApp chat */}
        <div className="flex justify-center">
          <WhatsAppMockup />
        </div>
      </section>

      {/* USE CASES */}
      <section className="relative container py-24">
        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 h-72 w-72 rounded-full bg-primary/10 blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 h-72 w-72 rounded-full bg-primary/5 blur-[120px]" />
        </div>

        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground mb-4">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            Use cases
          </div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
            Built for <span className="text-gradient">every use case</span>
          </h2>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
            From customer support to advanced analytics — power any workflow with one API.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {useCases.map((u, i) => (
            <div
              key={u.title}
              className="group relative rounded-2xl border border-border bg-card/60 backdrop-blur-sm p-7 overflow-hidden transition-all duration-500 hover:border-primary/50 hover:-translate-y-1 hover:shadow-[0_20px_60px_-20px_hsl(var(--primary)/0.4)]"
            >
              {/* gradient border glow on hover */}
              <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: "radial-gradient(600px circle at var(--x,50%) var(--y,0%), hsl(var(--primary)/0.08), transparent 40%)" }}
              />
              <div className="absolute -top-20 -right-20 h-44 w-44 rounded-full bg-primary/10 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

              <div className="absolute top-5 right-5 text-5xl font-bold text-primary/10 group-hover:text-primary/20 transition-colors leading-none select-none">
                0{i + 1}
              </div>

              <div className="relative inline-flex">
                <div className="absolute inset-0 rounded-2xl bg-primary/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-primary/25 to-primary/5 border border-primary/30 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
                  <u.icon className="h-6 w-6 text-primary" />
                </div>
              </div>

              <h3 className="mt-6 font-semibold text-lg tracking-tight">{u.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{u.desc}</p>

              <div className="mt-5 inline-flex items-center gap-1.5 text-xs font-medium text-primary opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-500">
                Learn more <ArrowRight className="h-3.5 w-3.5" />
              </div>

              <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="relative py-28">
        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[480px] w-[900px] rounded-full bg-primary/10 blur-[140px]" />
          <div className="absolute bottom-10 right-1/4 h-72 w-72 rounded-full bg-primary/5 blur-[120px]" />
        </div>

        <div className="container">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 backdrop-blur px-3 py-1 text-xs text-muted-foreground mb-4">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Pricing plans
            </div>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
              Simple, transparent <span className="text-gradient">pricing</span>
            </h2>
            <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
              No per-message fees. No hidden charges. Cancel anytime.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card/70 backdrop-blur p-1 text-sm shadow-sm">
                <button onClick={() => setYearly(false)} className={`px-5 py-1.5 rounded-full transition-all ${!yearly ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}>Monthly</button>
                <button onClick={() => setYearly(true)} className={`px-5 py-1.5 rounded-full transition-all ${yearly ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}>
                  Yearly <span className="ml-1 text-[10px] font-semibold rounded-full bg-primary/20 px-1.5 py-0.5">-15%</span>
                </button>
              </div>
              <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card/70 backdrop-blur p-1 text-sm shadow-sm">
                <button onClick={() => setCurrency("USD")} className={`px-5 py-1.5 rounded-full transition-all ${currency === "USD" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}>USD</button>
                <button onClick={() => setCurrency("BDT")} className={`px-5 py-1.5 rounded-full transition-all ${currency === "BDT" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}>BDT</button>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {plans.filter(p => p.plan_name !== "trial").map((p) => {
              const price = yearly ? p.price_yearly / 12 : p.price_monthly;
              const isFree = price === 0;
              return (
                <div
                  key={p.plan_name}
                  className={`group relative rounded-3xl p-[1px] transition-all duration-500 hover:-translate-y-2 ${
                    p.is_popular
                      ? "bg-gradient-to-b from-primary via-primary/40 to-transparent shadow-[0_30px_80px_-20px_hsl(var(--primary)/0.45)]"
                      : "bg-gradient-to-b from-border to-transparent hover:from-primary/40"
                  }`}
                >
                  <div className="relative h-full rounded-3xl bg-card/95 backdrop-blur-sm p-8 flex flex-col overflow-hidden">
                    {p.is_popular && (
                      <>
                        <div className="absolute -top-px left-1/2 -translate-x-1/2 h-px w-2/3 bg-gradient-to-r from-transparent via-primary to-transparent" />
                        <span className="absolute top-4 right-4 inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
                          <Star className="h-3 w-3 fill-current" /> Popular
                        </span>
                      </>
                    )}

                    <div>
                      <h3 className="font-bold text-xl tracking-tight">{p.display_name}</h3>
                      <p className="mt-2 text-sm text-muted-foreground leading-relaxed min-h-[60px]">
                        {p.description}
                      </p>
                    </div>

                    <div className="mt-6 pb-6 border-b border-border/60">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-5xl font-bold tracking-tight">
                          {isFree ? "Free" : fmtPrice(price)}
                        </span>
                        {!isFree && <span className="text-sm text-muted-foreground">/mo</span>}
                      </div>
                      {yearly && !isFree && (
                        <p className="mt-1 text-xs text-primary">Billed {fmtPrice(p.price_yearly)} yearly</p>
                      )}
                    </div>

                    <ul className="mt-6 space-y-3 text-sm flex-1">
                      <li className="flex items-start gap-2.5">
                        <span className="grid place-items-center h-5 w-5 rounded-full bg-primary/15 text-primary mt-0.5 shrink-0">
                          <Check className="h-3 w-3" />
                        </span>
                        <span className="font-medium">{p.max_sessions} Connected WhatsApp {p.max_sessions === 1 ? "Number" : "Numbers"}</span>
                      </li>
                      {(p.features && p.features.length > 0 ? p.features : [
                        "Unlimited Contacts",
                        "No Daily Message Cap",
                        "MCP Server Integration",
                        "Send to Users, Groups & Channels",
                        "Send Text, Images, Videos & Audio",
                        "Send Documents, Contacts & Locations",
                        "Full API Access",
                        "Real-time Webhooks",
                        "Priority Support",
                      ]).map((f) => (
                        <li key={f} className="flex items-start gap-2.5">
                          <span className="grid place-items-center h-5 w-5 rounded-full bg-primary/15 text-primary mt-0.5 shrink-0">
                            <Check className="h-3 w-3" />
                          </span>
                          <span className="text-muted-foreground">{f}</span>
                        </li>
                      ))}
                    </ul>

                    <Button
                      asChild
                      className={`mt-8 w-full h-11 rounded-xl font-semibold transition-all ${
                        p.is_popular
                          ? "bg-primary text-primary-foreground hover:bg-primary-hover shadow-lg shadow-primary/30"
                          : "bg-card-elevated text-foreground border border-border hover:border-primary/50 hover:bg-primary/5"
                      }`}
                    >
                      <Link to="/register">{p.cta_label || "Choose Plan"}</Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-12 max-w-3xl mx-auto rounded-2xl border border-border bg-card/60 backdrop-blur p-7 flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-primary/30 to-primary/5 border border-primary/30 shrink-0">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Need higher volume or custom infrastructure?</h3>
              <p className="text-sm text-muted-foreground mt-0.5">Join our partner program for custom plans and dedicated infrastructure.</p>
            </div>
            <Button variant="outline" className="shrink-0">Partner Program <ArrowRight className="ml-2 h-4 w-4" /></Button>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="relative py-24">
        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute top-1/3 left-0 h-72 w-72 rounded-full bg-primary/10 blur-[120px]" />
          <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-primary/5 blur-[120px]" />
        </div>

        <div className="container max-w-4xl">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 backdrop-blur px-3 py-1 text-xs text-muted-foreground mb-4">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              FAQ
            </div>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
              Frequently Asked <span className="text-gradient">Questions</span>
            </h2>
            <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
              Everything you need to know. Can't find an answer? Reach out to our team.
            </p>
          </div>

          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((f, i) => (
              <AccordionItem
                key={i}
                value={`f${i}`}
                className="group rounded-2xl border border-border bg-card/60 backdrop-blur-sm px-5 transition-all duration-300 hover:border-primary/40 hover:bg-card data-[state=open]:border-primary/50 data-[state=open]:bg-card data-[state=open]:shadow-[0_10px_40px_-20px_hsl(var(--primary)/0.4)]"
              >
                <AccordionTrigger className="text-left hover:no-underline py-5 [&[data-state=open]>svg]:text-primary">
                  <div className="flex items-center gap-4 flex-1">
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 border border-primary/20 text-primary text-xs font-bold shrink-0 transition-transform group-hover:scale-110 group-data-[state=open]:bg-primary group-data-[state=open]:text-primary-foreground">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="font-semibold text-base">{f.q}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed pl-12 pb-5">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <div className="mt-12 text-center">
            <p className="text-sm text-muted-foreground">
              Still have questions?{" "}
              <a href="#" className="text-primary font-medium hover:underline">Contact our support team</a>
            </p>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="container py-20">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-card via-card to-card-elevated p-8 md:p-14">
          <div className="pointer-events-none absolute -top-32 -left-32 h-80 w-80 rounded-full bg-primary/20 blur-[120px]" />
          <div className="pointer-events-none absolute -bottom-32 -right-32 h-80 w-80 rounded-full bg-primary/10 blur-[120px]" />
          <div className="pointer-events-none absolute inset-0 opacity-[0.04] [background-image:linear-gradient(hsl(var(--foreground))_1px,transparent_1px),linear-gradient(90deg,hsl(var(--foreground))_1px,transparent_1px)] [background-size:40px_40px]" />

          <div className="relative grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 border border-primary/30 px-3 py-1 text-xs font-semibold text-primary mb-6">
                <Zap className="h-3.5 w-3.5 fill-primary" />
                Premium Access
              </div>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight leading-[1.1]">
                Fast, Easy, Affordable <br />
                <span className="text-gradient">WhatsApp API</span>
              </h2>
              <p className="mt-5 text-muted-foreground max-w-md leading-relaxed">
                WaSendAPI is a fast, affordable WhatsApp API for developers. Manage multiple sessions and scale without per-message fees. Try it free today!
              </p>

              <ul className="mt-8 space-y-4">
                {[
                  { i: Check, t: "No credit card required to start" },
                  { i: Zap, t: "3-day free trial with full access" },
                  { i: MessageSquare, t: "Cancel anytime, no commitments" },
                ].map((it) => (
                  <li key={it.t} className="flex items-center gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/15 border border-primary/30 text-primary shrink-0">
                      <it.i className="h-4 w-4" />
                    </span>
                    <span className="font-medium">{it.t}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                <Button
                  asChild
                  size="lg"
                  className="group h-14 w-full sm:w-auto px-10 rounded-xl bg-gradient-to-r from-primary to-primary-hover text-primary-foreground font-semibold text-base shadow-[0_20px_50px_-15px_hsl(var(--primary)/0.7)] hover:shadow-[0_25px_60px_-15px_hsl(var(--primary)/0.9)] hover:-translate-y-0.5 transition-all duration-300"
                >
                  <Link to="/register">
                    Start Your Free Trial
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>
                <p className="mt-3 text-xs text-muted-foreground">No credit card required to get started</p>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-4">
              <div className="col-span-3 rounded-2xl border border-border bg-[#0d0d0d] overflow-hidden shadow-2xl">
                <div className="flex items-center gap-2 border-b border-border/50 px-4 py-2.5 text-xs font-mono text-primary">
                  <span className="text-primary/70">›_</span>
                  <span className="font-semibold">API Request</span>
                </div>
                <pre className="p-5 text-[12px] leading-relaxed font-mono overflow-x-auto"><code><span className="text-purple-400">import</span> <span className="text-foreground/90">{"{ createWasender }"}</span> <span className="text-purple-400">from</span> <span className="text-emerald-400">'wasenderapi'</span>;{"\n\n"}<span className="text-purple-400">const</span> <span className="text-sky-300">apiKey</span> = <span className="text-foreground/90">process.env</span>.<span className="text-amber-300">WASENDER_API_KEY</span>;{"\n"}<span className="text-purple-400">const</span> <span className="text-sky-300">wasender</span> = <span className="text-foreground/90">createWasender</span>({"{ apiKey }"});{"\n\n"}<span className="text-purple-400">const</span> <span className="text-sky-300">response</span> = <span className="text-purple-400">await</span> <span className="text-foreground/90">wasender</span>.<span className="text-sky-300">send</span>({"{"}{"\n  "}<span className="text-foreground/90">to</span>: <span className="text-emerald-400">'1234567890'</span>,{"\n  "}<span className="text-foreground/90">text</span>: <span className="text-emerald-400">'Works like a charm!'</span>{"\n"}{"}"});{"\n\n"}<span className="text-emerald-400">✓ Message Sent</span></code></pre>
              </div>

              <div className="col-span-2 rounded-2xl border border-border bg-card-elevated p-4 shadow-2xl flex flex-col">
                <div className="flex items-center gap-2 pb-3 border-b border-border/50">
                  <span className="h-7 w-7 rounded-full bg-primary grid place-items-center text-primary-foreground text-xs font-bold">W</span>
                  <span className="h-2 flex-1 rounded bg-muted" />
                </div>
                <div className="flex-1 flex flex-col justify-end gap-2 mt-4 min-h-[200px]">
                  <div className="self-end max-w-[85%] rounded-2xl rounded-tr-sm bg-primary px-3 py-2 text-xs text-primary-foreground font-medium animate-fade-in">
                    Works like a charm!
                  </div>
                  <div className="self-start max-w-[85%] rounded-2xl rounded-tl-sm bg-card border border-border px-3 py-2 text-xs animate-fade-in">
                    Got it, thanks!
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border mt-10">
        <div className="container py-12 grid md:grid-cols-5 gap-8">
          <div className="md:col-span-2">
            <Logo size={32} textClassName="text-base" />
            <p className="mt-3 text-sm text-muted-foreground max-w-xs">The developer-friendly WhatsApp API. Unlimited messages, no per-message fees.</p>
          </div>
          {[
            { title: "Product", links: ["Features", "Pricing", "Documentation"] },
            { title: "Company", links: ["About", "Blog", "Partner Program"] },
            { title: "Resources", links: ["Help Center", "Status", "Changelog"] },
          ].map((c) => (
            <div key={c.title}>
              <h4 className="font-semibold mb-3 text-sm">{c.title}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {c.links.map((l) => <li key={l}><a href="#" className="hover:text-foreground">{l}</a></li>)}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-border py-6 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} WaSendAPI. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default Landing;
