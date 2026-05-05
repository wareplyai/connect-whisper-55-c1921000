import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/marketing/Navbar";
import { WhatsAppMockup } from "@/components/WhatsAppMockup";
import { Logo } from "@/components/Logo";
import {
  ArrowRight, Check, Star, MessageSquare, QrCode, BarChart3,
  Headset, Bell, Bot, Users, ShoppingBag, LineChart, Image as ImageIcon,
  FileText, Mic, MapPin, Contact, Zap
} from "lucide-react";
import { useState } from "react";
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
const plans = [
  { name: "Trial", priceUsd: 0, isFree: true, period: "3 days", sessions: "1 session", limit: "50 msg/day", popular: false },
  { name: "Basic", priceUsd: 6, period: "/month", sessions: "1 session", limit: "Unlimited messages", popular: false },
  { name: "Pro", priceUsd: 15, period: "/month", sessions: "3 sessions", limit: "Unlimited messages", popular: true },
  { name: "Plus", priceUsd: 30, period: "/month", sessions: "6 sessions", limit: "Unlimited messages", popular: false },
  { name: "Business", priceUsd: 45, period: "/month", sessions: "10 sessions", limit: "Unlimited messages", popular: false },
];

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
  const fmtPrice = (usd: number) =>
    currency === "USD" ? `$${usd}` : `৳${Math.round(usd * USD_TO_BDT)}`;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* HERO */}
      <section className="relative overflow-hidden bg-hero">
        <div className="container py-24 md:py-32 text-center">
          <div className="mx-auto inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
            <Star className="h-3 w-3 fill-primary text-primary" /> 4.5/5.0 from developers
          </div>
          <h1 className="mt-6 text-5xl md:text-7xl font-bold tracking-tight">
            Low-Cost WhatsApp API <br />
            <span className="text-gradient">For Developers</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Unlimited messages, multiple WhatsApp sessions, webhook support and a developer-friendly API with no per-message fees.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary-hover glow-primary">
              <Link to="/register">Start Your Free Trial <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#features">View API Docs <ArrowRight className="ml-2 h-4 w-4" /></a>
            </Button>
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-primary" /> No credit card required</span>
            <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-primary" /> 3-day free trial</span>
            <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-primary" /> Cancel anytime</span>
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
      <section className="container py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight">Built for every use case</h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {useCases.map((u) => (
            <div key={u.title} className="rounded-xl border border-border bg-card p-6 hover:border-primary/40 transition-colors">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary mb-4">
                <u.icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold mb-1">{u.title}</h3>
              <p className="text-sm text-muted-foreground">{u.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="container py-20">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight">Simple, transparent pricing</h2>
          <p className="mt-3 text-muted-foreground">No per-message fees. Cancel anytime.</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card p-1 text-sm">
              <button onClick={() => setYearly(false)} className={`px-4 py-1.5 rounded-full transition ${!yearly ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Monthly</button>
              <button onClick={() => setYearly(true)} className={`px-4 py-1.5 rounded-full transition ${yearly ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Yearly <span className="ml-1 text-xs opacity-80">Save 15%</span></button>
            </div>
            <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card p-1 text-sm">
              <button onClick={() => setCurrency("USD")} className={`px-4 py-1.5 rounded-full transition ${currency === "USD" ? "bg-green-500 text-white" : "text-muted-foreground"}`}>USD</button>
              <button onClick={() => setCurrency("BDT")} className={`px-4 py-1.5 rounded-full transition ${currency === "BDT" ? "bg-green-500 text-white" : "text-muted-foreground"}`}>BDT</button>
            </div>
          </div>
        </div>
        <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-4">
          {plans.map((p) => (
            <div key={p.name} className={`relative rounded-xl border bg-card p-6 ${p.popular ? "border-primary glow-primary" : "border-border"}`}>
              {p.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">Most Popular</span>
              )}
              <h3 className="font-semibold text-lg">{p.name}</h3>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-3xl font-bold">{p.isFree ? "Free" : fmtPrice(p.priceUsd)}</span>
                <span className="text-sm text-muted-foreground">{p.period}</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{p.sessions}</p>
              <p className="text-sm text-muted-foreground">{p.limit}</p>
              <ul className="mt-5 space-y-2 text-sm">
                {["Webhooks", "Full REST API", "MCP Server", "Priority Support"].map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" /> {f}
                  </li>
                ))}
              </ul>
              <Button asChild className="mt-6 w-full bg-primary text-primary-foreground hover:bg-primary-hover">
                <Link to="/register">{p.name === "Trial" ? "Start Trial" : "Get Started"}</Link>
              </Button>
            </div>
          ))}
        </div>
        <div className="mt-10 rounded-xl border border-border bg-card p-6 text-center">
          <Zap className="mx-auto h-6 w-6 text-primary mb-2" />
          <h3 className="font-semibold">Need higher volume?</h3>
          <p className="text-sm text-muted-foreground mt-1">Join our partner program for custom plans and dedicated infrastructure.</p>
          <Button variant="outline" className="mt-4">Partner Program <ArrowRight className="ml-2 h-4 w-4" /></Button>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="container py-20 max-w-3xl">
        <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-center mb-10">Frequently Asked Questions</h2>
        <Accordion type="single" collapsible className="space-y-2">
          {faqs.map((f, i) => (
            <AccordionItem key={i} value={`f${i}`} className="rounded-xl border border-border bg-card px-4">
              <AccordionTrigger className="text-left hover:no-underline">{f.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
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
