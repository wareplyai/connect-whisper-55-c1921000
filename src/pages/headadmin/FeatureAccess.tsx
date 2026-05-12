import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Bot, MessageSquareText, Search, ShoppingBag, ShoppingBasket, Package, ShoppingCart, Image as ImageIcon, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

type FeatureKey = "ai_agent" | "auto_replies" | "abandoned_cart" | "ecommerce" | "products" | "product_image_match" | "woocommerce" | "behavior";
const FEATURES: { key: FeatureKey; label: string; icon: any }[] = [
  { key: "ai_agent", label: "AI Agent", icon: Bot },
  { key: "auto_replies", label: "Auto-Replies", icon: MessageSquareText },
  { key: "abandoned_cart", label: "Incomplete", icon: ShoppingBag },
  { key: "ecommerce", label: "E-Commerce", icon: ShoppingBasket },
  { key: "products", label: "Products", icon: Package },
  { key: "product_image_match", label: "Image Match", icon: ImageIcon },
  { key: "woocommerce", label: "WooCommerce", icon: ShoppingCart },
  { key: "behavior", label: "Behavior", icon: ShieldCheck },
];

const DEFAULT_GLOBALS: Record<FeatureKey, boolean> = { ai_agent: true, auto_replies: true, abandoned_cart: true, ecommerce: true, products: true, product_image_match: true, woocommerce: true, behavior: true };

export default function FeatureAccess() {
  const [globals, setGlobals] = useState<Record<FeatureKey, boolean>>({ ...DEFAULT_GLOBALS });
  const [users, setUsers] = useState<any[]>([]);
  const [overrides, setOverrides] = useState<Record<string, Partial<Record<FeatureKey, boolean>>>>({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [{ data: g }, { data: u }, { data: o }] = await Promise.all([
      supabase.from("global_feature_settings" as any).select("feature, show_to_users"),
      supabase.from("profiles").select("id, full_name, email, plan").order("created_at", { ascending: false }),
      supabase.from("user_feature_access" as any).select("user_id, feature, enabled"),
    ]);
    const gMap: any = { ...DEFAULT_GLOBALS };
    (g || []).forEach((r: any) => { gMap[r.feature] = !!r.show_to_users; });
    setGlobals(gMap);
    setUsers(u || []);
    const oMap: Record<string, any> = {};
    (o || []).forEach((r: any) => {
      oMap[r.user_id] = oMap[r.user_id] || {};
      oMap[r.user_id][r.feature] = r.enabled;
    });
    setOverrides(oMap);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleGlobal = async (feature: FeatureKey, value: boolean) => {
    setGlobals((g) => ({ ...g, [feature]: value }));
    const { error } = await supabase
      .from("global_feature_settings" as any)
      .upsert({ feature, show_to_users: value, updated_at: new Date().toISOString() });
    if (error) { toast.error(error.message); load(); return; }
    toast.success(`${feature} ${value ? "enabled" : "disabled"} globally`);
  };

  const effective = (userId: string, feature: FeatureKey) => {
    const o = overrides[userId]?.[feature];
    if (typeof o === "boolean") return o;
    return globals[feature];
  };

  const setUserAccess = async (userId: string, feature: FeatureKey, value: boolean) => {
    setOverrides((prev) => ({ ...prev, [userId]: { ...(prev[userId] || {}), [feature]: value } }));
    const { error } = await supabase
      .from("user_feature_access" as any)
      .upsert({ user_id: userId, feature, enabled: value, updated_at: new Date().toISOString() }, { onConflict: "user_id,feature" });
    if (error) { toast.error(error.message); load(); return; }
    toast.success(`${feature} ${value ? "granted to" : "revoked from"} user`);
  };

  const clearOverride = async (userId: string, feature: FeatureKey) => {
    const { error } = await supabase
      .from("user_feature_access" as any)
      .delete()
      .eq("user_id", userId)
      .eq("feature", feature);
    if (error) { toast.error(error.message); return; }
    setOverrides((prev) => {
      const next = { ...prev };
      if (next[userId]) { delete next[userId][feature]; }
      return next;
    });
    toast.success("Reset to global default");
  };

  const filtered = users.filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return `${u.full_name || ""} ${u.email || ""}`.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Feature Access Control</h1>
        <p className="text-sm text-muted-foreground">Control AI Agent & Auto-Replies visibility globally and per-user.</p>
      </div>

      <Card className="p-5 bg-card border-border">
        <h2 className="text-sm font-semibold mb-1">Global Defaults</h2>
        <p className="text-xs text-muted-foreground mb-4">Show these features to ALL users by default.</p>
        <div className="grid gap-3 md:grid-cols-2">
          {FEATURES.map((f) => (
            <div key={f.key} className="flex items-center justify-between p-4 rounded-lg border border-border bg-card-elevated">
              <div className="flex items-center gap-3">
                <f.icon className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">{f.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {globals[f.key] ? "Visible to all users" : "Hidden from all users"}
                  </p>
                </div>
              </div>
              <Switch checked={globals[f.key]} onCheckedChange={(v) => toggleGlobal(f.key, v)} />
            </div>
          ))}
        </div>
      </Card>

      <Card className="bg-card border-border">
        <div className="p-5 border-b border-border flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-sm font-semibold">Per-User Overrides</h2>
            <p className="text-xs text-muted-foreground">Grant or revoke access for specific users.</p>
          </div>
          <div className="relative w-64">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="divide-y divide-border">
          {loading && <div className="p-6 text-center text-sm text-muted-foreground">Loading...</div>}
          {!loading && filtered.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">No users</div>}
          {filtered.map((u) => (
            <div key={u.id} className="p-4 flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-3 flex-1 min-w-[220px]">
                <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                  {(u.full_name || u.email || "?").slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium">{u.full_name || "—"}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </div>
                <Badge variant="outline" className="capitalize">{u.plan}</Badge>
              </div>
              {FEATURES.map((f) => {
                const has = overrides[u.id]?.[f.key];
                const isOverride = typeof has === "boolean";
                const value = effective(u.id, f.key);
                return (
                  <div key={f.key} className="flex items-center gap-2 min-w-[180px]">
                    <f.icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs flex-1">{f.label}</span>
                    <Switch checked={value} onCheckedChange={(v) => setUserAccess(u.id, f.key, v)} />
                    {isOverride && (
                      <button
                        className="text-[10px] text-muted-foreground hover:text-foreground underline"
                        onClick={() => clearOverride(u.id, f.key)}
                        title="Reset to global default"
                      >
                        reset
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
