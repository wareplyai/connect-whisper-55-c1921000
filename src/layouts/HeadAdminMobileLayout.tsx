import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Home, Bell, BellOff, Receipt, Users, LogOut } from "lucide-react";
import { useHeadAdmin } from "@/contexts/HeadAdminContext";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  getPushStatus,
  registerSW,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/pushNotifications";
import { attachHeadAdminPwaManifest } from "@/lib/pwaManifest";

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
    const detachManifest = attachHeadAdminPwaManifest();
    return () => {
      root.className = prevClasses;
      root.style.colorScheme = prevColorScheme;
      detachManifest();
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
          <div className="flex items-center gap-2">
            <PushButton userId={headAdmin?.auth_user_id} />
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

function PushButton({ userId }: { userId?: string }) {
  const [status, setStatus] = useState<string>("default");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    registerSW().catch(() => {});
    getPushStatus().then(setStatus);
  }, []);

  const enable = async () => {
    if (!userId) return toast.error("Sign in first");
    setBusy(true);
    try {
      await subscribeToPush(userId);
      setStatus("granted");
      toast.success("🔔 Lock-screen alerts enabled");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    try {
      await unsubscribeFromPush();
      setStatus("default");
      toast("Notifications disabled");
    } finally {
      setBusy(false);
    }
  };

  if (status === "unsupported") return null;
  if (status === "preview")
    return (
      <button
        onClick={() => toast("Open the published app on your phone to enable lock-screen alerts")}
        className="h-9 w-9 grid place-items-center rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400"
        aria-label="Push unavailable in preview"
      >
        <BellOff className="h-4 w-4" />
      </button>
    );

  const enabled = status === "granted";
  return (
    <button
      onClick={enabled ? disable : enable}
      disabled={busy}
      className={`h-9 w-9 grid place-items-center rounded-xl border ${
        enabled
          ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
          : "bg-white/5 border-white/10 text-white/60"
      }`}
      aria-label={enabled ? "Disable notifications" : "Enable notifications"}
    >
      {enabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
    </button>
  );
}
