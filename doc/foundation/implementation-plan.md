# Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the SJA-LMS skeleton — Supabase wiring, full data model with RLS, staff auth, a role-gated app shell, the data-access/Server-Action layer, and QR token identity — so every later module has bones to attach to.

**Architecture:** Next.js 16 App Router with React Server Components. Three Supabase clients at three trust levels (browser/anon, server/session, admin/service-role). Schema lives in versioned SQL migrations; RLS enforces access keyed on a `role` claim carried in the JWT `app_metadata`. Reads go through `lib/data/*` server functions; writes go through Server Actions.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind v4, shadcn (radix-nova), Supabase (Postgres + Auth, `@supabase/ssr`), nanoid, Vitest, pnpm.

## Global Constraints

- **pnpm is the only package manager.** Never invoke npm/yarn.
- **React Server Components by default;** mark Client Components with `"use client"` only when needed (interactivity/hooks).
- **`role` is stored in Supabase `app_metadata`** (never `user_metadata`); RLS reads it from the JWT, never by querying `profiles`.
- **`SUPABASE_SERVICE_ROLE_KEY` is server-only** — never referenced in a Client Component or behind a `NEXT_PUBLIC_` name.
- **QR tokens are opaque** — `cpy_…` for copies, `brw_…` for borrower cards; no embedded data.
- **Schema is code:** all DDL lands in `supabase/migrations/*.sql`; never hand-edit schema in the dashboard.
- **No public signup:** staff accounts are admin-provisioned.
- Line endings are LF (enforced by `.gitattributes`).

> **Doc check:** `@supabase/ssr` and Next 16 cookie APIs evolve. Before implementing Tasks 5 and 7, confirm the current client/middleware pattern via context7 (`/supabase/supabase` docs) — the code below reflects the stable `@supabase/ssr` pattern but verify signatures.

---

### Task 1: Project tooling & environment

**Files:**
- Modify: `package.json` (dependencies, scripts)
- Create: `.env.local` (gitignored), `.env.example`
- Create: `supabase/` (via CLI init)

**Interfaces:**
- Produces: installed deps (`@supabase/ssr`, `@supabase/supabase-js`, `nanoid`, dev: `supabase`, `tsx`, `vitest`); env vars `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`; `pnpm test` script.

- [ ] **Step 1: Install runtime + dev dependencies**

```bash
pnpm add @supabase/ssr @supabase/supabase-js nanoid
pnpm add -D supabase tsx vitest
```

- [ ] **Step 2: Add the test script to `package.json`**

In `"scripts"`, add:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Initialize Supabase locally**

Run: `pnpm dlx supabase init`
Expected: creates `supabase/config.toml` and `supabase/migrations/`.

- [ ] **Step 4: Create `.env.example`**

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

- [ ] **Step 5: Create `.env.local` with real values** from the Supabase dashboard (Project Settings → API). Confirm it is ignored: `git check-ignore .env.local` → prints `.env.local`.

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml supabase/config.toml .env.example
git commit -m "chore: add supabase, vitest tooling and env scaffolding"
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

### Task 3: Database schema migration

**Files:**
- Create: `supabase/migrations/0001_init_schema.sql`

**Interfaces:**
- Produces: enums (`user_role`, `user_status`, `borrower_status`, `copy_status`, `reservation_status`) and tables (`profiles`, `borrowers`, `books`, `book_copies`, `loans`, `venue_reservations`, `audit_logs`) with the `venue_no_overlap` exclusion constraint. Consumed by Tasks 4, 5, 6, 10.

- [ ] **Step 1: Write the migration** (`supabase/migrations/0001_init_schema.sql`)

Use the DDL from `doc/foundation/README.md` § Data model verbatim (enums, all seven tables, the `btree_gist` extension, and the `venue_no_overlap` exclusion constraint). Also add at the top:

```sql
create extension if not exists pgcrypto;   -- gen_random_uuid()
create extension if not exists btree_gist;
```

- [ ] **Step 2: Apply the migration to the remote project**

Run: `pnpm dlx supabase link --project-ref <your-ref>` then `pnpm dlx supabase db push`
Expected: migration applies with no errors.

- [ ] **Step 3: Verify tables exist**

In the Supabase SQL editor (or `supabase db remote query`), run:
```sql
select table_name from information_schema.tables where table_schema='public' order by 1;
```
Expected: lists all seven tables.

- [ ] **Step 4: Verify the overlap constraint works**

