import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Users, Smartphone, DollarSign, MessageSquare,
  Bell, ScrollText, Settings, LogOut, CreditCard, Receipt, Tags, Search,
} from "lucide-react";
import { useHeadAdmin } from "@/contexts/HeadAdminContext";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";

const navGroups = [
  {
    label: "Overview",
    items: [
      { to: "/headadmin", label: "Dashboard", icon: LayoutDashboard, end: true },
      { to: "/headadmin/users", label: "All Users", icon: Users },
      { to: "/headadmin/sessions", label: "All Sessions", icon: Smartphone },
      { to: "/headadmin/messages", label: "Messages", icon: MessageSquare },
    ],
  },
  {
    label: "Billing",
    items: [
      { to: "/headadmin/revenue", label: "Revenue", icon: DollarSign },
      { to: "/headadmin/payments", label: "Payments", icon: Receipt },
      { to: "/headadmin/payment-methods", label: "Payment Methods", icon: CreditCard },
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

const allItems = navGroups.flatMap((g) => g.items);

export default function HeadAdminLayout() {
  const { headAdmin, signOut } = useHeadAdmin();
  const location = useLocation();
  const current = allItems.find((n) =>
    n.end ? location.pathname === n.to : location.pathname.startsWith(n.to)
  );

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-border/60 bg-[#0b0b0b]">
        <Link to="/headadmin" className="h-16 flex items-center px-5 border-b border-border/60">
          <Logo size={28} textClassName="text-[15px]" />
          <span className="ml-2 rounded-md bg-primary/15 text-primary text-[10px] font-semibold px-1.5 py-0.5 uppercase tracking-wider">
            Admin
          </span>
        </Link>

        <div className="flex-1 px-3 py-5 flex flex-col gap-5 overflow-y-auto">
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
                      `group flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                        isActive
                          ? "bg-primary text-primary-foreground shadow-[0_0_20px_-8px_hsl(var(--primary))]"
                          : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                      }`
                    }
                  >
                    <n.icon className="h-[17px] w-[17px] shrink-0" />
                    <span className="font-medium">{n.label}</span>
                  </NavLink>
                ))}
              </nav>
            </div>
          ))}
        </div>

        <div className="px-3 py-3 border-t border-border/60">
          <div className="flex items-center gap-3 rounded-xl bg-white/5 px-2.5 py-2">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/15 text-primary text-sm font-semibold ring-1 ring-primary/20">
              {(headAdmin?.name || "A").slice(0, 1).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{headAdmin?.name}</p>
              <p className="text-[11px] text-muted-foreground truncate">Super Admin</p>
            </div>
            <Button size="icon" variant="ghost" onClick={signOut} aria-label="Sign out" className="h-8 w-8 text-muted-foreground hover:text-foreground">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border/60 flex items-center gap-4 px-6 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="text-sm flex items-center gap-2 min-w-0">
            <span className="text-muted-foreground">Admin</span>
            <span className="text-muted-foreground/50">/</span>
            <span className="font-medium truncate">{current?.label || "Dashboard"}</span>
          </div>

          <div className="flex-1 max-w-md mx-auto hidden lg:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                placeholder="Search anything..."
                className="w-full h-9 pl-9 pr-12 rounded-lg bg-card border border-border/60 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition"
              />
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground border border-border/60 rounded px-1.5 py-0.5">
                ⌘K
              </kbd>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button className="relative p-2 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors">
              <Bell className="h-[18px] w-[18px]" />
              <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
            </button>
            <div className="flex items-center gap-2.5 pl-2 ml-1 border-l border-border/60">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/15 text-primary text-sm font-semibold ring-1 ring-primary/20">
                {(headAdmin?.name || "A").slice(0, 1).toUpperCase()}
              </div>
              <div className="hidden xl:block leading-tight">
                <p className="text-sm font-medium truncate max-w-[140px]">{headAdmin?.name}</p>
                <p className="text-[11px] text-muted-foreground">Super Admin</p>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 p-6 overflow-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
