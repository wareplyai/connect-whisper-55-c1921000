import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export default function Notifications() {
  const [items, setItems] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [form, setForm] = useState({ title: "", message: "", type: "info", target: "all", target_user_id: "" });

  const load = async () => {
    const [{ data: n }, { data: p }] = await Promise.all([
      supabase.from("admin_notifications").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("id,full_name,email"),
    ]);
    setItems(n || []); setUsers(p || []);
  };
  useEffect(() => { load(); }, []);

  const send = async () => {
    if (!form.title || !form.message) { toast.error("Title and message required"); return; }
    const { error } = await supabase.from("admin_notifications").insert({
      title: form.title, message: form.message, type: form.type, target: form.target,
      target_user_id: form.target === "user" ? form.target_user_id : null,
      is_active: true,
    });
    if (error) { toast.error(error.message); return; }
    await supabase.from("activity_logs").insert({ action: "notification.send", actor_type: "headadmin", details: { title: form.title } });
    toast.success("Notification sent");
    setForm({ title: "", message: "", type: "info", target: "all", target_user_id: "" }); load();
  };

  const toggle = async (n: any) => {
    await supabase.from("admin_notifications").update({ is_active: !n.is_active }).eq("id", n.id);
    load();
  };
  const remove = async (n: any) => {
    await supabase.from("admin_notifications").delete().eq("id", n.id);
    toast.success("Deleted"); load();
  };

  const typeColor: Record<string, string> = {
    info: "bg-blue-500/15 text-blue-400",
    warning: "bg-warning/15 text-warning",
    success: "bg-primary/15 text-primary",
    danger: "bg-destructive/15 text-destructive",
  };

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-semibold">Notifications</h1><p className="text-sm text-muted-foreground">Send announcements to users</p></div>

      <Card className="p-5 bg-card border-border">
        <h3 className="text-sm font-semibold mb-4">Send Notification</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div>
            <Label>Type</Label>
            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="info">Info</SelectItem><SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="success">Success</SelectItem><SelectItem value="danger">Danger</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2"><Label>Message</Label><Textarea rows={4} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></div>
          <div>
            <Label>Target</Label>
            <Select value={form.target} onValueChange={(v) => setForm({ ...form, target: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="user">Specific User</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {form.target === "user" && (
            <div>
              <Label>User</Label>
              <Select value={form.target_user_id} onValueChange={(v) => setForm({ ...form, target_user_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
                <SelectContent>{users.map((u) => <SelectItem key={u.id} value={u.id}>{u.email}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
        </div>
        <div className="mt-4"><Button onClick={send}>Send Notification</Button></div>
      </Card>

      <Card className="bg-card border-border">
        <div className="p-5 border-b border-border"><h3 className="text-sm font-semibold">Active Notifications</h3></div>
        <Table>
          <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Message</TableHead><TableHead>Type</TableHead><TableHead>Target</TableHead><TableHead>Sent</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {items.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">None yet</TableCell></TableRow>}
            {items.map((n) => (
              <TableRow key={n.id}>
                <TableCell className="font-medium">{n.title}</TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{n.message}</TableCell>
                <TableCell><Badge className={`border-0 ${typeColor[n.type] || ""}`}>{n.type}</Badge></TableCell>
                <TableCell className="text-xs">{n.target}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString()}</TableCell>
                <TableCell>
                  <button onClick={() => toggle(n)} className="text-xs">
                    {n.is_active ? <Badge className="bg-primary/15 text-primary border-0">Active</Badge> : <Badge variant="outline">Inactive</Badge>}
                  </button>
                </TableCell>
                <TableCell><Button size="icon" variant="ghost" onClick={() => remove(n)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
