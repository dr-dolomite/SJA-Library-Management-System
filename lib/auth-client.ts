import { createAuthClient } from "better-auth/react";
import { adminClient } from "better-auth/client/plugins";
import { ac, admin, librarian } from "@/lib/permissions";

/**
 * The browser Better Auth client. Mirrors the server's roles so client-side
 * permission checks (`authClient.admin.*`) stay type-safe and in sync.
 */
export const authClient = createAuthClient({
  plugins: [
    adminClient({
      ac,
      roles: { admin, librarian },
    }),
  ],
});
