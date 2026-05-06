import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";
import { Logo } from "@/components/Logo";
import { Activity, Clock, Database, Zap, Server, DollarSign, History } from "lucide-react";

const services = [
  { name: "Database", icon: Database },
  { name: "Cache", icon: Zap },
  { name: "Whatsapp Servers", icon: Server },
  { name: "Payment Processor", icon: DollarSign },
];

const checks = [
  { time: "May 6, 7:37 AM", ms: "26.91ms" },
  { time: "May 6, 7:36 AM", ms: "27.24ms" },
  { time: "May 6, 7:35 AM", ms: "29.55ms" },
  { time: "May 6, 7:34 AM", ms: "29.8ms" },
  { time: "May 6, 7:33 AM", ms: "26.56ms" },
];

const uptimeRanges = [
  { label: "24H", value: "100%" },
  { label: "7D", value: "100%" },
  { label: "30D", value: "100%" },
];

export default function Status() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="container max-w-5xl py-10 md:py-16">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Logo size={28} showText={false} />
            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold">WaReply AI</span>
              <span className="text-muted-foreground">|</span>
              <span className="text-muted-foreground">System Status</span>
            </div>
          </div>
          <button className="rounded-full bg-foreground text-background text-xs font-medium px-4 py-2 hover:opacity-90 transition">
            Subscribe to Updates
          </button>
        </div>

        {/* Status Banner */}
        <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent p-6 md:p-8 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div className="flex items-center gap-3">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                <h1 className="text-2xl md:text-3xl font-bold">All systems operational</h1>
              </div>
              <p className="mt-2 text-sm text-muted-foreground ml-6">All systems operational</p>
            </div>
            <div className="flex gap-8 ml-6 md:ml-0 border-l border-border/50 pl-6">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Avg Response</p>
                <p className="text-xl font-mono font-bold mt-1">26.91ms</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Uptime (30D)</p>
                <p className="text-xl font-mono font-bold mt-1 text-emerald-400">100.00%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Service Health + Latest Checks */}
        <div className="grid md:grid-cols-3 gap-6 mb-6">
          <div className="md:col-span-2 rounded-2xl border border-border bg-card/40 backdrop-blur p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold">Service Health</h3>
              </div>
              <span className="text-xs text-muted-foreground">Real-time Checks</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {services.map((s) => (
                <div key={s.name} className="flex items-center justify-between rounded-xl border border-border/60 bg-background/40 p-4 hover:border-emerald-500/30 transition">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <s.icon className="h-4 w-4 text-emerald-400" />
                    </div>
                    <span className="text-sm font-medium">{s.name}</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">UP</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card/40 backdrop-blur p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold">Latest Checks</h3>
              </div>
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <ul className="space-y-3">
              {checks.map((c) => (
                <li key={c.time} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    {c.time}
                  </span>
                  <span className="font-mono text-muted-foreground">{c.ms}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Uptime History */}
        <div className="rounded-2xl border border-border bg-card/40 backdrop-blur p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold">Uptime History</h3>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-mono">
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">99-100%</span>
              <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">95-99%</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-6">
            {uptimeRanges.map((u) => (
              <div key={u.label}>
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-muted-foreground">{u.label}</span>
                  <span className="font-mono font-bold text-emerald-400">{u.value}</span>
                </div>
                <div className="h-1.5 rounded-full bg-emerald-500" />
              </div>
            ))}
          </div>
        </div>

        {/* Past Incidents */}
        <div className="rounded-2xl border border-border bg-card/40 backdrop-blur p-6 mb-10">
          <div className="flex items-center gap-2 mb-5">
            <History className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold">Past Incidents & Maintenance</h3>
          </div>
          <div className="rounded-xl border border-border/60 bg-background/40 p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-semibold text-sm">Scheduled Main Server maintenance</h4>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Resolved</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  We would like to inform you that we will be performing scheduled maintenance on our infrastructure to improve speed, stability, and overall performance. During the maintenance window, our website may be temporarily unavailable. This maintenance is essential to ensure we continue providing a fast and reliable experience. We appreciate your understanding and patience.
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {["API", "Database", "Queue", "Authentication", "Email Delivery", "Cache"].map((tag) => (
                    <span key={tag} className="text-[10px] px-2 py-0.5 rounded border border-border text-muted-foreground">{tag}</span>
                  ))}
                </div>
              </div>
              <div className="text-right text-xs text-muted-foreground shrink-0 font-mono">
                <div>Dec 2, 12:00 PM</div>
                <div className="mt-1">Duration: 1h 0m</div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-6">
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            System is operational
          </span>
          <div className="flex items-center gap-5">
            <a href="/help" className="hover:text-foreground">Support</a>
            <a href="#" className="hover:text-foreground">Privacy Policy</a>
            <a href="#" className="hover:text-foreground">Terms of Service</a>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
