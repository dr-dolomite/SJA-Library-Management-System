"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { NavUser } from "@/components/nav-user";
import { adminNav, primaryNav, type NavItem } from "@/components/nav-config";
import { cn } from "@/lib/utils";

type AppSidebarProps = {
  user: { name: string; email: string; role: string };
} & React.ComponentProps<typeof Sidebar>;

export function AppSidebar({ user, ...props }: AppSidebarProps) {
  const pathname = usePathname();
  const isAdmin = user.role === "admin";

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              asChild
              className="transition-all duration-200 ease-apple active:scale-[0.98]"
            >
              <Link href="/dashboard">
                {/* The school seal, sat on a white disc so its green outer
                    ring keeps its silhouette against the pine sidebar (a raw
                    seal would dissolve green-on-green). Decorative — the
                    wordmark beside it names the school for screen readers. */}
                <span
                  aria-hidden
                  className="flex aspect-square size-8 items-center justify-center overflow-hidden rounded-full bg-white shadow-[inset_0_1px_0_oklch(1_0_0/0.5),0_1px_2px_oklch(0.24_0.02_163/0.35)] ring-1 ring-black/5 transition-transform duration-200 ease-apple group-hover/menu-button:scale-105"
                >
                  <Image
                    src="/sja-logo.png"
                    alt=""
                    width={64}
                    height={64}
                    priority
                    className="size-[26px] object-contain"
                  />
                </span>
                <div className="grid flex-1 text-left leading-tight">
                  <span className="truncate text-sm font-semibold">
                    St. Joseph&apos;s Academy
                  </span>
                  <span className="truncate text-xs text-sidebar-foreground/70">
                    Library Management
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <NavGroup label="Library" items={primaryNav} pathname={pathname} />
        {isAdmin ? (
          <NavGroup
            label="Administration"
            items={adminNav}
            pathname={pathname}
          />
        ) : null}
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

function NavGroup({
  label,
  items,
  pathname,
}: {
  label: string;
  items: NavItem[];
  pathname: string;
}) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item, index) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <SidebarMenuItem
              key={item.href}
              className="animate-nav-item-in"
              style={{ "--nav-index": index } as React.CSSProperties}
            >
              <SidebarMenuButton
                asChild
                isActive={active}
                tooltip={item.title}
                className={cn(
                  "transition-all duration-200 ease-apple hover:translate-x-0.5 active:scale-[0.98]",
                  // Hover sits quieter than the selected chip so they never
                  // read as the same state.
                  "hover:bg-sidebar-accent/50",
                  // The selected item is a gilt-edged chip: a clearly lighter
                  // pill gives it presence, and a 1px gold inset border is the
                  // "you are here" gilt — anchored to the whole item, legible
                  // as a line rather than low-contrast gold text/icon.
                  "data-[active=true]:bg-[oklch(0.4_0.055_163)]",
                  "data-[active=true]:shadow-[inset_0_0_0_1px_oklch(0.725_0.14_90/0.6)]",
                )}
              >
                <Link href={item.href}>
                  <item.icon className="transition-transform duration-200 ease-apple group-hover/menu-button:scale-110" />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
