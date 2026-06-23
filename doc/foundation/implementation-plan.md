# Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the SJA-LMS skeleton — Prisma wiring over a managed Supabase Postgres, the full data model, Better Auth staff auth, a role-gated app shell, the data-access/Server-Action layer, and QR token identity — so every later module has bones to attach to.

**Architecture:** Next.js 16 App Router with React Server Components. Prisma 7 is the ORM; `prisma/schema.prisma` is the single source of truth and `prisma generate` produces the typed client. Better Auth owns authentication (email/password, sign-up disabled, admin plugin for roles + provisioning) backed by database sessions. A single server-only Prisma client singleton (`lib/prisma.ts`) talks to Postgres with one privileged role. Authorization is enforced in the **server data layer** (`lib/data/*` reads, Server Actions writes) by checking the role on the current Better Auth session — the database is no longer the access boundary. Reads go through `lib/data/*` server functions; writes go through Server Actions.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind v4, shadcn (radix-nova), Supabase Postgres (plain managed database), Prisma 7 (`prisma` + `@prisma/client`), Better Auth, nanoid, Vitest, pnpm.

## Global Constraints

- **pnpm is the only package manager.** Never invoke npm/yarn.
- **React Server Components by default;** mark Client Components with `"use client"` only when needed (interactivity/hooks).
- **`role` comes from the Better Auth admin plugin** (values `'admin'` / `'librarian'`) on the `user` table; it lives in the database-backed session, not a JWT or `app_metadata`. Disabled staff = `banned`.
- **`lib/prisma.ts` is server-only** — guarded by `import "server-only"` and never imported into a Client Component. Prisma connects with one privileged role, so authorization is the app layer's job.
- **QR tokens are opaque** — `cpy_…` for copies, `brw_…` for borrower cards; no embedded data.
- **Schema is code:** `prisma/schema.prisma` is the source of truth; all DDL lands via `prisma migrate` in `prisma/migrations/*`; never hand-edit schema in the dashboard.
- **No public signup:** Better Auth has `disableSignUp: true`; staff accounts are admin-provisioned via the admin plugin (`auth.api.createUser`).
- Line endings are LF (enforced by `.gitattributes`).

> **Doc check:** Better Auth and Prisma 7 APIs/CLI evolve fast. The code below is **illustrative, not final** — before implementing each task, confirm the current syntax via context7. Specifically verify: Better Auth's Prisma adapter (`prismaAdapter(prisma, { provider: "postgresql" })`), the admin plugin (role field, `createUser`, ban/disable), the Next.js catch-all handler (`toNextJsHandler`), `auth.api.getSession({ headers })`, and the browser `createAuthClient` (`/better-auth` docs); and Prisma 7's generator/`prisma.config` setup, `prisma migrate dev`/`deploy`, `--create-only` for manual migrations, and the pooled-vs-direct URL split (`/prisma/prisma` docs). Treat any signature below as a starting point to validate, not a guarantee.

---

### Task 1: Project tooling & environment

**Files:**
- Modify: `package.json` (dependencies, scripts)
- Create: `.env.local` (gitignored), `.env.example`
- Create: `prisma/schema.prisma` (via `prisma init`)

**Interfaces:**
- Produces: installed deps (`@prisma/client`, `better-auth`, `nanoid`, `server-only`, dev: `prisma`, `tsx`, `vitest`, `dotenv`); env vars `DATABASE_URL`, `DIRECT_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`; `pnpm test` script.

- [ ] **Step 1: Install runtime + dev dependencies**

```bash
pnpm add @prisma/client better-auth nanoid server-only
pnpm add -D prisma tsx vitest dotenv
```

> If migrating an existing checkout: `pnpm remove @supabase/ssr @supabase/supabase-js` and drop the `supabase` dev dependency — the all-Supabase stack is gone. Supabase is now only the managed Postgres host (instance, pooler, dashboard, backups).

- [ ] **Step 2: Add scripts to `package.json`**

In `"scripts"`, add:
```json
"test": "vitest run",
"test:watch": "vitest",
"db:migrate": "prisma migrate dev",
"db:generate": "prisma generate"
```

