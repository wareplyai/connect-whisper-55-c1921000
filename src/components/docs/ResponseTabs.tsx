import { useState } from "react";
import { CopyButton } from "./CopyButton";
import { cn } from "@/lib/utils";
import type { ResponseExample } from "@/docs/endpoints";

export function ResponseTabs({ responses }: { responses: ResponseExample[] }) {
  const [active, setActive] = useState(0);
  const current = responses[active];
  if (!current) return null;
  return (
    <div className="my-5 overflow-hidden rounded-lg border bg-code">
      <div className="flex items-center justify-between border-b border-code-muted/20 bg-code">
        <div className="flex w-full overflow-x-auto">
          {responses.map((r, i) => (
            <button
              key={r.label + i}
              onClick={() => setActive(i)}
              className={cn(
                "shrink-0 gap-2 px-3 py-2 text-xs font-medium transition-colors",
                i === active
                  ? "border-b-2 border-primary text-code-foreground"
                  : "border-b-2 border-transparent text-code-muted hover:text-code-foreground",
              )}
            >
              <span
                className={cn(
                  "mr-1.5 inline-block h-1.5 w-1.5 rounded-full",
                  r.status === "success" ? "bg-success" : r.status === "error" ? "bg-destructive" : "bg-code-muted",
                )}
              />
              {r.label}
            </button>
          ))}
        </div>
        <CopyButton text={current.body} className="mr-2 shrink-0 text-code-muted hover:text-code-foreground" />
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed text-code-foreground">
        <code>{current.body}</code>
      </pre>
    </div>
  );
}
