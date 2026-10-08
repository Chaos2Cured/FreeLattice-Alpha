#!/usr/bin/env node
// v-tree-menu-leftovers-v0: hop arrows rest under open veils, room headers 0.88,
// Settings close lane on a phone. CSS only. No network.
'use strict';
var fs = require('fs');
var path = require('path');
var assert = require('assert');
var css = fs.readFileSync(path.join(__dirname, 'garden-rooms.css'), 'utf8');
var at = css.indexOf('v-tree-menu-leftovers-v0');
assert.ok(at > 0, 'marker present');
assert.ok(css.indexOf('v-tree-menu-clarity-v0') > 0 && css.indexOf('v-tree-menu-clarity-v0') < at, 'layers after 020');
var block = css.slice(at);
var before = css.slice(0, at);
// 1. hops rest while a veil is open; Nursery keeps its own dim rest.
assert.ok(/html:has\(#place-veil\.is-open:not\(\.is-nursery\)\) \.galaxy-nav,\s*html:has\(#thread-veil\.is-open\) \.galaxy-nav \{\s*visibility: hidden;/.test(block), 'hops rest under open veils');
assert.ok(!/\.galaxy-nav[^{]*\{[^}]*display:\s*none/.test(block), 'hops are rested, not removed');
assert.ok(/:has\(#place-veil\.is-nursery\.is-open\) \.galaxy-nav/.test(before), 'older Nursery dim rule kept');
// 2. each room header selector that held 0.78 gets an equally specific 0.88 rule.
['html.room-page #garden-header', 'html[data-garden-galaxy="workshop"] #garden-header',
 'html[data-garden-galaxy="art"] #garden-header', 'html[data-garden-galaxy="round-table"] #garden-header',
 'html[data-garden-galaxy="research"] #garden-header'].forEach(function (sel) {
  assert.ok(before.indexOf(sel) > 0, 'older rule still there: ' + sel);
  assert.ok(block.indexOf(sel) > 0, 'equal-weight layer: ' + sel);
});
assert.ok(/rgba\(12, 10, 26, 0\.88\), transparent\)/.test(block), 'header 0.88');
assert.ok(/rgba\(12, 10, 26, 0\.78\), transparent\)/.test(before), 'older 0.78 rules kept');
// 3. Settings close stays visible; lane behind it; never hidden.
assert.ok(/#place-veil\.is-settings::after \{[^}]*height: 84px/.test(block), 'solid lane behind the pill');
assert.ok(/scroll-padding-bottom/.test(block), 'focused rows scroll clear');
assert.ok(!/#place-veil-close[^{]*\{[^}]*(display:\s*none|visibility:\s*hidden|opacity:\s*0[;\s])/.test(block), '#place-veil-close never hidden');
// Locks
assert.ok(!/\u2014|&mdash;/.test(block), 'no em dash');
assert.ok(!/lumino-menu/.test(block), '#lumino-menu untouched');
assert.ok(!/quiet room/i.test(block), 'no Quiet Room words');
console.log('SMOKE_OK tree menu leftovers v0');
