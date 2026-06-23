import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin as adminPlugin } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@/lib/prisma";
import { ac, admin, librarian } from "@/lib/permissions";

/**
 * The server Better Auth instance. Database-backed sessions via the Prisma
 * adapter; authorization is enforced in the server data layer using the
 * session role (see CLAUDE.md — "the server data layer is the security
 * boundary, not the UI").
 */
export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  // Admin-provisioned staff only: no public signup. The first admin is
  // seeded; admins then create staff via the admin plugin (auth.api.createUser).
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
  },
  plugins: [
    adminPlugin({
      ac,
      roles: { admin, librarian },
      defaultRole: "librarian",
      adminRoles: ["admin"],
    }),
    // Keep last: lets Server Actions persist Better Auth's session cookies.
    nextCookies(),
  ],
});
