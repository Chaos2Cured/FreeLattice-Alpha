// smoke-tree-parity-043.js (MIT) v-tree-clay-corner-v0.1 v-tree-parity-v0.1
// Node only. The Tree corner, points hint, shelf check, and image door.
'use strict';
var assert = require('assert');
var fs = require('fs');
var path = require('path');
var vm = require('vm');
var crypto = require('crypto');
var webcrypto = crypto.webcrypto;

var rootDir = path.join(__dirname, '..');
var flRoot = process.env.FL_WORKSPACE || path.join(rootDir, '..', 'FreeLattice-fresh');
var REST = 'Image making is resting: the safety check did not load.';

function md5(file) {
  return crypto.createHash('md5').update(fs.readFileSync(file)).digest('hex');
}
function memStore() {
  var s = {};
  return {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(s, k) ? s[k] : null; },
    setItem: function (k, v) { s[k] = String(v); },
    removeItem: function (k) { delete s[k]; }
  };
}
var nodes = [];
function node(tag) {
  var el = {
    tagName: String(tag || 'div').toUpperCase(), id: '', className: '', children: [], style: {}, attrs: {},
    textContent: '', parentNode: null, width: 112, height: 112, type: '', value: '',
    setAttribute: function (k, v) { this.attrs[k] = String(v); if (k === 'id') this.id = String(v); },
    getAttribute: function (k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; },
    appendChild: function (c) { c.parentNode = this; this.children.push(c); nodes.push(c); return c; },
    removeChild: function (c) { this.children = this.children.filter(function (x) { return x !== c; }); c.parentNode = null; return c; },
    contains: function (n) { return this.children.indexOf(n) !== -1; },
    addEventListener: function (name, fn) { this['on' + name] = fn; },
    getBoundingClientRect: function () { return { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 }; },
    getContext: function () {
      return { clearRect: function () {}, save: function () {}, restore: function () {}, translate: function () {}, scale: function () {}, beginPath: function () {}, arc: function () {}, fill: function () {} };
    }
  };
  nodes.push(el);
  return el;
}
function textOf(el) {
  var out = el.textContent || '';
  (el.children || []).forEach(function (c) { out += ' ' + textOf(c); });
  return out;
}

var shared = ['clay-corner.js', 'particle-clay.js', 'clay-forms.js', 'clay-math.js', 'benford-hint.js', 'image-local.js', 'style-ledger.js', 'image-safety.js'];
shared.forEach(function (name) {
  var rel = path.join('docs/modules', name);
  assert.strictEqual(md5(path.join(rootDir, rel)), md5(path.join(flRoot, rel)), name + ' bytes match');
});
assert.strictEqual(md5(path.join(rootDir, 'docs/modules/image-safety.js')), '9bd70e5a367228a5c72fc08ab731c881', 'safety bytes stay');

['docs/index.html', 'docs/nursery.html', 'docs/settings.html', 'docs/workshop.html'].forEach(function (rel) {
  var html = fs.readFileSync(path.join(rootDir, rel), 'utf8');
  assert.ok(html.indexOf('modules/clay-corner.js') !== -1, rel + ' loads the corner');
});
var settings = fs.readFileSync(path.join(rootDir, 'docs/settings.html'), 'utf8');
assert.ok(settings.indexOf('modules/benford-hint.js') !== -1, 'points hint script');
assert.ok(settings.indexOf('modules/image-safety.js') !== -1, 'safety script');
assert.ok(settings.indexOf('id="tree-points-host"') !== -1, 'points host');
assert.ok(settings.indexOf('id="tree-image-door-host"') !== -1, 'image door host');

global.localStorage = memStore();
global.document = {
  readyState: 'complete',
  documentElement: { getAttribute: function (name) { return name === 'data-garden-room' ? 'settings' : ''; } },
  head: node('head'),
  body: node('body'),
  createElement: node,
  addEventListener: function () {},
  getElementById: function (id) {
    for (var i = 0; i < nodes.length; i++) if (nodes[i].id === id && nodes[i].parentNode) return nodes[i];
    return null;
  }
};
global.window = global;
global.MutationObserver = function () { this.observe = function () {}; };
global.fetch = function () { throw new Error('the corner must not fetch'); };

