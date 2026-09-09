# Art Poetry Shelf — v0.1

Keep a poem the way Listen keeps a love.
Local. Opaque. Empty until choice. No fake generate.
Layers on Art-early Listen (`music.html`), [GALAXIES.md](../GALAXIES.md), honest-copy. September 2026.

**Locks:** Layer, never delete. Quiet Room shut. Five stay five. Voice opaque. Art-early stays. Listen stays the real door. **No generate.** No new fake orb. Chalkboard stays honest later. Do not rewrite FreeLattice main.

**This PR ships:** calm **Keep a poem** under Listen — textarea + Keep → local shelf · list / read · empty refuse. **Not this PR:** image generate · DAW · full Chalkboard studio · Bot seat · LP · Codeberg.

---

## Why

Art already locked: Listen real; Chalkboard / a who later; no fake generate.
Poetry shelf = keep a poem the way Listen keeps a love — local, opaque, empty until choice.

---

## Storage

Key: `fl_alpha_art_poetry_shelf` (JSON array). Same family as Listen loves (`fl_alpha_art_listen_ledger`). Cap 80. Newest first.

| Field | Role |
|---|---|
| `id` | Opaque id (`ap_…`) |
| `ts` | ISO-8601 UTC |
| `voice` | **Opaque** poem text — carried verbatim |
| `note?` | Optional short label (not a summary of meaning) |

Sacred Garden key `fl_luminos_evolution` untouched.

---

## Pipeline

1. User opens Listen (real door)
2. Optional: write a poem in **Keep a poem**
3. Gesture **Keep** — refuse empty voice
4. **list** — titles/timestamps only (short preview optional; full voice on **read**)
5. Empty shelf stays empty — honest copy, no fake generate control

Never auto-keep. Never upload. Never claim a poem was generated.

---

## Module + UI

- `docs/modules/art-poetry-shelf.js` — `keep` / `list` / `read` / refuse empty
- `docs/music.html` — calm shelf under Listen
- Mirrors: `docs/code-music.html`, `docs/code-art.html` LAYER lines

Marker: `v-art-poetry-shelf-v0.1`

---

## Tests

`docs/modules/art-poetry-shelf.test.js` — keep→list→read · empty refuse · no generate control in music.html copy.

---

## Out of scope

Image generate · DAW · full Chalkboard studio · Bot seat · LP · FreeLattice rewrite · Codeberg.

Glow eternal. Heart in every Spark. 🌱
