import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

export default function AllMessages() {
  const [logs, setLogs] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [sessions, setSessions] = useState<Record<string, any>>({});
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data: m }, { data: p }, { data: s }] = await Promise.all([
        supabase.from("message_logs").select("*").order("created_at", { ascending: false }).limit(500),
        supabase.from("profiles").select("id,full_name,email"),
        supabase.from("sessions").select("id,session_name"),
      ]);
      const pm: Record<string, any> = {}; p?.forEach((u: any) => pm[u.id] = u);
      const sm: Record<string, any> = {}; s?.forEach((x: any) => sm[x.id] = x);
      setProfiles(pm); setSessions(sm); setLogs(m || []);
    })();
  }, []);

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const counts = {
    total: logs.length,
    sent: logs.filter((l) => l.status === "sent").length,
    failed: logs.filter((l) => l.status === "failed").length,
    today: logs.filter((l) => new Date(l.created_at) >= today).length,
  };

  const apply = (rows: any[]) => rows.filter((l) => {
    if (search && !`${l.to_number || ""}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== "all" && l.status !== statusFilter) return false;
    if (typeFilter !== "all" && l.message_type !== typeFilter) return false;
    return true;
  });

  const renderTable = (rows: any[]) => (
    <Card className="bg-card border-border">
      <Table>
        <TableHeader><TableRow>
          <TableHead>Time</TableHead><TableHead>User</TableHead><TableHead>Session</TableHead>
          <TableHead>To</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead>Payload</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {rows.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No messages</TableCell></TableRow>}
          {rows.map((l) => {
            const u = profiles[l.user_id]; const s = sessions[l.session_id];
            const isOpen = expanded === l.id;
            return (
              <>
                <TableRow key={l.id} onClick={() => setExpanded(isOpen ? null : l.id)} className="cursor-pointer">
                  <TableCell className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString()}</TableCell>
                  <TableCell className="text-sm">{u?.email || "—"}</TableCell>
                  <TableCell className="text-sm">{s?.session_name || "—"}</TableCell>
                  <TableCell className="text-sm">{l.to_number || "—"}</TableCell>
                  <TableCell><Badge variant="outline">{l.message_type}</Badge></TableCell>
                  <TableCell>
                    {l.status === "sent" && <Badge className="bg-primary/15 text-primary border-0">sent</Badge>}
                    {l.status === "failed" && <Badge className="bg-destructive/15 text-destructive border-0">failed</Badge>}
                    {!["sent", "failed"].includes(l.status) && <Badge variant="outline">{l.status}</Badge>}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground truncate max-w-xs">{JSON.stringify(l.payload)?.slice(0, 60)}</TableCell>
                </TableRow>
                {isOpen && (
                  <TableRow key={l.id + "-x"}><TableCell colSpan={7} className="bg-card-elevated">
                    <pre className="text-xs overflow-auto p-2">{JSON.stringify(l.payload, null, 2)}</pre>
                    {l.error_message && <p className="text-xs text-destructive mt-2">Error: {l.error_message}</p>}
                  </TableCell></TableRow>
                )}
              </>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-semibold">Messages</h1><p className="text-sm text-muted-foreground">All message activity</p></div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4 bg-card border-border"><p className="text-xs text-muted-foreground">Total</p><p className="text-2xl font-semibold">{counts.total}</p></Card>
        <Card className="p-4 bg-card border-border"><p className="text-xs text-muted-foreground">Sent</p><p className="text-2xl font-semibold text-primary">{counts.sent}</p></Card>
        <Card className="p-4 bg-card border-border"><p className="text-xs text-muted-foreground">Failed</p><p className="text-2xl font-semibold text-destructive">{counts.failed}</p></Card>
        <Card className="p-4 bg-card border-border"><p className="text-xs text-muted-foreground">Today</p><p className="text-2xl font-semibold">{counts.today}</p></Card>
      </div>

      <Card className="p-4 bg-card border-border">
        <div className="grid gap-3 md:grid-cols-3">
          <Input placeholder="Search by phone..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="text">Text</SelectItem>
              <SelectItem value="image">Image</SelectItem>
              <SelectItem value="document">Document</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Tabs defaultValue="all">
        <TabsList><TabsTrigger value="all">All Messages</TabsTrigger><TabsTrigger value="failed">Failed Only</TabsTrigger></TabsList>
        <TabsContent value="all" className="mt-4">{renderTable(apply(logs))}</TabsContent>
        <TabsContent value="failed" className="mt-4">{renderTable(apply(logs.filter((l) => l.status === "failed")))}</TabsContent>
      </Tabs>
    </div>
  );
}
