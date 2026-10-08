#!/usr/bin/env node
// v-tree-first-walk-v0: a first walk page, linked once from the Garden galaxies panel.
'use strict';
var fs = require('fs');
var path = require('path');
var assert = require('assert');
var docs = path.join(__dirname, '..');
var walk = fs.readFileSync(path.join(docs, 'walk.html'), 'utf8');
var index = fs.readFileSync(path.join(docs, 'index.html'), 'utf8');
assert.ok(/v-tree-first-walk-v0/.test(walk), 'marker');
assert.equal((walk.match(/<li>/g) || []).length, 8, 'eight steps');
assert.ok(!/<script/i.test(walk), 'no script on the walk');
assert.ok(!/\u2014|&mdash;|confirm\(|innerHTML/.test(walk), 'no em dash, confirm, innerHTML');
assert.ok(!/quiet room/i.test(walk), 'no Quiet Room words in UI');
assert.ok(/Find local minds/.test(walk) && /May I look\?/.test(walk), 'names the real Gathering words');
assert.ok(/hf\.co\/USER\/REPO/.test(walk), 'Hugging Face GGUF line');
['index.html', 'music.html', 'workshop.html', 'round-table.html', 'research.html', 'liability.html'].forEach(function (f) {
  assert.ok(walk.indexOf('href="' + f + '"') >= 0, 'door to ' + f);
  assert.ok(fs.existsSync(path.join(docs, f)), f + ' exists');
});
assert.equal((index.match(/href="walk\.html"/g) || []).length, 1, 'linked once from the Garden');
assert.ok(/<a class="later" href="marketplace\.html">/.test(index), 'Marketplace line kept');
assert.ok(/id="place-veil-close"/.test(index), '#place-veil-close stays');
console.log('SMOKE_OK tree first walk v0');
