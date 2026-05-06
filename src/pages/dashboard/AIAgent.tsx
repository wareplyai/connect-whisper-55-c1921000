import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, KeyRound, CheckCircle2, Upload, FileText, Globe, MessagesSquare, Lock, Trash2, Plus, Bot } from "lucide-react";
import { toast } from "sonner";

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

type QA = { id: string; q: string; a: string };
type FixedQA = { id: string; keyword: string; reply: string };
type FileItem = { id: string; name: string; size: number };
type CrawlPage = { id: string; url: string };

const LS_KEY = "ai_agent_setup_v1";

const defaultState = {
  apiKey: "",
  savedKey: "",
  platform: "unknown" as Platform,
  manualPlatform: "openai" as Exclude<Platform, "unknown">,
  model: "",
  business: {
    name: "",
    type: "",
    description: "",
    location: "",
    hours: "",
    contact: "",
    website: "",
  },
  systemPrompt: "",
  text: "",
  websiteUrl: "",
  maxSubpages: 3,
  files: [] as FileItem[],
  pages: [] as CrawlPage[],
  qa: [] as QA[],
  fixed: [] as FixedQA[],
};

const AIAgent = () => {
  const [s, setS] = useState(defaultState);
  const update = <K extends keyof typeof defaultState>(k: K, v: (typeof defaultState)[K]) =>
    setS((p) => ({ ...p, [k]: v }));

  // hydrate
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) setS({ ...defaultState, ...JSON.parse(raw) });
    } catch {}
  }, []);
  // persist
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch {}
  }, [s]);

  const effectivePlatform: Platform = s.platform === "unknown" && s.savedKey ? s.manualPlatform : s.platform;
  const modelOptions = effectivePlatform !== "unknown" ? MODELS[effectivePlatform] : [];

  const masked = useMemo(() => {
    if (!s.savedKey) return "";
    const tail = s.savedKey.slice(-4);
    return `••••••••••••${tail}`;
  }, [s.savedKey]);

  const saveKey = () => {
    if (!s.apiKey.trim()) { toast.error("Paste your API key first"); return; }
    const platform = detectPlatform(s.apiKey);
    const def = platform !== "unknown" ? MODELS[platform][0].value : "";
    setS((p) => ({ ...p, savedKey: p.apiKey, apiKey: "", platform, model: def || p.model }));
    toast.success(platform !== "unknown" ? `Detected ${PLATFORM_LABEL[platform]}` : "Key saved — pick platform manually");
  };

  const removeKey = () => {
    setS((p) => ({ ...p, savedKey: "", platform: "unknown", model: "" }));
    toast("API key removed");
  };

  const generatePrompt = () => {
    const b = s.business;
    if (!b.name || !b.description) { toast.error("Fill business name & description"); return; }
    const prompt = `You are the official AI assistant for ${b.name}${b.type ? ` (${b.type})` : ""}.

ABOUT THE BUSINESS:
${b.description}

${b.location ? `Location: ${b.location}\n` : ""}${b.hours ? `Working Hours: ${b.hours}\n` : ""}${b.contact ? `Contact: ${b.contact}\n` : ""}${b.website ? `Website: ${b.website}\n` : ""}
RULES:
- Reply in the customer's language (auto-detect Bangla / English).
- Be friendly, concise, and human-like. Avoid robotic phrases.
- Use the knowledge base for accurate answers. If unsure, ask a clarifying question.
- Never invent prices, stock, or policies that aren't in the knowledge base.
- Out of scope or sensitive topics → politely redirect to a human agent.`;
    update("systemPrompt", prompt);
    toast.success("System prompt generated — edit & save");
  };

  const onFiles = (files: FileList | null) => {
    if (!files) return;
    const next: FileItem[] = [];
    for (const f of Array.from(files)) {
      if (f.size > 25 * 1024 * 1024) { toast.error(`${f.name} > 25MB`); continue; }
      next.push({ id: crypto.randomUUID(), name: f.name, size: f.size });
    }
    if (next.length) {
      update("files", [...s.files, ...next]);
      toast.success(`${next.length} file(s) added`);
    }
  };

  const addText = () => {
    if (!s.text.trim()) { toast.error("Enter some text"); return; }
    toast.success("Text added to knowledge base");
    update("text", "");
  };

  const fetchLinks = () => {
    if (!s.websiteUrl.trim()) { toast.error("Enter a URL"); return; }
    const fake = Array.from({ length: Math.min(s.maxSubpages, 5) }).map((_, i) => ({
      id: crypto.randomUUID(),
      url: i === 0 ? s.websiteUrl : `${s.websiteUrl.replace(/\/$/, "")}/page-${i}`,
    }));
    update("pages", [...s.pages, ...fake]);
    toast.success(`Queued ${fake.length} pages (UI demo)`);
  };

  const addQA = () => {
    update("qa", [...s.qa, { id: crypto.randomUUID(), q: "", a: "" }]);
  };
  const addFixed = () => {
    update("fixed", [...s.fixed, { id: crypto.randomUUID(), keyword: "", reply: "" }]);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2"><Bot className="h-7 w-7 text-primary" /> AI Agent Setup</h1>
        <p className="text-sm text-muted-foreground">Connect your AI, train it on your business, and let it reply 24/7.</p>
      </div>

      {/* 3a — API KEY */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">AI API Key</h2>
        </div>

        {!s.savedKey ? (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                type="password"
                placeholder="Paste your AI API Key (OpenAI / Gemini / DeepSeek)"
                value={s.apiKey}
                onChange={(e) => update("apiKey", e.target.value)}
              />
              <Button onClick={saveKey} className="bg-primary text-primary-foreground hover:bg-primary-hover">Save</Button>
            </div>
            <p className="text-xs text-muted-foreground">Keys stay local in this scaffold. After Cloud is wired they will be encrypted server-side.</p>
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

            <div className="grid md:grid-cols-2 gap-3">
              {s.platform === "unknown" && (
                <div>
                  <Label>Platform (manual)</Label>
                  <Select value={s.manualPlatform} onValueChange={(v) => update("manualPlatform", v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai">OpenAI</SelectItem>
                      <SelectItem value="gemini">Google Gemini</SelectItem>
                      <SelectItem value="deepseek">DeepSeek</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label>Model</Label>
                <Select value={s.model || modelOptions[0]?.value} onValueChange={(v) => update("model", v)}>
                  <SelectTrigger><SelectValue placeholder="Select model" /></SelectTrigger>
                  <SelectContent>
                    {modelOptions.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-sm text-green-500">✅ Connected to {PLATFORM_LABEL[effectivePlatform]} — Model: {s.model || modelOptions[0]?.value}</p>
          </div>
        )}
      </section>

      {/* 3b — BUSINESS INFO */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="font-semibold">Business Information</h2>
        <div className="grid md:grid-cols-2 gap-3">
          <div><Label>Business Name</Label><Input value={s.business.name} onChange={(e) => update("business", { ...s.business, name: e.target.value })} /></div>
          <div>
            <Label>Business Type</Label>
            <Select value={s.business.type} onValueChange={(v) => update("business", { ...s.business, type: v })}>
              <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>
                {["E-commerce","Restaurant","Service","Education","Healthcare","Other"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2"><Label>Description</Label><Textarea rows={3} placeholder="What do you sell / offer?" value={s.business.description} onChange={(e) => update("business", { ...s.business, description: e.target.value })} /></div>
          <div><Label>Location / Address</Label><Input value={s.business.location} onChange={(e) => update("business", { ...s.business, location: e.target.value })} /></div>
          <div><Label>Working Hours</Label><Input placeholder="Sat–Thu 10am–10pm" value={s.business.hours} onChange={(e) => update("business", { ...s.business, hours: e.target.value })} /></div>
          <div><Label>Contact Info</Label><Input value={s.business.contact} onChange={(e) => update("business", { ...s.business, contact: e.target.value })} /></div>
          <div><Label>Website (optional)</Label><Input value={s.business.website} onChange={(e) => update("business", { ...s.business, website: e.target.value })} /></div>
        </div>

        <Button onClick={generatePrompt} className="bg-primary text-primary-foreground hover:bg-primary-hover">
          <Sparkles className="h-4 w-4 mr-1.5" /> Auto-Generate Agent Prompt
        </Button>

        {s.systemPrompt && (
          <div className="space-y-2">
            <Label>System Prompt (editable)</Label>
            <Textarea rows={10} value={s.systemPrompt} onChange={(e) => update("systemPrompt", e.target.value)} />
            <Button onClick={() => toast.success("Prompt saved")} variant="outline">Save Prompt</Button>
          </div>
        )}
      </section>

      {/* 3c — KNOWLEDGE BASE */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="font-semibold">Knowledge Base</h2>
        <Tabs defaultValue="files">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="files"><FileText className="h-4 w-4 mr-1.5" />Files</TabsTrigger>
            <TabsTrigger value="text"><FileText className="h-4 w-4 mr-1.5" />Text</TabsTrigger>
            <TabsTrigger value="website"><Globe className="h-4 w-4 mr-1.5" />Website</TabsTrigger>
            <TabsTrigger value="qa"><MessagesSquare className="h-4 w-4 mr-1.5" />Q&A</TabsTrigger>
            <TabsTrigger value="fixed"><Lock className="h-4 w-4 mr-1.5" />Fixed Q&A</TabsTrigger>
          </TabsList>

          <TabsContent value="files" className="space-y-3 pt-3">
            <label className="block border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/60 transition-colors">
              <input type="file" multiple className="hidden" accept=".pdf,.doc,.docx,.txt,.xlsx" onChange={(e) => onFiles(e.target.files)} />
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm font-medium">Drag & drop or click to upload</p>
              <p className="text-xs text-muted-foreground">PDF, DOC, DOCX, TXT, XLSX — max 25MB</p>
            </label>
            {s.files.length > 0 && (
              <div className="space-y-2">
                {s.files.map((f) => (
                  <div key={f.id} className="flex items-center gap-3 rounded-lg border border-border bg-background/40 p-3">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="flex-1 text-sm truncate">{f.name}</span>
                    <span className="text-xs text-muted-foreground">{(f.size / 1024).toFixed(1)} KB</span>
                    <Button variant="ghost" size="sm" onClick={() => update("files", s.files.filter((x) => x.id !== f.id))}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="text" className="space-y-3 pt-3">
            <Textarea rows={8} placeholder="Paste any business knowledge: FAQs, policies, product info..." value={s.text} onChange={(e) => update("text", e.target.value)} />
            <Button onClick={addText} className="bg-primary text-primary-foreground hover:bg-primary-hover"><Plus className="h-4 w-4 mr-1.5" />Add Text</Button>
          </TabsContent>

          <TabsContent value="website" className="space-y-3 pt-3">
            <div className="grid md:grid-cols-[1fr_180px_auto] gap-2">
              <Input placeholder="https://yourbusiness.com" value={s.websiteUrl} onChange={(e) => update("websiteUrl", e.target.value)} />
              <div>
                <Select value={String(s.maxSubpages)} onValueChange={(v) => update("maxSubpages", Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 10 }).map((_, i) => <SelectItem key={i+1} value={String(i+1)}>Max {i+1} subpages</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={fetchLinks} className="bg-primary text-primary-foreground hover:bg-primary-hover">Fetch All Links</Button>
            </div>
            {s.pages.length > 0 && (
              <div className="space-y-2">
                {s.pages.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 rounded-lg border border-border bg-background/40 p-3">
                    <Globe className="h-4 w-4 text-primary" />
                    <span className="flex-1 text-sm truncate">{p.url}</span>
                    <Button variant="ghost" size="sm" onClick={() => update("pages", s.pages.filter((x) => x.id !== p.id))}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="qa" className="space-y-3 pt-3">
            <Button onClick={addQA} variant="outline"><Plus className="h-4 w-4 mr-1.5" />Add Q&A Pair</Button>
            {s.qa.map((row) => (
              <div key={row.id} className="rounded-lg border border-border bg-background/40 p-3 space-y-2">
                <Input placeholder="Question" value={row.q} onChange={(e) => update("qa", s.qa.map((x) => x.id === row.id ? { ...x, q: e.target.value } : x))} />
                <Textarea rows={2} placeholder="Answer" value={row.a} onChange={(e) => update("qa", s.qa.map((x) => x.id === row.id ? { ...x, a: e.target.value } : x))} />
                <div className="flex justify-end">
                  <Button variant="ghost" size="sm" onClick={() => update("qa", s.qa.filter((x) => x.id !== row.id))}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="fixed" className="space-y-3 pt-3">
            <p className="text-xs text-muted-foreground">Exact keyword matches — bypass AI and send the fixed reply.</p>
            <Button onClick={addFixed} variant="outline"><Plus className="h-4 w-4 mr-1.5" />Add Fixed Reply</Button>
            {s.fixed.map((row) => (
              <div key={row.id} className="rounded-lg border border-border bg-background/40 p-3 grid md:grid-cols-[200px_1fr_auto] gap-2 items-start">
                <Input placeholder="keyword e.g. price" value={row.keyword} onChange={(e) => update("fixed", s.fixed.map((x) => x.id === row.id ? { ...x, keyword: e.target.value } : x))} />
                <Textarea rows={2} placeholder="Exact reply to send" value={row.reply} onChange={(e) => update("fixed", s.fixed.map((x) => x.id === row.id ? { ...x, reply: e.target.value } : x))} />
                <Button variant="ghost" size="sm" onClick={() => update("fixed", s.fixed.filter((x) => x.id !== row.id))}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </section>
    </div>
  );
};

export default AIAgent;
