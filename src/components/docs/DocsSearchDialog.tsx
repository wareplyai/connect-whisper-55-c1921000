import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { navigation } from "@/docs/navigation";

export function DocsSearchDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  const go = (slug: string) => {
    onOpenChange(false);
    navigate(`/docs/${slug}`);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search API documentation..." />
      <CommandList className="max-h-[420px]">
        <CommandEmpty>No results found.</CommandEmpty>
        {navigation.map((cat) => (
          <CommandGroup key={cat.label} heading={cat.label}>
            {cat.items.map((item) => (
              <CommandItem
                key={item.slug}
                value={`${cat.label} ${item.title} ${item.slug}`}
                onSelect={() => go(item.slug)}
                className="flex flex-col items-start gap-0.5 py-2.5"
              >
                <span className="text-sm font-medium">{item.title}</span>
                <span className="text-xs text-muted-foreground">
                  Category: <span className="text-foreground/80">{cat.label}</span>
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
      <div className="flex items-center justify-between border-t px-3 py-2 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-2">
          <kbd className="rounded border bg-card px-1.5 py-0.5 font-mono">↑</kbd>
          <kbd className="rounded border bg-card px-1.5 py-0.5 font-mono">↓</kbd>
          <span>to navigate</span>
          <kbd className="ml-2 rounded border bg-card px-1.5 py-0.5 font-mono">Enter</kbd>
          <span>to select</span>
        </div>
        <div className="flex items-center gap-1">
          <span>Search:</span>
          <kbd className="rounded border bg-card px-1.5 py-0.5 font-mono">Ctrl</kbd>
          <kbd className="rounded border bg-card px-1.5 py-0.5 font-mono">K</kbd>
        </div>
      </div>
    </CommandDialog>
  );
}
