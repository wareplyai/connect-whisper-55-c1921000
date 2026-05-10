import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Trash2, Upload, ImageIcon, Sparkles, BarChart3, Camera, Bot, MessageSquare, ArrowRight, Zap, Plus } from "lucide-react";

function HowItWorksHero() {
  const Step = ({ icon: Icon, label, color }: any) => (
    <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 shadow-sm">
      <div className={`h-7 w-7 rounded-full flex items-center justify-center ${color}`}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <span className="text-xs font-medium whitespace-nowrap">{label}</span>
    </div>
  );
  return (
    <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-r from-primary/5 via-background to-primary/10">
      <div className="absolute -top-8 -left-8 h-24 w-24 rounded-full bg-primary/10 blur-2xl animate-pulse pointer-events-none" />
      <div className="absolute -bottom-8 -right-8 h-24 w-24 rounded-full bg-primary/10 blur-2xl animate-pulse [animation-delay:1s] pointer-events-none" />
      <div className="relative px-4 py-3 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <Zap className="h-4 w-4 text-primary animate-pulse" />
          <span className="text-sm font-semibold">How it works:</span>
        </div>
        <Step icon={Camera} label="Customer sends photo" color="bg-green-500/15 text-green-500" />
        <ArrowRight className="h-4 w-4 text-primary animate-pulse" />
        <Step icon={Bot} label="AI matches catalog" color="bg-primary/15 text-primary" />
        <ArrowRight className="h-4 w-4 text-primary animate-pulse" />
        <Step icon={MessageSquare} label="Bot auto-replies with details" color="bg-blue-500/15 text-blue-500" />
      </div>
    </Card>
  );
}

type Item = {
  id: string;
  product_name: string;
  product_price: string | null;
  product_description: string | null;
  product_image_url: string;
  image_hash: string | null;
  created_at: string;
};

type LogRow = {
  id: string;
  customer_phone: string | null;
  query_image_url: string | null;
  matched_product_id: string | null;
  matched_product_name: string | null;
  match_confidence: string | null;
  matched: boolean;
  created_at: string;
};

const MAX = 50;

async function hashFromFile(file: File): Promise<string> {
  const buf = new Uint8Array(await file.arrayBuffer());
  const sample = 64;
  const step = Math.max(1, Math.floor(buf.length / sample));
  const px: number[] = [];
  for (let i = 0; i < sample; i++) px.push(buf[i * step] || 0);
  const avg = px.reduce((a, b) => a + b, 0) / px.length;
  return px.map((p) => (p > avg ? "1" : "0")).join("");
}

