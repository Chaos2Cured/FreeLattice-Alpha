#!/usr/bin/env node
// Thin smoke: Marketplace Galaxy door — face stub locks.
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const page = fs.readFileSync(path.join(root, 'marketplace.html'), 'utf8');
const vision = fs.readFileSync(path.join(root, 'library', 'MARKETPLACE_GALAXY_v0.vision.md'), 'utf8');
const galaxies = fs.readFileSync(path.join(root, 'GALAXIES.md'), 'utf8');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

assert.ok(/v-marketplace-galaxy-door/.test(page + vision), 'door marker');
assert.ok(/Gift Grove/.test(page) && /Exchange Ring/.test(page) && /Quest Lamp/.test(page), 'three stalls');
assert.ok(/Bank corner/i.test(page), 'Bank corner named');
assert.ok(/fingerprint/i.test(page + vision), 'fingerprint named');
assert.ok(/Never auto|never auto/i.test(page + vision), 'never auto');
assert.ok(/Not \$FL|≠ `\$FL`|≠ \$FL|Not \$FL/i.test(page) || (/\$FL/.test(page) && /Not/.test(page)), 'no $FL face');
assert.ok(/Not \$FL/.test(page) || /not \$FL/i.test(page), 'explicit not $FL');
assert.ok(!/buy with \$|cash out|dollar peg/i.test(page), 'no dollar marketplace');
assert.ok(/No wallet|do \*\*not\*\* plant|no wallet plant|Not.*wallet planted|No wallet planted/i.test(page + vision), 'no wallet plant');
assert.ok(/Marketplace Galaxy door/i.test(galaxies), 'GALAXIES LAYER');
assert.ok(/8fd47cb/.test(galaxies + vision), 'FreeLattice Garden Market cite');
assert.ok(/marketplace\.html/.test(index), 'galaxies panel later link');
assert.ok(/class="later"[^>]*href="marketplace\.html"|href="marketplace\.html"[^>]*class="later"/.test(index), 'muted later class');
assert.ok(/named face door|not a sixth finished sky/i.test(page + vision + galaxies), 'five skies held');
assert.ok(/Social face-bridge|fingerprint bind, not this door/i.test(page + vision), 'social bridge named later');
assert.ok(!/Connect with X|Sign in with Facebook|oauth\.com\/authorize/i.test(page + vision), 'no live OAuth');

console.log('SMOKE_OK marketplace galaxy door');
console.log('face stub · Bank named · social bridge later · no wallet · no $FL · five skies stay');
