# Foundation

The first slice. It builds the skeleton every later module hangs on: **Prisma + Better Auth wiring,
the full data model, staff auth + app-layer authorization, the role-gated app shell, the
data-access layer, and QR token identity.** No circulation/venue/export/admin *flows* yet — just
the bones they attach to.

> CLAUDE.md is the project index. This file is the depth for Foundation. Date: 2026-06-23.

> **Doc check.** Better Auth and Prisma 7 APIs/CLI evolve fast. Treat every code snippet below as
> *illustrative*, not final. Before implementing, confirm the current syntax via **context7** for:
> Better Auth (Prisma adapter, admin plugin, the Next.js catch-all handler, `getSession`) and
> Prisma 7 (generator/config block, `migrate dev`/`deploy`, pooled vs. direct URL). Pin the exact
> signatures you find — do not trust the shapes shown here verbatim.

## Deliverables (definition of done)

- Supabase Postgres connected as a plain managed database; Prisma Client singleton in `lib/prisma.ts`.
- `prisma/schema.prisma` is the single source of truth; all tables created via `prisma migrate dev`,
  the venue exclusion constraint added via a manual (`--create-only`) migration.
- Better Auth wired (server `lib/auth.ts`, browser `lib/auth-client.ts`, route handler
  `app/api/auth/[...all]/route.ts`); its `user`/`session`/`account`/`verification` tables generated
  into `prisma/schema.prisma` and migrated by Prisma.
- First admin seeded via Better Auth's server API; login works; `(app)/*` requires a session;
  `(app)/admin/*` requires the `admin` role.
- `lib/data/*` read functions + a Server Action write pattern established (with one real example
  each, e.g. create a borrower), each authorizing on the current Better Auth session.
- QR token generator (`lib/qr.ts`) producing unique `cpy_…` / `brw_…` tokens.
- `logActivity()` audit helper writing to `audit_logs`.
- Vitest installed with at least the QR-token unit test green.

**Out of scope here:** borrow/return UI, venue booking UI, exports, the backup daemon. Those are
later slices.

## Tech decisions

- **Schema is code:** `prisma/schema.prisma` is the source of truth. The typed Prisma Client is
  produced by `prisma generate` (this replaces `supabase gen types` / `lib/database.types.ts`).
  Migrations run via `prisma migrate dev` (dev) and `prisma migrate deploy` (prod).
- **One privileged DB connection.** Prisma connects as a single role; the database no longer
  enforces per-user access. **Authorization is an app-layer concern** (see below).
- **Auth is Better Auth.** Email/password with **public sign-up disabled** (staff only); the
  **admin plugin** supplies the `role` field, admin-provisioned account creation, user listing, and
  disable/ban. **Database-backed sessions** with an HTTP-only cookie — not a Supabase JWT, and the
  role is *not* in `app_metadata`.
- **Opaque QR tokens** generated app-side with a prefixed nanoid; stored `@unique` and not null.
- **Venue double-booking is prevented in the DB** with a `gist` exclusion constraint. Prisma cannot
  express it, so it is added through a manual migration (see Data model).

## Data model

Enums are native Prisma enums (mapped to Postgres enum types). Note: there is **no** `user_role` /
`user_status` mirror — staff role comes from the Better Auth admin plugin, and the disabled state is
Better Auth's `banned` flag.

```prisma
enum BorrowerStatus    { active inactive }
enum CopyStatus        { available borrowed lost maintenance }
enum ReservationStatus { booked cancelled completed }
```

Staff identity is the **Better Auth `user` table** (generated into the schema by the Better Auth
CLI, then migrated by Prisma). It carries the admin-plugin `role` field (`"admin"` | `"librarian"`),
Better Auth's `name` (full name), and `banned` (the disabled state). It **replaces the old
`profiles` table** — every staff FK now references `user(id)`. Better Auth also owns `session`,
`account`, and `verification`; do not hand-author those.

Business tables (sketch — final column types refined during implementation):

