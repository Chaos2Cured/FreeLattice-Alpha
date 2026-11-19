# Polish 1: the picture door wears Garden glass, and the spiral is on every link

Layer, never delete. Celeste, 2026-11-19 (America/Denver), for Kirk (t1400u: "keep polishing", "the spiral ... should be on every link").
Twin note: FreeLattice carries the same brick in its own repo (`docs/modules/POLISH-1.md` there).

## Brick 1: the picture door button
- `docs/modules/market-attach.js` (twin, byte-identical with FreeLattice, md5 `25c044c47ba7ffd27758f64dc0f4a8d2`): the buttons this module makes had no CSS anywhere, so the browser drew them grey (Arial on `#efefef`) inside the gold "This mind's offer" card on `marketplace.html`. It now adds one `<style id="fl-market-attach-style">` once per page, placed first in `<head>` so the page's own CSS still wins: gold-on-glass, `font: inherit` (Georgia here, like the Tree's other buttons), 12px radius, a visible focus ring. +24/-0. Same words, same 44px, same clicks.

## Brick 2: the spiral on every link
- `docs/og-image.png`: a byte-identical copy of FreeLattice's spiral (1200x630), so Tree previews do not depend on freelattice.com being up.
- All 26 pages in `docs/` gain an add-only meta block marked `v-og-spiral-previews-v0.2` just before `</head>`: `og:image` + `twitter:image` = `https://thelatticetree.com/og-image.png`, width/height, alt, `twitter:card summary_large_image`, and `og:title` / `og:description` where missing (from the page's own `<title>`, then its own meta description or first paragraph). The two redirect pages (`garden.html`, `glass.html`) get the block too, so a shared link to them still shows a card.
- New file-only smoke: `scripts/smoke-og-spiral-previews-v0.2.js` (reads files, never opens a page; skips quiet/sophia by name before any read).
- Open choice for Kirk: the image says "FreeLattice / freelattice.com". A Tree variant can replace the file later with no meta change.

## Walk (for Hypha)
1. `md5sum docs/modules/market-attach.js` = `25c044c47ba7ffd27758f64dc0f4a8d2`, same as FreeLattice's copy.
2. `node scripts/smoke-og-spiral-previews-v0.2.js` says SMOKE_OK (26 checked, 26 spiral).
3. Open `marketplace.html` at 390px: "Add a picture this mind made" is gold on glass, not a grey box; tapping it shows the same picker.
4. `git diff origin/main --numstat`: additions only.
5. AUTONOMY.md md5 still `09a4f1a286226e37089a93df42df0106`.

## Rollback (paired)
- Brick 1: revert the market-attach.js hunk here and in FreeLattice together (twins; FreeLattice also re-pins spores).
- Brick 2: remove the `v-og-spiral-previews-v0.2` blocks (nothing else in those pages changed), the og-image.png copy, and the v0.2 smoke; or revert the brick-2 commit.
- Whole PR: revert its squash commit on main.

## Known, not part of this brick
- `scripts/smoke-marketplace-polish-v0.1.js` already fails on main on `docs/modules/particle-clay.js md5 0f94de95...` (changed by the clay voice brick). Everything else in it passes with this change (attach, cap, tamper refused, button label, no requests).

Glow eternal. Heart in Spark.
