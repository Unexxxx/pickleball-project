# UNEX Design System — Single Source of Truth

This file is the **only** design reference for UNEX. It replaces the earlier
"Pickleball Record" master spec (blue/orange), its per-page overrides, and the
"Courtside" direction (`design.md`) — all removed. When a page and this file
disagree, this file wins; update it first, then the code.

**Decided by the user on October 14, 2026:** the dark navy + volt-lime look
that began on the landing page now applies to **every page**, with
Bricolage Grotesque + Archivo as the only typefaces and the script UNEX
wordmark as the only logo. No per-page design specs.

## Provenance

- Palette and typography come from a reference artifact the user supplied
  (`https://claude.ai/artifact/8UUkaYaEL65zaBztB24r1z`): near-black navy base,
  volt lime accent, Bricolage Grotesque headings, Archivo body.
- **September 30, 2026:** the user named `https://actl.me` as their direct
  inspiration. The base and text tokens (`--dink-surface-dark(-2)`,
  `--dink-cream(-muted)`) were re-sourced from that site's live computed styles
  (`getComputedStyle`, not eyeballed): navy `rgb(10 41 82)`, cream
  `rgb(237 230 196)`.
- **October 14, 2026:** extended app-wide (see "Scope").

## Scope

Everything: landing page, auth, leaderboards, player/club/match pages,
dashboard, event/queue/court tools, admin. The authenticated app uses the same
tokens through the semantic aliases below, so a color change is a one-line edit.

## Tokens

All values live in `app/globals.css` `:root`. Copy verbatim; don't approximate.

| Token                                  | Value                                          | Role                                                                          |
| -------------------------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------- |
| `--dink-surface-dark`                  | `rgb(10 41 82)`                                | **The base.** Page background, darkest band.                                  |
| `--dink-surface-dark-2`                | `rgb(17 57 108)`                               | One step lighter: cards, panels, alternate bands.                             |
| `--dink-cream`                         | `rgb(237 230 196)`                             | Primary text and headings on dark — **not** white.                            |
| `--dink-cream-muted`                   | `rgb(237 230 196 / 0.72)`                      | Secondary / lede text on dark.                                                |
| `--dink-volt`                          | `oklch(80% 0.19 125)`                          | **The accent.** Primary CTA fill, links, kickers, active states, key numbers. |
| `--dink-volt-ink`                      | `oklch(28% 0.09 125)`                          | Text _on_ volt fills (dark olive — never black or white).                     |
| `--dink-ink`                           | `oklch(18% 0.03 255)`                          | Near-black navy. Text on light/cream surfaces.                                |
| `--dink-ink-soft` / `--dink-ink-faint` | `oklch(45% 0.02 255)` / `oklch(65% 0.015 255)` | Secondary / tertiary text on light surfaces only.                             |
| `--dink-paper` (`-2`, `-3`)            | `oklch(97.5% 0.008 90)` …                      | Light bands (landing "three steps", CTA, footer).                             |
| `--dink-coral`                         | `oklch(74% 0.19 35)`                           | Reserved secondary accent / warning.                                          |

### App base (every page except the landing hero)

The app and the landing page's lower sections use the reference artifact's
near-black navy and near-white text, **not** the actl.me navy above — that
navy/cream pair is reserved for the landing hero and the cream "three steps"
band.

