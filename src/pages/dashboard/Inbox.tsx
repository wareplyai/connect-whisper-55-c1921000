import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Bot, Zap, User, Search, MessageSquare, Send, Loader2, Clock } from "lucide-react";
import { toast } from "sonner";

type IncomingRow = {
  id: string;
  session_id: string;
  user_id: string;
  from_number: string;
  message_text: string | null;
  reply_text: string | null;
  reply_sent: boolean;
  delivery_status: string;
  received_at: string;
  raw_payload: any;
};

type OutgoingRow = {
  id: string;
  session_id: string;
  to_number: string | null;
  payload: any;
  status: string;
  created_at: string;
};

const sourceOf = (m: IncomingRow): "ai" | "keyword_rule" | "manual" => {
  const src = m?.raw_payload?.source;
  if (src === "ai") return "ai";
  if (src === "keyword_rule" || src === "fixed_qa") return "keyword_rule";
  return "manual";
};

const SourceIcon = ({ src, className = "h-3.5 w-3.5" }: { src: string; className?: string }) => {
  if (src === "ai") return <Bot className={className} />;
  if (src === "keyword_rule") return <Zap className={className} />;
  return <User className={className} />;
};

const Inbox = () => {
  const { user } = useAuth();
  const [incoming, setIncoming] = useState<IncomingRow[]>([]);
  const [outgoing, setOutgoing] = useState<OutgoingRow[]>([]);
  const [blocked, setBlocked] = useState<{ id: string; phone_number: string; session_id: string }[]>([]);
  const [modes, setModes] = useState<{ phone_number: string; session_id: string; mode: string; ai_paused: boolean }[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<{ session_id: string; phone_number: string } | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const channelRef = useRef<any>(null);

  const load = async () => {
    if (!user) return;
    const [{ data: inc }, { data: out }, { data: bl }, { data: pa }] = await Promise.all([
      supabase.from("incoming_messages").select("*").eq("user_id", user.id).order("received_at", { ascending: false }).limit(500),
      supabase.from("message_logs").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(500),
      supabase.from("blocked_customers" as any).select("id, phone_number, session_id").eq("user_id", user.id),
      supabase.from("customer_reply_settings" as any).select("phone_number, session_id, ai_paused, mode").eq("user_id", user.id),
    ]);
    setIncoming((inc as any) || []);
    setOutgoing((out as any) || []);
    setBlocked((bl as any) || []);
    setModes((pa as any) || []);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`inbox:${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "incoming_messages", filter: `user_id=eq.${user.id}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "message_logs", filter: `user_id=eq.${user.id}` }, () => load())
      .subscribe();
    channelRef.current = ch;
    const i = setInterval(load, 10000);
    return () => { supabase.removeChannel(ch); clearInterval(i); };
    // eslint-disable-next-line
  }, [user?.id]);

  const customers = useMemo(() => {
    const map = new Map<string, { key: string; session_id: string; phone_number: string; last: IncomingRow; unread: number }>();
    for (const m of incoming) {
      const key = `${m.session_id}|${m.from_number}`;
      const ex = map.get(key);
      if (!ex) {
        map.set(key, { key, session_id: m.session_id, phone_number: m.from_number, last: m, unread: m.reply_sent ? 0 : 1 });
      } else {
        if (!m.reply_sent) ex.unread += 1;
      }
    }
    let arr = [...map.values()];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      arr = arr.filter((c) => c.phone_number.toLowerCase().includes(q));
    }
    return arr.sort((a, b) => +new Date(b.last.received_at) - +new Date(a.last.received_at));
  }, [incoming, search]);

  const selectedKey = selected ? `${selected.session_id}|${selected.phone_number}` : null;
  const isBlocked = useMemo(() => {
    if (!selected) return false;
    return blocked.some((b) => b.session_id === selected.session_id && b.phone_number === selected.phone_number);
  }, [blocked, selected]);
  const customerMode: "ai" | "human" | "auto_reply" = useMemo(() => {
    if (!selected) return "ai";
    const row = modes.find((p) => p.session_id === selected.session_id && p.phone_number === selected.phone_number);
    if (row?.mode === "human" || row?.mode === "auto_reply" || row?.mode === "ai") return row.mode as any;
    return row?.ai_paused ? "human" : "ai";
  }, [modes, selected]);

  const conversation = useMemo(() => {
    if (!selected) return [];
    const phoneTail = selected.phone_number.replace(/\D/g, "").slice(-9);
    const inc = incoming
      .filter((m) => m.session_id === selected.session_id && m.from_number === selected.phone_number)
      .map((m) => ({
        id: `i-${m.id}`,
        kind: "in" as const,
        text: m.message_text || "(no text)",
        ts: m.received_at,
      }));
    const replies = incoming
      .filter((m) => m.session_id === selected.session_id && m.from_number === selected.phone_number && m.reply_text)
      .map((m) => ({
        id: `r-${m.id}`,
        kind: "out" as const,
        text: m.reply_text!,
        ts: (m as any).reply_sent_at || m.received_at,
        source: sourceOf(m),
      }));
    const manualOut = outgoing
      .filter((o) => o.session_id === selected.session_id && (o.to_number || "").replace(/\D/g, "").endsWith(phoneTail))
      .map((o) => {
        const src = o.payload?.source;
        const source: "ai" | "keyword_rule" | "manual" =
          src === "ai" ? "ai" : (src === "keyword_rule" || src === "fixed_qa") ? "keyword_rule" : "manual";
        // Skip auto replies that already came from incoming.reply_text to avoid duplicates
        if (o.payload?.auto_reply && source !== "manual") return null;
        return {
          id: `o-${o.id}`,
          kind: "out" as const,
          text: typeof o.payload === "object" ? (o.payload?.text || JSON.stringify(o.payload)) : String(o.payload || ""),
          ts: o.created_at,
          source,
        };
      })
      .filter(Boolean) as any[];
    return [...inc, ...replies, ...manualOut].sort((a, b) => +new Date(a.ts) - +new Date(b.ts));
  }, [incoming, outgoing, selected]);

  const toggleBlock = async (next: boolean) => {
    if (!user || !selected) return;
    if (next) {
      const { error } = await supabase.from("blocked_customers" as any).insert({
        user_id: user.id, session_id: selected.session_id, phone_number: selected.phone_number,
      });
      if (error) return toast.error(error.message);
      toast.success("Customer blocked");
    } else {
      const { error } = await supabase.from("blocked_customers" as any).delete()
        .eq("user_id", user.id).eq("session_id", selected.session_id).eq("phone_number", selected.phone_number);
      if (error) return toast.error(error.message);
      toast.success("Customer unblocked");
    }
    load();
  };

  const setMode = async (next: "ai" | "human" | "auto_reply") => {
    if (!user || !selected) return;
    const { error } = await supabase.from("customer_reply_settings" as any).upsert({
      user_id: user.id,
      session_id: selected.session_id,
      phone_number: selected.phone_number,
      mode: next,
      ai_paused: next === "human",
      paused_at: next === "human" ? new Date().toISOString() : null,
    }, { onConflict: "user_id,session_id,phone_number" });
    if (error) return toast.error(error.message);
    toast.success(
      next === "ai" ? "AI Agent active for this customer" :
      next === "human" ? "Human takeover — reply manually" :
      "Auto-Reply only (keyword rules)"
    );
    load();
  };

  const sendManual = async () => {
    if (!user || !selected || !draft.trim()) return;
    setSending(true);
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      const token = authSession?.access_token;
      const url = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/send-manual-reply`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          session_id: selected.session_id,
          to_number: selected.phone_number,
          message: draft.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.ok === false) {
        toast.error(data?.error || "Send failed");
      } else {
        toast.success("Message sent");
        setDraft("");
        load();
      }
    } catch (e: any) {
      toast.error(e?.message || "Send failed");
    } finally {
      setSending(false);
    }
  };

  const isActive = (iso: string) => Date.now() - +new Date(iso) < 5 * 60 * 1000;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Inbox</h1>
        <p className="text-sm text-muted-foreground">All customer conversations across your sessions.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-220px)] min-h-[500px]">
        {/* LEFT */}
        <div className="lg:col-span-1 rounded-xl border border-border bg-card flex flex-col min-h-0">
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search phone..." className="pl-8" />
            </div>
          </div>
          <ScrollArea className="flex-1">
            {customers.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">No customers yet.</div>
            ) : (
              <ul className="divide-y divide-border">
                {customers.map((c) => {
                  const src = sourceOf(c.last);
                  const active = selectedKey === c.key;
                  const live = isActive(c.last.received_at);
                  return (
                    <li key={c.key}>
                      <button
                        onClick={() => setSelected({ session_id: c.session_id, phone_number: c.phone_number })}
                        className={`w-full text-left px-3 py-2.5 hover:bg-card-elevated transition-colors ${active ? "bg-card-elevated" : ""}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <SourceIcon src={src} className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="font-medium text-sm truncate">+{c.phone_number}</span>
                            {live && <span className="h-2 w-2 rounded-full bg-green-500 shrink-0" />}
                          </div>
                          {c.unread > 0 && <Badge className="bg-primary text-primary-foreground">{c.unread}</Badge>}
                        </div>
                        <div className="flex justify-between items-center gap-2 mt-0.5">
                          <p className="text-xs text-muted-foreground truncate">
                            {(c.last.message_text || "").slice(0, 40) || "(no text)"}
                          </p>
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {new Date(c.last.received_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </ScrollArea>
        </div>

        {/* RIGHT */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card flex flex-col min-h-0">
          {!selected ? (
            <div className="flex-1 grid place-items-center text-center p-6">
              <div className="space-y-2">
                <MessageSquare className="h-10 w-10 text-muted-foreground mx-auto" />
                <p className="text-sm text-muted-foreground">No conversation selected</p>
              </div>
            </div>
          ) : (
            <>
              <div className="p-3 border-b border-border flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <p className="font-medium truncate">+{selected.phone_number}</p>
                  <p className="text-xs text-muted-foreground">
                    {isBlocked ? "Blocked" : isAiPaused ? "AI paused — manual mode" : "AI active"}
                  </p>
                </div>
                <div className="flex items-center gap-4 flex-wrap">
                  <label className="flex items-center gap-2 text-xs">
                    {isAiPaused ? <Pause className="h-3.5 w-3.5 text-yellow-500" /> : <Play className="h-3.5 w-3.5 text-green-500" />}
                    <span className="text-muted-foreground">{isAiPaused ? "AI paused" : "AI on"}</span>
                    <Switch checked={!isAiPaused} onCheckedChange={(v) => toggleAiPause(!v)} />
                  </label>
                  <label className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">{isBlocked ? "Blocked" : "Block"}</span>
                    <Switch checked={isBlocked} onCheckedChange={toggleBlock} />
                  </label>
                </div>
              </div>
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-2">
                  {conversation.map((m) => (
                    <div key={m.id} className={`flex ${m.kind === "out" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                        m.kind === "out" ? "bg-green-500/15 text-foreground" : "bg-muted text-foreground"
                      }`}>
                        <p className="whitespace-pre-wrap break-words">{m.text}</p>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                          <span>{new Date(m.ts).toLocaleString()}</span>
                          {m.kind === "out" && (
                            <Badge variant="outline" className="text-[10px] py-0 h-4 gap-1">
                              {(m as any).source === "ai" ? <><Bot className="h-2.5 w-2.5" /> AI Agent</> :
                                (m as any).source === "keyword_rule" ? <><Zap className="h-2.5 w-2.5" /> Auto Reply</> :
                                <><User className="h-2.5 w-2.5" /> Manual</>}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {conversation.length === 0 && (
                    <p className="text-center text-sm text-muted-foreground py-8">No messages.</p>
                  )}
                </div>
              </ScrollArea>
              <div className="p-3 border-t border-border">
                <div className="flex items-end gap-2">
                  <Input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendManual(); } }}
                    placeholder={isAiPaused ? "Type your manual reply..." : "Type a reply (AI will be paused for this customer once you send)"}
                    disabled={sending || isBlocked}
                  />
                  <Button onClick={sendManual} disabled={sending || isBlocked || !draft.trim()}>
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
                {isBlocked && <p className="text-[11px] text-muted-foreground mt-1.5">Unblock the customer to send messages.</p>}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Inbox;
