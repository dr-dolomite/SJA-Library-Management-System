---
name: SJA-LMS
description: The system of record for St. Joseph's Academy library — calm, exact, institutional.
colors:
  primary: "#1a4231"
  primary-foreground: "#fbfdfc"
  gold: "#c8a126"
  gold-foreground: "#3b310f"
  background: "#ffffff"
  foreground: "#1d2b25"
  muted: "#f3f6f4"
  muted-foreground: "#5b6b63"
  secondary: "#eef3f0"
  secondary-foreground: "#34463e"
  accent: "#eaf1ed"
  border: "#dde4e0"
  destructive: "#d3402b"
  sidebar: "#21392f"
  sidebar-foreground: "#e7eeea"
  sidebar-accent: "#2f4a3f"
typography:
  display:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.875rem, 1.4rem + 2vw, 2.25rem)"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.015em"
  title:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "normal"
  mono:
    fontFamily: "Geist Mono, ui-monospace, SFMono-Regular, monospace"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "normal"
rounded:
  sm: "0.375rem"
  md: "0.5rem"
  lg: "0.625rem"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "40px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.lg}"
    height: "36px"
    padding: "0 14px"
  button-outline:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    height: "36px"
    padding: "0 14px"
  button-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.secondary-foreground}"
    rounded: "{rounded.lg}"
    height: "36px"
    padding: "0 14px"
  badge-gold:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.gold-foreground}"
    rounded: "{rounded.sm}"
    padding: "4px 10px"
  input:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    height: "36px"
    padding: "0 12px"
  sidebar-item-active:
    backgroundColor: "{colors.sidebar-accent}"
    textColor: "{colors.sidebar-foreground}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
---

# Design System: SJA-LMS

## 1. Overview

**Creative North Star: "The Reading Room"**

SJA-LMS should feel like a well-kept academic reading room rendered as software: ordered,
quiet, and authoritative. The deep pine green of St. Joseph's carries the structure — the
shelving, the desk, the binding — while the gold appears the way brass and gilt-lettering do
in a real library: sparingly, only on the thing that matters right now. White is the page
itself. Staff are mid-task and often mid-conversation with a patron; the interface earns trust
by being exact and getting out of the way, never by performing.

This system is **product, not brochure**. It explicitly rejects the three things its users
have suffered before: the cramped gray tables and tiny hit-targets of **dated gov/library
software**; the purple-gradient, hero-metric, identical-card-grid look of a **generic AI-SaaS
template**; and the deeply-nested, intimidating control panels of **heavy enterprise tooling**.
The target is the earned familiarity of best-in-class product tools (Linear, Stripe's
dashboard, Notion) wearing St. Joseph's colors — the tool disappears into the task.

Color is **Restrained**: one workhorse accent (pine green) plus one ceremonial accent (gold)
held to a few percent of any screen. The content area stays white and calm; the brand
identity lives in a single drenched green sidebar, the way a reading room's character lives in
its shelving rather than its walls.

**Key Characteristics:**
- Pine green is the only primary-action color; gold is for selection and emphasis only.
- White content surface, one deep-green navigation panel for identity.
- One type family (Geist) for the entire UI; monospace strictly for tokens and data.
- Fixed rem type scale (~1.2 ratio), not fluid — product UI viewed at consistent DPI.
- Status is never color-only; every state pairs color with text or icon.

## 2. Colors

A two-color brand — St. Joseph's pine green and gold — sitting on white, with neutrals tinted a
hair toward the green hue (OKLCH hue 163) so the grays read as the brand's own. **OKLCH is the
canonical format** (it is what `app/globals.css` ships); the hex values in the frontmatter are
the sRGB equivalents for tooling.

### Primary
- **Pine Green** (`#1a4231` · `oklch(0.345 0.055 163)`): The workhorse. Primary buttons, links,
  active/selected states, focus rings, the navigation panel, the first categorical chart series.
  This is the color the eye should associate with "the action" and "where I am."
- **Pine Foreground** (`#fbfdfc` · `oklch(0.985 0.008 163)`): Near-white text/icons on green
  surfaces. ~11:1 on Pine Green.

