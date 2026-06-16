import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useHeadAdmin } from "@/contexts/HeadAdminContext";
import { AlertTriangle, Trash2 } from "lucide-react";

export default function HeadAdminSettings() {
  const { headAdmin, refresh } = useHeadAdmin();
  const [profile, setProfile] = useState({ name: headAdmin?.name || "", email: headAdmin?.email || "" });
  const [pwd, setPwd] = useState({ current: "", next: "", confirm: "" });
  const [platform, setPlatform] = useState(() => {
    const saved = localStorage.getItem("platform_settings");
    return saved ? JSON.parse(saved) : {
      name: "WaAPI", supportEmail: "support@wareplyai.com",
      backendUrl: import.meta.env.VITE_GATEWAY_URL || import.meta.env.VITE_BACKEND_URL || "",
      trialDays: 7, trialSessions: 1,
    };
  });
  const [confirm, setConfirm] = useState<null | "logs" | "sessions">(null);

  // Bulk delete user messages
  const [users, setUsers] = useState<Array<{ id: string; email: string; full_name: string | null }>>([]);
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const [bulk, setBulk] = useState({ user_id: "", from_date: monthAgo, to_date: today, scope: "all" });
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);

  useEffect(() => {
    supabase.from("profiles").select("id,email,full_name").order("email").then(({ data }) => {
      setUsers((data as any) || []);
    });
    // Load AI task limits
    (supabase as any).rpc("get_ai_task_limits").then(({ data }: any) => {
      const r = Array.isArray(data) ? data[0] : data;
      if (r) setAiLimits({
        vision_detail: r.vision_detail || "low",
        image_describe_max_tokens: r.image_describe_max_tokens ?? 150,
        image_extract_max_tokens: r.image_extract_max_tokens ?? 150,
        vision_match_max_tokens: r.vision_match_max_tokens ?? 100,
        vision_match_max_candidates: r.vision_match_max_candidates ?? 8,
        voice_transcribe_max_seconds: r.voice_transcribe_max_seconds ?? 60,
        text_reply_max_tokens: r.text_reply_max_tokens ?? 600,
      });
    });
  }, []);

  const [aiLimits, setAiLimits] = useState({
    vision_detail: "low" as "low" | "high" | "auto",
    image_describe_max_tokens: 150,
    image_extract_max_tokens: 150,
    vision_match_max_tokens: 100,
    vision_match_max_candidates: 8,
    voice_transcribe_max_seconds: 60,
    text_reply_max_tokens: 600,
  });
  const [aiLimitsSaving, setAiLimitsSaving] = useState(false);

  const saveAiLimits = async () => {
    setAiLimitsSaving(true);
    const { error } = await (supabase as any).rpc("headadmin_update_ai_task_limits", {
      _vision_detail: aiLimits.vision_detail,
      _image_describe_max_tokens: aiLimits.image_describe_max_tokens,
      _image_extract_max_tokens: aiLimits.image_extract_max_tokens,
      _vision_match_max_tokens: aiLimits.vision_match_max_tokens,
      _vision_match_max_candidates: aiLimits.vision_match_max_candidates,
      _voice_transcribe_max_seconds: aiLimits.voice_transcribe_max_seconds,
      _text_reply_max_tokens: aiLimits.text_reply_max_tokens,
    });
    setAiLimitsSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("AI task limits saved");
  };


  const runBulkDelete = async () => {
    if (!bulk.user_id) { toast.error("Select a user"); return; }
    setBulkLoading(true);
    const { data, error } = await supabase.functions.invoke("headadmin-delete-user-messages", { body: bulk });
    setBulkLoading(false);
    setBulkConfirm(false);
    if (error) { toast.error(error.message); return; }
    const d = (data as any)?.deleted || {};
    const msg = `Deleted: logs=${d.message_logs ?? 0}, incoming=${d.incoming_messages ?? 0}`;
    if ((data as any)?.truncated) {
      toast.warning(msg + " — more remain, click Delete again to continue.");
    } else {
      toast.success(msg);
    }
  };

  const saveProfile = async () => {
    if (!headAdmin) return;
    await supabase.from("headadmin").update({ name: profile.name, email: profile.email }).eq("id", headAdmin.id);
    toast.success("Profile saved"); refresh();
  };

  const changePwd = async () => {
    if (pwd.next !== pwd.confirm) { toast.error("Passwords don't match"); return; }
    const { error } = await supabase.auth.updateUser({ password: pwd.next });
    if (error) { toast.error(error.message); return; }
    toast.success("Password updated"); setPwd({ current: "", next: "", confirm: "" });
  };

  const savePlatform = () => {
    localStorage.setItem("platform_settings", JSON.stringify(platform));
    toast.success("Platform settings saved");
  };

  const danger = async () => {
    if (confirm === "logs") {
      const { error } = await supabase.from("message_logs").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) toast.error(error.message); else toast.success("Logs cleared");
    } else if (confirm === "sessions") {
      const { error } = await supabase.from("sessions").update({ status: "disconnected" }).neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) toast.error(error.message); else toast.success("Sessions deactivated");
    }
    setConfirm(null);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div><h1 className="text-2xl font-semibold">Settings</h1></div>

      <Card className="p-5 bg-card border-border">
        <h3 className="text-sm font-semibold mb-4">Head Admin Profile</h3>
        <div className="grid gap-4">
          <div><Label>Display Name</Label><Input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} /></div>
          <div><Label>Email</Label><Input value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} /></div>
          <div><Button onClick={saveProfile}>Save Profile</Button></div>
        </div>
      </Card>

      <Card className="p-5 bg-card border-border">
        <h3 className="text-sm font-semibold mb-4">Change Password</h3>
        <div className="grid gap-4">
          <div><Label>Current Password</Label><Input type="password" value={pwd.current} onChange={(e) => setPwd({ ...pwd, current: e.target.value })} /></div>
          <div><Label>New Password</Label><Input type="password" value={pwd.next} onChange={(e) => setPwd({ ...pwd, next: e.target.value })} /></div>
          <div><Label>Confirm Password</Label><Input type="password" value={pwd.confirm} onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })} /></div>
          <div><Button onClick={changePwd}>Update Password</Button></div>
        </div>
      </Card>

      <Card className="p-5 bg-card border-border">
        <h3 className="text-sm font-semibold mb-4">Platform Settings</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div><Label>Platform Name</Label><Input value={platform.name} onChange={(e) => setPlatform({ ...platform, name: e.target.value })} /></div>
          <div><Label>Support Email</Label><Input value={platform.supportEmail} onChange={(e) => setPlatform({ ...platform, supportEmail: e.target.value })} /></div>
          <div className="md:col-span-2"><Label>Backend API URL</Label><Input value={platform.backendUrl} onChange={(e) => setPlatform({ ...platform, backendUrl: e.target.value })} /></div>
          <div><Label>Trial Duration (days)</Label><Input type="number" value={platform.trialDays} onChange={(e) => setPlatform({ ...platform, trialDays: Number(e.target.value) })} /></div>
          <div><Label>Trial Sessions</Label><Input type="number" value={platform.trialSessions} onChange={(e) => setPlatform({ ...platform, trialSessions: Number(e.target.value) })} /></div>
        </div>
        <div className="mt-4"><Button onClick={savePlatform}>Save Settings</Button></div>
      </Card>

      <Card className="p-5 bg-card border-border">
        <h3 className="text-sm font-semibold mb-1">AI Task Token Limits</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Control how many tokens each AI task can use. Vision detail <strong>low</strong> uses ~85 tokens per image
          instead of 25,000+ (recommended). Lower = cheaper but slightly less accurate.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Vision detail (image quality sent to AI)</Label>
            <Select
              value={aiLimits.vision_detail}
              onValueChange={(v) => setAiLimits({ ...aiLimits, vision_detail: v as any })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low — ~85 tokens / image (cheapest)</SelectItem>
                <SelectItem value="high">High — ~25,000 tokens / image (expensive)</SelectItem>
                <SelectItem value="auto">Auto — AI decides</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Image describe — max output tokens</Label>
            <Input type="number" min={40} max={500}
              value={aiLimits.image_describe_max_tokens}
              onChange={(e) => setAiLimits({ ...aiLimits, image_describe_max_tokens: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Image extract — max output tokens</Label>
            <Input type="number" min={40} max={500}
              value={aiLimits.image_extract_max_tokens}
              onChange={(e) => setAiLimits({ ...aiLimits, image_extract_max_tokens: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Vision match — max output tokens</Label>
            <Input type="number" min={40} max={400}
              value={aiLimits.vision_match_max_tokens}
              onChange={(e) => setAiLimits({ ...aiLimits, vision_match_max_tokens: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Vision match — max catalog products compared</Label>
            <Input type="number" min={1} max={20}
              value={aiLimits.vision_match_max_candidates}
              onChange={(e) => setAiLimits({ ...aiLimits, vision_match_max_candidates: Number(e.target.value) })} />
            <p className="text-[11px] text-muted-foreground mt-1">Each candidate = +1 image sent to AI. Lower = much cheaper.</p>
          </div>
          <div>
            <Label>Text reply — max output tokens</Label>
            <Input type="number" min={100} max={2000}
              value={aiLimits.text_reply_max_tokens}
              onChange={(e) => setAiLimits({ ...aiLimits, text_reply_max_tokens: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Voice transcribe — max seconds</Label>
            <Input type="number" min={5} max={300}
              value={aiLimits.voice_transcribe_max_seconds}
              onChange={(e) => setAiLimits({ ...aiLimits, voice_transcribe_max_seconds: Number(e.target.value) })} />
          </div>
        </div>
        <div className="mt-4">
          <Button onClick={saveAiLimits} disabled={aiLimitsSaving}>
            {aiLimitsSaving ? "Saving..." : "Save AI Limits"}
          </Button>
        </div>
      </Card>



      <Card className="p-5 bg-card border-border">
        <div className="flex items-center gap-2 mb-4">
          <Trash2 className="h-5 w-5 text-primary" />
          <h3 className="text-sm font-semibold">Bulk Delete User Messages</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Select a user and date range. Permanently removes message_logs and incoming_messages
          to free Supabase storage.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label>User</Label>
            <Select value={bulk.user_id} onValueChange={(v) => setBulk({ ...bulk, user_id: v })}>
              <SelectTrigger><SelectValue placeholder="Select user..." /></SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.email} {u.full_name ? `(${u.full_name})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>From Date</Label>
            <Input type="date" value={bulk.from_date} onChange={(e) => setBulk({ ...bulk, from_date: e.target.value })} />
          </div>
          <div>
            <Label>To Date</Label>
            <Input type="date" value={bulk.to_date} onChange={(e) => setBulk({ ...bulk, to_date: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <Label>Scope</Label>
            <Select value={bulk.scope} onValueChange={(v) => setBulk({ ...bulk, scope: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All (logs + incoming)</SelectItem>
                <SelectItem value="message_logs">Message Logs only</SelectItem>
                <SelectItem value="incoming_messages">Incoming Messages only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-4">
          <Button variant="destructive" onClick={() => setBulkConfirm(true)} disabled={!bulk.user_id || bulkLoading}>
            {bulkLoading ? "Deleting..." : "Delete Messages"}
          </Button>
        </div>
      </Card>

      <Card className="p-5 bg-destructive/5 border-destructive/30">
        <div className="flex items-center gap-2 mb-4"><AlertTriangle className="h-5 w-5 text-destructive" /><h3 className="text-sm font-semibold text-destructive">Danger Zone</h3></div>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div><p className="text-sm font-medium">Clear All Message Logs</p><p className="text-xs text-muted-foreground">Permanently deletes every message log</p></div>
            <Button variant="destructive" onClick={() => setConfirm("logs")}>Clear Logs</Button>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div><p className="text-sm font-medium">Deactivate All Sessions</p><p className="text-xs text-muted-foreground">Sets every session to disconnected</p></div>
            <Button variant="destructive" onClick={() => setConfirm("sessions")}>Deactivate</Button>
          </div>
        </div>
      </Card>

      <Dialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Are you absolutely sure?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
          <DialogFooter><Button variant="outline" onClick={() => setConfirm(null)}>Cancel</Button><Button variant="destructive" onClick={danger}>Confirm</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkConfirm} onOpenChange={setBulkConfirm}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete messages permanently?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently delete <strong>{bulk.scope}</strong> for the selected user
            between <strong>{bulk.from_date}</strong> and <strong>{bulk.to_date}</strong>. Cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkConfirm(false)}>Cancel</Button>
            <Button variant="destructive" onClick={runBulkDelete} disabled={bulkLoading}>
              {bulkLoading ? "Deleting..." : "Yes, delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
