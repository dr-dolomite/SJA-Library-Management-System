import {
  ArrowLeftRight,
  BookMarked,
  CalendarClock,
  Download,
  LayoutDashboard,
  ScrollText,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";

/**
 * The application's navigation IA, shared by the sidebar (renders the items)
 * and the header (looks up the current section title). Keeping it in one place
 * means the two never drift. Routes beyond `/dashboard` are placeholders until
 * their module ships — they appear in the nav as the agreed information
 * architecture, slice by slice.
 */
export type NavItem = { title: string; href: string; icon: LucideIcon };

/** Librarian's daily drivers — visible to every staff member. */
export const primaryNav: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Circulation", href: "/circulation", icon: ArrowLeftRight },
  { title: "Catalog", href: "/catalog", icon: BookMarked },
  { title: "Borrowers", href: "/borrowers", icon: Users },
  { title: "Venue", href: "/reservations", icon: CalendarClock },
  { title: "Exports", href: "/exports", icon: Download },
];

/** Admin-only — staff provisioning and the audit ("debug") log. */
export const adminNav: NavItem[] = [
  { title: "Staff", href: "/staff", icon: UserCog },
  { title: "Audit logs", href: "/audit", icon: ScrollText },
];

const allNav = [...primaryNav, ...adminNav];

/** The nav item whose route owns the current path (for the header title). */
export function sectionForPath(pathname: string): NavItem | undefined {
  return allNav.find(
    (item) => pathname === item.href || pathname.startsWith(item.href + "/"),
  );
}
