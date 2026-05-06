import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MoreVertical, RefreshCw, PowerOff, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import { backendApi } from "@/lib/backend";

const STATUS = {
  connected: { label: "Connected", cls: "bg-primary/15 text-primary" },
  disconnected: { label: "Disconnected", cls: "bg-destructive/15 text-destructive" },
  qr_pending: { label: "QR Pending", cls: "bg-warning/15 text-warning" },
  pending: { label: "QR Pending", cls: "bg-warning/15 text-warning" },
} as any;

export default function AllSessions() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [msgCounts, setMsgCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [del, setDel] = useState<any>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: s }, { data: p }, { data: m }] = await Promise.all([
      supabase.from("sessions").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("id,full_name,email"),
      supabase.from("message_logs").select("session_id"),
    ]);
    const pm: Record<string, any> = {};
    p?.forEach((u: any) => pm[u.id] = u);
    const mc: Record<string, number> = {};
    m?.forEach((l: any) => { mc[l.session_id] = (mc[l.session_id] || 0) + 1; });
    setProfiles(pm); setMsgCounts(mc); setSessions(s || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = sessions.filter((s) => {
    const u = profiles[s.user_id];
    if (search && !`${s.session_name} ${u?.email || ""} ${s.phone_number || ""}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== "all" && s.status !== statusFilter) return false;
    return true;
  });

  const counts = {
    total: sessions.length,
    connected: sessions.filter((s) => s.status === "connected").length,
    disconnected: sessions.filter((s) => s.status === "disconnected").length,
    pending: sessions.filter((s) => s.status === "qr_pending" || s.status === "pending").length,
  };

  const action = async (s: any, type: "restart" | "disconnect") => {
    const newStatus = type === "disconnect" ? "disconnected" : "qr_pending";
    if (type === "disconnect") await backendApi.logout(s.id).catch(() => {});
    if (type === "restart") await backendApi.restart(s.id);
    await supabase.from("sessions").update({ status: newStatus }).eq("id", s.id);
    await supabase.from("activity_logs").insert({ action: `session.${type}`, actor_type: "headadmin", target_type: "session", target_id: s.id });
    toast.success(`Session ${type}ed`);
    load();
  };

  const doDelete = async () => {
    await backendApi.logout(del.id).catch(() => {});
    await supabase.from("sessions").delete().eq("id", del.id);
    await supabase.from("activity_logs").insert({ action: "session.delete", actor_type: "headadmin", target_type: "session", target_id: del.id });
    toast.success("Session deleted");
    setDel(null); load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">All Sessions</h1>
        <p className="text-sm text-muted-foreground">Across all users</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4 bg-card border-border"><p className="text-xs text-muted-foreground">Total</p><p className="text-2xl font-semibold">{counts.total}</p></Card>
        <Card className="p-4 bg-card border-border"><p className="text-xs text-muted-foreground">Connected</p><p className="text-2xl font-semibold text-primary">{counts.connected}</p></Card>
        <Card className="p-4 bg-card border-border"><p className="text-xs text-muted-foreground">Disconnected</p><p className="text-2xl font-semibold text-destructive">{counts.disconnected}</p></Card>
        <Card className="p-4 bg-card border-border"><p className="text-xs text-muted-foreground">QR Pending</p><p className="text-2xl font-semibold text-warning">{counts.pending}</p></Card>
      </div>

      <Card className="p-4 bg-card border-border">
        <div className="grid gap-3 md:grid-cols-3">
          <Input placeholder="Search session, user, phone..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="connected">Connected</SelectItem>
              <SelectItem value="disconnected">Disconnected</SelectItem>
              <SelectItem value="qr_pending">QR Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="bg-card border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead><TableHead>User</TableHead><TableHead>Session</TableHead>
              <TableHead>Phone</TableHead><TableHead>Status</TableHead><TableHead>Messages</TableHead>
              <TableHead>Last Active</TableHead><TableHead>Created</TableHead><TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground">Loading...</TableCell></TableRow>}
            {!loading && filtered.length === 0 && <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground">No sessions</TableCell></TableRow>}
            {filtered.map((s, i) => {
              const st = STATUS[s.status] || { label: s.status, cls: "bg-muted text-muted-foreground" };
              const u = profiles[s.user_id];
              return (
                <TableRow key={s.id}>
                  <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                  <TableCell><div className="text-sm">{u?.full_name || "—"}</div><div className="text-xs text-muted-foreground">{u?.email}</div></TableCell>
                  <TableCell className="font-medium">{s.session_name}</TableCell>
                  <TableCell className="text-sm">{s.phone_number || "—"}</TableCell>
                  <TableCell><Badge className={`border-0 ${st.cls}`}>{st.label}</Badge></TableCell>
                  <TableCell>{msgCounts[s.id] || 0}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{s.last_active ? new Date(s.last_active).toLocaleString() : "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button size="icon" variant="ghost"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem><Eye className="h-4 w-4" />View</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => action(s, "restart")}><RefreshCw className="h-4 w-4" />Restart</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => action(s, "disconnect")}><PowerOff className="h-4 w-4" />Disconnect</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => setDel(s)}><Trash2 className="h-4 w-4" />Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={!!del} onOpenChange={(o) => !o && setDel(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Session?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Permanently remove <b>{del?.session_name}</b>?</p>
          <DialogFooter><Button variant="outline" onClick={() => setDel(null)}>Cancel</Button><Button variant="destructive" onClick={doDelete}>Delete</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
