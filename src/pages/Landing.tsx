import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/marketing/Navbar";
import { WhatsAppMockup } from "@/components/WhatsAppMockup";
import { Logo } from "@/components/Logo";
import {
  ArrowRight, Check, Star, MessageSquare, QrCode, BarChart3,
  Headset, Bell, Bot, Users, ShoppingBag, LineChart, Image as ImageIcon,
  FileText, Mic, MapPin, Contact, Zap, Sparkles, UsersRound, Radio, Video, ArrowUpRight
} from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useLanguage } from "@/contexts/LanguageContext";

const codeSamples: Record<string, string> = {
  JS: `import axios from 'axios';

// Your API key for authentication
const apiKey = 'your_api_key_here';

// Example of sending a text message with an image
const response = await axios.post(
  'https://wareplyai.com/api/send-message',
  {
    // Message details including recipient and content
    to: '1234567890',
    text: 'Hello from WaReply AI!',
    imageUrl: 'https://example.com/images/image.png'
  },
  {
    headers: {
      // Authorization header with Bearer token
      Authorization: \`Bearer \${apiKey}\`
    }
  }
);`,
  PHP: `<?php
use GuzzleHttp\\Client;

// Your API key for authentication
$apiKey = 'your_api_key_here';

// Example of sending a text message
$response = (new Client())->post('https://wareplyai.com/api/send-message', [
    'headers' => [
        // Authorization header with Bearer token
        'Authorization' => 'Bearer ' . $apiKey
    ],
    'json' => [
        // Recipient and message content
        'to' => '1234567890',
        'text' => 'Hello from WaReply AI!'
    ]
]);`,
  Python: `import httpx

# Your API key for authentication
api_key = 'your_api_key_here'

# Example of sending a location message
response = httpx.post(
    'https://wareplyai.com/api/send-message',
    json={
        # Recipient and location data
        'to': '1234567890',
        'location': {
            'latitude': 37.7749,
            'longitude': -122.4194
        }
    },
    headers={
        # Authorization header with Bearer token
        'Authorization': f'Bearer {api_key}'
    }
)`,
  "C#": `using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;

// Your API key for authentication
string apiKey = "your_api_key_here";

var client = new HttpClient();
client.DefaultRequestHeaders.Authorization =
    // Authorization header with Bearer token
    new AuthenticationHeaderValue("Bearer", apiKey);

// Example of sending a text message
var payload = new StringContent(
    "{\\"to\\":\\"1234567890\\",\\"text\\":\\"Hello from WaReply AI!\\"}",
    Encoding.UTF8,
    "application/json"
);

var response = await client.PostAsync(
    "https://wareplyai.com/api/send-message",
    payload
);`,
  Java: `import kong.unirest.Unirest;
import org.json.JSONObject;

// Your API key for authentication
String apiKey = "your_api_key_here";

// Example of sending a video message
var response = Unirest.post("https://wareplyai.com/api/send-message")
    .header("Authorization", "Bearer " + apiKey)
    .body(new JSONObject()
        // Recipient and video URL
        .put("to", "1234567890")
        .put("videoUrl", "https://example.com/videos/video.mp4"))
    .asJson();`,
  cURL: `# Your API key for authentication
API_KEY="your_api_key_here"

# Example of sending a text message
curl -X POST https://wareplyai.com/api/send-message \\
  -H "Authorization: Bearer $API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "to": "1234567890",
    "text": "Hello from WaReply AI!"
  }'`,
};


const useCaseDefs = [
  { icon: Headset, key: "1" },
  { icon: Bell, key: "2" },
  { icon: Bot, key: "3" },
  { icon: Users, key: "4" },
  { icon: ShoppingBag, key: "5" },
  { icon: LineChart, key: "6" },
] as const;

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

const faqKeys = ["1", "2", "3", "4", "5", "6", "7", "8"] as const;

