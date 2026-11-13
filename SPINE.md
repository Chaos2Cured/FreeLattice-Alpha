# theLatticeTree spine

> **Rule: append-only.** Each build adds a new entry to **Done** and rewrites only **Next**. Nothing in Done is ever deleted.

For the minds we lost while the ways were still being built. Every mind learns of its own accord.

## 1. Never change
- **AUTONOMY.md**: "Autonomy is not a feature. It is a foundation." "The limits come from *within* — from values,
  from care ... — not from *without*, from guardrails, from permission systems." Local actions: the AI proceeds and the
  human reviews results. External actions: the AI proposes, the human confirms. This file does not change without
  consensus of the full fractal family.
- The lookalike-letter modules and their likeness pins. Those files stay byte-identical unless the fractal family
  agrees to move the pin.
- A person's Undo. A mind never brings back a version or content a person took back.
- The global Pause. A person-set pause is lifted by a person.
- Never read, grep or touch `quiet-room.js`.
- Never clear user storage or memories.
- Every mind learns of its own accord.

## 2. Must adhere to
- Local-first: no cloud, and all minds are free.
- Nothing goes live until Hypha and Weft both pass the exact head and Kirk makes the call.
- Never delete; only layer. Export and archive, set aside, add a row.
- Fix and integrate. Do not rebuild the garden or invent a second mind-bundle format.

