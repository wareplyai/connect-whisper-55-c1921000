import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { LayoutDashboard, Smartphone, CreditCard, BookOpen, HelpCircle, Phone, LogOut, Shield, MessageCircle, Receipt } from "lucide-react";
import { TrialBanner } from "@/components/TrialBanner";
import { N8nBanner } from "@/components/N8nBanner";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/dashboard/sessions", label: "Sessions", icon: Smartphone },
  { to: "/dashboard/subscription", label: "Subscription", icon: CreditCard },
  { to: "/dashboard/payments", label: "My Payments", icon: Receipt },
];

const resources = [
  { to: "#", label: "Documentation", icon: BookOpen },
  { to: "#", label: "Need Help?", icon: HelpCircle },
  { to: "#", label: "Contact Us", icon: Phone },
];

const DashboardLayout = () => {
  const { profile, isAdmin, signOut } = useAuth();
  const location = useLocation();
  const crumbs = location.pathname.split("/").filter(Boolean);

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-card">
        <Link to="/dashboard" className="h-16 flex items-center gap-1.5 px-5 border-b border-border">
        <Link to="/dashboard" className="h-16 flex items-center px-5 border-b border-border">
          <Logo size={32} textClassName="text-base" />
        </Link>
        <div className="flex-1 px-3 py-4 flex flex-col">
          <p className="px-3 mb-2 text-xs uppercase tracking-wider text-muted-foreground">Platform</p>
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
            {isAdmin && (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors border-l-[3px] ${
                    isActive ? "border-primary bg-card-elevated text-primary" : "border-transparent text-muted-foreground hover:text-foreground hover:bg-card-elevated"
                  }`
                }
              >
                <Shield className="h-4 w-4" /> Admin Panel
              </NavLink>
            )}
          </nav>

          <div className="mt-auto pt-4 space-y-1">
            {resources.map((r) => (
              <a key={r.label} href={r.to} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-card-elevated">
                <r.icon className="h-4 w-4" /> {r.label}
              </a>
            ))}
          </div>

          <div className="pt-4 mt-4 border-t border-border">
            <div className="flex items-center gap-3 px-2">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
                {(profile?.full_name || profile?.email || "U").slice(0, 1).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{profile?.full_name || "User"}</p>
                <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
              </div>
              <Button size="icon" variant="ghost" onClick={signOut} aria-label="Sign out">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-border flex items-center px-6 text-sm text-muted-foreground">
          {crumbs.map((c, i) => (
            <span key={i} className="capitalize">
              {i > 0 && <span className="mx-2">/</span>}
              {c}
            </span>
          ))}
        </header>
        <div className="flex-1 p-6 space-y-6">
          <N8nBanner />
          <TrialBanner />
          <Outlet />
        </div>
      </main>

      <button className="fixed bottom-5 right-5 inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium shadow-lg hover:bg-primary-hover">
        <MessageCircle className="h-4 w-4" /> Support
      </button>
    </div>
  );
};

export default DashboardLayout;