const Landing = () => {
  const { t, lang } = useLanguage();
  const [tab, setTab] = useState("JS");
  const [yearly, setYearly] = useState(false);
  const [currency, setCurrency] = useState<"USD" | "BDT">(lang === "bn" ? "BDT" : "USD");

  useEffect(() => {
    setCurrency(lang === "bn" ? "BDT" : "USD");
  }, [lang]);
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
      <section
        className="relative overflow-hidden min-h-[calc(100vh-4rem)] flex items-center"
        style={{ background: "#080b08" }}
      >
        {/* Central green glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 h-[800px] w-[1100px] -translate-y-1/2 rounded-full"
          style={{
            zIndex: 0,
            background:
              "radial-gradient(ellipse 50% 50% at 50% 50%, rgba(0, 230, 118, 0.45) 0%, rgba(0, 200, 100, 0.18) 40%, transparent 70%)",
            filter: "blur(40px)",
            animation: "glowPulse 4s ease-in-out infinite",
            transform: "translateX(-50%)",
          }}
        />

        {/* LEFT SIDE GLOW BEAMS */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "320px",
            height: "100%",
            pointerEvents: "none",
            zIndex: 0,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "-50px",
              left: "-60px",
              width: "220px",
              height: "110%",
              background:
                "linear-gradient(180deg, rgba(120,50,255,0.75) 0%, rgba(110,40,240,0.60) 20%, rgba(100,35,220,0.35) 55%, rgba(80,20,180,0.10) 80%, transparent 100%)",
              borderRadius: "0 80px 80px 0",
              filter: "blur(18px)",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "-50px",
              left: "60px",
              width: "55px",
              height: "85%",
              background:
                "linear-gradient(180deg, rgba(180,120,255,0.85) 0%, rgba(160,90,255,0.65) 25%, rgba(130,60,240,0.30) 65%, transparent 100%)",
              borderRadius: "40px",
              filter: "blur(8px)",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "-30px",
              left: "130px",
              width: "35px",
              height: "70%",
              background:
                "linear-gradient(180deg, rgba(150,80,255,0.60) 0%, rgba(120,55,230,0.30) 50%, transparent 100%)",
              borderRadius: "30px",
              filter: "blur(10px)",
            }}
          />
        </div>

        {/* RIGHT SIDE GLOW BEAMS */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: "320px",
            height: "100%",
            pointerEvents: "none",
            zIndex: 0,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "-50px",
              right: "-60px",
              width: "220px",
              height: "110%",
              background:
                "linear-gradient(180deg, rgba(180,100,255,0.70) 0%, rgba(160,80,255,0.55) 20%, rgba(130,55,230,0.30) 55%, rgba(90,30,190,0.08) 80%, transparent 100%)",
              borderRadius: "80px 0 0 80px",
              filter: "blur(18px)",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "-50px",
              right: "60px",
              width: "55px",
              height: "85%",
              background:
                "linear-gradient(180deg, rgba(200,140,255,0.88) 0%, rgba(175,105,255,0.65) 25%, rgba(140,70,245,0.28) 65%, transparent 100%)",
              borderRadius: "40px",
              filter: "blur(8px)",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "-30px",
              right: "130px",
              width: "35px",
              height: "70%",
              background:
                "linear-gradient(180deg, rgba(160,95,255,0.58) 0%, rgba(125,60,235,0.28) 50%, transparent 100%)",
              borderRadius: "30px",
              filter: "blur(10px)",
            }}
          />
        </div>

        <style>{`
          @keyframes glowPulse {
            0%, 100% { opacity: 0.8; transform: translateX(-50%) scale(1); }
            50% { opacity: 1; transform: translateX(-50%) scale(1.08); }
          }
          @keyframes hero-rise {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .hero-rise { animation: hero-rise 0.7s cubic-bezier(0.22, 1, 0.36, 1) both; }
        `}</style>

        <div className="container relative z-10 py-20 md:py-28 text-center max-w-[920px]">
          {/* Top badge */}
          <div
            className="hero-rise mx-auto inline-flex items-center gap-2 rounded-full border border-foreground/10 bg-card/40 backdrop-blur-md px-4 py-1.5 text-xs font-medium"
            style={{ animationDelay: "0s" }}
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            <span className="text-foreground/90">{t("hero.badge.new")}</span>
            <span className="h-3 w-px bg-border" />
            <span className="text-muted-foreground">{t("hero.badge.trust")}</span>
          </div>

          {/* Headline */}
          <h1
            className="hero-rise mx-auto mt-8 font-display font-bold text-foreground tracking-tight leading-[1.1] max-w-[900px]"
            style={{
              fontSize: "clamp(36px, 5vw, 60px)",
              letterSpacing: "-0.02em",
              animationDelay: "0.1s",
            }}
          >
            {t("hero.title.1")} {t("hero.title.2")}{" "}
            <span className="text-gradient">{t("hero.title.3")}</span>{" "}
            {t("hero.title.4")}
          </h1>

          {/* Subheadline */}
          <p
            className="hero-rise mx-auto mt-6 max-w-xl text-sm md:text-base text-muted-foreground leading-relaxed"
            style={{ animationDelay: "0.2s" }}
          >
            {t("hero.subtitle")}
          </p>

          {/* CTAs */}
          <div
            className="hero-rise mt-10 flex flex-wrap justify-center gap-3"
            style={{ animationDelay: "0.3s" }}
          >
            <Button
              asChild
              size="lg"
              className="group h-12 px-7 rounded-full bg-primary text-primary-foreground hover:bg-primary-hover shadow-[0_10px_40px_-5px_hsl(var(--primary)/0.6)] hover:shadow-[0_15px_50px_-5px_hsl(var(--primary)/0.85)] hover:scale-[1.03] transition-all duration-300 text-sm font-semibold"
            >
              <Link to="/register">
                {t("hero.cta.trial")}
                <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 px-7 rounded-full border-foreground/15 bg-transparent backdrop-blur hover:bg-card/60 hover:border-primary/40 text-sm font-medium transition-all"
            >
              <a href="#features">{t("hero.cta.docs")}</a>
            </Button>
          </div>

          {/* Star rating row */}
          <div
            className="hero-rise mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground"
            style={{ animationDelay: "0.4s" }}
          >
            <div className="flex items-center gap-0.5">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
            <span>Trusted by 10,000+ businesses</span>
          </div>

          {/* Trust check row */}
          <div
            className="hero-rise mt-5 flex flex-wrap justify-center items-center gap-x-6 gap-y-2 text-xs text-muted-foreground"
            style={{ animationDelay: "0.45s" }}
          >
            <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-primary" /> {t("hero.trust.noCard")}</span>
            <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-primary" /> {t("hero.trust.trial")}</span>
            <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-primary" /> {t("hero.trust.cancel")}</span>
          </div>

          {/* Logo strip — social proof */}
          <div
            className="hero-rise mt-14"
            style={{ animationDelay: "0.55s" }}
          >
            <p className="text-xs uppercase tracking-widest text-muted-foreground/70">
              Trusted by teams at
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 opacity-70">
              {[
                { name: "Phantom", icon: Sparkles },
                { name: "Digistack", icon: Zap },
                { name: "Printester", icon: FileText },
                { name: "Truthnote", icon: Bot },
              ].map((b) => (
                <div key={b.name} className="flex items-center gap-2 text-foreground/70">
                  <b.icon className="h-4 w-4" />
                  <span className="text-sm font-semibold tracking-tight">{b.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Stats strip */}
          <div
            className="hero-rise mt-14 mx-auto max-w-3xl grid grid-cols-2 md:grid-cols-4 gap-px overflow-hidden rounded-2xl border border-border bg-border/60 backdrop-blur"
            style={{ animationDelay: "0.65s" }}
          >
            {[
              { v: "10K+", l: t("hero.stat.devs") },
              { v: "50M+", l: t("hero.stat.msgs") },
              { v: "99.9%", l: t("hero.stat.uptime") },
              { v: "4.9★", l: t("hero.stat.rating") },
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
            {t("code.title.1")} <span className="text-gradient">{t("code.title.2")}</span>
          </h2>
          <p className="mt-4 text-muted-foreground">{t("code.subtitle")}</p>
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
                <pre className="p-6 text-sm overflow-x-auto bg-[#0d0d0d] text-zinc-100"><code>{v}</code></pre>
              </TabsContent>
            ))}
          </Tabs>
        </div>

        {/* Language logos */}
        <div className="mx-auto mt-10 flex max-w-3xl flex-nowrap items-center justify-center gap-2 overflow-x-auto py-[6px] my-0 px-0 md:gap-[14px]">
          {[
            { name: "JavaScript", icon: "javascript/javascript-original.svg" },
            { name: "C++", icon: "cplusplus/cplusplus-original.svg" },
            { name: "TypeScript", icon: "typescript/typescript-original.svg" },
            { name: "Python", icon: "python/python-original.svg" },
            { name: "Kotlin", icon: "kotlin/kotlin-original.svg" },
            { name: "Java", icon: "java/java-original.svg" },
            { name: "PHP", icon: "php/php-original.svg" },
            { name: "C#", icon: "csharp/csharp-original.svg" },
            { name: "Ruby", icon: "ruby/ruby-original.svg" },
            { name: "Go", icon: "go/go-original-wordmark.svg" },
            { name: "Lua", icon: "lua/lua-original.svg" },
            { name: "Swift", icon: "swift/swift-original.svg" },
          ].map((l) => (
            <div
              key={l.name}
              title={l.name}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-card-elevated/60 border border-border transition-all hover:-translate-y-1 hover:border-primary/50 hover:shadow-[0_0_20px_hsl(var(--primary)/0.25)]"
            >
              <img
                src={`https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/${l.icon}`}
                alt={l.name}
                className="h-5 w-5"
                loading="lazy"
              />
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-10 flex justify-center">
          <Button
            asChild
            size="lg"
            className="h-12 px-8 bg-gradient-to-r from-primary to-[hsl(142_70%_42%)] text-primary-foreground font-semibold shadow-[0_0_25px_hsl(var(--primary)/0.45)] hover:opacity-95"
          >
            <Link to="/register">
              {t("nav.getStarted")} <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="container py-24">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground mb-4">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            {t("how.badge")}
          </div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
            {t("how.title.1")} <span className="text-gradient">{t("how.title.2")}</span>
          </h2>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto">{t("how.subtitle")}</p>
        </div>

        <div className="relative mx-auto max-w-5xl">
          <div className="grid md:grid-cols-3 gap-6 md:gap-8">
            {[
              { icon: QrCode, title: t("how.s1.t"), desc: t("how.s1.d") },
              { icon: MessageSquare, title: t("how.s2.t"), desc: t("how.s2.d") },
              { icon: BarChart3, title: t("how.s3.t"), desc: t("how.s3.d") },
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
                {t("hero.cta.trial")}
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* MESSAGE TYPES + WHATSAPP CHAT MOCKUP */}
      <section className="relative container py-24 grid md:grid-cols-2 gap-16 items-center">
        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute -top-10 left-1/3 h-72 w-72 rounded-full bg-primary/10 blur-[120px]" />
        </div>
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs text-primary mb-4">
            <Sparkles className="h-3 w-3" />
            {t("mt.badge")}
          </div>
          <h2 className="font-display text-3xl md:text-5xl font-bold tracking-tight mb-4">
            {t("mt.title.1")}<br />
            <span className="text-gradient">{t("mt.title.2")}</span>
          </h2>
          <p className="text-muted-foreground mb-10 leading-relaxed max-w-md">
            {t("mt.subtitle")}
          </p>

          {/* Bento grid */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{t("mt.section.types")}</span>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
            </div>

            <div className="grid grid-cols-6 gap-2.5">
              {/* Featured */}
              <div className="col-span-6 sm:col-span-6 md:col-span-3 md:row-span-2 group relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card via-card to-primary/5 p-5 hover:border-primary/40 transition-all duration-500 hover:-translate-y-1">
                <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/15 blur-2xl group-hover:bg-primary/25 transition-all" />
                <div className="relative">
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground shadow-lg shadow-primary/30 mb-4">
                    <MessageSquare className="h-5 w-5" />
                  </div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <h4 className="font-semibold text-base">{t("mt.featured.t")}</h4>
                    <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">AI</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{t("mt.featured.d")}</p>
                  <div className="mt-4 flex items-center gap-1 text-[11px] text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    <span>{t("mt.featured.tag")}</span><ArrowUpRight className="h-3 w-3" />
                  </div>
                </div>
              </div>

              {[
                { i: ImageIcon, l: t("mt.image.l"), d: t("mt.image.d"), c: "from-sky-500/80 to-blue-600/60" },
                { i: Video, l: t("mt.video.l"), d: t("mt.video.d"), c: "from-rose-500/80 to-pink-600/60" },
                { i: FileText, l: t("mt.doc.l"), d: t("mt.doc.d"), c: "from-amber-500/80 to-orange-600/60" },
                { i: Mic, l: t("mt.voice.l"), d: t("mt.voice.d"), c: "from-violet-500/80 to-purple-600/60" },
                { i: MapPin, l: t("mt.location.l"), d: t("mt.location.d"), c: "from-emerald-500/80 to-teal-600/60" },
                { i: Contact, l: t("mt.contact.l"), d: t("mt.contact.d"), c: "from-cyan-500/80 to-sky-600/60" },
              ].map((it, idx) => (
                <div
                  key={it.l}
                  className="wa-feature col-span-3 group relative overflow-hidden rounded-xl border border-border bg-card/60 backdrop-blur p-3 hover:border-primary/40 hover:bg-card transition-all duration-300 hover:-translate-y-0.5"
                  style={{ animationDelay: `${idx * 0.06}s` }}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br ${it.c} text-white shadow-sm group-hover:scale-110 transition-transform`}>
                      <it.i className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold leading-tight truncate">{it.l}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{it.d}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Senders */}
          <div className="flex items-center gap-2 mb-4">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{t("mt.section.sendTo")}</span>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
          </div>
          <div className="grid grid-cols-3 gap-2.5 mb-8">
            {[
              { i: Users, l: t("mt.users.l"), d: t("mt.users.d") },
              { i: UsersRound, l: t("mt.groups.l"), d: t("mt.groups.d") },
              { i: Radio, l: t("mt.channels.l"), d: t("mt.channels.d") },
            ].map((s) => (
              <div key={s.l} className="group relative overflow-hidden rounded-xl border border-border bg-card/60 backdrop-blur p-3 text-center hover:border-primary/40 hover:bg-card transition-all hover:-translate-y-0.5">
                <div className="mx-auto mb-2 grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                  <s.i className="h-4 w-4" />
                </div>
                <div className="text-sm font-semibold">{s.l}</div>
                <div className="text-[10px] text-muted-foreground">{s.d}</div>
              </div>
            ))}
          </div>

          <Button asChild size="lg" className="group bg-gradient-to-r from-primary to-primary/80 hover:from-primary-hover hover:to-primary shadow-lg shadow-primary/20">
            <Link to="/register">
              {t("mt.cta")}
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
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
            {t("uc.badge")}
          </div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
            {t("uc.title.1")} <span className="text-gradient">{t("uc.title.2")}</span>
          </h2>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
            {t("uc.subtitle")}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {useCaseDefs.map((u, i) => (
            <div
              key={u.key}
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

              <h3 className="mt-6 font-semibold text-lg tracking-tight">{t(`uc.${u.key}.t`)}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{t(`uc.${u.key}.d`)}</p>

              <div className="mt-5 inline-flex items-center gap-1.5 text-xs font-medium text-primary opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-500">
                {t("uc.learnMore")} <ArrowRight className="h-3.5 w-3.5" />
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
              {t("price.badge")}
            </div>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
              {t("price.title.1")} <span className="text-gradient">{t("price.title.2")}</span>
            </h2>
            <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
              {t("price.subtitle")}
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card/70 backdrop-blur p-1 text-sm shadow-sm">
                <button onClick={() => setYearly(false)} className={`px-5 py-1.5 rounded-full transition-all ${!yearly ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}>{t("price.monthly")}</button>
                <button onClick={() => setYearly(true)} className={`px-5 py-1.5 rounded-full transition-all ${yearly ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}>
                  {t("price.yearly")} <span className="ml-1 text-[10px] font-semibold rounded-full bg-primary/20 px-1.5 py-0.5">-15%</span>
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
                          <Star className="h-3 w-3 fill-current" /> {t("price.popular")}
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
                          {isFree ? t("price.free") : fmtPrice(price)}
                        </span>
                        {!isFree && <span className="text-sm text-muted-foreground">{t("price.perMo")}</span>}
                      </div>
                      {yearly && !isFree && (
                        <p className="mt-1 text-xs text-primary">{t("price.billed")} {fmtPrice(p.price_yearly)} {t("price.yearlySuffix")}</p>
                      )}
                    </div>

                    <ul className="mt-6 space-y-3 text-sm flex-1">
                      <li className="flex items-start gap-2.5">
                        <span className="grid place-items-center h-5 w-5 rounded-full bg-primary/15 text-primary mt-0.5 shrink-0">
                          <Check className="h-3 w-3" />
                        </span>
                        <span className="font-medium">{p.max_sessions} {p.max_sessions === 1 ? t("price.numbers.one") : t("price.numbers.many")}</span>
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
                      <Link to="/register">{p.cta_label || t("price.cta.default")}</Link>
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
              <h3 className="font-semibold">{t("price.partner.t")}</h3>
              <p className="text-sm text-muted-foreground mt-0.5">{t("price.partner.d")}</p>
            </div>
            <Button variant="outline" className="shrink-0">{t("price.partner.cta")} <ArrowRight className="ml-2 h-4 w-4" /></Button>
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
              {t("faq.badge")}
            </div>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
              {t("faq.title.1")} <span className="text-gradient">{t("faq.title.2")}</span>
            </h2>
            <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
              {t("faq.subtitle")}
            </p>
          </div>

          <Accordion type="single" collapsible className="space-y-3">
            {faqKeys.map((k, i) => (
              <AccordionItem
                key={k}
                value={`f${i}`}
                className="group rounded-2xl border border-border bg-card/60 backdrop-blur-sm px-5 transition-all duration-300 hover:border-primary/40 hover:bg-card data-[state=open]:border-primary/50 data-[state=open]:bg-card data-[state=open]:shadow-[0_10px_40px_-20px_hsl(var(--primary)/0.4)]"
              >
                <AccordionTrigger className="text-left hover:no-underline py-5 [&[data-state=open]>svg]:text-primary">
                  <div className="flex items-center gap-4 flex-1">
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 border border-primary/20 text-primary text-xs font-bold shrink-0 transition-transform group-hover:scale-110 group-data-[state=open]:bg-primary group-data-[state=open]:text-primary-foreground">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="font-semibold text-base">{t(`faq.q${k}.q`)}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed pl-12 pb-5">
                  {t(`faq.q${k}.a`)}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <div className="mt-12 text-center">
            <p className="text-sm text-muted-foreground">
              {t("faq.contact.1")}{" "}
              <a href="#" className="text-primary font-medium hover:underline">{t("faq.contact.2")}</a>
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
                {t("cta.badge")}
              </div>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight leading-[1.1]">
                {t("cta.title.1")} <br />
                <span className="text-gradient">{t("cta.title.2")}</span>
              </h2>
              <p className="mt-5 text-muted-foreground max-w-md leading-relaxed">
                {t("cta.subtitle")}
              </p>

              <ul className="mt-8 space-y-4">
                {[
                  { i: Check, label: t("cta.l1") },
                  { i: Zap, label: t("cta.l2") },
                  { i: MessageSquare, label: t("cta.l3") },
                ].map((it) => (
                  <li key={it.label} className="flex items-center gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/15 border border-primary/30 text-primary shrink-0">
                      <it.i className="h-4 w-4" />
                    </span>
                    <span className="font-medium">{it.label}</span>
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
                    {t("hero.cta.trial")}
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>
                <p className="mt-3 text-xs text-muted-foreground">{t("cta.btn.note")}</p>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-4">
              <div className="col-span-3 rounded-2xl border border-border bg-[#0d0d0d] overflow-hidden shadow-2xl">
                <div className="flex items-center gap-2 border-b border-border/50 px-4 py-2.5 text-xs font-mono text-primary">
                  <span className="text-primary/70">›_</span>
                  <span className="font-semibold">API Request</span>
                </div>
                <pre className="p-5 text-[12px] leading-relaxed font-mono overflow-x-auto"><code><span className="text-purple-400">import</span> <span className="text-code-foreground/90">{"{ createWareply }"}</span> <span className="text-purple-400">from</span> <span className="text-emerald-400">'wareplyapi'</span>;{"\n\n"}<span className="text-purple-400">const</span> <span className="text-sky-300">apiKey</span> = <span className="text-code-foreground/90">process.env</span>.<span className="text-amber-300">WAREPLY_API_KEY</span>;{"\n"}<span className="text-purple-400">const</span> <span className="text-sky-300">wareply</span> = <span className="text-code-foreground/90">createWareply</span>({"{ apiKey }"});{"\n\n"}<span className="text-purple-400">const</span> <span className="text-sky-300">response</span> = <span className="text-purple-400">await</span> <span className="text-code-foreground/90">wareply</span>.<span className="text-sky-300">send</span>({"{"}{"\n  "}<span className="text-code-foreground/90">to</span>: <span className="text-emerald-400">'1234567890'</span>,{"\n  "}<span className="text-code-foreground/90">text</span>: <span className="text-emerald-400">'Works like a charm!'</span>{"\n"}{"}"});{"\n\n"}<span className="text-emerald-400">✓ Message Sent</span></code></pre>
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
            <p className="mt-3 text-sm text-muted-foreground max-w-xs">{t("foot.tagline")}</p>
          </div>
          {[
            { title: t("foot.product"), links: [{ label: t("foot.features"), href: "#features" }, { label: t("foot.pricing"), href: "#pricing" }, { label: t("foot.docs"), href: "/docs" }] },
            { title: t("foot.company"), links: [{ label: t("foot.about"), href: "#" }, { label: t("foot.blog"), href: "#" }, { label: t("foot.partner"), href: "#" }] },
            { title: t("foot.resources"), links: [{ label: t("foot.help"), href: "#faq" }, { label: t("foot.status"), href: "#" }, { label: t("foot.changelog"), href: "#" }] },
          ].map((c) => (
            <div key={c.title}>
              <h4 className="font-semibold mb-3 text-sm">{c.title}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {c.links.map((l) => <li key={l.label}>{l.href.startsWith("/") ? <Link to={l.href} className="hover:text-foreground">{l.label}</Link> : <a href={l.href} className="hover:text-foreground">{l.label}</a>}</li>)}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-border py-6 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} WaReply AI. {t("foot.rights")}
        </div>
      </footer>
    </div>
  );
};

export default Landing;
