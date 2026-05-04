import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Edit, X, Plus, Loader2 } from "lucide-react";

type Plan = {
  id: string;
  plan_name: string;
  display_name: string;
  price_monthly: number;
  price_yearly: number;
  max_sessions: number;
  features: string[] | null;
  is_active: boolean;
};

export default function HAPlanPricing() {
  const [rows, setRows] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [newFeature, setNewFeature] = useState("");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("plan_pricing").select("*").order("price_monthly");
    setRows((data as Plan[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing) return;
    const { error } = await supabase.from("plan_pricing").update({
      display_name: editing.display_name,
      price_monthly: editing.price_monthly,
      price_yearly: editing.price_yearly,
      max_sessions: editing.max_sessions,
      features: editing.features,
      is_active: editing.is_active,
    }).eq("id", editing.id);
    if (error) return toast.error(error.message);
    toast.success("Plan updated");
    setEditing(null); load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Plan Pricing</h1>
        <p className="text-sm text-muted-foreground">Edit subscription plans shown on the user subscription page</p>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        {loading ? <div className="py-12 grid place-items-center"><Loader2 className="h-5 w-5 animate-spin" /></div> :
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground"><tr>
              <th className="text-left px-4 py-3">Plan</th><th className="text-left px-4 py-3">Display Name</th>
              <th className="text-left px-4 py-3">Monthly</th><th className="text-left px-4 py-3">Yearly</th>
              <th className="text-left px-4 py-3">Sessions</th><th className="text-left px-4 py-3">Active</th><th></th>
            </tr></thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="px-4 py-3 capitalize font-medium">{p.plan_name}</td>
                  <td className="px-4 py-3">{p.display_name}</td>
                  <td className="px-4 py-3">${p.price_monthly}</td>
                  <td className="px-4 py-3">${p.price_yearly}</td>
                  <td className="px-4 py-3">{p.max_sessions}</td>
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
            <div className="space-y-3 max-h-[70vh] overflow-y-auto">
              <div><Label>Display Name</Label><Input value={editing.display_name} onChange={(e) => setEditing({ ...editing, display_name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Monthly Price ($)</Label><Input type="number" step="0.01" value={editing.price_monthly} onChange={(e) => setEditing({ ...editing, price_monthly: +e.target.value })} /></div>
                <div><Label>Yearly Price ($)</Label><Input type="number" step="0.01" value={editing.price_yearly} onChange={(e) => setEditing({ ...editing, price_yearly: +e.target.value })} /></div>
              </div>
              <div><Label>Max Sessions</Label><Input type="number" value={editing.max_sessions} onChange={(e) => setEditing({ ...editing, max_sessions: +e.target.value })} /></div>
              <div>
                <Label>Features</Label>
                <div className="space-y-1 mt-1">
                  {(editing.features || []).map((f, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-lg border border-border px-2 py-1 text-sm">
                      <span className="flex-1">{f}</span>
                      <button onClick={() => setEditing({ ...editing, features: editing.features!.filter((_, j) => j !== i) })}><X className="h-3 w-3" /></button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Input value={newFeature} onChange={(e) => setNewFeature(e.target.value)} placeholder="Add feature" />
                    <Button size="sm" onClick={() => { if (newFeature.trim()) { setEditing({ ...editing, features: [...(editing.features || []), newFeature.trim()] }); setNewFeature(""); } }}><Plus className="h-3 w-3" /></Button>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2"><Switch checked={editing.is_active} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} /> <Label>Active</Label></div>
              <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button><Button onClick={save}>Save</Button></div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
