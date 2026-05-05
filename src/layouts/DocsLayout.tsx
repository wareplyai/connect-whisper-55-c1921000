import { useState } from "react";
import { Link, Outlet } from "react-router-dom";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { DocsSidebar } from "@/components/docs/DocsSidebar";

export default function DocsLayout() {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen bg-[#0d1117] text-[#e6edf3]">
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-[#0d1117]/95 px-4 backdrop-blur">
        <div className="flex items-center gap-3">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] p-0">
              <DocsSidebar onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#25d366] text-xs font-bold text-black">W</span>
            <span className="font-semibold">WaSenderAPI</span>
          </Link>
          <span className="hidden text-xs text-muted-foreground sm:inline-block">/ Docs</span>
        </div>
        <nav className="flex items-center gap-1 text-sm">
          <Link to="/" className="hidden px-3 py-1.5 text-muted-foreground hover:text-foreground sm:inline-block">
            Home
          </Link>
          <Link to="/docs" className="hidden px-3 py-1.5 text-muted-foreground hover:text-foreground sm:inline-block">
            Documentation
          </Link>
          <Link to="/login" className="hidden px-3 py-1.5 text-muted-foreground hover:text-foreground sm:inline-block">
            Login
          </Link>
          <Button asChild size="sm" className="bg-[#25d366] text-black hover:bg-[#1fb556]">
            <Link to="/register">Get Started</Link>
          </Button>
        </nav>
      </header>
      <div className="flex">
        <div className="hidden h-[calc(100vh-3.5rem)] w-60 shrink-0 lg:block sticky top-14">
          <DocsSidebar />
        </div>
        <main className="min-w-0 flex-1">
          <div className="mx-auto max-w-[860px] px-5 py-8 md:px-8 md:py-12">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
