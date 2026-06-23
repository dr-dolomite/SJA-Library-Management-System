import "server-only";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

/** The authenticated staff member, or null. Canonical session read for the
 *  data layer and Server Actions — the role here is the authorization source. */
export async function getCurrentStaff() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const { user } = session;
  const role = ((user as { role?: string | null }).role ?? "librarian") as
    | "admin"
    | "librarian";
  return { id: user.id, fullName: user.name ?? user.email, email: user.email, role };
}
