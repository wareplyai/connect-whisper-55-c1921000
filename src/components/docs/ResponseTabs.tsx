import { useState } from "react";
import { CopyButton } from "./CopyButton";
import { cn } from "@/lib/utils";
import type { ResponseExample } from "@/docs/endpoints";

export function ResponseTabs({ responses }: { responses: ResponseExample[] }) {
  const [active, setActive] = useState(0);
  const current = responses[active];
  if (!current) return null;
  return (
    <div className="my-5 overflow-hidden rounded-lg border bg-[#1c2128]">
      <div className="flex items-center justify-between border-b bg-card-elevated/40">
        <div className="flex w-full overflow-x-auto">
          {responses.map((r, i) => (
            <button
              key={r.label + i}
              onClick={() => setActive(i)}
              className={cn(
                "shrink-0 gap-2 px-3 py-2 text-xs font-medium transition-colors",
                i === active
                  ? "border-b-2 border-[#25d366] text-foreground"
                  : "border-b-2 border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <span
                className={cn(
                  "mr-1.5 inline-block h-1.5 w-1.5 rounded-full",
                  r.status === "success" ? "bg-[#25d366]" : r.status === "error" ? "bg-[#f85149]" : "bg-muted-foreground",
                )}
              />
              {r.label}
            </button>
          ))}
        </div>
        <CopyButton text={current.body} className="mr-2 shrink-0" />
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed text-[#e6edf3]">
        <code>{current.body}</code>
      </pre>
    </div>
  );
}
