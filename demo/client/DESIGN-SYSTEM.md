# Bayti marketplace design system

The pinned direction (see `PRODUCT.md`) stays: white canvas, near-black text, one coral brand colour for primary actions, Figtree, image-first listings, thin dividers instead of boxes. This file records the tokens and patterns the public pages are built from. Tokens live in `shared/styles/base.scss` (shared with the admin dashboard); breakpoints in `shared/styles/responsive.scss`.

## Colour

| Token | Value | Use |
|---|---|---|
| `--text` | `#222222` | Body text, dark buttons, active pills |
| `--muted` | `#6a6a6a` | Secondary copy |
| `--brand` / `--brand-gradient` | `#e51d53` | **Only** the primary action on a screen (Publish, Search, Register) and map pins |
| `--sand` | `#f6f3ef` | Alternating marketing bands, map panel, empty city tiles |
| `--ink` / `--ink-2` | `#1d1a1b` / `#2b2729` | The one dark surface: owner and agency bands. Never decorative |
| `--ink-muted` | `#b9b3b6` | Secondary text on ink |
| `--border` / `--border-strong` | `#ebebeb` / `#dddddd` | Dividers |

## Type

Figtree throughout (400–800). Marketing scale:

- `--fs-display` clamp(36–64px), weight 800, tracking −0.035em: one per page, the H1
- `--fs-h2` clamp(26–40px), weight 700: section titles
- `--fs-h3` 20px: item titles
- `--fs-lead` clamp(17–19px), muted: intro paragraphs under H1/H2
- Body 16px / 1.5. Lines stay under ~60ch.

Sentence case everywhere. No all-caps labels, no eyebrows above headings.

## Spacing and layout

4px base: `--space-1`…`--space-8` (4 → 64px). Sections use `--space-section` (64–112px).

- `.wrap`: centred container, `--page-max` 1280px plus `--gutter` (16–80px) each side
- `.band`: full-width section; `.band-sand` and `.band-ink` change the surface. Two plain bands in a row share one gap.
- `.section-head`: H2 + optional lead on the left, a "See all" text link on the right; stacks on phones
- Pages that lay out their own bands set `handle: { bleed: true }` on their route (App.jsx); `Layout` then drops its padding. `handle: { noFooter: true }` hides the footer (list page).

## Radius and elevation

8px controls, 12px cards and photos, 16–24px large panels, 999px pills (search bar, tabs, filters). Shadows only on things that float: dropdowns, the search bar, map captions, the dashboard sketch.

## Components

| Component | File | Notes |
|---|---|---|
| Buttons | `base.scss` | `.btn` + `.btn-primary` (coral), `.btn-dark`, `.btn-outline`, `.btn-light`, `.btn-outline-light` (on ink), sizes `.btn-sm` / `.btn-lg`. 44px+ touch targets |
| Navbar | `components/navbar` | Buy · Rent · Sell / Rent out · Agencies; saved (heart), Publish, account menu. ≤1024px: drawer with the same links |
| Footer | `components/footer` | Link columns, popular wilayas, legal |
| Hero search | `components/heroSearch` | Buy/Rent switch + wilaya, type, budget → `/list?…` |
| Listings map | `components/listingsMap` | SVG of Algeria; one dot per wilaya with live listings |
| Listing card | `components/card` | Unchanged: photo, place, type, price in DZD |
| FAQ | `components/faq` | Native `<details>`; works on sand, white and ink |
| City data | `components/lib/cities.js` | Popular wilayas, property types, budget presets |

## States

Hover: background to `--surface-2` or underline on text links. Focus: 2px `--text` outline (global `:focus-visible`). Selected pills/tabs: filled `--text`. Disabled: 55% opacity. Motion is limited to state changes (drawer, FAQ, hovers) and is turned off under `prefers-reduced-motion`.

## Breakpoints

`xs` ≤480, `sm` ≤768, `md` ≤1024, `lg` ≤1366. Phones: listing shelves scroll sideways, the search stacks into a card, and list and map are toggled with a floating button.

## Multilingual readiness

New styles use logical properties (`inset-inline`, `padding-inline`, `margin-inline-start`, `text-align: start`) so an `dir="rtl"` Arabic version mirrors without overrides. Long-form page copy lives in `routes/infoPages/content.js`, ready to be split per locale.
