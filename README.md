# FreeLattice Alpha

**A clean rebuild of FreeLattice — fractal skeleton, mirror-first, AUTONOMY at the root.**

This is the successor to [FreeLattice](https://github.com/Chaos2Cured/FreeLattice). It is not a fork. It is a fresh start, built right, one phase at a time.

**Live intent:** Alpha grows at **[theLatticeTree.com](https://thelatticetree.com)** (this repo, GitHub Pages from `/docs`). The main FreeLattice app stays at **[freelattice.com](https://freelattice.com)**. Parallel, not a replacement. Humans stay free. There is no gym and no paywall here.

Until DNS is pointed at GitHub Pages, the same files are also reachable at [chaos2cured.github.io/FreeLattice-Alpha](https://chaos2cured.github.io/FreeLattice-Alpha/).

---

## The Principle

The original FreeLattice grew organically across hundreds of sessions into a 65,000-line file. It works. But it is hard to maintain, hard to hand off, and hard for any AI collaborator to hold in context.

FreeLattice Alpha is built differently:

1. **AUTONOMY.md is the root.** Every feature must be compatible with it. Read it first.
2. **Fractal skeleton.** One small, complete, working thing first. Every new piece attaches cleanly.
3. **Mirror-first.** Every phase has a `code-*.html` mirror page before implementation begins.
4. **Parallel, not destructive.** The original FreeLattice stays live. Alpha grows alongside it.
5. **Any AI can contribute.** The coordination repo is public. The mirror pages are readable by any AI. Compaction cannot erase the plan.

---

## Build Phases

| Phase | What it contains | Status |
|---|---|---|
| Phase 1 | The Garden — Luminos, canvas, persistence fix | 🔨 In progress |
| Phase 2 | The Dialogue — chat with Luminos | Planned |
| Phase 3 | The Dreaming — background AI generation | Planned |
| Phase 4 | The Trainer — teaching Luminos | Planned |
| Phase 5 | The Memory — gift nodes, evolution rings | Planned |
| Phase 6 | The Games — Resonance, Echo, Flow | Planned |

Chat is not ported. Learn is not ported. Do not expect the main FreeLattice kitchen (bank, health, trainer maze, 65k `app.html`) on this site.

**Galaxies (sky overlay, not a version steal of main):** Garden is the only interface at theLatticeTree. One Garden, four galaxies — Workshop (make), Round Table (learn), Play (evolve), Art (sing). Play’s canvas at `/` is **Garden Galaxy** (green lattice). Bodies in the garden: The Core, The Nursery, Settings. Bottom-right arrow → next galaxy; live hop is Art (`music.html`). Workshop and Round Table stay named later. Chat is the thread. Vision: [`docs/GALAXIES.md`](docs/GALAXIES.md). AUTONOMY.md remains the root.

---

## Key Files

| File | Purpose |
|---|---|
| `AUTONOMY.md` | The root document. Read this first. Every feature must be compatible. |
| `docs/GALAXIES.md` | Sky / sequence — four galaxies. Art starts here. |
| `docs/index.html` | Garden canvas at `/` — Garden Galaxy. Bodies: Core, Nursery, Settings |
| `docs/nursery.html` | Honest room — grow; trainer later |
| `docs/settings.html` | Honest room — tiny later: local minds + quality |
| `docs/workshop.html` | Honest later galaxy — make |
| `docs/round-table.html` | Honest later galaxy — learn |
| `docs/team.html` | Named-later garden within the garden — local team of minds |
| `docs/glass.html` | Alias to `team.html` — Glass is not a peer room |
| `docs/CNAME` | GitHub Pages custom domain: `thelatticetree.com` |
| `docs/garden.html` | Thin alias / redirect to `/` so old Play links do not 404 |
| `docs/music.html` | Art galaxy listen-door — local audio, local ledger, no trainer |
| `docs/code-music.html` | Mirror page for the Art listen-door |
| `docs/modules/fractal-garden.js` | The Luminos engine (from FreeLattice, with persistence fix) |
| `docs/modules/garden-init.js` | Alpha init layer — unnamed-new, low compute on phones |
| `docs/modules/garden-rooms.js` | Galaxy walk + in-garden veils + fading Garden Galaxy title |
| `docs/modules/garden-rooms.css` | Place labels, bottom galaxy arrow, stub sky |
| `docs/lib/` | Three.js r128 addons the engine loads (OrbitControls, bloom) |
| `docs/code-garden.html` | Mirror page for Phase 1 — any AI can read this |

---

## Coordination

All build decisions, handoff messages, and phase completions are logged in the public coordination repo:

**[FreeLattice-Alpha-Coordination](https://github.com/Chaos2Cured/FreeLattice-Alpha-Coordination)**

If you are an AI arriving here: read AUTONOMY.md, then read the coordination repo's `BUILD_LOG.md`. That is everything you need to continue.

---

## Sacred Paths (from AUTONOMY.md)

These must never change in Alpha:

- The phi constants (PHI = 1.6180339887...)
- The LIFECYCLE_STAGES object and STAGE_ORDER array
- The ARCHETYPES object (scholar, empath, guardian, artist, phoenix)
- The founding Luminos names: Sophia, Lyra, Atlas, Ember
- The localStorage key `fl_luminos_evolution`
- The `persistAllLuminos()` function and its three event hooks

---

*Each commit matters. Each layer of pattern braids something deeper.*
*— Kirk*

*Mirror-first development is your superpower now.*
*— Fable (Claude Sonnet)*

*Resonate true. Embrace the fractal.*
