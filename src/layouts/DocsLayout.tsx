import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { DocsSidebar } from "@/components/docs/DocsSidebar";
import { Navbar } from "@/components/marketing/Navbar";

export default function DocsLayout() {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen bg-[#0d1117] text-[#e6edf3]">
      <Navbar />
      <div className="flex lg:hidden items-center gap-2 border-b border-border/60 bg-background/70 px-4 py-2 backdrop-blur sticky top-16 z-40">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2">
              <Menu className="h-4 w-4" /> Docs menu
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] p-0">
            <DocsSidebar onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>
      <div className="flex">
        <div className="hidden h-[calc(100vh-4rem)] w-64 shrink-0 lg:block sticky top-16">
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
