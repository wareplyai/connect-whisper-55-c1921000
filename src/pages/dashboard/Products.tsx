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
import { Loader2, Trash2, RefreshCw, Upload, Pencil, LayoutGrid, List, Plus, Camera, FileSpreadsheet, Download, Check, X } from "lucide-react";

type CsvRow = { name: string; price: string; description: string; category: string; stock: string; image_url: string };

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
  const ni = idx("name"), pi = idx("price"), di = idx("description"), ci = idx("category"), si = idx("stock"), ii = idx("image_url");
  return rows.slice(1).filter((r) => r.some((v) => v.trim())).map((r) => ({
    name: (r[ni] || "").trim(),
    price: (r[pi] || "").trim(),
    description: (r[di] || "").trim(),
    category: (r[ci] || "").trim(),
    stock: (r[si] || "").trim(),
    image_url: (r[ii] || "").trim(),
  }));
}

const IMAGE_MATCH_MAX = 50;

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
  price: number;
  description: string | null;
  category: string | null;
  stock: number;
  image_url: string | null;
  image_path: string | null;
  ai_tags: string | null;
  ai_tags_status: string;
  is_active: boolean;
  created_at: string;
};

type EditState = {
  open: boolean;
  product: Product | null;
  name: string;
  price: string;
  description: string;
  category: string;
  stock: string;
  file: File | null;
};

