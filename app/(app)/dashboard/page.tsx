import type { Metadata } from "next";
import { LibraryBig } from "lucide-react";

export const metadata: Metadata = {
  title: "Dashboard · SJA-LMS",
};

export default function DashboardPage() {
  return (
    <>
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">
          The library&apos;s home base. Circulation, the catalog, borrowers, and
          venue reservations will surface here as each module ships.
        </p>
      </div>

      {/* Empty state — teaches the interface rather than showing "nothing here".
          Flat by default: a hairline border and a quiet fill, no shadow. */}
      <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border bg-muted/40 p-8">
        <div className="flex max-w-sm flex-col items-center text-center">
          <span
            aria-hidden
            className="flex size-11 items-center justify-center rounded-lg bg-secondary text-secondary-foreground"
          >
            <LibraryBig className="size-5" />
          </span>
          <h2 className="mt-4 text-base font-medium text-foreground">
            Nothing to show yet
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground text-pretty">
            This is the foundation shell. Use the navigation to move between
            modules — they&apos;ll fill in as the system is built slice by slice.
          </p>
        </div>
      </div>
    </>
  );
}
