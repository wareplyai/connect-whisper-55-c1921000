import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface HeadAdmin {
  id: string;
  name: string;
  email: string;
  auth_user_id: string;
  is_active: boolean;
  last_login: string | null;
}

interface Ctx {
  headAdmin: HeadAdmin | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const HeadAdminCtx = createContext<Ctx | undefined>(undefined);

export const HeadAdminProvider = ({ children }: { children: ReactNode }) => {
  const [headAdmin, setHeadAdmin] = useState<HeadAdmin | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      setHeadAdmin(null);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("headadmin")
      .select("*")
      .eq("auth_user_id", session.user.id)
      .eq("is_active", true)
      .maybeSingle();
    setHeadAdmin(data as HeadAdmin | null);
    setLoading(false);
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      setLoading(true);
      setTimeout(() => load(), 0);
    });
    load();
    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setHeadAdmin(null);
  };

  return (
    <HeadAdminCtx.Provider value={{ headAdmin, loading, refresh: load, signOut }}>
      {children}
    </HeadAdminCtx.Provider>
  );
};

export const useHeadAdmin = () => {
  const c = useContext(HeadAdminCtx);
  if (!c) throw new Error("useHeadAdmin must be used within HeadAdminProvider");
  return c;
};
