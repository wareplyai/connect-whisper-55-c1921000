import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw } from "lucide-react";

type Row = {
  id: string;
  from_number: string | null;
  customer_text: string | null;
  ai_reply: string | null;
  matched_product_name: string | null;
  catalog_price: number | null;
  quoted_price: number | null;
  mismatch_type: string;
  confidence: number | null;
  resolved: boolean;
  created_at: string;
};

export default function Mismatches() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"open" | "all">("open");

  const load = async () => {
    if (!user) return;
    setLoading(true);
    let q = supabase
      .from("ai_reply_mismatches" as any)
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(200);
    if (filter === "open") q = q.eq("resolved", false);
    const { data, error } = await q;
    if (error) toast.error(error.message);
    setRows((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user, filter]);

  const markResolved = async (id: string) => {
    const { error } = await supabase
      .from("ai_reply_mismatches" as any)
      .update({ resolved: true, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return toast.error(error.message);
    setRows((rs) => rs.filter((r) => r.id !== id));
    toast.success("Marked resolved");
  };

  const openCount = rows.filter((r) => !r.resolved).length;

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-amber-500" />
            AI Reply Mismatches
          </h1>
          <p className="text-sm text-muted-foreground">
            When the AI quotes a wrong price or hits a low-confidence catalog match, it lands here so you can fix it fast.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant={filter === "open" ? "default" : "outline"} size="sm" onClick={() => setFilter("open")}>
            Open {filter === "open" && openCount > 0 ? `(${openCount})` : ""}
          </Button>
          <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => setFilter("all")}>
            All
          </Button>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : rows.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">
          <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-emerald-500" />
          No mismatches — your AI replies are matching the catalog cleanly.
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <Card key={r.id} className="p-4 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={r.mismatch_type === "price" ? "destructive" : "secondary"}>
                    {r.mismatch_type === "price" ? "Wrong price quoted" : "Low confidence"}
                  </Badge>
                  {r.matched_product_name && (
                    <span className="text-sm font-medium">{r.matched_product_name}</span>
                  )}
                  {r.confidence != null && (
                    <span className="text-xs text-muted-foreground">
                      confidence: {(Number(r.confidence) * 100).toFixed(0)}%
                    </span>
                  )}
                  {r.from_number && (
                    <span className="text-xs text-muted-foreground">from {r.from_number}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleString()}
                  </span>
                  {!r.resolved && (
                    <Button size="sm" variant="outline" onClick={() => markResolved(r.id)}>
                      Mark resolved
                    </Button>
                  )}
                </div>
              </div>

              {r.mismatch_type === "price" && (
                <div className="text-sm bg-muted/50 rounded p-2">
                  <span className="text-red-500 font-medium">Quoted: ৳{r.quoted_price ?? "?"}</span>
                  {" → "}
                  <span className="text-emerald-600 font-medium">Catalog: ৳{r.catalog_price ?? "?"}</span>
                  <span className="text-muted-foreground"> (auto-corrected in reply)</span>
                </div>
              )}

              {r.customer_text && (
                <div className="text-sm">
                  <div className="text-xs text-muted-foreground mb-1">Customer said:</div>
                  <div className="bg-muted/30 rounded p-2 whitespace-pre-wrap">{r.customer_text}</div>
                </div>
              )}
              {r.ai_reply && (
                <div className="text-sm">
                  <div className="text-xs text-muted-foreground mb-1">AI reply (before correction):</div>
                  <div className="bg-muted/30 rounded p-2 whitespace-pre-wrap">{r.ai_reply}</div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
