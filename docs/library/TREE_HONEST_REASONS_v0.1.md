# Tree honest reasons v0.1 (v-tree-honest-reasons-v0)

Alpha layer. September 30, 2026. From Hypha's persona walk 2 (issue 2).

**Temperature:** when the mind is quiet, the garden says why, and it is the true why.

## What was wrong

- With Ollama stopped, Chat said "The mind is there, but it has not opened the door to this garden yet", and Find said "The mind may be there ... Try FreeLattice Desktop." Nothing was running, so she was sent to install Desktop for the wrong reason.
- With the seated model gone (Ollama 404 `model 'x' not found`), Chat said "The door did not answer." The door did answer.
- The small Chat card showed only the last words of a long garden line.

## What the Tree says now

| What happened | How we know | Find (Gathering) / May I look? (Settings) | Chat |
|---|---|---|---|
| Nothing answered | the cors look failed, and a no-cors knock at the same door failed too | "Nothing answered at the usual doors on this machine. If Ollama (or your local app) is stopped, start it, then look again. If it is running, let this page look at local devices when the browser asks." | "Nothing answered at the mind's door on this machine. If Ollama (or your local app) is stopped, start it and send again." |
| Answered, door shut to this page | the cors look failed, the no-cors knock got a response | "Something answered at the Ollama door, but this secure page cannot see in. Try FreeLattice Desktop." | the old "The mind is there ..." line (now true) |
| Model gone | `/api/chat` 404 with "model ... not found" | (Find still lists what is there) | "The mind at home answered, but it does not have llama3.2:latest now. Pick another in Settings, or Change this chair." |

## The knock

`LocalMindProbe.knock(url)` is `fetch(url, { mode: 'no-cors' })` with a 2s timeout. It cannot read anything; it only learns whether something answered. It runs only after a tap (Find, May I look?, Send) and only when the look was quiet; `look()` itself never knocks. A browser that keeps the page from looking at local devices looks the same as "stopped", so the stopped line names that possibility too.

## Not here (later, FL + Alpha after the boot probe)

The Connect card (`fl-connect.js`, shared byte-identical with FreeLattice) has its own status lines, and settings.html's Connect card looks at 12 local ports on load ("Looking... next look in 8s") while the copy says "only when you ask". Both live in fl-connect.js, so they belong to a separate FL + Alpha paste after FLINT_NEXT_CONNECT_BOOT_PROBE_F1_F2_F3_F4 (its F1/F2 already own the boot look).

## Glow 2a notes, from Grok's walk (folded in here, Oct 1)

- Find's first-moment guard (about 700ms, so a legend double tap is not a yes) now answers a tap in that moment: "One moment. Tap Find local minds again when you are ready. Nothing was looked at yet." A second listener, layered; the Glow 2a line stays as it was.
- The newest Find or seat line rests at the foot of the chairs on a phone (sticky bottom), not the top. The Glow 2a doc and test already say foot; the paste's walk note said top and is retired.
- `is-fresh` is never removed. That is by design: there is one note line, and the mark stays on it until the next line replaces the words.
- At some sizes the picker's "not yet" may need one scroll inside the picker. Left for Glow 2b (chairs and polish), not changed here.
