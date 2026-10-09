#!/usr/bin/env node
// Node smoke for Tree first run heals v0.1 (v-tree-first-run-heals-v0.1), paste 027.
// Hypha's walk: #3 the first Chat reply is seen and the input stays in the card; #5 the same
// mind in two chairs is said so; #10 the Gathering's quiet words read; #11 Find names the port,
// and names an app only when its answer has that app's shape. Plus 019a's note: with no mind
// here and a pool route chosen, the "waits in Settings" heart rests. Stubbed fetch, fake DOM.
'use strict';
var fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
var M = 'v-tree-first-run-heals-v0.1';
function read(f) { return fs.readFileSync(path.join(__dirname, f), 'utf8'); }
var probeSrc = read('local-mind-probe.js'), roomsSrc = read('garden-rooms.js'), threadSrc = read('garden-thread.js');
var css = read('garden-rooms.css');

// ---- locks, read from the files ----
function added(s) {
  var out = '', re = new RegExp(M.replace(/\./g, '\\.') + '[\\s\\S]{0,520}', 'g'), m;
  while ((m = re.exec(s))) out += m[0] + '\n';
  return out;
}
[probeSrc, roomsSrc, threadSrc].forEach(function (s, i) {
  assert.ok(s.indexOf(M) !== -1, 'marker in file ' + i);
  assert.ok(s.indexOf('before ' + M) !== -1 || i === 1 && roomsSrc.indexOf('before ' + M) !== -1, 'old lines kept in before comments');
  var a = added(s);
  assert.ok(!/\u2014/.test(a) && !/&mdash;/.test(a) && !/\.innerHTML/.test(a) && !/confirm\(/.test(a), 'locks in added lines ' + i);
  assert.ok(!/quiet[\s_-]*room/i.test(a), 'no Quiet Room words');
});
var cssAt = css.indexOf('/* ' + M);
assert.ok(cssAt > 0 && css.length - cssAt < 6000, 'CSS layer sits at the end of the sheet');
var cssAdd = css.slice(cssAt);
assert.ok(!/place-veil-close/.test(cssAdd.replace(/#place-veil-close is not touched/, '')), '#place-veil-close untouched');
assert.ok(!/lumino-menu/.test(cssAdd), '#lumino-menu untouched');
assert.ok(!/\u2014/.test(cssAdd), 'no em dash in CSS layer');
var html = read('../index.html');
assert.ok(/<button type="button" id="place-veil-close">the garden<\/button>/.test(html), 'the garden button and its words stay');

// ---- #3 CSS: the stage joins the card's column (1280); a thread with lines gets room (390) ----
assert.ok(/@media \(min-width: 641px\) \{\s*#place-veil\.is-core #room-chat \{\s*bottom: 5\.5rem;/.test(cssAdd), '1280 card may reach lower');
assert.ok(/#place-veil\.is-core #room-chat #room-chat-stage \{\s*flex: 1 1 auto;\s*min-height: 0;\s*display: flex;\s*flex-direction: column;/.test(cssAdd), '1280 stage is a column');
assert.ok(/\.thread-messages \{\s*flex: 1 1 auto;\s*min-height: 3em;\s*max-height: none;/.test(cssAdd), '1280 replies take the room');
assert.ok(/@media \(max-width: 640px\) and \(min-height: 641px\)/.test(cssAdd), '390 rule leaves the zoomed one-page scroll alone');
assert.ok(/#room-chat:has\(\.thread-messages:not\(:empty\), \[data-thread-pool\]:not\(\[hidden\]\)\) \{\s*display: flex;\s*flex-direction: column;\s*max-height: min\(40vh, 21rem\);/.test(cssAdd), '390 card grows once there is a line or the pool line');
assert.ok(/\.thread-compose \{\s*position: static;/.test(cssAdd), '390 input sits at the foot, not over the reply');
assert.ok(/:has\(\.thread-messages:not\(:empty\)\) \.thread-later \{\s*display: none;/.test(cssAdd), '390 the later line rests while the thread has lines');
// #10 CSS
assert.ok(/\.core-chair-unnamed \{\s*color: rgba\(214, 222, 238, 0\.74\);\s*font-size: 0\.75rem;/.test(cssAdd), 'unnamed reads');
assert.ok(/\.core-family a \{ color: rgba\(196, 181, 253, 0\.95\); \}/.test(cssAdd), 'family names read');

// ---- #3 JS: a press near the Chat card is never the glass ----
function fnSrc(s, name) {
  var at = s.indexOf('function ' + name + '(');
  assert.ok(at !== -1, name + ' exists');
  var depth = 0, i = s.indexOf('{', at);
  for (; i < s.length; i++) { if (s[i] === '{') depth++; else if (s[i] === '}') { depth--; if (!depth) break; } }
  return s.slice(at, i + 1);
}
var near = vm.runInNewContext('(' + fnSrc(roomsSrc, 'nearChatCard') + ')');
var card = { hidden: false, getBoundingClientRect: function () { return { left: 760, right: 980, top: 256, bottom: 704, width: 220, height: 448 }; } };
var veilStub = { querySelector: function (s) { return s === '#room-chat' ? card : null; } };
assert.strictEqual(near(veilStub, 900, 712), true, 'just below the card is not glass');
assert.strictEqual(near(veilStub, 8, 480), false, 'far glass still closes');
card.hidden = true;
assert.strictEqual(near(veilStub, 900, 400), false, 'a hidden card is not counted');
assert.ok(/if \(ok && nearChatCard\(veil, e\.clientX, e\.clientY\)\) ok = false;/.test(roomsSrc), 'the glass tap asks first');

// ---- #3 JS: the newest reply shows where it begins ----
assert.ok(/\\b\(is-garden\|is-mind\)\\b\/\.test\(last\.className\)/.test(threadSrc), 'newest mind line shows its start');

// ---- #5 the same mind in two chairs ----
var other = vm.runInNewContext('(function(){ var CORE_CHAIRS = [{id:"cortex",type:"cortex"},{id:"memory",type:"memory"},{id:"x",type:"a seat, later",later:true}];' +
  ' var B = {}; function entryState(){ return { binds: B }; } ' + fnSrc(roomsSrc, 'otherChairWith') + ' return { set: function (b) { B = b; }, f: otherChairWith }; })()');
var seat = { model: 'llama3.2:latest', url: 'http://127.0.0.1:11434/api/tags', tag: 'general' };
other.set({ cortex: { model: 'llama3.2:latest', url: 'http://127.0.0.1:11434/api/tags' } });
assert.strictEqual(other.f('memory', seat), 'cortex', 'the other chair is named');
assert.strictEqual(other.f('cortex', seat), '', 'its own chair is not a duplicate');
assert.strictEqual(other.f('memory', { model: 'qwen2.5:latest', url: seat.url }), '', 'another mind is not a duplicate');
assert.ok(/btn\.textContent = btn\.textContent \+ ' \(already in the ' \+ alsoIn \+ ' chair\)';/.test(roomsSrc), 'the picker says already in');
assert.ok(/these two chairs are one mind, not two\./.test(roomsSrc), 'the note says one mind');
assert.ok(/LocalMindProbe\.setChairBind\(chair\.id, seat\);/.test(roomsSrc), 'still a choice: the seat is taken, never blocked');

// ---- #11 Find: the port, not a guessed app ----
var mode = {};
function res(ok, status, body, isJson) {
  return Promise.resolve({ ok: ok, status: status, type: 'cors', json: function () { return isJson ? Promise.resolve(body) : Promise.reject(new SyntaxError('Unexpected token <')); } });
}
var calls = [];
var ctx = {
  console: console, setTimeout: setTimeout, clearTimeout: clearTimeout,
  location: { protocol: 'https:', hostname: 'thelatticetree.com' },
  localStorage: { _s: {}, getItem: function (k) { return this._s[k] || null; }, setItem: function (k, v) { this._s[k] = String(v); }, removeItem: function (k) { delete this._s[k]; } },
  document: { addEventListener: function () {}, querySelector: function () { return null; }, querySelectorAll: function () { return []; }, getElementById: function () { return null; } },
  AbortController: function () { this.signal = {}; this.abort = function () {}; },
  CustomEvent: function (t, o) { this.type = t; this.detail = o && o.detail; }, dispatchEvent: function () {},
  fetch: function (url, opts) {
    calls.push({ url: url, mode: opts && opts.mode });
    var port = (String(url).match(/:(\d+)\//) || [])[1];
    var how = mode[port] || 'down';
    if (opts && opts.mode === 'no-cors') return how === 'down' ? Promise.reject(new TypeError('Failed to fetch')) : Promise.resolve({ ok: false, status: 0, type: 'opaque' });
    if (how === 'html') return res(true, 200, null, false);
    if (how === 'empty') return res(true, 200, {}, true);
    if (how === 'ollama') return res(true, 200, { models: [{ name: 'llama3.2:latest' }] }, true);
    if (how === 'openai') return res(true, 200, { object: 'list', data: [{ id: 'local-model' }] }, true);
    return Promise.reject(new TypeError('Failed to fetch')); // 'down' and 'shut' (no CORS) look the same here
  }
};
ctx.window = ctx; ctx.self = ctx;
vm.createContext(ctx);
vm.runInContext(probeSrc, ctx);
var P = ctx.LocalMindProbe;
assert.ok(P.shapeConfirms({ ok: true, url: 'http://127.0.0.1:11434/api/tags', json: { models: [] } }), 'Ollama shape');
assert.ok(!P.shapeConfirms({ ok: true, url: 'http://127.0.0.1:11434/api/tags', json: { data: [] } }), 'Ollama door needs models');
assert.ok(P.shapeConfirms({ ok: true, url: 'http://127.0.0.1:1234/v1/models', json: { object: 'list', data: [] } }), 'OpenAI-style shape');
assert.ok(!P.shapeConfirms({ ok: true, url: 'http://127.0.0.1:8080/v1/models' }), 'a page is not a mind');
assert.ok(!P.shapeConfirms({ ok: true, url: 'http://127.0.0.1:8080/v1/models', json: {} }), '{} is not a mind');
assert.strictEqual(P.portOf('http://127.0.0.1:1337/v1/models'), '1337');

(async function () {
  // a dev server on 8080 (HTML, CORS open), something on 1337 with its door shut, Ollama stopped
  mode = { '8080': 'html', '1337': 'shut' }; calls = [];
  var r = await P.look();
  assert.strictEqual(r.found, null, 'nothing is found');
  assert.strictEqual(r.foundList.length, 0, 'the dev server is not seated as llama.cpp');
  assert.strictEqual(r.unconfirmed.length, 1, 'one answer in the wrong shape');
  assert.strictEqual(r.unconfirmed[0].port, '8080', 'it is named by its port');
  var why = await P.whyQuiet(r);
  assert.strictEqual(why.kind, 'shut');
  assert.strictEqual(why.port, '1337', 'the knock names the port');
  assert.strictEqual(why.confirmed, false, 'a knock never confirms an app');
  assert.ok(!calls.some(function (c) { return /:8080\//.test(c.url) && c.mode === 'no-cors'; }), 'the answered door is not knocked');
  var a = P.speakAnswered(why.port), u = P.speakUnconfirmed('8080');
  assert.ok(/Something answered on port 1337 on this machine/.test(a) && /we do not name it/.test(a), 'answered line names the port');
  assert.ok(!/Jan|LM Studio|llama\.cpp|GPT4All|KoboldCPP|Ollama/.test(a + u), 'no app is guessed');
  assert.ok(/did not answer like a local AI app/.test(u) && /not named or seated/.test(u), 'unconfirmed line');
  assert.ok(!/\u2014/.test(a + u), 'no em dash');
  // a real Ollama shape is still found and named; a real LM Studio shape too
  mode = { '11434': 'ollama', '8080': 'empty' };
  r = await P.look();
  assert.ok(r.found && r.found.name === 'Ollama' && r.found.models[0] === 'llama3.2:latest', 'Ollama is still found by its shape');
  assert.strictEqual(r.unconfirmed[0].port, '8080', 'and {} on 8080 is still not a mind');
  mode = { '1234': 'openai' };
  r = await P.look();
  assert.ok(r.found && r.found.name === 'LM Studio' && r.found.models[0] === 'local-model', 'an OpenAI-style list is found');
  // Find (Gathering) and May I look? (Settings) use the port lines
  assert.ok(/else if \(why\.kind === 'shut' && why\.port\) setNoteAbsent\('answered', why\.port\);/.test(roomsSrc), 'Find says the port');
  assert.ok(/setNoteAbsent\('unconfirmed', report\.unconfirmed\[0\]\.port\);/.test(roomsSrc), 'Find says an unconfirmed port');
  assert.ok(/setStatus\(root, speakUnconfirmed\(report\.unconfirmed\[0\]\.port\), 'warn'\);/.test(probeSrc), 'Settings says an unconfirmed port');

  // ---- 019a note: no mind here + a pool route: the waits-in-Settings heart rests ----
  var listeners = {};
  function El(tag) {
    this.tagName = String(tag).toUpperCase(); this.children = []; this.attrs = {}; this.hidden = false; this.className = '';
    this._text = ''; this.disabled = false; this.readOnly = false; this.value = ''; this.style = {}; this.parentNode = null;
    var self = this;
    this.classList = { add: function (c) { if ((' ' + self.className + ' ').indexOf(' ' + c + ' ') === -1) self.className = (self.className + ' ' + c).trim(); },
      remove: function (c) { self.className = (' ' + self.className + ' ').replace(' ' + c + ' ', ' ').trim(); },
      contains: function (c) { return (' ' + self.className + ' ').indexOf(' ' + c + ' ') !== -1; } };
  }
  El.prototype = {
    get textContent() { return this._text + this.children.map(function (c) { return c.textContent; }).join(''); },
    set textContent(v) { this._text = String(v); this.children = []; },
    set innerHTML(v) { this.children = []; this._text = ''; },
    get innerHTML() { return ''; },
    appendChild: function (c) { c.parentNode = this; this.children.push(c); return c; },
    setAttribute: function (k, v) { this.attrs[k] = String(v); }, getAttribute: function (k) { return k in this.attrs ? this.attrs[k] : null; },
    removeAttribute: function (k) { delete this.attrs[k]; }, hasAttribute: function (k) { return k in this.attrs; },
    addEventListener: function () {}, focus: function () {}, blur: function () {}, click: function () {},
    contains: function (x) { return x === this || this.children.some(function (c) { return c.contains(x); }); },
    get lastElementChild() { return this.children[this.children.length - 1] || null; },
    getBoundingClientRect: function () { return { top: 0, left: 0, width: 0, height: 0 }; },
    all: function () { var out = []; this.children.forEach(function (c) { out.push(c); out = out.concat(c.all()); }); return out; },
    querySelectorAll: function (sel) { var k = sel.replace(/^\[|\]$/g, ''); return this.all().filter(function (e) { return k in e.attrs; }); }
  };
  var docRoot = new El('body');
  var route = null, mind = null;
  var tctx = {
    console: console, setTimeout: function () { return 0; }, clearTimeout: function () {},
    location: { protocol: 'https:', href: 'https://thelatticetree.com/' },
    localStorage: { _s: {}, getItem: function (k) { return this._s[k] || null; }, setItem: function (k, v) { this._s[k] = String(v); }, removeItem: function (k) { delete this._s[k]; } },
    document: { createElement: function (t) { return new El(t); }, querySelector: function () { return null; }, body: docRoot,
      querySelectorAll: function (sel) { return docRoot.querySelectorAll(sel); }, get activeElement() { return docRoot; } },
    addEventListener: function (t, f) { (listeners[t] = listeners[t] || []).push(f); },
    LocalMindProbe: { getRemembered: function () { return mind; }, resolveSpeakMind: function () { return mind; } },
    TreePool: { chatRoute: function () { return route; }, askChat: function () { return Promise.resolve({ ok: false }); }, reasonWords: function () { return ''; } },
    CustomEvent: function () {}, Blob: function () {}, URL: {}, FileReader: function () {}, AbortController: ctx.AbortController
  };
  tctx.window = tctx;
  vm.createContext(tctx);
  vm.runInContext(threadSrc, tctx);
  var host = new El('div'); docRoot.appendChild(host);
  function hearts() { return host.querySelectorAll('[data-thread-heart]'); }
  function poolLine() { return host.querySelectorAll('[data-thread-pool]')[0]; }
  // no mind, no route: the honest waits-in-Settings heart shows
  tctx.GardenThread.mount(host, { room: true });
  assert.strictEqual(hearts()[0].hidden, false, 'no route: the heart shows');
  assert.ok(/A mind at home waits in Settings/.test(hearts()[0].textContent), 'heart words unchanged');
  // no mind, a route: the heart rests and the pool line leads
  route = { model: 'qwen2.5:7b', devices: 1 };
  tctx.GardenThread.mount(host, { room: true });
  assert.strictEqual(hearts()[0].hidden, true, 'route chosen, no mind here: the heart rests');
  assert.strictEqual(poolLine().hidden, false, 'the pool line shows');
  assert.ok(/Asking through the Device Pool: qwen2\.5:7b/.test(poolLine().textContent), 'pool line words');
  // the route stops: the heart comes back without a remount
  route = null;
  listeners['tree-pool-chat-route'].forEach(function (f) { f(); });
  assert.strictEqual(hearts()[0].hidden, false, 'route stopped: the heart comes back');
  // a mind here: the heart shows (listening), route or not
  route = { model: 'qwen2.5:7b', devices: 1 };
  mind = { name: 'Ollama', url: 'http://127.0.0.1:11434/api/tags', model: 'llama3.2:latest' };
  listeners['fl-alpha-mind-remembered'].forEach(function (f) { f(); });
  assert.strictEqual(hearts()[0].hidden, false, 'a mind here: the heart shows');
  assert.ok(/Listening: Ollama/.test(hearts()[0].textContent), 'listening line');

  console.log('SMOKE_OK tree first run heals v0.1');
})().catch(function (e) { console.error(e); process.exit(1); });
