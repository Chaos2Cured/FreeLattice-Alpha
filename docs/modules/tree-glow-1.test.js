#!/usr/bin/env node
// v-tree-glow-1-v0: every light in reach. theLatticeTree only; no fl-connect.js, no
// FreeLattice app.html. Guards: (A) the "Use a different address" field stays inside its
// card on a phone, (B) Settings lines fade before "the garden" pill, (C) the Nursery's
// last card clears the galaxy hop, (D) the Gathering's Find local minds is not under the
// promise band on wide screens, (E) legend words open their lights, and the room-page
// reset no longer outweighs each card's own padding. No network. No kitchen.
'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');
var assert = require('assert');

var css = fs.readFileSync(path.join(__dirname, 'garden-rooms.css'), 'utf8');
var js = fs.readFileSync(path.join(__dirname, 'garden-rooms.js'), 'utf8');

// Static: the reset weighs nothing now; the old heavy selector is gone from live rules.
assert.ok(/:where\(html\.room-page\) \*,\n:where\(html\.room-page\) \*::before,\n:where\(html\.room-page\) \*::after \{ box-sizing: border-box; margin: 0; padding: 0; \}/.test(css), 'room-page reset is :where (zero weight)');
assert.ok(!/^html\.room-page \*,$/m.test(css), 'the heavy reset selector is not a live rule any more');
var glow = css.slice(css.indexOf('v-tree-glow-1-v0: every light in reach'));
assert.ok(glow.length > 200, 'glow block at the end of garden-rooms.css');
assert.ok(/@media \(max-width: 480px\) \{\s*\.flc-picker-row input \{[^}]*width: 100%;[^}]*max-width: 100%;[^}]*min-width: 0;/.test(glow), 'A: field stays inside the card');
assert.ok(/#place-veil\.is-settings::after \{[^}]*position: sticky;[^}]*pointer-events: none;/.test(glow), 'B: soft band before the pill, never takes a tap');
assert.ok(/html\.room-page \.room-nursery \{\s*padding-bottom: 7\.5rem;/.test(glow), 'C: Nursery clears the hop');
assert.ok(/@media \(min-width: 641px\) \{\s*#place-veil\.is-core \.core-promise \{\s*top: 14\.6rem;/.test(glow), 'D: promise band under Find local minds');
assert.ok(/#lumino-legend \.lumino-legend-row\[data-lumino-row\] \{[^}]*pointer-events: auto;/.test(glow), 'E: legend rows take a tap');
assert.ok(/v-tree-glow-1-v0/.test(js) && /function bindLegendRow\(row, id\)/.test(js), 'E: legend rows are bound');
assert.ok(!/confirm\(/.test(js), 'no confirm()');
assert.ok(!/innerHTML/.test(js.slice(js.indexOf('function bindLegendRow'), js.indexOf('function ensureSkyLegend'))), 'no innerHTML in the new code');

// Runtime (vm, fake DOM): tapping a legend word opens its light.
function El(tag) {
  this.tagName = String(tag || 'div').toUpperCase();
  this.tag = tag;
  this.id = '';
  this.className = '';
  this.textContent = '';
  this.hidden = false;
  this.attrs = {};
  this.children = [];
  this.childNodes = this.children;
  this.parent = null;
  this.style = {
    background: '',
    boxShadow: '',
    left: '',
    top: '',
    _props: {},
    setProperty: function (k, v) { this._props[k] = String(v); },
    getPropertyValue: function (k) { return this._props[k] || ''; }
  };
  var self = this;
  this.classList = {
    add: function (name) {
      if ((' ' + self.className + ' ').indexOf(' ' + name + ' ') === -1) {
        self.className = (self.className ? self.className + ' ' : '') + name;
      }
    },
    remove: function (name) {
      self.className = String(self.className || '')
        .split(/\s+/)
        .filter(function (c) { return c && c !== name; })
        .join(' ');
    },
    contains: function (name) {
      return (' ' + self.className + ' ').indexOf(' ' + name + ' ') !== -1;
    }
  };
  this.setAttribute = function (name, val) {
    var s = String(val);
    this.attrs[name] = s;
    if (name === 'id') this.id = s;
    if (name === 'class') this.className = s;
    if (name === 'hidden') this.hidden = true;
  };
  this.getAttribute = function (name) {
    if (name === 'id') return this.id || null;
    if (Object.prototype.hasOwnProperty.call(this.attrs, name)) return this.attrs[name];
    return null;
  };
  this.removeAttribute = function (name) {
    delete this.attrs[name];
    if (name === 'id') this.id = '';
  };
  this.appendChild = function (child) {
    this.children.push(child);
    child.parent = this;
    return child;
  };
  this.querySelector = function (sel) { return queryOne(this, sel); };
  this.querySelectorAll = function (sel) { return queryAll(this, sel); };
  this._on = {};
  this.addEventListener = function (t, fn) { (this._on[t] = this._on[t] || []).push(fn); };
  this.fire = function (t, ev) { (this._on[t] || []).forEach(function (fn) { fn(ev || { preventDefault: function () {}, stopPropagation: function () {} }); }); };
  this.contains = function (node) {
    if (node === this) return true;
    for (var i = 0; i < this.children.length; i++) {
      if (this.children[i].contains && this.children[i].contains(node)) return true;
    }
    return false;
  };
}

function walk(root, out) {
  out.push(root);
  for (var i = 0; i < (root.children || []).length; i++) walk(root.children[i], out);
  return out;
}

function matchOne(el, raw) {
  var sel = String(raw || '').trim();
  if (!sel || !el) return false;
  if (sel.charAt(0) === '#') return el.id === sel.slice(1);
  if (sel.charAt(0) === '.') {
    return (' ' + (el.className || '') + ' ').indexOf(' ' + sel.slice(1) + ' ') !== -1;
  }
  var attrEq = sel.match(/^\[([^\]]+?)="([^"]*)"\]$/);
  if (attrEq) return el.getAttribute(attrEq[1]) === attrEq[2];
  var attr = sel.match(/^\[([^\]]+)\]$/);
  if (attr) return el.getAttribute(attr[1]) != null;
  return (el.tag || '').toLowerCase() === sel.toLowerCase();
}

function matchCompound(el, compound) {
  var parts = String(compound || '').trim().split(/(?=[.#\[])/);
  if (!parts.length || (parts.length === 1 && !parts[0])) return false;
  if (/^[a-zA-Z]/.test(parts[0])) {
    if ((el.tag || '').toLowerCase() !== parts[0].toLowerCase()) return false;
    parts = parts.slice(1);
  }
  for (var i = 0; i < parts.length; i++) {
    if (parts[i] && !matchOne(el, parts[i])) return false;
  }
  return true;
}

function queryAll(root, selector) {
  var groups = String(selector || '').split(',');
  var found = [];
  var nodes = walk(root, []);
  for (var g = 0; g < groups.length; g++) {
    var sel = groups[g].trim();
    var bits = sel.split(/\s+/);
    for (var n = 0; n < nodes.length; n++) {
      var el = nodes[n];
      if (el === root && bits.length === 1 && matchCompound(el, bits[0])) {
        if (found.indexOf(el) === -1) found.push(el);
        continue;
      }
      if (bits.length === 1) {
        if (el !== root && matchCompound(el, bits[0]) && found.indexOf(el) === -1) found.push(el);
      } else if (bits.length === 2) {
        if (el !== root && matchCompound(el, bits[1])) {
          var p = el.parent;
          var ok = false;
          while (p) {
            if (matchCompound(p, bits[0])) { ok = true; break; }
            p = p.parent;
          }
          if (ok && found.indexOf(el) === -1) found.push(el);
        }
      }
    }
  }
  found.item = function (i) { return found[i] || null; };
  return found;
}

function queryOne(root, selector) {
  var all = queryAll(root, selector);
  return all[0] || null;
}

var html = new El('html');
html.setAttribute('data-garden-galaxy', 'garden');
var body = new El('body');
html.appendChild(body);

var document = {
  readyState: 'loading',
  documentElement: html,
  body: body,
  createElement: function (tag) { return new El(tag); },
  getElementById: function (id) { return queryOne(html, '#' + id); },
  querySelector: function (sel) { return queryOne(html, sel); },
  querySelectorAll: function (sel) { return queryAll(html, sel); },
  addEventListener: function () {},
  insertBefore: function () {}
};

var fakeNow = 10000;
function FakeDate() { return {}; }
FakeDate.now = function () { return fakeNow; };

var windowObj = {
  addEventListener: function () {},
  dispatchEvent: function () {},
  matchMedia: function () { return { matches: false, addListener: function () {} }; },
  getComputedStyle: function (el) {
    return { backgroundColor: (el && el.style && el.style.background) || 'rgb(232, 176, 25)' };
  },
  FractalGarden: null
};

var keepCalls = 0;
var sandbox = {
  window: windowObj,
  document: document,
  localStorage: { getItem: function () { return null; }, setItem: function () {}, removeItem: function () {} },
  location: { protocol: 'http:', href: 'http://127.0.0.1/docs/', pathname: '/' },
  console: console,
  Date: FakeDate,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  requestAnimationFrame: function () { return 0; },
  Promise: Promise,
  JSON: JSON,
  Error: Error,
  Array: Array,
  Object: Object,
  String: String,
  Number: Number,
  KeepReceipt: {
    keep: function () {
      keepCalls += 1;
      return Promise.resolve({ receiptHash: 'nope' });
    }
  }
};
windowObj.window = windowObj;
sandbox.global = sandbox;

var code = fs.readFileSync(path.join(__dirname, 'garden-rooms.js'), 'utf8');
vm.runInNewContext(code, sandbox);


var GR = sandbox.window.GardenRooms;
assert.ok(GR && typeof GR.ensureSkyLegend === 'function', 'GardenRooms mounts');

function makeDoor(id) {
  var btn = new El('button');
  btn.className = 'garden-lumino is-' + id;
  btn.setAttribute('data-garden-lumino', id);
  var light = new El('span');
  light.className = 'garden-lumino-light';
  btn.appendChild(light);
  body.appendChild(btn);
  return btn;
}
['gathering', 'nursery', 'settings', 'thread'].forEach(makeDoor);

sandbox.GardenRooms = GR; // in a browser window.GardenRooms is also the global
var opened = [];
GR.openPlace = function (p) { opened.push('place:' + p); };
GR.openThread = function () { opened.push('thread'); };

GR.ensureSkyLegend();
var legend = document.getElementById('lumino-legend');
assert.ok(legend, 'legend is built');
assert.equal(legend.getAttribute('aria-hidden'), null, 'legend is no longer hidden from readers');
function row(id) { return queryOne(legend, '[data-lumino-row="' + id + '"]'); }
['gathering', 'nursery', 'settings', 'thread'].forEach(function (id) {
  var r = row(id);
  assert.ok(r, 'row ' + id);
  assert.equal(r.getAttribute('role'), 'button', id + ' row is a button');
  assert.equal(r.getAttribute('tabindex'), '0', id + ' row takes focus');
});
assert.equal(row('settings').getAttribute('aria-label'), 'go to Settings', 'same words as the lumino menu');
row('settings').fire('click');
row('nursery').fire('click');
row('gathering').fire('click');
row('thread').fire('click');
row('settings').fire('keydown', { key: 'Enter', preventDefault: function () {} });
row('nursery').fire('keydown', { key: 'a', preventDefault: function () {} });
assert.deepStrictEqual(opened, ['place:settings', 'place:nursery', 'place:core', 'thread', 'place:settings'], 'each word opens its own light: ' + opened.join(','));

console.log('SMOKE_OK tree glow 1 v0.1');
