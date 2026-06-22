# doc/

Detailed, per-feature documentation lives here — one folder per feature: `doc/<feature>/`.

CLAUDE.md is the high-level **index/orientation** for the whole project. It stays concise and
does **not** hold deep detail. When a feature ships, its full design, schema, decisions, and usage
go in `doc/<feature>/`, and CLAUDE.md gets a one-line reference pointing here.

Examples (created as features are built):
- `doc/foundation/` — auth, schema, RLS, data layer, QR tokens
- `doc/circulation/` — borrow / return flows
- `doc/venue-reservation/` — whole-library booking
- `doc/exports/` — CSV/Excel generation
- `doc/admin/` — user management + audit logs
- `doc/backup-daemon/` — local scheduled backups
