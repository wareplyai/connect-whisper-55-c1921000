import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Edit, Loader2 } from "lucide-react";

type M = {
  id?: string;
  method_name: string;
  account_name: string;
  account_number: string;
  instructions: string | null;
  is_active: boolean;
};

const empty: M = { method_name: "", account_name: "", account_number: "", instructions: "", is_active: true };

export default function HAPaymentMethods() {
  const [rows, setRows] = useState<M[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<M | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("payment_methods").select("*").order("created_at");
    setRows((data as M[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing) return;
    if (!editing.method_name || !editing.account_number) { toast.error("Method name and account required"); return; }
    const payload = { ...editing };
    delete (payload as any).id;
    if (editing.id) {
      const { error } = await supabase.from("payment_methods").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("payment_methods").insert(payload);
      if (error) return toast.error(error.message);
    }
    toast.success("Saved");
    setEditing(null);
    load();
  };

  const toggle = async (m: M) => {
    await supabase.from("payment_methods").update({ is_active: !m.is_active }).eq("id", m.id!);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Payment Methods</h1>
          <p className="text-sm text-muted-foreground">Configure available payment methods for users</p>
        </div>
        <Button onClick={() => setEditing(empty)}><Plus className="h-4 w-4 mr-1" /> Add Method</Button>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {loading ? <div className="py-12 grid place-items-center"><Loader2 className="h-5 w-5 animate-spin" /></div> :
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground"><tr>
              <th className="text-left px-4 py-3">Method</th><th className="text-left px-4 py-3">Account Name</th>
              <th className="text-left px-4 py-3">Account Number</th><th className="text-left px-4 py-3">Active</th>
              <th className="text-left px-4 py-3"></th>
            </tr></thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.id} className="border-t border-border">
                  <td className="px-4 py-3 capitalize font-medium">{m.method_name}</td>
                  <td className="px-4 py-3">{m.account_name}</td>
                  <td className="px-4 py-3 font-mono text-xs">{m.account_number}</td>
                  <td className="px-4 py-3"><Switch checked={m.is_active} onCheckedChange={() => toggle(m)} /></td>
                  <td className="px-4 py-3"><Button size="sm" variant="outline" onClick={() => setEditing(m)}><Edit className="h-3 w-3" /></Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        }
      </div>

      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? "Edit" : "Add"} Payment Method</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div><Label>Method Name (bkash, nagad, rocket, bank)</Label>
                <Input value={editing.method_name} onChange={(e) => setEditing({ ...editing, method_name: e.target.value })} /></div>
              <div><Label>Account Name</Label>
                <Input value={editing.account_name} onChange={(e) => setEditing({ ...editing, account_name: e.target.value })} /></div>
              <div><Label>Account Number</Label>
                <Input value={editing.account_number} onChange={(e) => setEditing({ ...editing, account_number: e.target.value })} /></div>
              <div><Label>Instructions</Label>
                <Textarea rows={4} value={editing.instructions || ""} onChange={(e) => setEditing({ ...editing, instructions: e.target.value })} /></div>
              <div className="flex items-center gap-2"><Switch checked={editing.is_active} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} /> <Label>Active</Label></div>
              <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button><Button onClick={save}>Save</Button></div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