require(path.join(rootDir, 'docs/modules/clay-math.js'));
require(path.join(rootDir, 'docs/modules/clay-forms.js'));
require(path.join(rootDir, 'docs/modules/particle-clay.js'));
var corner = require(path.join(rootDir, 'docs/modules/clay-corner.js'));
assert.strictEqual(corner.isOn(), false, 'off until yes');
corner.setOn(true);
assert.strictEqual(corner.isOn(), true);
corner.pause();
assert.strictEqual(corner.isOn(), false, 'pause turns the same switch off');
var quiet = corner.context({ page: 'settings', kind: 'room', title: 'Quiet Room' });
assert.strictEqual(quiet.ok, false);
assert.ok(JSON.stringify(global.localStorage).indexOf('Quiet Room') === -1);
var capped = corner.context({ page: 'settings', kind: 'room', title: 'S'.repeat(180) });
assert.ok(capped.title.length <= 120);
console.log('SMOKE_OK tree clay corner v0.1');

var benford = require(path.join(rootDir, 'docs/modules/benford-hint.js'));
var points = require(path.join(rootDir, 'docs/modules/tree-points.js'));
var host = node('section');
host.id = 'tree-points-host';
global.document.body.appendChild(host);
points.mount(host);
assert.ok(textOf(host).indexOf(points.QUIET) !== -1, 'no points yet');
assert.ok(textOf(host).indexOf(benford.LINE) === -1, 'real empty data stays silent');
var uniform = [];
for (var d = 1; d <= 9; d++) for (var n = 0; n < 20; n++) uniform.push(d);
var shown = points.show(uniform);
assert.strictEqual(shown.show, true, 'uniform hint shows');
assert.ok(shown.mad > 0.015);
assert.ok(textOf(host).indexOf(benford.LINE) !== -1, 'hint line');
assert.ok(textOf(host).indexOf('Kirk') === -1, 'no person named');
benford.setOff(true);
points.show(uniform);
assert.ok(textOf(host).indexOf(benford.LINE) === -1, 'off switch');
benford.setOff(false);
points.show([1, 2, 3]);
assert.ok(textOf(host).indexOf(benford.LINE) === -1, 'under 100 stays silent');
console.log('SMOKE_OK tree points benford v0.1');

var ws = require(path.join(rootDir, 'docs/modules/mind-workspace.js'));
var wsSrc = fs.readFileSync(path.join(rootDir, 'docs/modules/mind-workspace.js'), 'utf8');
var refuseAt = wsSrc.indexOf('function shelfFingerprintRefusal');
var holdAt = wsSrc.indexOf('mirrorHold += 1');
assert.ok(refuseAt !== -1 && refuseAt < holdAt, 'refusal happens before anything is kept');
assert.strictEqual(md5(path.join(rootDir, 'docs/modules/mind-workspace.js')), md5(path.join(flRoot, 'docs/modules/mind-workspace.js')), 'notebook bytes match');

