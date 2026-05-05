import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Users, Smartphone, DollarSign, MessageSquare,
  Bell, ScrollText, Settings, LogOut, CreditCard, Receipt, Tags, Search,
  ChevronDown,
} from "lucide-react";
import { useHeadAdmin } from "@/contexts/HeadAdminContext";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useQuickStats } from "@/hooks/useHeadAdminStats";

const navGroups = [
  {
    label: "Overview",
    items: [
      { to: "/headadmin", label: "Dashboard", icon: LayoutDashboard, end: true },
      { to: "/headadmin/users", label: "Users", icon: Users },
      { to: "/headadmin/sessions", label: "Sessions", icon: Smartphone },
      { to: "/headadmin/messages", label: "Messages", icon: MessageSquare },
    ],
  },
  {
    label: "Billing",
    items: [
      { to: "/headadmin/revenue", label: "Revenue", icon: DollarSign },
      { to: "/headadmin/payments", label: "Payments", icon: Receipt },
      { to: "/headadmin/payment-methods", label: "Methods", icon: CreditCard },
      { to: "/headadmin/plan-pricing", label: "Plan Pricing", icon: Tags },
    ],
  },
  {
    label: "System",
    items: [
      { to: "/headadmin/notifications", label: "Notifications", icon: Bell },
      { to: "/headadmin/logs", label: "Activity Logs", icon: ScrollText },
      { to: "/headadmin/settings", label: "Settings", icon: Settings },
    ],
  },
];

const allItems = [
  { to: "/headadmin", label: "Dashboard", end: true },
  { to: "/headadmin/users", label: "Users" },
  { to: "/headadmin/sessions", label: "Sessions" },
  { to: "/headadmin/messages", label: "Messages" },
  { to: "/headadmin/revenue", label: "Revenue" },
  { to: "/headadmin/payments", label: "Payments" },
  { to: "/headadmin/payment-methods", label: "Methods" },
  { to: "/headadmin/plan-pricing", label: "Plan Pricing" },
  { to: "/headadmin/notifications", label: "Notifications" },
  { to: "/headadmin/logs", label: "Activity Logs" },
  { to: "/headadmin/settings", label: "Settings" },
];

export default function HeadAdminLayout() {
  const { headAdmin, signOut } = useHeadAdmin();
  const location = useLocation();
  const quickStats = useQuickStats();
  const current = allItems.find((n) =>
    n.end ? location.pathname === n.to : location.pathname.startsWith(n.to)
  );

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* Sidebar */}
      <aside className="hidden md:flex w-[220px] flex-col border-r border-sidebar-border bg-sidebar sticky top-0 h-screen self-start">
        <Link to="/headadmin" className="flex items-center px-5 h-14 border-b border-sidebar-border gap-2.5">
          <Logo size={28} showText={false} />
          <div className="flex flex-col leading-none">
            <span className="text-[13px] font-semibold tracking-tight">WaReplyAI</span>
            <span className="text-[10px] font-semibold tracking-wide text-green-400 mt-0.5">HeadAdmin</span>
          </div>
        </Link>

        <div className="flex-1 px-2.5 py-4 flex flex-col gap-5 overflow-y-auto">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="px-3 mb-2 text-[10px] uppercase tracking-[0.12em] text-muted-foreground/70 font-semibold">
                {group.label}
              </p>
              <nav className="space-y-0.5">
                {group.items.map((n) => (
                  <NavLink
                    key={n.to}
                    to={n.to}
                    end={n.end}
                    className={({ isActive }) =>
                      `flex items-center gap-3 h-10 px-3 rounded-md text-sm transition-all border-l-[3px] ${
                        isActive
                          ? "bg-green-500/15 text-green-400 border-green-500"
                          : "border-transparent text-muted-foreground hover:text-foreground hover:bg-card"
                      }`
                    }
                  >
                    <n.icon className="h-[18px] w-[18px] shrink-0" />
                    <span className="font-medium">{n.label}</span>
                  </NavLink>
                ))}
              </nav>
            </div>
          ))}

          {/* Quick Stats */}
          <div className="mt-2 mx-1 rounded-xl border border-border bg-card/50 p-3">
            <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground/70 font-semibold mb-2.5">
              Quick Stats
            </p>
            <div className="space-y-2.5">
              {quickStats.map((s) => (
                <div key={s.label} className="flex items-center justify-between text-xs">
                  <div className="min-w-0">
                    <p className="text-muted-foreground truncate">{s.label}</p>
                    <p className="text-foreground font-semibold">{s.value}</p>
                  </div>
                  <span
                    className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${
                      s.up
                        ? "text-success bg-success/10 border-success/30"
                        : "text-destructive bg-destructive/10 border-destructive/30"
                    }`}
                  >
                    {s.delta}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="px-3 py-3 border-t border-sidebar-border">
          <div className="flex items-center gap-2.5 rounded-xl bg-card px-2.5 py-2">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/15 text-primary text-sm font-semibold ring-1 ring-primary/20">
              {(headAdmin?.name || "A").slice(0, 1).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{headAdmin?.name}</p>
              <p className="text-[11px] text-muted-foreground truncate">Super Admin</p>
            </div>
            <button onClick={signOut} aria-label="Sign out" className="h-8 w-8 grid place-items-center rounded-md text-muted-foreground hover:text-foreground hover:bg-card-elevated">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-border flex items-center gap-4 px-5 bg-sidebar/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex-1" />

          <div className="flex items-center gap-1.5 ml-auto">
            <ThemeToggle />
            <button className="relative p-2 rounded-lg hover:bg-foreground/5 text-muted-foreground hover:text-foreground transition-colors">
              <Bell className="h-[18px] w-[18px]" />
              <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-warning" />
            </button>
            <Link to="/headadmin/settings" className="p-2 rounded-lg hover:bg-foreground/5 text-muted-foreground hover:text-foreground transition-colors">
              <Settings className="h-[18px] w-[18px]" />
            </Link>
            <div className="flex items-center gap-2.5 pl-3 ml-1 border-l border-border">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/15 text-primary text-sm font-semibold ring-1 ring-primary/20">
                {(headAdmin?.name || "A").slice(0, 1).toUpperCase()}
              </div>
              <div className="hidden xl:block leading-tight">
                <p className="text-sm font-medium truncate max-w-[140px]">{headAdmin?.name}</p>
                <p className="text-[11px] text-muted-foreground">Super Admin</p>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground hidden xl:block" />
            </div>
          </div>
        </header>

        <div className="flex-1 p-6 overflow-auto">
          <div className="mb-1 text-xs text-muted-foreground">
            Admin <span className="mx-1.5 opacity-50">/</span>
            <span className="text-foreground font-medium">{current?.label || "Dashboard"}</span>
          </div>
          <Outlet />
        </div>

        <footer className="border-t border-border px-6 py-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} WareplyAI Admin. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-foreground">Help</a>
            <a href="#" className="hover:text-foreground">Terms</a>
            <a href="#" className="hover:text-foreground">Privacy</a>
            <a href="#" className="hover:text-foreground">Security</a>
          </div>
        </footer>
      </main>
    </div>
  );
}