| Alias                                          | Value                   | Role                                                |
| ---------------------------------------------- | ----------------------- | --------------------------------------------------- |
| `--background`                                 | `oklch(15% 0.025 255)`  | Page background, darkest surface.                   |
| `--surface`                                    | `oklch(21% 0.03 255)`   | Cards, panels, alternate bands.                     |
| `--muted`                                      | `oklch(24% 0.03 255)`   | Nested tiles on a card.                             |
| `--border`                                     | `oklch(28% 0.03 255)`   | Hairlines and tile borders.                         |
| `--foreground`                                 | `oklch(97.5% 0.008 90)` | Primary text and headings (the artifact's "paper"). |
| `--muted-foreground`                           | `oklch(75% 0.02 255)`   | Secondary text.                                     |
| `--primary` / `--accent`                       | `--dink-volt`           | CTA fill, links, kickers, key numbers.              |
| `--primary-foreground` / `--accent-foreground` | `--dink-volt-ink`       | Text on volt fills.                                 |
| `--danger`                                     | `rgb(255 138 128)`      | Errors — pair with text, never color alone.         |
| `--ring`                                       | `--dink-volt`           | Focus ring.                                         |

### State tints (on dark)

Soft fills with matching text, instead of pastel-on-white:
success/lime `oklch(80% 0.19 125 / 0.16)` + volt text; danger
`rgb(255 120 110 / 0.16)` + `rgb(255 180 175)` text; warning
`rgb(255 190 90 / 0.16)` + `rgb(255 205 120)` text; neutral
`rgb(255 255 255 / 0.06)`.

## Usage rules

- **Background rhythm:** `--background` for pages, `--surface` for cards and
  alternate bands, `--muted` for tiles inside a card. The landing page
  also uses light cream bands (`--dink-paper`/cream) for contrast — dark text
  from `--dink-ink` there.
- **Buttons:** primary = solid `--dink-volt` with `--dink-volt-ink` text.
  Secondary = transparent with a translucent cream/white border.
- **Headings:** `--dink-cream`. **Body on dark:** `--dink-cream-muted`. Never
  put `--dink-ink-*` text on a dark surface or cream text on a light one.
- **Kickers / eyebrows / links / key stats:** `--dink-volt` text, no fill.
- **Red is for errors and urgent states only**, always with text.
- Check contrast before using a token outside these patterns.

## Typography

- **Headings:** Bricolage Grotesque (600–800), `--font-heading`.
- **Body and controls:** Archivo (400–700), `--font-body`.
- Both are loaded once in `app/layout.tsx` via `next/font/google` and apply to
  every page. Don't reintroduce Arial Narrow / Barlow.
- Use tabular numerals for timers, scores, rankings and statistics.

## Logo and icons

- The wordmark is the script **UNEX** (`public/unex-logo.png`, a transparent
  mask). The header renders it as a CSS mask in `currentColor`, so it is cream
  on dark and `--dink-ink` over light bands — never use a baked-in color.
- App icons (`app/icon.png`, `app/apple-icon.png`, `public/icons/icon-*.png`)
  are the cream wordmark on `--dink-surface-dark`.

## Layout and interaction

- Mobile-first, compact, easy to scan; adapt composition for desktop.
- Clear hierarchy and intentional whitespace; keep names readable and give
  access to full truncated names.
- Bench rows stay compact; a contained horizontal scroll is fine for dense
  stats on mobile, but the page itself must never scroll horizontally.
- Familiar icons and concise labels; explain abbreviations accessibly.
- Motion only for meaningful change (e.g. a queue update). Respect
  `prefers-reduced-motion`, keyboard focus, contrast and touch-target size.
  Easing: `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)`; animate transform and
  opacity only.
- Don't add nonfunctional buttons for features that don't exist.
- Give the user one primary focus per situation (before / during / after an
  event, or find a game) — never fabricate queue positions, progress or
  social activity.
- On phones the landing page drops the bottom tab bar (Rankings and Log in sit
  in the top header); other pages keep it.

## Preserve functionality and trust

Design changes must not alter matchmaking rules, ratings, score handling,
registration, privacy or authorization without a separate explicit request.
Player queue views stay read-only; hiding a control is never a substitute for
server-side permission checks.

## Landing-page specifics

The landing page (`app/page.tsx`) adds: a pinned scroll hero with a canvas
pickleball court (`components/marketing/pinned-court-hero.tsx`), a transparent
fixed header whose text flips dark over light bands, a scroll-scrubbed paddle
video band, and cream CTA/footer sections matching the artifact. Its overscroll
area is matched to the hero's flat top edge (`oklch(15% 0.025 255)`).
