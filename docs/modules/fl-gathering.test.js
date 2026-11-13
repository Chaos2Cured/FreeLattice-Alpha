#!/usr/bin/env node
// Alpha: fl-gathering.js is a byte-identical twin of FreeLattice docs/modules/fl-gathering.js.
// v-gathering-shared-v0.1. Brick 3: live Garden pages load the twin; tree-gathering-mount.js mounts it when the Gathering opens.
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const src = fs.readFileSync(path.join(__dirname, 'fl-gathering.js'), 'utf8');
assert.strictEqual(crypto.createHash('md5').update(src).digest('hex'), '4dbbff5d554c42256605b37939835080', 'twin bytes match FreeLattice');
assert.ok(/v-gathering-shared-v0\.1/.test(src));
const rooms = fs.readFileSync(path.join(__dirname, 'garden-rooms.js'), 'utf8');
assert.ok(/function renderCoreGathering\(host\)/.test(rooms), 'garden-rooms still has its Gathering render (layer, never delete)');
const pages = fs.readdirSync(path.join(__dirname, '..')).filter((f) => f.endsWith('.html'));
const live = ['index.html', 'settings.html', 'nursery.html', 'research.html', 'workshop.html', 'music.html', 'team.html', 'round-table.html'];
live.forEach(function (f) {
  const html = fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
  assert.ok(html.includes('fl-gathering.js'), f + ' loads fl-gathering.js');
  assert.ok(html.includes('gathering-speak.js'), f + ' loads gathering-speak.js');
  assert.ok(html.includes('tree-gathering-mount.js'), f + ' loads the mount layer');
});
assert.ok(pages.filter((f) => !live.includes(f)).every((f) => !/script src="modules\/fl-gathering\.js"/.test(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'))), 'docs-only pages do not need the live mount');
assert.ok(/v-gathering-speak-checker-v0\.1/.test(fs.readFileSync(path.join(__dirname, 'gathering-speak.js'), 'utf8')));
console.log('ok fl-gathering twin (' + '4dbbff5d554c42256605b37939835080'.slice(0, 8) + ')');
