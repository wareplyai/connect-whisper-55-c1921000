import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import {
  Crown, LayoutDashboard, Users, Smartphone, DollarSign, MessageSquare,
  Bell, ScrollText, Settings, LogOut, CreditCard, Receipt, Tags,
} from "lucide-react";
import { useHeadAdmin } from "@/contexts/HeadAdminContext";
import { Button } from "@/components/ui/button";

const nav = [
  { to: "/headadmin", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/headadmin/users", label: "All Users", icon: Users },
  { to: "/headadmin/sessions", label: "All Sessions", icon: Smartphone },
  { to: "/headadmin/revenue", label: "Revenue & Sales", icon: DollarSign },
  { to: "/headadmin/payments", label: "Payments", icon: Receipt },
  { to: "/headadmin/payment-methods", label: "Payment Methods", icon: CreditCard },
  { to: "/headadmin/plan-pricing", label: "Plan Pricing", icon: Tags },
  { to: "/headadmin/messages", label: "Messages", icon: MessageSquare },
  { to: "/headadmin/notifications", label: "Notifications", icon: Bell },
  { to: "/headadmin/logs", label: "Activity Logs", icon: ScrollText },
  { to: "/headadmin/settings", label: "Settings", icon: Settings },
];

export default function HeadAdminLayout() {
  const { headAdmin, signOut } = useHeadAdmin();
  const location = useLocation();
  const current = nav.find((n) => (n.end ? location.pathname === n.to : location.pathname.startsWith(n.to)));

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="hidden md:flex w-64 flex-col bg-[#0d0d0d] border-r border-border relative">
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-yellow-500/60 via-primary to-yellow-500/60" />
        <Link to="/headadmin" className="h-16 flex items-center gap-2 px-5 border-b border-border">
          <Crown className="h-6 w-6 text-yellow-400" />
          <span className="text-lg font-semibold text-primary">Head Admin</span>
        </Link>
        <div className="flex-1 px-3 py-4 flex flex-col">
          <p className="px-3 mb-2 text-[10px] uppercase tracking-widest text-primary font-semibold">Head Admin</p>
          <nav className="space-y-1">
            {nav.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors border-l-[3px] ${
                    isActive
                      ? "border-primary bg-card-elevated text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:bg-card-elevated"
                  }`
                }
              >
                <n.icon className="h-4 w-4" /> {n.label}
              </NavLink>
            ))}
          </nav>

          <div className="mt-auto pt-4 border-t border-border">
            <div className="flex items-center gap-3 px-2">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
                {(headAdmin?.name || "A").slice(0, 1).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{headAdmin?.name}</p>
                <p className="text-xs text-muted-foreground truncate">{headAdmin?.email}</p>
              </div>
              <Button size="icon" variant="ghost" onClick={signOut} aria-label="Sign out">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-border flex items-center justify-between px-6">
          <div className="text-sm">
            <span className="text-muted-foreground">Head Admin</span>
            <span className="mx-2 text-muted-foreground">/</span>
            <span className="font-medium">{current?.label || "Overview"}</span>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative p-2 rounded-lg hover:bg-card-elevated text-muted-foreground hover:text-foreground">
              <Bell className="h-5 w-5" />
            </button>
            <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
              {(headAdmin?.name || "A").slice(0, 1).toUpperCase()}
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