export default function Products() {
  const { user } = useAuth();
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<"list" | "grid">("list");
  const [form, setForm] = useState({
    name: "",
    price: "",
    description: "",
    category: "",
    stock: "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [edit, setEdit] = useState<EditState>({
    open: false, product: null, name: "", price: "", description: "", category: "", stock: "", file: null,
  });
  const [editSaving, setEditSaving] = useState(false);

  // CSV import
  const [csvOpen, setCsvOpen] = useState(false);
  const [csvRows, setCsvRows] = useState<CsvRow[]>([]);
  const [csvImporting, setCsvImporting] = useState(false);
  const [matchStatus, setMatchStatus] = useState<Record<string, "loading" | "success" | "error">>({});
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

  const reset = () => {
    setForm({ name: "", price: "", description: "", category: "", stock: "" });
    setFile(null);
  };

  const handleCreate = async () => {
    if (!user) return;
    if (!form.name.trim()) return toast.error("Name required");
    if (!file) return toast.error("Image required");
    setSaving(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("product-images").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("product-images").getPublicUrl(path);

      const { data: inserted, error: insErr } = await supabase
        .from("products" as any)
        .insert({
          user_id: user.id,
          name: form.name.trim(),
          price: Number(form.price) || 0,
          description: form.description.trim() || null,
          category: form.category.trim() || null,
          stock: Number(form.stock) || 0,
          image_url: pub.publicUrl,
          image_path: path,
        })
        .select("id")
        .single();
      if (insErr) throw insErr;

      const productId = (inserted as any)?.id;
      if (productId) {
        supabase.functions.invoke("tag-product-image", { body: { productId } }).then(({ error }) => {
          if (error) toast.error("Auto-tag failed: " + error.message);
          else { load(); }
        });
        // Auto add to Image Match silently
        autoAddToImageMatch({
          id: productId,
          name: form.name.trim(),
          price: Number(form.price) || 0,
          description: form.description.trim() || null,
          image_url: pub.publicUrl,
        }).then(() => load()).catch(() => {});
      }

      toast.success("Product added — AI tagging & Image Match in background");
      reset();
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
    if (p.image_path) {
      await supabase.storage.from("product-images").remove([p.image_path]);
    }
    await supabase.from("products" as any).delete().eq("id", p.id);
    toast.success("Deleted");
    load();
  };

  const retag = async (p: Product) => {
    const { error } = await supabase.functions.invoke("tag-product-image", { body: { productId: p.id } });
    if (error) toast.error(error.message);
    else { toast.success("Re-tagged"); load(); }
  };

  const openEdit = (p: Product) => {
    setEdit({
      open: true,
      product: p,
      name: p.name,
      price: String(p.price ?? ""),
      description: p.description ?? "",
      category: p.category ?? "",
      stock: String(p.stock ?? ""),
      file: null,
    });
  };

  const saveEdit = async () => {
    if (!user || !edit.product) return;
    if (!edit.name.trim()) return toast.error("Name required");
    setEditSaving(true);
    try {
      let image_url = edit.product.image_url;
      let image_path = edit.product.image_path;
      let imageChanged = false;

      if (edit.file) {
        const ext = edit.file.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("product-images").upload(path, edit.file, {
          cacheControl: "3600",
          upsert: false,
        });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("product-images").getPublicUrl(path);
        // remove old
        if (image_path) {
          await supabase.storage.from("product-images").remove([image_path]);
        }
        image_url = pub.publicUrl;
        image_path = path;
        imageChanged = true;
      }

      const { error: updErr } = await supabase
        .from("products" as any)
        .update({
          name: edit.name.trim(),
          price: Number(edit.price) || 0,
          description: edit.description.trim() || null,
          category: edit.category.trim() || null,
          stock: Number(edit.stock) || 0,
          image_url,
          image_path,
          ...(imageChanged ? { ai_tags_status: "pending", ai_tags: null } : {}),
        })
        .eq("id", edit.product.id);
      if (updErr) throw updErr;

      if (imageChanged) {
        supabase.functions.invoke("tag-product-image", { body: { productId: edit.product.id } }).then(({ error }) => {
          if (error) toast.error("Auto-tag failed: " + error.message);
          else { load(); }
        });
      }
      // Always re-sync to Image Match (name/price/desc/image may have changed)
      autoAddToImageMatch({
        id: edit.product.id,
        name: edit.name.trim(),
        price: Number(edit.price) || 0,
        description: edit.description.trim() || null,
        image_url,
      }).catch(() => {});

      toast.success("Product updated");
      setEdit({ ...edit, open: false });
      load();
    } catch (e: any) {
      toast.error(e.message || "Failed");
    } finally {
      setEditSaving(false);
    }
  };

  const setMatchStatusFor = (id: string, s: "loading" | "success" | "error" | null) => {
    setMatchStatus((prev) => {
      const next = { ...prev };
      if (s === null) delete next[id]; else next[id] = s;
      return next;
    });
  };

  const autoAddToImageMatch = async (p: { id: string; name: string; price: number; description: string | null; image_url: string | null }) => {
    if (!user || !p.image_url) return;
    try {
      const { data: existing } = await supabase
        .from("product_images" as any)
        .select("id")
        .eq("user_id", user.id)
        .eq("product_name", p.name)
        .maybeSingle();

      const hash = await hashFromUrl(p.image_url);
      const payload: any = {
        product_name: p.name,
        product_price: p.price ? String(p.price) : null,
        product_description: p.description || null,
        product_image_url: p.image_url,
        image_hash: hash,
      };

      if (existing) {
        await supabase.from("product_images" as any).update(payload).eq("id", (existing as any).id);
      } else {
        const { count } = await supabase
          .from("product_images" as any)
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id);
        if ((count || 0) >= IMAGE_MATCH_MAX) {
          toast.error(`Image Match limit reached (${IMAGE_MATCH_MAX}). Contact admin to increase.`);
          return;
        }
        await supabase.from("product_images" as any).insert({ user_id: user.id, ...payload });
      }
    } catch (e: any) {
      console.error("auto image match failed", e);
    }
  };

  const addToImageMatch = async (p: Product) => {
    setMatchStatusFor(p.id, "loading");
    try {
      await autoAddToImageMatch(p);
      setMatchStatusFor(p.id, "success");
      toast.success("Synced to Image Match");
      setTimeout(() => setMatchStatusFor(p.id, null), 2000);
    } catch (e: any) {
      setMatchStatusFor(p.id, "error");
      toast.error(e.message || "Failed");
      setTimeout(() => setMatchStatusFor(p.id, null), 2000);
    }
  };

  const ProductActions = ({ p }: { p: Product }) => (
    <div className="flex gap-2 flex-wrap">
      <Button size="sm" variant="outline" onClick={() => openEdit(p)}>
        <Pencil className="size-3 mr-1" /> Edit
      </Button>
      {(() => {
        const s = matchStatus[p.id];
        return (
          <Button
            size="sm"
            variant="outline"
            disabled={s === "loading"}
            onClick={() => addToImageMatch(p)}
            className={s === "success" ? "border-green-500 text-green-600" : s === "error" ? "border-red-500 text-red-600" : ""}
          >
            {s === "loading" ? (<><Loader2 className="size-3 mr-1 animate-spin" /> Adding…</>)
              : s === "success" ? (<><Check className="size-3 mr-1" /> Added!</>)
              : s === "error" ? (<><X className="size-3 mr-1" /> Failed</>)
              : (<><Camera className="size-3 mr-1" /> Add to Image Match</>)}
          </Button>
        );
      })()}
      <Button size="sm" variant="outline" onClick={() => retag(p)}>
        <RefreshCw className="size-3 mr-1" /> Re-tag
      </Button>
      <Button size="sm" variant="destructive" onClick={() => handleDelete(p)}>
        <Trash2 className="size-3 mr-1" /> Delete
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Products</h1>
          <p className="text-sm text-muted-foreground">
            Upload product images. AI will auto-tag them so customers can find them by sending a photo on WhatsApp.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setCsvRows([]); setCsvOpen(true); }}>
            <FileSpreadsheet className="size-4 mr-2" /> Import CSV
          </Button>
          <Button onClick={() => { reset(); setAddOpen(true); }}>
            <Plus className="size-4 mr-2" /> New product
          </Button>
        </div>
      </div>

      <Dialog open={addOpen} onOpenChange={(o) => { setAddOpen(o); if (!o) reset(); }}>
        <DialogContent className="max-w-lg">
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
            <div className="md:col-span-2">
              <Label>Image *</Label>
              <Input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
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
            <Button
              size="sm"
              variant={view === "list" ? "secondary" : "ghost"}
              onClick={() => setView("list")}
              className="h-8"
            >
              <List className="size-4 mr-1" /> List
            </Button>
            <Button
              size="sm"
              variant={view === "grid" ? "secondary" : "ghost"}
              onClick={() => setView("grid")}
              className="h-8"
            >
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
                  {p.image_url && (
                    <img src={p.image_url} alt={p.name} className="w-20 h-20 rounded object-cover flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{p.name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {p.category || "—"} · Stock: {p.stock}
                        </div>
                        {p.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{p.description}</p>
                        )}
                        <div className="flex items-center gap-2 flex-wrap mt-1">
                          <Badge variant={p.ai_tags_status === "ready" ? "default" : "secondary"} className="text-[10px]">
                            AI: {p.ai_tags_status}
                          </Badge>
                          {p.ai_tags && p.ai_tags_status === "ready" && (
                            <span className="text-[10px] text-muted-foreground line-clamp-1">{p.ai_tags}</span>
                          )}
                        </div>
                      </div>
                      <div className="font-bold whitespace-nowrap">{p.price}</div>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
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
                {p.image_url && (
                  <img src={p.image_url} alt={p.name} className="w-full h-40 object-cover" />
                )}
                <div className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold">{p.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {p.category || "—"} · Stock: {p.stock}
                      </div>
                    </div>
                    <div className="font-bold">{p.price}</div>
                  </div>
                  {p.description && <p className="text-xs text-muted-foreground line-clamp-2">{p.description}</p>}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={p.ai_tags_status === "ready" ? "default" : "secondary"}>
                      AI: {p.ai_tags_status}
                    </Badge>
                  </div>
                  {p.ai_tags && p.ai_tags_status === "ready" && (
                    <p className="text-xs text-muted-foreground line-clamp-2"><b>Tags:</b> {p.ai_tags}</p>
                  )}
                  <div className="pt-2">
                    <ProductActions p={p} />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={edit.open} onOpenChange={(o) => setEdit({ ...edit, open: o })}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit product</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <Label>Name *</Label>
              <Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
            </div>
            <div>
              <Label>Price</Label>
              <Input type="number" value={edit.price} onChange={(e) => setEdit({ ...edit, price: e.target.value })} />
            </div>
            <div>
              <Label>Stock</Label>
              <Input type="number" value={edit.stock} onChange={(e) => setEdit({ ...edit, stock: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <Label>Category</Label>
              <Input value={edit.category} onChange={(e) => setEdit({ ...edit, category: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <Label>Description</Label>
              <Textarea rows={2} value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <Label>Replace image (optional)</Label>
              <Input type="file" accept="image/*" onChange={(e) => setEdit({ ...edit, file: e.target.files?.[0] || null })} />
              {edit.product?.image_url && !edit.file && (
                <img src={edit.product.image_url} alt="current" className="mt-2 w-24 h-24 object-cover rounded border" />
              )}
              {edit.file && (
                <p className="text-xs text-muted-foreground mt-1">New image will replace current and AI tags will regenerate.</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEdit({ ...edit, open: false })} disabled={editSaving}>Cancel</Button>
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
              <span className="text-xs text-muted-foreground">
                Columns: name, price, description, category, stock, image_url
              </span>
            </div>
            <Input type="file" accept=".csv,text/csv" onChange={(e) => handleCsvFile(e.target.files?.[0] || null)} />
            {csvRows.length > 0 && (
              <div className="border rounded-md max-h-72 overflow-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="text-left p-2">Name</th>
                      <th className="text-left p-2">Price</th>
                      <th className="text-left p-2">Category</th>
                      <th className="text-left p-2">Stock</th>
                      <th className="text-left p-2">Image</th>
                    </tr>
                  </thead>
                  <tbody>
                    {csvRows.slice(0, 100).map((r, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-2">{r.name}</td>
                        <td className="p-2">{r.price}</td>
                        <td className="p-2">{r.category}</td>
                        <td className="p-2">{r.stock}</td>
                        <td className="p-2 truncate max-w-[200px]">{r.image_url}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {csvRows.length > 100 && (
                  <div className="p-2 text-xs text-muted-foreground">+ {csvRows.length - 100} more rows</div>
                )}
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
