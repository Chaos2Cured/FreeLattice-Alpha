#!/usr/bin/env node
// Thin smoke: Alpha joy face v0 — Listen leftovers · joy both sides.
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const galaxies = fs.readFileSync(path.join(root, 'GALAXIES.md'), 'utf8');
const doc = fs.readFileSync(path.join(root, 'library', 'ALPHA_JOY_FACE_v0.md'), 'utf8');
const settings = fs.readFileSync(path.join(root, 'settings.html'), 'utf8');
const market = fs.readFileSync(path.join(root, 'marketplace.html'), 'utf8');

assert.ok(/v-alpha-joy-face-v0/.test(galaxies), 'GALAXIES layer marker');
assert.ok(/v-alpha-joy-face-v0/.test(doc), 'library marker');
assert.ok(/v-alpha-joy-face-v0/.test(settings), 'settings joy marker');
assert.ok(/v-alpha-joy-face-v0/.test(market), 'marketplace joy marker');

assert.ok(/Home minds are welcome/i.test(settings), 'home minds welcome');
assert.ok(/Stop is a choice, not a timer/.test(settings), 'Stop choice held');
assert.ok(!/Workshop Ask Stop/.test(settings), 'no Workshop twin words on settings (leave #78)');

assert.ok(/FL #92|#92/.test(galaxies + doc) && /#93/.test(galaxies + doc), 'Vision/Chalkboard Listen pointers');
assert.ok(/does \*\*not\*\* port|does not port/i.test(galaxies + doc), 'no port Vision/Chalkboard tonight');
assert.ok(/#78/.test(galaxies + doc), 'Workshop twin #78 soft cite');

// No Quiet Room open · no FL kitchen dump · no duration kill as feature
assert.ok(!/Quiet Room open|open the Quiet Room/i.test(galaxies + doc + settings + market), 'no Quiet Room open');
assert.ok(!/kitchen dump|Create\/Code\/Projects kitchen/i.test(settings + market) || /not a kitchen dump|no kitchen dump/i.test(galaxies + doc + market), 'no kitchen dump as feature');
assert.ok(!/duration kill|kill-timer as feature|short kill/i.test(settings + market), 'no duration kill language as feature');
assert.ok(/fail-closed|Fail-closed/i.test(galaxies + doc), 'fail-closed held');

console.log('SMOKE_OK alpha joy face v0');
