# Tree any model v0.1 (v-tree-any-model-v0)

Alpha layer, with a byte-identical twin of `docs/modules/fl-connect.js` in FreeLattice. October 1, 2026.

**Kirk's words:** any locally downloaded model is usable and changeable in any order on theLatticeTree, with no friction, via Connect or the Bridge, 127.0.0.1 only.

## What blocked it (the map, Sep 28 walk)

- A cap of five models per door (`parseModelNames`), five stars per door in the sky, twelve Gathering options.
- A Connect tap replaced the whole remembered entry: other models, other doors (LM Studio), the door name and the speaking chair were lost.
- After a Connect tap then a Find, a chosen model that fell past the cap was called "no longer at this door" and the speaking model switched under her.
- With the Bridge up, Find asked only the Bridge, so LM Studio was invisible.
- The paste field fetched any host (a LAN address was fetched).
- The Chat heart named the door, not the model. The trainer read FreeLattice's `fl_active_model`, which the Tree never writes.

## What changed

- `local-mind-probe.js`: `MODEL_CAP` 64, `SKY_FOLD` 8 with "Show all N models" (the chosen one always shown); duplicates collapse; Gathering options up to 64; new `mergeFound(found)` adds or updates one door and keeps every other door, the roster, the chair binds and the speaking chair; `entryFromFoundList` keeps a chosen model that is at any found door ("Still speaking with X, now through Y." or "The chosen model X is at Y. Tap it to speak with it again."), and only says "no longer at this door" when it is truly absent; with the Bridge up, Find still asks the non-Ollama doors; `tryAddress` takes 127.0.0.1 / localhost / [::1] or a bare port only, and refuses anything else with zero fetches; one honesty line for LM Studio CORS.
- `fl-connect.js` (shared, both repos): on the Tree a Connect tap calls `LocalMindProbe.mergeFound` (the old replace path stays below it for an older probe); the model list is passed along; the chosen model button has `aria-pressed="true"` and `is-chosen`. FreeLattice's own branch of `remember()` is unchanged.
- `garden-thread.js`: the heart reads "Listening: Ollama · llama3.2:latest. On this machine only.", repaints when a mind is remembered, and a quiet "change mind" button opens Settings (not shown inside Settings).
- `garden-trainer.js`: `activeModelName()` reads `fl_active_model` first, then the Tree's remembered model; the old `llama3.2` / `phi-pathway` fallbacks stay last.

## Trust decision

The Agent Bridge (127.0.0.1:3141, locked by FreeLattice #120) stays out of the Tree's model path: it would add pairing for a purely local act, it is Ollama-only, and it would touch #120's lock files. The Tree keeps the Ollama Bridge (11435) and direct loopback doors.

## Later (not built)

- Round Table sitters from roster seats and Gathering binds, so two models at one Ollama door can sit together.
- LM Studio through the Ollama Bridge (a second upstream in `bridge/proxy-core.js`).
- Teaching `FlConnect.probe` the OpenAI `/v1/models` shape (would change FreeLattice behavior).

Layer, never delete.
