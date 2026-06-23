import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements, adminAc } from "better-auth/plugins/admin/access";

/**
 * Access-control statements. We start from the admin plugin's defaults
 * (the `user` + `session` management resources). App resources (catalog,
 * loans, reservations, …) get added here as those modules land.
 */
export const ac = createAccessControl(defaultStatements);

/**
 * Librarian — the daily driver. Catalog, borrowers, circulation, venue
 * reservations, exports. Deliberately no staff/user administration.
 */
export const librarian = ac.newRole({});

/**
 * Admin — everything a librarian can do, plus full staff/user management
 * (create staff, set roles, ban/disable).
 */
export const admin = ac.newRole({
  ...adminAc.statements,
});
