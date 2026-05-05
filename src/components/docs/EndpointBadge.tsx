import { cn } from "@/lib/utils";
import type { HttpMethod } from "@/docs/endpoints";

const styles: Record<HttpMethod, string> = {
  POST: "bg-primary/10 text-primary border-primary/70",
  GET: "bg-info/10 text-info border-info/70",
  PUT: "bg-warning/10 text-warning border-warning/70",
  DELETE: "bg-destructive/10 text-destructive border-destructive/70",
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
