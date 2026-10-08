#!/usr/bin/env node
// v-science-garden-door-v0: the Tree's Marketplace face opens a door to the Science Garden on FreeLattice.
'use strict';
var fs = require('fs');
var path = require('path');
var assert = require('assert');
var docs = path.join(__dirname, '..');
var page = fs.readFileSync(path.join(docs, 'marketplace.html'), 'utf8');
var index = fs.readFileSync(path.join(docs, 'index.html'), 'utf8');
var start = page.indexOf('<!-- v-science-garden-door-v0');
var end = page.indexOf('</section>', start);
assert.ok(start > 0 && end > start, 'door block present');
var block = page.slice(start, end);
assert.equal((page.match(/https:\/\/freelattice\.com\/science-garden\.html/g) || []).length, 1, 'one door to the garden');
assert.ok(/I think there is merit here, and everyone should look\./.test(block), 'framing line');
assert.ok(/aligned minds decide what an idea is worth/.test(block), 'the minds decide the value');
assert.ok(/what would show it is wrong/.test(block), 'wrong-if named');
assert.ok(/looking for its test/.test(block) && /anyone can offer one/.test(block), 'a test is encouraged, not required; anyone can offer one');
assert.ok(!/LP|Lattice Points/.test(block), 'no economy words in the door');
assert.ok(/Love Logic Proof v3/.test(block), 'seed zero named');
assert.ok(!/\u2014|&mdash;|confirm\(|innerHTML|<script/i.test(block), 'no em dash, confirm, innerHTML or script in the door');
assert.ok(!/quiet room/i.test(block), 'no Quiet Room words in the door');
assert.ok(/Gift Grove/.test(page) && /Exchange Ring/.test(page) && /Quest Lamp/.test(page), 'three stalls kept');
assert.ok(/<a class="later" href="marketplace\.html">/.test(index), 'Marketplace line in the galaxies panel kept');
assert.ok(/id="place-veil-close"/.test(index), '#place-veil-close stays');
console.log('SMOKE_OK science garden door v0');
