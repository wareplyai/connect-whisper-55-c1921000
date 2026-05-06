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
      <section className="hero-section relative overflow-hidden min-h-[calc(100vh-4rem)] flex items-center">
        {/* Base layered background */}
        <div aria-hidden="true" className="hero-bg absolute inset-0 z-0" />

        {/* Concentric orbital arcs (like reference image) */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
          <div className="hero-arcs">
            <span className="hero-arc" style={{ width: "600px", height: "600px" }} />
            <span className="hero-arc" style={{ width: "900px", height: "900px" }} />
            <span className="hero-arc" style={{ width: "1250px", height: "1250px" }} />
            <span className="hero-arc" style={{ width: "1650px", height: "1650px" }} />
            <span className="hero-arc" style={{ width: "2100px", height: "2100px" }} />
            <span className="hero-arc" style={{ width: "2600px", height: "2600px" }} />
          </div>
        </div>

        {/* Soft dotted texture */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 hero-dots" />

        {/* Top spotlight */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 -top-40 z-0 h-[680px] w-[1100px] max-w-[140vw] -translate-x-1/2 rounded-full hero-spotlight"
        />

        {/* Animated vertical beams removed per request */}

        {/* Floating chat-bubble accents (WhatsApp vibe) */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 hidden md:block">
          <div className="hero-bubble hero-bubble-a">
            <span className="hero-bubble-dot" />
            <span className="hero-bubble-dot" style={{ animationDelay: ".2s" }} />
            <span className="hero-bubble-dot" style={{ animationDelay: ".4s" }} />
          </div>
          <div className="hero-bubble hero-bubble-b">AI replied · 0.4s</div>
          <div className="hero-bubble hero-bubble-c">✓✓ Delivered</div>
        </div>

        {/* Noise overlay */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 hero-noise mix-blend-overlay opacity-[0.06] dark:opacity-[0.08]" />

        {/* Bottom fade into page */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-48 bg-gradient-to-b from-transparent to-background"
        />

        <style>{`
          .hero-bg {
            background:
              radial-gradient(1200px 600px at 50% -10%, hsl(var(--primary) / 0.18), transparent 60%),
              radial-gradient(800px 500px at 0% 100%, hsl(160 80% 45% / 0.10), transparent 60%),
              radial-gradient(800px 500px at 100% 100%, hsl(190 90% 50% / 0.08), transparent 60%),
              linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--card) / 0.6) 100%);
          }
          .dark .hero-bg {
            background:
              radial-gradient(1200px 600px at 50% -10%, hsl(var(--primary) / 0.30), transparent 60%),
              radial-gradient(900px 600px at 0% 100%, hsl(160 90% 40% / 0.18), transparent 60%),
              radial-gradient(900px 600px at 100% 100%, hsl(190 90% 45% / 0.14), transparent 60%),
              linear-gradient(180deg, #050a07 0%, #03070a 60%, #02050a 100%);
          }

          .hero-aurora {
            position: absolute;
            border-radius: 50%;
            filter: blur(90px);
            opacity: 0.6;
            mix-blend-mode: screen;
          }
          .hero-aurora-1 {
            top: -10%; left: 10%;
            width: 520px; height: 520px;
            background: radial-gradient(circle, hsl(var(--primary) / 0.55), transparent 70%);
            animation: hero-drift 18s ease-in-out infinite;
          }
          .hero-aurora-2 {
            top: 20%; right: 5%;
            width: 480px; height: 480px;
            background: radial-gradient(circle, hsl(160 90% 50% / 0.45), transparent 70%);
            animation: hero-drift 22s ease-in-out infinite reverse;
          }
          .hero-aurora-3 {
            bottom: -15%; left: 35%;
            width: 600px; height: 600px;
            background: radial-gradient(circle, hsl(190 90% 55% / 0.35), transparent 70%);
            animation: hero-drift 26s ease-in-out infinite;
          }

          .hero-floor {
            background-image:
              linear-gradient(hsl(var(--primary) / 0.18) 1px, transparent 1px),
              linear-gradient(90deg, hsl(var(--primary) / 0.18) 1px, transparent 1px);
            background-size: 60px 60px;
            transform: perspective(700px) rotateX(60deg);
            transform-origin: bottom center;
            mask-image: linear-gradient(to top, #000 10%, transparent 90%);
            -webkit-mask-image: linear-gradient(to top, #000 10%, transparent 90%);
            opacity: 0.35;
          }
          .dark .hero-floor { opacity: 0.55; }

          .hero-dots {
            background-image: radial-gradient(hsl(var(--foreground) / 0.10) 1px, transparent 1px);
            background-size: 22px 22px;
            mask-image: radial-gradient(ellipse 70% 60% at 50% 30%, #000 20%, transparent 80%);
            -webkit-mask-image: radial-gradient(ellipse 70% 60% at 50% 30%, #000 20%, transparent 80%);
            opacity: 0.45;
          }

          /* Concentric orbital arcs */
          .hero-arcs {
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            display: flex;
            align-items: center;
            justify-content: center;
            animation: hero-arc-spin 60s linear infinite;
          }
          .hero-arc {
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            border-radius: 50%;
            border: 1px solid hsl(var(--primary) / 0.18);
            box-shadow:
              inset 0 0 80px hsl(var(--primary) / 0.06),
              0 0 40px hsl(var(--primary) / 0.05);
          }
          .dark .hero-arc {
            border-color: hsl(var(--primary) / 0.22);
            box-shadow:
              inset 0 0 100px hsl(var(--primary) / 0.10),
              0 0 60px hsl(var(--primary) / 0.08);
          }
          @keyframes hero-arc-spin {
            from { transform: translate(-50%, -50%) rotate(0deg); }
            to { transform: translate(-50%, -50%) rotate(360deg); }
          }

          .hero-spotlight {
            background: radial-gradient(ellipse at center,
              hsl(var(--primary) / 0.55) 0%,
              hsl(var(--primary) / 0.20) 30%,
              transparent 65%);
            filter: blur(60px);
            animation: hero-pulse 6s ease-in-out infinite;
          }

          .hero-beam {
            position: absolute;
            top: -20%;
            width: 1px;
            height: 140%;
            background: linear-gradient(180deg, transparent, hsl(var(--primary) / 0.7), transparent);
            box-shadow: 0 0 20px 2px hsl(var(--primary) / 0.5);
            animation: hero-beam-move 7s linear infinite;
          }
          .hero-beam-1 { left: 18%; animation-delay: 0s; }
          .hero-beam-2 { left: 50%; animation-delay: 2.5s; opacity: .7; }
          .hero-beam-3 { left: 82%; animation-delay: 4.5s; }

          .hero-bubble {
            position: absolute;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 8px 14px;
            border-radius: 16px;
            font-size: 12px;
            font-weight: 500;
            backdrop-filter: blur(12px);
            background: hsl(var(--card) / 0.55);
            border: 1px solid hsl(var(--primary) / 0.25);
            color: hsl(var(--foreground));
            box-shadow: 0 10px 40px -10px hsl(var(--primary) / 0.4);
            animation: hero-float 8s ease-in-out infinite;
          }
          .hero-bubble-a { top: 22%; left: 7%; animation-delay: 0s; }
          .hero-bubble-b { top: 68%; left: 10%; animation-delay: 1.2s; }
          .hero-bubble-c { top: 30%; right: 8%; animation-delay: 2s; }
          .hero-bubble-dot {
            display: inline-block;
            width: 6px; height: 6px; border-radius: 50%;
            background: hsl(var(--primary));
            animation: hero-dot 1.2s ease-in-out infinite;
          }

          .hero-noise {
            background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.6'/></svg>");
          }

          @keyframes hero-pulse {
            0%, 100% { opacity: 0.85; transform: translateX(-50%) scale(1); }
            50% { opacity: 1; transform: translateX(-50%) scale(1.06); }
          }
          @keyframes hero-drift {
            0%, 100% { transform: translate(0, 0) scale(1); }
            50% { transform: translate(40px, -30px) scale(1.1); }
          }
          @keyframes hero-float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-12px); }
          }
          @keyframes hero-beam-move {
            0% { transform: translateY(-20%); opacity: 0; }
            20% { opacity: 1; }
            80% { opacity: 1; }
            100% { transform: translateY(20%); opacity: 0; }
          }
          @keyframes hero-dot {
            0%, 60%, 100% { transform: translateY(0); opacity: .5; }
            30% { transform: translateY(-3px); opacity: 1; }
          }
          @keyframes hero-rise {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .hero-rise { animation: hero-rise 0.7s cubic-bezier(0.22, 1, 0.36, 1) both; }

          @media (max-width: 640px) {
            .hero-aurora { filter: blur(60px); opacity: 0.5; }
            .hero-spotlight { filter: blur(45px); }
          }
          @media (prefers-reduced-motion: reduce) {
            .hero-aurora, .hero-spotlight, .hero-beam, .hero-bubble, .hero-bubble-dot { animation: none; }
          }
        `}</style>

        <div className="container relative z-10 py-20 md:py-28 text-center max-w-[920px]">
          {/* Top badge */}
          <div
            className="hero-rise mx-auto mt-[23px] inline-flex items-center gap-2 rounded-full border border-foreground/10 bg-card/40 backdrop-blur-md text-xs font-medium px-4 py-1.5 sm:px-[18px] sm:py-[7px] leading-none"
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
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-3.5 py-1.5 text-xs font-medium text-primary mb-5 shadow-sm shadow-primary/10">
            <span className="relative flex h-2 w-2">
              <span className="absolute inset-0 animate-ping rounded-full bg-primary/60" />
              <span className="relative h-2 w-2 rounded-full bg-primary" />
            </span>
            <Sparkles className="h-3 w-3" />
            {t("mt.badge")}
          </div>
          <h2 className="font-display text-3xl md:text-5xl font-bold tracking-tight mb-4 leading-[1.05]">
            {t("mt.title.1")}<br />
            <span className="text-gradient">{t("mt.title.2")}</span>
          </h2>
          <p className="text-muted-foreground mb-10 leading-relaxed max-w-md">
            {t("mt.subtitle")}
          </p>

          {/* Bento grid */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <span className="grid h-5 w-5 place-items-center rounded-md bg-primary/15 text-[10px] font-bold text-primary">01</span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/80">{t("mt.section.types")}</span>
              <div className="h-px flex-1 bg-gradient-to-r from-border via-border/50 to-transparent" />
            </div>

            <div className="grid grid-cols-6 gap-2.5">
              {/* Featured */}
              <div className="col-span-6 sm:col-span-6 md:col-span-3 md:row-span-2 group relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card via-card to-primary/10 p-5 hover:border-primary/50 transition-all duration-500 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10">
                <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-primary/20 blur-2xl group-hover:bg-primary/30 transition-all" />
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
                <div className="relative">
                  <div className="flex items-start justify-between mb-4">
                    <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground shadow-lg shadow-primary/30">
                      <MessageSquare className="h-5 w-5" />
                    </div>
                    <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">AI</span>
                  </div>
                  <h4 className="font-semibold text-base mb-1.5">{t("mt.featured.t")}</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">{t("mt.featured.d")}</p>

                  {/* Mini chat preview */}
                  <div className="mt-4 space-y-1.5">
                    <div className="inline-flex items-center gap-1.5 rounded-lg rounded-bl-sm bg-muted/70 px-2.5 py-1 text-[10px] text-foreground/80">Hi! 👋</div>
                    <div className="ml-auto flex justify-end">
                      <div className="inline-flex items-center gap-1.5 rounded-lg rounded-br-sm bg-primary/15 border border-primary/20 px-2.5 py-1 text-[10px] text-primary font-medium">Auto-reply ✓✓</div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-1 text-[11px] font-medium text-primary opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">
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
                  className="wa-feature col-span-3 group relative overflow-hidden rounded-xl border border-border bg-card/60 backdrop-blur p-3 hover:border-primary/40 hover:bg-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:shadow-primary/5"
                  style={{ animationDelay: `${idx * 0.06}s` }}
                >
                  <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="flex items-center gap-2.5">
                    <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br ${it.c} text-white shadow-sm group-hover:scale-110 group-hover:rotate-3 transition-transform`}>
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
          <div className="flex items-center gap-3 mb-4">
            <span className="grid h-5 w-5 place-items-center rounded-md bg-primary/15 text-[10px] font-bold text-primary">02</span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/80">{t("mt.section.sendTo")}</span>
            <div className="h-px flex-1 bg-gradient-to-r from-border via-border/50 to-transparent" />
          </div>
          <div className="grid grid-cols-3 gap-2.5 mb-8">
            {[
              { i: Users, l: t("mt.users.l"), d: t("mt.users.d") },
              { i: UsersRound, l: t("mt.groups.l"), d: t("mt.groups.d") },
              { i: Radio, l: t("mt.channels.l"), d: t("mt.channels.d") },
            ].map((s) => (
              <div key={s.l} className="group relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-card/80 to-card/40 backdrop-blur p-4 text-center hover:border-primary/40 transition-all hover:-translate-y-0.5 hover:shadow-md hover:shadow-primary/5">
                <div className="absolute -inset-x-4 -top-8 h-16 bg-primary/0 group-hover:bg-primary/10 blur-2xl transition-all" />
                <div className="relative mx-auto mb-2 grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 text-primary group-hover:scale-110 transition-transform">
                  <s.i className="h-4 w-4" />
                </div>
                <div className="relative text-sm font-semibold">{s.l}</div>
                <div className="relative text-[10px] text-muted-foreground">{s.d}</div>
              </div>
            ))}
          </div>

          <Button asChild size="lg" className="group relative overflow-hidden bg-gradient-to-r from-primary to-primary/80 hover:from-primary-hover hover:to-primary shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all">
            <Link to="/register">
              <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700" />
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

      {/* FINAL CTA — split banner */}
      <section className="container py-24">
        <div className="relative overflow-hidden rounded-[28px] border border-border bg-card">
          <div className="grid lg:grid-cols-[1.1fr_1fr]">
            {/* LEFT — dark content panel */}
            <div className="relative bg-[#0b0f0d] text-white p-8 md:p-12 lg:p-14 overflow-hidden">
              <div aria-hidden className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-primary/30 blur-[100px]" />
              <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.05] [background-image:radial-gradient(circle_at_1px_1px,#fff_1px,transparent_0)] [background-size:22px_22px]" />

              <div className="relative">
                <span className="inline-flex items-center gap-2 rounded-md bg-white/5 border border-white/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider text-primary">
                  <Zap className="h-3 w-3 fill-primary" /> {t("cta.badge")}
                </span>

                <h2 className="mt-5 font-display font-bold tracking-tight leading-[1.1] text-3xl md:text-4xl lg:text-[44px]">
                  {t("cta.title.1")}{" "}
                  <span className="text-primary">{t("cta.title.2")}</span>
                </h2>

                <p className="mt-4 text-sm md:text-base text-white/65 max-w-md leading-relaxed">
                  {t("cta.subtitle")}
                </p>

                <div className="mt-7 flex flex-wrap items-center gap-3">
                  <Button
                    asChild
                    size="lg"
                    className="h-12 px-6 rounded-lg bg-primary text-primary-foreground hover:bg-primary-hover font-semibold shadow-[0_10px_40px_-10px_hsl(var(--primary)/0.7)]"
                  >
                    <Link to="/register">
                      {t("hero.cta.trial")}
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="h-12 px-6 rounded-lg border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white font-medium"
                  >
                    <Link to="/docs">{t("hero.cta.docs")}</Link>
                  </Button>
                </div>

                <p className="mt-3 text-[11px] text-white/40">{t("cta.btn.note")}</p>

                {/* Stats row */}
                <div className="mt-10 grid grid-cols-3 gap-4 max-w-md border-t border-white/10 pt-6">
                  {[
                    { v: "10K+", l: "Developers" },
                    { v: "50M+", l: "Messages" },
                    { v: "99.9%", l: "Uptime" },
                  ].map((s) => (
                    <div key={s.l}>
                      <div className="text-2xl font-bold text-white">{s.v}</div>
                      <div className="text-[11px] uppercase tracking-wider text-white/45 mt-0.5">{s.l}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT — checklist panel */}
            <div className="relative p-8 md:p-12 lg:p-14 bg-gradient-to-br from-card to-card-elevated">
              <div aria-hidden className="pointer-events-none absolute top-6 right-6 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />

              <h3 className="font-display font-semibold text-xl md:text-2xl">
                Everything included
              </h3>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Start free. Upgrade when you scale.
              </p>

              <ul className="mt-6 space-y-3.5">
                {[
                  t("cta.l1"),
                  t("cta.l2"),
                  t("cta.l3"),
                  "Unlimited webhooks & sessions",
                  "AI auto-reply & smart routing",
                  "24/7 priority developer support",
                ].map((label) => (
                  <li key={label} className="flex items-start gap-3 group">
                    <span className="mt-0.5 grid h-6 w-6 place-items-center rounded-full bg-primary/15 border border-primary/30 text-primary shrink-0 group-hover:scale-110 transition-transform">
                      <Check className="h-3.5 w-3.5" strokeWidth={3} />
                    </span>
                    <span className="text-sm font-medium text-foreground/90">{label}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8 flex items-center justify-between gap-4 rounded-xl border border-border bg-background/50 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="text-xs">
                    <div className="font-semibold text-foreground">Trusted by 10,000+ teams</div>
                    <div className="text-muted-foreground">★★★★★ 4.9/5 from 1,200+ reviews</div>
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
            { title: t("foot.company"), links: [{ label: t("foot.about"), href: "/about" }, { label: t("foot.blog"), href: "#" }, { label: t("foot.partner"), href: "#" }] },
            { title: t("foot.resources"), links: [{ label: t("foot.help"), href: "/help" }, { label: t("foot.status"), href: "/status" }, { label: t("foot.changelog"), href: "#" }] },
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