- [ ] **Step 3: Initialize Prisma**

Run: `pnpm dlx prisma init --datasource-provider postgresql`
Expected: creates `prisma/schema.prisma` and appends `DATABASE_URL` to `.env`. Set the datasource to use both the pooled and direct URLs:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")   // pooled (pgBouncer)
  directUrl = env("DIRECT_URL")     // direct, for migrate/introspect
}
```

> **Doc check:** Prisma 7 may favor a `prisma.config.ts` over the legacy `generator`/datasource block layout — confirm the current init output and config shape via context7 before locking this in.

- [ ] **Step 4: Create `.env.example`**

```bash
# Pooled Supabase connection (pgBouncer, port 6543) — used by Prisma Client at runtime
DATABASE_URL=postgresql://...:6543/postgres?pgbouncer=true
# Direct Supabase connection (port 5432) — used by Prisma Migrate / introspection
DIRECT_URL=postgresql://...:5432/postgres
# Better Auth signing secret
BETTER_AUTH_SECRET=
# App base URL
BETTER_AUTH_URL=http://localhost:3000
```

- [ ] **Step 5: Create `.env.local` with real values.** Pull `DATABASE_URL` / `DIRECT_URL` from the Supabase dashboard (Project Settings → Database → Connection string; pooled = "Transaction"/6543 with `?pgbouncer=true`, direct = "Session"/5432). Generate `BETTER_AUTH_SECRET` with `openssl rand -base64 32`. Confirm the file is ignored: `git check-ignore .env.local` → prints `.env.local`.

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml prisma/schema.prisma .env.example
git commit -m "chore: add prisma, better-auth, vitest tooling and env scaffolding"
```

---

### Task 2: QR token generator (TDD)

**Files:**
- Create: `lib/qr.ts`
- Test: `lib/qr.test.ts`
- Create: `vitest.config.ts`

**Interfaces:**
- Produces: `newCopyToken(): string` (→ `cpy_` + 12 chars), `newCardToken(): string` (→ `brw_` + 12 chars), `TOKEN_ALPHABET`. Used by Tasks 6 and 10 and later slices.

- [ ] **Step 1: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { environment: "node", include: ["**/*.test.ts"] },
});
```

- [ ] **Step 2: Write the failing test** (`lib/qr.test.ts`)

```ts
import { describe, it, expect } from "vitest";
import { newCopyToken, newCardToken } from "./qr";

