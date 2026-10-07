#!/usr/bin/env node
// v-tree-menu-clarity-v0: menus and veils a hint more solid. CSS only. No network.
'use strict';
var fs = require('fs');
var path = require('path');
var assert = require('assert');
var css = fs.readFileSync(path.join(__dirname, 'garden-rooms.css'), 'utf8');
var at = css.indexOf('v-tree-menu-clarity-v0');
assert.ok(at > 0, 'marker present');
var block = css.slice(at);
function alpha(sel) {
  var re = new RegExp(sel.replace(/[.#()\[\]]/g, '\\$&') + ' \\{ background: rgba\\(12, 10, 26, ([0-9.]+)\\); \\}');
  var m = block.match(re);
  assert.ok(m, 'rule for ' + sel);
  return parseFloat(m[1]);
}
assert.ok(alpha('#place-veil') >= 0.30, 'place veil');
assert.ok(alpha('#place-veil.is-core') >= 0.26, 'core veil');
assert.ok(alpha('#place-veil.is-settings') >= 0.36, 'settings veil');
assert.ok(alpha('#thread-veil') >= 0.36, 'thread veil');
assert.ok(/html\.room-page \.galaxies-panel \{ background: rgba\(12, 10, 26, 0\.985\); \}/.test(block), 'galaxies panel');
// Layer, never delete: the older rules are still there.
assert.ok(/background: rgba\(12, 10, 26, 0\.22\);/.test(css.slice(0, at)), 'old veil rule kept');
assert.ok(!/\u2014|&mdash;/.test(block), 'no em dash in the new block');
assert.ok(!/lumino-menu/.test(block), '#lumino-menu untouched');
console.log('SMOKE_OK tree menu clarity v0');
