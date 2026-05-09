import { useEffect, useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Send, Bot, User, CheckCircle2, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

type Conv = any; type Msg = any;

const STATUS_BADGE: Record<string, string> = {
  bot: "bg-primary/15 text-primary",
  human: "bg-warning/15 text-warning",
  resolved: "bg-success/15 text-success",
};

export default function CRMInbox() {
  const { user } = useAuth();
  const [convs, setConvs] = useState<Conv[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadConvs = async () => {
    if (!user) return;
    const { data } = await supabase.from("crm_conversations").select("*").eq("user_id", user.id).order("last_message_time", { ascending: false });
    setConvs(data || []);
    if (!activeId && data && data.length > 0) setActiveId(data[0].id);
  };

  const loadMessages = async (cid: string) => {
    const { data } = await supabase.from("crm_messages").select("*").eq("conversation_id", cid).order("created_at");
    setMessages(data || []);
    setTimeout(() => scrollRef.current?.scrollTo({ top: 999999 }), 50);
    // mark as read
    await supabase.from("crm_conversations").update({ unread_count: 0 }).eq("id", cid);
  };

  useEffect(() => { loadConvs(); }, [user]);
  useEffect(() => { if (activeId) loadMessages(activeId); }, [activeId]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel("crm-inbox")
      .on("postgres_changes", { event: "*", schema: "public", table: "crm_conversations", filter: `user_id=eq.${user.id}` }, loadConvs)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "crm_messages" }, (p: any) => { if (p.new.conversation_id === activeId) loadMessages(activeId); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, activeId]);

  const active = convs.find(c => c.id === activeId);

  const send = async () => {
    if (!text.trim() || !active || !user) return;
    const t = text.trim();
    setText("");
    const { data, error } = await supabase.functions.invoke("crm-send-message", {
      body: { conversation_id: active.id, text: t },
    });
    if (error || (data as any)?.ok === false) {
      toast.error((data as any)?.error || error?.message || "Failed to send");
    }
    loadMessages(active.id); loadConvs();
  };

  const setStatus = async (status: string) => {
    if (!active) return;
    await supabase.from("crm_conversations").update({ status }).eq("id", active.id);
    toast.success(`Conversation marked ${status}`);
    loadConvs();
  };

  const filtered = convs.filter(c => {
    if (filter !== "all" && c.status !== filter) return false;
    if (search) return (c.customer_name || "").toLowerCase().includes(search.toLowerCase()) || (c.phone || "").includes(search);
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">WhatsApp Inbox</h1>
          <p className="text-sm text-muted-foreground">Manage all customer conversations</p>
        </div>
        <Button onClick={() => setNewOpen(true)}><Plus className="h-4 w-4 mr-2" /> New Chat</Button>
      </div>

      <Card className="flex h-[calc(100vh-220px)] overflow-hidden">
        {/* Left list */}
        <div className="w-80 border-r border-border flex flex-col">
          <div className="p-3 border-b border-border space-y-2">
            <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="bot">Bot</SelectItem>
                <SelectItem value="human">Human</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground text-center">No conversations</p>
            ) : filtered.map(c => (
              <button key={c.id} onClick={() => setActiveId(c.id)} className={`w-full text-left p-3 border-b border-border hover:bg-muted/50 ${activeId === c.id ? "bg-muted" : ""}`}>
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{c.customer_name || c.phone}</p>
                    <p className="text-xs text-muted-foreground truncate">{c.last_message || "No messages"}</p>
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${STATUS_BADGE[c.status] || "bg-muted"}`}>
                    {c.status === "bot" ? "🤖" : c.status === "human" ? "👤" : "✅"}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right chat */}
        <div className="flex-1 flex flex-col">
          {!active ? (
            <div className="flex-1 grid place-items-center text-muted-foreground">Select a conversation</div>
          ) : (
            <>
              <div className="p-3 border-b border-border flex items-center justify-between">
                <div>
                  <p className="font-semibold">{active.customer_name || active.phone}</p>
                  <p className="text-xs text-muted-foreground">{active.phone} • <Badge variant="outline" className="text-[10px]">{active.status}</Badge></p>
                </div>
                <div className="flex gap-1">
                  {active.status === "bot" && <Button size="sm" variant="outline" onClick={() => setStatus("human")}><User className="h-3 w-3 mr-1" /> Take Over</Button>}
                  {active.status === "human" && <Button size="sm" variant="outline" onClick={() => setStatus("bot")}><Bot className="h-3 w-3 mr-1" /> Hand to Bot</Button>}
                  <Button size="sm" variant="outline" onClick={() => setStatus("resolved")}><CheckCircle2 className="h-3 w-3 mr-1" /> Resolve</Button>
                </div>
              </div>

              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2 bg-muted/20">
                {messages.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">No messages yet</p>
                ) : messages.map(m => {
                  const isOutgoing = m.sender !== "customer";
                  return (
                    <div key={m.id} className={`flex ${isOutgoing ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[70%] rounded-lg px-3 py-2 text-sm ${isOutgoing ? "bg-primary text-primary-foreground" : "bg-card border border-border"}`}>
                        <p className="text-[10px] opacity-70 mb-0.5">{m.sender}</p>
                        {m.message_type === "image" && m.media_url && <img src={m.media_url} className="rounded mb-1 max-h-40" alt="" />}
                        <p className="whitespace-pre-wrap">{m.message_text}</p>
                        <p className="text-[10px] opacity-60 mt-1">{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-3 border-t border-border flex gap-2">
                <Input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder="Type a message..." />
                <Button onClick={send}><Send className="h-4 w-4" /></Button>
              </div>
            </>
          )}
        </div>
      </Card>

      <NewChatDialog open={newOpen} onOpenChange={setNewOpen} onCreated={(id) => { loadConvs(); setActiveId(id); }} />
    </div>
  );
}

function NewChatDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: (id: string) => void }) {
  const { user } = useAuth();
  const [name, setName] = useState(""); const [phone, setPhone] = useState("");
  const create = async () => {
    if (!user || !phone) return;
    const { data, error } = await supabase.from("crm_conversations").insert({ user_id: user.id, phone, customer_name: name || null, last_message_time: new Date().toISOString() }).select().single();
    if (error) { toast.error(error.message); return; }
    setName(""); setPhone(""); onOpenChange(false); onCreated(data.id);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>New Conversation</DialogTitle></DialogHeader>
        <div className="space-y-3"><div><Label>Customer Name</Label><Input value={name} onChange={e => setName(e.target.value)} /></div><div><Label>Phone *</Label><Input value={phone} onChange={e => setPhone(e.target.value)} /></div></div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={create}>Create</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
