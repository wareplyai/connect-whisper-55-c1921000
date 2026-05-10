import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Trash2, Upload, ImageIcon } from "lucide-react";

type Item = {
  id: string;
  product_name: string;
  product_price: string | null;
  product_description: string | null;
  product_image_url: string;
  image_hash: string | null;
  created_at: string;
};

const MAX = 50;

// Average-hash matching the backend implementation: sample 64 bytes
// uniformly from the file and threshold each by the mean.
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
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [desc, setDesc] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("product_images" as any)
      .select("*")
      .order("created_at", { ascending: false });
    setItems((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

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

  return (
    <div className="space-y-6 p-4">
      <div>
        <h1 className="text-2xl font-bold">Product Image Recognition</h1>
        <p className="text-sm text-muted-foreground">
          Upload products. When customers send a matching photo on WhatsApp, the bot replies with details automatically. ({items.length}/{MAX})
        </p>
      </div>

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
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((p) => (
              <Card key={p.id} className="p-3 space-y-2">
                <img
                  src={p.product_image_url}
                  alt={p.product_name}
                  className="w-full h-40 object-cover rounded-md bg-muted"
                  onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                />
                <div className="font-semibold">{p.product_name}</div>
                {p.product_price && <div className="text-sm text-primary">{p.product_price}</div>}
                {p.product_description && (
                  <div className="text-xs text-muted-foreground line-clamp-2">{p.product_description}</div>
                )}
                <div className="text-[10px] text-muted-foreground font-mono truncate">
                  hash: {p.image_hash || "—"}
                </div>
                <Button variant="destructive" size="sm" className="w-full" onClick={() => handleDelete(p.id)}>
                  <Trash2 className="h-3 w-3 mr-1" /> Delete
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
