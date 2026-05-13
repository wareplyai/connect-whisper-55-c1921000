import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Edit, X, Plus, Loader2, Star, GripVertical, ArrowUp, ArrowDown } from "lucide-react";

type Plan = {
  id: string;
  plan_name: string;
  display_name: string;
  description: string | null;
  price_monthly: number;
  price_yearly: number;
  price_monthly_bdt: number;
  price_yearly_bdt: number;
  max_sessions: number;
  features: string[] | null;
  is_active: boolean;
  is_popular: boolean;
  sort_order: number;
  cta_label: string | null;
};

export default function HAPlanPricing() {
  const [rows, setRows] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [newFeature, setNewFeature] = useState("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const reorderFeatures = (from: number, to: number) => {
    if (!editing) return;
    const features = [...(editing.features || [])];
    if (from < 0 || from >= features.length || to < 0 || to >= features.length) return;
    const [moved] = features.splice(from, 1);
    features.splice(to, 0, moved);
    setEditing({ ...editing, features });
  };

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("plan_pricing").select("*").order("sort_order");
    setRows((data as Plan[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing) return;
    // If marking this plan popular, unset others
    if (editing.is_popular) {
      await supabase.from("plan_pricing").update({ is_popular: false }).neq("id", editing.id);
    }
    const { error } = await supabase.from("plan_pricing").update({
      display_name: editing.display_name,
      description: editing.description,
      price_monthly: editing.price_monthly,
      price_yearly: editing.price_yearly,
      price_monthly_bdt: editing.price_monthly_bdt,
      price_yearly_bdt: editing.price_yearly_bdt,
      max_sessions: editing.max_sessions,
      features: editing.features,
      is_active: editing.is_active,
      is_popular: editing.is_popular,
      sort_order: editing.sort_order,
      cta_label: editing.cta_label,
    } as any).eq("id", editing.id);
    if (error) return toast.error(error.message);
    toast.success("Plan updated");
    setEditing(null); load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Plan Pricing</h1>
        <p className="text-sm text-muted-foreground">Edit plans shown on the landing page & subscription page</p>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        {loading ? <div className="py-12 grid place-items-center"><Loader2 className="h-5 w-5 animate-spin" /></div> :
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground"><tr>
              <th className="text-left px-4 py-3">Order</th>
              <th className="text-left px-4 py-3">Plan</th>
              <th className="text-left px-4 py-3">Display Name</th>
              <th className="text-left px-4 py-3">Monthly (USD)</th>
              <th className="text-left px-4 py-3">Monthly (BDT)</th>
              <th className="text-left px-4 py-3">Yearly (USD)</th>
              <th className="text-left px-4 py-3">Yearly (BDT)</th>
              <th className="text-left px-4 py-3">Sessions</th>
              <th className="text-left px-4 py-3">Popular</th>
              <th className="text-left px-4 py-3">Active</th>
              <th></th>
            </tr></thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="px-4 py-3">{p.sort_order}</td>
                  <td className="px-4 py-3 capitalize font-medium">{p.plan_name}</td>
                  <td className="px-4 py-3">{p.display_name}</td>
                  <td className="px-4 py-3">${p.price_monthly}</td>
                  <td className="px-4 py-3">৳{p.price_monthly_bdt}</td>
                  <td className="px-4 py-3">${p.price_yearly}</td>
                  <td className="px-4 py-3">৳{p.price_yearly_bdt}</td>
                  <td className="px-4 py-3">{p.max_sessions}</td>
                  <td className="px-4 py-3">{p.is_popular ? <Star className="h-4 w-4 text-primary fill-primary" /> : "—"}</td>
                  <td className="px-4 py-3">{p.is_active ? "Yes" : "No"}</td>
                  <td className="px-4 py-3"><Button size="sm" variant="outline" onClick={() => setEditing({ ...p, features: p.features || [] })}><Edit className="h-3 w-3" /></Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        }
      </div>

      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Plan: {editing?.plan_name}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
              <div><Label>Display Name</Label><Input value={editing.display_name} onChange={(e) => setEditing({ ...editing, display_name: e.target.value })} /></div>
              <div>
                <Label>Description (shown under plan name)</Label>
                <Textarea rows={3} value={editing.description || ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} placeholder="Short marketing tagline for this plan" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Monthly Price (USD $)</Label><Input type="number" step="0.01" value={editing.price_monthly} onChange={(e) => setEditing({ ...editing, price_monthly: +e.target.value })} /></div>
                <div><Label>Monthly Price (BDT ৳)</Label><Input type="number" step="1" value={editing.price_monthly_bdt} onChange={(e) => setEditing({ ...editing, price_monthly_bdt: +e.target.value })} /></div>
                <div><Label>Yearly Price (USD $)</Label><Input type="number" step="0.01" value={editing.price_yearly} onChange={(e) => setEditing({ ...editing, price_yearly: +e.target.value })} /></div>
                <div><Label>Yearly Price (BDT ৳)</Label><Input type="number" step="1" value={editing.price_yearly_bdt} onChange={(e) => setEditing({ ...editing, price_yearly_bdt: +e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Max Sessions</Label><Input type="number" value={editing.max_sessions} onChange={(e) => setEditing({ ...editing, max_sessions: +e.target.value })} /></div>
                <div><Label>Sort Order</Label><Input type="number" value={editing.sort_order} onChange={(e) => setEditing({ ...editing, sort_order: +e.target.value })} /></div>
              </div>
              <div><Label>Button Label (CTA)</Label><Input value={editing.cta_label || ""} onChange={(e) => setEditing({ ...editing, cta_label: e.target.value })} placeholder="Choose Plan" /></div>
              <div>
                <Label>Features</Label>
                <p className="text-xs text-muted-foreground mt-0.5 mb-2">Drag to reorder, or use the up/down arrows.</p>
                <div className="space-y-1 mt-1">
                  {(editing.features || []).map((f, i) => {
                    const isDragging = dragIndex === i;
                    const isOver = overIndex === i && dragIndex !== null && dragIndex !== i;
                    return (
                      <div
                        key={i}
                        draggable
                        onDragStart={(e) => { setDragIndex(i); e.dataTransfer.effectAllowed = "move"; }}
                        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; if (overIndex !== i) setOverIndex(i); }}
                        onDragLeave={() => { if (overIndex === i) setOverIndex(null); }}
                        onDrop={(e) => { e.preventDefault(); if (dragIndex !== null && dragIndex !== i) reorderFeatures(dragIndex, i); setDragIndex(null); setOverIndex(null); }}
                        onDragEnd={() => { setDragIndex(null); setOverIndex(null); }}
                        className={`flex items-center gap-2 rounded-lg border px-2 py-1 text-sm transition ${isDragging ? "opacity-40 border-primary" : isOver ? "border-primary bg-primary/5" : "border-border"}`}
                      >
                        <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab active:cursor-grabbing shrink-0" />
                        <span className="flex-1">{f}</span>
                        <button type="button" disabled={i === 0} onClick={() => reorderFeatures(i, i - 1)} className="p-1 rounded hover:bg-muted disabled:opacity-30" title="Move up"><ArrowUp className="h-3 w-3" /></button>
                        <button type="button" disabled={i === (editing.features || []).length - 1} onClick={() => reorderFeatures(i, i + 1)} className="p-1 rounded hover:bg-muted disabled:opacity-30" title="Move down"><ArrowDown className="h-3 w-3" /></button>
                        <button type="button" onClick={() => setEditing({ ...editing, features: editing.features!.filter((_, j) => j !== i) })} className="p-1 rounded hover:bg-muted" title="Remove"><X className="h-3 w-3" /></button>
                      </div>
                    );
                  })}
                  <div className="flex gap-2">
                    <Input value={newFeature} onChange={(e) => setNewFeature(e.target.value)} placeholder="Add feature" />
                    <Button size="sm" onClick={() => { if (newFeature.trim()) { setEditing({ ...editing, features: [...(editing.features || []), newFeature.trim()] }); setNewFeature(""); } }}><Plus className="h-3 w-3" /></Button>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2"><Switch checked={editing.is_active} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} /> <Label>Active</Label></div>
                <div className="flex items-center gap-2"><Switch checked={editing.is_popular} onCheckedChange={(v) => setEditing({ ...editing, is_popular: v })} /> <Label>Mark as Popular</Label></div>
              </div>
              <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button><Button onClick={save}>Save</Button></div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
