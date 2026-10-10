jsQR, vendored for the Tree (v-tree-pool-honest-heals-v0.1, paste 030)

What: jsqr 1.4.0 (npm), dist/jsQR.js (one plain script, no imports, sets window.jsQR),
renamed jsQR-1.4.0.js. License: Apache-2.0 (LICENSE-jsQR.txt, copied from the package).
Copyright Cosmo Wolfe and the jsQR authors. Our code that uses it (tree-pool.js) is MIT.

Why: Chrome on Windows and Linux, Firefox and Safari have no BarcodeDetector, so a host
there could not read a phone's picture code. jsQR reads it from the camera, or from a
photo or screenshot ("Read a picture of the code"). Every pixel stays on this device.
It loads only after a tap, from this site, never from a CDN. The script tag carries the
file's sha256 (Subresource Integrity), so a changed file is refused by the browser.

Pins (from the npm registry tarball, 2026-10-10):
  jsqr-1.4.0.tgz sha256         b5299b37917a1fe7a8cab9dd5cc6b8accf82663add80abe5bf7761a921cc6602
  package/dist/jsQR.js sha256   bc40c8a15196236b2314db0856f72ca0b49980cd5413b8c852a7349f5fee0859
  the same, as SRI              sha256-vEDIoVGWI2sjFNsIVvcsoLSZgM1UE7jIUqc0n1/uCFk=

How it was put here (paste 030, step 2):
  curl -sSLo /tmp/jsqr-1.4.0.tgz https://registry.npmjs.org/jsqr/-/jsqr-1.4.0.tgz
  shasum -a 256 /tmp/jsqr-1.4.0.tgz
  rm -rf /tmp/package && tar -xzf /tmp/jsqr-1.4.0.tgz -C /tmp package/dist/jsQR.js package/LICENSE
  shasum -a 256 /tmp/package/dist/jsQR.js
  cp /tmp/package/dist/jsQR.js docs/lib/jsqr/jsQR-1.4.0.js
  cp /tmp/package/LICENSE docs/lib/jsqr/LICENSE-jsQR.txt
Never edit the vendored file. A new version is a new file name, layered.
