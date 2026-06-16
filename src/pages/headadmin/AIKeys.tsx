import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Trash2, Plus, KeyRound } from "lucide-react";
import { toast } from "sonner";

interface GlobalKey {
  id: string;
  platform: string;
  model: string;
  key_last4: string;
  is_active: boolean;
  created_at: string;
}

interface UserOverrideKey extends GlobalKey {
  user_id: string;
  user_email?: string | null;
  user_name?: string | null;
}

interface UserOption {
  id: string;
  email: string | null;
  full_name: string | null;
}

const MODELS: Record<string, string[]> = {
  openai: [
    "gpt-4o", "gpt-4o-mini", "gpt-4.1", "gpt-4.1-mini", "gpt-4.1-nano",
    "gpt-4-turbo", "gpt-4", "gpt-3.5-turbo",
    "o1", "o1-mini", "o3", "o3-mini", "o4-mini",
    "gpt-5", "gpt-5-mini", "gpt-5-nano",
  ],
  gemini: [
    "gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.5-flash-lite",
    "gemini-2.0-flash", "gemini-2.0-flash-lite",
    "gemini-1.5-pro", "gemini-1.5-flash", "gemini-1.5-flash-8b",
    "gemini-3-flash-preview", "gemini-3-pro-preview",
  ],
  deepseek: [
    "deepseek-chat", "deepseek-reasoner", "deepseek-coder",
    "deepseek-v3", "deepseek-v3.1", "deepseek-r1",
  ],
};

export default function AIKeys() {
  const [keys, setKeys] = useState<GlobalKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiKey, setApiKey] = useState("");
  const [platform, setPlatform] = useState("openai");
  const [model, setModel] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("ai-key-manager", { body: { action: "list_global" } });
    if (error) toast.error(error.message);
    setKeys((data?.keys as GlobalKey[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!apiKey.trim()) { toast.error("API key required"); return; }
    setSaving(true);
    const { data, error } = await supabase.functions.invoke("ai-key-manager", {
      body: { action: "save_global", apiKey: apiKey.trim(), platform, model: model.trim() || undefined },
    });
    setSaving(false);
    if (error || (data as any)?.error) { toast.error(error?.message || (data as any)?.error || "Save failed"); return; }
    toast.success("Global API key saved");
    setApiKey(""); setModel("");
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this global key?")) return;
    const { error } = await supabase.functions.invoke("ai-key-manager", { body: { action: "delete_global", id } });
    if (error) toast.error(error.message); else { toast.success("Deleted"); load(); }
  };

  const toggle = async (id: string, is_active: boolean) => {
    const { error } = await supabase.functions.invoke("ai-key-manager", { body: { action: "toggle_global", id, is_active } });
    if (error) toast.error(error.message); else load();
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">Global AI API Keys</h1>
        <p className="text-sm text-muted-foreground">
          Used as fallback when a user has no personal AI key. Per-user keys always take priority.
        </p>
      </div>

      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2"><Plus className="h-4 w-4" /><h2 className="font-semibold">Add / Replace Global Key</h2></div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label>Platform</Label>
            <Select value={platform} onValueChange={(v) => { setPlatform(v); setModel(""); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="gemini">Gemini</SelectItem>
                <SelectItem value="deepseek">DeepSeek</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Model (optional)</Label>
            <Select value={model || "__none"} onValueChange={(v) => setModel(v === "__none" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Select a model" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">Default (auto)</SelectItem>
                {(MODELS[platform] || []).map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label>API Key</Label>
          <Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-…  /  AIza…  /  ds-…" />
        </div>
        <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save Global Key"}</Button>
      </Card>

      <Card className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Platform</TableHead>
              <TableHead>Model</TableHead>
              <TableHead>Key</TableHead>
              <TableHead>Active</TableHead>
              <TableHead>Added</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && <TableRow><TableCell colSpan={6} className="py-6 text-center">Loading…</TableCell></TableRow>}
            {!loading && keys.length === 0 && <TableRow><TableCell colSpan={6} className="py-6 text-center text-muted-foreground"><KeyRound className="h-5 w-5 inline mr-1" /> No global keys yet</TableCell></TableRow>}
            {keys.map((k) => (
              <TableRow key={k.id}>
                <TableCell><Badge variant="outline" className="capitalize">{k.platform}</Badge></TableCell>
                <TableCell className="text-sm">{k.model}</TableCell>
                <TableCell className="font-mono text-xs">••••{k.key_last4}</TableCell>
                <TableCell><Switch checked={k.is_active} onCheckedChange={(v) => toggle(k.id, v)} /></TableCell>
                <TableCell className="text-xs text-muted-foreground">{new Date(k.created_at).toLocaleDateString()}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => remove(k.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
