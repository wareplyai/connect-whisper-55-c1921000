import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { Loader2, Trash2, Upload, Pencil, LayoutGrid, List, Plus, Camera, Image as ImageIcon, FileSpreadsheet, Download, Info } from "lucide-react";

type CsvRow = { name: string; sku: string; price: string; description: string; category: string; stock: string; image_url: string };

function parseCsv(text: string): CsvRow[] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQ = false;
      else field += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ",") { cur.push(field); field = ""; }
      else if (c === "\n" || c === "\r") {
        if (field !== "" || cur.length) { cur.push(field); rows.push(cur); cur = []; field = ""; }
        if (c === "\r" && text[i + 1] === "\n") i++;
      } else field += c;
    }
  }
  if (field !== "" || cur.length) { cur.push(field); rows.push(cur); }
  if (rows.length < 2) return [];
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const idx = (k: string) => header.indexOf(k);
  const ni = idx("name"), ski = idx("sku"), pi = idx("price"), di = idx("description"), ci = idx("category"), si = idx("stock"), ii = idx("image_url");
  return rows.slice(1).filter((r) => r.some((v) => v.trim())).map((r) => ({
    name: (r[ni] || "").trim(),
    sku: (ski >= 0 ? (r[ski] || "") : "").trim(),
    price: (r[pi] || "").trim(),
    description: (r[di] || "").trim(),
    category: (r[ci] || "").trim(),
    stock: (r[si] || "").trim(),
    image_url: (r[ii] || "").trim(),
  }));
}

const PRODUCT_MAX = 10;
const MATCH_MAX = 2;
const REAL_MAX = 2;

async function hashFromUrl(url: string): Promise<string> {
  const res = await fetch(url);
  const ab = await res.arrayBuffer();
  const buf = new Uint8Array(ab);
  const sample = 64;
  const step = Math.max(1, Math.floor(buf.length / sample));
  const px: number[] = [];
  for (let i = 0; i < sample; i++) px.push(buf[i * step] || 0);
  const avg = px.reduce((a, b) => a + b, 0) / px.length;
  return px.map((p) => (p > avg ? "1" : "0")).join("");
}

type Product = {
  id: string;
  name: string;
  sku: string | null;
  price: number;
  description: string | null;
  category: string | null;
  stock: number;
  image_url: string | null;
  image_path: string | null;
  match_image_urls: string[] | null;
  match_image_paths: string[] | null;
  real_image_urls: string[] | null;
  real_image_paths: string[] | null;
  ai_tags: string | null;
  ai_tags_status: string;
  is_active: boolean;
  created_at: string;
};

type FormState = {
  name: string;
  sku: string;
  price: string;
  description: string;
  category: string;
  stock: string;
  matchFiles: (File | null)[];   // length 2
  realFiles: (File | null)[];    // length 2
};

const emptyForm = (): FormState => ({
  name: "", sku: "", price: "", description: "", category: "", stock: "",
  matchFiles: [null, null],
  realFiles: [null, null],
});

