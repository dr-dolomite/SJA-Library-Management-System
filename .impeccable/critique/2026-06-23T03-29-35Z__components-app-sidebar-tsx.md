---
target: sidebar
total_score: 25
p0_count: 0
p1_count: 1
timestamp: 2026-06-23T03-29-35Z
slug: components-app-sidebar-tsx
---
# Critique — App Sidebar (components/app-sidebar.tsx)

## Design Health Score
~25/32 scored heuristics — Good. One real consistency gap (brand mark).
Strong: active-state visibility (gold icon), recognition (icon+label, tooltips).
Weak: Consistency (2/4) — brand mark diverges from login.

## Anti-Patterns Verdict
Not AI slop. Disciplined shadcn sidebar; Gilt Rule respected; ease-apple motion.
detect.mjs on app-sidebar.tsx => [] (zero findings). Clean.
Weakness is identity, not slop: "SJ" monogram is an unfinished placeholder.

## Overall Impression
Quiet, correct instrument matching PRODUCT.md. Biggest opportunity = brand mark.

## On the logo
Seal (sja-logo.png) is detailed multi-color circular emblem; great at 72px (login),
problematic raw at 32px (size-8) sidebar header, worse in collapsible="icon" mode:
1. Green outer ring dissolves into pine --sidebar (silhouette lost).
2. Fine gold lettering illegible at 32px; competes with gold active marker (soft Gilt Rule break).
Recommendation: use the logo, NOT raw at 32px on green.
(A) Quickest: seal on small white/cream rounded disc, wordmark beside. Mirrors login drop-shadow backing.
(B) Best long-term: simplified monochrome glyph (JHS monogram/book) for small+collapsed sizes; full seal at login.
(C) Split: seal login-only, refine in-app monogram.

## Priority Issues
[P1] Brand mark inconsistency between login (seal) and app ("SJ"). Fix via (A) or (B). /impeccable craft
[P2] Raw seal at 32px on green backfires (legibility + Gilt Rule). Guardrail = white disc. /impeccable polish
[P3] Collapsed-icon brand state unconsidered; detailed seal weakest there. Use glyph. /impeccable adapt

## Persona Red Flags
Jordan: "SJ" square ambiguous (button? avatar?); seal reads instantly as the school.
Sam: keep swapped seal aria-hidden (wordmark already names school) to avoid double announce.
Alex: invisible Cmd+B toggle (out of scope, noted).

## Minor Observations
- Header links to /dashboard (logo-as-home) — keep on new mark.
- inset top-light on SJ square matches Lit-Panel Rule; carry to white disc.
- Verify disc edge vs sidebar-accent on hover.

## Questions
- Seal present everywhere (disc) vs login-only ceremonial (glyph)?
- SVG of seal available? 32px raster will look soft on hi-DPI.
