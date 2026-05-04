import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { MoreVertical, Download, Plus, Eye, Pencil, Ban, CheckCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";

const PLANS = ["trial", "basic", "pro", "plus", "business"];
const PLAN_SESSIONS: Record<string, number> = { trial: 1, basic: 2, pro: 5, plus: 10, business: 25 };

export default function AllUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [editUser, setEditUser] = useState<any>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteUser, setDeleteUser] = useState<any>(null);
  const PAGE_SIZE = 25;

  const load = async () => {
    setLoading(true);
    const [{ data: profiles }, { data: sessions }, { data: msgs }] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("sessions").select("user_id"),
      supabase.from("message_logs").select("user_id"),
    ]);
    const sessCount: Record<string, number> = {};
    const msgCount: Record<string, number> = {};
    sessions?.forEach((s: any) => { sessCount[s.user_id] = (sessCount[s.user_id] || 0) + 1; });
    msgs?.forEach((m: any) => { msgCount[m.user_id] = (msgCount[m.user_id] || 0) + 1; });
    setUsers((profiles || []).map((u: any) => ({
      ...u, _sessions: sessCount[u.id] || 0, _messages: msgCount[u.id] || 0,
    })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = users.filter((u) => {
    if (search && !`${u.full_name || ""} ${u.email || ""}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (planFilter !== "all" && u.plan !== planFilter) return false;
    if (statusFilter === "active" && !u.is_active) return false;
    if (statusFilter === "inactive" && u.is_active) return false;
    return true;
  });
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  const exportCSV = () => {
    const rows = [["Name", "Email", "Plan", "Sessions", "Messages", "Status", "Joined"]];
    filtered.forEach((u) => rows.push([u.full_name || "", u.email || "", u.plan, u._sessions, u._messages, u.is_active ? "Active" : "Inactive", u.created_at]));
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "users.csv"; a.click();
  };

  const toggleActive = async (u: any) => {
    await supabase.from("profiles").update({ is_active: !u.is_active }).eq("id", u.id);
    await supabase.from("activity_logs").insert({ action: u.is_active ? "user.deactivate" : "user.activate", actor_type: "headadmin", target_type: "user", target_id: u.id });
    toast.success(`User ${u.is_active ? "deactivated" : "activated"}`);
    load();
  };

  const saveEdit = async () => {
    const u = editUser;
    await supabase.from("profiles").update({
      full_name: u.full_name, email: u.email, plan: u.plan,
      max_sessions: u.max_sessions, is_active: u.is_active,
    }).eq("id", u.id);
    await supabase.from("activity_logs").insert({ action: "user.edit", actor_type: "headadmin", target_type: "user", target_id: u.id });
    toast.success("User updated");
    setEditUser(null); load();
  };

  const deleteUserConfirm = async () => {
    await supabase.from("profiles").delete().eq("id", deleteUser.id);
    await supabase.from("activity_logs").insert({ action: "user.delete", actor_type: "headadmin", target_type: "user", target_id: deleteUser.id });
    toast.success("User deleted");
    setDeleteUser(null); load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">All Users</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} users</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" />New User</Button>
      </div>

      <Card className="p-4 bg-card border-border">
        <div className="grid gap-3 md:grid-cols-4">
          <Input placeholder="Search name or email..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <Select value={planFilter} onValueChange={setPlanFilter}>
            <SelectTrigger><SelectValue placeholder="Plan" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Plans</SelectItem>
              {PLANS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportCSV}><Download className="h-4 w-4" />Export CSV</Button>
        </div>
      </Card>

      <Card className="bg-card border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead></TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Sessions</TableHead>
              <TableHead>Messages</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground">Loading...</TableCell></TableRow>}
            {!loading && paged.length === 0 && <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground">No users found</TableCell></TableRow>}
            {paged.map((u, i) => (
              <TableRow key={u.id}>
                <TableCell className="text-xs text-muted-foreground">{(page - 1) * PAGE_SIZE + i + 1}</TableCell>
                <TableCell>
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                    {(u.full_name || u.email || "?").slice(0, 1).toUpperCase()}
                  </div>
                </TableCell>
                <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{u.email}</TableCell>
                <TableCell><Badge variant="outline" className="capitalize">{u.plan}</Badge></TableCell>
                <TableCell>{u._sessions}</TableCell>
                <TableCell>{u._messages}</TableCell>
                <TableCell>
                  {u.is_active
                    ? <Badge className="bg-primary/15 text-primary border-0">Active</Badge>
                    : <Badge variant="outline" className="text-muted-foreground">Inactive</Badge>}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setSelectedUser(u)}><Eye className="h-4 w-4" />View Profile</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setEditUser({ ...u })}><Pencil className="h-4 w-4" />Edit User</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toggleActive(u)}>
                        {u.is_active ? <><Ban className="h-4 w-4" />Deactivate</> : <><CheckCircle className="h-4 w-4" />Activate</>}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive" onClick={() => setDeleteUser(u)}><Trash2 className="h-4 w-4" />Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-border">
            <p className="text-xs text-muted-foreground">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
              <Button size="sm" variant="outline" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </Card>

      {/* User detail panel */}
      <Sheet open={!!selectedUser} onOpenChange={(o) => !o && setSelectedUser(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedUser && (
            <>
              <SheetHeader><SheetTitle>{selectedUser.full_name || "User"}</SheetTitle></SheetHeader>
              <div className="mt-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary font-semibold">
                    {(selectedUser.full_name || selectedUser.email || "?").slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{selectedUser.email}</p>
                    <p className="text-xs text-muted-foreground">Joined {new Date(selectedUser.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <Card className="p-3 bg-card-elevated border-border"><p className="text-xs text-muted-foreground">Sessions</p><p className="text-lg font-semibold">{selectedUser._sessions}</p></Card>
                  <Card className="p-3 bg-card-elevated border-border"><p className="text-xs text-muted-foreground">Messages</p><p className="text-lg font-semibold">{selectedUser._messages}</p></Card>
                  <Card className="p-3 bg-card-elevated border-border"><p className="text-xs text-muted-foreground">Plan</p><p className="text-lg font-semibold capitalize">{selectedUser.plan}</p></Card>
                </div>
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Profile</p>
                  <pre className="text-xs bg-card-elevated p-3 rounded-lg overflow-auto">{JSON.stringify(selectedUser, null, 2)}</pre>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Edit dialog */}
      <Dialog open={!!editUser} onOpenChange={(o) => !o && setEditUser(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit User</DialogTitle></DialogHeader>
          {editUser && (
            <div className="space-y-3">
              <div><Label>Full Name</Label><Input value={editUser.full_name || ""} onChange={(e) => setEditUser({ ...editUser, full_name: e.target.value })} /></div>
              <div><Label>Email</Label><Input value={editUser.email || ""} onChange={(e) => setEditUser({ ...editUser, email: e.target.value })} /></div>
              <div>
                <Label>Plan</Label>
                <Select value={editUser.plan} onValueChange={(v) => setEditUser({ ...editUser, plan: v, max_sessions: PLAN_SESSIONS[v] || editUser.max_sessions })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PLANS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Max Sessions</Label><Input type="number" value={editUser.max_sessions} onChange={(e) => setEditUser({ ...editUser, max_sessions: Number(e.target.value) })} /></div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setEditUser(null)}>Cancel</Button><Button onClick={saveEdit}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteUser} onOpenChange={(o) => !o && setDeleteUser(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete User?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This permanently removes <b>{deleteUser?.email}</b>. This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteUser(null)}>Cancel</Button>
            <Button variant="destructive" onClick={deleteUserConfirm}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create user dialog */}
      <CreateUserDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={load} />
    </div>
  );
}

function CreateUserDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ full_name: "", email: "", password: "", plan: "trial", max_sessions: 1 });
  const [loading, setLoading] = useState(false);

  const generatePwd = () => setForm((f) => ({ ...f, password: Math.random().toString(36).slice(2, 10) + "Aa1!" }));

  const submit = async () => {
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: form.email, password: form.password,
      options: { data: { full_name: form.full_name }, emailRedirectTo: window.location.origin },
    });
    if (error || !data.user) { toast.error(error?.message || "Failed"); setLoading(false); return; }
    await supabase.from("profiles").update({ plan: form.plan, max_sessions: form.max_sessions, full_name: form.full_name }).eq("id", data.user.id);
    await supabase.from("activity_logs").insert({ action: "user.create", actor_type: "headadmin", target_type: "user", target_id: data.user.id });
    toast.success(`User created — ${form.email}`);
    setLoading(false); onClose(); onCreated();
    setForm({ full_name: "", email: "", password: "", plan: "trial", max_sessions: 1 });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Create New User</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Full Name</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
          <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div>
            <Label>Password</Label>
            <div className="flex gap-2">
              <Input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              <Button type="button" variant="outline" onClick={generatePwd}>Generate</Button>
            </div>
          </div>
          <div>
            <Label>Plan</Label>
            <Select value={form.plan} onValueChange={(v) => setForm({ ...form, plan: v, max_sessions: PLAN_SESSIONS[v] || 1 })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{PLANS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Max Sessions</Label><Input type="number" value={form.max_sessions} onChange={(e) => setForm({ ...form, max_sessions: Number(e.target.value) })} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={loading || !form.email || !form.password}>{loading ? "Creating..." : "Create User"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
