import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, KeyRound, CheckCircle2, Upload, FileText, Globe, MessagesSquare, Lock, Trash2, Plus, Bot, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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
};

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
      const [{ data: biz }, { data: qaRows }, { data: fxRows }, keyRes] = await Promise.all([
        supabase.from("business_profiles").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("qa_pairs").select("*").eq("user_id", user.id).order("created_at", { ascending: true }),
        supabase.from("fixed_qa").select("*").eq("user_id", user.id).order("created_at", { ascending: true }),
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
        });
      }
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
    if (error) { toast.error(error.message); return; }
    setSavedKey(null);
    toast("API key removed");
  };

  const updateModel = async (model: string) => {
    if (!savedKey) return;
    setSavedKey({ ...savedKey, model });
    const { error } = await supabase.functions.invoke("ai-key-manager", {
      body: { action: "update_model", model },
    });
    if (error) toast.error(error.message);
  };


  const generatePrompt = () => {
    if (!business.name || !business.description) { toast.error("Fill business name & description"); return; }
    const prompt = `You are the official AI assistant for ${business.name}${business.business_type ? ` (${business.business_type})` : ""}.

ABOUT THE BUSINESS:
${business.description}

${business.location ? `Location: ${business.location}\n` : ""}${business.working_hours ? `Working Hours: ${business.working_hours}\n` : ""}${business.contact ? `Contact: ${business.contact}\n` : ""}${business.website ? `Website: ${business.website}\n` : ""}
RULES:
- Reply in the customer's language (auto-detect Bangla / English).
- Be friendly, concise, and human-like. Avoid robotic phrases.
- Use the knowledge base for accurate answers. If unsure, ask a clarifying question.
- Never invent prices, stock, or policies that aren't in the knowledge base.
- Out of scope or sensitive topics → politely redirect to a human agent.`;
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
    if (error) toast.error(error.message);
    else toast.success("Business profile saved");
  };

  // QA handlers
  const addQA = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("qa_pairs")
      .insert({ user_id: user.id, question: "", answer: "" })
      .select()
      .single();
    if (error) { toast.error(error.message); return; }
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
    if (error) toast.error(error.message);
  };
  const deleteQA = async (id: string) => {
    const { error } = await supabase.from("qa_pairs").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
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
    if (error) { toast.error(error.message); return; }
    setFixed((p) => [...p, { id: data.id, keyword: "", reply: "" }]);
  };
  const updateFixed = (id: string, patch: Partial<FixedQA>) =>
    setFixed((p) => p.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const saveFixed = async (row: FixedQA) => {
    const { error } = await supabase
      .from("fixed_qa")
      .update({ keyword: row.keyword, reply: row.reply })
      .eq("id", row.id);
    if (error) toast.error(error.message);
  };
  const deleteFixed = async (id: string) => {
    const { error } = await supabase.from("fixed_qa").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
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
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2"><Bot className="h-7 w-7 text-primary" /> AI Agent Setup</h1>
        <p className="text-sm text-muted-foreground">Connect your AI, train it on your business, and let it reply 24/7.</p>
      </div>

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
            <p className="text-xs text-muted-foreground">Exact keyword matches — bypass AI and send the fixed reply.</p>
            <Button onClick={addFixed} variant="outline"><Plus className="h-4 w-4 mr-1.5" />Add Fixed Reply</Button>
            {fixed.map((row) => (
              <div key={row.id} className="rounded-lg border border-border bg-background/40 p-3 grid md:grid-cols-[200px_1fr_auto] gap-2 items-start">
                <Input placeholder="keyword e.g. price" value={row.keyword} onChange={(e) => updateFixed(row.id, { keyword: e.target.value })} onBlur={() => saveFixed(row)} />
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
