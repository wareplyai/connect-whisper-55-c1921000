import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Send, Search, Bot, User } from "lucide-react";

type Agent = { id: string; name: string; phone: string; role: string; assign?: boolean };
type ReplySettings = { mode: string; assigned_agent: string | null };

type IncomingRow = {
  id: string;
  user_id: string;
  session_id: string;
  from_number: string;
  message_text: string | null;
  message_type: string;
  image_url: string | null;
  image_caption: string | null;
  reply_sent: boolean;
  is_group: boolean;
  received_at: string;
  raw_payload: any;
};

type OutgoingRow = {
  id: string;
  user_id: string;
  session_id: string;
  to_number: string | null;
  payload: any;
  message_type: string;
  status: string;
  created_at: string;
};

const phoneTail = (p: string) => (p || "").replace(/\D/g, "").slice(-9);
const nameOf = (m: IncomingRow) =>
  m?.raw_payload?.pushName || m?.raw_payload?.notifyName || `+${m.from_number}`;

export default function CRMInbox() {
  const { user } = useAuth();
  const [incoming, setIncoming] = useState<IncomingRow[]>([]);
  const [outgoing, setOutgoing] = useState<OutgoingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePhone, setActivePhone] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [settingsByPhone, setSettingsByPhone] = useState<Record<string, ReplySettings>>({});

  // Load agents from CRM Settings (localStorage)
  useEffect(() => {
    try {
      const raw = localStorage.getItem("crm_settings");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed?.agents)) setAgents(parsed.agents);
      }
    } catch {}
  }, []);

  const loadSettings = async () => {
    if (!user) return;
    const { data } = await supabase.from("customer_reply_settings")
      .select("phone_number, mode, assigned_agent").eq("user_id", user.id);
    const map: Record<string, ReplySettings> = {};
    (data || []).forEach((r: any) => {
      map[r.phone_number] = { mode: r.mode || "ai", assigned_agent: r.assigned_agent };
    });
    setSettingsByPhone(map);
  };
  useEffect(() => { loadSettings(); /* eslint-disable-next-line */ }, [user?.id]);


  const load = async () => {
    if (!user) return;
    const [incRes, outRes] = await Promise.all([
      supabase.from("incoming_messages").select("*")
        .eq("user_id", user.id).eq("is_group", false)
        .order("received_at", { ascending: false }).limit(500),
      supabase.from("message_logs").select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }).limit(500),
    ]);
    if (!incRes.error && incRes.data) setIncoming(incRes.data as any);
    if (!outRes.error && outRes.data) setOutgoing(outRes.data as any);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user?.id]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    let t: any = null;
    const schedule = () => { if (t) clearTimeout(t); t = setTimeout(load, 250); };
    const ch = supabase.channel(`crm-inbox:${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "incoming_messages", filter: `user_id=eq.${user.id}` }, schedule)
      .on("postgres_changes", { event: "*", schema: "public", table: "message_logs", filter: `user_id=eq.${user.id}` }, schedule)
      .subscribe();
    return () => { supabase.removeChannel(ch); if (t) clearTimeout(t); };
    // eslint-disable-next-line
  }, [user?.id]);

  // Group by from_number
  const conversations = useMemo(() => {
    const map = new Map<string, { phone: string; name: string; last: IncomingRow; unread: number; lastTs: string }>();
    for (const m of incoming) {
      const key = m.from_number;
      const ex = map.get(key);
      if (!ex) {
        map.set(key, { phone: key, name: nameOf(m), last: m, unread: m.reply_sent ? 0 : 1, lastTs: m.received_at });
      } else {
        if (!m.reply_sent) ex.unread += 1;
      }
    }
    let arr = [...map.values()];
    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter(c => c.phone.includes(q) || c.name.toLowerCase().includes(q));
    }
    return arr.sort((a, b) => +new Date(b.lastTs) - +new Date(a.lastTs));
  }, [incoming, search]);

  // Auto-select first
  useEffect(() => {
    if (!activePhone && conversations.length > 0) setActivePhone(conversations[0].phone);
  }, [conversations, activePhone]);

  const active = conversations.find(c => c.phone === activePhone);

  // Build the thread (sorted asc)
  const thread = useMemo(() => {
    if (!activePhone) return [] as any[];
    const tail = phoneTail(activePhone);
    const inMsgs = incoming
      .filter(m => m.from_number === activePhone)
      .map(m => ({
        id: `i-${m.id}`,
        kind: "in" as const,
        text: m.message_text || m.image_caption || (m.image_url ? "" : ""),
        imageUrl: m.image_url,
        ts: m.received_at,
      }));
    const outRaw = outgoing
      .filter(o => phoneTail(o.to_number || "") === tail)
      .map(o => ({
        id: `o-${o.id}`,
        kind: "out" as const,
        text: (typeof o.payload === "object"
          ? (o.payload?.text || o.payload?.message)
          : String(o.payload || "")) || "",
        imageUrl: (o.payload?.image_url || null) as string | null,
        ts: o.created_at,
      }))
      .sort((a, b) => +new Date(a.ts) - +new Date(b.ts));
    // Dedupe outgoing: same text within 60s window = duplicate (gateway + ai-reply both log)
    const outMsgs: typeof outRaw = [];
    for (const m of outRaw) {
      const dup = outMsgs.find(
        x => x.text === m.text && Math.abs(+new Date(x.ts) - +new Date(m.ts)) < 60_000,
      );
      if (!dup) outMsgs.push(m);
    }
    return [...inMsgs, ...outMsgs].sort((a, b) => +new Date(a.ts) - +new Date(b.ts));
  }, [incoming, outgoing, activePhone]);

  // Mark as read when opening
  useEffect(() => {
    if (!user || !activePhone) return;
    const unreadIds = incoming
      .filter(m => m.from_number === activePhone && !m.reply_sent)
      .map(m => m.id);
    if (unreadIds.length === 0) return;
    supabase.from("incoming_messages").update({ reply_sent: true } as any)
      .in("id", unreadIds).eq("user_id", user.id).then(() => {
        setIncoming(prev => prev.map(m => unreadIds.includes(m.id) ? { ...m, reply_sent: true } : m));
      });
    // eslint-disable-next-line
  }, [activePhone]);

  // Auto-scroll
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (!el) return;
      const v = el.closest("[data-radix-scroll-area-viewport]") as HTMLElement | null;
      if (v) v.scrollTop = v.scrollHeight;
    });
    return () => cancelAnimationFrame(id);
  }, [activePhone, thread.length]);

  const send = async () => {
    if (!text.trim() || !activePhone || !user) return;
    const t = text.trim();
    setText(""); setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("crm-send-message", {
        body: { to_number: activePhone, text: t },
      });
      if (error || (data as any)?.ok === false) {
        toast.error((data as any)?.error || error?.message || "Failed to send");
      }
      load();
    } finally {
      setSending(false);
    }
  };

  const upsertSettings = async (phone: string, patch: Partial<ReplySettings>) => {
    if (!user) return;
    const cur = settingsByPhone[phone] || { mode: "ai", assigned_agent: null };
    const next = { ...cur, ...patch };
    setSettingsByPhone(p => ({ ...p, [phone]: next }));
    // Need a session_id (NOT NULL) — pull most recent for this phone
    const inc = incoming.find(m => m.from_number === phone);
    const session_id = inc?.session_id;
    if (!session_id) { toast.error("No session for this conversation"); return; }
    const { error } = await supabase.from("customer_reply_settings").upsert({
      user_id: user.id, session_id, phone_number: phone,
      mode: next.mode, assigned_agent: next.assigned_agent,
    } as any, { onConflict: "user_id,session_id,phone_number" });
    if (error) {
      // fallback: insert if no unique constraint
      await supabase.from("customer_reply_settings").insert({
        user_id: user.id, session_id, phone_number: phone,
        mode: next.mode, assigned_agent: next.assigned_agent,
      } as any);
    }
  };

  const activeSettings = activePhone ? (settingsByPhone[activePhone] || { mode: "ai", assigned_agent: null }) : null;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">WhatsApp Inbox</h1>
        <p className="text-sm text-muted-foreground">All customer conversations from WhatsApp</p>
      </div>

      <Card className="flex h-[calc(100vh-220px)] overflow-hidden">
        {/* Left list */}
        <div className="w-80 border-r border-border flex flex-col">
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="pl-8" />
            </div>
          </div>
          <ScrollArea className="flex-1">
            {loading ? (
              <p className="p-6 text-sm text-muted-foreground text-center">Loading...</p>
            ) : conversations.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground text-center">No conversations</p>
            ) : conversations.map(c => (
              <button
                key={c.phone}
                onClick={() => setActivePhone(c.phone)}
                className={`w-full text-left p-3 border-b border-border hover:bg-muted/50 ${activePhone === c.phone ? "bg-muted" : ""}`}
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {c.last.message_text || (c.last.image_url ? "📷 Image" : "")}
                    </p>
                  </div>
                  {c.unread > 0 && <Badge className="bg-primary text-primary-foreground">{c.unread}</Badge>}
                </div>
              </button>
            ))}
          </ScrollArea>
        </div>

        {/* Right chat */}
        <div className="flex-1 flex flex-col min-w-0">
          {!active ? (
            <div className="flex-1 grid place-items-center text-muted-foreground">Select a conversation</div>
          ) : (
            <>
              <div className="p-3 border-b border-border flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="font-semibold">{active.name}</p>
                  <p className="text-xs text-muted-foreground">+{active.phone}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-xs">
                    {activeSettings?.mode === "human"
                      ? <User className="h-3.5 w-3.5" />
                      : <Bot className="h-3.5 w-3.5 text-primary" />}
                    <Label className="text-xs">{activeSettings?.mode === "human" ? "Human" : "Bot"}</Label>
                    <Switch
                      checked={activeSettings?.mode !== "human"}
                      onCheckedChange={(v) => upsertSettings(active.phone, { mode: v ? "ai" : "human" })}
                    />
                  </div>
                  <Select
                    value={activeSettings?.assigned_agent || "_none"}
                    onValueChange={(v) => upsertSettings(active.phone, { assigned_agent: v === "_none" ? null : v })}
                  >
                    <SelectTrigger className="w-44 h-8 text-xs"><SelectValue placeholder="Assign agent" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">Unassigned</SelectItem>
                      {agents.filter(a => a.assign !== false).map(a => (
                        <SelectItem key={a.id} value={a.name}>{a.name}{a.role ? ` · ${a.role}` : ""}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <ScrollArea className="flex-1 bg-muted/20">
                <div ref={scrollRef} className="p-4 space-y-2">
                  {thread.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground py-8">No messages yet</p>
                  ) : thread.map(m => {
                    const isOut = m.kind === "out";
                    return (
                      <div key={m.id} className={`flex ${isOut ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[70%] rounded-lg px-3 py-2 text-sm ${isOut ? "bg-primary text-primary-foreground" : "bg-card border border-border"}`}>
                          {m.imageUrl && <img src={m.imageUrl} className="rounded mb-1 max-h-40" alt="" />}
                          {m.text && <p className="whitespace-pre-wrap break-words">{m.text}</p>}
                          <p className="text-[10px] opacity-60 mt-1">
                            {new Date(m.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>

              <div className="p-3 border-t border-border flex gap-2">
                <Input
                  value={text}
                  onChange={e => setText(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !sending && send()}
                  placeholder="Type a message..."
                  disabled={sending}
                />
                <Button onClick={send} disabled={sending || !text.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
