import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Bot, Zap, User, Search, MessageSquare, Send, Loader2, Clock, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { friendlyError } from "@/lib/friendlyError";
import { Skeleton } from "@/components/ui/skeleton";

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

const CACHE_KEY = "inbox_cache_v1";
const readCache = (uid?: string) => {
  if (!uid) return null;
  try {
    const raw = sessionStorage.getItem(`${CACHE_KEY}:${uid}`);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};
const writeCache = (uid: string, payload: any) => {
  try { sessionStorage.setItem(`${CACHE_KEY}:${uid}`, JSON.stringify(payload)); } catch {}
};

const Inbox = () => {
  const { user } = useAuth();
  const cached = readCache(user?.id);
  const [incoming, setIncoming] = useState<IncomingRow[]>(cached?.incoming || []);
  const [outgoing, setOutgoing] = useState<OutgoingRow[]>(cached?.outgoing || []);
  const [blocked, setBlocked] = useState<{ id: string; phone_number: string; session_id: string }[]>(cached?.blocked || []);
  const [modes, setModes] = useState<{ phone_number: string; session_id: string; mode: string; ai_paused: boolean }[]>(cached?.modes || []);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<{ session_id: string; phone_number: string } | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(!cached);
  const channelRef = useRef<any>(null);

  const load = async (showLoader = false) => {
    if (!user) return;
    if (showLoader && !cached) setLoading(true);
    try {
      const [incRes, outRes, blRes, paRes] = await Promise.all([
        supabase.from("incoming_messages").select("*").eq("user_id", user.id).order("received_at", { ascending: false }).limit(500),
        supabase.from("message_logs").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(500),
        supabase.from("blocked_customers" as any).select("id, phone_number, session_id").eq("user_id", user.id),
        supabase.from("customer_reply_settings" as any).select("phone_number, session_id, ai_paused, mode").eq("user_id", user.id),
      ]);
      // Never blank the UI on a transient error — keep previous state.
      if (!incRes.error && incRes.data) setIncoming(incRes.data as any);
      if (!outRes.error && outRes.data) setOutgoing(outRes.data as any);
      if (!blRes.error && blRes.data) setBlocked(blRes.data as any);
      if (!paRes.error && paRes.data) setModes(paRes.data as any);
      if (!incRes.error && !outRes.error) {
        writeCache(user.id, {
          incoming: incRes.data || [],
          outgoing: outRes.data || [],
          blocked: blRes.data || [],
          modes: paRes.data || [],
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(true); /* eslint-disable-next-line */ }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    let t: any = null;
    const schedule = () => { if (t) clearTimeout(t); t = setTimeout(() => load(false), 250); };
    const ch = supabase
      .channel(`inbox:${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "incoming_messages", filter: `user_id=eq.${user.id}` }, schedule)
      .on("postgres_changes", { event: "*", schema: "public", table: "message_logs", filter: `user_id=eq.${user.id}` }, schedule)
      .subscribe();
    channelRef.current = ch;
    // Safety-net poll: 30s instead of 10s so the UI doesn't churn / blank.
    const i = setInterval(() => load(false), 30000);
    return () => { supabase.removeChannel(ch); clearInterval(i); if (t) clearTimeout(t); };
    // eslint-disable-next-line
  }, [user?.id]);

  const customers = useMemo(() => {
    const map = new Map<string, { key: string; session_id: string; phone_number: string; last: IncomingRow; unread: number }>();
    const replied = (m: IncomingRow) => m.reply_sent || !!m.reply_text;
    for (const m of incoming) {
      const key = `${m.session_id}|${m.from_number}`;
      const ex = map.get(key);
      if (!ex) {
        map.set(key, { key, session_id: m.session_id, phone_number: m.from_number, last: m, unread: replied(m) ? 0 : 1 });
      } else {
        if (!replied(m)) ex.unread += 1;
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

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const conversation = useMemo(() => {
    if (!selected) return [];
    const phoneTail = selected.phone_number.replace(/\D/g, "").slice(-9);
    const inc = incoming
      .filter((m) => m.session_id === selected.session_id && m.from_number === selected.phone_number)
      .map((m) => ({
        id: `i-${m.id}`,
        srcTable: "incoming_messages" as const,
        srcId: m.id,
        srcField: "message" as const,
        kind: "in" as const,
        text: m.message_text || "(no text)",
        ts: m.received_at,
        pending: !m.reply_sent && !m.reply_text,
      }));
    const replies = incoming
      .filter((m) => m.session_id === selected.session_id && m.from_number === selected.phone_number && m.reply_text)
      .map((m) => ({
        id: `r-${m.id}`,
        srcTable: "incoming_messages" as const,
        srcId: m.id,
        srcField: "reply" as const,
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
        if (src !== "manual") return null;
        return {
          id: `o-${o.id}`,
          srcTable: "message_logs" as const,
          srcId: o.id,
          srcField: "row" as const,
          kind: "out" as const,
          text: typeof o.payload === "object" ? (o.payload?.text || JSON.stringify(o.payload)) : String(o.payload || ""),
          ts: o.created_at,
          source,
        };
      })
      .filter(Boolean) as any[];
    return [...inc, ...replies, ...manualOut].sort((a, b) => +new Date(a.ts) - +new Date(b.ts));
  }, [incoming, outgoing, selected]);

  useEffect(() => {
    if (!selected) return;
    const id = requestAnimationFrame(() => {
      const el = bottomRef.current;
      if (!el) return;
      const viewport = el.closest("[data-radix-scroll-area-viewport]") as HTMLElement | null;
      if (viewport) viewport.scrollTop = viewport.scrollHeight;
      else el.scrollIntoView({ block: "end" });
    });
    return () => cancelAnimationFrame(id);
  }, [selectedKey, conversation.length]);

  const toggleBlock = async (next: boolean) => {
    if (!user || !selected) return;
    if (next) {
      const { error } = await supabase.from("blocked_customers" as any).insert({
        user_id: user.id, session_id: selected.session_id, phone_number: selected.phone_number,
      });
      if (error) return toast.error(friendlyError(error));
      toast.success("Customer blocked");
    } else {
      const { error } = await supabase.from("blocked_customers" as any).delete()
        .eq("user_id", user.id).eq("session_id", selected.session_id).eq("phone_number", selected.phone_number);
      if (error) return toast.error(friendlyError(error));
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
    if (error) return toast.error(friendlyError(error));
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

  const deleteMessage = async (m: any) => {
    if (!user) return;
    if (!confirm("Delete this message? This cannot be undone.")) return;
    try {
      if (m.srcTable === "incoming_messages") {
        if (m.srcField === "reply") {
          const { error } = await supabase
            .from("incoming_messages")
            .update({ reply_text: null } as any)
            .eq("id", m.srcId)
            .eq("user_id", user.id);
          if (error) throw error;
          setIncoming((prev) => prev.map((r) => r.id === m.srcId ? { ...r, reply_text: null } as any : r));
        } else {
          const { error } = await supabase
            .from("incoming_messages")
            .delete()
            .eq("id", m.srcId)
            .eq("user_id", user.id);
          if (error) throw error;
          setIncoming((prev) => prev.filter((r) => r.id !== m.srcId));
        }
      } else if (m.srcTable === "message_logs") {
        const { error } = await supabase
          .from("message_logs")
          .delete()
          .eq("id", m.srcId)
          .eq("user_id", user.id);
        if (error) throw error;
        setOutgoing((prev) => prev.filter((r) => r.id !== m.srcId));
      }
      toast.success("Message deleted");
    } catch (e: any) {
      toast.error(friendlyError(e) || "Delete failed");
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
            {loading ? (
              <ul className="divide-y divide-border animate-fade-in">
                {Array.from({ length: 8 }).map((_, i) => (
                  <li key={i} className="px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Skeleton className="h-3.5 w-3.5 rounded-full" />
                        <Skeleton className="h-3.5 w-28" />
                      </div>
                      <Skeleton className="h-4 w-6 rounded-full" />
                    </div>
                    <div className="mt-2">
                      <Skeleton className="h-3 w-3/4" />
                    </div>
                  </li>
                ))}
              </ul>
            ) : customers.length === 0 ? (
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
                    {isBlocked ? "Blocked" :
                      customerMode === "human" ? "Human takeover — manual mode" :
                      customerMode === "auto_reply" ? "Auto-Reply only (keyword rules)" :
                      "AI Agent active"}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="inline-flex rounded-md border border-border overflow-hidden text-xs">
                    {(["ai", "human", "auto_reply"] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => setMode(m)}
                        className={`px-2.5 py-1.5 flex items-center gap-1 transition-colors ${
                          customerMode === m ? "bg-primary text-primary-foreground" : "bg-card hover:bg-card-elevated text-muted-foreground"
                        }`}
                      >
                        {m === "ai" ? <><Bot className="h-3 w-3" /> AI</> :
                          m === "human" ? <><User className="h-3 w-3" /> Human</> :
                          <><Zap className="h-3 w-3" /> Auto</>}
                      </button>
                    ))}
                  </div>
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
                          {m.kind === "in" && (m as any).pending && (
                            <Badge variant="outline" className="text-[10px] py-0 h-4 gap-1 border-yellow-500/50 text-yellow-600">
                              <Clock className="h-2.5 w-2.5" /> Pending
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {conversation.length === 0 && (
                    <p className="text-center text-sm text-muted-foreground py-8">No messages.</p>
                  )}
                  <div ref={bottomRef} />
                </div>
              </ScrollArea>
              <div className="p-3 border-t border-border">
                <div className="flex items-end gap-2">
                  <Input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendManual(); } }}
                    placeholder={customerMode === "human" ? "Type your manual reply..." : "Type a reply (sending will switch this customer to Human mode)"}
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
