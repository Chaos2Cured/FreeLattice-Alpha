#!/usr/bin/env node
// Node tests for v-hypha-walk-polish-v0.3 (Hypha's 2026-11-13 walk, PASS softs).
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

// 1 / H1. Notebook button and consent sit below the header, on screen, above it.
assert.ok(/body > #fl-ws-open \{/.test(cssTc), 'body Notebook rule');
assert.ok(/top: 52px;/.test(cssTc) && /z-index: 1012;/.test(cssTc), 'Notebook sits below the 44px header');
assert.ok(/body > #fl-ws-consent/.test(cssTc), 'consent rule');
assert.ok(/body > #fl-ws-panel/.test(cssTc) && /body > #fl-ws-restore-card/.test(cssTc), 'notebook panel rules');
assert.ok(/z-index: 1013;/.test(cssTc), 'consent sits above the header z-index');
assert.ok(/top: 104px;/.test(cssTc), 'consent sits below the header and the Notebook button');
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

// S3. Start here waits until the fading captions are gone.
assert.ok(/#garden-footing\.is-fading ~ #garden-start/.test(cssTc), 'Start here waits on fading footing');
assert.ok(/tree-start-here-in/.test(cssTc) && /8\.2s/.test(cssTc), 'Start here appears after the 8s fade');

// S4. Galaxies verb and name have a gap.
assert.ok(/#garden-header \.galaxies-panel \.verb \{[\s\S]*margin-right: 0\.45em;/.test(cssTc), 'galaxies verb spacing');

// S6. New buttons match the site, and the Nursery clay offer is a card under the header.
assert.ok(/#fl-ws-open,/.test(cssTc) && /#fl-clay-corner button,/.test(cssTc) && /#fl-bridge-card button/.test(cssTc), 'button style targets');
assert.ok(/color: #f3d98a;/.test(cssTc) && /background: rgba\(12, 10, 26, 0\.86\);/.test(cssTc), 'gold-on-dark buttons');
assert.ok(/#place-veil\.is-nursery #fl-clay-dock/.test(cssTc), 'nursery clay offer is placed');

// H2. Router caption has its own space, above the chairs.
assert.ok(/\[data-core-router-plain\]/.test(cssTc), 'router caption rule');
assert.ok(/margin-top: 12\.6rem;/.test(cssTc), 'chairs sit below the caption band');
assert.ok(/You choose who sits\. Nothing is assigned for you\./.test(rooms), 'Not a router caption stays in JS');

// 3 / S5. Honest door to Desktop, with a CLI line, visible at the first tier.
assert.ok(/Export Garden Soul \(\.lattice\) — coming/.test(read('docs/modules/garden-trainer.js')), 'trainer stub still in the keystone');
assert.ok(/tree-soul-door\.js/.test(index) && /tree-soul-door\.js/.test(nursery), 'pages load the soul door layer');
assert.ok(index.indexOf('modules/garden-trainer.js') < index.indexOf('modules/tree-soul-door.js'), 'layer loads after the trainer');
assert.ok(/https:\/\/freelattice\.com\/desktop\.html/.test(soulSrc), 'soul door points at Desktop');
assert.ok(/does not invent a second \.lattice format/.test(soulSrc), 'no second format');
assert.ok(/command-line how-to lives with the learn tools/.test(soulSrc), 'plain CLI line');
assert.ok(/trainer-simple-face/.test(soulSrc) && /tree-soul-door-first/.test(soulSrc), 'first-tier door on the simple face');

var soul = {};
vm.runInNewContext(soulSrc, { window: soul, globalThis: soul, module: { exports: {} }, document: null });
assert.ok(soul.TreeSoulDoor, 'soul door API');
assert.strictEqual(soul.TreeSoulDoor.BUNDLE_HREF, 'https://freelattice.com/desktop.html');
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
assert.ok(/command-line how-to/.test(paragraphs[0].textContent), 'says the CLI how-to remains');

var firstKids = [];
var firstFace = { id: 'trainer-simple-face', nextSibling: null, parentNode: null };
firstFace.parentNode = {
  insertBefore: function (box, sib) { firstKids.push({ box: box, sib: sib }); this.inserted = box; },
  appendChild: function (box) { firstKids.push({ box: box }); this.inserted = box; }
};
var firstDoc = {
  createElement: function (tag) {
    return { tagName: tag, className: '', id: '', style: {}, textContent: '', children: [], appendChild: function (c) { this.children.push(c); return c; }, setAttribute: function (k, v) { this[k] = v; }, removeAttribute: function () {} };
  },
  getElementById: function (id) {
    if (id === 'trainer-simple-face') return firstFace;
    if (id === 'tree-soul-door-first') return this._first || null;
    return null;
  },
  querySelectorAll: function () { return []; }
};
assert.strictEqual(soul.TreeSoulDoor.apply(firstDoc), 1, 'first-tier door is added without Radiant');
assert.ok(firstKids[0] && firstKids[0].box.id === 'tree-soul-door-first', 'first-tier box id');
assert.ok(firstKids[0].box.children.some(function (c) { return c.textContent === soul.TreeSoulDoor.DOOR_LINE; }), 'first-tier has the CLI line');
assert.ok(firstKids[0].box.children.some(function (c) { return c.href === soul.TreeSoulDoor.BUNDLE_HREF && c.textContent === soul.TreeSoulDoor.DOOR_LABEL; }), 'first-tier points at Desktop');

var moreKids = [];
var moreHost = {
  id: 'trainer-more',
  querySelector: function (sel) { return sel === 'summary' ? { nextSibling: true } : null; },
  insertBefore: function (box, sib) { moreKids.push(box); this.inserted = box; },
  appendChild: function (box) { moreKids.push(box); this.inserted = box; }
};
var moreDoc = {
  createElement: firstDoc.createElement,
  getElementById: function (id) {
    if (id === 'trainer-more') return moreHost;
    return null;
  },
  querySelector: function () { return null; },
  querySelectorAll: function () { return []; }
};
assert.strictEqual(soul.TreeSoulDoor.apply(moreDoc), 1, 'door is added inside Nursery Grow More');
assert.ok(moreKids[0] && moreKids[0].id === 'tree-soul-door-more', 'More box id');
assert.ok(/tree-soul-door\.js/.test(read('docs/workshop.html')), 'workshop loads the soul door layer');
assert.ok(read('docs/workshop.html').indexOf('modules/workshop-trainer.js') < read('docs/workshop.html').indexOf('modules/tree-soul-door.js'), 'workshop layer loads after the trainer');

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

// 5 / S1 / S2. Settings local-mind check backs off, then truly rests.
assert.ok(/tree-mind-check-calm\.js/.test(settings), 'settings loads the calm layer');
assert.ok(settings.indexOf('modules/fl-connect.js') < settings.indexOf('modules/tree-mind-check-calm.js'), 'calm layer loads after FlConnect');
assert.ok(/https:\/\/freelattice\.com\/desktop\.html/.test(calmSrc), 'Desktop door in the layer');
assert.ok(/FreeLattice Desktop 5\.8\.3/.test(calmSrc), 'names 5.8.3');
assert.ok(/No local mind on this computer yet\./.test(calmSrc), 'kind line');
assert.ok(/Check again/.test(calmSrc), 'manual Check again');
assert.ok(/8000/.test(calmSrc) && /60000/.test(calmSrc), 'exponential backoff to 60s or more');
assert.ok(/data-tree-desktop-door/.test(calmSrc) && /Or the Bridge, if you already use it/.test(calmSrc), 'Desktop is the main door, Bridge is secondary');
assert.ok(/Checking paused\./.test(calmSrc) && /PAUSED_LINE/.test(calmSrc), 'Checking paused line');
assert.ok(/honorLookAgain/.test(calmSrc), 'renames Look again when the loop rests');
assert.ok(/data-garden-room="settings"/.test(cssTc) === false || /\[data-garden-room="settings"\] #shared-shoulder/.test(cssTc), 'settings shoulder rule present');
assert.ok(/html\.room-page\[data-garden-room="settings"\] #shared-shoulder/.test(cssTc), 'settings shoulder is not fixed over One-click');
assert.ok(/position: relative;/.test(cssTc) && /#shared-shoulder/.test(cssTc), 'shoulder becomes in-flow on Settings');
assert.ok(/top: 6\.75rem;/.test(cssTc), 'nursery clay offer sits below the room caption');
assert.ok(/max-width: 20rem;/.test(cssTc), 'nursery clay offer stays a compact card');
assert.ok(/\.fl-honest-btn \{/.test(cssTc), 'Gathering chat buttons are styled');
assert.ok(/#place-veil\.is-core #room-chat \.thread-input/.test(cssTc), 'Gathering send box contrast');
assert.ok(/a\.flc-btn\.tree-desktop-door/.test(cssTc) && /align-items: center;/.test(cssTc) && /line-height: 1\.2;/.test(cssTc), 'Desktop label is vertically centered');
assert.ok(/install\.html#desktop-download-ease/.test(settings) === false, 'Also connect Desktop points at desktop.html');
assert.ok(/fl-also-btn" href="https:\/\/freelattice\.com\/desktop\.html"/.test(settings), 'Also connect Desktop href');
assert.ok(/_orig\.unmount/.test(calmSrc) && /gateLook/.test(calmSrc), 'layer can unmount FlConnect and gate later looks');

var calls = { stop: 0, refresh: 0, looks: 0, mounts: 0, unmounts: 0, probes: 0 };
var mind = false;
var loopStopped = false;
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
    stopLoop: function () { calls.stop += 1; loopStopped = true; },
    refresh: function () { calls.refresh += 1; return Promise.resolve({}); },
    probe: function () { calls.probes += 1; return Promise.resolve({ models: [] }); },
    lookAgain: function () { calls.looks += 1; loopStopped = false; },
    mount: function () { calls.mounts += 1; loopStopped = false; },
    unmount: function () { calls.unmounts += 1; loopStopped = true; }
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
assert.strictEqual(typeof sandbox.FlConnect.refresh, 'function', 'wrap ran as soon as the file loaded');
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
assert.ok(/FreeLattice Desktop 5\.8.3/.test(settings), 'names the live pack');

assert.ok(/theLatticeTree spine/.test(spine) || /Never change/.test(spine), 'SPINE.md present');
assert.ok(/AUTONOMY\.md/.test(spine), 'SPINE names AUTONOMY');
assert.ok(/Welcome page/.test(spine) && /web search/i.test(spine) && /three\.js/i.test(spine), 'Next names the three coming items');
assert.ok(!/\u2014|&mdash;/.test(soulSrc + calmSrc + cssTc), 'no em dash in new layer CSS/JS');

step().then(function () {
  assert.ok(Calm.stopped(), 'stops at 60s or more');
  assert.ok(Calm.delayMs() >= 60000, 'last delay reached 60s or more');
  assert.ok(calls.refresh >= 1, 'looked again during backoff');
  assert.ok(calls.unmounts >= 1, 'unmounts FlConnect so its own loop cannot restart');
  var refreshAtStop = calls.refresh;
  var probesAtStop = calls.probes;
  var looksAtStop = calls.looks;
  // A later exported look must not hit the network until Check again.
  var gated = sandbox.FlConnect.refresh();
  return Promise.resolve(gated).then(function () {
    assert.strictEqual(calls.refresh, refreshAtStop, 'refresh is gated after stop');
    return Promise.resolve(sandbox.FlConnect.probe()).then(function () {
      assert.strictEqual(calls.probes, probesAtStop, 'probe is gated after stop');
      // Advance two minutes of leftover timers. None should issue another look.
      var leftover = timeouts.slice();
      var guard = 0;
      while (timeouts.length && guard < 50) { fire(); guard += 1; }
      assert.strictEqual(calls.refresh, refreshAtStop, 'no more refresh after two minutes of leftover timers');
      assert.strictEqual(calls.probes, probesAtStop, 'no more probe after stop');
      assert.ok(calls.refresh <= 5, 'at most about 5 looks in the backoff');
      assert.strictEqual(Calm.PAUSED_LINE, 'Checking paused.');
      // A Check again (Look again, renamed) starts a new cycle on purpose.
      sandbox.FlConnect.lookAgain();
      assert.ok(calls.looks > looksAtStop || calls.mounts >= 1, 'Check again starts a new cycle');
      assert.strictEqual(Calm.stopped(), false, 'Check again leaves the rest');
      console.log('SMOKE_OK hypha walk polish v0.3 looks=' + calls.refresh + ' stops=' + calls.stop + ' unmounts=' + calls.unmounts);
    });
  });
}).catch(function (err) {
  console.error(err);
  process.exit(1);
});
