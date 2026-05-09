import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Trash2, Upload, ImagePlus, ExternalLink } from "lucide-react";

type Ad = {
  id: string;
  image_url: string;
  link_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
};

export default function DashboardAds() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("dashboard_ads" as any)
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setAds((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const onUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `ads/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("dashboard-ads")
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("dashboard-ads").getPublicUrl(path);
      const { error: insErr } = await supabase.from("dashboard_ads" as any).insert({
        image_url: pub.publicUrl,
        link_url: linkUrl.trim() || null,
        is_active: true,
        sort_order: ads.length,
      });
      if (insErr) throw insErr;
      toast.success("Ad uploaded");
      setLinkUrl("");
      if (fileRef.current) fileRef.current.value = "";
      load();
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const toggle = async (id: string, is_active: boolean) => {
    const { error } = await supabase.from("dashboard_ads" as any).update({ is_active }).eq("id", id);
    if (error) toast.error(error.message);
    else load();
  };

  const updateLink = async (id: string, link_url: string) => {
    const { error } = await supabase.from("dashboard_ads" as any).update({ link_url: link_url.trim() || null }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Link updated"); load(); }
  };

  const remove = async (ad: Ad) => {
    if (!confirm("Delete this ad?")) return;
    const path = ad.image_url.split("/dashboard-ads/")[1];
    if (path) await supabase.storage.from("dashboard-ads").remove([path]);
    const { error } = await supabase.from("dashboard_ads" as any).delete().eq("id", ad.id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); load(); }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard Ads</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Banner ads shown on every user's dashboard hero. Recommended size: <b>320 × 120 px</b>. Multiple active ads will rotate automatically.
        </p>
      </div>

      <Card className="p-5 bg-card border-border">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <ImagePlus className="h-4 w-4" /> Upload New Ad
        </h3>
        <div className="grid gap-4">
          <div>
            <Label>Click-through URL (optional)</Label>
            <Input
              placeholder="https://example.com/promo"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
            />
          </div>
          <div>
            <Label>Image (recommended 320×120 px)</Label>
            <div className="mt-1 flex items-center gap-3">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); }}
                className="hidden"
              />
              <Button onClick={() => fileRef.current?.click()} disabled={uploading}>
                <Upload className="h-4 w-4 mr-2" />
                {uploading ? "Uploading..." : "Choose & Upload"}
              </Button>
              <span className="text-xs text-muted-foreground">PNG/JPG, auto-fits the banner space.</span>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-5 bg-card border-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">All Ads ({ads.length})</h3>
          <p className="text-xs text-muted-foreground">{ads.filter(a => a.is_active).length} active</p>
        </div>
        {loading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Loading...</p>
        ) : ads.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No ads yet — upload one above.</p>
        ) : (
          <div className="space-y-3">
            {ads.map((ad) => (
              <AdRow key={ad.id} ad={ad} onToggle={toggle} onUpdateLink={updateLink} onDelete={() => remove(ad)} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function AdRow({
  ad, onToggle, onUpdateLink, onDelete,
}: {
  ad: Ad;
  onToggle: (id: string, v: boolean) => void;
  onUpdateLink: (id: string, v: string) => void;
  onDelete: () => void;
}) {
  const [link, setLink] = useState(ad.link_url || "");
  const dirty = link !== (ad.link_url || "");
  return (
    <div className="flex flex-col md:flex-row gap-4 items-start md:items-center p-3 rounded-lg border border-border bg-background/40">
      <img
        src={ad.image_url}
        alt=""
        className="h-[60px] w-[160px] object-cover rounded-md border border-border bg-black/20"
      />
      <div className="flex-1 min-w-0 grid gap-2">
        <div className="flex items-center gap-2">
          <Input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="Click-through URL (optional)"
            className="h-8 text-xs"
          />
          {dirty && (
            <Button size="sm" variant="outline" onClick={() => onUpdateLink(ad.id, link)}>Save</Button>
          )}
          {ad.link_url && (
            <a href={ad.link_url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground">
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground">
          Created {new Date(ad.created_at).toLocaleDateString()}
        </p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <Switch checked={ad.is_active} onCheckedChange={(v) => onToggle(ad.id, v)} />
          <span className="text-xs text-muted-foreground">{ad.is_active ? "Live" : "Off"}</span>
        </div>
        <Button size="icon" variant="ghost" onClick={onDelete} className="text-destructive hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
