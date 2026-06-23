"use client";

import { usePathname } from "next/navigation";

/**
 * The page-content reveal. Re-keying on the pathname remounts this wrapper on
 * every navigation, which replays the `view-in` animation (a calm rise + fade)
 * so each screen "arrives" rather than snapping in — the Apple view-transition
 * feel. It animates the content region only; the sidebar and header stay put.
 *
 * The animation settles on the natural, already-visible state, and
 * `prefers-reduced-motion` collapses it to nothing (see globals.css), so the
 * content is never gated behind motion that might not run.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div
      key={pathname}
      className="animate-view-in flex flex-1 flex-col gap-6 p-4 md:p-6"
    >
      {children}
    </div>
  );
}
