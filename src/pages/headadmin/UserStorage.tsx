import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { HardDrive, Trash2, RefreshCw, Image as ImageIcon, Package, MessageSquare, Search } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Row = {
  user_id: string;
  email: string;
  full_name: string | null;
  plan: string | null;
  chat_media_bytes: number;
  chat_media_count: number;
  product_images_bytes: number;
  product_images_count: number;
  total_bytes: number;
  products_total: number;
  products_woo: number;
  products_manual: number;
  image_match_count: number;
  incoming_total: number;
  incoming_media: number;
};

const fmtBytes = (n: number) => {
  if (!n) return "0 B";
  const u = ["B", "KB", "MB", "GB"];
  let i = 0; let v = n;
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v >= 100 ? 0 : 1)} ${u[i]}`;
};

const SCOPES: { key: string; label: string; danger?: boolean }[] = [
  { key: "chat_media", label: "Chat media (storage)" },
  { key: "product_images_storage", label: "Product images (storage)" },
  { key: "image_match_logs", label: "Image match logs" },
  { key: "products_woo", label: "Products (WooCommerce)" },
  { key: "products_manual", label: "Products (manual)" },
  { key: "products_all", label: "All products" },
  { key: "incoming_media", label: "Incoming media messages" },
  { key: "all", label: "Everything above", danger: true },
];

export default function UserStorage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("headadmin-user-storage", { body: { action: "list" } });
    if (error) toast.error(error.message);
    setRows(data?.rows || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (user_id: string, scope: string) => {
    setBusy(`${user_id}:${scope}`);
    const { data, error } = await supabase.functions.invoke("headadmin-user-storage", { body: { action: "delete", user_id, scope } });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success(`Deleted: ${JSON.stringify(data?.result || {})}`);
    load();
  };

  const filtered = rows.filter(r =>
    !q || (r.email || "").toLowerCase().includes(q.toLowerCase()) || (r.full_name || "").toLowerCase().includes(q.toLowerCase())
  );

  const totals = rows.reduce((acc, r) => ({
    bytes: acc.bytes + r.total_bytes,
    products: acc.products + r.products_total,
    matches: acc.matches + r.image_match_count,
    media: acc.media + r.incoming_media,
  }), { bytes: 0, products: 0, matches: 0, media: 0 });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">User Storage & Usage</h1>
          <p className="text-sm text-muted-foreground">Per-user storage, product, and inbox media usage. Delete history to free Supabase storage.</p>
        </div>
        <Button onClick={load} variant="outline" size="sm"><RefreshCw className="h-4 w-4 mr-2" />Refresh</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat icon={HardDrive} label="Total storage" value={fmtBytes(totals.bytes)} />
        <Stat icon={Package} label="Products" value={totals.products} />
        <Stat icon={ImageIcon} label="Image matches" value={totals.matches} />
        <Stat icon={MessageSquare} label="Inbox media" value={totals.media} />
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="p-4 border-b border-border flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search user by name or email..." value={q} onChange={(e) => setQ(e.target.value)} className="border-0 focus-visible:ring-0 h-8" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground bg-muted/30">
              <tr>
                <th className="text-left px-4 py-2.5">User</th>
                <th className="text-right">Total</th>
                <th className="text-right">Chat media</th>
                <th className="text-right">Product imgs</th>
                <th className="text-right">Products (woo / manual)</th>
                <th className="text-right">Img matches</th>
                <th className="text-right">Inbox media</th>
                <th className="text-right pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={8} className="text-center py-10 text-muted-foreground">Loading...</td></tr>}
              {!loading && filtered.length === 0 && <tr><td colSpan={8} className="text-center py-10 text-muted-foreground">No users</td></tr>}
              {filtered.map(r => (
                <tr key={r.user_id} className="border-t border-border hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <div className="font-medium">{r.full_name || "—"}</div>
                    <div className="text-xs text-muted-foreground">{r.email}</div>
                  </td>
                  <td className="text-right font-semibold">{fmtBytes(r.total_bytes)}</td>
                  <td className="text-right">{fmtBytes(r.chat_media_bytes)}<div className="text-[10px] text-muted-foreground">{r.chat_media_count} files</div></td>
                  <td className="text-right">{fmtBytes(r.product_images_bytes)}<div className="text-[10px] text-muted-foreground">{r.product_images_count} files</div></td>
                  <td className="text-right">{r.products_woo} / {r.products_manual}</td>
                  <td className="text-right">{r.image_match_count}</td>
                  <td className="text-right">{r.incoming_media}<div className="text-[10px] text-muted-foreground">/ {r.incoming_total}</div></td>
                  <td className="text-right pr-4">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="outline"><Trash2 className="h-3.5 w-3.5 mr-1" />Cleanup</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete data for {r.email}</AlertDialogTitle>
                          <AlertDialogDescription>Choose what to delete. This cannot be undone.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="grid gap-2 py-2">
                          {SCOPES.map(s => (
                            <button
                              key={s.key}
                              disabled={busy === `${r.user_id}:${s.key}`}
                              onClick={() => handleDelete(r.user_id, s.key)}
                              className={`flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm hover:bg-muted/40 disabled:opacity-50 ${s.danger ? "border-destructive/40 text-destructive" : ""}`}
                            >
                              <span>{s.label}</span>
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          ))}
                        </div>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Close</AlertDialogCancel>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const Stat = ({ icon: Icon, label, value }: any) => (
  <div className="rounded-xl border border-border bg-card p-4">
    <div className="flex items-center justify-between mb-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </div>
    <p className="text-xl font-bold">{value}</p>
  </div>
);