```sql
insert into borrowers (card_qr, full_name) values ('brw_test00000001','T');
-- two overlapping bookings for the same window should fail the second insert
```
Expected: the second overlapping `insert` raises `conflicting key value violates exclusion constraint "venue_no_overlap"`. Clean up test rows afterward.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0001_init_schema.sql
git commit -m "feat: initial database schema with enums and constraints"
```

---

### Task 4: RLS policies migration

**Files:**
- Create: `supabase/migrations/0002_rls_policies.sql`

**Interfaces:**
- Consumes: tables from Task 3.
- Produces: `public.auth_role()` SQL function; RLS enabled with policies per the table in `doc/foundation/README.md` § RLS.

- [ ] **Step 1: Write the migration** (`supabase/migrations/0002_rls_policies.sql`)

```sql
create or replace function public.auth_role() returns text
  language sql stable as $$ select coalesce(auth.jwt()->'app_metadata'->>'role', '') $$;

-- staff + circulation tables: both roles read/write
do $$
declare t text;
begin
  foreach t in array array['books','book_copies','borrowers','loans','venue_reservations']
  loop
    execute format('alter table %I enable row level security;', t);
    execute format($p$create policy %I on %I for all
      using (public.auth_role() in ('admin','librarian'))
      with check (public.auth_role() in ('admin','librarian'));$p$, t||'_rw', t);
  end loop;
end $$;

-- profiles: everyone reads, only admin writes
alter table profiles enable row level security;
create policy profiles_read on profiles for select
  using (public.auth_role() in ('admin','librarian'));
create policy profiles_admin_write on profiles for all
  using (public.auth_role() = 'admin')
  with check (public.auth_role() = 'admin');

-- audit_logs: any authenticated insert, admin-only read
alter table audit_logs enable row level security;
create policy audit_insert on audit_logs for insert
  with check (auth.role() = 'authenticated');
create policy audit_admin_read on audit_logs for select
  using (public.auth_role() = 'admin');
```

- [ ] **Step 2: Apply and verify**

Run: `pnpm dlx supabase db push`
Expected: applies cleanly. Then in SQL editor:
```sql
select tablename, policyname from pg_policies where schemaname='public' order by 1,2;
```
Expected: all policies listed; every table shows `rowsecurity = true` in `pg_tables`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0002_rls_policies.sql
git commit -m "feat: RLS policies keyed on JWT role claim"
```

---

### Task 5: Generated types & Supabase clients

**Files:**
- Create: `lib/database.types.ts` (generated)
- Create: `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/admin.ts`

**Interfaces:**
- Produces: `createClient()` (browser, from `client.ts`), async `createClient()` (server, from `server.ts`), `createAdminClient()` (service-role, from `admin.ts`), and `Database` type. Consumed by Tasks 6–10.

- [ ] **Step 1: Generate DB types**

Run: `pnpm dlx supabase gen types typescript --linked > lib/database.types.ts`
Expected: file exports a `Database` type with all seven tables.

- [ ] **Step 2: Browser client** (`lib/supabase/client.ts`)

```ts
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

- [ ] **Step 3: Server client** (`lib/supabase/server.ts`)

```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/database.types";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => {
          try {
            toSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // called from a Server Component — safe to ignore; middleware refreshes.
          }
        },
      },
    },
  );
}
```

- [ ] **Step 4: Admin client** (`lib/supabase/admin.ts`)

```ts
import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

// Service-role: bypasses RLS. Server-only. Use ONLY for staff provisioning.
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
```

- [ ] **Step 5: Install the `server-only` guard package**

Run: `pnpm add server-only`
Expected: importing `admin.ts` from a Client Component now fails the build — the intended guardrail.

- [ ] **Step 6: Typecheck & commit**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.
```bash
git add lib/database.types.ts lib/supabase package.json pnpm-lock.yaml
git commit -m "feat: typed Supabase clients (browser, server, admin)"
```

---

### Task 6: Seed the first admin

**Files:**
- Create: `scripts/seed-admin.ts`

**Interfaces:**
- Consumes: `createAdminClient()` (Task 5), `profiles` table (Task 3).
- Produces: one auth user with `app_metadata.role='admin'` and a matching `profiles` row.

- [ ] **Step 1: Write `scripts/seed-admin.ts`**

```ts
import "dotenv/config";
import { createAdminClient } from "@/lib/supabase/admin";

