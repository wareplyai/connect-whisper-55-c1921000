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
  }, []);

  const runBulkDelete = async () => {
    if (!bulk.user_id) { toast.error("Select a user"); return; }
    setBulkLoading(true);
    const { data, error } = await supabase.functions.invoke("headadmin-delete-user-messages", { body: bulk });
    setBulkLoading(false);
    setBulkConfirm(false);
    if (error) { toast.error(error.message); return; }
    const d = (data as any)?.deleted || {};
    toast.success(`Deleted: logs=${d.message_logs ?? 0}, incoming=${d.incoming_messages ?? 0}`);
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
    </div>
  );
}
