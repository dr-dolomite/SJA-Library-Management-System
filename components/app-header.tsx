"use client";

import { usePathname } from "next/navigation";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { sectionForPath } from "@/components/nav-config";

/**
 * The app's top bar: the sidebar toggle (essential on tablet/phone where the
 * nav is an off-canvas drawer) plus the current section title for orientation.
 * Flat by design — a hairline border, no shadow or blur (Flat-By-Default Rule).
 */
export function AppHeader() {
  const pathname = usePathname();
  const section = sectionForPath(pathname);

  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background px-4">
      <SidebarTrigger className="-ml-1" />
      <span className="ml-1 text-sm font-medium text-foreground">
        {section?.title ?? "SJA-LMS"}
      </span>
    </header>
  );
}
