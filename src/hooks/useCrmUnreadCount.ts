import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useCrmUnreadCount() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user) { setCount(0); return; }
    let active = true;

    const load = async () => {
      const { data } = await supabase
        .from("crm_conversations")
        .select("unread_count")
        .eq("user_id", user.id);
      if (!active) return;
      const total = (data || []).reduce((s: number, r: any) => s + (r.unread_count || 0), 0);
      setCount(total);
    };
    load();

    const channel = supabase
      .channel(`crm_unread_${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "crm_conversations", filter: `user_id=eq.${user.id}` }, load)
      .subscribe();

    return () => { active = false; supabase.removeChannel(channel); };
  }, [user]);

  return count;
}
