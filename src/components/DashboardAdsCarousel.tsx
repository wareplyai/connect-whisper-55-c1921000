import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Ad = { id: string; image_url: string; link_url: string | null };

export const DashboardAdsCarousel = () => {
  const [ads, setAds] = useState<Ad[]>([]);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("dashboard_ads" as any)
        .select("id,image_url,link_url")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      setAds((data as any) || []);
    };
    load();
    const ch = supabase
      .channel("dashboard-ads-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "dashboard_ads" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  useEffect(() => {
    if (ads.length <= 1) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % ads.length), 5000);
    return () => clearInterval(t);
  }, [ads.length]);

  if (ads.length === 0) return null;
  const ad = ads[idx % ads.length];

  const inner = (
    <img
      src={ad.image_url}
      alt="Sponsored"
      className="h-[120px] w-[320px] object-cover"
      loading="lazy"
    />
  );

  return (
    <div className="hidden lg:block relative w-[320px] h-[120px] rounded-xl overflow-hidden border border-emerald-400/20 bg-black/20 shadow-[0_8px_30px_-10px_hsl(142_70%_30%/0.5)] group">
      {ad.link_url ? (
        <a
          href={/^https?:\/\//i.test(ad.link_url) ? ad.link_url : `https://${ad.link_url}`}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          {inner}
        </a>
      ) : inner}
      <span className="absolute top-1.5 left-1.5 text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-black/60 text-emerald-200/90 backdrop-blur-sm">
        Ad
      </span>
      {ads.length > 1 && (
        <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1">
          {ads.map((_, i) => (
            <span
              key={i}
              className={`h-1 rounded-full transition-all ${i === idx % ads.length ? "w-4 bg-emerald-300" : "w-1 bg-white/40"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};
