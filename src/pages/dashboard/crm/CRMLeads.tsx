import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Plus, LayoutGrid, List, Trash2 } from "lucide-react";

type Lead = any;
const COLUMNS: { key: string; label: string; color: string }[] = [
  { key: "new", label: "New", color: "bg-muted" },
  { key: "contacted", label: "Contacted", color: "bg-primary/15" },
  { key: "qualified", label: "Qualified", color: "bg-warning/15" },
  { key: "converted", label: "Converted", color: "bg-success/15" },
  { key: "lost", label: "Lost", color: "bg-destructive/15" },
];

export default function CRMLeads() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [addOpen, setAddOpen] = useState(false);
  const [drawer, setDrawer] = useState<Lead | null>(null);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("crm_leads").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setLeads(data || []);
  };
  useEffect(() => { load(); }, [user]);

  const move = async (id: string, status: string) => {
    await supabase.from("crm_leads").update({ status }).eq("id", id);
    load();
  };

  const onDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("id");
    if (id) move(id, status);
  };

  const remove = async (id: string) => {
    if (!confirm("Delete lead?")) return;
    await supabase.from("crm_leads").delete().eq("id", id);
    toast.success("Deleted"); load(); setDrawer(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Leads</h1>
          <p className="text-sm text-muted-foreground">Customer pipeline & follow-ups</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setView(view === "kanban" ? "list" : "kanban")}>
            {view === "kanban" ? <List className="h-4 w-4 mr-2" /> : <LayoutGrid className="h-4 w-4 mr-2" />}
            {view === "kanban" ? "List view" : "Kanban view"}
          </Button>
          <Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4 mr-2" /> Add Lead</Button>
        </div>
      </div>

      {view === "kanban" ? (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {COLUMNS.map(col => {
            const items = leads.filter(l => l.status === col.key);
            return (
              <div key={col.key} onDragOver={e => e.preventDefault()} onDrop={e => onDrop(e, col.key)} className={`rounded-lg p-2 ${col.color} min-h-[400px]`}>
                <p className="text-xs font-semibold mb-2 px-1">{col.label} <span className="text-muted-foreground">({items.length})</span></p>
                <div className="space-y-2">
                  {items.map(l => (
                    <div key={l.id} draggable onDragStart={e => e.dataTransfer.setData("id", l.id)} onClick={() => setDrawer(l)} className="bg-card border border-border rounded-md p-2 text-xs cursor-pointer hover:shadow-md transition">
                      <p className="font-semibold text-sm">{l.name || "—"}</p>
                      <p className="text-muted-foreground">{l.phone}</p>
                      {l.business_type && <Badge variant="outline" className="mt-1 text-[10px]">{l.business_type}</Badge>}
                      {l.budget && <p className="mt-1">৳{l.budget}</p>}
                      {l.follow_up_date && <p className="text-muted-foreground mt-1">📅 {new Date(l.follow_up_date).toLocaleDateString()}</p>}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Card><CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted text-xs text-muted-foreground">
                <tr>{["Name", "Phone", "Type", "Status", "Budget", "Follow-up", ""].map(h => <th key={h} className="text-left p-3">{h}</th>)}</tr>
              </thead>
              <tbody>
                {leads.length === 0 ? <tr><td colSpan={7} className="text-center py-10 text-muted-foreground">No leads</td></tr> : leads.map(l => (
                  <tr key={l.id} className="border-t border-border hover:bg-muted/30 cursor-pointer" onClick={() => setDrawer(l)}>
                    <td className="p-3 font-medium">{l.name || "—"}</td>
                    <td className="p-3">{l.phone}</td>
                    <td className="p-3">{l.business_type || "-"}</td>
                    <td className="p-3"><Badge variant="outline">{l.status}</Badge></td>
                    <td className="p-3">{l.budget || "-"}</td>
                    <td className="p-3">{l.follow_up_date ? new Date(l.follow_up_date).toLocaleDateString() : "-"}</td>
                    <td className="p-3"><Button size="icon" variant="ghost" onClick={e => { e.stopPropagation(); remove(l.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent></Card>
      )}

      <LeadDialog open={addOpen} onOpenChange={setAddOpen} onSaved={load} />

      <Sheet open={!!drawer} onOpenChange={(o) => !o && setDrawer(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader><SheetTitle>{drawer?.name || "Lead"}</SheetTitle></SheetHeader>
          {drawer && <LeadDetail lead={drawer} onChanged={() => { load(); }} onDelete={() => remove(drawer.id)} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function LeadDetail({ lead, onChanged, onDelete }: { lead: any; onChanged: () => void; onDelete: () => void }) {
  const [form, setForm] = useState({ ...lead });
  useEffect(() => { setForm({ ...lead }); }, [lead.id]);
  const save = async () => {
    const { error } = await supabase.from("crm_leads").update({
      name: form.name, phone: form.phone, business_type: form.business_type, intent: form.intent, budget: form.budget,
      travel_date: form.travel_date, group_size: form.group_size, status: form.status, assigned_agent: form.assigned_agent,
      notes: form.notes, follow_up_date: form.follow_up_date || null,
    }).eq("id", lead.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Saved"); onChanged();
  };
  return (
    <div className="space-y-3 mt-4 text-sm">
      <div><Label>Name</Label><Input value={form.name || ""} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
      <div><Label>Phone</Label><Input value={form.phone || ""} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
      <div className="grid grid-cols-2 gap-2">
        <div><Label>Type</Label>
          <Select value={form.business_type || ""} onValueChange={(v) => setForm({ ...form, business_type: v })}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>{["ecommerce", "travel", "hajj", "service", "agency"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Status</Label>
          <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{COLUMNS.map(c => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Budget</Label><Input value={form.budget || ""} onChange={e => setForm({ ...form, budget: e.target.value })} /></div>
        <div><Label>Group Size</Label><Input value={form.group_size || ""} onChange={e => setForm({ ...form, group_size: e.target.value })} /></div>
        <div><Label>Travel Date</Label><Input value={form.travel_date || ""} onChange={e => setForm({ ...form, travel_date: e.target.value })} /></div>
        <div><Label>Assigned Agent</Label><Input value={form.assigned_agent || ""} onChange={e => setForm({ ...form, assigned_agent: e.target.value })} /></div>
      </div>
      <div><Label>Intent</Label><Input value={form.intent || ""} onChange={e => setForm({ ...form, intent: e.target.value })} /></div>
      <div><Label>Follow-up Date</Label><Input type="datetime-local" value={form.follow_up_date ? new Date(form.follow_up_date).toISOString().slice(0, 16) : ""} onChange={e => setForm({ ...form, follow_up_date: e.target.value })} /></div>
      <div><Label>Notes</Label><Textarea rows={3} value={form.notes || ""} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
      <div className="flex gap-2 pt-2">
        <Button onClick={save} className="flex-1">Save</Button>
        <Button variant="destructive" size="icon" onClick={onDelete}><Trash2 className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}

function LeadDialog({ open, onOpenChange, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; onSaved: () => void }) {
  const { user } = useAuth();
  const [form, setForm] = useState<any>({ name: "", phone: "", source: "whatsapp", business_type: "ecommerce", status: "new", budget: "", intent: "" });
  const save = async () => {
    if (!user || !form.phone) { toast.error("Phone required"); return; }
    const { error } = await supabase.from("crm_leads").insert({ user_id: user.id, ...form });
    if (error) { toast.error(error.message); return; }
    toast.success("Lead added"); setForm({ name: "", phone: "", source: "whatsapp", business_type: "ecommerce", status: "new", budget: "", intent: "" });
    onOpenChange(false); onSaved();
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add Lead</DialogTitle></DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Phone *</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
            <div><Label>Source</Label>
              <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["whatsapp", "facebook_ad", "website"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Type</Label>
              <Select value={form.business_type} onValueChange={(v) => setForm({ ...form, business_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["ecommerce", "travel", "hajj", "service", "agency"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Budget</Label><Input value={form.budget} onChange={e => setForm({ ...form, budget: e.target.value })} /></div>
            <div><Label>Intent</Label><Input value={form.intent} onChange={e => setForm({ ...form, intent: e.target.value })} /></div>
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={save}>Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
