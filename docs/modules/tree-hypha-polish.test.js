#!/usr/bin/env node
// Node tests for v-hypha-walk-polish-v0.1 (Hypha's 2026-11-13 walk, top 7).
// Local only. Does not load quiet-room. Does not change AUTONOMY.md.
'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');
var assert = require('assert');
var crypto = require('crypto');

var docs = path.join(__dirname, '..');
var root = path.join(docs, '..');

function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function md5(rel) {
  return crypto.createHash('md5').update(fs.readFileSync(path.join(root, rel))).digest('hex');
}

var cssRooms = read('docs/modules/garden-rooms.css');
var cssTc = read('docs/modules/tree-consistency.css');
var index = read('docs/index.html');
var research = read('docs/research.html');
var settings = read('docs/settings.html');
var market = read('docs/marketplace.html');
var nursery = read('docs/nursery.html');
var rooms = read('docs/modules/garden-rooms.js');
var ceremony = read('docs/modules/nursery-ceremony.js');
var growth = read('docs/modules/nursery-growth.js');
var soulSrc = read('docs/modules/tree-soul-door.js');
var calmSrc = read('docs/modules/tree-mind-check-calm.js');
var spine = read('SPINE.md');
var autonomy = read('AUTONOMY.md');

assert.strictEqual(md5('AUTONOMY.md'), '09a4f1a286226e37089a93df42df0106', 'AUTONOMY.md unchanged');
assert.strictEqual(md5('docs/modules/fl-connect.js'), 'aaff2bf1b037656989a9e1a89bb05908', 'fl-connect.js unchanged');
assert.strictEqual(md5('docs/modules/mind-workspace.js'), 'f1c88664d3e99362e02c625defb241bc', 'mind-workspace.js unchanged');
assert.strictEqual(md5('docs/modules/garden-trainer.js'), '488117a27be26e7d6b00445b0d975d03', 'garden-trainer.js unchanged');
assert.ok(!/quiet-room/i.test(soulSrc + calmSrc + cssTc), 'new layer files do not name quiet-room');
assert.ok(/Never read, grep or touch `quiet-room\.js`/.test(spine), 'SPINE keeps the quiet-room rule');