export default function ProductImageMatch() {
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [desc, setDesc] = useState("");
  const [file, setFile] = useState<File | null>(null);

  // Test tab
  const [testFile, setTestFile] = useState<File | null>(null);
  const [testUrl, setTestUrl] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [testPreview, setTestPreview] = useState<string>("");

  // Analytics
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [dateFilter, setDateFilter] = useState<"today" | "week" | "month" | "all">("all");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("product_images" as any)
      .select("*")
      .order("created_at", { ascending: false });
    setItems((data as any) || []);
    setLoading(false);
  };

  const loadLogs = async () => {
    setLogsLoading(true);
    let q = supabase.from("image_match_logs" as any).select("*").order("created_at", { ascending: false }).limit(500);
    if (dateFilter !== "all") {
      const since = new Date();
      if (dateFilter === "today") since.setHours(0, 0, 0, 0);
      else if (dateFilter === "week") since.setDate(since.getDate() - 7);
      else if (dateFilter === "month") since.setDate(since.getDate() - 30);
      q = q.gte("created_at", since.toISOString());
    }
    const { data } = await q;
    setLogs((data as any) || []);
    setLogsLoading(false);
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { loadLogs(); }, [dateFilter]);

  const reset = () => { setName(""); setPrice(""); setDesc(""); setFile(null); };

  const handleUpload = async () => {
    if (!user) return;
    if (!name.trim()) return toast.error("Product name required");
    if (!file) return toast.error("Image required");
    if (items.length >= MAX) return toast.error(`Max ${MAX} products allowed`);

    setSaving(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("product-images")
        .upload(path, file, { upsert: false, contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("product-images").getPublicUrl(path);
      const image_url = pub.publicUrl;
      const hash = await hashFromFile(file);

      const { error: insErr } = await supabase
        .from("product_images" as any)
        .insert({
          user_id: user.id,
          product_name: name.trim(),
          product_price: price.trim() || null,
          product_description: desc.trim() || null,
          product_image_url: image_url,
          image_hash: hash,
        } as any);
      if (insErr) throw insErr;

      toast.success("Product added");
      reset();
      load();
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    const { error } = await supabase.from("product_images" as any).delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  const runTest = async () => {
    if (!user) return;
    setTestResult(null);
    let url = testUrl.trim();
    let preview = url;

    setTesting(true);
    try {
      if (testFile) {
        const ext = testFile.name.split(".").pop() || "jpg";
        const path = `${user.id}/test-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("product-images")
          .upload(path, testFile, { upsert: false, contentType: testFile.type });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("product-images").getPublicUrl(path);
        url = pub.publicUrl;
        preview = url;
      }
      if (!url) {
        toast.error("Upload an image or paste URL");
        setTesting(false);
        return;
      }
      setTestPreview(preview);
      const { data, error } = await supabase.functions.invoke("match-product-image", {
        body: { image_url: url, user_id: user.id },
      });
      if (error) throw error;
      setTestResult(data);
      loadLogs();
    } catch (e: any) {
      toast.error(e.message || "Test failed");
    } finally {
      setTesting(false);
    }
  };

  const stats = useMemo(() => {
    const total = logs.length;
    const matched = logs.filter((l) => l.matched).length;
    const rate = total ? Math.round((matched / total) * 100) : 0;
    const counts = new Map<string, { name: string; image: string | null; count: number }>();
    logs.forEach((l) => {
      if (!l.matched || !l.matched_product_id) return;
      const cur = counts.get(l.matched_product_id);
      const item = items.find((i) => i.id === l.matched_product_id);
      if (cur) cur.count++;
      else counts.set(l.matched_product_id, {
        name: l.matched_product_name || item?.product_name || "Unknown",
        image: item?.product_image_url || null,
        count: 1,
      });
    });
    const top = Array.from(counts.values()).sort((a, b) => b.count - a.count).slice(0, 5);
    return { total, matched, rate, top };
  }, [logs, items]);

  return (
    <div className="space-y-6 p-4">
      <HowItWorksHero />

      <div>
        <h1 className="text-2xl font-bold">Product Image Recognition</h1>
        <p className="text-sm text-muted-foreground">
          Upload products. When customers send a matching photo on WhatsApp, the bot replies with details automatically.
        </p>
      </div>

      <Tabs defaultValue="products">
        <TabsList>
          <TabsTrigger value="products"><ImageIcon className="h-4 w-4 mr-1" /> Products ({items.length}/{MAX})</TabsTrigger>
          <TabsTrigger value="test"><Sparkles className="h-4 w-4 mr-1" /> Test Match</TabsTrigger>
          <TabsTrigger value="analytics"><BarChart3 className="h-4 w-4 mr-1" /> Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-4">
          <Card className="p-4 space-y-4">
            <h2 className="font-semibold">Add Product</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Product Name *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Red Cotton T-Shirt" />
              </div>
              <div>
                <Label>Price</Label>
                <Input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="৳ 499" />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="100% cotton, sizes S-XL..." rows={3} />
            </div>
            <div>
              <Label>Product Image *</Label>
              <Input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </div>
            <Button onClick={handleUpload} disabled={saving || items.length >= MAX}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              Upload Product
            </Button>
          </Card>

          <div>
            <h2 className="font-semibold mb-3">Your Products</h2>
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : items.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground">
                <ImageIcon className="h-10 w-10 mx-auto mb-2 opacity-40" />
                No products yet
              </Card>
            ) : (
              <div className="space-y-2">
                {items.map((p) => (
                  <Card key={p.id} className="p-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={p.product_image_url}
                        alt={p.product_name}
                        className="w-20 h-20 rounded object-cover flex-shrink-0 bg-muted"
                        onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-semibold truncate">{p.product_name}</div>
                            {p.product_description && (
                              <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{p.product_description}</p>
                            )}
                            <div className="mt-1">
                              <Badge variant="secondary" className="text-[10px]">Image Match Active</Badge>
                            </div>
                          </div>
                          {p.product_price && (
                            <div className="font-bold whitespace-nowrap text-primary">{p.product_price}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <Button variant="destructive" size="sm" onClick={() => handleDelete(p.id)}>
                          <Trash2 className="h-3 w-3 mr-1" /> Delete
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="test" className="space-y-4">
          <Card className="p-4 space-y-4">
            <h2 className="font-semibold">Test Image Matching</h2>
            <p className="text-xs text-muted-foreground">Upload a customer-style photo or paste an image URL. The matcher runs against your product catalog.</p>
            <div>
              <Label>Upload image</Label>
              <Input type="file" accept="image/*" onChange={(e) => { setTestFile(e.target.files?.[0] || null); setTestUrl(""); }} />
            </div>
            <div className="text-xs text-muted-foreground">— or —</div>
            <div>
              <Label>Image URL</Label>
              <Input value={testUrl} onChange={(e) => { setTestUrl(e.target.value); setTestFile(null); }} placeholder="https://..." />
            </div>
            <Button onClick={runTest} disabled={testing || (!testFile && !testUrl.trim())}>
              {testing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Test Match
            </Button>
          </Card>

          {testResult && (
            <Card className="p-4 space-y-3">
              <h3 className="font-semibold">Result</h3>
              {testResult.match ? (
                <>
                  <div className="flex items-center gap-2">
                    <Badge variant="default">Matched</Badge>
                    <Badge variant="secondary">Confidence: {testResult.confidence}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Your photo</div>
                      {testPreview && <img src={testPreview} className="w-full h-48 object-cover rounded border" />}
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Matched product</div>
                      {testResult.product?.image_url && <img src={testResult.product.image_url} className="w-full h-48 object-cover rounded border" />}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="font-semibold">{testResult.product?.name}</div>
                    {testResult.product?.price && <div className="text-sm text-primary">{testResult.product.price}</div>}
                    {testResult.product?.description && <div className="text-sm text-muted-foreground">{testResult.product.description}</div>}
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <Badge variant="destructive">No product matched</Badge>
                  {testResult.reason && <div className="text-xs text-muted-foreground">Reason: {testResult.reason}</div>}
                  {testResult.confidence && <div className="text-xs text-muted-foreground">Confidence: {testResult.confidence}</div>}
                  {testPreview && <img src={testPreview} className="w-48 h-48 object-cover rounded border" />}
                </div>
              )}
            </Card>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {(["today", "week", "month", "all"] as const).map((d) => (
              <Button key={d} size="sm" variant={dateFilter === d ? "default" : "outline"} onClick={() => setDateFilter(d)}>
                {d === "all" ? "All time" : d === "today" ? "Today" : d === "week" ? "Last 7 days" : "Last 30 days"}
              </Button>
            ))}
            <Button size="sm" variant="ghost" onClick={loadLogs}>Refresh</Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Card className="p-4">
              <div className="text-xs text-muted-foreground">Total queries</div>
              <div className="text-2xl font-bold">{stats.total}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-muted-foreground">Matched</div>
              <div className="text-2xl font-bold">{stats.matched}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-muted-foreground">Match rate</div>
              <div className="text-2xl font-bold">{stats.rate}%</div>
            </Card>
          </div>

          <Card className="p-4">
            <h3 className="font-semibold mb-3">Top 5 matched products</h3>
            {stats.top.length === 0 ? (
              <p className="text-sm text-muted-foreground">No matches yet.</p>
            ) : (
              <div className="space-y-2">
                {stats.top.map((t, i) => (
                  <div key={i} className="flex items-center gap-3">
                    {t.image ? (
                      <img src={t.image} className="w-12 h-12 object-cover rounded border" />
                    ) : (
                      <div className="w-12 h-12 bg-muted rounded border flex items-center justify-center"><ImageIcon className="h-4 w-4 opacity-40" /></div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{t.name}</div>
                    </div>
                    <Badge>{t.count}</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-4">
            <h3 className="font-semibold mb-3">Recent queries (last 20)</h3>
            {logsLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : logs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No queries yet.</p>
            ) : (
              <div className="space-y-2">
                {logs.slice(0, 20).map((l) => (
                  <div key={l.id} className="flex items-center gap-3 text-sm border-b pb-2 last:border-0">
                    {l.query_image_url ? (
                      <img src={l.query_image_url} className="w-10 h-10 object-cover rounded border" />
                    ) : (
                      <div className="w-10 h-10 bg-muted rounded" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="truncate">{l.matched ? l.matched_product_name || "—" : <span className="text-muted-foreground">No match</span>}</div>
                      <div className="text-xs text-muted-foreground">
                        {l.customer_phone || "test"} · {new Date(l.created_at).toLocaleString()}
                      </div>
                    </div>
                    <Badge variant={l.matched ? "default" : "secondary"}>{l.match_confidence || (l.matched ? "match" : "no")}</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
