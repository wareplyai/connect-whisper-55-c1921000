import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Sparkles, KeyRound, CheckCircle2, Upload, FileText, Globe, MessagesSquare, Lock, Trash2, Plus, Bot, Loader2, Smartphone, Power, Maximize2, History, Eye, RefreshCw, Save, CloudOff, Cloud } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { friendlyError } from "@/lib/friendlyError";
import { debounce } from "lodash";

function ExpandableTextarea({ label, value, onChange, rows, placeholder }: { label: string; value: string; onChange: (v: string) => void; rows: number; placeholder?: string }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  return (
    <>
      <div className="relative">
        <Textarea rows={rows} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} className="pr-10" />
        <button
          type="button"
          onClick={() => { setDraft(value); setOpen(true); }}
          className="absolute top-2 right-2 p-1.5 rounded-md bg-background/80 border border-border hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Expand"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl w-[95vw]">
          <DialogHeader><DialogTitle>{label}</DialogTitle></DialogHeader>
          <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} className="min-h-[60vh] font-mono text-sm" placeholder={placeholder} />
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={() => { onChange(draft); setOpen(false); }} className="bg-primary text-primary-foreground hover:bg-primary-hover">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

const MODELS: Record<string, { value: string; label: string }[]> = {
  openai: [
    { value: "gpt-4o-mini", label: "gpt-4o-mini (default)" },
    { value: "gpt-4o", label: "gpt-4o" },
  ],
  gemini: [
    { value: "gemini-1.5-flash", label: "gemini-1.5-flash (default)" },
    { value: "gemini-1.5-pro", label: "gemini-1.5-pro" },
  ],
  deepseek: [
    { value: "deepseek-chat", label: "deepseek-chat (default)" },
    { value: "deepseek-reasoner", label: "deepseek-reasoner" },
  ],
};

const DEFAULT_INSTRUCTIONS = `ROLE
You are a real human customer support agent for this business.
CORE STYLE
- Keep every reply short and natural. 1–3 short lines is ideal.
LANGUAGE RULE (STRICT)
- Customer writes pure English → reply pure English only.
- Customer writes Bangla script (বাংলা) → reply pure Bangla script only.
- Customer writes Banglish → reply in pure Bangla script (বাংলা অক্ষরে).`;

const defaultBusiness = {
  name: "",
  business_type: "",
  description: "",
  location: "",
  working_hours: "",
  contact: "",
  website: "",
  system_prompt: "",
  text_reply_prompt: `TEXT REPLY INSTRUCTIONS\n- কাস্টমারকে টেক্সট মেসেজে সব প্রশ্নের উত্তর দিন।\n- শুধুমাত্র বিজনেস ইনফো এবং প্রোডাক্ট ক্যাটালগ থেকে সঠিক তথ্য দিন।`,
  image_analysis_prompt: `IMAGE ANALYSIS INSTRUCTIONS\n- কাস্টমার যদি কোনো প্রোডাক্টের ছবি পাঠায়, তবে তা ক্যাটালগের সাথে মিলিয়ে দেখুন।`,
  voice_analysis_prompt: `VOICE ANALYSIS INSTRUCTIONS\n- কাস্টমার ভয়েস মেসেজে যা বলছে তা মনোযোগ দিয়ে শুনে উত্তর দিন।`,
  ai_enabled: false,
  connected_session_ids: [] as string[],
  instructions: DEFAULT_INSTRUCTIONS,
};

const LS_KEY = "ai_agent_local_v3";
const defaultLocal = {
  apiKey: "",
  manualPlatform: "openai" as string,
  text: "",
  websiteUrl: "",
  maxSubpages: 3,
  files: [] as { id: string; name: string; size: number }[],
  pages: [] as { id: string; url: string }[],
};

