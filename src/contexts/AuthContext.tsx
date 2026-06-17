import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { saveApprovalNotice } from "@/lib/accountApproval";

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  plan: string;
  max_sessions: number;
  is_active: boolean;
  approval_status: "pending" | "approved" | "rejected";
}

interface AuthCtx {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadProfileData = async (uid: string) => {
    const [{ data: p }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid),
    ]);
    setProfile(p as Profile | null);
    setIsAdmin(!!roles?.some((r: any) => r.role === "admin"));
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        setLoading(true);
        setTimeout(() => loadProfileData(s.user.id).finally(() => setLoading(false)), 0);
      } else {
        setProfile(null);
        setIsAdmin(false);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) loadProfileData(s.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  // Auto-logout if user is deactivated, unapproved, or deleted by headadmin (realtime + safety check)
  useEffect(() => {
    if (!user) return;

    const forceLogout = async (status: "pending" | "rejected" = "pending") => {
      saveApprovalNotice(status);
      try { await supabase.auth.signOut(); } catch {}
      window.location.href = "/login";
    };

    const verify = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("is_active, approval_status")
        .eq("id", user.id)
        .maybeSingle();
      if (error) return;
      if (!data || data.is_active === false || (data as any).approval_status !== "approved") {
        forceLogout((data as any)?.approval_status === "rejected" ? "rejected" : "pending");
      }
    };

    // Initial check
    verify();

    // Realtime: react instantly to UPDATE/DELETE on this user's profile row
    const channel = supabase
      .channel(`profile-watch-${user.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${user.id}` },
        (payload: any) => {
          if (!payload.new || payload.new.is_active === false || payload.new.approval_status !== "approved") {
            forceLogout(payload.new?.approval_status === "rejected" ? "rejected" : "pending");
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "profiles", filter: `id=eq.${user.id}` },
        () => forceLogout()
      )
      .subscribe();

    // Safety net: re-verify when tab regains focus
    const onFocus = () => verify();
    window.addEventListener("focus", onFocus);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("focus", onFocus);
    };
  }, [user]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const refreshProfile = async () => {
    if (user) await loadProfileData(user.id);
  };

  return (
    <Ctx.Provider value={{ user, session, profile, isAdmin, loading, signOut, refreshProfile }}>
      {children}
    </Ctx.Provider>
  );
};

export const useAuth = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used within AuthProvider");
  return c;
};
