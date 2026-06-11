// One-off repair: re-decrypt chat-media images that were stored encrypted.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function sniff(b: Uint8Array): string | null {
  if (b.length < 4) return null;
  if (b[0] === 0xff && b[1] === 0xd8) return "image/jpeg";
  if (b[0] === 0x89 && b[1] === 0x50) return "image/png";
  return null;
}

Deno.serve(async (_req) => {
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: rows } = await admin
    .from("incoming_messages")
    .select("id, image_url, raw_payload")
    .eq("message_type", "image")
    .gt("received_at", new Date(Date.now() - 7 * 86400_000).toISOString())
    .order("received_at", { ascending: false })
    .limit(50);
  const results: any[] = [];
  for (const row of rows || []) {
    try {
      const im = (row.raw_payload as any)?.imageMessage;
      const encUrl = im?.url;
      const mediaKeyB64 = im?.mediaKey;
      const stored = String(row.image_url || "");
      const marker = "/storage/v1/object/public/chat-media/";
      if (!encUrl || !mediaKeyB64 || !stored.includes(marker)) continue;
      const path = decodeURIComponent(stored.split(marker)[1]);
      // Check if stored object is already a valid image
      const dl = await admin.storage.from("chat-media").download(path);
      if (dl.data) {
        const head = new Uint8Array(await dl.data.slice(0, 4).arrayBuffer());
        if (sniff(head)) { results.push({ id: row.id, status: "already-ok" }); continue; }
      }
      const r = await fetch(encUrl);
      if (!r.ok) { results.push({ id: row.id, status: `fetch-${r.status}` }); continue; }
      const enc = new Uint8Array(await r.arrayBuffer());
      const mediaKey = Uint8Array.from(atob(mediaKeyB64), (c) => c.charCodeAt(0));
      const baseKey = await crypto.subtle.importKey("raw", mediaKey, "HKDF", false, ["deriveBits"]);
      const expanded = new Uint8Array(await crypto.subtle.deriveBits(
        { name: "HKDF", hash: "SHA-256", salt: new Uint8Array(32), info: new TextEncoder().encode("WhatsApp Image Keys") },
        baseKey, 112 * 8,
      ));
      const iv = expanded.slice(0, 16);
      const key = await crypto.subtle.importKey("raw", expanded.slice(16, 48), { name: "AES-CBC" }, false, ["decrypt"]);
      const plain = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-CBC", iv }, key, enc.slice(0, enc.length - 10)));
      const mime = sniff(plain);
      if (!mime) { results.push({ id: row.id, status: "decrypt-invalid" }); continue; }
      const { error: upErr } = await admin.storage.from("chat-media").upload(path, plain, { contentType: mime, upsert: true });
      results.push({ id: row.id, status: upErr ? `upload-fail: ${upErr.message}` : "repaired", mime, len: plain.length });
    } catch (e) {
      results.push({ id: row.id, status: `error: ${(e as Error)?.message}` });
    }
  }
  return new Response(JSON.stringify({ results }, null, 2), { headers: { "Content-Type": "application/json" } });
});
