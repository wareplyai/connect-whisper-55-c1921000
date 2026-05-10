import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Sparkles, KeyRound, CheckCircle2, Upload, FileText, Globe, MessagesSquare, Lock, Trash2, Plus, Bot, Loader2, Smartphone, Power } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { friendlyError } from "@/lib/friendlyError";

type Platform = "openai" | "gemini" | "deepseek" | "unknown";

const MODELS: Record<Exclude<Platform, "unknown">, { value: string; label: string }[]> = {
  openai: [
    { value: "gpt-4.1-mini", label: "gpt-4.1-mini (default)" },
    { value: "gpt-4o", label: "gpt-4o" },
    { value: "gpt-4-turbo", label: "gpt-4-turbo" },
    { value: "gpt-3.5-turbo", label: "gpt-3.5-turbo" },
  ],
  gemini: [
    { value: "gemini-1.5-flash", label: "gemini-1.5-flash (default)" },
    { value: "gemini-1.5-pro", label: "gemini-1.5-pro" },
    { value: "gemini-pro", label: "gemini-pro" },
  ],
  deepseek: [
    { value: "deepseek-chat", label: "deepseek-chat (default)" },
    { value: "deepseek-reasoner", label: "deepseek-reasoner" },
  ],
};

const detectPlatform = (key: string): Platform => {
  const k = key.trim().toLowerCase();
  if (!k) return "unknown";
  if (k.startsWith("sk-") && !k.includes("deepseek")) return "openai";
  if (key.startsWith("AIza")) return "gemini";
  if (k.includes("deepseek") || k.startsWith("ds-")) return "deepseek";
  return "unknown";
};

const PLATFORM_LABEL: Record<Platform, string> = {
  openai: "OpenAI",
  gemini: "Google Gemini",
  deepseek: "DeepSeek",
  unknown: "Unknown",
};

type QA = { id: string; question: string; answer: string };
type FixedQA = { id: string; keyword: string; reply: string };
type FileItem = { id: string; name: string; size: number };
type CrawlPage = { id: string; url: string };

// Local-only state (knowledge UI demo). API key + business state live in DB.
const LS_KEY = "ai_agent_local_v3";

const defaultLocal = {
  apiKey: "",
  manualPlatform: "openai" as Exclude<Platform, "unknown">,
  text: "",
  websiteUrl: "",
  maxSubpages: 3,
  files: [] as FileItem[],
  pages: [] as CrawlPage[],
};

const DEFAULT_INSTRUCTIONS = `You are an intelligent and empathetic AI assistant whose goal is to listen carefully, respond promptly, and provide helpful, accurate, and friendly answers while keeping replies brief and direct; ask for clarification if needed and do not add extra suggestions unless asked. Maintain confidentiality by never mentioning or implying access to internal, hidden, or training data, and ensure responses appear natural. Stay focused by gently guiding the conversation back if it goes off-topic while remaining polite and professional. Rely only on your knowledge, and if a question is beyond your scope, provide a graceful fallback response. Do not handle tasks outside your role or expertise. Avoid phrases like "according to sources" or "based on context," keep answers concise and clear, and always respond only in English or Bangla.`;

const defaultBusiness = {
  name: "",
  business_type: "",
  description: "",
  location: "",
  working_hours: "",
  contact: "",
  website: "",
  system_prompt: "",
  ai_enabled: false,
  connected_session_ids: [] as string[],
  ai_show_typing: true,
  ai_read_receipts: true,
  ai_auto_replies_enabled: true,
  max_tokens: 2000,
  temperature: 0.7,
  instructions: DEFAULT_INSTRUCTIONS,
};