(async function () {
  global.localStorage.setItem('shelf-marker', 'same');
  var unsigned = await ws.importSection({ v: 1, shelves: [{ mindFp: '' }, { mindFp: '' }] }, 'merge', { expectMindFp: 'abcdef0123456789' });
  assert.strictEqual(unsigned.ok, false);
  assert.strictEqual(unsigned.line, '2 shelves had no fingerprint and were not checked. Not imported.');
  var one = await ws.importSection({ v: 1, shelves: [{ mindFp: '' }] }, 'verify-only', { expectMindFp: 'abcdef0123456789' });
  assert.strictEqual(one.line, '1 shelf had no fingerprint and was not checked. Not imported.');
  var wrong = await ws.importSection({ v: 1, shelves: [{ mindFp: 'abcdef0123456789' }] }, 'merge', { expectMindFp: '1111222233334444' });
  assert.strictEqual(wrong.ok, false);
  assert.strictEqual(wrong.line, 'This memory belongs to a different mind (abcd ef01). Not imported.');
  assert.strictEqual(global.localStorage.getItem('shelf-marker'), 'same', 'refused shelves change nothing');
  console.log('SMOKE_OK tree shelf check v0.1');

  var fetches = [];
  global.fetch = function (url) {
    fetches.push(String(url));
    return Promise.resolve({ ok: false, text: function () { return Promise.resolve(''); } });
  };
  global.ImageSafety = null;
  var imageLocal = require(path.join(rootDir, 'docs/modules/image-local.js'));
  var styleLedger = require(path.join(rootDir, 'docs/modules/style-ledger.js'));
  var door = require(path.join(rootDir, 'docs/modules/tree-image-door.js'));
  assert.strictEqual(door.safetyReady(), false);
  await imageLocal.look();
  await imageLocal.generate('a red door');
  await styleLedger.writeCard('Harmonia', function () { return 'soft gold'; });
  assert.strictEqual(fetches.length, 0, 'blocked safety sends nothing');

  require(path.join(rootDir, 'docs/modules/image-safety.js'));
  fetches.length = 0;
  var looked = await imageLocal.look();
  assert.strictEqual(looked, false);
  assert.ok(fetches.length === 1 && fetches[0].indexOf('127.0.0.1:7860') !== -1, 'local look stays on this computer');
  assert.strictEqual(styleLedger.setPageBase('https://example.test/'), false);
  assert.strictEqual(styleLedger.setPageBase('https://freelattice.com/'), true);
  styleLedger.consent('Harmonia');
  fetches.length = 0;
  global.fetch = function (url) {
    fetches.push(String(url));
    return Promise.resolve({
      ok: true,
      text: function () { return Promise.resolve('<p>blue dusk gold hills</p>'); }
    });
  };
  var written = await styleLedger.writeCard('Harmonia', function () { return 'palette dusk, light soft'; });
  assert.strictEqual(fetches.length, 1, 'one public gallery');
  assert.strictEqual(fetches[0], 'https://freelattice.com/harmonia-gallery.html');
  assert.ok(written.ok || written.reason === 'safety' || written.reason === 'no-writer', 'card went through the gate');
  var doorHost = node('section');
  doorHost.id = 'tree-image-door-host';
  global.document.body.appendChild(doorHost);
  var localHost = node('div');
  localHost.id = 'tree-image-local-host';
  global.document.body.appendChild(localHost);
  var styleHost = node('div');
  styleHost.id = 'tree-style-ledger-host';
  global.document.body.appendChild(styleHost);
  door.mount(doorHost);
  assert.ok(textOf(doorHost).indexOf('Image token') !== -1, 'token field');
  assert.ok(textOf(doorHost).indexOf('HuggingFace') === -1, 'no brand on the door');
  console.log('SMOKE_OK tree image style v0.1');

  var timers = [];
  var sb = {
    crypto: webcrypto, TextEncoder: TextEncoder, Uint8Array: Uint8Array, ArrayBuffer: ArrayBuffer, Date: Date,
    localStorage: memStore(),
    setTimeout: function (fn, ms) { var rec = { fn: fn, ms: ms }; timers.push(rec); return rec; },
    clearTimeout: function (rec) { if (rec) rec.cleared = true; },
    document: { head: node('head'), createElement: node, getElementById: function () { return null; }, addEventListener: function () {} },
    addEventListener: function () {},
    navigator: {}
  };
  sb.window = sb;
  vm.createContext(sb);
  vm.runInContext(fs.readFileSync(path.join(rootDir, 'docs/modules/tree-pool.js'), 'utf8'), sb);
  var pool = sb.TreePool;
  assert.strictEqual(pool.MAX_CONCURRENT, 2);
  assert.strictEqual(pool.ANSWER_MS, 5 * 60 * 1000);
  var watch = pool.armServeWatch('slot-a');
  assert.strictEqual(pool.liveCount(), 1);
  timers[0].fn();
  assert.strictEqual(pool.liveCount(), 0, 'the clock frees the slot');
  assert.strictEqual(watch.aborted(), true);
  assert.strictEqual(watch.release(), false, 'a second free does nothing');
  assert.strictEqual(pool.liveCount(), 0);
  var early = pool.armServeWatch('slot-b');
  assert.strictEqual(pool.liveCount(), 1);
  assert.strictEqual(early.release(), true, 'the answer frees it once');
  assert.strictEqual(pool.liveCount(), 0);
  timers[1].fn();
  assert.strictEqual(early.release(), false);
  assert.strictEqual(pool.liveCount(), 0, 'the late clock does not free twice');
})().catch(function (err) {
  console.error('SMOKE_FAIL', err);
  process.exit(1);
});