### Secondary
- **Academy Gold** (`#c8a126` · `oklch(0.725 0.14 90)`): The ceremonial accent. Exposed as the
  dedicated `--gold` token (NOT shadcn's `--accent`, which is a hover surface). Reserved for the
  current/active sidebar item, "you are here" markers, a small status badge, and the second
  chart series. Never a large fill, never a page background.
- **Gold Foreground** (`#3b310f` · `oklch(0.26 0.03 90)`): Dark olive ink for text on gold;
  ~5:1 on Academy Gold.

### Neutral
- **Ink** (`#1d2b25` · `oklch(0.24 0.02 163)`): Body and heading text. A green-tinted near-black,
  not pure gray. ~13:1 on white.
- **Muted Ink** (`#5b6b63` · `oklch(0.44 0.025 163)`): Secondary text, captions, placeholders.
  Held at ~5.2:1 on white — placeholders meet body contrast, not the washed-out gray default.
- **Surface** (`#ffffff` · `oklch(1 0 0)`): The content background. Pure white, kept crisp.
- **Quiet Surface** (`#f3f6f4` · `oklch(0.965 0.008 163)`) / **Panel** (`#eef3f0` ·
  `oklch(0.96 0.01 163)`): Muted and secondary fills — table zebra, inset panels, secondary buttons.
- **Hairline** (`#dde4e0` · `oklch(0.9 0.008 163)`): Borders, dividers, input strokes.
- **Sidebar Green** (`#21392f` · `oklch(0.3 0.05 163)`): The single deep-green navigation panel.

### Named Rules
**The Gilt Rule.** Gold behaves like gilt lettering: it touches ≤ a few percent of any screen
and only marks the one thing that is current, selected, or needs the eye. The moment gold fills
an area or repeats across a grid, it stops meaning "here" and the rule is broken.

**The One-Green Rule.** There is exactly one action color. If something is clickable-primary,
it is Pine Green; if it is Pine Green, it is the primary action. Do not introduce a second
button color to mean "also important."

## 3. Typography

**Display / Body Font:** Geist (with `ui-sans-serif, system-ui, sans-serif`)
**Label/Mono Font:** Geist Mono (with `ui-monospace, SFMono-Regular, monospace`)

**Character:** One modern, neutral grotesque carries the entire UI — headings, labels, body,
and data — so nothing reads as decorative. Geist Mono, its companion from the same superfamily,
is reserved for things that are literally codes: opaque QR tokens (`cpy_…`, `brw_…`), IDs, and
numeric columns where alignment matters. The pairing is coherent by design, not a contrast trick.

### Hierarchy
- **Display** (600, `clamp(1.875rem → 2.25rem)`, 1.1, `-0.02em`): Page-level titles only
  (a screen's primary heading). The ceiling stays low — product UI, not a landing page.
- **Headline** (600, 1.5rem, 1.2, `-0.015em`): Section headings within a page.
- **Title** (600, 1.125rem, 1.3, `-0.01em`): Card and panel titles, dialog headers.
- **Body** (400, 0.875rem / 14px, 1.5): Default UI text. Prose blocks cap at 65–75ch; dense
  tables may run wider.
- **Label** (500, 0.8125rem / 13px, 1.4): Buttons, form labels, table headers, nav items.
- **Mono** (400, 0.8125rem / 13px, 1.4): QR tokens, IDs, timestamps, numeric/tabular data.

### Named Rules
**The Mono-Means-Token Rule.** Monospace is a signal, not a style. It appears only where the
content is a machine token or a column that must align. A label or heading is never set in mono
"for flavor."

## 4. Elevation

Flat by default, with tonal layering doing the work shadows usually do. Depth comes from the
green sidebar against the white content area, from quiet-surface fills behind panels and table
rows, and from hairline borders — not from drop shadows on every card. Shadows are a **response
to elevation off the page**: they belong to things that genuinely float (dropdown menus,
popovers, dialogs, toasts), never to resting content.

### Shadow Vocabulary
- **Raised** (`box-shadow: 0 1px 2px oklch(0.24 0.02 163 / 0.06)`): Barely-there lift for a
  resting interactive surface that needs to read as pressable (rare).
- **Overlay** (`box-shadow: 0 8px 24px -6px oklch(0.24 0.02 163 / 0.18)`): Menus, popovers,
  dialogs — content that has left the page plane.

### Named Rules
**The Flat-By-Default Rule.** A surface is flat at rest. If it has a shadow, it must actually
float (it opens, it overlays, it can be dismissed). A shadow on static content is always wrong;
use a hairline border or a quiet-surface fill instead.

## 5. Components

### Buttons
- **Shape:** Gently rounded (`0.625rem` / `--radius-lg`), consistent across every variant.
- **Primary:** Pine Green fill, near-white text, height 36px (`lg`), padding `0 14px`. The one
  action color. Hover darkens to ~`primary/80`; `:active` nudges down 1px.
- **Outline:** White fill, hairline border, ink text; hover fills with the quiet muted surface.
  For secondary actions that sit beside a primary.
- **Secondary / Ghost:** Quiet green-tinted fill (secondary) or transparent-until-hover (ghost)
  for tertiary actions and toolbar controls.
- **Focus:** 3px green ring at `ring/50` plus a solid ring-colored border — visible on every
  control, never removed.
- **Destructive:** Tonal, not loud — `destructive/10` fill with destructive-colored text, so a
  delete reads as serious without shouting red across the row.

### Badges / Status
- **Gold badge:** Academy Gold fill, dark-olive text, `0.375rem` radius — the "current/featured"
  marker. Used sparingly per the Gilt Rule.
- **Status pills:** Color is always paired with a word (Available, On loan, Reserved, Overdue)
  and/or an icon. Never communicate loan or reservation state by hue alone.

### Cards / Containers
- **Corner Style:** `0.625rem` (`--radius-lg`).
- **Background:** White (`card`); inset/secondary regions use the quiet surface.
- **Shadow Strategy:** None at rest — see the Flat-By-Default Rule. Definition comes from a
  hairline border.
- **Internal Padding:** `16px`–`24px` (`md`–`lg`). Never nest a card inside a card.

### Inputs / Fields
- **Style:** White fill, hairline border, `0.5rem` radius (`--radius-md`), 36px height.
- **Focus:** Border shifts to the green ring color with a 3px `ring/50` halo. No glow effects.
- **Error / Disabled:** Error uses `aria-invalid` → destructive border + halo; disabled drops to
  ~50% opacity and removes pointer events.

### Navigation (Sidebar)
- **Style:** A single deep pine-green panel (`sidebar`) — the system's identity surface.
- **Items:** Near-white labels (Geist, label size). Hover lifts to a slightly lighter green
  (`sidebar-accent`).
- **Active item:** Marked with Academy Gold (`sidebar-primary`) — the "you are here" gilt.
- **Mobile:** The sidebar collapses to an off-canvas drawer (structural responsive behavior,
  not fluid type); content reflows to a single column. Comfortable touch targets for tablet
  shelf-scanning and phone lookups.

## 6. Do's and Don'ts

### Do:
- **Do** use Pine Green (`#1a4231`) as the one and only primary-action color — buttons, links,
  active states, focus rings.
- **Do** keep Academy Gold (`#c8a126`) to ≤ a few percent of any screen, marking only what is
  current/selected (the Gilt Rule).
- **Do** keep the content area white and calm; let the deep-green sidebar carry brand identity.
- **Do** pair every loan/reservation status with text or an icon, not color alone (WCAG AA,
  color-blind staff).
- **Do** set QR tokens, IDs, and numeric columns in Geist Mono; keep all other text in Geist.
- **Do** hold body and placeholder text at ≥4.5:1 — use Ink (`#1d2b25`) and Muted Ink
  (`#5b6b63`), never a lighter gray "for elegance."
- **Do** keep resting surfaces flat; reserve shadows for things that actually float.

### Don't:
- **Don't** recreate **dated gov/library software**: cramped gray tables, tiny hit-targets,
  dense forms with no hierarchy.
- **Don't** drift toward a **generic AI-SaaS template**: purple gradients, hero-metric
  dashboards, endless identical icon-heading-text card grids, marketing flourish.
- **Don't** build **heavy-enterprise** density: deeply nested navigation or intimidating
  control panels that make simple tasks feel risky.
- **Don't** map gold onto shadcn's `--accent` token — that is the hover-surface, and it would
  tint every ghost hover gold. Use the dedicated `--gold` / `--gold-foreground` tokens.
- **Don't** introduce a second button fill color to mean "also important" (the One-Green Rule).
- **Don't** set labels or headings in monospace for flavor (the Mono-Means-Token Rule).
- **Don't** use a colored side-stripe (`border-left > 1px`), gradient text, or decorative
  glassmorphism anywhere.
- **Don't** put a drop shadow on static, resting content (the Flat-By-Default Rule).
