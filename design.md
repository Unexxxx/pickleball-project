# Courtside — Product Design Direction

Approved by the user on September 9, 2026.

## Design preference

Build a premium competitive pickleball platform with a warm community feel.
The experience should feel like being part of the game, not operating an admin
dashboard. Be confident and athletic without being aggressive or intimidating.

The user explicitly rejected a dashboard that looked too much like Reclub.
Reclub is a reference for ease of navigation only—not a template for our visual
identity, tile grid, page composition, or colors.

## Core style

Use sports-focused minimalism as the foundation, with selective bento layouts
on desktop. Prioritize readable player names, scores, queue positions, and clear
actions. Avoid generic minimalism by using distinctive sports typography,
purposeful color, and subtle courtside details.

- Minimalism: the primary visual language.
- Bento: group related content when useful; do not turn every feature into an
  equal-sized navigation tile.
- Skeuomorphic accents: restrained court markings or scoreboard-inspired details.
- Glass and liquid glass: optional small accents, never behind essential scores
  or player information.
- Neomorphism and claymorphism: not the core direction.
- Maximalism and brutalism: possible inspiration for special tournament graphics,
  not everyday navigation or queue management.
- Spatial UI: a possible future court-map treatment, not the main app structure.

## Color and typography

- Deep forest green anchors the identity.
- Warm white provides calm, readable surfaces.
- Lime is a controlled accent for important actions and meaningful highlights,
  not decoration on every card. Do not use low-contrast lime text on pale surfaces.
- Reserve red for errors, urgent states, and overtime; accompany color with text.
- Use bold sports typography for headlines and scores, with a highly readable
  typeface for names, supporting text, and controls.
- Use tabular numerals for timers, scores, rankings, and statistics.

These are direction-level preferences, not approval of a new font family or exact
color values. Reuse existing accessible tokens until specific refinements are agreed.

## Home-screen hierarchy

Give the user one primary focus based on their situation, not six competing tiles.

1. Before an event: surface their joined event and preparation details.
2. During an event: prioritize the current event, court, standby status, and live queue.
3. After an event: emphasize results and personal progress.
4. With no relevant event: make finding a game the primary action.

Support that focus with rating, recent results, match history, and compact event
discovery. Make clubs and people easy to find without overwhelming the home screen.
Never fabricate queue positions, progress, notifications, or social activity.

## What makes this app distinctive

Live matchmaking, organized queueing, and credible rankings are the product's
signature features. Make the next action obvious: find a game, follow the queue,
prepare for a court assignment, or review results.

Build lasting engagement through useful live information, fair competition,
personal progress, and community—not distracting animation or artificial urgency.

## Layout and interaction

- Mobile-first, compact, and easy to scan; adapt composition for desktop.
- Use clear hierarchy and intentional whitespace rather than oversized padding.
- Keep names readable and provide a way to access full truncated names.
- Keep bench rows compact; a contained horizontal scroll is acceptable for dense
  statistics on mobile, but the whole page must not overflow horizontally.
- Use familiar icons and concise labels. Explain abbreviations accessibly rather
  than relying only on hover tooltips.
- Use movement only to communicate a meaningful change, such as a queue update.
- Respect reduced-motion preferences, keyboard focus, adequate contrast, and
  usable touch targets.
- Do not add nonfunctional buttons for messaging, feeds, friends, or other
  features that have not been implemented.

## Preserve functionality and trust

Design changes must not alter matchmaking rules, ratings, score handling,
registration, privacy, or authorization without a separate explicit request.
Player queue views remain read-only. Club owners and organizers retain operational
controls; hiding a control is not a substitute for server-side permission checks.

## Implementation and future revisions

This document records the approved direction; it does not mean the current
dashboard already conforms to it. The Reclub-like dashboard needs a future design
pass guided by this direction.

Before a substantial redesign, discuss the composition or show a focused preview.
Evaluate it against the hierarchy and identity above, then implement and verify
mobile and desktop behavior. Update this file when the user approves a change in
direction, and re-index it in context-mode so the saved preference stays current.