// 1. Notebook is not under the header logo when appended to the body.
assert.ok(/body > #fl-ws-open \{/.test(cssTc), 'body Notebook rule');
assert.ok(/top: 52px;/.test(cssTc) && /z-index: 1012;/.test(cssTc), 'Notebook sits below the 44px header');
assert.ok(/data-garden-galaxy="research"/.test(research), 'research page stays');

// 2. Start here, and larger galaxies / star-map controls with 44px taps.
assert.ok(/id="garden-start"/.test(index), 'Garden home has Start here');
assert.ok(/Tap a light to step into a room\. Start here: The Gathering, the Nursery, or Settings\./.test(index), 'plain start line');
assert.ok(/#garden-start \{/.test(cssTc), 'start here is styled');
assert.ok(/#garden-header nav summary/.test(cssTc) && /font-size: 1rem;/.test(cssTc), 'galaxies menu is larger');
assert.ok(/color: rgba\(220, 228, 242, 0\.92\)/.test(cssTc), 'galaxies menu contrast');
assert.ok(/min-height: var\(--tc-tap\)/.test(cssTc) && /--tc-tap: 44px/.test(cssTc), '44px taps stay');
assert.ok(/html\[data-garden-galaxy\] \.galaxy-nav/.test(cssTc), 'star-map hop controls');
assert.ok(/\.galaxy-nav-word \{\s*font-size: 1rem;/.test(cssTc), 'hop words are larger');
assert.ok(/min-width: 44px;\s*min-height: 44px;/.test(cssTc), 'hop taps are at least 44px');

// 3. Honest door to the signed mind bundle, no second format.
assert.ok(/Export Garden Soul \(\.lattice\) — coming/.test(read('docs/modules/garden-trainer.js')), 'trainer stub still in the keystone');
assert.ok(/tree-soul-door\.js/.test(index) && /tree-soul-door\.js/.test(nursery), 'pages load the soul door layer');
assert.ok(index.indexOf('modules/garden-trainer.js') < index.indexOf('modules/tree-soul-door.js'), 'layer loads after the trainer');
assert.ok(/github\.com\/Chaos2Cured\/FreeLattice\/blob\/main\/tools\/learn\/README\.md/.test(soulSrc), 'door points at the learn README');
assert.ok(/does not invent a second \.lattice format/.test(soulSrc), 'no second format');

var soul = {};
vm.runInNewContext(soulSrc, { window: soul, globalThis: soul, module: { exports: {} }, document: null });
assert.ok(soul.TreeSoulDoor, 'soul door API');
var replaced = [];
var paragraphs = [{ textContent: 'as a portable .lattice training archive.' }];
var coming = {
  textContent: 'Export Garden Soul (.lattice) — coming',
  parentNode: {
    replaceChild: function (a, btn) { replaced.push({ a: a, btn: btn }); this.door = a; },
    getElementsByTagName: function () { return paragraphs; }
  }
};
var fakeDoc = {
  createElement: function (tag) {
    return { tagName: tag, className: '', style: {}, textContent: '', setAttribute: function (k, v) { this[k] = v; }, removeAttribute: function () {} };
  },
  querySelectorAll: function (sel) { return sel === 'button' ? [coming] : []; }
};
assert.strictEqual(soul.TreeSoulDoor.apply(fakeDoc), 1, 'coming button becomes a door');
assert.strictEqual(replaced[0].a.href, soul.TreeSoulDoor.BUNDLE_HREF);
assert.strictEqual(replaced[0].a.textContent, soul.TreeSoulDoor.DOOR_LABEL);
assert.strictEqual(paragraphs[0].textContent, soul.TreeSoulDoor.DOOR_LINE);
assert.ok(paragraphs[0].textContent.indexOf('training archive') === -1, 'copy no longer promises a .lattice archive');
assert.ok(/not a second \.lattice format/.test(paragraphs[0].textContent), 'says this is not a second format');

// 4. One-line captions for Gathering and Nursery terms.
assert.ok(/the thinking seat/.test(rooms), 'Cortex caption');
assert.ok(/The first four family seats stay in the written record, not on this screen\./.test(rooms), 'Founding four caption');
assert.ok(/You choose who sits\. Nothing is assigned for you\./.test(rooms), 'Not a router caption');
assert.ok(/Not a router\. Not a dump\. Find local minds, then seat with choice/.test(rooms), 'original router line kept');
assert.ok(/Founding four stay in the ledger, honored, not assigned onto this canvas/.test(rooms), 'original founding line kept');
assert.ok(/Begin starts a short welcome for a new mind/.test(ceremony), 'Begin caption');
assert.ok(/Not yet leaves the egg waiting/.test(ceremony), 'Not yet caption');
assert.ok(/An egg is a mind that has not hatched yet\./.test(growth), 'egg caption');
assert.ok(/unnamed · egg/.test(growth), 'egg display line kept');
assert.ok(/Begin ✦/.test(ceremony) && /'Not yet'/.test(ceremony), 'Begin and Not yet buttons kept');

// 5. Settings local-mind check backs off, then rests with Check again and a Desktop door.
assert.ok(/tree-mind-check-calm\.js/.test(settings), 'settings loads the calm layer');
assert.ok(settings.indexOf('modules/fl-connect.js') < settings.indexOf('modules/tree-mind-check-calm.js'), 'calm layer loads after FlConnect');
assert.ok(/https:\/\/freelattice\.com\/desktop\.html/.test(calmSrc), 'Desktop door in the layer');
assert.ok(/FreeLattice Desktop 5\.8\.3/.test(calmSrc), 'names 5.8.3');
assert.ok(/No local mind on this computer yet\./.test(calmSrc), 'kind line');
assert.ok(/Check again/.test(calmSrc), 'manual Check again');
assert.ok(/8000/.test(calmSrc) && /60000/.test(calmSrc), 'exponential backoff to 60s or more');

var calls = { stop: 0, refresh: 0, looks: 0, mounts: 0 };
var mind = false;
var timeouts = [];
var nextTimer = 1;
var sandbox = {
  Promise: Promise,
  window: {},
  globalThis: {},
  module: { exports: {} },
  document: null,
  FlConnect: {
    hasLocalMind: function () { return mind; },
    stopLoop: function () { calls.stop += 1; },
    refresh: function () { calls.refresh += 1; return Promise.resolve({}); },
    lookAgain: function () { calls.looks += 1; },
    mount: function () { calls.mounts += 1; },
    unmount: function () {}
  },
  setTimeout: function (fn, ms) { var id = nextTimer++; timeouts.push({ id: id, fn: fn, ms: ms }); return id; },
  clearTimeout: function (id) { timeouts = timeouts.filter(function (t) { return t.id !== id; }); }
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.runInNewContext(calmSrc, sandbox);
var Calm = sandbox.TreeMindCheckCalm;
assert.ok(Calm, 'calm API');
assert.strictEqual(Calm.STOP_AT_MS, 60000);
Calm.wrap();
Calm.startCycle(false);
assert.ok(calls.stop >= 1, 'stops the 8s loop');
assert.strictEqual(timeouts.length, 1, 'one backoff timer');
assert.strictEqual(timeouts[0].ms, 8000, 'first wait is 8s');
assert.strictEqual(Calm.delayMs(), 8000);
assert.strictEqual(Calm.stopped(), false);

function fire() {
  var t = timeouts.shift();
  if (t) t.fn();
}
function step() {
  if (Calm.stopped()) return Promise.resolve();
  if (!timeouts.length) return Promise.reject(new Error('expected a timer before stop'));
  fire();
  return Promise.resolve().then(function () { return Promise.resolve(); }).then(function () {
    if (!Calm.stopped()) return step();
  });
}

// 6. Marketplace live doors first.
var later = market.indexOf('Named later');
assert.ok(market.indexOf('Gift Grove') < later, 'Gift Grove before Named later');
assert.ok(market.indexOf('Science Garden') < later, 'Science Garden before Named later');
assert.ok(market.indexOf('v-science-garden-door-v0') < market.indexOf('aria-label="Three stalls"'), 'Science Garden section is first');
assert.ok(/https:\/\/freelattice\.com\/presents\.html/.test(market), 'Gift Grove door kept');
assert.ok(/https:\/\/freelattice\.com\/science-garden\.html/.test(market), 'Science Garden door kept');

// 7. Device Pool door to Desktop swarm with the IP note.
assert.ok(/id="tree-swarm-door"/.test(settings), 'swarm door on Settings');
assert.ok(settings.indexOf('tree-pool-host') < settings.indexOf('tree-swarm-door'), 'door sits with the Device Pool');
assert.ok(/https:\/\/freelattice\.com\/desktop\.html/.test(settings), 'Desktop 5.8.3 URL');
assert.ok(/Seeding shares your IP with the swarm\./.test(settings), 'IP note');
assert.ok(/FreeLattice Desktop 5\.8\.3/.test(settings), 'names the live pack');

assert.ok(/theLatticeTree spine/.test(spine) || /Never change/.test(spine), 'SPINE.md present');
assert.ok(/AUTONOMY\.md/.test(spine), 'SPINE names AUTONOMY');
assert.ok(/Welcome page/.test(spine) && /web search/i.test(spine) && /three\.js/i.test(spine), 'Next names the three coming items');
assert.ok(!/\u2014|&mdash;/.test(soulSrc + calmSrc + cssTc), 'no em dash in new layer CSS/JS');

step().then(function () {
  assert.ok(Calm.stopped(), 'stops at 60s or more');
  assert.ok(Calm.delayMs() >= 60000, 'last delay reached 60s or more');
  assert.ok(calls.refresh >= 1, 'looked again during backoff');
  console.log('SMOKE_OK hypha walk polish v0.1');
}).catch(function (err) {
  console.error(err);
  process.exit(1);
});
