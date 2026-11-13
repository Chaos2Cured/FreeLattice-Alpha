#!/usr/bin/env node
// Pins and fake-observer coverage for v-tree-hypha-softs-133-v0.2.
// Does not load quiet-room. Does not change AUTONOMY.md.
'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');
var assert = require('assert');
var crypto = require('crypto');

var root = path.join(__dirname, '..', '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function md5(rel) {
  return crypto.createHash('md5').update(fs.readFileSync(path.join(root, rel))).digest('hex');
}

assert.strictEqual(md5('AUTONOMY.md'), '09a4f1a286226e37089a93df42df0106', 'AUTONOMY.md unchanged');
assert.strictEqual(md5('docs/modules/fl-gathering.js'), '4dbbff5d554c42256605b37939835080', 'fl-gathering twin unchanged');
['docs/modules/tree-door.js', 'docs/modules/particle-clay.js', 'docs/modules/clay-corner.js', 'docs/modules/garden-rooms.js'].forEach(function (rel) {
  assert.ok(!/v-tree-hypha-softs-133-v0\.1/.test(read(rel)), rel + ' was not rewritten');
});
assert.ok(!/quiet-room/i.test(read('docs/modules/tree-hypha-softs-133.js')), 'softs layer does not name quiet-room');
assert.ok(read('docs/index.html').indexOf('tree-thread-chat-layer.js') < read('docs/index.html').indexOf('tree-hypha-softs-133.js'), 'softs layer follows chat layer on home');
assert.ok(/2026-11-13 \(MST\), Hypha PASS softs after PR 133/.test(read('SPINE.md')), 'SPINE Done row present');
assert.ok(/Welcome page that verifies FreeLattice signed mind bundles/.test(read('SPINE.md')), 'SPINE Next is still there');

new vm.Script(read('docs/modules/tree-hypha-softs-133.js'), { filename: 'tree-hypha-softs-133.js' });

function el(tag) {
  var node = {
    tagName: String(tag || 'div').toUpperCase(),
    id: '',
    className: '',
    hidden: false,
    parentNode: null,
    children: [],
    attributes: {},
    textContent: '',
    classList: {
      contains: function (c) { return (' ' + node.className + ' ').indexOf(' ' + c + ' ') !== -1; },
      add: function (c) { if (!this.contains(c)) node.className = (node.className ? node.className + ' ' : '') + c; }
    },
    setAttribute: function (k, v) { this.attributes[k] = String(v); if (k === 'id') this.id = String(v); },
    getAttribute: function (k) { return this.attributes[k] || (k === 'id' ? this.id : ''); },
    appendChild: function (c) { c.parentNode = this; this.children.push(c); return c; },
    insertBefore: function (c, ref) {
      c.parentNode = this;
      var i = this.children.indexOf(ref);
      if (i < 0) this.children.push(c); else this.children.splice(i, 0, c);
      return c;
    },
    querySelector: function (sel) { return query(this, sel)[0] || null; },
    querySelectorAll: function (sel) { return query(this, sel); },
    addEventListener: function () {}
  };
  return node;
}
function walk(n, out) { out.push(n); (n.children || []).forEach(function (c) { walk(c, out); }); }
function query(from, sel) {
  sel = String(sel || '');
  var all = []; walk(from, all);
  if (sel.indexOf('[') === 0) {
    var m = sel.match(/^\[([^\]]+)\]$/);
    var k = m[1].split('=')[0];
    return all.filter(function (n) { return n.getAttribute && n.getAttribute(k); });
  }
  if (sel.indexOf('.') !== -1 || sel.indexOf(' ') !== -1) {
    // simple "div.class" or ".a .b" : last class
    var cls = sel.split('.').pop().split(' ')[0].split('[')[0];
    return all.filter(function (n) { return n.classList && n.classList.contains(cls); });
  }
  if (sel.charAt(0) === '#') return all.filter(function (n) { return n.id === sel.slice(1); });
  return all.filter(function (n) { return (n.tagName || '').toLowerCase() === sel.toLowerCase(); });
}

var body = el('body');
var head = el('head');
var html = el('html');
html.appendChild(head); html.appendChild(body);
var veil = el('div');
veil.className = 'tree-door-veil';
veil.setAttribute('data-tree-door-calm', 'v-tree-door-first-run-calm-v0.2');
var box = el('div');
box.className = 'tree-door';
var h2 = el('h2'); h2.textContent = "Let's wake a mind for you"; box.appendChild(h2);
var p = el('p'); p.textContent = 'A mind is a small AI.'; box.appendChild(p);
var main = el('button'); main.className = 'tree-door-main'; main.textContent = 'Look for an AI on this computer'; box.appendChild(main);
var soft = el('button'); soft.className = 'tree-door-soft'; soft.textContent = 'Not now'; box.appendChild(soft);
var quiet = el('p'); quiet.className = 'tree-door-quiet'; quiet.textContent = 'Not now is remembered.'; box.appendChild(quiet);
veil.appendChild(box);
body.appendChild(veil);

var document = {
  documentElement: html, head: head, body: body, readyState: 'complete',
  createElement: el,
  getElementById: function (id) { return query(html, '#' + id)[0] || null; },
  querySelector: function (sel) { return query(html, sel)[0] || null; },
  querySelectorAll: function (sel) { return query(html, sel); },
  addEventListener: function () {}
};
function MutationObserver(cb) { this.cb = cb; }
MutationObserver.prototype.observe = function () {};
MutationObserver.prototype.disconnect = function () {};

var sandbox = { window: null, document: document, setTimeout: function (fn) { fn(); return 1; }, MutationObserver: MutationObserver, console: console };
sandbox.window = sandbox;
vm.runInNewContext(read('docs/modules/tree-hypha-softs-133.js'), sandbox, { filename: 'tree-hypha-softs-133.js' });
assert.ok(sandbox.TreeHyphaSofts133, 'API present');
sandbox.TreeHyphaSofts133.sync();
var stay = box.querySelector('[data-tree-door-stay]');
assert.ok(stay, 'Not now is pinned in a stay footer');
assert.ok(stay.children.indexOf(soft) !== -1, 'Not now lives in the stay footer');
var css = (document.getElementById('tree-hypha-softs-133-style') || {}).textContent || '';
assert.ok(css.indexOf('#garden-start') !== -1 && css.indexOf('#lumino-legend') !== -1, 'start line and legend are styled apart');
assert.ok(css.indexOf('translateX(-50%)') !== -1 && css.indexOf('left:50%') !== -1, 'phone card is centered with left:50% and translateX');
assert.ok(css.indexOf('left:auto;right:0;transform:none') === -1, 'phone card does not use a right-edge offset');
assert.ok(css.indexOf('#place-veil-close') !== -1 && css.indexOf('order:20') !== -1, 'the garden close stays after the Checker');
assert.ok(css.indexOf('100vh - 6.5rem') !== -1, '1280 dock stays below the nav');
assert.ok(css.indexOf('#tree-thread-wait-hint') !== -1, 'phone send hint is forced visible');
assert.ok(css.indexOf('#fl-clay-dock') !== -1 && css.indexOf('data-tree-door-calm') !== -1, 'dock ask hides while the card shows');
console.log('ok tree-hypha-softs-133 pins and Not now stay');
