"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronsUpDown, Loader2, LogOut } from "lucide-react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

type NavUserProps = {
  user: { name: string; email: string; role: string };
};

/** Two-letter initials for the avatar fallback (first + last name). */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function NavUser({ user }: NavUserProps) {
  const { isMobile } = useSidebar();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const roleLabel = user.role === "admin" ? "Administrator" : "Librarian";

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      const { error } = await authClient.signOut();
      if (error) {
        toast.error("Couldn't sign out. Please try again.");
        setSigningOut(false);
        return;
      }
      // Mirror the sign-in flow: refresh the RSC tree so the now-absent
      // session is picked up, then return to the login screen.
      router.refresh();
      router.push("/login");
    } catch {
      toast.error("Couldn't sign out. Please try again.");
      setSigningOut(false);
    }
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="transition-all duration-200 ease-apple active:scale-[0.98] data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="size-8 rounded-md">
                <AvatarFallback className="rounded-md bg-sidebar-accent font-mono text-xs text-sidebar-foreground">
                  {initials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left leading-tight">
                <span className="truncate text-sm font-medium">{user.name}</span>
                <span className="truncate text-xs text-sidebar-foreground/70">
                  {roleLabel}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4 opacity-70" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left">
                <Avatar className="size-8 rounded-md">
                  <AvatarFallback className="rounded-md bg-muted font-mono text-xs text-foreground">
                    {initials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 leading-tight">
                  <span className="truncate text-sm font-medium">
                    {user.name}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {user.email}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              disabled={signingOut}
              onSelect={(event) => {
                // Keep the menu logic in our handler; don't let the default
                // select-and-close race the async sign-out.
                event.preventDefault();
                void handleSignOut();
              }}
            >
              {signingOut ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <LogOut className="size-4" aria-hidden />
              )}
              {signingOut ? "Signing out…" : "Log out"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
