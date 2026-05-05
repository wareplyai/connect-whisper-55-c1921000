import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CopyButton({ text, className, label = "Copy" }: { text: string; className?: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const onClick = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className={cn("h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground", className)}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-[#25d366]" /> : <Copy className="h-3.5 w-3.5" />}
      <span>{copied ? "Copied" : label}</span>
    </Button>
  );
}
