import { cn } from "@/lib/utils";
import type { HttpMethod } from "@/docs/endpoints";

const styles: Record<HttpMethod, string> = {
  POST: "bg-[#1a4731] text-[#25d366] border-[#25d366]",
  GET: "bg-[#0d3249] text-[#58a6ff] border-[#58a6ff]",
  PUT: "bg-[#3d2b00] text-[#d29922] border-[#d29922]",
  DELETE: "bg-[#3d1212] text-[#f85149] border-[#f85149]",
};

export function EndpointBadge({ method, className }: { method: HttpMethod; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-md border px-2.5 py-1 text-xs font-bold uppercase tracking-wide font-mono",
        styles[method],
        className,
      )}
    >
      {method}
    </span>
  );
}
