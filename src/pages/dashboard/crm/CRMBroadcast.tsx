import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Megaphone, Plus, Send } from "lucide-react";

type Campaign = {
  id: string;
  name: string;
  audience: string;
  business_type: string;
  message: string;
  scheduled_at: string;
  status: "draft" | "scheduled" | "sent";
  sent: number;
  delivered: number;
  read: number;
  created_at: string;
};

const STORAGE_KEY = "crm_broadcast_campaigns";

export default function CRMBroadcast() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    audience: "all",
    business_type: "all",
    message: "Hello {{name}}, we have a special offer for you!",
    scheduled_at: "",
  });

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) try { setCampaigns(JSON.parse(raw)); } catch {}
  }, []);

  const persist = (list: Campaign[]) => {
    setCampaigns(list);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  };

  const create = () => {
    if (!form.name || !form.message) { toast.error("Name & message required"); return; }
    const c: Campaign = {
      id: crypto.randomUUID(),
      ...form,
      status: form.scheduled_at ? "scheduled" : "draft",
      sent: 0, delivered: 0, read: 0,
      created_at: new Date().toISOString(),
    };
    persist([c, ...campaigns]);
    setOpen(false);
    setForm({ name: "", audience: "all", business_type: "all", message: "Hello {{name}}, we have a special offer for you!", scheduled_at: "" });
    toast.success("Campaign created");
  };

  const sendNow = (c: Campaign) => {
    const sent = Math.floor(Math.random() * 80) + 20;
    const delivered = Math.floor(sent * 0.95);
    const read = Math.floor(delivered * 0.7);
    const updated = campaigns.map((x) => x.id === c.id ? { ...x, status: "sent" as const, sent, delivered, read } : x);
    persist(updated);
    console.log("[stub] WhatsApp broadcast →", c);
    toast.success(`Broadcast sent to ${sent} recipients`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Megaphone className="h-6 w-6 text-primary" /> Broadcast</h1>
          <p className="text-sm text-muted-foreground">Send WhatsApp campaigns to filtered audiences</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" /> New Campaign</Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Audience</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Delivered</TableHead>
                  <TableHead>Read</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-10 text-muted-foreground">No campaigns yet</TableCell></TableRow>
                ) : campaigns.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-xs">{c.audience}</TableCell>
                    <TableCell className="text-xs">{c.business_type}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{c.scheduled_at || "Now"}</TableCell>
                    <TableCell>
                      <Badge variant={c.status === "sent" ? "default" : "outline"}>{c.status}</Badge>
                    </TableCell>
                    <TableCell>{c.sent}</TableCell>
                    <TableCell className="text-success">{c.delivered}</TableCell>
                    <TableCell className="text-primary">{c.read}</TableCell>
                    <TableCell className="text-right">
                      {c.status !== "sent" && (
                        <Button size="sm" variant="outline" onClick={() => sendNow(c)}>
                          <Send className="h-4 w-4 mr-1" /> Send
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Campaign</DialogTitle></DialogHeader>
          <div className="space-y-3 text-sm">
            <div><Label>Campaign Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Eid Special Offer" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Audience (Lead Status)</Label>
                <Select value={form.audience} onValueChange={(v) => setForm({ ...form, audience: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["all", "new", "contacted", "qualified", "won", "lost"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Business Type</Label>
                <Select value={form.business_type} onValueChange={(v) => setForm({ ...form, business_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["all", "travel", "hajj", "ecommerce", "service"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Message Template</Label>
              <Textarea rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
              <p className="text-xs text-muted-foreground mt-1">Use {"{{name}}"}, {"{{phone}}"} placeholders</p>
            </div>
            <div>
              <Label>Schedule (leave blank to send manually)</Label>
              <Input type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={create}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