```prisma
model Borrower {
  id        String         @id @default(uuid())
  cardQr    String         @unique @map("card_qr")   // "brw_…"
  fullName  String         @map("full_name")
  email     String?
  phone     String?
  status    BorrowerStatus @default(active)
  createdAt DateTime       @default(now()) @map("created_at")

  loans        Loan[]
  reservations VenueReservation[]
  @@map("borrowers")
}

model Book {                                          // titles
  id            String   @id @default(uuid())
  isbn          String?
  title         String
  author        String
  publisher     String?
  publishedYear Int?     @map("published_year")
  category      String?
  createdAt     DateTime @default(now()) @map("created_at")

  copies BookCopy[]
  @@map("books")
}

model BookCopy {                                      // physical objects
  id         String     @id @default(uuid())
  bookId     String     @map("book_id")
  copyQr     String     @unique @map("copy_qr")       // "cpy_…"
  status     CopyStatus @default(available)
  condition  String?
  acquiredAt DateTime   @default(now()) @map("acquired_at")

  book  Book   @relation(fields: [bookId], references: [id], onDelete: Cascade)
  loans Loan[]
  @@map("book_copies")
}

model Loan {
  id         String    @id @default(uuid())
  copyId     String    @map("copy_id")
  borrowerId String    @map("borrower_id")
  borrowedBy String    @map("borrowed_by")            // -> user(id)
  borrowedAt DateTime  @default(now()) @map("borrowed_at")
  dueAt      DateTime  @map("due_at")
  returnedAt DateTime? @map("returned_at")
  returnedTo String?   @map("returned_to")            // -> user(id)

  copy            BookCopy @relation(fields: [copyId], references: [id])
  borrower        Borrower @relation(fields: [borrowerId], references: [id])
  borrowedByStaff User     @relation("LoanBorrowedBy", fields: [borrowedBy], references: [id])
  returnedToStaff User?    @relation("LoanReturnedTo", fields: [returnedTo], references: [id])
  @@map("loans")
}

model VenueReservation {
  id         String            @id @default(uuid())
  borrowerId String            @map("borrower_id")
  reservedBy String            @map("reserved_by")    // -> user(id)
  startsAt   DateTime          @map("starts_at")
  endsAt     DateTime          @map("ends_at")
  purpose    String?
  status     ReservationStatus @default(booked)
  createdAt  DateTime          @default(now()) @map("created_at")

  borrower      Borrower @relation(fields: [borrowerId], references: [id])
  reservedByStaff User   @relation(fields: [reservedBy], references: [id])
  @@map("venue_reservations")
}

model AuditLog {
  id         String   @id @default(uuid())
  actor      String?                                  // -> user(id), null = system
  action     String
  entityType String?  @map("entity_type")
  entityId   String?  @map("entity_id")
  metadata   Json     @default("{}")
  createdAt  DateTime @default(now()) @map("created_at")

  actorStaff User? @relation(fields: [actor], references: [id])
  @@map("audit_logs")
}
```

> The `User` model (Better Auth + admin plugin) gains the inverse relation fields for the FKs above
> (`borrowedBy`, `returnedTo`, `reservedBy`, `actor`). Add them when wiring the relations; keep the
> Better-Auth-generated columns otherwise untouched.

**DB-level guarantees (manual migration).** Prisma cannot express a `gist` exclusion constraint, so
generate an empty migration with `prisma migrate dev --create-only`, then hand-edit its SQL:

```sql
-- whole-library: no two active bookings may overlap in time
create extension if not exists btree_gist;
alter table venue_reservations add constraint venue_no_overlap
  exclude using gist (tstzrange(starts_at, ends_at) with &&) where (status = 'booked');
```

The `check (ends_at > starts_at)` guard can be added in the same hand-edited migration.

## Authorization (app layer)

**The server data layer is the security boundary — not the database.** Prisma connects with one
privileged role, so there is no per-user enforcement in Postgres (no RLS). Every read in
`lib/data/*` and every write Server Action resolves the current Better Auth session
(`auth.api.getSession({ headers: await headers() })`) and checks `session.user.role` before
touching data. Role-gated navigation stays **UX-only**.

Access matrix (enforced in the data layer):

| Resource | Read | Write |
|---|---|---|
| `books`, `book_copies`, `borrowers`, `loans`, `venue_reservations` | librarian + admin | librarian + admin |
| staff `user` records | librarian + admin (read) | **admin only** (via admin plugin) |
| `audit_logs` | **admin only** | any authenticated session (`logActivity`) |

