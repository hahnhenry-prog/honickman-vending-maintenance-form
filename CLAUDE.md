@AGENTS.md

# Brand Palette — Source of Truth

These are the canonical brand colors for every Honickman Companies app. This
block is identical in all four repos. **Do not invent, adjust, or "correct"
these values.** If one looks wrong, say so — do not silently change it in code.

| Theme | Used by | Role | Value |
|---|---|---|---|
| **Pepsi** | PCNY, PNB | primary | `#174a92` |
| | | primary dark (hover) | `#0e3585` |
| | | primary light | `#1f65c7` |
| | | accent | `#e4003a` (Pepsi red) |
| **Canada Dry** | CDDV, CDP | primary | `#0e4636` |
| | | accent | `#d0aa29` (Canada Dry gold) |
| **Honickman** | parent brand, internal tools | primary | `#de8500` |
| | | accent | `#283a4d` (corporate navy) |

Shared across all themes: surface `#ffffff`, border `#e2e2e2`,
text primary `#242424`, text secondary `#555555`, text muted `#999999`.

## Where these came from

- **Pepsi `#174a92`** — sampled from the flat fill of the PCNY logo artwork
  (`PCNY_logo.png`, lossless PNG, rgb(23, 74, 146), 57% of the image).
- **Canada Dry `#0e4636`** — the header background used by both Canada Dry
  catalog apps; consistent with the green in the logo artwork.
- **Honickman `#de8500`** — sampled from `TheHonickmanCompanies-1.svg`;
  navy `#283a4d` read from the same SVG. Brand files beat screenshots:
  a screenshot of the site reads `#283a4e`, one point off from colour-
  profile conversion. Always prefer the source artwork.

## Rules

1. **Sample brand colors from PNG or SVG only — never WebP.** WebP is lossy.
   The Pepsi logo reads back as `#174b92` from `.webp` and `#174a92` from
   `.png`. The PNG is correct. The `.webp` logos are for display only.

2. **Never name a token after a brand.** Token names describe the *role* —
   `primary`, `background`, `border` — never the value (`pepsiBlue`). Brand
   names belong on the file (`tokens/pepsi.ts`), not on the slots inside it.
   This is what lets one component serve all five companies.

3. **Do not reintroduce these values.** Each has been mistaken for Pepsi blue
   at some point: `#004b93`, `#0065c3`, `#2ea3f2`, `#174b92`.

4. **When a color is missing, ask — don't pick one.** Inventing a near-miss
   shade is how the palette drifted in the first place.

The machine-readable copy of this palette lives in `honickman-ui/src/tokens/`.
