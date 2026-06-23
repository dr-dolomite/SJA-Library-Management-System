import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Image from "next/image";
import { auth } from "@/lib/auth";
import BrandPanel from "./brand-panel";
import LoginForm from "./login-form";

/**
 * Login page — server component.
 *
 * Session check: if a valid Better Auth session already exists the staff
 * member is redirected to /dashboard immediately, so they never land on the
 * login form while authenticated.
 *
 * Layout:
 *   Desktop (lg+): CSS grid, form left (45 %), brand panel right (55 %).
 *   Mobile/tablet (<lg): brand panel hidden; compact green header band shown
 *   above the full-width form column.
 */
export default async function LoginPage() {
  // ── Session redirect ────────────────────────────────────────────────────
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) {
    redirect("/dashboard");
  }

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[45fr_55fr]">

      {/* ════════════════════════════════════════════════════════════════
          LEFT COLUMN — form surface
          On mobile this is the only visible column (full-width).
          ════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col bg-background">

        {/* Compact green header band — mobile/tablet only (hidden on lg+) */}
        <header className="flex items-center gap-3 bg-primary px-6 py-4 text-primary-foreground lg:hidden">
          <Image
            src="/sja-logo.png"
            alt="St. Joseph's Academy seal"
            width={40}
            height={40}
            className="rounded-full flex-shrink-0"
          />
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold">
              St. Joseph&rsquo;s Academy
            </span>
            <span className="text-xs text-primary-foreground/70">
              Library Management System
            </span>
          </div>
        </header>

        {/* Form — centered both axes, constrained width */}
        <div className="flex flex-1 items-center justify-center px-6 py-12 sm:px-10">
          <div className="w-full max-w-sm">
            <LoginForm />
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════
          RIGHT COLUMN — brand panel (desktop only)
          ════════════════════════════════════════════════════════════════ */}
      <div className="hidden lg:block">
        <BrandPanel />
      </div>

    </div>
  );
}
