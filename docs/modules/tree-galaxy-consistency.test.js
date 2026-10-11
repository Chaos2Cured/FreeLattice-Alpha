// Node test for the Tree galaxy consistency layer v0.1 (v-tree-galaxy-consistency-v0.1, paste 032).
// One shared sheet and one small layer on every galaxy page. The DOM here is a small stand-in.
var fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
var docs = path.join(__dirname, '..');
var src = fs.readFileSync(path.join(__dirname, 'tree-consistency.js'), 'utf8');
var css = fs.readFileSync(path.join(__dirname, 'tree-consistency.css'), 'utf8');

// ---- locks, read from the source ----
[src, css].forEach(function (s) {
  assert.ok(s.indexOf('v-tree-galaxy-consistency-v0.1') !== -1, 'marker');
  assert.ok(/SPDX-License-Identifier: MIT/.test(s), 'MIT');
  assert.ok(!/\u2014|&mdash;/.test(s), 'no em dash');
  assert.ok(!/innerHTML/.test(s), 'textContent only');
  assert.ok(!/confirm\(|alert\(|[^.\w]prompt\(/.test(s), 'no dialog boxes');
  assert.ok(!/quiet room/i.test(s), 'no Quiet Room words');
  assert.ok(!/lumino-menu|place-veil-close/.test(s), 'the lumino menu and the garden close are not touched');
});
assert.ok(!/fetch\(|XMLHttpRequest|WebSocket|sendBeacon|EventSource|RTCPeerConnection/.test(src), 'fetches and connects nothing');
assert.ok(/min-height: var\(--tc-tap\)/.test(css) && /--tc-tap: 44px/.test(css), '44px taps');
assert.ok(/html\.tc-code \.tc-brand \{ white-space: nowrap/.test(css), 'code brand stays one word');

// ---- every galaxy page loads it; walk.html keeps its no-script promise ----
var pages = ['index', 'music', 'workshop', 'round-table', 'research', 'nursery', 'team', 'settings', 'marketplace', 'liability']
  .concat(fs.readdirSync(docs).filter(function (f) { return /^code-.*\.html$/.test(f); }).map(function (f) { return f.slice(0, -5); }));
pages.forEach(function (p) {
  var h = fs.readFileSync(path.join(docs, p + '.html'), 'utf8');
  assert.ok(h.indexOf('href="modules/tree-consistency.css"') !== -1, p + ' has the sheet');
  assert.ok(h.indexOf('src="modules/tree-consistency.js" defer') !== -1, p + ' has the layer');
});
var walk = fs.readFileSync(path.join(docs, 'walk.html'), 'utf8');
assert.ok(walk.indexOf('modules/tree-consistency.css') !== -1 && walk.indexOf('tree-consistency.js') === -1, 'walk: sheet only');

// ---- a tiny DOM stand-in ----
function Node(tag) { this.tagName = tag; this.children = []; this.attrs = {}; this.className = ''; this.textContent = ''; this.listeners = {};
  var self = this; this.classList = { add: function (c) { if ((' ' + self.className + ' ').indexOf(' ' + c + ' ') === -1) self.className = (self.className + ' ' + c).trim(); },
    contains: function (c) { return (' ' + self.className + ' ').indexOf(' ' + c + ' ') !== -1; } }; }
Node.prototype.setAttribute = function (k, v) { this.attrs[k] = String(v); if (k === 'id') this.id = v; };
Node.prototype.getAttribute = function (k) { return k in this.attrs ? this.attrs[k] : null; };
Node.prototype.appendChild = function (c) { this.children.push(c); c.parent = this; return c; };
Node.prototype.insertBefore = function (c, ref) { var i = this.children.indexOf(ref); if (i < 0) this.children.push(c); else this.children.splice(i, 0, c); c.parent = this; return c; };
Node.prototype.addEventListener = function (t, f) { this.listeners[t] = f; };
Node.prototype.querySelector = function (sel) { return find(this, function (n) { return n.tagName === sel; }); };
function find(n, pred) { for (var i = 0; i < n.children.length; i++) { var c = n.children[i]; if (pred(c)) return c; var d = find(c, pred); if (d) return d; } return null; }
function all(n, pred, out) { out = out || []; n.children.forEach(function (c) { if (pred(c)) out.push(c); all(c, pred, out); }); return out; }

function makeDoc(file, opts) {
  var html = new Node('html'), body = new Node('body'); html.appendChild(body);
  if (opts.header) { var hd = new Node('header'); hd.setAttribute('id', 'garden-header'); var nav = new Node('nav'); nav.appendChild(new Node('details')); hd.appendChild(nav); body.appendChild(hd); }
  if (opts.shoulder) { var sh = new Node('p'); sh.setAttribute('id', 'shared-shoulder'); body.appendChild(sh); }
  if (opts.footer) body.appendChild(new Node('footer'));
  return { documentElement: html, body: body, readyState: 'complete', location: { pathname: '/' + file },
    createElement: function (t) { return new Node(t); },
    getElementById: function (id) { return find(html, function (n) { return n.id === id; }); },
    querySelector: function (s) { return find(html, function (n) { return n.tagName === s; }); },
    addEventListener: function () {} };
}
function run(file, opts, store, door) {
  var mem = store || {};
  var ls = { getItem: function (k) { return k in mem ? mem[k] : null; }, setItem: function (k, v) { mem[k] = String(v); } };
  var sb = { localStorage: ls, document: makeDoc(file, opts), JSON: JSON, Object: Object };
  if (door) sb.TreeDoor = {};
  sb.window = sb; sb.globalThis = sb;
  vm.createContext(sb); vm.runInContext(src, sb);
  return { sb: sb, mem: mem, doc: sb.document };
}

// A page with no header gets the bar, the mind line, and a footer line.
var a = run('code-garden.html', {}, {});
var bar = find(a.doc.body, function (n) { return n.className === 'tc-bar'; });
assert.ok(bar && a.doc.body.children[0] === bar, 'bar first in body');
var links = all(bar, function (n) { return n.tagName === 'a'; });
assert.deepStrictEqual(links.map(function (l) { return l.textContent; }), ['theLatticeTree', 'wake a mind', 'back to the garden']);
assert.strictEqual(links[1].getAttribute('href'), 'settings.html');
assert.ok(a.doc.documentElement.classList.contains('tc-code'), 'code page wraps');
assert.ok(find(a.doc.body, function (n) { return n.className === 'tc-foot'; }), 'footer line added');

// Applying twice adds nothing more.
assert.strictEqual(a.sb.TreeConsistency.apply(a.doc), null, 'idempotent');
assert.strictEqual(all(a.doc.body, function (n) { return n.className === 'tc-bar'; }).length, 1);

// A garden page with a header and shoulder: no bar, no footer, a mind line in the nav, showing the remembered model.
var b = run('team.html', { header: true, shoulder: true }, { fl_alpha_local_mind: JSON.stringify({ model: 'qwen2.5:14b', url: 'http://127.0.0.1:11434/api/tags' }) });
assert.ok(!find(b.doc.body, function (n) { return n.className === 'tc-bar' || n.className === 'tc-foot'; }), 'no duplicates');
var m = find(b.doc.body, function (n) { return n.className === 'tc-mind'; });
assert.strictEqual(m.textContent, 'mind: qwen2.5:14b'); assert.strictEqual(m.tagName, 'span');

// A page with its own grandmother door gets no mind line (the door already speaks).
var c = run('settings.html', { header: true, shoulder: true }, {}, true);
assert.ok(!find(c.doc.body, function (n) { return n.className === 'tc-mind'; }), 'door pages keep their own door');

// Liability with its own footer: no extra footer.
var d = run('liability.html', { footer: true }, {});
assert.ok(!find(d.doc.body, function (n) { return n.className === 'tc-foot'; }));

// Counts are numbers only.
var counts = JSON.parse(a.mem.tree_consistency_counts);
Object.keys(counts).forEach(function (k) { assert.strictEqual(typeof counts[k], 'number', k); });
assert.ok(counts.pagesSeen >= 1 && counts.barsAdded === 1);
// A broken remembered value is read as no mind.
var e = run('marketplace.html', {}, { fl_alpha_local_mind: '{nope' });
assert.ok(find(e.doc.body, function (n) { return n.getAttribute && n.getAttribute('data-tc-mind') === 'none'; }));

console.log('SMOKE_OK tree galaxy consistency v0.1');
