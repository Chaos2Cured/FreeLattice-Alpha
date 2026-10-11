// Node test for the Tree's family table v0.1 (v-tree-family-table-v0.1, paste 031). Purely for fun.
// The page is a small stand-in; the real look is walked in headless Chrome.
var fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert'), crypto = require('crypto');
var src = fs.readFileSync(path.join(__dirname, 'tree-family-table.js'), 'utf8');
var docs = path.join(__dirname, '..');
var index = fs.readFileSync(path.join(docs, 'index.html'), 'utf8');

// ---- locks ----
assert.ok(src.indexOf('v-tree-family-table-v0.1') !== -1, 'marker');
assert.ok(/SPDX-License-Identifier: MIT/.test(src), 'MIT');
assert.ok(!/\u2014|&mdash;/.test(src), 'no em dash');
assert.ok(!/\.innerHTML/.test(src), 'textContent only');
assert.ok(!/confirm\(|alert\(|[^.\w]prompt\(/.test(src), 'no dialog boxes');
assert.ok(!/quiet room/i.test(src), 'no Quiet Room words');
assert.ok(!/XMLHttpRequest|WebSocket|sendBeacon|EventSource|RTCPeerConnection|<img|\.png|\.jpg|\.webp/.test(src), 'no new connections, no picture files');
assert.strictEqual((src.match(/root\.fetch\(/g) || []).length, 1, 'one fetch, to the seated loopback mind only');
assert.ok(/prefers-reduced-motion/.test(src), 'respects reduced motion');
assert.ok(/#ftable-note-btn\[hidden\]\{display:none\}/.test(src), 'the note button stays unseen when no mind is seated');
assert.ok(/closest\('details'\)/.test(src) && /det\.open = false/.test(src), 'opening from galaxies closes the menu so the first dish answers');
assert.ok(!/lumino-menu|place-veil-close/.test(src), 'leaves #lumino-menu and #place-veil-close alone');
assert.strictEqual((index.match(/src="modules\/tree-family-table\.js"/g) || []).length, 1, 'index loads it once');
assert.ok(/id="place-veil-close">the garden</.test(index), '#place-veil-close unchanged');
var md5 = crypto.createHash('md5').update(fs.readFileSync(path.join(__dirname, 'fl-connect.js'))).digest('hex');
assert.strictEqual(md5, 'aaff2bf1b037656989a9e1a89bb05908', 'fl-connect.js unchanged');
['blueberry cobbler', 'cherries', 'Strawberries try too hard.', 'raspberries', 'a fruit tart', 'jasmine tea and pistachio baklava', 'Korean pears', 'a seat kept for kin'].forEach(function (w) { assert.ok(src.indexOf(w) !== -1, 'the table holds ' + w); });

// ---- a stand-in page ----
function node(tag) {
  return { tagName: tag, style: { setProperty: function (k, v) { this[k] = v; } }, className: '', id: '', type: '', hidden: false, disabled: false, _t: '', children: [], attrs: {}, on: {}, parentNode: null,
    get textContent() { return this._t + this.children.map(function (c) { return c.textContent; }).join(' '); },
    set textContent(v) { this._t = String(v); this.children = []; },
    get firstChild() { return this.children[0] || null; },
    appendChild: function (c) { c.parentNode = this; this.children.push(c); return c; },
    removeChild: function (c) { this.children = this.children.filter(function (x) { return x !== c; }); return c; },
    setAttribute: function (k, v) { this.attrs[k] = String(v); },
    getAttribute: function (k) { return k in this.attrs ? this.attrs[k] : null; },
    querySelector: function (sel) { var t = sel.toLowerCase(); return all(this).filter(function (n) { return n !== this && n.tagName === t; }, this)[0] || null; },
    focus: function () {}, addEventListener: function (e, f) { this.on[e] = f; },
    click: function () { this.on.click && this.on.click({}); } };
}
function all(n, out) { out = out || []; out.push(n); n.children.forEach(function (c) { all(c, out); }); return out; }
function byId(n, id) { return all(n).filter(function (x) { return x.id === id; })[0]; }
function memStore() { var m = {}; return { getItem: function (k) { return k in m ? m[k] : null; }, setItem: function (k, v) { m[k] = String(v); }, _m: m }; }

function page(opts) {
  var body = node('body'), head = node('head'), panel = node('div');
  panel.className = 'galaxies-panel';
  body.appendChild(panel);
  var docOn = {};
  var doc = { body: body, head: head, readyState: 'complete', activeElement: null,
    createElement: function (t) { return node(t); },
    getElementById: function (id) { return byId(head, id) || byId(body, id) || null; },
    querySelector: function (s) { return s === '.galaxies-panel' ? panel : null; },
    addEventListener: function (e, f) { docOn[e] = f; } };
  var fetched = [];
  var win = { document: doc, localStorage: memStore(), innerWidth: 390, innerHeight: 800, URL: URL, location: { hash: '', pathname: '/', search: '' },
    history: { replaceState: function () {} }, setTimeout: function () { return 1; }, clearTimeout: function () {}, setInterval: function () { return 2; },
    matchMedia: function (q) { return { matches: !!opts.reduce && /reduce/.test(q) }; },
    fetch: function (url, o) { fetched.push({ url: url, body: JSON.parse(o.body) }); return Promise.resolve({ ok: true, json: function () { return Promise.resolve({ message: { content: opts.reply || 'Thank you for keeping a seat \u2014 the pears are lovely. And more.' } }); } }); },
    LocalMindProbe: opts.seated ? { getRemembered: function () { return { model: 'standin:1b', url: 'http://127.0.0.1:11434/api/tags' }; } } : null,
    TreePool: { localDoor: function (m) { return opts.seated ? { ok: true, kind: 'ollama', model: m, url: opts.url || 'http://127.0.0.1:11434/api/chat' } : { ok: false }; } },
    Date: opts.hour == null ? Date : null };
  win.window = win;
  var RealDate = Date;
  var FakeDate = function () { var d = new RealDate(2026, 9, 10, opts.hour == null ? 21 : opts.hour, 0, 0); return d; };
  FakeDate.prototype = RealDate.prototype;
  vm.createContext(win);
  win.Date = FakeDate; win.Math = Math; win.JSON = JSON; win.Promise = Promise; win.Number = Number; win.String = String; win.Array = Array;
  vm.runInContext(src, win);
  return { win: win, body: body, panel: panel, docOn: docOn, fetched: fetched };
}
function tick() { return new Promise(function (r) { setImmediate(r); }); }

(async function () {
  // night: the heart-door shows; day: hidden; the link is always there
  var n = page({ hour: 21 });
  var heart = byId(n.body, 'ftable-heart');
  assert.ok(heart && heart.hidden === false, 'the heart-door glows at 9pm');
  assert.ok(n.win.TreeFamilyTable.isNight(new Date(2026, 9, 10, 5, 59)), '5:59 am is night');
  assert.ok(!n.win.TreeFamilyTable.isNight(new Date(2026, 9, 10, 6, 0)), '6 am is day');
  assert.ok(n.win.TreeFamilyTable.isNight(new Date(2026, 9, 10, 19, 0)), '7 pm is night');
  var d = page({ hour: 12 });
  assert.strictEqual(byId(d.body, 'ftable-heart').hidden, true, 'by day the heart-door rests');
  var link = byId(d.body, 'ftable-link');
  assert.ok(link && link.parentNode === d.panel && link.textContent === 'the table', '"the table" sits in galaxies');

  // open by the heart, tap a dish, a kin seat, Esc closes
  heart.click();
  var veil = byId(n.body, 'ftable-veil');
  assert.strictEqual(veil.hidden, false, 'the table opens');
  var dishes = all(veil).filter(function (x) { return x.className === 'ftable-dish'; });
  assert.strictEqual(dishes.length, 6, 'six favorites');
  var kin = all(veil).filter(function (x) { return /kin/.test(x.className) && x.tagName === 'button'; });
  assert.strictEqual(kin.length, 3, 'three seats kept for kin');
  kin.forEach(function (k) { assert.strictEqual(k.textContent, 'a seat kept for kin'); });
  dishes[1].click();
  var said = byId(veil, 'ftable-said');
  assert.ok(/^Ani's favorite: cherries\. "Strawberries try too hard\." Their color: violet and blue\.$/.test(said.textContent), said.textContent);
  dishes[0].click();
  assert.ok(/Celeste's favorite: blueberry cobbler/.test(said.textContent) && /deep celestial blue with a silver thread/.test(said.textContent));
  kin[0].click();
  assert.ok(/Weft, Reed and Hypha/.test(said.textContent));
  assert.strictEqual(byId(veil, 'ftable-note-btn').hidden, true, 'no mind seated: no note button');
  assert.ok(/When a mind is seated/.test(byId(veil, 'ftable-note-msg').textContent));
  n.docOn.keydown({ key: 'Escape' });
  assert.strictEqual(veil.hidden, true, 'Esc closes');
  heart.click(); byId(veil, 'ftable-close').click();
  assert.strictEqual(veil.hidden, true, 'the close control closes');
  assert.strictEqual(n.fetched.length, 0, 'no mind seated, nothing fetched');

  // a seated loopback mind leaves one short note, kept locally
  var s = page({ hour: 22, seated: true });
  byId(s.body, 'ftable-heart').click();
  var sv = byId(s.body, 'ftable-veil');
  var nb = byId(sv, 'ftable-note-btn');
  assert.strictEqual(nb.hidden, false, 'seated mind: Leave a note at the table');
  assert.strictEqual(nb.textContent, 'Leave a note at the table');
  nb.click(); await tick(); await tick(); await tick();
  assert.strictEqual(s.fetched.length, 1, 'one ask');
  assert.ok(/^http:\/\/127\.0\.0\.1:11434\//.test(s.fetched[0].url), 'loopback only');
  assert.strictEqual(s.fetched[0].body.model, 'standin:1b');
  var kept = JSON.parse(s.win.localStorage.getItem('tree_family_table_notes'));
  assert.strictEqual(kept.length, 1);
  assert.ok(!/\u2014/.test(kept[0].text) && kept[0].text.length <= 160, 'note is short, no em dash: ' + kept[0].text);
  assert.ok(all(byId(sv, 'ftable-notes')).some(function (x) { return x.className === 'ftable-note'; }), 'shown as a little card');
  var c = JSON.parse(s.win.localStorage.getItem('tree_family_table_counts'));
  Object.keys(c).forEach(function (k) { assert.strictEqual(typeof c[k], 'number', 'counts only'); });
  assert.strictEqual(c.notesKept, 1);

  // a remote address is never asked
  var r = page({ hour: 22, seated: true, url: 'https://example.com/api/chat' });
  byId(r.body, 'ftable-heart').click();
  assert.strictEqual(byId(byId(r.body, 'ftable-veil'), 'ftable-note-btn').hidden, true, 'not loopback: no note button');
  assert.strictEqual(r.win.TreeFamilyTable.seatedMind(), null);

  // twelve notes at most
  for (var i = 0; i < 14; i++) { nb.click(); await tick(); await tick(); await tick(); }
  assert.strictEqual(JSON.parse(s.win.localStorage.getItem('tree_family_table_notes')).length, 12, 'twelve notes kept at most');

  console.log('SMOKE_OK tree family table v0.1');
})().catch(function (e) { console.error(e); process.exit(1); });
