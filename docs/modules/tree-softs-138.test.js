#!/usr/bin/env node
// Unit tests for tree-softs-138: fresh Gathering receipts, Settings button CSS.
// Does not load quiet-room. Does not change AUTONOMY.md.
'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');
var assert = require('assert');

function El(id, tag, cls, text) {
  this.id = id || '';
  this.tagName = (tag || 'div').toUpperCase();
  this.className = cls || '';
  this.textContent = text || '';
  this.hidden = false;
  this.attrs = {};
  this.listeners = {};
  this.children = [];
  this.style = {};
}
El.prototype.getAttribute = function (k) { return this.attrs[k]; };
El.prototype.setAttribute = function (k, v) { this.attrs[k] = String(v); };
El.prototype.removeAttribute = function (k) { delete this.attrs[k]; };
El.prototype.addEventListener = function (type, fn) {
  (this.listeners[type] || (this.listeners[type] = [])).push(fn);
};
El.prototype.click = function () {
  var ev = { type: 'click', target: this };
  (this.listeners.click || []).forEach(function (fn) { fn(ev); });
  if (typeof document !== 'undefined' && document._listeners && document._listeners.click) {
    document._listeners.click.forEach(function (fn) { fn(ev); });
  }
};
El.prototype.appendChild = function (c) { this.children.push(c); return c; };
El.prototype.querySelector = function () { return null; };

var who = new El('flgs-who', 'p', 'flgs-who',
  'No chair is speaking yet. Seat a mind, then let that chair speak first. Find local minds is above. More, then Connect, can help.');
var receipt = new El('flgs-receipt', 'p', 'flgs-receipt', '');
receipt.hidden = true;
var askBtn = new El('flgs-ask-btn', 'button', '', 'Ask');
var styleHost = { children: [], appendChild: function (c) { this.children.push(c); return c; } };
var byId = { 'flgs-who': who, 'flgs-receipt': receipt, 'flgs-ask-btn': askBtn };

var timeouts = [];
var document = {
  readyState: 'complete',
  documentElement: styleHost,
  head: styleHost,
  body: styleHost,
  getElementById: function (id) {
    if (id === 'tree-softs-138-style') {
      return styleHost.children.find(function (c) { return c.id === id; }) || null;
    }
    return byId[id] || null;
  },
  createElement: function (tag) { return new El('', tag); },
  addEventListener: function (type, fn) {
    (this._listeners || (this._listeners = {}));
    (this._listeners[type] || (this._listeners[type] = [])).push(fn);
  }
};

var online = true;
var root = {
  document: document,
  navigator: { get onLine() { return online; } },
  setTimeout: function (fn, ms) { timeouts.push(fn); return timeouts.length; },
  setInterval: function () { return 1; },
  clearInterval: function () {},
  addEventListener: function () {}
};

var src = fs.readFileSync(path.join(__dirname, 'tree-softs-138.js'), 'utf8');
vm.runInNewContext(src, { window: root, console: console });

assert(root.TreeSofts138, 'layer API missing');
root.TreeSofts138.start();
// flush start timeout
timeouts.splice(0).forEach(function (fn) { fn(); });

assert(askBtn.attrs['data-tree-softs-138-bound'], 'Ask button was not bound');
assert(styleHost.children.some(function (c) { return c.id === 'tree-softs-138-style'; }), 'style not added');
var css = styleHost.children.filter(function (c) { return c.id === 'tree-softs-138-style'; })[0].textContent;
assert(/fl-image-local-yes/.test(css) && /tree-style-ledger-host button/.test(css), 'button CSS missing');
assert(/min-height:44px/.test(css) && /Georgia/.test(css) && /#e8b019/.test(css), 'Tree gold / 44px / Georgia missing');
assert(/fl-tree-image-door button/.test(css) && /tree-image-door-host button/.test(css), 'image door button CSS missing');

function askLikeSpeakThenLayer(receiptText, hide) {
  receipt.textContent = receiptText;
  receipt.hidden = !!hide;
  askBtn.click();
  timeouts.splice(0).forEach(function (fn) { fn(); });
}

// Simulate mount dedupe: speak writes the who line, mount hides and clears.
askLikeSpeakThenLayer(who.textContent, true);
receipt.textContent = '';
receipt.hidden = true;
// The layer timeout already ran after click with hidden empty? We clicked then flushed.
// Re-run afterAsk as the 30ms timer would, with the deduped empty receipt.
// In hookAsk, afterAsk is queued then we flushed it while receipt was still
// the who-line hidden. Make a cleaner sequence:

timeouts = [];
receipt.textContent = who.textContent;
receipt.hidden = true;
receipt.textContent = ''; // mount cleared
askBtn.click();
timeouts.splice(0).forEach(function (fn) { fn(); });
assert.equal(receipt.hidden, false, 'receipt should be unhidden after no-mind Ask');
assert(receipt.textContent.length > 8, 'fresh no-mind receipt missing');
assert.notEqual(receipt.textContent.replace(/\s+/g, ' ').trim(), who.textContent.replace(/\s+/g, ' ').trim(), 'receipt must not repeat the who line');
var first = receipt.textContent;

askBtn.click();
timeouts.splice(0).forEach(function (fn) { fn(); });
var second = receipt.textContent;
assert.notEqual(second, first, 'second no-mind Ask should be a fresh sentence');
assert.equal(receipt.hidden, false);

askBtn.click();
timeouts.splice(0).forEach(function (fn) { fn(); });
var third = receipt.textContent;
assert.notEqual(third, second, 'third no-mind Ask should be a fresh sentence');

// Offline rotates a different family
online = false;
receipt.textContent = '';
receipt.hidden = true;
askBtn.click();
timeouts.splice(0).forEach(function (fn) { fn(); });
assert(/network|line is quiet|could not reach/i.test(receipt.textContent), 'offline receipt should be kind and about the line: ' + receipt.textContent);
var off1 = receipt.textContent;
askBtn.click();
timeouts.splice(0).forEach(function (fn) { fn(); });
assert.notEqual(receipt.textContent, off1, 'second offline Ask should be a fresh sentence');

// Do not overwrite a standing "write a short ask first"
online = true;
receipt.hidden = false;
receipt.textContent = 'Write a short ask first.';
askBtn.click();
timeouts.splice(0).forEach(function (fn) { fn(); });
assert.equal(receipt.textContent, 'Write a short ask first.', 'must leave the empty-ask receipt alone');

console.log('PASS tree-softs-138 unit: fresh no-mind and offline receipts; Settings CSS present; empty-ask left alone.');