export default function Products() {
  const { user } = useAuth();
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<"list" | "grid">("list");
  const [form, setForm] = useState<FormState>(emptyForm());
  const [addOpen, setAddOpen] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [editForm, setEditForm] = useState<FormState>(emptyForm());
  const [editSaving, setEditSaving] = useState(false);

  // CSV import
  const [csvOpen, setCsvOpen] = useState(false);
  const [csvRows, setCsvRows] = useState<CsvRow[]>([]);
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvProgress, setCsvProgress] = useState(0);

  const handleCsvFile = async (f: File | null) => {
    if (!f) return;
    const text = await f.text();
    const rows = parseCsv(text).filter((r) => r.name);
    if (!rows.length) return toast.error("No rows found in CSV");
    setCsvRows(rows);
  };

  const downloadSampleCsv = () => {
    const sample = `name,price,description,category,stock,image_url
"T-Shirt Red",499,"100% cotton t-shirt","Clothing",100,"https://example.com/red.jpg"
"Blue Mug",250,"Ceramic 350ml","Home",50,"https://example.com/mug.jpg"
`;
    const blob = new Blob([sample], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "products-sample.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const importCsv = async () => {
    if (!user || !csvRows.length) return;
    if (items.length + csvRows.length > PRODUCT_MAX) {
      return toast.error(`Limit is ${PRODUCT_MAX} products. You have ${items.length} and tried to import ${csvRows.length}.`);
    }
    setCsvImporting(true);
    setCsvProgress(0);
    let imported = 0;
    let skipped = 0;
    try {
      const existingNames = new Set(items.map((i) => i.name.trim().toLowerCase()));
      for (let i = 0; i < csvRows.length; i++) {
        const r = csvRows[i];
        const key = r.name.trim().toLowerCase();
        if (existingNames.has(key)) { skipped++; }
        else {
          const { error } = await supabase.from("products" as any).insert({
            user_id: user.id,
            name: r.name.trim(),
            price: Number(r.price) || 0,
            description: r.description || null,
            category: r.category || null,
            stock: Number(r.stock) || 0,
            image_url: r.image_url || null,
            match_image_urls: r.image_url ? [r.image_url] : [],
          });
          if (!error) { imported++; existingNames.add(key); }
          else skipped++;
        }
        setCsvProgress(Math.round(((i + 1) / csvRows.length) * 100));
      }
      toast.success(`${imported} products imported${skipped ? `, ${skipped} skipped` : ""}`);
      setCsvOpen(false);
      setCsvRows([]);
      load();
    } catch (e: any) {
      toast.error(e.message || "Import failed");
    } finally {
      setCsvImporting(false);
    }
  };

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("products" as any)
      .select("*")
      .order("created_at", { ascending: false });
    setItems((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const uploadOne = async (f: File): Promise<{ url: string; path: string }> => {
    const ext = f.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user!.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, f, { cacheControl: "3600", upsert: false });
    if (error) throw error;
    const { data: pub } = supabase.storage.from("product-images").getPublicUrl(path);
    return { url: pub.publicUrl, path };
  };

  const handleCreate = async () => {
    if (!user) return;
    if (!form.name.trim()) return toast.error("Name required");
    const matchFiles = form.matchFiles.filter(Boolean) as File[];
    const realFiles = form.realFiles.filter(Boolean) as File[];
    if (matchFiles.length === 0) return toast.error("At least 1 match image required");
    if (items.length >= PRODUCT_MAX) return toast.error(`You have reached the ${PRODUCT_MAX}-product limit. Delete one or contact admin.`);

    setSaving(true);
    try {
      const matchUploads = await Promise.all(matchFiles.map(uploadOne));
      const realUploads = await Promise.all(realFiles.map(uploadOne));

      const match_image_urls = matchUploads.map((m) => m.url);
      const match_image_paths = matchUploads.map((m) => m.path);
      const real_image_urls = realUploads.map((m) => m.url);
      const real_image_paths = realUploads.map((m) => m.path);

      const primary = matchUploads[0];

      const { data: inserted, error: insErr } = await supabase
        .from("products" as any)
        .insert({
          user_id: user.id,
          name: form.name.trim(),
          price: Number(form.price) || 0,
          description: form.description.trim() || null,
          category: form.category.trim() || null,
          stock: Number(form.stock) || 0,
          image_url: primary.url,
          image_path: primary.path,
          match_image_urls,
          match_image_paths,
          real_image_urls,
          real_image_paths,
        })
        .select("id")
        .single();
      if (insErr) throw insErr;

      const productId = (inserted as any)?.id;
      if (productId) {
        supabase.functions.invoke("tag-product-image", { body: { productId } }).then(({ error }) => {
          if (error) console.warn("Auto-tag skipped:", error.message);
          else load();
        });
        syncImageMatch(form.name.trim(), Number(form.price) || 0, form.description.trim() || null, match_image_urls).catch(() => {});
      }

      toast.success("Product added — AI tagging in background");
      setForm(emptyForm());
      setAddOpen(false);
      load();
    } catch (e: any) {
      toast.error(e.message || "Failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (p: Product) => {
    if (!confirm(`Delete "${p.name}"?`)) return;
    const allPaths = [
      ...(p.match_image_paths || []),
      ...(p.real_image_paths || []),
      ...(p.image_path && !(p.match_image_paths || []).includes(p.image_path) ? [p.image_path] : []),
    ];
    if (allPaths.length) await supabase.storage.from("product-images").remove(allPaths);
    if (user) {
      await supabase.from("product_images" as any).delete().eq("user_id", user.id).eq("product_name", p.name);
    }
    await supabase.from("products" as any).delete().eq("id", p.id);
    toast.success("Deleted");
    load();
  };

  const openEdit = (p: Product) => {
    setEditProduct(p);
    setEditForm({
      name: p.name,
      price: String(p.price ?? ""),
      description: p.description ?? "",
      category: p.category ?? "",
      stock: String(p.stock ?? ""),
      matchFiles: [null, null],
      realFiles: [null, null],
    });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!user || !editProduct) return;
    if (!editForm.name.trim()) return toast.error("Name required");
    setEditSaving(true);
    try {
      const updates: any = {
        name: editForm.name.trim(),
        price: Number(editForm.price) || 0,
        description: editForm.description.trim() || null,
        category: editForm.category.trim() || null,
        stock: Number(editForm.stock) || 0,
      };

      const newMatch = editForm.matchFiles.filter(Boolean) as File[];
      const newReal = editForm.realFiles.filter(Boolean) as File[];

      let imageChanged = false;
      let matchUrlsForSync: string[] | null = null;

      if (newMatch.length) {
        const old = editProduct.match_image_paths || [];
        if (old.length) await supabase.storage.from("product-images").remove(old);
        const ups = await Promise.all(newMatch.map(uploadOne));
        updates.match_image_urls = ups.map((u) => u.url);
        updates.match_image_paths = ups.map((u) => u.path);
        updates.image_url = ups[0].url;
        updates.image_path = ups[0].path;
        updates.ai_tags_status = "pending";
        updates.ai_tags = null;
        imageChanged = true;
        matchUrlsForSync = updates.match_image_urls;
      }

      if (newReal.length) {
        const old = editProduct.real_image_paths || [];
        if (old.length) await supabase.storage.from("product-images").remove(old);
        const ups = await Promise.all(newReal.map(uploadOne));
        updates.real_image_urls = ups.map((u) => u.url);
        updates.real_image_paths = ups.map((u) => u.path);
      }

      const { error: updErr } = await supabase.from("products" as any).update(updates).eq("id", editProduct.id);
      if (updErr) throw updErr;

      if (imageChanged) {
        supabase.functions.invoke("tag-product-image", { body: { productId: editProduct.id } }).then(({ error }) => {
          if (error) console.warn("Auto-tag skipped:", error.message);
          else load();
        });
      }
      syncImageMatch(
        updates.name,
        updates.price,
        updates.description,
        matchUrlsForSync || editProduct.match_image_urls || (editProduct.image_url ? [editProduct.image_url] : []),
      ).catch(() => {});

      toast.success("Product updated");
      setEditOpen(false);
      load();
    } catch (e: any) {
      toast.error(e.message || "Failed");
    } finally {
      setEditSaving(false);
    }
  };

  // Sync all match images for a product into product_images (one row per image)
  const syncImageMatch = async (name: string, price: number, description: string | null, matchUrls: string[]) => {
    if (!user || !matchUrls?.length) return;
    await supabase.from("product_images" as any).delete().eq("user_id", user.id).eq("product_name", name);
    for (const url of matchUrls) {
      try {
        const hash = await hashFromUrl(url);
        await supabase.from("product_images" as any).insert({
          user_id: user.id,
          product_name: name,
          product_price: price ? String(price) : null,
          product_description: description || null,
          product_image_url: url,
          image_hash: hash,
        });
      } catch (e) {
        console.error("syncImageMatch row failed", e);
      }
    }
  };

  const FileSlot = ({ value, onChange, label }: { value: File | null; onChange: (f: File | null) => void; label: string }) => (
    <div>
      <Input type="file" accept="image/*" onChange={(e) => onChange(e.target.files?.[0] || null)} />
      {value && <p className="text-[11px] text-muted-foreground mt-1 truncate">✓ {value.name}</p>}
      {!value && <p className="text-[11px] text-muted-foreground mt-1">{label}</p>}
    </div>
  );

  const ProductActions = ({ p }: { p: Product }) => (
    <div className="flex gap-2 flex-wrap">
      <Button size="sm" variant="outline" onClick={() => openEdit(p)}>
        <Pencil className="size-3 mr-1" /> Edit
      </Button>
      <Button size="sm" variant="destructive" onClick={() => handleDelete(p)}>
        <Trash2 className="size-3 mr-1" /> Delete
      </Button>
    </div>
  );

  const atLimit = items.length >= PRODUCT_MAX;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Products</h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Upload up to <b>{PRODUCT_MAX} products</b>. For each product you can add{" "}
            <b>{MATCH_MAX} match images</b> (used to recognize photos customers send on WhatsApp) and{" "}
            <b>{REAL_MAX} real images</b> (sent to the customer when they ask for the product photo).
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setCsvRows([]); setCsvOpen(true); }} disabled={atLimit}>
            <FileSpreadsheet className="size-4 mr-2" /> Import CSV
          </Button>
          <Button onClick={() => { setForm(emptyForm()); setAddOpen(true); }} disabled={atLimit}>
            <Plus className="size-4 mr-2" /> New product
          </Button>
        </div>
      </div>

      <Card className="p-3 flex items-center gap-3 bg-muted/40">
        <Info className="size-4 text-muted-foreground flex-shrink-0" />
        <div className="text-sm flex-1">
          <b>{items.length} / {PRODUCT_MAX}</b> products used.{" "}
          {atLimit && <span className="text-destructive">Limit reached — delete a product or contact admin to increase.</span>}
        </div>
        <Progress value={(items.length / PRODUCT_MAX) * 100} className="w-32 h-2" />
      </Card>

      <Dialog open={addOpen} onOpenChange={(o) => { setAddOpen(o); if (!o) setForm(emptyForm()); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add product</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Price</Label>
              <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            </div>
            <div>
              <Label>Stock</Label>
              <Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <Label>Category</Label>
              <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <Label>Description</Label>
              <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>

            <div className="md:col-span-2 border rounded-lg p-3 space-y-2 bg-muted/30">
              <div className="flex items-center gap-2">
                <Camera className="size-4 text-primary" />
                <Label className="text-sm font-semibold">Match images (max {MATCH_MAX}) *</Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Used to <b>recognize</b> photos customers send. Upload the same image style customers usually share (e.g. the image you posted on your website / Facebook).
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {[0, 1].map((i) => (
                  <FileSlot
                    key={i}
                    value={form.matchFiles[i]}
                    onChange={(f) => {
                      const next = [...form.matchFiles]; next[i] = f; setForm({ ...form, matchFiles: next });
                    }}
                    label={i === 0 ? "Match image #1 (required)" : "Match image #2 (optional)"}
                  />
                ))}
              </div>
            </div>

            <div className="md:col-span-2 border rounded-lg p-3 space-y-2 bg-muted/30">
              <div className="flex items-center gap-2">
                <ImageIcon className="size-4 text-primary" />
                <Label className="text-sm font-semibold">Real product images (max {REAL_MAX})</Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Sent to the customer when they ask for the <b>real product photo</b>. Upload your high-quality product photos here.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {[0, 1].map((i) => (
                  <FileSlot
                    key={i}
                    value={form.realFiles[i]}
                    onChange={(f) => {
                      const next = [...form.realFiles]; next[i] = f; setForm({ ...form, realFiles: next });
                    }}
                    label={`Real image #${i + 1} (optional)`}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin mr-2" /> : <Upload className="size-4 mr-2" />}
              Add product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold">Your products ({items.length})</h2>
          <div className="inline-flex rounded-md border bg-background p-0.5">
            <Button size="sm" variant={view === "list" ? "secondary" : "ghost"} onClick={() => setView("list")} className="h-8">
              <List className="size-4 mr-1" /> List
            </Button>
            <Button size="sm" variant={view === "grid" ? "secondary" : "ghost"} onClick={() => setView("grid")} className="h-8">
              <LayoutGrid className="size-4 mr-1" /> Grid
            </Button>
          </div>
        </div>

        {loading ? (
          <Loader2 className="animate-spin" />
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No products yet.</p>
        ) : view === "list" ? (
          <div className="space-y-2">
            {items.map((p) => (
              <Card key={p.id} className="p-3">
                <div className="flex items-center gap-3">
                  {p.image_url && <img src={p.image_url} alt={p.name} className="w-20 h-20 rounded object-cover flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{p.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{p.category || "—"} · Stock: {p.stock}</div>
                    {p.description && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{p.description}</p>}
                    <div className="flex items-center gap-2 flex-wrap mt-1">
                      <Badge variant={p.ai_tags_status === "ready" ? "default" : "secondary"} className="text-[10px]">
                        AI: {p.ai_tags_status}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] gap-1">
                        <Camera className="size-3" /> Match: {(p.match_image_urls || []).length}/{MATCH_MAX}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] gap-1">
                        <ImageIcon className="size-3" /> Real: {(p.real_image_urls || []).length}/{REAL_MAX}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex-shrink-0 flex flex-col items-end gap-2">
                    <div className="font-bold whitespace-nowrap text-primary">৳{p.price}</div>
                    <ProductActions p={p} />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((p) => (
              <Card key={p.id} className="overflow-hidden">
                {p.image_url && <img src={p.image_url} alt={p.name} className="w-full h-40 object-cover" />}
                <div className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold">{p.name}</div>
                      <div className="text-sm text-muted-foreground">{p.category || "—"} · Stock: {p.stock}</div>
                    </div>
                    <div className="font-bold">৳{p.price}</div>
                  </div>
                  {p.description && <p className="text-xs text-muted-foreground line-clamp-2">{p.description}</p>}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={p.ai_tags_status === "ready" ? "default" : "secondary"} className="text-[10px]">AI: {p.ai_tags_status}</Badge>
                    <Badge variant="outline" className="text-[10px]"><Camera className="size-3 mr-1" />{(p.match_image_urls || []).length}/{MATCH_MAX}</Badge>
                    <Badge variant="outline" className="text-[10px]"><ImageIcon className="size-3 mr-1" />{(p.real_image_urls || []).length}/{REAL_MAX}</Badge>
                  </div>
                  <div className="pt-2"><ProductActions p={p} /></div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit product</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <Label>Name *</Label>
              <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            </div>
            <div>
              <Label>Price</Label>
              <Input type="number" value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: e.target.value })} />
            </div>
            <div>
              <Label>Stock</Label>
              <Input type="number" value={editForm.stock} onChange={(e) => setEditForm({ ...editForm, stock: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <Label>Category</Label>
              <Input value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <Label>Description</Label>
              <Textarea rows={2} value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
            </div>

            <div className="md:col-span-2 border rounded-lg p-3 space-y-2 bg-muted/30">
              <div className="flex items-center gap-2">
                <Camera className="size-4 text-primary" />
                <Label className="text-sm font-semibold">Match images (current: {(editProduct?.match_image_urls || []).length}/{MATCH_MAX})</Label>
              </div>
              {(editProduct?.match_image_urls || []).length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {(editProduct?.match_image_urls || []).map((u, i) => (
                    <img key={i} src={u} className="w-16 h-16 rounded object-cover border" />
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">Upload new files to <b>replace all</b> match images. Leave empty to keep current.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {[0, 1].map((i) => (
                  <FileSlot
                    key={i}
                    value={editForm.matchFiles[i]}
                    onChange={(f) => { const next = [...editForm.matchFiles]; next[i] = f; setEditForm({ ...editForm, matchFiles: next }); }}
                    label={`Replace match #${i + 1}`}
                  />
                ))}
              </div>
            </div>

            <div className="md:col-span-2 border rounded-lg p-3 space-y-2 bg-muted/30">
              <div className="flex items-center gap-2">
                <ImageIcon className="size-4 text-primary" />
                <Label className="text-sm font-semibold">Real images (current: {(editProduct?.real_image_urls || []).length}/{REAL_MAX})</Label>
              </div>
              {(editProduct?.real_image_urls || []).length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {(editProduct?.real_image_urls || []).map((u, i) => (
                    <img key={i} src={u} className="w-16 h-16 rounded object-cover border" />
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">Upload new files to <b>replace all</b> real images. Leave empty to keep current.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {[0, 1].map((i) => (
                  <FileSlot
                    key={i}
                    value={editForm.realFiles[i]}
                    onChange={(f) => { const next = [...editForm.realFiles]; next[i] = f; setEditForm({ ...editForm, realFiles: next }); }}
                    label={`Replace real #${i + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={editSaving}>Cancel</Button>
            <Button onClick={saveEdit} disabled={editSaving}>
              {editSaving && <Loader2 className="size-4 animate-spin mr-2" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={csvOpen} onOpenChange={(o) => { if (!csvImporting) setCsvOpen(o); }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Import products from CSV</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={downloadSampleCsv}>
                <Download className="size-4 mr-1" /> Download sample CSV
              </Button>
              <span className="text-xs text-muted-foreground">Columns: name, price, description, category, stock, image_url</span>
            </div>
            <Input type="file" accept=".csv,text/csv" onChange={(e) => handleCsvFile(e.target.files?.[0] || null)} />
            {csvRows.length > 0 && (
              <div className="border rounded-md max-h-72 overflow-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="text-left p-2">Name</th><th className="text-left p-2">Price</th>
                      <th className="text-left p-2">Category</th><th className="text-left p-2">Stock</th>
                      <th className="text-left p-2">Image</th>
                    </tr>
                  </thead>
                  <tbody>
                    {csvRows.slice(0, 100).map((r, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-2">{r.name}</td><td className="p-2">{r.price}</td>
                        <td className="p-2">{r.category}</td><td className="p-2">{r.stock}</td>
                        <td className="p-2 truncate max-w-[200px]">{r.image_url}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {csvRows.length > 100 && <div className="p-2 text-xs text-muted-foreground">+ {csvRows.length - 100} more rows</div>}
              </div>
            )}
            {csvImporting && <Progress value={csvProgress} />}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCsvOpen(false)} disabled={csvImporting}>Cancel</Button>
            <Button onClick={importCsv} disabled={csvImporting || !csvRows.length}>
              {csvImporting ? <Loader2 className="size-4 animate-spin mr-2" /> : <Upload className="size-4 mr-2" />}
              Import {csvRows.length} products
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
