import { redirect } from "next/navigation";

import { getCurrentStaff } from "@/lib/session";
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
  const staff = await getCurrentStaff();
  if (!staff) redirect("/login");
  const user = { name: staff.fullName, email: staff.email, role: staff.role };

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
