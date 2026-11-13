#!/usr/bin/env node
// Tree web search layer: default on, provenance, kind fails, byte-identical tool.
// Does not load quiet-room. Does not change AUTONOMY.md. Does not run smoke.js.
'use strict';
var fs = require('fs');
var path = require('path');
var assert = require('assert');
var crypto = require('crypto');

var rootDir = path.join(__dirname, '..', '..');
function read(rel) { return fs.readFileSync(path.join(rootDir, rel), 'utf8'); }
function sha256(rel) {
  return crypto.createHash('sha256').update(fs.readFileSync(path.join(rootDir, rel))).digest('hex');
}
function md5(rel) {
  return crypto.createHash('md5').update(fs.readFileSync(path.join(rootDir, rel))).digest('hex');
}

assert.strictEqual(md5('AUTONOMY.md'), '09a4f1a286226e37089a93df42df0106', 'AUTONOMY.md unchanged');
assert.strictEqual(md5('docs/modules/fl-gathering.js'), '4dbbff5d554c42256605b37939835080', 'fl-gathering.js twin unchanged');
assert.strictEqual(md5('docs/modules/gathering-speak.js'), '0460fdc777a21f7a1744f401dda82cb2', 'gathering-speak.js twin unchanged');
assert.strictEqual(
  sha256('docs/modules/web-tool.js'),
  '652f76c567e8402d7ef348842a856fa58de67792e942d0b04336eb5fbc96873e',
  'web-tool.js is byte-identical to FreeLattice v-web-search-default-on-v0.1'
);
assert.ok(!/quiet-room/i.test(read('docs/modules/tree-web-search.js')), 'tree layer does not name quiet-room');
assert.ok(read('docs/index.html').indexOf('modules/web-tool.js') !== -1, 'index loads web-tool.js');
assert.ok(read('docs/index.html').indexOf('modules/tree-web-search.js') !== -1, 'index loads the Tree layer');
assert.ok(read('docs/settings.html').indexOf('modules/web-tool.js') !== -1, 'settings loads web-tool.js');
assert.ok(read('docs/settings.html').indexOf('tree-web-search-host') !== -1, 'settings has a host for the toggle');
assert.ok(/2026-11-13 \(MST\), Tree web search/.test(read('SPINE.md')), 'SPINE Done row present');

var store = {};
var seated = false;
global.localStorage = {
  getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
  setItem: function (k, v) { store[k] = String(v); },
  removeItem: function (k) { delete store[k]; }
};
global.window = global;
global.document = {
  querySelector: function () { return null; },
  getElementById: function () { return null; },
  readyState: 'complete'
};
require('./web-tool.js');
require('./tree-web-search.js');
var api = global.TreeWebSearch;
var tool = global.FLWebTool;
assert.ok(api && tool, 'APIs are present');
assert.ok(tool.isSearchEnabled(), 'search is on by default');
assert.ok(api.searchOn(), 'layer sees search on by default');
assert.ok(tool.isAvailable(), 'the default worker endpoint is available');
assert.ok(!tool.isAskFirst(), 'nothing begs for permission by default');

api.setSearchOn(false);
assert.strictEqual(api.searchOn(), false, 'a person can turn it off');
api.setSearchOn(true);
assert.ok(api.searchOn(), 'turning it back on clears the off flag');

var parsed = tool.interceptSentinel('I need a fact. [FL_SEARCH: aurora borealis] Done.');
assert.ok(parsed.action && parsed.action.type === 'search', 'sentinel is intercepted');
assert.strictEqual(parsed.action.query, 'aurora borealis');
assert.ok(parsed.visibleText.indexOf('[FL_SEARCH:') === -1, 'sentinel is stripped from visible text');

var labeled = api.provenance([
  { title: 'Aurora', snippet: 'Lights in the north.', url: 'https://example.com/aurora' }
]);
assert.ok(/source: web/.test(labeled), 'sources are marked with a provenance label');
assert.ok(/https:\/\/example.com\/aurora/.test(labeled), 'the URL is kept');
assert.ok(/weigh them yourself/i.test(labeled), 'the mind is asked to weigh the sources');
assert.ok(/held back/i.test(labeled), 'nothing is held back');

(async function () {
  // No mind: kind fail, no storage of the query in the ledger.
  seated = false;
  global.LocalMindProbe = { getRemembered: function () { return false; } };
  var noMind = await api.handleReply('Looking up. [FL_SEARCH: secret-query-xyz]');
  assert.ok(/No mind is seated/.test(noMind), 'no mind fails kindly: ' + noMind);
  assert.ok(noMind.indexOf('secret-query-xyz') === -1, 'the query is not shown in the kind no-mind line');

  api.setSearchOn(false);
  var off = await api.handleReply('Looking up. [FL_SEARCH: aurora]');
  assert.ok(/Web search is off/.test(off), 'off fails kindly: ' + off);
  api.setSearchOn(true);

  global.LocalMindProbe = { getRemembered: function () { return true; } };
  var origFetch = global.fetch;
  global.fetch = function () { return Promise.reject(new Error('network down')); };
  var down = await api.handleReply('Looking up. [FL_SEARCH: aurora]');
  assert.ok(/could not be reached/.test(down), 'no network fails kindly: ' + down);
  global.fetch = origFetch;

  global.FLWebTool.performSearch = function () {
    return Promise.resolve([
      { title: 'Aurora', snippet: 'Lights in the north.', url: 'https://example.com/aurora' },
      { title: 'Second', snippet: 'Also here.', url: 'https://example.com/two' }
    ]);
  };
  var ok = await api.handleReply('Looking up. [FL_SEARCH: aurora]');
  assert.ok(/source: web/.test(ok), 'successful search is labeled');
  assert.ok(/https:\/\/example.com\/aurora/.test(ok) && /https:\/\/example.com\/two/.test(ok), 'every result is kept');
  assert.ok(!/secret-query/.test(ok), 'the query stays out of the provenance text');

  var ledger = JSON.parse(global.localStorage.getItem('fl_searchLedger') || '[]');
  ledger.forEach(function (row) {
    assert.ok(!('query' in row), 'ledger has no query field');
    assert.ok(!('url' in row) && !('snippet' in row), 'ledger has no result text');
  });

  console.log('ok tree-web-search default-on, provenance, kind fail, twins and AUTONOMY untouched');
  process.exit(0);
})().catch(function (e) {
  console.error(e);
  process.exit(1);
});