A thin helper centralizes the check, e.g.:

```ts
// lib/authz.ts (illustrative — confirm getSession shape via context7)
export async function requireRole(roles: Array<"admin" | "librarian">) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || !roles.includes(session.user.role)) throw new Error("Forbidden");
  return session;
}
```

## Auth

- **Better Auth, email/password, public sign-up disabled** —
  `emailAndPassword: { enabled: true, disableSignUp: true }`. Staff only; no patron/public accounts.
- **Admin plugin** owns the `role` field and provisioning. Admins create further staff with
  `auth.api.createUser(...)` from the (later) admin module; the same plugin powers user listing and
  disable/ban (`banned`).
- **First admin** is created by a one-off seed script that calls Better Auth's **server API**
  (replaces the old Supabase service-role seed): create the user, then set `role: "admin"` via the
  admin plugin.
- **Database-backed sessions** (the `session` table) with an HTTP-only session cookie. Server code
  reads it via `auth.api.getSession({ headers: await headers() })`.
- **Route guard** in `middleware.ts`: `(app)/*` redirects to `/login` without a session;
  `(app)/admin/*` redirects/404s for non-admins. The browser client (`createAuthClient`) drives
  login from the `(auth)/login` page.

## App structure

```
app/(auth)/login/                 public
app/(app)/layout.tsx              role-aware shell (nav)
app/(app)/dashboard/
app/(app)/catalog/  borrowers/    scaffolded in Foundation
app/(app)/admin/                  admin-gated (built in slice 5)
app/api/auth/[...all]/route.ts    Better Auth handler — toNextJsHandler(auth)
middleware.ts                     session check + route guard

lib/prisma.ts                     server-only Prisma Client singleton
lib/auth.ts                       Better Auth server instance (prismaAdapter + admin plugin)
lib/auth-client.ts                createAuthClient (better-auth/react), browser
lib/authz.ts                      requireRole() session/role gate
lib/data/*.ts                     server-only reads, one per entity
lib/qr.ts                         token generator + helpers
lib/audit.ts                      logActivity()
prisma/schema.prisma              single source of truth (incl. Better Auth tables)
prisma/migrations/*.sql           Prisma Migrate (one hand-edited for the gist constraint)
```

- **`lib/prisma.ts`** is guarded with `server-only` and is **never** imported into a Client
  Component.
- **Reads:** `lib/data/*` functions called from Server Components (Prisma queries).
- **Writes:** Server Actions (`app/**/actions.ts`) calling those functions; revalidate as needed.

Illustrative wiring (confirm exact APIs via **context7** before use):

```ts
// lib/prisma.ts
import "server-only";
import { PrismaClient } from "@prisma/client";
const g = globalThis as unknown as { prisma?: PrismaClient };
export const prisma = g.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") g.prisma = prisma;

// lib/auth.ts
import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/prisma";
export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: { enabled: true, disableSignUp: true },
  plugins: [admin()],
});

// app/api/auth/[...all]/route.ts
import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";
export const { GET, POST } = toNextJsHandler(auth);
```

Better Auth's tables are scaffolded into `prisma/schema.prisma` with
`npx @better-auth/cli generate`, then applied with `prisma migrate dev`.

## QR tokens

`lib/qr.ts`: `newCopyToken()` → `cpy_` + 12-char nanoid; `newCardToken()` → `brw_` + 12-char
nanoid. Alphabet excludes look-alikes. Tokens are opaque — no embedded data; a scan is one indexed
lookup on `copy_qr` / `card_qr`. QR *image* rendering (for printable labels) is a thin client
concern layered on later.

## Env

```
DATABASE_URL=        # pooled Supabase connection (pgBouncer, port 6543, append ?pgbouncer=true) — runtime Prisma Client
DIRECT_URL=          # direct Supabase connection (port 5432) — Prisma Migrate / introspection
BETTER_AUTH_SECRET=  # Better Auth signing secret
BETTER_AUTH_URL=     # app base URL, e.g. http://localhost:3000
```

## Open questions

- Borrower identifiers beyond the QR card (e.g. student ID)? — defer unless needed.
- Default loan period (drives `due_at`) — decided in the Circulation slice, not here.
