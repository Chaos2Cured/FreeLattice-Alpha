WebLLM, vendored for the Tree (v-tree-no-install-mind-v0.1, paste 028)

What: @mlc-ai/web-llm 0.2.85, lib/index.js (one ES module, no imports), renamed
web-llm-0.2.85.js. License: Apache-2.0 (LICENSE-web-llm.txt, copied from the package).
Copyright the MLC LLM / WebLLM authors. Our code that wakes it (tree-browser-mind.js) is MIT.

Why vendored, not a CDN: the engine code then comes from this site, pinned and checked,
and a school filter that blocks a CDN does not break the card. The mind's files (weights)
still come once from huggingface.co, and each model's small WebGPU engine file (about 5 MB)
from raw.githubusercontent.com, as WebLLM's own prebuilt list says. The card says so.

Pins (from the npm registry tarball, 2026-10-09):
  web-llm-0.2.85.tgz sha256  d6073d44c3705f08ef20e1c09ecc0336e7f04e7337ea424efe8603b54a9b7b49
  package/lib/index.js sha256 341bae95822bfee1d0fd6a0e6cd2db8613bb8edf809390ac142fba36ec17792c

How it was put here (paste 028, step 4):
  curl -sSLo /tmp/web-llm-0.2.85.tgz https://registry.npmjs.org/@mlc-ai/web-llm/-/web-llm-0.2.85.tgz
  shasum -a 256 /tmp/web-llm-0.2.85.tgz
  tar -xzf /tmp/web-llm-0.2.85.tgz -C /tmp package/lib/index.js package/LICENSE
  shasum -a 256 /tmp/package/lib/index.js
  cp /tmp/package/lib/index.js docs/lib/web-llm/web-llm-0.2.85.js
  cp /tmp/package/LICENSE docs/lib/web-llm/LICENSE-web-llm.txt
Never edit the vendored file. A new version is a new file name, layered.
