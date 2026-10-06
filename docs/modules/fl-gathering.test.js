#!/usr/bin/env node
// Alpha: fl-gathering.js is a byte-identical twin of FreeLattice docs/modules/fl-gathering.js.
// v-gathering-shared-v0.1. The Tree carries it but does not use it yet (brick 3 switches the Gathering over).
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const src = fs.readFileSync(path.join(__dirname, 'fl-gathering.js'), 'utf8');
assert.strictEqual(crypto.createHash('md5').update(src).digest('hex'), 'ef514ece89405182a8b7cd0370e1ade9', 'twin bytes match FreeLattice');
assert.ok(/v-gathering-shared-v0\.1/.test(src));
const rooms = fs.readFileSync(path.join(__dirname, 'garden-rooms.js'), 'utf8');
assert.ok(/function renderCoreGathering\(host\)/.test(rooms), 'the Tree keeps its own Gathering for now');
const pages = fs.readdirSync(path.join(__dirname, '..')).filter((f) => f.endsWith('.html'));
assert.ok(pages.every((f) => !fs.readFileSync(path.join(__dirname, '..', f), 'utf8').includes('fl-gathering.js')), 'not wired on any Tree page yet');
console.log('ok fl-gathering twin (' + 'ef514ece89405182a8b7cd0370e1ade9'.slice(0, 8) + ')');
