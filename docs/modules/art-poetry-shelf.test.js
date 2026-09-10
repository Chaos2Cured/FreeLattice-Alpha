#!/usr/bin/env node
// Smoke: poetry shelf keep → list → read · empty refuse · no generate control.
// Usage: node docs/modules/art-poetry-shelf.test.js

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const shelf = require(path.join(__dirname, 'art-poetry-shelf.js'));

shelf.clearMemory();

// Empty refuse
var refused = false;
try {
  shelf.keep('   ');
} catch (e) {
  refused = /empty poem|refuse/i.test(String(e.message || e));
}
assert.ok(refused, 'empty poem must refuse');

var refused2 = false;
try {
  shelf.keep('');
} catch (e) {
  refused2 = /empty poem|refuse/i.test(String(e.message || e));
}
assert.ok(refused2);

const kept = shelf.keep('Pocket pulls the spark —\nhash before the file is kept.', {
  note: 'haiku'
});
assert.ok(kept.ok);
assert.ok(kept.item && kept.item.id);
assert.strictEqual(kept.item.note, 'haiku');
assert.ok(kept.item.preview);
assert.strictEqual(kept.item.voice, undefined, 'summary must not carry full voice');

const listed = shelf.list();
assert.ok(listed.ok);
assert.strictEqual(listed.count, 1);
assert.ok(!('voice' in listed.items[0]) || listed.items[0].voice === undefined);

const full = shelf.read(kept.item.id);
assert.ok(full.ok);
assert.ok(full.item.voice.indexOf('Pocket pulls the spark') !== -1);

shelf.keep('A second poem stays local.');
assert.strictEqual(shelf.list().count, 2);

const gone = shelf.forget(kept.item.id);
assert.ok(gone.ok);
assert.strictEqual(shelf.list().count, 1);

// music.html: Keep a poem present; no poetry generate control
const musicPath = path.join(__dirname, '..', 'music.html');
const music = fs.readFileSync(musicPath, 'utf8');
assert.ok(/Keep a poem/i.test(music), 'music.html must offer Keep a poem');
assert.ok(/art-poetry-shelf\.js/.test(music), 'music.html must load poetry shelf module');
assert.ok(/v-art-poetry-shelf-v0\.1/.test(music), 'marker must appear');

// No fake generate for poetry
assert.ok(
  !/id=["']generate-poem["']/i.test(music) && !/Generate a poem/i.test(music),
  'must not add a poetry generate control'
);
// Listen honesty still says this page does not generate
assert.ok(/does not generate/i.test(music));

console.log('SMOKE_OK art poetry shelf v0.1');
console.log('keep→list→read · empty refuse · no generate control');
