import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Search } from "lucide-react";
import { navigation } from "@/docs/navigation";
import { cn } from "@/lib/utils";
import { DocsSearchDialog } from "./DocsSearchDialog";

export function DocsSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const location = useLocation();
  const navRef = useRef<HTMLElement>(null);
  const filtered = navigation;

  useEffect(() => {
    const el = navRef.current?.querySelector<HTMLElement>("a[aria-current='page']");
    if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [location.pathname]);


  return (
    <aside className="flex h-full w-full flex-col border-r bg-[#161b22]">
      <DocsSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
      <div className="border-b p-3">
        <div className="mb-2 flex items-center justify-between">
          <Link
            to="/docs"
            className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground hover:text-foreground"
            onClick={onNavigate}
          >
            API Documentation
          </Link>
        </div>
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="flex w-full items-center gap-2 rounded-md border bg-card px-2.5 py-2 text-left text-sm text-muted-foreground hover:border-[#25d366]/50 hover:text-foreground"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="flex-1 truncate">Search...</span>
          <kbd className="hidden rounded border bg-background px-1.5 py-0.5 font-mono text-[10px] sm:inline-block">
            ⌘K
          </kbd>
        </button>
      </div>
      <nav ref={navRef} className="flex-1 overflow-y-auto p-3">
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
