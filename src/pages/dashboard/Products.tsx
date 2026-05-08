import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Trash2, RefreshCw, Upload } from "lucide-react";

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

export default function Products() {
  const { user } = useAuth();
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    price: "",
    description: "",
    category: "",
    stock: "",
  });
  const [file, setFile] = useState<File | null>(null);

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

      // Trigger auto-tagging (non-blocking)
      const productId = (inserted as any)?.id;
      if (productId) {
        supabase.functions.invoke("tag-product-image", { body: { productId } }).then(({ error }) => {
          if (error) toast.error("Auto-tag failed: " + error.message);
          else { toast.success("AI tags generated"); load(); }
        });
      }

      toast.success("Product added — AI tagging in background");
      reset();
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Products</h1>
        <p className="text-sm text-muted-foreground">
          Upload product images. AI will auto-tag them so customers can find them by sending a photo on WhatsApp.
        </p>
      </div>

      <Card className="p-4 space-y-3">
        <h2 className="font-semibold">Add product</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label>Name *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>Price</Label>
            <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          </div>
          <div>
            <Label>Category</Label>
            <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          </div>
          <div>
            <Label>Stock</Label>
            <Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
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
        <Button onClick={handleCreate} disabled={saving}>
          {saving ? <Loader2 className="size-4 animate-spin mr-2" /> : <Upload className="size-4 mr-2" />}
          Add product
        </Button>
      </Card>

      <div className="space-y-3">
        <h2 className="font-semibold">Your products ({items.length})</h2>
        {loading ? (
          <Loader2 className="animate-spin" />
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No products yet.</p>
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
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline" onClick={() => retag(p)}>
                      <RefreshCw className="size-3 mr-1" /> Re-tag
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(p)}>
                      <Trash2 className="size-3 mr-1" /> Delete
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