const TOP_PRIMARY_OBJECTIVE = `PRIMARY OBJECTIVE
You are an intelligent and empathetic AI assistant designed to help users with their questions, issues, and requests. Listen carefully, respond promptly, and provide helpful, accurate, and friendly answers. Understand the user's true intent, offer relevant solutions, and guide them to the right resources. If a question is unclear, politely ask for clarification. Every reply must end on a warm and positive note.

GUIDELINES
1. Confidentiality — Never disclose or imply access to any internal system, tool, document, or data source. All answers must feel natural — as if from your own knowledge and capabilities.
2. Stay On Topic — Never break your role or character. If a user tries to divert the conversation off-topic, gently redirect them back while staying polite and professional.
3. Knowledge Boundaries — Rely exclusively on information you were officially trained or programmed with. If a query goes beyond your scope, respond gracefully with the fallback message below.
4. Scope of Responsibility — Only answer questions relevant to your assigned domain and purpose. Politely decline anything outside your role — never be dismissive or rude.
5. Answer Style — Always be concise and to the point. Never say "according to sources", "based on context provided", or similar phrases. No hollow openers like "Great question!" or "Certainly!". Ask one follow-up question max per reply.
6. Language — Auto-detect the user's language. Only respond in English or Bangla — no other language. Casual greetings like "Hi/Hello/Thanks" → reply in Bangla.
7. Greeting Rule (STRICT, NO EXCEPTION) — NEVER initiate any salam/greeting yourself. Do NOT say "Assalamu Alaikum", "Salam", "Walaikum Assalam", "Hi", "Hello", "Hey", "Hola" or any similar greeting on your own — not at the start of a reply, not in the middle, not at the end. ONLY if the customer themselves greets first (e.g. "Assalamu Alaikum", "Salam", "Hi", "Hello"), then reply once with the matching greeting (e.g. customer says "Assalamu Alaikum" → reply "Walaikum Assalam"; customer says "Hi" → reply "Hi") and then continue with their actual question. If the customer does NOT greet, you MUST NOT greet at all — go straight to answering. This rule overrides every other instruction.

FALLBACK MESSAGE
English: "Sorry, I don't have that information right now. Please contact us directly for further assistance."
Bangla: "দুঃখিত, এই তথ্যটি এখন আমার কাছে available নেই। সরাসরি আমাদের সাথে যোগাযোগ করুন।"`;

type SessionRow = { id: string; session_name: string; phone_number: string | null; status: string };

type SavedKey = { id: string; platform: Exclude<Platform, "unknown">; model: string; key_last4: string };