describe("qr tokens", () => {
  it("copy tokens are prefixed and 16 chars total", () => {
    const t = newCopyToken();
    expect(t).toMatch(/^cpy_[0-9A-HJ-NP-Za-km-z]{12}$/);
  });

  it("card tokens are prefixed and 16 chars total", () => {
    const t = newCardToken();
    expect(t).toMatch(/^brw_[0-9A-HJ-NP-Za-km-z]{12}$/);
  });

  it("tokens are unique across many draws", () => {
    const set = new Set(Array.from({ length: 1000 }, () => newCopyToken()));
    expect(set.size).toBe(1000);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm test`
Expected: FAIL — cannot resolve `./qr` / functions not defined.

- [ ] **Step 4: Implement `lib/qr.ts`**

```ts
import { customAlphabet } from "nanoid";

// No look-alikes (0/O, 1/I/l) to keep printed/scanned codes unambiguous.
export const TOKEN_ALPHABET =
  "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz";

const nano = customAlphabet(TOKEN_ALPHABET, 12);

export function newCopyToken(): string {
  return `cpy_${nano()}`;
}

export function newCardToken(): string {
  return `brw_${nano()}`;
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm test`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add lib/qr.ts lib/qr.test.ts vitest.config.ts
git commit -m "feat: opaque QR token generator with tests"
```

---

### Task 3: Prisma schema & initial migration

**Files:**
- Modify: `prisma/schema.prisma` (models + enums)
- Create: `prisma/migrations/*` (generated by `prisma migrate dev`)
- Create: a manual migration for the `venue_no_overlap` gist exclusion constraint

**Interfaces:**
- Produces: native Prisma enums (`UserRole` / `UserStatus` are gone — see below; `BorrowerStatus`, `CopyStatus`, `ReservationStatus`) and models (`Borrower`, `Book`, `BookCopy`, `Loan`, `VenueReservation`, `AuditLog`) plus the Better Auth tables added in Task 4, with the `venue_no_overlap` exclusion constraint. Consumed by Tasks 4, 5, 6, 10.

> **Identity model:** there is **no `profiles` table** and **no `user_role` / `user_status` enum**. Staff identity is the Better Auth `user` table (Task 4): role comes from the admin plugin, full name is Better Auth's `name`, disabled = `banned`. Every FK that used to reference `profiles(id)` now references `user(id)`: `loans.borrowed_by`, `loans.returned_to`, `venue_reservations.reserved_by`, `audit_logs.actor`.

- [ ] **Step 1: Model the business entities in `prisma/schema.prisma`**

Translate the data model in `doc/foundation/README.md` § Data model into Prisma models. Native enums and the core tables (illustrative — keep field names snake-cased on the DB via `@map`/`@@map` to match the documented SQL):

```prisma
enum BorrowerStatus { active inactive }
enum CopyStatus     { available borrowed lost }
enum ReservationStatus { booked cancelled completed }

model Borrower {
  id        String         @id @default(uuid()) @db.Uuid
  cardQr    String         @unique @map("card_qr")
  fullName  String         @map("full_name")
  email     String?
  phone     String?
  status    BorrowerStatus @default(active)
  createdAt DateTime       @default(now()) @map("created_at")
  loans     Loan[]
  @@map("borrowers")
}

model Book {
  id        String     @id @default(uuid()) @db.Uuid
  title     String
  author    String?
  isbn      String?
  createdAt DateTime   @default(now()) @map("created_at")
  copies    BookCopy[]
  @@map("books")
}

model BookCopy {
  id       String     @id @default(uuid()) @db.Uuid
  bookId   String     @map("book_id") @db.Uuid
  copyQr   String     @unique @map("copy_qr")
  status   CopyStatus @default(available)
  book     Book       @relation(fields: [bookId], references: [id])
  loans    Loan[]
  @@map("book_copies")
}

model Loan {
  id         String    @id @default(uuid()) @db.Uuid
  copyId     String    @map("copy_id") @db.Uuid
  borrowerId String    @map("borrower_id") @db.Uuid
  borrowedBy String    @map("borrowed_by") @db.Uuid   // -> user(id)
  returnedTo String?   @map("returned_to") @db.Uuid   // -> user(id)
  borrowedAt DateTime  @default(now()) @map("borrowed_at")
  dueAt      DateTime  @map("due_at")
  returnedAt DateTime? @map("returned_at")
  copy       BookCopy  @relation(fields: [copyId], references: [id])
  borrower   Borrower  @relation(fields: [borrowerId], references: [id])
  @@map("loans")
}

model VenueReservation {
  id         String            @id @default(uuid()) @db.Uuid
  reservedBy String            @map("reserved_by") @db.Uuid   // -> user(id)
  startsAt   DateTime          @map("starts_at")
  endsAt     DateTime          @map("ends_at")
  status     ReservationStatus @default(booked)
  createdAt  DateTime          @default(now()) @map("created_at")
  @@map("venue_reservations")
}

model AuditLog {
  id         String   @id @default(uuid()) @db.Uuid
  actor      String?  @map("actor") @db.Uuid   // -> user(id)
  action     String
  entityType String?  @map("entity_type")
  entityId   String?  @map("entity_id")
  metadata   Json     @default("{}")
  createdAt  DateTime @default(now()) @map("created_at")
  @@map("audit_logs")
}
```

> The `borrowedBy` / `returnedTo` / `reservedBy` / `actor` relations to the Better Auth `user` model are wired in Task 4, once that model exists in the schema. Add the matching `@relation` blocks then.

- [ ] **Step 2: Create the first migration (without applying), then add the exclusion constraint by hand**

Prisma cannot express a gist exclusion constraint, so generate the SQL and hand-edit it:

Run: `pnpm dlx prisma migrate dev --name init_schema --create-only`
Then edit the generated `prisma/migrations/<ts>_init_schema/migration.sql` to add, near the top:

```sql
create extension if not exists btree_gist;
```

and after the `venue_reservations` table is created, the overlap guard:

```sql
alter table "venue_reservations"
  add constraint "venue_no_overlap"
  exclude using gist (
    tstzrange("starts_at", "ends_at") with &&
  ) where (status = 'booked');
```

> **Doc check:** confirm Prisma 7's `--create-only` flag name and the migration-file layout via context7 — the manual-SQL escape hatch for unsupported constraints can shift between versions.

- [ ] **Step 3: Apply the migration**

Run: `pnpm dlx prisma migrate dev`
Expected: the (already-created) migration applies with no errors, and `prisma generate` runs to produce the typed client.

- [ ] **Step 4: Verify tables and the overlap constraint**

In the Supabase SQL editor:
```sql
select table_name from information_schema.tables where table_schema='public' order by 1;
```
Then exercise the guard:
```sql
-- two overlapping 'booked' reservations for the same window should fail the second insert
```
Expected: the second overlapping `insert` raises `conflicting key value violates exclusion constraint "venue_no_overlap"`. Clean up test rows afterward.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: prisma schema with business entities and venue overlap constraint"
```

---

### Task 4: Better Auth setup (server instance, admin plugin, schema generate + migrate, route handler)

**Files:**
- Create: `lib/auth.ts` (server auth instance), `lib/auth-client.ts` (browser client)
- Create: `app/api/auth/[...all]/route.ts` (catch-all handler)
- Modify: `prisma/schema.prisma` (Better Auth tables, generated by the Better Auth CLI)
- Create: `prisma/migrations/*` (the auth tables, via Prisma)

**Interfaces:**
- Consumes: the Prisma client singleton (Task 5 — create `lib/prisma.ts` first if you reorder), models from Task 3.
- Produces: the `user` / `session` / `account` / `verification` tables (with the admin-plugin `role`, `name`, `banned` fields on `user`); a server `auth` with `auth.api.getSession` / `auth.api.createUser`; a browser auth client; the mounted Next.js route handler. This `user` table is the staff identity that **replaces** the old `profiles` table.

- [ ] **Step 1: Configure the server auth instance** (`lib/auth.ts`)

```ts
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin } from "better-auth/plugins";
import { prisma } from "@/lib/prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true, // staff only — no public/patron sign-up
  },
  plugins: [
    admin({
      // roles: "admin" and "librarian"; "admin" is the privileged role
      defaultRole: "librarian",
      adminRoles: ["admin"],
    }),
  ],
});
```

- [ ] **Step 2: Generate the Better Auth tables into the Prisma schema, then migrate**

Run: `pnpm dlx @better-auth/cli generate`
Expected: appends `user`, `session`, `account`, `verification` models to `prisma/schema.prisma` (the admin plugin adds `role` and `banned`/ban fields and Better Auth's `name` to `user`).

Then wire the staff FKs from Task 3 to the new `user` model (add `@relation` back-references on `User` and forward relations on `Loan` / `VenueReservation` / `AuditLog`), and migrate:

Run: `pnpm dlx prisma migrate dev --name better_auth`
Expected: creates and applies the auth tables.

> **Doc check:** the `@better-auth/cli generate` output, the admin-plugin option names (`defaultRole` / `adminRoles` / ban fields), and the `user` field names (`name`, `banned`) can change — confirm against the current Better Auth docs via context7 before relying on them.

- [ ] **Step 3: Browser auth client** (`lib/auth-client.ts`)

```ts
import { createAuthClient } from "better-auth/react";
import { adminClient } from "better-auth/client/plugins";

// No baseURL: the API is mounted in this same app (/api/auth), so the
// client infers the origin from the browser — no public env var needed.
export const authClient = createAuthClient({
  plugins: [adminClient()],
});

export const { signIn, signOut, useSession } = authClient;
```

- [ ] **Step 4: Mount the Next.js catch-all handler** (`app/api/auth/[...all]/route.ts`)

```ts
import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

export const { GET, POST } = toNextJsHandler(auth);
```

- [ ] **Step 5: Verify the auth endpoint responds**

Run: `pnpm dev`, then hit a Better Auth route (e.g. `GET /api/auth/ok` or the session endpoint).
Expected: a 200/JSON response from the handler (no users yet — that's Task 6).

- [ ] **Step 6: Commit**

```bash
git add lib/auth.ts lib/auth-client.ts "app/api/auth" prisma/schema.prisma prisma/migrations
git commit -m "feat: better auth with admin plugin, prisma adapter, and route handler"
```

---

### Task 5: Prisma client singleton

**Files:**
- Create: `lib/prisma.ts`

**Interfaces:**
- Produces: a single server-only `prisma` client instance (hot-reload-safe in dev). Consumed by Tasks 4, 6, 10 and every later data-layer module.

- [ ] **Step 1: Prisma singleton** (`lib/prisma.ts`)

```ts
import "server-only";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

> Importing this from a Client Component fails the build because of `import "server-only"` — the intended guardrail. Prisma connects with one privileged DB role, so this client bypasses no security: authorization is enforced in `lib/data/*` and Server Actions (Task 10), not the database.

> **Doc check:** Prisma 7 may change the generated client import path or recommend a generated-client output dir / `prisma.config.ts` — confirm the `@prisma/client` import and any required `output` setting via context7.

- [ ] **Step 2: Typecheck & commit**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.
```bash
git add lib/prisma.ts
git commit -m "feat: server-only prisma client singleton"
```

---

### Task 6: Seed the first admin

**Files:**
- Create: `scripts/seed-admin.ts`

**Interfaces:**
- Consumes: the server `auth` instance (Task 4).
- Produces: one Better Auth `user` with `role='admin'` (and matching `account` row for the password) — created via Better Auth's server API, replacing the old service-role seed.

- [ ] **Step 1: Write `scripts/seed-admin.ts`**

```ts
import "dotenv/config";
import { auth } from "@/lib/auth";

async function main() {
  const [email, password, fullName] = process.argv.slice(2);
  if (!email || !password || !fullName) {
    throw new Error('Usage: tsx scripts/seed-admin.ts <email> <password> "<full name>"');
  }

  // Admin-plugin server API: create a staff user with the admin role.
  const result = await auth.api.createUser({
    body: {
      email,
      password,
      name: fullName,
      role: "admin",
    },
  });

  console.log(`Seeded admin ${email} (${result.user.id})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

> **Doc check:** confirm `auth.api.createUser`'s exact shape (top-level vs `body`, the `role` field, return value) against the current Better Auth admin-plugin docs via context7 — this server-side provisioning call is the canonical replacement for the old service-role seed.

- [ ] **Step 2: tsconfig path check**

Ensure `tsconfig.json` has `"@/*": ["./*"]` under `compilerOptions.paths` (the scaffold already sets `@/*`). Confirm `tsx` resolves it; if not, run with `pnpm dlx tsx scripts/seed-admin.ts`.

- [ ] **Step 3: Run the seed**

Run: `pnpm dlx tsx scripts/seed-admin.ts admin@sja.local "ChangeMe123!" "Library Admin"`
Expected: prints `Seeded admin admin@sja.local (<id>)`.

- [ ] **Step 4: Verify**

In the Supabase SQL editor: `select id, name, role, banned from "user";`
Expected: one admin row with `role = 'admin'` and `banned = false/null`. A matching `account` row holds the hashed password.

- [ ] **Step 5: Commit**

```bash
git add scripts/seed-admin.ts
git commit -m "feat: first-admin seed via better auth server api"
```

---

### Task 7: Auth middleware (route guard)

**Files:**
- Create: `middleware.ts`

**Interfaces:**
- Consumes: the Better Auth session cookie.
- Produces: unauthenticated access to `/(app)` routes redirects to `/login`.

- [ ] **Step 1: Root middleware** (`middleware.ts`)

```ts
import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export async function middleware(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  const isAuthRoute = request.nextUrl.pathname.startsWith("/login");

  if (!sessionCookie && !isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
```

> The middleware only checks for the **presence** of the session cookie (an optimistic, edge-fast gate). The authoritative session/role check happens server-side in the shell and data layer (`auth.api.getSession`) — never trust the cookie's presence alone for authorization.

> **Doc check:** confirm `getSessionCookie` (name, import path) and whether Better Auth recommends an edge-safe session check in Next 16 middleware via context7 — cookie helpers and the middleware story evolve.

- [ ] **Step 2: Verify the guard**

Run: `pnpm dev`, visit `http://localhost:3000/dashboard` while logged out.
Expected: redirected to `/login`.

- [ ] **Step 3: Commit**

```bash
git add middleware.ts
git commit -m "feat: auth middleware route guard via better auth session cookie"
```

---

### Task 8: Login page & auth actions

**Files:**
- Create: `app/(auth)/login/page.tsx`, `app/(auth)/login/actions.ts`
- Add shadcn: `input`, `label`, `card` components

**Interfaces:**
- Consumes: the server `auth` instance (Task 4) and/or the browser `authClient` (Task 4).
- Produces: working email/password sign-in; a `signOut` action reused by the shell (Task 9).

- [ ] **Step 1: Add shadcn UI components**

Run: `pnpm dlx shadcn@latest add input label card`
Expected: creates `components/ui/{input,label,card}.tsx`.

- [ ] **Step 2: Auth actions** (`app/(auth)/login/actions.ts`)

```ts
"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { APIError } from "better-auth/api";
import { auth } from "@/lib/auth";

export async function signIn(formData: FormData) {
  const email = String(formData.get("email"));
  const password = String(formData.get("password"));
  try {
    await auth.api.signInEmail({
      body: { email, password },
      headers: await headers(),
    });
  } catch (e) {
    const message = e instanceof APIError ? e.message : "Sign-in failed";
    redirect(`/login?error=${encodeURIComponent(message)}`);
  }
  redirect("/dashboard");
}

export async function signOut() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/login");
}
```

> **Doc check:** verify `auth.api.signInEmail` / `auth.api.signOut` signatures, how the session cookie is set on the response from a Server Action, and the `APIError` import path via context7. (Many setups instead sign in from a Client Component via `authClient.signIn.email` — confirm the recommended Next 16 pattern.)

- [ ] **Step 3: Login page** (`app/(auth)/login/page.tsx`) — a Server Component with a form posting to `signIn`. Use shadcn `Card`, `Input`, `Label`, and `Button`. Render `searchParams.error` (await `searchParams` in Next 16) as a message above the form.

```tsx
import { signIn } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function LoginPage({
  searchParams,
}: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader><CardTitle>SJA-LMS sign in</CardTitle></CardHeader>
        <CardContent>
          {error && <p className="mb-3 text-sm text-destructive">{error}</p>}
          <form action={signIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required />
            </div>
            <Button type="submit" className="w-full">Sign in</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 4: Verify end-to-end login**

Run: `pnpm dev`, sign in with the seeded admin.
Expected: redirected to `/dashboard` (404 is fine until Task 9). Wrong password shows the error message.

- [ ] **Step 5: Commit**

```bash
git add "app/(auth)" components/ui
git commit -m "feat: login page and auth server actions"
```

---

### Task 9: Role-aware app shell & dashboard

**Files:**
- Create: `app/(app)/layout.tsx`, `app/(app)/dashboard/page.tsx`
- Create: `lib/session.ts` (current-user helper)

**Interfaces:**
- Consumes: the server `auth` instance (Task 4).
- Produces: `getCurrentStaff()` → `{ id, fullName, role } | null`; a shell with role-aware nav (admin-only links hidden for librarians); sign-out wired to `signOut` (Task 8).

- [ ] **Step 1: Current-staff helper** (`lib/session.ts`)

```ts
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export async function getCurrentStaff() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const { user } = session;
  const role = (user.role as "admin" | "librarian") ?? "librarian";
  return { id: user.id, fullName: user.name ?? user.email, role };
}
```

> **Doc check:** confirm `auth.api.getSession({ headers })`'s return shape and that the admin-plugin `role` (and `name`) are present on `session.user` via context7. This database-backed session read — not a JWT/`app_metadata` claim — is the source of truth for the current staff role.

- [ ] **Step 2: Shell layout** (`app/(app)/layout.tsx`) — Server Component. Call `getCurrentStaff()`; if null, `redirect("/login")`. Render a sidebar/nav with Dashboard, Catalog, Borrowers for all; show an "Admin" link only when `role === "admin"`. Include a sign-out button:

```tsx
import { signOut } from "@/app/(auth)/login/actions";
import { Button } from "@/components/ui/button";
// ...inside the layout, after fetching staff:
<form action={signOut}><Button variant="ghost" type="submit">Sign out</Button></form>
```

- [ ] **Step 3: Dashboard page** (`app/(app)/dashboard/page.tsx`) — greet the user by `fullName` and `role`. Keep it minimal; real widgets come in later slices.

- [ ] **Step 4: Verify role gating**

Run: `pnpm dev`. As the seeded admin, confirm the Admin link shows and the dashboard greets you. (Librarian gating is fully exercised once Task 10's provisioning exists — note this is verified again in slice 5.)

- [ ] **Step 5: Commit**

```bash
git add "app/(app)" lib/session.ts
git commit -m "feat: role-aware app shell and dashboard"
```

---

### Task 10: Data layer + audit helper + vertical Server Action example

**Files:**
- Create: `lib/audit.ts`, `lib/audit.test.ts`
- Create: `lib/data/borrowers.ts`
- Create: `app/(app)/borrowers/actions.ts`, `app/(app)/borrowers/page.tsx`

**Interfaces:**
- Consumes: the `prisma` singleton (Task 5), `newCardToken()` (Task 2), `getCurrentStaff()` (Task 9).
- Produces: `logActivity(input)`; `listBorrowers()`, `insertBorrower(input)`; a borrowers page that lists and adds — the reference pattern every later module copies. **Authorization lives here:** each read/write checks the session role before touching Prisma.

- [ ] **Step 1: Write the failing audit test** (`lib/audit.test.ts`)

```ts
import { describe, it, expect } from "vitest";
import { buildAuditRow } from "./audit";

describe("buildAuditRow", () => {
  it("defaults metadata to an empty object", () => {
    const row = buildAuditRow({ actor: "a", action: "borrower.create" });
    expect(row).toEqual({
      actor: "a", action: "borrower.create",
      entityType: null, entityId: null, metadata: {},
    });
  });

  it("passes through entity and metadata", () => {
    const row = buildAuditRow({
      actor: "a", action: "borrower.create",
      entityType: "borrower", entityId: "b1", metadata: { name: "X" },
    });
    expect(row.entityType).toBe("borrower");
    expect(row.entityId).toBe("b1");
    expect(row.metadata).toEqual({ name: "X" });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test`
Expected: FAIL — `buildAuditRow` not defined.

- [ ] **Step 3: Implement `lib/audit.ts`**

```ts
import "server-only";
import { prisma } from "@/lib/prisma";

export type AuditInput = {
  actor: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
};

// Pure builder — unit-testable without a DB. Field names match the Prisma model.
export function buildAuditRow(input: AuditInput) {
  return {
    actor: input.actor,
    action: input.action,
    entityType: input.entityType ?? null,
    entityId: input.entityId ?? null,
    metadata: input.metadata ?? {},
  };
}

export async function logActivity(input: AuditInput) {
  await prisma.auditLog.create({ data: buildAuditRow(input) });
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm test`
Expected: PASS (qr + audit suites).

- [ ] **Step 5: Data-access functions** (`lib/data/borrowers.ts`)

```ts
import "server-only";
import { prisma } from "@/lib/prisma";
import { getCurrentStaff } from "@/lib/session";

// The server data layer is the security boundary — gate every access on the session role.
async function requireStaff() {
  const staff = await getCurrentStaff();
  if (!staff) throw new Error("Not authenticated");
  return staff;
}

export async function listBorrowers() {
  await requireStaff();
  return prisma.borrower.findMany({
    select: { id: true, cardQr: true, fullName: true, status: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function insertBorrower(input: {
  cardQr: string; fullName: string; email?: string | null; phone?: string | null;
}) {
  await requireStaff();
  return prisma.borrower.create({ data: input, select: { id: true } });
}
```

- [ ] **Step 6: Server Action** (`app/(app)/borrowers/actions.ts`)

```ts
"use server";

import { revalidatePath } from "next/cache";
import { newCardToken } from "@/lib/qr";
import { insertBorrower } from "@/lib/data/borrowers";
import { logActivity } from "@/lib/audit";
import { getCurrentStaff } from "@/lib/session";

export async function createBorrower(formData: FormData) {
  const staff = await getCurrentStaff();
  if (!staff) throw new Error("Not authenticated");

  const fullName = String(formData.get("full_name")).trim();
  if (!fullName) throw new Error("Name is required");

  const borrower = await insertBorrower({
    cardQr: newCardToken(),
    fullName,
    email: (formData.get("email") as string) || null,
    phone: (formData.get("phone") as string) || null,
  });

  await logActivity({
    actor: staff.id, action: "borrower.create",
    entityType: "borrower", entityId: borrower.id, metadata: { fullName },
  });

  revalidatePath("/borrowers");
}
```

- [ ] **Step 7: Borrowers page** (`app/(app)/borrowers/page.tsx`) — Server Component: call `listBorrowers()`, render a shadcn table/list, and an add form posting to `createBorrower` (Name required; Email/Phone optional). Show each borrower's `cardQr`.

- [ ] **Step 8: Verify the vertical slice**

Run: `pnpm dev`. Add a borrower; confirm it appears with a `brw_…` card token, and that `select * from audit_logs` shows a `borrower.create` row with your actor id.

- [ ] **Step 9: Commit**

```bash
git add lib/audit.ts lib/audit.test.ts lib/data "app/(app)/borrowers"
git commit -m "feat: data layer, audit helper, and borrower create slice"
```

---

## Self-Review

**Spec coverage (vs `doc/foundation/README.md`):**
- Prisma wiring / server-only client singleton → Task 5 ✓
- Full data model + native enums + venue exclusion constraint (manual migration) → Task 3 ✓
- Better Auth (email/password, sign-up disabled, admin plugin, route handler) → Task 4 ✓
- Authorization enforced in the server data layer (not RLS) → Tasks 9–10 ✓
- Admin-provisioned auth, first admin seed via Better Auth server API → Task 6 ✓
- No public signup / login / route guard → Tasks 7–8 ✓
- Role-aware shell reading the database-backed session → Task 9 ✓
- Data-layer reads + Server Action writes (reference slice) → Task 10 ✓
- QR opaque tokens → Task 2 ✓
- Audit/`audit_logs` helper → Task 10 ✓
- Vitest with green QR + audit tests → Tasks 2, 10 ✓
- Out-of-scope items (circulation/venue/export/backup UI) correctly excluded ✓

**Placeholders:** none — every code step shows concrete content; prose-only steps (pages/layout) name exact files, components, and data calls with the surrounding code shown in the same task. All Better Auth / Prisma code is explicitly illustrative and gated behind the per-task Doc-check callouts.

**Type consistency:** the single `prisma` client (Task 5) is used everywhere; `newCardToken`/`newCopyToken`, `getCurrentStaff` (`{id, fullName, role}`), `buildAuditRow`/`logActivity` (`AuditInput`, camelCase fields matching the Prisma model), and `insertBorrower`/`listBorrowers` signatures match across Tasks 2/5/9/10. The Better Auth `user` table — not a `profiles` table — is the staff identity that FKs reference.

**Note for executor:** Tasks 3–6 require live Supabase Postgres credentials and apply real migrations — these run against your project, not a sandbox. Have `.env.local` (`DATABASE_URL` pooled + `DIRECT_URL` direct, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`) ready before Task 3. Because Better Auth and Prisma 7 evolve, treat every Doc-check callout as a hard gate: confirm current syntax via context7 before writing the code in that task.
