#!/usr/bin/env node
// v-tree-honest-reasons-v0: say the right one. Ollama stopped (nothing answers), a mind
// that answers but keeps its door shut to this secure page, and a seated model that is
// gone (404 "model not found") each get their own honest line. The knock is no-cors, only
// after a tap, and reads nothing. Stubbed fetch only. No network.
'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');
var assert = require('assert');

var src = fs.readFileSync(path.join(__dirname, 'local-mind-probe.js'), 'utf8');
var rooms = fs.readFileSync(path.join(__dirname, 'garden-rooms.js'), 'utf8');
var thread = fs.readFileSync(path.join(__dirname, 'garden-thread.js'), 'utf8');

var calls = [];
var mode = 'stopped';
function fakeFetch(url, opts) {
  calls.push({ url: url, mode: opts && opts.mode });
  if (mode === 'stopped') return Promise.reject(new TypeError('Failed to fetch'));
  if (mode === 'shut') {
    if (opts && opts.mode === 'no-cors') return Promise.resolve({ ok: false, status: 0, type: 'opaque' });
    return Promise.reject(new TypeError('Failed to fetch'));
  }
  return Promise.reject(new Error('unexpected'));
}
var store = {};
var ctx = {
  window: {}, console: console, setTimeout: setTimeout, clearTimeout: clearTimeout,
  location: { protocol: 'https:', hostname: 'thelatticetree.com' },
  localStorage: { getItem: function (k) { return store[k] || null; }, setItem: function (k, v) { store[k] = String(v); }, removeItem: function (k) { delete store[k]; } },
  document: { addEventListener: function () {}, querySelector: function () { return null; }, querySelectorAll: function () { return []; }, getElementById: function () { return null; } },
  fetch: fakeFetch, AbortController: function () { this.signal = {}; this.abort = function () {}; }
};
ctx.window = ctx; ctx.self = ctx;
vm.createContext(ctx);
vm.runInContext(src, ctx);
var P = ctx.LocalMindProbe;
assert.ok(P && typeof P.knock === 'function' && typeof P.whyQuiet === 'function', 'knock and whyQuiet are exported');

var quietReport = { found: null, https: true, blocked: 2, results: [
  { ok: false, status: 0, blocked: true, name: 'Ollama', url: 'http://127.0.0.1:11434/api/tags' },
  { ok: false, status: 0, blocked: true, name: 'LM Studio', url: 'http://127.0.0.1:1234/v1/models' }
] };

(async function () {
  mode = 'stopped'; calls = [];
  var why = await P.whyQuiet(quietReport);
  assert.strictEqual(why.kind, 'stopped', 'nothing answered: stopped');
  assert.ok(calls.length === 2 && calls.every(function (c) { return c.mode === 'no-cors'; }), 'knocks are no-cors, one per quiet door');
  assert.ok(/Nothing answered at the usual doors/.test(P.speakStopped()) && /start it/.test(P.speakStopped()), 'stopped line says start it');
  assert.ok(!/The mind is there/.test(P.speakStopped()), 'stopped never says the mind is there');

  mode = 'shut'; calls = [];
  why = await P.whyQuiet(quietReport);
  assert.strictEqual(why.kind, 'shut', 'answered with a shut door: shut');
  assert.strictEqual(why.name, 'Ollama', 'names the door that answered');
  assert.ok(/Something answered at the Ollama door/.test(P.speakShut('Ollama')), 'shut line names the door');

  why = await P.whyQuiet({ results: [{ ok: true, url: 'x' }] });
  assert.strictEqual(why.kind, 'none', 'nothing quiet: nothing to knock');

  // look() itself never knocks (Settings may look on its own; the knock is only after a tap)
  var lookSrc = src.slice(src.indexOf('function look()'), src.indexOf('function look()') + 2600);
  assert.ok(!/knock\(/.test(lookSrc.slice(0, lookSrc.indexOf('function ', 20))), 'look() does not knock');

  // Find (Gathering) and May I look? (Settings) knock only in the quiet secure-page case
  assert.ok(/LocalMindProbe\.whyQuiet\(report\)\.then\(function \(why\) \{\s*if \(why\.kind === 'stopped'\) setNoteAbsent\('stopped'\);/.test(rooms), 'Find says stopped');
  assert.ok(/kind === 'stopped'\) \{\s*n\.appendChild\(document\.createTextNode\(\s*'Nothing answered at the usual doors on this machine\./.test(rooms), 'Find stopped line');
  assert.ok(/whyQuiet\(report\)\.then\(function \(why\) \{\s*if \(why\.kind === 'shut'\) setStatus\(root, speakShut\(why\.name\), 'warn'\);/.test(src), 'Settings says shut or stopped');

  // Chat: model missing is named; a quiet door is knocked once after this Send
  assert.ok(/res\.status === 404 && \/model/.test(thread) && /err\.reason = 'model-missing';/.test(thread), '404 model not found is read');
  assert.ok(/err\.reason === 'model-missing'\) \{ say\(heartModelMissing\(err\.model\)\); return; \}/.test(thread), 'model missing is said');
  assert.ok(/does not have ' \+ \(model \|\| 'that model'\) \+ ' now\. ' \+\s*'Pick another in Settings, or Change this chair\./.test(thread), 'model missing line names it and says what to do');
  assert.ok(/if \(k === 'down'\) say\(HEART_STOPPED\);/.test(thread), 'Chat says stopped when nothing answers');
  assert.ok(/err\.reason === 'model-missing'\)\) throw err;/.test(thread), 'model missing is not swallowed by the url chain');
  assert.ok(/\\bis-garden\\b/.test(thread) && /list\.scrollTop = Math\.max\(0, list\.scrollTop \+ dy\)/.test(thread), 'a long garden line shows where it begins');

  // Find's first-moment guard (Glow 2a) answers instead of looking like nothing happened
  assert.ok(/if \(Date\.now\(\) < findReadyAt\) \{\s*setNoteText\('One moment\. Tap Find local minds again when you are ready\. Nothing was looked at yet\.'\);\s*\}/.test(rooms), 'Find guard says one moment');

  // locks
  var added = [src, rooms, thread].map(function (s) {
    var out = ''; var re = /v-tree-honest-reasons-v0[\s\S]{0,900}/g; var m;
    while ((m = re.exec(s))) out += m[0];
    return out;
  }).join('\n');
  assert.ok(!/confirm\(/.test(added), 'no confirm()');
  assert.ok(!/innerHTML\s*\+?=(?!\s*'';)/.test(added), 'no innerHTML for outside text (clearing with an empty string only)');
  assert.ok(!/\u2014/.test(added), 'no em dash in added lines');

  console.log('SMOKE_OK tree honest reasons v0.1');
})().catch(function (e) { console.error(e); process.exit(1); });
