import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Check, Truck, Image as ImageIcon } from "lucide-react";

const STATUS_COLOR: Record<string, string> = {
  returned: "bg-warning/15 text-warning",
  approved: "bg-primary/15 text-primary",
  picked: "bg-success/15 text-success",
};

export default function CRMReturns() {
  const { user } = useAuth();
  const [returns, setReturns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [photoOrder, setPhotoOrder] = useState<any | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("crm_orders")
      .select("*")
      .eq("user_id", user.id)
      .in("order_status", ["returned", "approved", "picked"])
      .order("updated_at", { ascending: false });
    setReturns(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const approve = async (o: any) => {
    await supabase.from("crm_orders").update({ order_status: "approved", notes: (o.notes || "") + "\n[Return approved]" }).eq("id", o.id);
    toast.success("Return approved");
    console.log("[stub] approve return →", o.id);
    load();
  };

  const bookPickup = async (o: any) => {
    const trackingId = `RET-${Date.now().toString().slice(-8)}`;
    await supabase.from("crm_orders").update({ order_status: "picked", courier_status: "in_transit", tracking_id: trackingId }).eq("id", o.id);
    console.log("[stub] courier pickup booking →", { courier: o.courier_name, trackingId });
    toast.success(`Pickup booked • ${trackingId}`);
    load();
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Returns</h1>
        <p className="text-sm text-muted-foreground">Manage return requests and pickups</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : returns.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">No return requests</TableCell></TableRow>
                ) : returns.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-xs">{o.woo_order_id || o.id.slice(0, 8)}</TableCell>
                    <TableCell>{o.customer_name}</TableCell>
                    <TableCell className="text-xs">{o.customer_phone}</TableCell>
                    <TableCell>৳{o.total_amount}</TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLOR[o.order_status] || "bg-muted"}`}>{o.order_status}</span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{o.notes || "-"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {o.order_status === "returned" && (
                          <Button size="sm" variant="outline" onClick={() => approve(o)}>
                            <Check className="h-4 w-4 mr-1" /> Approve
                          </Button>
                        )}
                        {o.order_status === "approved" && (
                          <Button size="sm" variant="outline" onClick={() => bookPickup(o)}>
                            <Truck className="h-4 w-4 mr-1" /> Book Pickup
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" onClick={() => setPhotoOrder(o)} title="View photo">
                          <ImageIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!photoOrder} onOpenChange={(o) => !o && setPhotoOrder(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Return Photo</DialogTitle></DialogHeader>
          <div className="aspect-video bg-muted rounded-lg flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No photo uploaded yet</p>
              <p className="text-xs mt-1">Customer-submitted photos will appear here</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
