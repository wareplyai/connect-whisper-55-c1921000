import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sparkles, Send, ArrowDown, Zap, Brain, ClipboardList, UserCheck, Calendar, Users } from "lucide-react";

const BUSINESS_TYPES = [
  { v: "travel", label: "Travel Agency", prompt: "You are a friendly travel agency assistant. Ask about destination, travel date, group size, and budget. Recommend tour packages." },
  { v: "hajj", label: "Hajj & Umrah", prompt: "You are a Hajj & Umrah package consultant. Ask about preferred month, group size, hotel preference (Makkah/Madinah), and budget." },
  { v: "ecommerce", label: "E-commerce", prompt: "You are an e-commerce sales assistant. Help customers find products, share prices, and confirm orders politely." },
  { v: "service", label: "Service Business", prompt: "You are a service consultant. Understand the customer's need, schedule, location, and budget. Offer suitable service packages." },
];

const FLOW_STEPS = [
  { icon: Zap, title: "Trigger", desc: "Customer sends first WhatsApp message" },
  { icon: Brain, title: "AI Intent Detection", desc: "Detect interest, language, urgency" },
  { icon: ClipboardList, title: "Info Collection", desc: "Name, phone, budget, travel date" },
  { icon: UserCheck, title: "Lead Saved", desc: "Stored in CRM Leads with status = new" },
  { icon: Calendar, title: "Follow-up Sequence", desc: "Day 1 · Day 3 · Day 7 · Day 14" },
  { icon: Users, title: "Human Handoff", desc: "Assign to agent when intent = high" },
];

export default function CRMNurturing() {
  const [bizType, setBizType] = useState("travel");
  const [systemPrompt, setSystemPrompt] = useState(BUSINESS_TYPES[0].prompt);
  const [temperature, setTemperature] = useState([0.7]);
  const [chatInput, setChatInput] = useState("");
  const [chat, setChat] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [sending, setSending] = useState(false);

  const onBizChange = (v: string) => {
    setBizType(v);
    const found = BUSINESS_TYPES.find((b) => b.v === v);
    if (found) setSystemPrompt(found.prompt);
  };

  const sendTest = async () => {
    if (!chatInput.trim()) return;
    const msg = chatInput;
    setChat((c) => [...c, { role: "user", content: msg }]);
    setChatInput("");
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("crm-ai-test", {
        body: { systemPrompt, message: msg, temperature: temperature[0] },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setChat((c) => [...c, { role: "assistant", content: (data as any).reply || "(no response)" }]);
    } catch (e: any) {
      toast.error(e.message || "AI request failed");
      setChat((c) => [...c, { role: "assistant", content: "⚠️ " + (e.message || "Failed") }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Sparkles className="h-6 w-6 text-primary" /> AI Nurturing</h1>
        <p className="text-sm text-muted-foreground">Automate lead capture, follow-ups & qualification</p>
      </div>

      <Tabs defaultValue="flow">
        <TabsList>
          <TabsTrigger value="flow">Flow Builder</TabsTrigger>
          <TabsTrigger value="config">AI Config</TabsTrigger>
        </TabsList>

        <TabsContent value="flow">
          <Card>
            <CardContent className="p-6">
              <div className="space-y-3 max-w-2xl mx-auto">
                {FLOW_STEPS.map((s, i) => (
                  <div key={i}>
                    <div className="flex items-start gap-3 p-4 border border-border rounded-lg bg-card-elevated hover:border-primary/50 transition">
                      <div className="grid place-items-center h-10 w-10 rounded-full bg-primary/10 text-primary shrink-0">
                        <s.icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{i + 1}. {s.title}</p>
                        <p className="text-sm text-muted-foreground">{s.desc}</p>
                      </div>
                    </div>
                    {i < FLOW_STEPS.length - 1 && (
                      <div className="flex justify-center py-1">
                        <ArrowDown className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div>
                <Label>Business Type</Label>
                <Select value={bizType} onValueChange={onBizChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BUSINESS_TYPES.map((b) => <SelectItem key={b.v} value={b.v}>{b.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>System Prompt</Label>
                <Textarea rows={6} value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <Label>Temperature</Label>
                  <span className="text-sm text-muted-foreground">{temperature[0].toFixed(2)}</span>
                </div>
                <Slider value={temperature} onValueChange={setTemperature} min={0} max={1} step={0.05} />
                <p className="text-xs text-muted-foreground mt-1">Lower = focused. Higher = creative.</p>
              </div>

              <Button onClick={() => { localStorage.setItem("crm_nurture_cfg", JSON.stringify({ bizType, systemPrompt, temperature: temperature[0] })); toast.success("Config saved"); }}>
                Save Config
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-3">
              <p className="font-medium">Test Chat</p>
              <div className="border border-border rounded-lg p-3 h-64 overflow-y-auto bg-background space-y-2">
                {chat.length === 0 && <p className="text-sm text-muted-foreground text-center py-10">Type a message to test the AI assistant</p>}
                {chat.map((m, i) => (
                  <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] px-3 py-2 rounded-lg text-sm whitespace-pre-wrap ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                      {m.content}
                    </div>
                  </div>
                ))}
                {sending && <div className="text-xs text-muted-foreground italic">AI is typing...</div>}
              </div>
              <div className="flex gap-2">
                <Input value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !sending && sendTest()} placeholder="e.g. I want to go Cox's Bazar with family" />
                <Button onClick={sendTest} disabled={sending}><Send className="h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