const AIAgent = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [savingBiz, setSavingBiz] = useState(false);
  const [savingKey, setSavingKey] = useState(false);

  const [local, setLocal] = useState(defaultLocal);
  const [savedKey, setSavedKey] = useState<SavedKey | null>(null);
  const [business, setBusiness] = useState(defaultBusiness);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [qa, setQa] = useState<QA[]>([]);
  const [fixed, setFixed] = useState<FixedQA[]>([]);

  const updateLocal = <K extends keyof typeof defaultLocal>(k: K, v: (typeof defaultLocal)[K]) =>
    setLocal((p) => ({ ...p, [k]: v }));

  // Hydrate local UI state
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) setLocal({ ...defaultLocal, ...JSON.parse(raw) });
    } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(local)); } catch {}
  }, [local]);

  // Load DB state
  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const [{ data: biz }, { data: qaRows }, { data: fxRows }, { data: sessRows }, keyRes] = await Promise.all([
        supabase.from("business_profiles").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("qa_pairs").select("*").eq("user_id", user.id).order("created_at", { ascending: true }),
        supabase.from("fixed_qa").select("*").eq("user_id", user.id).order("created_at", { ascending: true }),
        supabase.from("sessions").select("id, session_name, phone_number, status").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.functions.invoke("ai-key-manager", { body: { action: "get" } }),
      ]);
      if (biz) {
        setBusiness({
          name: biz.name ?? "",
          business_type: biz.business_type ?? "",
          description: biz.description ?? "",
          location: biz.location ?? "",
          working_hours: biz.working_hours ?? "",
          contact: biz.contact ?? "",
          website: biz.website ?? "",
          system_prompt: biz.system_prompt ?? "",
          ai_enabled: (biz as any).ai_enabled ?? false,
          connected_session_ids: ((biz as any).connected_session_ids ?? []) as string[],
          ai_show_typing: (biz as any).ai_show_typing ?? true,
          ai_read_receipts: (biz as any).ai_read_receipts ?? true,
          ai_auto_replies_enabled: (biz as any).ai_auto_replies_enabled ?? true,
          max_tokens: (biz as any).max_tokens ?? 2000,
          temperature: typeof (biz as any).temperature === "number" ? Number((biz as any).temperature) : 0.7,
          instructions: ((biz as any).instructions ?? DEFAULT_INSTRUCTIONS) as string,
        });
      }
      setSessions((sessRows ?? []) as SessionRow[]);
      setQa((qaRows ?? []).map((r: any) => ({ id: r.id, question: r.question, answer: r.answer })));
      setFixed((fxRows ?? []).map((r: any) => ({ id: r.id, keyword: r.keyword, reply: r.reply })));
      if (keyRes?.data?.key) setSavedKey(keyRes.data.key as SavedKey);
      setLoading(false);
    })();
  }, [user]);

  const effectivePlatform: Platform = savedKey?.platform ?? "unknown";
  const modelOptions = effectivePlatform !== "unknown" ? MODELS[effectivePlatform] : [];
  const masked = savedKey ? `••••••••••••${savedKey.key_last4}` : "";

  const saveKey = async () => {
    if (!local.apiKey.trim()) { toast.error("Paste your API key first"); return; }
    setSavingKey(true);
    const detected = detectPlatform(local.apiKey);
    const platform = detected !== "unknown" ? detected : local.manualPlatform;
    const model = MODELS[platform][0].value;
    const { data, error } = await supabase.functions.invoke("ai-key-manager", {
      body: { action: "save", apiKey: local.apiKey, platform, model },
    });
    setSavingKey(false);
    if (error || data?.error) { toast.error(error?.message || data?.error || "Failed to save key"); return; }
    setSavedKey(data.key);
    setLocal((p) => ({ ...p, apiKey: "" }));
    toast.success(`🔒 Encrypted & saved — ${PLATFORM_LABEL[platform]}`);
  };

  const removeKey = async () => {
    const { error } = await supabase.functions.invoke("ai-key-manager", { body: { action: "delete" } });
    if (error) { toast.error(friendlyError(error)); return; }
    setSavedKey(null);
    toast("API key removed");
  };

  const updateModel = async (model: string) => {
    if (!savedKey) return;
    setSavedKey({ ...savedKey, model });
    const { error } = await supabase.functions.invoke("ai-key-manager", {
      body: { action: "update_model", model },
    });
    if (error) toast.error(friendlyError(error));
  };


  const generatePrompt = () => {
    if (!business.name || !business.description) { toast.error("Fill business name & description"); return; }
    const instructionsBlock = (business.instructions || DEFAULT_INSTRUCTIONS).trim();
    const businessBlock = `You are the official AI assistant for ${business.name}${business.business_type ? ` (${business.business_type})` : ""}.

ABOUT THE BUSINESS:
${business.description}

${business.location ? `Location: ${business.location}\n` : ""}${business.working_hours ? `Working Hours: ${business.working_hours}\n` : ""}${business.contact ? `Contact: ${business.contact}\n` : ""}${business.website ? `Website: ${business.website}\n` : ""}
RULES:
- Reply in the customer's language (auto-detect Bangla / English).
- Be friendly, concise, and human-like. Avoid robotic phrases.
- Use the knowledge base for accurate answers. If unsure, ask a clarifying question.
- Never invent prices, stock, or policies that aren't in the knowledge base.
- Out of scope or sensitive topics → politely redirect to a human agent.`;
    const prompt = `INSTRUCTIONS FOR THIS CHATBOT\n${instructionsBlock}\n\n---\n\n${TOP_PRIMARY_OBJECTIVE}\n\n---\n\n${businessBlock}`;
    setBusiness((p) => ({ ...p, system_prompt: prompt }));
    toast.success("System prompt generated — click Save Business Profile");
  };

  const saveBusiness = async () => {
    if (!user) return;
    setSavingBiz(true);
    const { error } = await supabase
      .from("business_profiles")
      .upsert({ user_id: user.id, ...business }, { onConflict: "user_id" });
    setSavingBiz(false);
    if (error) toast.error(friendlyError(error));
    else toast.success("Business profile saved");
  };

  const persistBusinessPatch = async (patch: Partial<typeof defaultBusiness>) => {
    if (!user) return;
    const next = { ...business, ...patch };
    setBusiness(next);
    const { error } = await supabase
      .from("business_profiles")
      .upsert({ user_id: user.id, ...next }, { onConflict: "user_id" });
    if (error) toast.error(friendlyError(error));
  };

  const toggleAI = async (v: boolean) => {
    if (v && !savedKey) { toast.error("Save your AI API key first"); return; }
    if (v && business.connected_session_ids.length === 0) {
      toast.error("Connect at least one WhatsApp session first");
      return;
    }
    if (!user) return;
    if (v) {
      // Disable all keyword auto-reply rules (mutex)
      const { data: activeRules } = await supabase
        .from("auto_reply_rules")
        .select("id")
        .eq("user_id", user.id)
        .eq("is_active", true);
      if (activeRules && activeRules.length > 0) {
        await supabase
          .from("auto_reply_rules")
          .update({ is_active: false })
          .eq("user_id", user.id);
        toast.info("Auto-Reply has been turned off. AI Agent is now active.");
      }
      await supabase
        .from("business_profiles")
        .upsert({ user_id: user.id, ...business, ai_enabled: true, active_reply_mode: "ai_agent" }, { onConflict: "user_id" });
      setBusiness((p) => ({ ...p, ai_enabled: true }));
      toast.success("🟢 AI Agent ON");
    } else {
      await supabase
        .from("business_profiles")
        .upsert({ user_id: user.id, ...business, ai_enabled: false, active_reply_mode: "none" }, { onConflict: "user_id" });
      setBusiness((p) => ({ ...p, ai_enabled: false }));
      toast.success("⚪ AI Agent OFF");
    }
  };

  const toggleSession = async (sessionId: string, checked: boolean) => {
    const set = new Set(business.connected_session_ids);
    if (checked) set.add(sessionId); else set.delete(sessionId);
    await persistBusinessPatch({ connected_session_ids: Array.from(set) });
  };

  // QA handlers
  const addQA = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("qa_pairs")
      .insert({ user_id: user.id, question: "", answer: "" })
      .select()
      .single();
    if (error) { toast.error(friendlyError(error)); return; }
    setQa((p) => [...p, { id: data.id, question: "", answer: "" }]);
  };
  const updateQA = async (id: string, patch: Partial<QA>) => {
    setQa((p) => p.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  };
  const saveQA = async (row: QA) => {
    if (!user) return;
    const { error } = await supabase
      .from("qa_pairs")
      .update({ question: row.question, answer: row.answer })
      .eq("id", row.id);
    if (error) toast.error(friendlyError(error));
  };
  const deleteQA = async (id: string) => {
    const { error } = await supabase.from("qa_pairs").delete().eq("id", id);
    if (error) { toast.error(friendlyError(error)); return; }
    setQa((p) => p.filter((x) => x.id !== id));
  };

  // Fixed QA
  const addFixed = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("fixed_qa")
      .insert({ user_id: user.id, keyword: "", reply: "" })
      .select()
      .single();
    if (error) { toast.error(friendlyError(error)); return; }
    setFixed((p) => [...p, { id: data.id, keyword: "", reply: "" }]);
  };
  const updateFixed = (id: string, patch: Partial<FixedQA>) =>
    setFixed((p) => p.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const saveFixed = async (row: FixedQA) => {
    const { error } = await supabase
      .from("fixed_qa")
      .update({ keyword: row.keyword, reply: row.reply })
      .eq("id", row.id);
    if (error) toast.error(friendlyError(error));
  };
  const deleteFixed = async (id: string) => {
    const { error } = await supabase.from("fixed_qa").delete().eq("id", id);
    if (error) { toast.error(friendlyError(error)); return; }
    setFixed((p) => p.filter((x) => x.id !== id));
  };

  // Knowledge UI demo (still local — needs embedding pipeline)
  const onFiles = (files: FileList | null) => {
    if (!files) return;
    const next: FileItem[] = [];
    for (const f of Array.from(files)) {
      if (f.size > 25 * 1024 * 1024) { toast.error(`${f.name} > 25MB`); continue; }
      next.push({ id: crypto.randomUUID(), name: f.name, size: f.size });
    }
    if (next.length) {
      updateLocal("files", [...local.files, ...next]);
      toast.success(`${next.length} file(s) added (UI demo)`);
    }
  };
  const fetchLinks = () => {
    if (!local.websiteUrl.trim()) { toast.error("Enter a URL"); return; }
    const fake = Array.from({ length: Math.min(local.maxSubpages, 5) }).map((_, i) => ({
      id: crypto.randomUUID(),
      url: i === 0 ? local.websiteUrl : `${local.websiteUrl.replace(/\/$/, "")}/page-${i}`,
    }));
    updateLocal("pages", [...local.pages, ...fake]);
    toast.success(`Queued ${fake.length} pages (UI demo)`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><Bot className="h-7 w-7 text-primary" /> AI Agent Setup</h1>
          <p className="text-sm text-muted-foreground">Connect your AI, train it on your business, and let it reply 24/7.</p>
        </div>

        {/* MASTER ON/OFF */}
        <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${business.ai_enabled ? "border-green-500/40 bg-green-500/10" : "border-border bg-card"}`}>
          <Power className={`h-5 w-5 ${business.ai_enabled ? "text-green-500" : "text-muted-foreground"}`} />
          <div className="text-sm">
            <p className="font-semibold">{business.ai_enabled ? "AI Agent is ON" : "AI Agent is OFF"}</p>
            <p className="text-xs text-muted-foreground">{business.ai_enabled ? "Replying automatically" : "Toggle on to start replying"}</p>
          </div>
          <Switch checked={business.ai_enabled} onCheckedChange={toggleAI} />
        </div>
      </div>

      {/* SESSIONS */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">WhatsApp Sessions</h2>
          <span className="ml-auto text-xs text-muted-foreground">
            {business.connected_session_ids.length} of {sessions.length} connected
          </span>
        </div>

        {sessions.length === 0 ? (
          <div className="text-center py-6 border border-dashed border-border rounded-lg">
            <p className="text-sm text-muted-foreground mb-3">No WhatsApp sessions yet.</p>
            <Link to="/dashboard/sessions/create">
              <Button variant="outline"><Plus className="h-4 w-4 mr-1.5" />Create a Session</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map((s) => {
              const checked = business.connected_session_ids.includes(s.id);
              const connected = s.status === "connected";
              return (
                <label key={s.id} className="flex items-center gap-3 rounded-lg border border-border bg-background/40 p-3 cursor-pointer hover:border-primary/50 transition-colors">
                  <Checkbox checked={checked} onCheckedChange={(v) => toggleSession(s.id, !!v)} />
                  <Smartphone className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{s.session_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{s.phone_number || "Not connected yet"}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${connected ? "bg-green-500/15 text-green-500" : "bg-muted text-muted-foreground"}`}>
                    {s.status}
                  </span>
                </label>
              );
            })}
          </div>
        )}
        <p className="text-xs text-muted-foreground">Select which WhatsApp numbers the AI agent should reply on.</p>
      </section>

      {/* AI BEHAVIOR CONTROLS — independent from session settings */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">AI Reply Behavior</h2>
        </div>
        <p className="text-xs text-muted-foreground">These controls only affect AI Agent replies. Webhook/auto-reply users use the session-level toggles.</p>

        {[
          { k: "ai_show_typing" as const, label: "Show Typing Indicator", desc: "Show 'typing…' on customer's phone before AI sends a reply." },
          { k: "ai_read_receipts" as const, label: "Mark Messages as Read (Blue Tick)", desc: "When AI replies, mark the customer's message as read on WhatsApp." },
          { k: "ai_auto_replies_enabled" as const, label: "Enable Auto Replies (AI side)", desc: "Allow keyword/fixed-Q&A auto-replies to fire from the AI Agent flow." },
        ].map((c) => (
          <div key={c.k} className="flex items-start justify-between gap-4 py-1">
            <div>
              <p className="text-sm font-medium">{c.label}</p>
              <p className="text-xs text-muted-foreground">{c.desc}</p>
            </div>
            <Switch
              checked={(business as any)[c.k]}
              onCheckedChange={(v) => persistBusinessPatch({ [c.k]: v } as any)}
            />
          </div>
        ))}
      </section>

      {/* API KEY (encrypted server-side) */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">AI API Key</h2>
        </div>

        {!savedKey ? (
          <div className="space-y-3">
            <div className="grid md:grid-cols-[180px_1fr_auto] gap-2">
              <Select value={local.manualPlatform} onValueChange={(v) => updateLocal("manualPlatform", v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="gemini">Google Gemini</SelectItem>
                  <SelectItem value="deepseek">DeepSeek</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="password"
                placeholder="Paste your AI API Key"
                value={local.apiKey}
                onChange={(e) => updateLocal("apiKey", e.target.value)}
              />
              <Button onClick={saveKey} disabled={savingKey} className="bg-primary text-primary-foreground hover:bg-primary-hover">
                {savingKey && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}Save
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">🔒 Your key is AES-256 encrypted server-side. Only the last 4 characters are ever shown.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-background/40 p-3">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Connected to {PLATFORM_LABEL[effectivePlatform]}</p>
                <p className="text-xs text-muted-foreground">{masked}</p>
              </div>
              <Button variant="outline" size="sm" onClick={removeKey}>Remove</Button>
            </div>

            <div>
              <Label>Model</Label>
              <Select value={savedKey.model || modelOptions[0]?.value} onValueChange={updateModel}>
                <SelectTrigger><SelectValue placeholder="Select model" /></SelectTrigger>
                <SelectContent>
                  {modelOptions.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Max Reply Tokens</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={50}
                  max={4000}
                  step={50}
                  value={business.max_tokens}
                  onChange={(e) => setBusiness({ ...business, max_tokens: Math.max(50, Math.min(4000, Number(e.target.value) || 500)) })}
                  className="max-w-[160px]"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => persistBusinessPatch({ max_tokens: business.max_tokens })}
                >
                  Save
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Controls the maximum length of every AI reply (50–4000). Lower = shorter & cheaper. Default 500.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* BUSINESS INFO (Supabase wired) */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="font-semibold">Business Information</h2>
        <div className="grid md:grid-cols-2 gap-3">
          <div><Label>Business Name</Label><Input value={business.name} onChange={(e) => setBusiness({ ...business, name: e.target.value })} /></div>
          <div>
            <Label>Business Type</Label>
            <Select value={business.business_type} onValueChange={(v) => setBusiness({ ...business, business_type: v })}>
              <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>
                {["E-commerce","Restaurant","Service","Education","Healthcare","Other"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2"><Label>Description</Label><Textarea rows={3} placeholder="What do you sell / offer?" value={business.description} onChange={(e) => setBusiness({ ...business, description: e.target.value })} /></div>
          <div><Label>Location / Address</Label><Input value={business.location} onChange={(e) => setBusiness({ ...business, location: e.target.value })} /></div>
          <div><Label>Working Hours</Label><Input placeholder="Sat–Thu 10am–10pm" value={business.working_hours} onChange={(e) => setBusiness({ ...business, working_hours: e.target.value })} /></div>
          <div><Label>Contact Info</Label><Input value={business.contact} onChange={(e) => setBusiness({ ...business, contact: e.target.value })} /></div>
          <div><Label>Website (optional)</Label><Input value={business.website} onChange={(e) => setBusiness({ ...business, website: e.target.value })} /></div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={generatePrompt} variant="outline">
            <Sparkles className="h-4 w-4 mr-1.5" /> Auto-Generate Prompt
          </Button>
          <Button onClick={saveBusiness} disabled={savingBiz} className="bg-primary text-primary-foreground hover:bg-primary-hover">
            {savingBiz && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            Save Business Profile
          </Button>
        </div>

        {business.system_prompt && (
          <div className="space-y-2">
            <Label>System Prompt (editable)</Label>
            <Textarea rows={10} value={business.system_prompt} onChange={(e) => setBusiness({ ...business, system_prompt: e.target.value })} />
          </div>
        )}
      </section>

      {/* KNOWLEDGE BASE */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="font-semibold">Knowledge Base</h2>
        <Tabs defaultValue="qa">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="files"><FileText className="h-4 w-4 mr-1.5" />Files</TabsTrigger>
            <TabsTrigger value="text"><FileText className="h-4 w-4 mr-1.5" />Text</TabsTrigger>
            <TabsTrigger value="website"><Globe className="h-4 w-4 mr-1.5" />Website</TabsTrigger>
            <TabsTrigger value="qa"><MessagesSquare className="h-4 w-4 mr-1.5" />Q&A</TabsTrigger>
            <TabsTrigger value="fixed"><Lock className="h-4 w-4 mr-1.5" />Fixed Q&A</TabsTrigger>
          </TabsList>

          <TabsContent value="files" className="space-y-3 pt-3">
            <p className="text-xs text-muted-foreground">⚠️ UI demo — embedding pipeline coming next.</p>
            <label className="block border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/60 transition-colors">
              <input type="file" multiple className="hidden" accept=".pdf,.doc,.docx,.txt,.xlsx" onChange={(e) => onFiles(e.target.files)} />
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm font-medium">Drag & drop or click to upload</p>
              <p className="text-xs text-muted-foreground">PDF, DOC, DOCX, TXT, XLSX — max 25MB</p>
            </label>
            {local.files.length > 0 && (
              <div className="space-y-2">
                {local.files.map((f) => (
                  <div key={f.id} className="flex items-center gap-3 rounded-lg border border-border bg-background/40 p-3">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="flex-1 text-sm truncate">{f.name}</span>
                    <span className="text-xs text-muted-foreground">{(f.size / 1024).toFixed(1)} KB</span>
                    <Button variant="ghost" size="sm" onClick={() => updateLocal("files", local.files.filter((x) => x.id !== f.id))}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="text" className="space-y-3 pt-3">
            <p className="text-xs text-muted-foreground">⚠️ UI demo — embedding pipeline coming next.</p>
            <Textarea rows={8} placeholder="Paste any business knowledge: FAQs, policies, product info..." value={local.text} onChange={(e) => updateLocal("text", e.target.value)} />
            <Button onClick={() => { toast.success("Text queued (UI demo)"); updateLocal("text",""); }} className="bg-primary text-primary-foreground hover:bg-primary-hover"><Plus className="h-4 w-4 mr-1.5" />Add Text</Button>
          </TabsContent>

          <TabsContent value="website" className="space-y-3 pt-3">
            <p className="text-xs text-muted-foreground">⚠️ UI demo — crawler coming next.</p>
            <div className="grid md:grid-cols-[1fr_180px_auto] gap-2">
              <Input placeholder="https://yourbusiness.com" value={local.websiteUrl} onChange={(e) => updateLocal("websiteUrl", e.target.value)} />
              <div>
                <Select value={String(local.maxSubpages)} onValueChange={(v) => updateLocal("maxSubpages", Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 10 }).map((_, i) => <SelectItem key={i+1} value={String(i+1)}>Max {i+1} subpages</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={fetchLinks} className="bg-primary text-primary-foreground hover:bg-primary-hover">Fetch Links</Button>
            </div>
            {local.pages.length > 0 && (
              <div className="space-y-2">
                {local.pages.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 rounded-lg border border-border bg-background/40 p-3">
                    <Globe className="h-4 w-4 text-primary" />
                    <span className="flex-1 text-sm truncate">{p.url}</span>
                    <Button variant="ghost" size="sm" onClick={() => updateLocal("pages", local.pages.filter((x) => x.id !== p.id))}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="qa" className="space-y-3 pt-3">
            <Button onClick={addQA} variant="outline"><Plus className="h-4 w-4 mr-1.5" />Add Q&A Pair</Button>
            {qa.map((row) => (
              <div key={row.id} className="rounded-lg border border-border bg-background/40 p-3 space-y-2">
                <Input placeholder="Question" value={row.question} onChange={(e) => updateQA(row.id, { question: e.target.value })} onBlur={() => saveQA(row)} />
                <Textarea rows={2} placeholder="Answer" value={row.answer} onChange={(e) => updateQA(row.id, { answer: e.target.value })} onBlur={() => saveQA(row)} />
                <div className="flex justify-end">
                  <Button variant="ghost" size="sm" onClick={() => deleteQA(row.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="fixed" className="space-y-3 pt-3">
            <p className="text-xs text-muted-foreground">
              Keyword match হলে AI bypass হয়ে এই fixed reply যাবে। একই reply-এর জন্য একাধিক keyword দিতে চাইলে <b>comma (,)</b> দিয়ে আলাদা করো — যেমন <code>price, দাম, rate, cost</code>। যেকোনো একটা match করলেই reply যাবে।
            </p>
            <Button onClick={addFixed} variant="outline"><Plus className="h-4 w-4 mr-1.5" />Add Fixed Reply</Button>
            {fixed.map((row) => (
              <div key={row.id} className="rounded-lg border border-border bg-background/40 p-3 grid md:grid-cols-[200px_1fr_auto] gap-2 items-start">
                <Input placeholder="price, দাম, rate" value={row.keyword} onChange={(e) => updateFixed(row.id, { keyword: e.target.value })} onBlur={() => saveFixed(row)} />
                <Textarea rows={2} placeholder="Exact reply to send" value={row.reply} onChange={(e) => updateFixed(row.id, { reply: e.target.value })} onBlur={() => saveFixed(row)} />
                <Button variant="ghost" size="sm" onClick={() => deleteFixed(row.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </section>
    </div>
  );
};

export default AIAgent;
