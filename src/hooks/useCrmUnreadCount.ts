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
      const { count: c } = await supabase
        .from("incoming_messages")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_group", false)
        .eq("reply_sent", false);
      if (!active) return;
      setCount(c || 0);
    };
    load();

    const channel = supabase
      .channel(`crm_unread_${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "incoming_messages", filter: `user_id=eq.${user.id}` }, load)
      .subscribe();

    return () => { active = false; supabase.removeChannel(channel); };
  }, [user]);

  return count;
}
