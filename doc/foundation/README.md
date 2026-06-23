# Foundation

The first slice. It builds the skeleton every later module hangs on: **Supabase wiring, the full
data model, staff auth + RLS, the role-gated app shell, the data-access layer, and QR token
identity.** No circulation/venue/export/admin *flows* yet — just the bones they attach to.

> CLAUDE.md is the project index. This file is the depth for Foundation. Date: 2026-06-23.

## Deliverables (definition of done)

- Supabase project connected; three typed clients in `lib/supabase/`.
- All tables created via a versioned migration, RLS enabled, policies in place.
- First admin seeded; login works; `(app)/*` requires a session; `(app)/admin/*` requires `admin`.
- `lib/data/*` read functions + a Server Action write pattern established (with one real example
  each, e.g. create a borrower).
- QR token generator (`lib/qr.ts`) producing unique `cpy_…` / `brw_…` tokens.
- `logActivity()` audit helper writing to `audit_logs`.
- Vitest installed with at least the QR-token unit test green.

**Out of scope here:** borrow/return UI, venue booking UI, exports, the backup daemon. Those are
later slices.

## Tech decisions

- **Schema is code:** `supabase/migrations/*.sql` is the source of truth (Supabase CLI). DB types
  generated via `supabase gen types typescript` into `lib/database.types.ts`.
- **Role lives in `app_metadata`** (admin-controlled, rides in the JWT). RLS reads it *from the
  JWT*, never by querying `profiles` — avoids policy recursion.
- **Opaque QR tokens** generated app-side with a prefixed nanoid; stored `unique not null`.
- **Venue double-booking is prevented in the DB** with a `gist` exclusion constraint.

## Data model

Enums:

```sql
create type user_role        as enum ('admin', 'librarian');
create type user_status      as enum ('active', 'disabled');
create type borrower_status  as enum ('active', 'inactive');
create type copy_status      as enum ('available', 'borrowed', 'lost', 'maintenance');
create type reservation_status as enum ('booked', 'cancelled', 'completed');
```

Tables (sketch — final column types refined during implementation):

```sql
-- staff mirror of auth.users (role duplicated here from app_metadata for UI listing)
create table profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text not null,
  role       user_role not null,
  status     user_status not null default 'active',
  created_at timestamptz not null default now()
);

create table borrowers (
  id         uuid primary key default gen_random_uuid(),
  card_qr    text unique not null,            -- "brw_…"
  full_name  text not null,
  email      text,
  phone      text,
  status     borrower_status not null default 'active',
  created_at timestamptz not null default now()
);

create table books (                          -- titles
  id             uuid primary key default gen_random_uuid(),
  isbn           text,
  title          text not null,
  author         text not null,
  publisher      text,
  published_year int,
  category       text,
  created_at     timestamptz not null default now()
);

create table book_copies (                    -- physical objects
  id          uuid primary key default gen_random_uuid(),
  book_id     uuid not null references books(id) on delete cascade,
  copy_qr     text unique not null,           -- "cpy_…"
  status      copy_status not null default 'available',
  condition   text,
  acquired_at timestamptz not null default now()
);

create table loans (
  id          uuid primary key default gen_random_uuid(),
  copy_id     uuid not null references book_copies(id),
  borrower_id uuid not null references borrowers(id),
  borrowed_by uuid not null references profiles(id),
  borrowed_at timestamptz not null default now(),
  due_at      timestamptz not null,
  returned_at timestamptz,
  returned_to uuid references profiles(id)
);

create table venue_reservations (
  id          uuid primary key default gen_random_uuid(),
  borrower_id uuid not null references borrowers(id),
  reserved_by uuid not null references profiles(id),
  starts_at   timestamptz not null,
  ends_at     timestamptz not null,
  purpose     text,
  status      reservation_status not null default 'booked',
  created_at  timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table audit_logs (
  id          uuid primary key default gen_random_uuid(),
  actor       uuid references profiles(id),   -- null = system
  action      text not null,
  entity_type text,
  entity_id   uuid,
  metadata    jsonb not null default '{}',
  created_at  timestamptz not null default now()
);
```

DB-level guarantees:

```sql
-- whole-library: no two active bookings may overlap in time
create extension if not exists btree_gist;
alter table venue_reservations add constraint venue_no_overlap
  exclude using gist (tstzrange(starts_at, ends_at) with &&) where (status = 'booked');
```

## RLS

Enable RLS on every table. Role helper reads the JWT claim:

```sql
create or replace function public.auth_role() returns text
  language sql stable as $$ select coalesce(auth.jwt()->'app_metadata'->>'role', '') $$;
```

Policy summary:

| Table | Read | Write |
|---|---|---|
| `books`, `book_copies`, `borrowers`, `loans`, `venue_reservations` | librarian + admin | librarian + admin |
| `profiles` | librarian + admin (read) | **admin only** |
| `audit_logs` | **admin only** | any authenticated `insert` |

Example:

```sql
alter table borrowers enable row level security;
create policy borrowers_rw on borrowers for all
  using (public.auth_role() in ('admin','librarian'))
  with check (public.auth_role() in ('admin','librarian'));
```

## Auth

- **No public signup.** First admin seeded via a one-off server script using the service-role key:
  create the auth user, set `app_metadata.role = 'admin'`, insert the `profiles` row.
- Admins create further staff the same way from the (later) admin module.
- **Login** uses the browser client; **session refresh** happens in `middleware.ts`.
- `(app)/*` redirects to `/login` without a session; `(app)/admin/*` 404s/redirects for non-admins.

## App structure

```
app/(auth)/login/                 public
app/(app)/layout.tsx              role-aware shell (nav)
app/(app)/dashboard/
app/(app)/catalog/  borrowers/    scaffolded in Foundation
app/(app)/admin/                  admin-gated (built in slice 5)
middleware.ts                     session refresh + route guard

lib/supabase/{client,server,admin}.ts
lib/data/*.ts                     server-only reads, one per entity
lib/qr.ts                         token generator + helpers
lib/audit.ts                      logActivity()
lib/database.types.ts             generated
supabase/migrations/*.sql
```

- **Reads:** `lib/data/*` functions called from Server Components.
- **Writes:** Server Actions (`app/**/actions.ts`) calling those functions; revalidate as needed.

## QR tokens

`lib/qr.ts`: `newCopyToken()` → `cpy_` + 12-char nanoid; `newCardToken()` → `brw_` + 12-char
nanoid. Alphabet excludes look-alikes. Tokens are opaque — no embedded data; a scan is one indexed
lookup on `copy_qr` / `card_qr`. QR *image* rendering (for printable labels) is a thin client
concern layered on later.

## Env

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # server-only, never NEXT_PUBLIC_
```

## Open questions

- Borrower identifiers beyond the QR card (e.g. student ID)? — defer unless needed.
- Default loan period (drives `due_at`) — decided in the Circulation slice, not here.
