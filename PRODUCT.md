# Product

## Register

product

## Users

Two authenticated staff roles — no public/patron accounts ever.

- **Librarian** (the daily driver): works at the circulation desk and around the building.
  Catalogs titles and copies, manages borrowers, records borrows/returns, books the venue,
  runs exports. High-frequency, repetitive tasks — speed and low friction matter most.
- **Admin**: everything a librarian can do, plus staff/user provisioning and audit ("debug")
  log review. Lower frequency, higher stakes.

Borrowers are **records, not users**. A librarian acts on a patron's behalf; patrons never
log in. Context of use is a busy front desk plus shelf-side lookups, often mid-conversation
with a patron, sometimes on a shared or older workstation.

## Product Purpose

SJA-LMS is an internal library management system that runs two workflows over one shared core:

1. **Book circulation** — borrow/return of physical book *copies* (the heart of the app).
2. **Venue reservation** — booking the library building as a single unit, by time range.

The shared core is the catalog (titles vs. physical copies), borrowers, staff/auth, and an
opaque-token QR identity layer. The system also produces printable QR labels, CSV/Excel
exports, and scheduled local database backups.

Success looks like: a librarian completes the common actions (check a copy out, take one
back, look up a borrower, reserve the venue) in seconds without thinking about the tool, and
trusts that what's on screen is the true state of the collection.

## Brand Personality

**Efficient, calm, trustworthy.** The interface is a quiet instrument, not a destination. It
favors clarity and speed over personality; it gets out of the way so staff can stay in the
task and keep their attention on the patron in front of them. Tone in copy is plain, direct,
and unfussy — labels and confirmations a busy person can read at a glance. Confidence comes
from consistency and correctness, not decoration.

## Anti-references

- **Dated gov/library software** (legacy ILS / old OPACs): cramped gray tables, tiny hit
  targets, dense forms with no hierarchy. We are the opposite of "powerful but punishing."
- **Generic AI-SaaS template**: purple gradients, hero-metric dashboards, endless identical
  icon-heading-text card grids, marketing flourish. This is a tool, not a pitch deck.
- **Heavy enterprise (SAP-like)**: deeply nested navigation, intimidating control panels,
  everything-everywhere density that makes simple tasks feel risky.

The target is the earned familiarity of best-in-class product tools (Linear, Stripe's
dashboard, Notion): the interface disappears into the task.

## Design Principles

1. **The tool disappears.** Optimize the few high-frequency actions (check out, return, look
   up, reserve) so they feel instant and obvious. Everything else is secondary chrome.
2. **One state of truth, shown plainly.** A copy is in or out; the venue is free or booked.
   Surface real status clearly and never let the UI imply a state the database doesn't hold.
3. **Earned familiarity over novelty.** Use standard, recognizable affordances (tables, side
   nav, command-style search, standard modals only when nothing inline works). No invented
   controls for standard tasks.
4. **Density with breathing room.** Show enough information for the job without crowding;
   reach for density deliberately (a borrower's loan history) rather than by default.
5. **Trust through consistency.** The same button, the same status pill, the same form
   vocabulary on every screen. A confident, correct, predictable system of record.

## Accessibility & Inclusion

Target **WCAG 2.1 AA**:

- Body text ≥ 4.5:1 contrast (≥ 3:1 for large text); placeholders held to the same body bar.
- Full keyboard operability with visible focus states on every interactive element.
- Status never conveyed by color alone — pair color with text/icon (important for loan and
  reservation states, and for color-blind staff).
- `prefers-reduced-motion` honored on every transition (crossfade or instant fallback).
- Screen-reader-correct labels on controls, tables, and form fields.

**Fully responsive**: staff use desktop workstations at the desk, tablets for QR scanning at
the shelves, and phones for quick lookups anywhere in the building. Responsiveness is
structural (collapsing nav, responsive tables) — not fluid typography. Ensure comfortable
touch targets on tablet/phone given shared and sometimes older devices.
