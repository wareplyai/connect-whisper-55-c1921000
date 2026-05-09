import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Home, Bell, Receipt, Users, LogOut } from "lucide-react";
import { useHeadAdmin } from "@/contexts/HeadAdminContext";
import { useEffect } from "react";

const tabs = [
  { to: "/headadmin/m", label: "Home", icon: Home, end: true },
  { to: "/headadmin/m/notifications", label: "Alerts", icon: Bell },
  { to: "/headadmin/m/payments", label: "Pay", icon: Receipt },
  { to: "/headadmin/m/users", label: "Users", icon: Users },
];

export default function HeadAdminMobileLayout() {
  const { headAdmin, signOut } = useHeadAdmin();
  const nav = useNavigate();

  useEffect(() => {
    const root = document.documentElement;
    const prevClasses = root.className;
    const prevColorScheme = root.style.colorScheme;
    root.classList.remove("light");
    root.classList.add("dark");
    root.style.colorScheme = "dark";
    return () => {
      root.className = prevClasses;
      root.style.colorScheme = prevColorScheme;
    };
  }, []);

  return (
    <div
      className="min-h-screen text-white relative overflow-x-hidden"
      style={{
        background:
          "radial-gradient(120% 80% at 50% -10%, hsl(150 60% 12%) 0%, hsl(160 30% 6%) 45%, hsl(0 0% 4%) 100%)",
      }}
    >
      {/* Top bar */}
      <header
        className="sticky top-0 z-30 backdrop-blur-xl bg-black/40 border-b border-white/5"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="flex items-center justify-between px-5 h-14">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 grid place-items-center text-black font-bold shadow-lg shadow-emerald-500/30">
              {(headAdmin?.name || "A").slice(0, 1).toUpperCase()}
            </div>
            <div className="leading-tight">
              <p className="text-[11px] text-emerald-400/80 font-medium">Good day</p>
              <p className="text-sm font-semibold truncate max-w-[150px]">
                {headAdmin?.name || "Admin"}
              </p>
            </div>
          </div>
          <button
            onClick={async () => {
              await signOut();
              nav("/headadmin/login");
            }}
            className="h-9 w-9 grid place-items-center rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <main className="pb-28 pt-2 px-4">
        <Outlet />
      </main>

      {/* Bottom tab bar */}
      <nav
        className="fixed bottom-0 inset-x-0 z-30 backdrop-blur-xl bg-black/60 border-t border-white/5"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-center justify-around px-2 py-2 max-w-md mx-auto">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-2xl transition-all ${
                  isActive
                    ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/40"
                    : "text-white/60"
                }`
              }
            >
              <t.icon className="h-[18px] w-[18px]" />
              <span className="text-[10px] font-semibold">{t.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
