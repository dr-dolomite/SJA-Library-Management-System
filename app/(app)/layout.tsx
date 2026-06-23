import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AppHeader } from "@/components/app-header";
import { PageTransition } from "@/components/page-transition";

/**
 * The authenticated application shell. This layout is the trust boundary for
 * the whole `(app)` segment: it reads the Better Auth session server-side and
 * bounces anyone without one back to login. Role-gated nav is UX only — the
 * real authorization still happens in the data layer (see CLAUDE.md).
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/login");
  }

  const user = {
    name: session.user.name ?? session.user.email,
    email: session.user.email,
    role: (session.user as { role?: string | null }).role ?? "librarian",
  };

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <AppHeader />
        <PageTransition>{children}</PageTransition>
      </SidebarInset>
    </SidebarProvider>
  );
}
