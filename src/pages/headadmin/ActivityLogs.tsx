import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function ActivityLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [actorFilter, setActorFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(1000);
      setLogs(data || []);
    })();
  }, []);

  const actorTypes = Array.from(new Set(logs.map((l) => l.actor_type).filter(Boolean)));
  const filtered = logs.filter((l) => {
    if (search && !JSON.stringify(l).toLowerCase().includes(search.toLowerCase())) return false;
    if (actorFilter !== "all" && l.actor_type !== actorFilter) return false;
    if (actionFilter === "create" && !l.action.includes("create")) return false;
    if (actionFilter === "delete" && !l.action.includes("delete")) return false;
    if (actionFilter === "edit" && !(l.action.includes("edit") || l.action.includes("update"))) return false;
    if (actionFilter === "login" && !l.action.includes("login")) return false;
    return true;
  });

  const colorOf = (a: string) => {
    if (a.includes("delete")) return "text-destructive";
    if (a.includes("create")) return "text-primary";
    if (a.includes("edit") || a.includes("update")) return "text-blue-400";
    if (a.includes("login")) return "text-muted-foreground";
    return "text-foreground";
  };

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-semibold">Activity Logs</h1><p className="text-sm text-muted-foreground">Complete audit trail</p></div>

      <Card className="p-4 bg-card border-border">
        <div className="grid gap-3 md:grid-cols-3">
          <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <Select value={actorFilter} onValueChange={setActorFilter}>
            <SelectTrigger><SelectValue placeholder="Actor" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actors</SelectItem>
              {actorTypes.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger><SelectValue placeholder="Action" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="create">Create</SelectItem><SelectItem value="edit">Edit</SelectItem>
              <SelectItem value="delete">Delete</SelectItem><SelectItem value="login">Login</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="bg-card border-border">
        <Table>
          <TableHeader><TableRow><TableHead>Time</TableHead><TableHead>Actor</TableHead><TableHead>Action</TableHead><TableHead>Target</TableHead><TableHead>Details</TableHead><TableHead>IP</TableHead></TableRow></TableHeader>
          <TableBody>
            {filtered.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No logs</TableCell></TableRow>}
            {filtered.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString()}</TableCell>
                <TableCell className="text-xs">{l.actor_type || "—"}</TableCell>
                <TableCell className={`text-xs font-medium ${colorOf(l.action)}`}>{l.action}</TableCell>
                <TableCell className="text-xs">{l.target_type || "—"}</TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-md truncate">{l.details ? JSON.stringify(l.details) : "—"}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{l.ip_address || "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
