import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Smartphone, CreditCard, BookOpen, HelpCircle, Phone, LogOut, Shield, MessageCircle, Receipt, MessageSquareText, Bot, ShieldCheck, MessageSquare, Package, ShoppingCart, ShoppingBag, Briefcase, Users, Inbox as InboxIcon, ClipboardList, Truck, RotateCcw, BadgeDollarSign, Sparkles, Megaphone, Settings as SettingsIcon } from "lucide-react";
import { TrialBanner } from "@/components/TrialBanner";
import { useAuth } from "@/contexts/AuthContext";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/dashboard/sessions", label: "Sessions", icon: Smartphone },
  { to: "/dashboard/inbox", label: "Inbox", icon: MessageSquare },
  { to: "/dashboard/auto-replies", label: "Auto-Replies", icon: MessageSquareText },
  { to: "/dashboard/ai-agent", label: "AI Agent", icon: Bot },
  { to: "/dashboard/behavior", label: "Behavior & Anti-Ban", icon: ShieldCheck },
  { to: "/dashboard/products", label: "Products", icon: Package },
  { to: "/dashboard/woocommerce", label: "WooCommerce", icon: ShoppingCart },
  { to: "/dashboard/abandoned-cart", label: "Incomplete", icon: ShoppingBag },
  { to: "/dashboard/crm", label: "CRM Dashboard", icon: Briefcase, end: true },
  { to: "/dashboard/crm/orders", label: "CRM Orders", icon: ClipboardList },
  { to: "/dashboard/crm/inbox", label: "CRM Inbox", icon: InboxIcon },
  { to: "/dashboard/crm/leads", label: "CRM Leads", icon: Users },
  { to: "/dashboard/crm/courier", label: "CRM Courier", icon: Truck },
  { to: "/dashboard/crm/returns", label: "CRM Returns", icon: RotateCcw },
  { to: "/dashboard/crm/cod", label: "CRM COD", icon: BadgeDollarSign },
  { to: "/dashboard/crm/nurturing", label: "CRM AI Nurturing", icon: Sparkles },
  { to: "/dashboard/crm/broadcast", label: "CRM Broadcast", icon: Megaphone },
  { to: "/dashboard/crm/settings", label: "CRM Settings", icon: SettingsIcon },
  { to: "/dashboard/subscription", label: "Subscription", icon: CreditCard },
  { to: "/dashboard/payments", label: "My Payments", icon: Receipt },
];

const resources = [
  { to: "/docs", label: "Documentation", icon: BookOpen },
  { to: "#", label: "Need Help?", icon: HelpCircle },
  { to: "#", label: "Contact Us", icon: Phone },
];

const DashboardLayout = () => {
  const { profile, isAdmin, signOut } = useAuth();
  const { access } = useFeatureAccess();
  const visibleNav = nav.filter((n) => {
    if (n.to === "/dashboard/ai-agent") return access.ai_agent;
    if (n.to === "/dashboard/auto-replies") return access.auto_replies;
    if (n.to === "/dashboard/abandoned-cart") return access.abandoned_cart;
    return true;
  });
  const location = useLocation();
  const navigate = useNavigate();
  const handleSignOut = async () => {
    await signOut();
    navigate("/", { replace: true });
  };
  const crumbs = location.pathname.split("/").filter(Boolean);

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-card sticky top-0 h-screen self-start">
        <Link to="/dashboard" className="h-16 flex items-center px-5 border-b border-border shrink-0">
          <Logo size={32} textClassName="text-base" />
        </Link>
        <div className="flex-1 min-h-0 px-3 py-4 flex flex-col overflow-y-auto">
          <p className="px-3 mb-2 text-xs uppercase tracking-wider text-muted-foreground">Platform</p>
          <nav className="space-y-1">
            {visibleNav.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors border-l-[3px] ${
                    isActive
                      ? "border-primary bg-primary text-primary-foreground"
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
                    isActive ? "border-primary bg-primary text-primary-foreground" : "border-transparent text-muted-foreground hover:text-foreground hover:bg-card-elevated"
                  }`
                }
              >
                <Shield className="h-4 w-4" /> Admin Panel
              </NavLink>
            )}
          </nav>

          <div className="mt-auto pt-4 space-y-1">
            {resources.map((r) => {
              const isInternal = r.to.startsWith("/");
              return isInternal ? (
                <Link key={r.label} to={r.to} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-card-elevated">
                  <r.icon className="h-4 w-4" /> {r.label}
                </Link>
              ) : (
                <a key={r.label} href={r.to} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-card-elevated">
                  <r.icon className="h-4 w-4" /> {r.label}
                </a>
              );
            })}
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
              <Button size="icon" variant="ghost" onClick={handleSignOut} aria-label="Sign out">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-border flex items-center px-6 text-sm text-muted-foreground">
          <div className="flex-1 flex items-center">
            {crumbs.map((c, i) => (
              <span key={i} className="capitalize">
                {i > 0 && <span className="mx-2">/</span>}
                {c}
              </span>
            ))}
          </div>
          <ThemeToggle />
        </header>
        <div className="flex-1 p-6 space-y-6">
          <TrialBanner />
          <Outlet />
        </div>
      </main>

    </div>
  );
};

export default DashboardLayout;