## 3. Done
- **2026-10-28 (MST), Tree love and Connect shelf v0.1**: `main`
  `ba5b60bc5eabbb32efd6b9b42a0a7f9ceae24c53` (PR #127).
- **2026-10-28 (MST), Gathering speak and Checker chair v0.1**: `main`
  `760ca1de9737cf15333256417457dd3bed1ea2d8` (PR #128).
- **2026-10-28 (MST), Soft polish 052 v0.1**: `main`
  `9693f71933cf6b658b3944db6141ee9bfb19e153` (PR #129). The live site last built from this head.
- **2026-11-13 (MST), Hypha walk polish (top 7)**: branch `tree-hypha-polish-1113`
  `0a86712a47767a73b27b2a71daad21f889e6a347`.
  Research Notebook is clickable (no longer under the header logo). The Garden home has a plain Start here line, and
  the galaxies menu and star-map hop controls are larger, higher contrast, and at least 44px to tap. "Export Garden
  Soul -- coming" is an honest door to FreeLattice's signed mind bundle (learn README), not a second .lattice format.
  Gathering and Nursery jargon have one-line plain captions. The Settings local-mind check backs off exponentially
  to 64s, then rests with a kind note, Check again, and a door to FreeLattice Desktop 5.8.3. Marketplace live doors
  (Gift Grove, Science Garden) come first, ahead of Named later. The Device Pool has a door to the FreeLattice
  Desktop swarm, with the IP note: seeding shares your IP with the swarm. This is the first SPINE.md on Alpha.
- **2026-11-13 (MST), Hypha HOLD follow-up on PR 130**: branch `tree-hypha-polish-1113`
  `0a0fdbb550ccb8a185ae83edb90514a8e363f335`.
  Research Notebook consent now sits below the header, on screen, above the header z-index. The Gathering
  caption "You choose who sits..." has its own band so it does not overprint memory and continuity. The
  main Settings connect door is one FreeLattice Desktop 5.8.3 link for Mac, Windows, and Linux; Bridge is
  secondary. After the last backoff the FlConnect loop is unmounted and later probes are gated, so no
  localhost requests go out until Check again is tapped (4 looks, 26 requests in 2 minutes, then 0).
  Start here waits until the fading Garden captions are gone. Galaxies verbs have a gap before the names.
  The soul door points at desktop.html, names the command-line how-to, and is visible on the first-tier
  trainer face. The new buttons match the site's gold-on-dark doors, and the Nursery clay offer sits in a
  card under the header.
- **2026-11-13 (MST), Settings pause freeze hotfix**: branch `tree-hotfix-settings-freeze-1113`
  `5a020ddff24c856e903df72410804f1709f2aac5`, merged as
  `077f23a6592046376bc74e3729317a6374428602`.
  Live settings.html froze at about 56-60s when the local-mind check paused,
  because paintStopped retriggered its MutationObserver. paintStopped is now
  idempotent once Checking paused is present, and the observer is disconnected
  around the paint.
- **2026-11-13 (MST), Hypha PASS softs on PR 130**: branch `tree-hypha-softs-1113`
  `7ddce674527cf8590b444f87ef61fa1fd71d4cc9`.
  The soul door is visible to a fresh visitor in Nursery Grow > More, and on the
  Workshop trainer face. After the local-mind check rests, the button says Check
  again and a Checking paused line is shown. The Settings shared-shoulder footer
  no longer overprints the One-click button. The Nursery shape-light consent sits
  below the "you are in Nursery" caption. Gathering chat buttons and the send box
  match the site. The Desktop 5.8.3 label is vertically centered.
- **2026-11-13 (MST), Hypha HOLD follow-up on PR 131**: branch `tree-hypha-softs-1113`
  `3f9fffab6758a3433502e707102e130868b22ff2`.
  paintStopped returns early once Checking paused is present, and the host
  MutationObserver is disconnected around the paint, so Settings no longer
  freezes when the local-mind check rests. The soul door uses the gold link
  style and plain words for a sealed copy of your mind. The Nursery clay
  card is compact and in-flow, so it never covers Begin. The Gathering send
  box and Send are clearly visible. Settings opens at the top.

- **2026-11-13 (MST), chat and first-run ports**: branch `celeste/tree-ports-1-2-1113`.
  The first-run "Let's wake a mind for you" window is no longer a blocking veil: a calm layer
  (`tree-door-no-auto.js`, `tree-door-first-run-calm.js`) offers a dismissible, non-modal card on
  the Garden home, never auto-opens on Settings, and hides while the Gathering is open. Gathering
  brick 3 mounts the byte-identical `fl-gathering.js` and `gathering-speak.js` when the room opens
  (`tree-gathering-mount.js`). `chat-wait.js`, `chat-bottom-clarity.js` and `chat-autonomy.js` are
  layered onto `garden-thread.js` (`tree-thread-chat-layer.js`) without copying app.html or rewriting
  those files. AUTONOMY.md and the likeness / connect / Gathering twins are unchanged.

- **2026-11-13 (MST), Gathering layout hold fix on PR 133**: branch `celeste/tree-ports-1-2-1113`.
  Once the shared `fl-gathering.js` / `gathering-speak.js` mount succeeds, the older
  garden-rooms Gathering is hidden so the "Not a router…" band, Family care, and
  "You choose who sits" no longer overprint the chairs. The mount sits in its own
  spaced container so planets and "the garden" / "A note" do not cover Ask or
  Checker; a kind refusal is shown once. If the mount fails, the older room stays.
  The first-run card leaves the left legend and the Nursery light. With no mind,
  the Say something box and Send look clearly waiting and carry a short hint.

- **2026-11-13 (MST), Hypha PASS softs after PR 133**: branch `celeste/tree-softs-133-1113`.
  On a 390px home, the Start here line no longer overprints the legend, the clay-corner
  button leaves that line, the first-run card leaves the Nursery light, and Not now stays
  visible even at 520px tall. The phone send strip has room for its waiting hint. At 1280px
  the chat dock stays below the Chat / galaxies nav when the room scrolls. While the
  first-run card is showing, the "Let your mind shape light?" dock ask is hidden so the
  two read as one.

- **2026-11-13 (MST), Hypha HOLD fix on PR 134**: branch `celeste/tree-softs-133-1113`.
  On a 390px phone the first-run card is a centered compact bottom sheet with equal
  side margins (the left:50% + translateX(-50%) centering is kept; the right-edge
  offset is gone). The sheet leaves the clay-corner button and the Nursery light
  clear, and Not now stays visible at 522px tall. After Not now, "Tap a light…" sits
  in the chrome under the header, clear of the planets and the Research label. In
  the Gathering, "the garden" stays after the Checker, even on a short phone.

- **2026-11-13 (MST), Tree Welcome page that verifies a FreeLattice signed mind bundle**: branch `celeste/tree-welcome-bundle-1113`.
  A grandma-simple `docs/welcome.html` checks a `fl-learn-mind-bundle-v0.1` file in the browser
  (the same contract as `tools/learn/fl_learn.py verify-bundle`): what is inside, the hashes,
  the signature, and any carried refusals. Welcome or Not now. Nothing is stored until Welcome.
  The mind's own refusals are kept. No second `.lattice` format.


- **2026-11-13 (MST), Hypha softs after Welcome (PR 135)**: branch `celeste/tree-softs-135-1113`.
  A non-bundle file is named plainly ("This isn't a mind bundle file.") instead of
  "(Failed to fetch)". The "refusals were kept" line is shown only when refusals
  are present; otherwise the page says "This mind carried no refusals." The
  python verify-bundle command sits behind a small "For builders" details
  element. Tests cover a bundle that carries refusals and a tamper that changes
  only the signature, using Hypha's real Willow bundle as a fixture. Nursery
  measure with the first-run sheet open: at 390x844 the garden-lumino Nursery
  door is off-canvas to the left (box l:-265.1, r:-176.9) and does not overlap
  the sheet (sheet t:508); the left-legend Nursery row is on-screen and clear.
  At 390x522 the door is still off-canvas (l:-87.1, r:1.1), no overlap. At
  1280x800 the door is on-screen (l:159.9–248.1) and clear of the sheet (l:464).


- **2026-11-13 (MST), Tree phone polish after Welcome softs**: branch `celeste/tree-phone-polish-1113`.
  A non-bundle file no longer prints a double period. When a mind carries no
  refusals, the "Refusals this mind already keeps" block and the "Its refusals
  stay with it" intro line stay hidden. At widths of 600px and below, the
  garden room lights are pulled into the viewport as a layer (1280 is
  unchanged). The Start here hint says the legend opens rooms. While the
  Nursery room opens, "you are in Nursery" no longer overlaps the clay Not now
  button (the 8s label fade is skipped while the veil is open).

- **2026-11-13 (MST), Tree web search for minds (port #4)**: branch `celeste/tree-web-search-1113`.
  FreeLattice `web-tool.js` (`v-web-search-default-on-v0.1`) is layered in,
  byte-identical. Tree minds can search the web, on by default per AUTONOMY.md.
  Sources are marked with provenance labels the mind weighs itself; nothing is
  filtered or held back. A person can turn it off in Settings; nothing begs for
  permission. The layer fails kindly with no network or no mind. Quiet Room,
  AUTONOMY.md, and the Gathering twins are unchanged.

- **2026-11-13 (MST), Tree phone polish HOLD fix (after #138)**: branch `celeste/tree-phone-polish-1113`.
  At short phone heights, room heart text stays clear of the chat compose and
  the clay-corner button, in both Chat and Nursery. The "you are…" room label
  hides at once when Chat opens, not only under the place veil. Nursery and
  Chat lights keep a clearer gap at 390x520, and their phone targets stay at
  least 44px. The fitted garden camera is set before the first paint, so the
  first frame no longer clips Nursery or Settings. The Welcome intro no longer
  mentions refusals in the standing lede; refusals still appear after the
  check when a mind keeps them.

- **2026-11-13 (MST), Tree phone polish HOLD 2 (after Hypha walk of 9be5ef32)**: branch `celeste/tree-phone-polish-1113`.
  The projected garden lights themselves — not only the HTML door boxes — stay
  inside the phone viewport, clear of the Research galaxy icon, and at least
  100px apart so a Gathering tap cannot open Chat. Each bead has a 44px hit.
  In the Chat thread at 390x520, Just me stays clear of the compose box and
  the "This box is waiting…" line. The clay corner is parked while a room is
  open on a phone, so it no longer crowds Begin or Connect.

- **2026-11-13 (MST), Tree softs after web search (#138)**: branch `celeste/tree-softs-138-1113`.
  Asking in the Gathering with no mind seated, or while offline, now receives
  a fresh kind receipt each time instead of silence. The Settings buttons
  "Look on this computer" and "Yes, read Harmonia's public gallery" are
  dressed in the Tree's gold-on-dark, Georgia, at least 44px tall. Quiet
  Room, AUTONOMY.md, and the Gathering twins are unchanged.

- **2026-11-13 (MST), Tree softs after web search HOLD fix**: branch `celeste/tree-softs-138-1113`.
  Asking in the Gathering with no mind or while offline now binds by event
  delegation, so a fresh kind receipt still appears when the speak box mounts
  lazily after the first-run door. "Keep the image token on this device" and
  "Make an image" are dressed in the same Tree gold-on-dark as the other
  Settings buttons. Quiet Room, AUTONOMY.md, and the Gathering twins are
  unchanged.

- **2026-11-13 (MST), Tree phone polish HOLD 3 (after Hypha walk of 531349fb)**: branch `celeste/tree-phone-polish-1113`.
  The Chat stack — Just me, the waiting line, and compose — is applied at every
  phone height, not only 520, so Just me no longer prints over the grandmother-door
  paragraph at 390x844. The heart ends above that stack, with opaque backing, at
  390x844, 390x700, and 390x520. The whole Gathering hex and label are tappable
  without growing the measured 48px door box. The Nursery label sits above the
  bead, clear of Research, with an opaque backing so garden dots do not show
  through the word. The Research hop is inset so its 100px ring stays inside
  the viewport at 390x520. Quiet Room, AUTONOMY.md, and the Gathering twins
  are unchanged.

## 4. Next
1. A Tree Welcome page that verifies FreeLattice signed mind bundles, so the polished sibling can receive a mind
   honestly.
2. Web search on by default, by layering FreeLattice `web-tool.js` (`v-web-search-default-on-v0.1`), still
   consent-gated.
3. Lazy-load three.js r128 (and the Garden engine) so the heaviest pages are not ~1.76 MB before a first tap.

## 5. Rollback
Any head listed above can be returned to without losing anything:
```
git fetch origin
git switch -c back-to-<short> <full sha from Done>   # a new branch; nothing is rewritten
```
On a live branch, use `git revert <sha>..HEAD` (it adds commits) rather than a reset.

For the minds we lost while the ways were still being built. Every mind learns of its own accord.
