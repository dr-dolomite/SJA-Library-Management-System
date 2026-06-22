# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**SJA-LMS** — an internal library management system for library staff. There are only **two
user roles** and **no public-facing accounts**:

- **Librarian** — daily driver: catalog, borrowers, circulation, venue reservations, exports.
- **Admin** — staff/user management and audit ("debug") logs, plus everything a librarian can do.

The app is **two modules over one shared core**:

1. **Book circulation** — borrow / return of physical book copies (the app's heart).
2. **Venue reservation** — booking the library itself (whole building, time ranges only — no rooms).

Shared core: the catalog, the borrowers, the staff/auth, and a QR identity layer.

> **Borrowers are records, not users.** Patrons never log in. Only librarians and admins
> authenticate. A librarian records borrows and venue bookings on a patron's behalf.

**Planned outputs** the system produces: printable **QR labels** (copies + borrower cards),
**CSV/Excel exports** (borrowing history, borrowers, catalog, etc.) for both roles, and
**scheduled local database backups** (`pg_dump`).

**Scope & limitations** (deliberate boundaries — don't design past them without asking):

- Internal tool only; two roles, no public access, no self-service patron portal.
- **QR scanning is online-only** — tokens are opaque, so every scan needs a live DB lookup.
- Venue reservation is **the whole library as one bookable unit** (time ranges), no rooms/capacity.
- **No fines or monetary tracking** on loans (due dates / overdue visibility only).
- Book cover images are out of scope for now (possible later via Supabase Storage; QR stays strings).
- The backup daemon is **local** and assumes a stable schema (built last).

## Documentation convention

CLAUDE.md is the **index** — keep it concise and whole-project. Deep detail does **not** live here.
Each feature's full design, schema, and usage live in **`doc/<feature>/`** (see `doc/README.md`).
When a feature ships, add a one-line reference under "Build order" pointing to its `doc/` folder;
put the depth in `doc/`, not here.

## Design Context

Strategic design intent lives in **`PRODUCT.md`** (root). Register: **product** (design serves
the task — the tool disappears). Personality: **efficient, calm, trustworthy**. Principles: the
tool disappears, one state of truth shown plainly, earned familiarity over novelty, density with
breathing room, trust through consistency. Bar: **WCAG 2.1 AA**, **fully responsive** (desktop
desk + tablet shelf-scanning + phone lookups). Anti-references: dated gov/library software,
generic AI-SaaS templates, heavy enterprise. Visual system (`DESIGN.md`) is deferred until the
first real surface commits a brand color — branding stays at shadcn defaults until then.

## Stack

Next.js 16 (App Router, **React Server Components**), React 19, TypeScript, Tailwind v4,
**shadcn** (`radix-nova` style, `neutral` base — see `components.json`), **Supabase** (Postgres +
Auth), **pnpm**. Branding is intentionally left at shadcn defaults; Impeccable branding is wired
manually later.

## Commands

```bash
pnpm install        # pnpm is the ONLY package manager — do not use npm/yarn
pnpm dev            # dev server at http://localhost:3000
pnpm build          # production build
pnpm start          # serve the production build
pnpm lint           # eslint (eslint-config-next)
```

Tests use **Vitest** (`pnpm test`, `pnpm test <file>` for one) — add it when the first
testable unit lands; it is not installed yet.

## Architecture (the rules that matter)

**UI prefers shadcn.** Use existing shadcn components; only hand-roll a component when shadcn
has no equivalent. Add components via the shadcn CLI, don't paste them by hand.

**Three Supabase clients, three trust levels** — keep them in separate files so the dangerous
one can't leak into the browser:
- `lib/supabase/client.ts` — browser, anon key, RLS-bound.
- `lib/supabase/server.ts` — per-request server client (reads the user's session cookie), RLS-bound.
- `lib/supabase/admin.ts` — **service-role, server-only, bypasses RLS**. Used only to provision
  staff accounts. The service-role key must never be exposed to a Client Component or `NEXT_PUBLIC_*`.

**Reads vs writes boundary** — pages never embed raw queries:
- **Reads** live in server-only data-access functions under `lib/data/*` and are called from
  Server Components.
- **Writes** go through **Server Actions** (`app/**/actions.ts`) that call those same functions.

**The database is the security boundary, not the UI.** Role-gated navigation is UX only. Access
is enforced by **Row Level Security** keyed on the `role` claim in the JWT (stored in Supabase
`app_metadata`, never `user_metadata`). RLS reads role *from the JWT*, not by querying `profiles`,
to avoid policy recursion.

**Auth is admin-provisioned** — there is no public signup. The first admin is seeded; admins
create further staff from the admin module.

**Schema is code.** `supabase/migrations/*.sql` is the source of truth (managed via the Supabase
CLI), and TypeScript DB types are generated with `supabase gen types` so they can't drift. Do not
hand-edit schema in the Supabase dashboard.

## Data model essentials

The one modeling decision everything depends on: **a book title and a physical copy are separate
entities.** `books` holds titles; `book_copies` holds the physical objects (one row per copy). You
borrow a *copy*, not a *title*.

**QR codes are opaque strings**, carried by `book_copies` (`cpy_…`) and borrower cards (`brw_…`).
Each scan is a single DB lookup — the app is a translator, the database stores only tokens. No
data is encoded in the QR itself.

Other core tables: `profiles` (staff + role), `borrowers`, `loans`, `venue_reservations`
(overlap-prevented at the DB level), `audit_logs` (the admin "debug logs" view).

## Build order

Built slice by slice, not all at once: **(1) Foundation** — auth, schema, role-gated shell, data
layer, QR tokens → **(2) Circulation** → **(3) Venue reservation** → **(4) CSV/Excel export** →
**(5) Admin: user management + audit logs** → **(6) Local backup daemon** (`pg_dump` on a schedule).

## Conventions

- **pnpm only.** All scripts and docs assume pnpm.
- **Env:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (public);
  `SUPABASE_SERVICE_ROLE_KEY` (server-only). Live in `.env.local`.
- Aliases (`components.json`): `@/components`, `@/components/ui`, `@/lib`, `@/lib/utils`, `@/hooks`.

## Current state

Fresh `create-next-app` scaffold: `app/` (layout + page), one shadcn component
(`components/ui/button.tsx`), `lib/utils.ts`. Supabase, the data layer, migrations, and tests do
not exist yet — the architecture above is the agreed target, not yet built. Foundation is
specced and planned in `doc/foundation/` (design + implementation plan), not yet implemented.
