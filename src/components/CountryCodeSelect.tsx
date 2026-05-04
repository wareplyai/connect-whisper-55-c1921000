import { useState, useMemo } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronDown, Search } from "lucide-react";
import { ALL_COUNTRIES, POPULAR, OTHERS, Country } from "@/lib/countries";
import { cn } from "@/lib/utils";

interface Props {
  value: Country;
  onChange: (c: Country) => void;
  className?: string;
}

export const CountryCodeSelect = ({ value, onChange, className }: Props) => {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    if (!q.trim()) return null;
    const s = q.toLowerCase();
    return ALL_COUNTRIES.filter(
      (c) => c.name.toLowerCase().includes(s) || c.code.includes(s) || c.iso.toLowerCase().includes(s)
    );
  }, [q]);

  const select = (c: Country) => { onChange(c); setOpen(false); setQ(""); };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className={cn("justify-between gap-2 w-32 px-3", className)}>
          <span className="flex items-center gap-1.5">
            <span className="text-lg leading-none">{value.flag}</span>
            <span className="text-sm">{value.code}</span>
          </span>
          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <div className="p-2 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Search country..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
        </div>
        <div className="max-h-72 overflow-y-auto py-1">
          {filtered ? (
            filtered.length === 0 ? (
              <p className="px-3 py-4 text-sm text-muted-foreground text-center">No matches</p>
            ) : (
              filtered.map((c) => <Row key={c.iso} c={c} onClick={() => select(c)} />)
            )
          ) : (
            <>
              <p className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">Popular</p>
              {POPULAR.map((c) => <Row key={c.iso} c={c} onClick={() => select(c)} />)}
              <p className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground mt-1">All countries</p>
              {OTHERS.map((c) => <Row key={c.iso} c={c} onClick={() => select(c)} />)}
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

const Row = ({ c, onClick }: { c: Country; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-card-elevated text-left"
  >
    <span className="text-lg leading-none">{c.flag}</span>
    <span className="flex-1 truncate">{c.name}</span>
    <span className="text-muted-foreground text-xs">{c.code}</span>
  </button>
);