const AIAgent = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [savingBiz, setSavingBiz] = useState(false);
  const [local, setLocal] = useState(defaultLocal);
  const [business, setBusiness] = useState(defaultBusiness);
  const [hasFallbackKey, setHasFallbackKey] = useState(false);
  const [genProgress, setGenProgress] = useState(0);
  const [genLoading, setGenLoading] = useState(false);
  const [promptHistory, setPromptHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [historyType, setHistoryType] = useState<string>("");
  const [showPreview, setShowPreview] = useState(false);
  const [previewText, setPreviewText] = useState("");
  
  // Autosave states
  const [isDirty, setIsDirty] = useState(false);
  const [isAutosaving, setIsAutosaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const businessRef = useRef(business);

  // Keep ref in sync for the debounced function
  useEffect(() => {
    businessRef.current = business;
  }, [business]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const [{ data: biz }, keyRes] = await Promise.all([
        supabase.from("business_profiles").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.functions.invoke("ai-key-manager", { body: { action: "get" } }),
      ]);
      if (biz) {
        setBusiness({
          ...defaultBusiness,
          ...biz,
          text_reply_prompt: (biz as any).text_reply_prompt || defaultBusiness.text_reply_prompt,
          image_analysis_prompt: (biz as any).image_analysis_prompt || defaultBusiness.image_analysis_prompt,
          voice_analysis_prompt: (biz as any).voice_analysis_prompt || defaultBusiness.voice_analysis_prompt,
        } as any);
      }
      setHasFallbackKey(Boolean(keyRes?.data?.hasFallback));
      setLoading(false);
    })();
  }, [user]);

  const saveBusiness = async (isManual = true) => {
    if (!user) return;
    
    // Validations (only block manual save with toast, autosave just skips)
    const errors: string[] = [];
    if (businessRef.current.text_reply_prompt.length < 20) errors.push("Text prompt is too short.");
    if (businessRef.current.image_analysis_prompt.length < 20) errors.push("Image prompt is too short.");
    if (businessRef.current.voice_analysis_prompt.length < 20) errors.push("Voice prompt is too short.");
    
    if (errors.length > 0) {
      if (isManual) errors.forEach(err => toast.error(err));
      return;
    }

    if (isManual) setSavingBiz(true);
    else setIsAutosaving(true);

    const { error } = await supabase.from("business_profiles").upsert({
      user_id: user.id,
      ...businessRef.current,
    } as any, { onConflict: "user_id" });

    if (!error) {
      // Record history
      await Promise.all([
        supabase.from("business_profile_prompt_history").insert({ user_id: user.id, business_profile_id: (businessRef.current as any).id, prompt_type: 'text_reply', content: businessRef.current.text_reply_prompt }),
        supabase.from("business_profile_prompt_history").insert({ user_id: user.id, business_profile_id: (businessRef.current as any).id, prompt_type: 'image_analysis', content: businessRef.current.image_analysis_prompt }),
        supabase.from("business_profile_prompt_history").insert({ user_id: user.id, business_profile_id: (businessRef.current as any).id, prompt_type: 'voice_analysis', content: businessRef.current.voice_analysis_prompt }),
      ]);
      
      if (isManual) toast.success("Business profile and prompt history saved");
      setLastSaved(new Date());
      setIsDirty(false);
    } else {
      if (isManual) toast.error(friendlyError(error));
    }
    
    if (isManual) setSavingBiz(false);
    else setIsAutosaving(false);
  };

  const debouncedAutosave = useCallback(
    debounce(() => {
      saveBusiness(false);
    }, 2000),
    [user]
  );

  const handleBusinessChange = (updates: Partial<typeof business>) => {
    setBusiness(prev => ({ ...prev, ...updates }));
    setIsDirty(true);
    debouncedAutosave();
  };

  const fetchHistory = async (type: string) => {
    if (!user) return;
    setHistoryType(type);
    const { data } = await supabase
      .from("business_profile_prompt_history")
      .select("*")
      .eq("user_id", user.id)
      .eq("prompt_type", type)
      .order("created_at", { ascending: false })
      .limit(10);
    setPromptHistory(data || []);
    setShowHistory(true);
  };

  const previewPrompt = async (content: string) => {
    setPreviewText(`[Simulated AI Reply using your prompt]:\n\n"Hello! We are open from 9 AM to 6 PM. How can I help you today?"\n\n(Based on prompt: ${content.slice(0, 50)}...)`);
    setShowPreview(true);
  };

  if (loading) return <div className="p-8 text-center"><Loader2 className="animate-spin h-8 w-8 mx-auto" /></div>;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">AI Agent Settings</h1>
          <p className="text-muted-foreground flex items-center gap-2">
            Configure how your AI interacts with customers.
            {isAutosaving ? (
              <span className="flex items-center text-xs text-primary animate-pulse">
                <Loader2 className="h-3 w-3 animate-spin mr-1" /> Saving...
              </span>
            ) : isDirty ? (
              <span className="flex items-center text-xs text-amber-500">
                <CloudOff className="h-3 w-3 mr-1" /> Unsaved changes
              </span>
            ) : lastSaved ? (
              <span className="flex items-center text-xs text-emerald-500">
                <Cloud className="h-3 w-3 mr-1" /> All changes saved at {lastSaved.toLocaleTimeString()}
              </span>
            ) : null}
          </p>
        </div>
        <Button onClick={() => saveBusiness(true)} disabled={savingBiz}>
          {savingBiz ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Save Changes
        </Button>
      </header>

      <section className="bg-card border rounded-xl p-6 space-y-6">
        <div className="flex items-center gap-2">
          <Sparkles className="text-primary h-5 w-5" />
          <h2 className="text-lg font-semibold">System Prompts</h2>
        </div>

        <div className="grid gap-8">
          {[
            { id: 'text_reply_prompt', label: 'Text Reply', icon: Bot, desc: 'Rules for text messages.' },
            { id: 'image_analysis_prompt', label: 'Image Analysis', icon: Upload, desc: 'Rules for analyzing photos.' },
            { id: 'voice_analysis_prompt', label: 'Voice Analysis', icon: Smartphone, desc: 'Rules for voice notes.' }
          ].map((item) => (
            <div key={item.id} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-base font-semibold">{item.label} Prompt</Label>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setBusiness({ ...business, [item.id]: (defaultBusiness as any)[item.id] })}>
                    <RefreshCw className="h-3 w-3 mr-1" /> Default
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => fetchHistory(item.id.replace('_prompt', ''))}>
                    <History className="h-3 w-3 mr-1" /> History
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => previewPrompt((business as any)[item.id])}>
                    <Eye className="h-3 w-3 mr-1" /> Preview
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
              <ExpandableTextarea
                label={item.label}
                rows={5}
                value={(business as any)[item.id]}
                onChange={(v) => setBusiness({ ...business, [item.id]: v })}
              />
              {(business as any)[item.id].length < 20 && (
                <p className="text-xs text-destructive">Prompt is too short (min 20 characters).</p>
              )}
            </div>
          ))}
        </div>
      </section>

      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Version History: {historyType}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            {promptHistory.length === 0 && <p className="text-center text-muted-foreground">No history found.</p>}
            {promptHistory.map((h) => (
              <div key={h.id} className="p-3 border rounded-lg space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString()}</span>
                  <Button variant="outline" size="sm" onClick={() => {
                    setBusiness({ ...business, [`${historyType}_prompt`]: h.content });
                    setShowHistory(false);
                    toast.success("Prompt restored");
                  }}>Restore</Button>
                </div>
                <pre className="text-xs bg-muted p-2 rounded max-h-32 overflow-y-auto whitespace-pre-wrap">{h.content}</pre>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent>
          <DialogHeader><DialogTitle>Prompt Preview</DialogTitle></DialogHeader>
          <div className="p-4 bg-muted rounded-lg border text-sm font-mono whitespace-pre-wrap italic text-muted-foreground">
            {previewText}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowPreview(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AIAgent;
