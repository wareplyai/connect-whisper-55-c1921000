import { useMemo, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { navigation } from "@/docs/navigation";
import { cn } from "@/lib/utils";

export function DocsSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return navigation;
    const q = query.toLowerCase();
    return navigation
      .map((c) => ({ ...c, items: c.items.filter((i) => i.title.toLowerCase().includes(q)) }))
      .filter((c) => c.items.length > 0);
  }, [query]);

  return (
    <aside className="flex h-full w-full flex-col border-r bg-[#161b22]">
      <div className="border-b p-3">
        <Link to="/docs" className="mb-3 flex items-center gap-2" onClick={onNavigate}>
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#25d366] text-xs font-bold text-black">W</span>
          <span className="font-semibold">WaSenderAPI</span>
        </Link>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search..."
            className="h-9 pl-8 pr-12 text-sm"
          />
          <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border bg-card px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline-block">
            ⌘K
          </kbd>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto p-3">
        {filtered.map((cat) => (
          <div key={cat.label} className="mb-5">
            <div className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {cat.label}
            </div>
            <ul className="space-y-0.5">
              {cat.items.map((item) => (
                <li key={item.slug}>
                  <NavLink
                    to={`/docs/${item.slug}`}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center justify-between gap-2 rounded-md border-l-2 border-transparent px-3 py-1.5 text-[13px] text-foreground/80 transition-colors hover:bg-white/5 hover:text-foreground",
                        isActive && "border-[#25d366] bg-[#1a4731] text-[#25d366]",
                      )
                    }
                  >
                    <span className="truncate">{item.title}</span>
                    {item.isNew && (
                      <span className="rounded bg-[#25d366] px-1.5 py-px text-[10px] font-semibold text-black">
                        New
                      </span>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
