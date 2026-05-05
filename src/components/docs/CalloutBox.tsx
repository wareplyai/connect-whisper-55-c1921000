import { Info, AlertTriangle, AlertOctagon, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type CalloutType = "note" | "important" | "warning" | "tip";

const config: Record<CalloutType, { icon: typeof Info; cls: string; title: string }> = {
  note: { icon: Info, cls: "border-l-info bg-info/10 text-info", title: "Note" },
  important: { icon: AlertTriangle, cls: "border-l-warning bg-warning/10 text-warning", title: "Important" },
  warning: { icon: AlertOctagon, cls: "border-l-destructive bg-destructive/10 text-destructive", title: "Warning" },
  tip: { icon: Lightbulb, cls: "border-l-success bg-success/10 text-success", title: "Tip" },
};

function renderInline(text: string, key: string): ReactNode {
  // **bold** and `code`
  const parts: ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = regex.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const token = m[0];
    if (token.startsWith("**")) {
      parts.push(<strong key={`${key}-b-${i++}`} className="font-semibold text-foreground">{token.slice(2, -2)}</strong>);
    } else {
      parts.push(<code key={`${key}-c-${i++}`} className="rounded bg-muted px-1 py-0.5 font-mono text-[12px] text-info">{token.slice(1, -1)}</code>);
    }
    last = m.index + token.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export function CalloutBox({
  type = "note",
  title,
  children,
}: {
  type?: CalloutType;
  title?: string;
  children: ReactNode;
}) {
  const c = config[type];
  const Icon = c.icon;
  const heading = title ?? c.title;
  return (
    <div className={cn("my-5 flex gap-3 rounded-md border border-l-[3px] p-4 text-sm", c.cls)}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0 opacity-80" />
      <div className="space-y-1">
        <div className="font-semibold text-foreground">{heading}</div>
        <div className="text-foreground/85">
          {typeof children === "string" ? renderInline(children, "callout") : children}
        </div>
      </div>
    </div>
  );
}
