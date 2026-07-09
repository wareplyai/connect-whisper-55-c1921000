import { useEffect } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Smartphone, CreditCard, BookOpen, HelpCircle, Phone, LogOut, Shield, Receipt, MessageSquareText, Bot, ShieldCheck, MessageSquare, Package, ShoppingBag, ShoppingCart } from "lucide-react";
import { FeatureKey } from "@/hooks/useFeatureAccess";
import { TrialBanner } from "@/components/TrialBanner";
import { useAuth } from "@/contexts/AuthContext";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { prefetchRoute, prefetchDashboardRoutes } from "@/lib/routePrefetch";
import { UserNotificationBell } from "@/components/UserNotificationBell";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/dashboard/sessions", label: "Sessions", icon: Smartphone },
  { to: "/dashboard/inbox", label: "Inbox", icon: MessageSquare },
  { to: "/dashboard/auto-replies", label: "Auto-Replies", icon: MessageSquareText },
  { to: "/dashboard/ai-agent", label: "AI Agent", icon: Bot },
  { to: "/dashboard/behavior", label: "Behavior & Anti-Ban", icon: ShieldCheck },
  { to: "/dashboard/products", label: "Products", icon: Package },
  { to: "/dashboard/orders", label: "Orders", icon: ShoppingCart },
  { to: "/dashboard/abandoned-cart", label: "Incomplete", icon: ShoppingBag },
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
  const { access, loading: featureAccessLoading } = useFeatureAccess();
  const featureMap: Record<string, FeatureKey> = {
    "/dashboard/ai-agent": "ai_agent",
    "/dashboard/auto-replies": "auto_replies",
    "/dashboard/abandoned-cart": "abandoned_cart",
    "/dashboard/products": "products",
    "/dashboard/behavior": "behavior",
  };
  const isLocked = (to: string) => {
    const fk = featureMap[to];
    return fk ? !access[fk] : false;
  };
  const visibleNav = nav.filter((n) => featureAccessLoading ? !featureMap[n.to] : !isLocked(n.to));
  const location = useLocation();
  const navigate = useNavigate();
  const handleSignOut = async () => {
    await signOut();
    navigate("/", { replace: true });
  };
  const crumbs = location.pathname.split("/").filter(Boolean);

  useEffect(() => {
    prefetchDashboardRoutes();
  }, []);


  const linkBase = "group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200";
  const linkIdle = "text-emerald-100/70 hover:text-white hover:bg-white/5";
  const linkActive = "text-white bg-gradient-to-r from-emerald-500/25 via-emerald-400/15 to-transparent shadow-[inset_0_1px_0_0_hsl(150_80%_70%/0.15),0_4px_20px_-8px_hsl(150_80%_40%/0.5)] ring-1 ring-emerald-400/20";

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="hidden md:flex w-64 flex-col sticky top-0 h-screen self-start relative overflow-hidden text-emerald-50
        bg-[radial-gradient(120%_80%_at_0%_0%,hsl(155_55%_14%)_0%,hsl(158_60%_8%)_55%,hsl(160_70%_5%)_100%)]
        before:absolute before:inset-0 before:pointer-events-none before:bg-[radial-gradient(60%_40%_at_50%_-10%,hsl(150_80%_45%/0.18),transparent_70%)]
        after:absolute after:top-0 after:right-0 after:h-full after:w-px after:bg-gradient-to-b after:from-emerald-400/30 after:via-emerald-400/10 after:to-transparent">
        <Link to="/dashboard" className="relative h-16 flex items-center px-5 border-b border-emerald-400/10 shrink-0 z-10">
          <Logo size={32} textClassName="text-base text-white" />
        </Link>
        <div className="relative z-10 flex-1 min-h-0 px-3 py-4 flex flex-col overflow-y-auto scrollbar-thin">
          <p className="px-3 mb-2 text-[10px] uppercase tracking-[0.18em] font-semibold text-emerald-300/60">Platform</p>
          <nav className="space-y-1">
            {visibleNav.map((n) => {
              return (
                <NavLink
                  key={n.to}
                  to={n.to}
                  end={n.end}
                  onMouseEnter={() => prefetchRoute(n.to)}
                  onTouchStart={() => prefetchRoute(n.to)}
                  onFocus={() => prefetchRoute(n.to)}
                  className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkIdle}`}
                >
                  {({ isActive }) => (
                    <>
                      {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-r-full bg-gradient-to-b from-emerald-300 to-emerald-500 shadow-[0_0_12px_hsl(150_80%_55%/0.8)]" />}
                      <span className={`grid place-items-center h-7 w-7 rounded-lg transition-all ${isActive ? "bg-emerald-400/20 text-emerald-200" : "bg-white/[0.03] text-emerald-200/70 group-hover:bg-white/[0.06] group-hover:text-emerald-100"}`}>
                        <n.icon className="h-4 w-4" />
                      </span>
                      <span className="flex-1">{n.label}</span>
                    </>
                  )}
                </NavLink>
              );
            })}

            {isAdmin && (
              <NavLink
                to="/admin"
                className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkIdle}`}
              >
                {({ isActive }) => (
                  <>
                    <span className={`grid place-items-center h-7 w-7 rounded-lg ${isActive ? "bg-emerald-400/20 text-emerald-200" : "bg-amber-400/10 text-amber-300"}`}>
                      <Shield className="h-4 w-4" />
                    </span>
                    <span className="flex-1">Admin Panel</span>
                  </>
                )}
              </NavLink>
            )}
          </nav>

          <div className="mt-auto pt-4 space-y-1">
            <p className="px-3 mb-1 text-[10px] uppercase tracking-[0.18em] font-semibold text-emerald-300/60">Resources</p>
            {resources.map((r) => {
              const isInternal = r.to.startsWith("/");
              const cls = `${linkBase} ${linkIdle}`;
              const inner = (
                <>
                  <span className="grid place-items-center h-7 w-7 rounded-lg bg-white/[0.03] text-emerald-200/70">
                    <r.icon className="h-4 w-4" />
                  </span>
                  <span className="flex-1">{r.label}</span>
                </>
              );
              return isInternal ? (
                <Link key={r.label} to={r.to} className={cls}>{inner}</Link>
              ) : (
                <a key={r.label} href={r.to} className={cls}>{inner}</a>
              );
            })}
          </div>

          <div className="pt-4 mt-4">
            <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-gradient-to-br from-white/[0.06] to-white/[0.02] ring-1 ring-emerald-400/15 backdrop-blur-sm shadow-[0_8px_24px_-12px_hsl(150_80%_10%/0.6)]">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white text-sm font-bold shadow-[0_4px_12px_hsl(150_70%_30%/0.5)] ring-1 ring-emerald-300/30">
                {(profile?.full_name || profile?.email || "U").slice(0, 1).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate text-white">{profile?.full_name || "User"}</p>
                <p className="text-[11px] text-emerald-200/60 truncate">{profile?.email}</p>
              </div>
              <Button size="icon" variant="ghost" onClick={handleSignOut} aria-label="Sign out" className="h-8 w-8 text-emerald-200/70 hover:text-white hover:bg-white/10">
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
          <div className="flex items-center gap-1">
            <UserNotificationBell />
            <ThemeToggle />
          </div>
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
