// Node test for the Tree's no-install mind v0.1 (v-tree-no-install-mind-v0.1, paste 028).
// A mind that runs inside the browser (WebLLM, stubbed here), seated like a local mind, and lent
// through the Device Pool's same door: kin only, Pause wins, asked in the page, never fetched.
// The harness (stand-in WebRTC and page) is the one from tree-pool.test.js, layered.
var fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
var webcrypto = require('crypto').webcrypto;
var kinSrc = fs.readFileSync(path.join(__dirname, 'tree-kin.js'), 'utf8');
var src = fs.readFileSync(path.join(__dirname, 'tree-pool.js'), 'utf8');
var bmSrc = fs.readFileSync(path.join(__dirname, 'tree-browser-mind.js'), 'utf8');
var thSrc = fs.readFileSync(path.join(__dirname, 'garden-thread.js'), 'utf8');
var rmSrc = fs.readFileSync(path.join(__dirname, 'garden-rooms.js'), 'utf8');

// ---- locks, read from the source ----
assert.ok(bmSrc.indexOf('v-tree-no-install-mind-v0.1') !== -1, 'marker');
assert.ok(/SPDX-License-Identifier: MIT/.test(bmSrc), 'our code is MIT');
[bmSrc].forEach(function (s) {
  assert.ok(!/\u2014/.test(s) && !/&mdash;/.test(s), 'no em dash');
  assert.ok(!/\.innerHTML/.test(s), 'textContent only');
  assert.ok(!/confirm\(/.test(s) && !/alert\(/.test(s) && !/[^.\w]prompt\(/.test(s), 'no dialog boxes');
  assert.ok(!/quiet room/i.test(s), 'no Quiet Room words');
  assert.ok(!/AGPL/.test(s), 'nothing AGPL');
});
assert.ok(!/fetch\(|XMLHttpRequest|WebSocket|sendBeacon|EventSource/.test(bmSrc), 'the browser mind module fetches nothing itself (WebLLM fetches the files, only after a tap)');
assert.ok(/var LIB_URL = 'lib\/web-llm\/web-llm-0\.2\.85\.js';/.test(bmSrc), 'engine code is vendored on this site, pinned');
assert.ok(!/jsdelivr|esm\.run|unpkg|cdnjs/.test(bmSrc.replace(/^\s*\/\/.*$/mg, '')), 'no CDN for code');
assert.ok(!/Qwen2\.5-3B/.test(bmSrc.replace(/^\s*\/\/.*$/mg, '')), 'the research-only 3B size is not offered');
var addedTree = ['tree-pool.js', 'garden-thread.js', 'garden-rooms.js'].map(function (f) { return fs.readFileSync(path.join(__dirname, f), 'utf8'); });
addedTree.forEach(function (s) {
  s.split('\n').filter(function (l) { return /v-tree-no-install-mind-v0\.1/.test(l) || /TreeBrowserMind|in-browser|inBrowser|HEART_BROWSER|inPage\(/.test(l); }).forEach(function (l) {
    assert.ok(!/\u2014|&mdash;|innerHTML|confirm\(/.test(l), 'added line keeps the locks: ' + l.trim().slice(0, 80));
  });
});
assert.strictEqual((src.match(/root\.fetch\(/g) || []).length, 1, 'tree-pool still has one fetch, to this computer\'s own loopback AI');
assert.ok(/LOOPBACK\[String\(u\.hostname/.test(src), 'the loopback-only rule for Ollama is unchanged');
assert.ok(/kind === 'in-page' \? inPage\(a, ctrl\)/.test(src), 'the in-page door is the only other path');
assert.ok(/if \(inBrowser\(mind\)\) return TreeBrowserMind\.chat/.test(thSrc), 'Chat asks the in-browser mind in the page');
assert.ok(/tree-browser-mind-host/.test(rmSrc), 'the card mounts in the Settings veil');

// ---- a stand-in WebRTC: offers and answers carry an id and a DTLS fingerprint ----
var pcs = {}, pcN = 0, rtcMade = 0, tamper = null, mitm = false;
function Emitter() { this._on = {}; }
Emitter.prototype.addEventListener = function (e, f) { (this._on[e] = this._on[e] || []).push(f); };
Emitter.prototype.fire = function (e, ev) { (this._on[e] || []).forEach(function (f) { f(ev || {}); }); };
function FakeDC(owner) { Emitter.call(this); this.readyState = 'connecting'; this.partner = null; this.owner = owner; }
FakeDC.prototype = Object.create(Emitter.prototype);
FakeDC.prototype.send = function (data) {
  var t = this.partner;
  if (tamper) data = tamper(data) || data;
  setTimeout(function () { if (t && t.readyState === 'open') t.fire('message', { data: data }); }, 0);
};
FakeDC.prototype.close = function () {
  var a = this, b = this.partner;
  if (a.readyState === 'closed') return;
  a.readyState = 'closed'; a.fire('close');
  if (b && b.readyState !== 'closed') { b.readyState = 'closed'; setTimeout(function () { b.fire('close'); }, 0); }
};
function FakePC(config) {
  Emitter.call(this);
  assert.ok(config && Array.isArray(config.iceServers) && config.iceServers.length === 0, 'no STUN or TURN server');
  rtcMade++;
  this.id = 'pc' + (++pcN); pcs[this.id] = this;
  this.fp = 'SHA-256 ' + webcrypto.getRandomValues(new Uint8Array(8)).join(':');
  this.localDescription = null; this.remoteDescription = null; this.iceGatheringState = 'new'; this.connectionState = 'new'; this.dc = null; this.tag = '';
}
FakePC.prototype = Object.create(Emitter.prototype);
FakePC.prototype.createDataChannel = function () { this.dc = new FakeDC(this); return this.dc; };
FakePC.prototype._sdp = function (type) { return 'v=0\r\no=- ' + this.id + '\r\na=x-id:' + this.id + '\r\na=fingerprint:' + this.fp + '\r\na=type:' + type + '\r\n'; };
FakePC.prototype.createOffer = function () { return Promise.resolve({ type: 'offer', sdp: this._sdp('offer') }); };
FakePC.prototype.createAnswer = function () { return Promise.resolve({ type: 'answer', sdp: this._sdp('answer') }); };
FakePC.prototype.setLocalDescription = function (d) { this.localDescription = d; this.iceGatheringState = 'complete'; return Promise.resolve(); };
FakePC.prototype.setRemoteDescription = function (d) {
  var sdp = d.sdp;
  if (mitm && d.type === 'answer') sdp = sdp.replace(/a=fingerprint:[^\r]+/, 'a=fingerprint:SHA-256 99:99:99');
  this.remoteDescription = { type: d.type, sdp: sdp };
  if (!/a=x-id:pc\d+/.test(sdp)) return Promise.reject(new Error('bad sdp'));
  if (d.type === 'answer') {
    var self = this, other = pcs[/a=x-id:(pc\d+)/.exec(sdp)[1]];
    var mine = self.dc, theirs = new FakeDC(other);
    mine.partner = theirs; theirs.partner = mine;
    setTimeout(function () {
      other.fire('datachannel', { channel: theirs });
      mine.readyState = 'open'; theirs.readyState = 'open';
      self.connectionState = 'connected'; other.connectionState = 'connected';
      mine.fire('open'); theirs.fire('open');
    }, 0);
  }
  return Promise.resolve();
};
FakePC.prototype.close = function () { this.connectionState = 'closed'; };

// ---- a stand-in page ----
function node(tag) {
  return { tagName: tag, style: {}, className: '', id: '', type: '', value: '', placeholder: '', readOnly: false, checked: false, _t: '', children: [], attrs: {}, on: {},
    get textContent() { return this._t + this.children.map(function (c) { return c.textContent; }).join(' '); },
    set textContent(v) { this._t = String(v); this.children = []; },
    get firstChild() { return this.children[0] || null; },
    appendChild: function (c) { this.children.push(c); return c; },
    removeChild: function (c) { this.children = this.children.filter(function (x) { return x !== c; }); return c; },
    setAttribute: function (k, v) { this.attrs[k] = String(v); },
    getAttribute: function (k) { return k in this.attrs ? this.attrs[k] : null; },
    focus: function () {},
    addEventListener: function (e, f) { this.on[e] = f; } };
}
function all(n, out) { out = out || []; out.push(n); n.children.forEach(function (c) { all(c, out); }); return out; }
function find(h, tag, label) { return all(h).filter(function (n) { return n.tagName === tag && (label == null || n.textContent === label); })[0]; }

function sandbox(models, opts) {
  opts = opts || {};
  var store = {}, clip = [], fetches = [], listeners = {};
  var head = node('head');
  var sb = {
    crypto: webcrypto, TextEncoder: TextEncoder, TextDecoder: TextDecoder, Uint8Array: Uint8Array, ArrayBuffer: ArrayBuffer, URL: URL,
    AbortController: AbortController, setTimeout: setTimeout, clearTimeout: clearTimeout,
    btoa: function (s) { return Buffer.from(s, 'binary').toString('base64'); },
    atob: function (s) { return Buffer.from(s, 'base64').toString('binary'); },
    localStorage: { getItem: function (k) { return k in store ? store[k] : null; }, setItem: function (k, v) { store[k] = String(v); } },
    document: { head: head, activeElement: null, createElement: node, getElementById: function (id) { return head.children.filter(function (c) { return c.id === id; })[0] || null; } },
    navigator: { deviceMemory: opts.mem || 8, hardwareConcurrency: 4, clipboard: { writeText: function (t) { clip.push(t); return Promise.resolve(); } } },
    RTCPeerConnection: FakePC,
    LocalMindProbe: {
      getRemembered: function () {
        if (store.fl_alpha_local_mind) return JSON.parse(store.fl_alpha_local_mind);
        return models ? { name: 'Ollama', url: opts.url || 'http://127.0.0.1:11434/api/tags', model: models[0], models: models } : null;
      },
      remember: function (e) { store.fl_alpha_local_mind = JSON.stringify(e); }
    },
    addEventListener: function (e, f) { (listeners[e] = listeners[e] || []).push(f); },
    dispatchEvent: function (ev) { (listeners[ev.type] || []).forEach(function (f) { f(ev); }); return true; },
    CustomEvent: function (type) { this.type = type; }
  };
  sb.fetch = function (url, o) {
    fetches.push({ url: url, body: JSON.parse(o.body) });
    if (sb.slow) {
      return new Promise(function (resolve, reject) {
        var done = function () { resolve({ ok: true, json: function () { return Promise.resolve({ message: { content: 'slow answer' } }); } }); };
        sb.slowQueue.push(done);
        if (o.signal) o.signal.addEventListener('abort', function () { reject(new Error('aborted')); });
      });
    }
    var q = JSON.parse(o.body).messages.slice(-1)[0].content;
    return Promise.resolve({ ok: true, json: function () { return Promise.resolve({ message: { content: 'From ' + (opts.who || 'helper') + ': ' + q.length + ' letters heard.\nTwo lines.' } }); } });
  };
  sb.slowQueue = [];
  sb.window = sb;
  vm.createContext(sb);
  vm.runInContext(kinSrc, sb);
  vm.runInContext(src, sb);
  if (opts.gpu) sb.navigator.gpu = { requestAdapter: function () { return Promise.resolve(opts.gpu === 'none' ? null : { features: { has: function (f) { return f === 'shader-f16' && opts.gpu === 'f16'; } } }); } };
  sb.libLoads = 0; sb.engines = []; sb.interrupts = 0;
  sb.TreeBrowserMindLoader = function (url) {
    sb.libLoads++; sb.libUrl = url;
    return { CreateMLCEngine: function (id, cfg) {
      cfg.initProgressCallback({ progress: 0.5, text: 'Fetching param cache' });
      cfg.initProgressCallback({ progress: 1, text: 'Finish loading' });
      var e = { id: id, asked: [], unloaded: false, interruptGenerate: function () { sb.interrupts++; if (e.hold) e.hold.reject(new Error('interrupted')); },
        unload: function () { e.unloaded = true; return Promise.resolve(); },
        chat: { completions: { create: function (req) {
          e.asked.push(req);
          if (sb.bmSlow) return new Promise(function (res, rej) { e.hold = { resolve: res, reject: rej }; });
          var q = req.messages.slice(-1)[0].content;
          return Promise.resolve({ choices: [{ message: { content: 'In-browser ' + id + ' heard ' + q.length + ' letters.' } }] });
        } } } };
      sb.engines.push(e);
      return Promise.resolve(e);
    }, deleteModelAllInfoInCache: function (id) { sb.deleted = id; return Promise.resolve(); } };
  };
  vm.runInContext(bmSrc, sb);
  var mem = opts.sharedKey || { v: null };
  sb.TreeKin.use({ store: { get: function () { return Promise.resolve(mem.v); }, put: function (v) { mem.v = v; return Promise.resolve(); }, lasting: true } });
  if (opts.names) store.tree_kin_names = JSON.stringify(opts.names);
  return { sb: sb, B: sb.TreeBrowserMind, P: sb.TreePool, K: sb.TreeKin, store: store, clip: clip, fetches: fetches, head: head, mem: mem };
}
function tick() { return new Promise(function (r) { setTimeout(r, 0); }); }

async function settle() { for (var i = 0; i < 30; i++) await tick(); }
async function connect(A, B, trustBoth) {
  var inv = await A.P.invite();
  var ri = await B.P.readInvite(inv.code);
  if (trustBoth && ri.card && ri.card.ok && !ri.card.trusted) B.P.trustCarried(ri.card);
  var j = await B.P.join(ri.sdp);
  var rr = await A.P.readReply(j.code);
  if (trustBoth && rr.card && rr.card.ok && !rr.card.trusted) A.P.trustCarried(rr.card);
  var f = await A.P.finish(rr.sdp);
  assert.ok(f.ok, 'finished');
  await settle();
  return { aId: inv.peerId, bId: j.peerId };
}
var SMALL = 'SmolLM2-360M-Instruct-q4f16_1-MLC', QWEN = 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC';
(async function () {
  // ---- The kind no-WebGPU path: nothing loads, the card points to the asking card and the pool ----
  var N = sandbox(null, { names: { ai: 'Ava', keeper: 'Ada' } });
  var hostN = node('div');
  N.B.mount(hostN);
  await settle();
  assert.strictEqual(N.B.state(), 'no-webgpu');
  assert.ok(/A mind with no install/.test(hostN.textContent), 'the card is there');
  assert.ok(hostN.textContent.indexOf(N.B.NO_GPU) !== -1, 'kind words with no WebGPU');
  assert.ok(/asking card/.test(N.B.NO_GPU) && /Device Pool/.test(N.B.NO_GPU) && /nothing was downloaded/.test(N.B.NO_GPU));
  assert.ok(!all(hostN).some(function (n) { return n.tagName === 'button'; }), 'no download button without WebGPU');
  var rN = await N.B.wake(SMALL, true);
  assert.strictEqual(rN.reason, 'no-webgpu');
  assert.strictEqual(N.sb.libLoads, 0, 'no engine code loaded without WebGPU');
  assert.strictEqual(N.fetches.length, 0);
  // An adapter that will not come is the same kind path.
  var N2 = sandbox(null, { gpu: 'none' });
  var hostN2 = node('div'); N2.B.mount(hostN2); await settle();
  assert.strictEqual(N2.B.state(), 'no-webgpu');

  // ---- With WebGPU: sizes and licenses first, nothing downloads until a human tap ----
  var K = sandbox(null, { gpu: 'f16', names: { ai: 'Kit', keeper: 'Kai' }, who: 'Kai' });
  var hostK = node('div');
  K.B.mount(hostK);
  await settle();
  assert.strictEqual(K.sb.libLoads, 0, 'mount loads nothing');
  var text = hostK.textContent;
  assert.ok(/SmolLM2-360M-Instruct-q4f16_1-MLC: about 210 MB to download once, needs about 0\.4 GB of graphics memory, Apache-2\.0/.test(text), 'size and license shown first');
  assert.ok(/Qwen2\.5-0\.5B-Instruct-q4f16_1-MLC: about 290 MB/.test(text) && /Qwen2\.5-1\.5B-Instruct-q4f16_1-MLC: about 880 MB/.test(text));
  assert.ok(/Llama-3\.2-1B-Instruct-q4f16_1-MLC: about 710 MB.*Llama 3\.2 Community License \(not an open source license/.test(text), 'the Llama license is named plainly');
  assert.ok(text.indexOf('huggingface.co') !== -1 && text.indexOf('raw.githubusercontent.com') !== -1 && /kept on this site/.test(text), 'where the files come from, said plainly');
  assert.ok(/never leave this device/.test(text));
  assert.strictEqual((await K.B.wake(SMALL)).reason, 'needs-tap', 'code cannot start a download');
  assert.strictEqual((await K.B.wake(SMALL, 'yes')).reason, 'needs-tap');
  assert.strictEqual(K.sb.libLoads, 0);
  all(hostK).filter(function (n) { return n.getAttribute('data-model') === SMALL; })[0].on.click();
  var go = all(hostK).filter(function (n) { return n.getAttribute('data-wake') === SMALL; })[0];
  assert.ok(go && go.textContent === 'Download about 210 MB and wake ' + SMALL, 'the tap names the size');
  var css = K.head.children.filter(function (c) { return c.id === 'tree-bmind-style'; })[0];
  assert.ok(/min-height:44px/.test(css.textContent) && /max-width:480px/.test(css.textContent) && /overflow-wrap:anywhere/.test(css.textContent), '44px buttons, phone layout, long ids wrap');
  go.on.click();
  await settle();
  assert.strictEqual(K.sb.libLoads, 1, 'one tap, one engine load');
  assert.strictEqual(K.sb.libUrl, 'lib/web-llm/web-llm-0.2.85.js');
  assert.strictEqual(K.sb.engines[0].id, SMALL);
  assert.strictEqual(K.B.state(), 'ready');
  assert.ok(/Awake: SmolLM2-360M-Instruct-q4f16_1-MLC, an in-browser mind/.test(hostK.textContent));
  assert.ok(JSON.parse(K.store.tree_browser_mind).model === SMALL, 'kept (the id only)');
  // A chip with no shader-f16 gets the f32 twin, same download.
  var F = sandbox(null, { gpu: 'f32' });
  await F.B.wake(SMALL, true);
  assert.strictEqual(F.sb.engines[0].id, 'SmolLM2-360M-Instruct-q4f32_1-MLC', 'f32 twin without shader-f16');

  // ---- Seated like a local mind; Chat sees in-browser mind ----
  assert.strictEqual(K.B.seat().reason, 'needs-tap');
  find(hostK, 'button', 'Seat it in Chat').on.click();
  var seatedEntry = JSON.parse(K.store.fl_alpha_local_mind);
  assert.strictEqual(seatedEntry.name, 'in-browser mind');
  assert.strictEqual(seatedEntry.url, 'inpage:webllm');
  assert.strictEqual(seatedEntry.model, SMALL);
  assert.ok(K.B.seated() && K.B.isEntry(seatedEntry));
  var t1 = await K.B.chat(SMALL, [{ role: 'system', content: 'be kind' }, { role: 'user', content: 'hello' }]);
  assert.strictEqual(t1, 'In-browser ' + SMALL + ' heard 5 letters.');
  assert.strictEqual(K.fetches.length, 0, 'Chat with the in-browser mind fetches nothing');
  // A seat with Ollama before it is kept aside, and can be given back.
  var O = sandbox(['llama3.2:latest'], { gpu: 'f16' });
  await O.B.wake(QWEN, true);
  assert.ok(O.B.seat(true).ok);
  assert.strictEqual(JSON.parse(O.store.tree_browser_mind_prior).url, 'http://127.0.0.1:11434/api/tags', 'the mind before it is kept, never dropped');
  assert.ok(O.B.giveBack(true).ok);
  assert.strictEqual(JSON.parse(O.store.fl_alpha_local_mind).model, 'llama3.2:latest', 'seat given back');

  // ---- The pool: the in-browser mind is lent through the same door ----
  var A = sandbox(['llama3.2:1b'], { names: { ai: 'Ava', keeper: 'Ada' }, who: 'Ada' });
  var c = await connect(A, K, true);
  assert.strictEqual(K.P.localDoor(SMALL).kind, 'in-page', 'the awake in-browser mind is an in-page door');
  assert.strictEqual(K.P.localDoor(SMALL).url, '', 'no address at all');
  assert.ok(K.P.localModels().indexOf(SMALL) !== -1);
  var r0 = await A.P.ask(c.aId, SMALL, 'hi?');
  assert.strictEqual(r0.reason, 'off', 'door off: nothing asked');
  assert.strictEqual(K.sb.engines[0].asked.length, 1, 'only the Chat question so far');
  K.P.letHelp();
  await settle();
  var pa = A.P.peers().filter(function (p) { return p.id === c.aId; })[0];
  assert.ok(pa.helping && pa.models.indexOf(SMALL) !== -1, 'hello carries the in-browser model');
  var hostA = node('div'); A.P.mount(hostA); await settle();
  assert.ok(/Ask SmolLM2-360M-Instruct-q4f16_1-MLC \(in-browser mind\) on this device/.test(hostA.textContent), 'hello card shows in-browser mind');
  var r1 = await A.P.ask(c.aId, SMALL, 'What is a fractal?');
  assert.ok(r1.ok && r1.text === 'In-browser ' + SMALL + ' heard 18 letters.', 'answered by the in-browser mind, whole');
  assert.strictEqual(K.fetches.length, 0, 'the pool fetched nothing for it');
  assert.strictEqual(A.fetches.length, 0);
  assert.ok(Number(K.P.counts().answered) >= 1 && !/fractal/.test(K.store.tree_pool_counts) && !/fractal/.test(K.store.tree_browser_mind_counts), 'counts only');
  // Pause wins: a running in-browser answer is interrupted.
  K.sb.bmSlow = true;
  var pr = A.P.ask(c.aId, SMALL, 'a long one');
  await settle();
  assert.strictEqual(K.P.liveCount(), 1);
  K.P.pause();
  var r2 = await pr;
  assert.ok(!r2.ok && r2.reason === 'paused', 'pause wins');
  assert.ok(K.sb.interrupts >= 1, 'the engine was interrupted');
  K.sb.bmSlow = false;
  var r3 = await A.P.ask(c.aId, SMALL, 'now?');
  assert.ok(!r3.ok, 'nothing answered while paused');
  K.P.setMode('kin', 'human');
  // Asleep: the seat stays, the pool says so plainly; no fetch is tried.
  K.B.sleep();
  await settle();
  assert.strictEqual(K.P.localDoor(SMALL).reason, 'browser-mind-asleep');
  assert.ok(/in-browser mind is asleep/.test(K.P.reasonWords({ reason: 'browser-mind-asleep' })));
  await assert.rejects(K.B.chat(SMALL, [{ role: 'user', content: 'x' }]), function (e) { return e.reason === 'browser-mind-asleep'; });
  assert.strictEqual(K.fetches.length, 0);
  // Ollama stays loopback-only alongside it.
  var M = sandbox(['qwen2.5:14b'], { gpu: 'f16' });
  await M.B.wake(QWEN, true);
  assert.strictEqual(M.P.localDoor('qwen2.5:14b').url, 'http://127.0.0.1:11434/api/chat', 'Ollama door unchanged');
  assert.strictEqual(M.P.localDoor(QWEN).kind, 'in-page');
  var X = sandbox(['qwen2.5:14b'], { url: 'http://192.168.1.5:11434/api/tags' });
  assert.strictEqual(X.P.localDoor('qwen2.5:14b').reason, 'no-local-mind', 'a LAN address is still refused');
  // Removing its files takes a tap.
  assert.strictEqual((await K.B.removeFiles(SMALL)).reason, 'needs-tap');
  assert.ok((await K.B.removeFiles(SMALL, true)).ok && K.sb.deleted === SMALL);

  console.log('SMOKE_OK tree no install mind v0.1');
  process.exit(0); // stand-in timers (5 minute answer guards) would otherwise hold node open
})().catch(function (e) { console.error(e); process.exit(1); });