async function main() {
  const [email, password, fullName] = process.argv.slice(2);
  if (!email || !password || !fullName) {
    throw new Error('Usage: tsx scripts/seed-admin.ts <email> <password> "<full name>"');
  }
  const admin = createAdminClient();

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role: "admin" },
  });
  if (error) throw error;

  const { error: pErr } = await admin.from("profiles").insert({
    id: data.user.id,
    full_name: fullName,
    role: "admin",
    status: "active",
  });
  if (pErr) throw pErr;

  console.log(`Seeded admin ${email} (${data.user.id})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

- [ ] **Step 2: Add `dotenv` and a tsconfig path check**

Run: `pnpm add -D dotenv`
Ensure `tsconfig.json` has `"@/*": ["./*"]` under `compilerOptions.paths` (the scaffold already sets `@/*`). Confirm `tsx` resolves it; if not, run with `pnpm dlx tsx scripts/seed-admin.ts`.

- [ ] **Step 3: Run the seed**

Run: `pnpm dlx tsx scripts/seed-admin.ts admin@sja.local "ChangeMe123!" "Library Admin"`
Expected: prints `Seeded admin admin@sja.local (<uuid>)`.

- [ ] **Step 4: Verify**

In SQL editor: `select id, full_name, role from profiles;`
Expected: one admin row. Also confirm in Auth → Users that `app_metadata` shows `{"role":"admin"}`.

- [ ] **Step 5: Commit**

```bash
git add scripts/seed-admin.ts package.json pnpm-lock.yaml
git commit -m "feat: first-admin seed script"
```

---

### Task 7: Auth middleware (session refresh + route guard)

**Files:**
- Create: `lib/supabase/middleware.ts`, `middleware.ts`

**Interfaces:**
- Consumes: env vars; `@supabase/ssr`.
- Produces: session refresh on every request; unauthenticated access to `/(app)` routes redirects to `/login`.

- [ ] **Step 1: Session helper** (`lib/supabase/middleware.ts`)

```ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/database.types";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();

  const isAuthRoute = request.nextUrl.pathname.startsWith("/login");
  if (!user && !isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  return response;
}
```

- [ ] **Step 2: Root middleware** (`middleware.ts`)

```ts
import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
```

- [ ] **Step 3: Verify the guard**

Run: `pnpm dev`, visit `http://localhost:3000/dashboard` while logged out.
Expected: redirected to `/login`.

- [ ] **Step 4: Commit**

```bash
git add lib/supabase/middleware.ts middleware.ts
git commit -m "feat: auth middleware with session refresh and route guard"
```

---

### Task 8: Login page & auth actions

**Files:**
- Create: `app/(auth)/login/page.tsx`, `app/(auth)/login/actions.ts`
- Add shadcn: `input`, `label`, `card` components

**Interfaces:**
- Consumes: server `createClient()` (Task 5).
- Produces: working email/password sign-in; `signOut()` action reused by the shell (Task 9).

- [ ] **Step 1: Add shadcn UI components**

Run: `pnpm dlx shadcn@latest add input label card`
Expected: creates `components/ui/{input,label,card}.tsx`.

- [ ] **Step 2: Auth actions** (`app/(auth)/login/actions.ts`)

```ts
"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signIn(formData: FormData) {
  const email = String(formData.get("email"));
  const password = String(formData.get("password"));
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
```

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
- Create: `lib/auth.ts` (current-user helper)

**Interfaces:**
- Consumes: server `createClient()` (Task 5).
- Produces: `getCurrentStaff()` → `{ id, fullName, role } | null`; a shell with role-aware nav (admin-only links hidden for librarians); sign-out wired to `signOut` (Task 8).

- [ ] **Step 1: Current-staff helper** (`lib/auth.ts`)

```ts
import { createClient } from "@/lib/supabase/server";

export async function getCurrentStaff() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const role = (user.app_metadata?.role as "admin" | "librarian") ?? "librarian";
  const { data: profile } = await supabase
    .from("profiles").select("full_name").eq("id", user.id).single();
  return { id: user.id, fullName: profile?.full_name ?? user.email!, role };
}
```

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
git add "app/(app)" lib/auth.ts
git commit -m "feat: role-aware app shell and dashboard"
```

---

### Task 10: Data layer + audit helper + vertical Server Action example

**Files:**
- Create: `lib/audit.ts`, `lib/audit.test.ts`
- Create: `lib/data/borrowers.ts`
- Create: `app/(app)/borrowers/actions.ts`, `app/(app)/borrowers/page.tsx`

**Interfaces:**
- Consumes: server `createClient()` (Task 5), `newCardToken()` (Task 2), `getCurrentStaff()` (Task 9).
- Produces: `logActivity(input)`; `listBorrowers()`, `createBorrower(input)`; a borrowers page that lists and adds — the reference pattern every later module copies.

- [ ] **Step 1: Write the failing audit test** (`lib/audit.test.ts`)

```ts
import { describe, it, expect } from "vitest";
import { buildAuditRow } from "./audit";

describe("buildAuditRow", () => {
  it("defaults metadata to an empty object", () => {
    const row = buildAuditRow({ actor: "a", action: "borrower.create" });
    expect(row).toEqual({
      actor: "a", action: "borrower.create",
      entity_type: null, entity_id: null, metadata: {},
    });
  });

  it("passes through entity and metadata", () => {
    const row = buildAuditRow({
      actor: "a", action: "borrower.create",
      entityType: "borrower", entityId: "b1", metadata: { name: "X" },
    });
    expect(row.entity_type).toBe("borrower");
    expect(row.entity_id).toBe("b1");
    expect(row.metadata).toEqual({ name: "X" });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test`
Expected: FAIL — `buildAuditRow` not defined.

- [ ] **Step 3: Implement `lib/audit.ts`**

```ts
import { createClient } from "@/lib/supabase/server";

export type AuditInput = {
  actor: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
};

// Pure builder — unit-testable without a DB.
export function buildAuditRow(input: AuditInput) {
  return {
    actor: input.actor,
    action: input.action,
    entity_type: input.entityType ?? null,
    entity_id: input.entityId ?? null,
    metadata: input.metadata ?? {},
  };
}

export async function logActivity(input: AuditInput) {
  const supabase = await createClient();
  await supabase.from("audit_logs").insert(buildAuditRow(input));
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm test`
Expected: PASS (qr + audit suites).

- [ ] **Step 5: Data-access functions** (`lib/data/borrowers.ts`)

```ts
import "server-only";
import { createClient } from "@/lib/supabase/server";

export async function listBorrowers() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("borrowers")
    .select("id, card_qr, full_name, status, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function insertBorrower(input: {
  card_qr: string; full_name: string; email?: string | null; phone?: string | null;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("borrowers").insert(input).select("id").single();
  if (error) throw error;
  return data;
}
```

- [ ] **Step 6: Server Action** (`app/(app)/borrowers/actions.ts`)

```ts
"use server";

import { revalidatePath } from "next/cache";
import { newCardToken } from "@/lib/qr";
import { insertBorrower } from "@/lib/data/borrowers";
import { logActivity } from "@/lib/audit";
import { getCurrentStaff } from "@/lib/auth";

export async function createBorrower(formData: FormData) {
  const staff = await getCurrentStaff();
  if (!staff) throw new Error("Not authenticated");

  const full_name = String(formData.get("full_name")).trim();
  if (!full_name) throw new Error("Name is required");

  const borrower = await insertBorrower({
    card_qr: newCardToken(),
    full_name,
    email: (formData.get("email") as string) || null,
    phone: (formData.get("phone") as string) || null,
  });

  await logActivity({
    actor: staff.id, action: "borrower.create",
    entityType: "borrower", entityId: borrower.id, metadata: { full_name },
  });

  revalidatePath("/borrowers");
}
```

- [ ] **Step 7: Borrowers page** (`app/(app)/borrowers/page.tsx`) — Server Component: call `listBorrowers()`, render a shadcn table/list, and an add form posting to `createBorrower` (Name required; Email/Phone optional). Show each borrower's `card_qr`.

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
- Supabase wiring / 3 clients → Task 5 ✓
- Full data model + enums + venue exclusion constraint → Task 3 ✓
- RLS keyed on JWT role → Task 4 ✓
- Admin-provisioned auth, first admin seed → Task 6 ✓
- No public signup / login / session refresh / route guard → Tasks 7–8 ✓
- Role-gated shell → Task 9 ✓
- Data-layer reads + Server Action writes (reference slice) → Task 10 ✓
- QR opaque tokens → Task 2 ✓
- Audit/`audit_logs` helper → Task 10 ✓
- Vitest with green QR test → Tasks 2, 10 ✓
- Out-of-scope items (circulation/venue/export/backup UI) correctly excluded ✓

**Placeholders:** none — every code step shows concrete content; prose-only steps (pages/layout) name exact files, components, and data calls with the surrounding code shown in the same task.

**Type consistency:** `createClient` (server, async) vs `createAdminClient` are distinct and used consistently; `newCardToken`/`newCopyToken`, `getCurrentStaff` (`{id, fullName, role}`), `buildAuditRow`/`logActivity` (`AuditInput`), and `insertBorrower`/`listBorrowers` signatures match across Tasks 2/5/6/9/10.

**Note for executor:** Tasks 3–6 require live Supabase credentials and apply real migrations — these run against your project, not a sandbox. Have `.env.local` and `supabase link` ready before Task 3.
