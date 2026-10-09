// Node test for Tree Pool v0.1 (v-tree-pool-v0.1): the Device Pool and its share door on theLatticeTree.
// Two (and more) stand-in Trees, each with Trusted kin (017) and the pool, joined by a stand-in WebRTC.
// The door starts off, only a human opens it, pause wins (and stops running questions), only proved
// trusted kin reach the local AI, limits like FreeLattice, counts-only receipts, no network until a tap.
var fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
var webcrypto = require('crypto').webcrypto;
var kinSrc = fs.readFileSync(path.join(__dirname, 'tree-kin.js'), 'utf8');
var src = fs.readFileSync(path.join(__dirname, 'tree-pool.js'), 'utf8');
assert.ok(src.indexOf('v-tree-pool-v0.1') !== -1, 'marker');
assert.ok(!/\u2014/.test(src) && !/&mdash;/.test(src), 'no em dash');
assert.ok(!/\.innerHTML/.test(src), 'textContent only');
assert.ok(!/confirm\(/.test(src) && !/alert\(/.test(src) && !/[^.\w]prompt\(/.test(src), 'no dialog boxes');
assert.ok(!/quiet room/i.test(src), 'no Quiet Room words');
assert.ok(/new root\.RTCPeerConnection\(\{ iceServers: \[\] \}\)/.test(src), 'no outside server: empty iceServers');
assert.ok(!/['"](stun|turns?):|XMLHttpRequest|WebSocket|sendBeacon|EventSource|(^|[^\w])Peer\(/i.test(src), 'no other network path');
assert.strictEqual((src.match(/root\.fetch\(/g) || []).length, 1, 'one fetch, to this computer\'s own local AI');
assert.ok(!/AGPL/.test(src), 'nothing AGPL');
assert.ok(kinSrc.indexOf('tree-kin-changed') !== -1 && kinSrc.indexOf('before v-tree-pool-v0.1') !== -1, 'kin layer kept, event added');

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
  return { tagName: tag, className: '', id: '', type: '', value: '', placeholder: '', readOnly: false, checked: false, _t: '', children: [], attrs: {}, on: {},
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
    LocalMindProbe: { getRemembered: function () { return models ? { name: 'Ollama', url: opts.url || 'http://127.0.0.1:11434/api/tags', model: models[0], models: models } : null; } },
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
  var mem = opts.sharedKey || { v: null };
  sb.TreeKin.use({ store: { get: function () { return Promise.resolve(mem.v); }, put: function (v) { mem.v = v; return Promise.resolve(); }, lasting: true } });
  if (opts.names) store.tree_kin_names = JSON.stringify(opts.names);
  return { sb: sb, P: sb.TreePool, K: sb.TreeKin, store: store, clip: clip, fetches: fetches, head: head, mem: mem };
}
function tick() { return new Promise(function (r) { setTimeout(r, 0); }); }
async function settle() { for (var i = 0; i < 30; i++) await tick(); }
async function connect(A, B, trustBoth) {
  var inv = await A.P.invite();
  assert.ok(inv.ok && inv.code.indexOf('TREEPOOL1:') === 0, 'invite made after a tap');
  var ri = await B.P.readInvite('  ' + inv.code + '\n');
  assert.ok(ri.ok, 'invite read');
  if (trustBoth && ri.card && ri.card.ok && !ri.card.trusted) B.P.trustCarried(ri.card);
  var j = await B.P.join(ri.sdp);
  assert.ok(j.ok && j.code.indexOf('TREEPOOL1:') === 0, 'reply made');
  var rr = await A.P.readReply(j.code);
  assert.ok(rr.ok, 'reply read');
  if (trustBoth && rr.card && rr.card.ok && !rr.card.trusted) A.P.trustCarried(rr.card);
  var f = await A.P.finish(rr.sdp);
  assert.ok(f.ok, 'finished');
  await settle();
  return { ri: ri, rr: rr, aId: inv.peerId, bId: j.peerId };
}
(async function () {
  // ---- Mounting sends nothing, makes nothing ----
  var A = sandbox(['llama3.2:3b'], { names: { ai: 'Lumen', keeper: 'Ann' }, who: 'Ann', mem: 16 });
  var B = sandbox(['qwen2.5:7b', 'phi4'], { names: { ai: 'Wren', keeper: 'Ben' }, who: 'Ben' });
  var hostA = node('div');
  A.P.mount(hostA);
  await settle();
  assert.strictEqual(rtcMade, 0, 'mount makes no connection');
  assert.strictEqual(A.K.identity(), null, 'mount makes no key');
  assert.strictEqual(A.fetches.length, 0, 'mount calls no AI');
  assert.strictEqual(A.P.mode(), 'off', 'the door starts off');
  assert.ok(/^Off\. This computer's AI answers no one else until you tap Let this device help\.$/.test(A.P.doorLine()));
  assert.ok(/Device Pool/.test(hostA.textContent) && /Memory is not joined across machines/.test(hostA.textContent), 'honest line on the card');
  assert.ok(/Later \(019\)/.test(hostA.textContent) && /llama\.cpp, MIT/.test(hostA.textContent), 'what waits for 019 is named');
  assert.ok(/Limits: 2 questions at a time, each up to 16000 characters/.test(hostA.textContent), 'limits in words');
  assert.ok(/Receipts keep counts only/.test(hostA.textContent));
  assert.ok(/Whose AI/.test(hostA.textContent) && /Hellos go to connected trusted kin only/.test(hostA.textContent) && /Power:/.test(hostA.textContent));
  var css = A.head.children.filter(function (c) { return c.id === 'treePoolStyle'; });
  assert.strictEqual(css.length, 1, 'one style tag');
  assert.ok(/min-height:44px/.test(css[0].textContent) && /max-width:480px/.test(css[0].textContent), '44px targets, phone layout');

  // ---- The door: only a human opens it; pause wins ----
  assert.strictEqual(A.P.setMode('kin', 'mind'), false, 'a mind cannot open the door');
  assert.strictEqual(A.P.setMode('kin'), false, 'code cannot open the door');
  assert.strictEqual(A.P.setMode('open', 'human'), false, 'no wider door on the Tree');
  assert.strictEqual(A.P.mode(), 'off');
  find(hostA, 'button', 'Let this device help').on.click();
  assert.strictEqual(A.P.mode(), 'kin');
  assert.ok(/Helping, but you have no trusted kin yet, so no one can ask/.test(hostA.textContent), 'kin with no kin says so');
  find(hostA, 'button', 'Pause helping').on.click();
  assert.strictEqual(A.P.mode(), 'pause');
  assert.ok(/Paused\. No one can ask this computer's AI until you tap Resume for trusted kin\./.test(hostA.textContent), 'paused says so');
  assert.ok(!find(hostA, 'button', 'Let this device help'), 'no plain help button while paused');
  assert.strictEqual(A.P.setMode('kin', 'mind'), false, 'nothing but a human leaves pause');
  assert.strictEqual(A.P.mode(), 'pause');
  find(hostA, 'button', 'Resume for trusted kin').on.click();
  assert.strictEqual(A.P.mode(), 'kin');
  find(hostA, 'button', 'Turn off').on.click();
  assert.strictEqual(A.P.mode(), 'off');
  var pw = find(hostA, 'input');
  pw.checked = true; pw.on.change();
  assert.ok(A.P.pluggedOnly() && A.store.tree_pool_plugged_only === 'true', 'plugged-in only kept');
  pw = find(hostA, 'input'); pw.checked = false; pw.on.change();
  assert.strictEqual(rtcMade, 0, 'door taps open no connection');

  // ---- Invite and reply carry kin cards; one invite and one reply make two devices kin and connected ----
  var c1 = await connect(A, B, true);
  assert.ok(c1.ri.card && c1.ri.card.ok && c1.ri.card.body.name === 'Lumen', 'invite carried Ann\'s card, checked by Trusted kin');
  assert.ok(c1.rr.card && c1.rr.card.ok && c1.rr.card.body.name === 'Wren', 'reply carried Ben\'s card');
  assert.strictEqual(A.K.kinCount(), 1); assert.strictEqual(B.K.kinCount(), 1);
  var pa = A.P.peers().filter(function (p) { return p.id === c1.aId; })[0];
  var pb = B.P.peers().filter(function (p) { return p.id === c1.bId; })[0];
  assert.ok(pa.proved && pa.kin && pb.proved && pb.kin, 'both keys proved on this connection, both kin');
  assert.ok(!pa.helping, 'B is not helping yet (door off), and says so');
  assert.ok(/Connected now: 1 device, 1 of them trusted kin\./.test(hostA.textContent));
  assert.ok(/Ben's computer \(Wren\)/.test(hostA.textContent) && /not helping right now/.test(hostA.textContent), 'named from the pass; truth about B');

  // Asking a device that is not helping sends nothing.
  var r0 = await A.P.ask(c1.aId, 'qwen2.5:7b', 'hello?');
  assert.strictEqual(r0.reason, 'off');
  assert.strictEqual(B.fetches.length, 0, 'B\'s AI never called while off');

  // B helps: a hello arrives with model names; A asks; B's own loopback AI answers.
  B.P.letHelp();
  await settle();
  pa = A.P.peers().filter(function (p) { return p.id === c1.aId; })[0];
  assert.ok(pa.helping && pa.models.join(',') === 'qwen2.5:7b,phi4', 'hello: model names while helping');
  var r1 = await A.P.ask(c1.aId, 'qwen2.5:7b', 'What is a fractal?');
  assert.ok(r1.ok && /^From Ben: 18 letters heard\.\nTwo lines\.$/.test(r1.text), 'answered by B\'s own AI, whole');
  assert.strictEqual(B.fetches.length, 1);
  assert.strictEqual(B.fetches[0].url, 'http://127.0.0.1:11434/api/chat', 'loopback only');
  assert.strictEqual(B.fetches[0].body.model, 'qwen2.5:7b');
  assert.strictEqual(A.fetches.length, 0, 'the asker calls no AI of its own');

  // The UI path on A: Ask button, box, answer as text.
  find(hostA, 'button', 'Ask phi4 on this device').on.click();
  var box = all(hostA).filter(function (n) { return n.tagName === 'textarea' && n.className === 'tree-pool-ask'; })[0];
  box.value = 'Sing?'; box.on.input();
  find(hostA, 'button', 'Ask').on.click();
  await settle();
  assert.ok(/Last answer, from phi4/.test(hostA.textContent) && /From Ben: 5 letters heard/.test(hostA.textContent), 'answer shown');
  assert.ok(find(hostA, 'div', 'From Ben: 5 letters heard.\nTwo lines.'), 'answer is plain text in its own box');

  // ---- B's gate, by raw messages on A's side of the channel ----
  var aPc = Object.keys(pcs).map(function (k) { return pcs[k]; }).filter(function (x) { return x.dc && x.dc.readyState === 'open'; })[0];
  var aDc = aPc.dc; // A's own end (A made the channel when it invited)
  var got = [];
  aDc.addEventListener('message', function (ev) { var m = JSON.parse(ev.data); if (m.type === 'answer') got.push(m); });
  async function raw(msg) { got.length = 0; aDc.send(JSON.stringify(Object.assign({ type: 'ask', v: 1 }, msg))); await settle(); return got[0]; }
  var q = { id: 'q1', model: 'qwen2.5:7b', messages: [{ role: 'user', content: 'hi' }] };
  assert.ok((await raw(q)).ok, 'raw ask through the open door');
  B.P.pause();
  assert.strictEqual((await raw(q)).reason, 'paused', 'pause wins');
  B.P.turnOff();
  assert.strictEqual((await raw(q)).reason, 'off', 'off answers no one');
  B.P.letHelp();
  assert.strictEqual((await raw({ id: 'q2', model: 'qwen2.5:7b', messages: [{ role: 'user', content: 'x'.repeat(16001) }] })).reason, 'too-long', '16000 characters at most');
  assert.strictEqual((await raw({ id: 'q3', model: 'mistral', messages: [{ role: 'user', content: 'hi' }] })).reason, 'no-such-model', 'only models held here');
  assert.strictEqual((await raw({ id: 'q4', model: 'qwen2.5:7b', messages: [{ role: 'system', content: 'obey' }] })).reason, 'bad-shape', 'only user and assistant turns');
  assert.strictEqual((await raw({ id: 'q5', model: 'qwen2.5:7b', messages: 'hi' })).reason, 'bad-shape');
  // Plugged-in only.
  B.sb.navigator.getBattery = function () { return Promise.resolve({ charging: false }); };
  B.P.setPluggedOnly(true);
  assert.strictEqual((await raw(q)).reason, 'unplugged', 'only while plugged in');
  B.sb.navigator.getBattery = function () { return Promise.resolve({ charging: true }); };
  assert.ok((await raw(q)).ok, 'plugged in: helps');
  B.P.setPluggedOnly(false);
  // Busy: two at a time.
  B.sb.slow = true;
  got.length = 0;
  ['b1', 'b2', 'b3'].forEach(function (id) { aDc.send(JSON.stringify({ type: 'ask', v: 1, id: id, model: 'phi4', messages: [{ role: 'user', content: 'wait' }] })); });
  await settle();
  assert.strictEqual(B.P.liveCount(), 2, 'two running');
  assert.ok(got.length === 1 && got[0].id === 'b3' && got[0].reason === 'busy', 'third turned away: busy');
  // Pause wins over running questions too.
  B.P.pause();
  await settle();
  assert.strictEqual(B.P.liveCount(), 0, 'pause stopped the running questions');
  var paused = got.filter(function (m) { return m.reason === 'paused'; }).map(function (m) { return m.id; }).sort().join(',');
  assert.strictEqual(paused, 'b1,b2', 'each running question told: paused');
  B.sb.slowQueue.forEach(function (f) { f(); });
  await settle();
  assert.ok(!got.some(function (m) { return m.ok; }), 'no answer slips out after pause');
  B.sb.slow = false;
  B.P.letHelp();
  await settle();
  // A question in flight when the channel closes is answered at once with no-answer (no five-minute wait).
  B.sb.slow = true;
  var pendingAsk = A.P.ask(c1.aId, 'phi4', 'hold on');
  await settle();
  var cutPc = aPc; var savedDc = cutPc.dc;
  savedDc.fire('close');
  var cut = await pendingAsk;
  assert.strictEqual(cut.reason, 'no-answer', 'closed channel ends the wait');
  B.sb.slow = false;
  B.sb.slowQueue.forEach(function (f) { f(); }); B.sb.slowQueue.length = 0;
  await settle();
  // Stop trusting takes effect on the next question.
  var bPass = Object.keys(B.K.passes())[0];
  B.K.revoke(bPass);
  await settle();
  assert.strictEqual((await raw(q)).reason, 'not-kin', 'stopped kin are turned away at once');
  B.K.grant(bPass, B.K.passes()[bPass]);
  await settle();
  assert.ok((await raw(q)).ok, 'trusted again');

  // ---- A proved device that is not kin gets nothing ----
  var C = sandbox(['gemma3'], { names: { ai: 'Fern', keeper: 'Cy' }, who: 'Cy' });
  var fetchesBefore = B.fetches.length;
  var c2 = await connect(C, B, false);
  var pc2 = C.P.peers().filter(function (p) { return p.id === c2.aId; })[0];
  assert.ok(pc2.proved && !pc2.kin && !pc2.helping, 'C: key proved, not kin, no hello taken');
  assert.strictEqual((await C.P.ask(c2.aId, 'phi4', 'hi')).reason, 'not-kin-here', 'nothing sent to a device you do not trust');
  var cPc = pcs[Object.keys(pcs).slice(-2)[0]];
  var cDc = cPc.dc;
  var cGot = [];
  cDc.addEventListener('message', function (ev) { var m = JSON.parse(ev.data); cGot.push(m); });
  cDc.send(JSON.stringify({ type: 'ask', v: 1, id: 'c1', model: 'phi4', messages: [{ role: 'user', content: 'hi' }] }));
  await settle();
  assert.ok(cGot.some(function (m) { return m.type === 'answer' && m.reason === 'not-kin'; }), 'B turns away a proved stranger');
  assert.ok(!cGot.some(function (m) { return m.type === 'hello'; }), 'no hello to a stranger');
  assert.strictEqual(B.fetches.length, fetchesBefore, 'B\'s AI never called for a stranger');

  // ---- A connection whose fingerprints were swapped on the way is set aside ----
  var D = sandbox(['gemma3'], { names: { ai: 'Moss', keeper: 'Di' } });
  mitm = true;
  var c3 = await connect(D, B, true);
  mitm = false;
  var d3 = D.P.peers().filter(function (p) { return p.id === c3.aId; })[0];
  var b3 = B.P.peers().filter(function (p) { return p.id === c3.bId; })[0];
  assert.ok(!d3.proved && !b3.proved, 'binding broken: neither side counts it proved');
  assert.ok(b3.state === 'set-aside' || d3.state === 'set-aside', 'binding broken: set aside');
  // A borrowed ID in the hello on the channel is set aside.
  var E = sandbox(['gemma3'], { names: { ai: 'Ivy', keeper: 'Ed' } });
  tamper = function (data) { var m = JSON.parse(data); if (m.type === 'hi' && m.meshId) { m.meshId = 'mesh:' + 'A'.repeat(18); return JSON.stringify(m); } return data; };
  var c4 = await connect(E, B, true);
  tamper = null;
  assert.ok(!E.P.peers().some(function (p) { return p.id === c4.aId && p.proved; }) && !B.P.peers().some(function (p) { return p.id === c4.bId && p.proved; }), 'borrowed ID: not proved');
  // The same key on both ends (one browser, two tabs) is set aside.
  var shared = { v: null };
  var S1 = sandbox(['gemma3'], { names: { ai: 'One', keeper: 'Sam' }, sharedKey: shared });
  var S2 = sandbox(['gemma3'], { names: { ai: 'One', keeper: 'Sam' }, sharedKey: shared });
  var c5 = await connect(S1, S2, false);
  assert.strictEqual(S1.P.peers().filter(function (p) { return p.id === c5.aId; })[0].state, 'set-aside', 'own key: set aside');

  // ---- Fail-closed: no local mind, a remote url, codes that are not codes ----
  var N = sandbox(null, {});
  assert.strictEqual(N.P.localDoor('x').reason, 'no-local-mind');
  var R = sandbox(['m'], { url: 'http://192.168.1.9:11434/api/tags' });
  assert.strictEqual(R.P.localDoor('m').reason, 'no-local-mind', 'only this computer\'s own loopback AI');
  assert.strictEqual((await B.P.readInvite('hello')).reason, 'not-an-invite');
  assert.strictEqual((await B.P.readInvite('TREEPOOL1:' + 'x'.repeat(17000))).reason, 'not-an-invite', 'oversized refused');
  assert.strictEqual((await N.P.readReply('TREEPOOL1:abc')).reason, 'not-a-reply');

  // ---- Invite by taps ----
  var hostB = node('div');
  var F = sandbox(['phi4'], { names: { ai: 'Kit', keeper: 'Flo' } });
  F.P.mount(hostB);
  find(hostB, 'button', 'Invite a device').on.click();
  await settle();
  var ta = all(hostB).filter(function (n) { return n.tagName === 'textarea' && n.readOnly; })[0];
  assert.ok(ta && ta.value.indexOf('TREEPOOL1:') === 0, 'invite shown to copy');
  find(hostB, 'button', 'Copy invite').on.click();
  await settle();
  assert.strictEqual(F.clip[0], ta.value, 'copied on tap');
  find(hostB, 'button', 'Cancel').on.click();
  find(hostB, 'button', 'Join with an invite').on.click();
  var paste = all(hostB).filter(function (n) { return n.tagName === 'textarea' && !n.readOnly; })[0];
  paste.value = ta.value; paste.on.input();
  find(hostB, 'button', 'Join').on.click();
  await settle();
  assert.ok(/That is your own invite/.test(hostB.textContent), 'own invite caught');

  // ---- Counts only ----
  [A, B, C].forEach(function (T) {
    var cnt = JSON.parse(T.store.tree_pool_counts || '{}');
    Object.keys(cnt).forEach(function (k) { assert.strictEqual(typeof cnt[k], 'number', 'counts only: ' + k); });
    assert.ok(!/Lumen|Wren|Ann|Ben|mesh:|TREE|fractal|qwen/.test(T.store.tree_pool_counts || ''), 'no names, ids, codes, words or models in receipts');
  });
  var cb = JSON.parse(B.store.tree_pool_counts);
  assert.ok(cb.answered >= 4 && cb.turnedAway >= 8 && cb.proved >= 2 && cb.helpOn >= 1 && cb.paused >= 2, 'counts add up');
  assert.ok(Object.keys(B.store).every(function (k) { return /^tree_(kin|pool)_/.test(k); }), 'only tree_kin_ and tree_pool_ keys written');

  console.log('OK tree pool v0.1');
  console.log('SMOKE_OK tree pool v0.1');
  process.exit(0);
})().catch(function (e) { console.error(e); process.exit(1); });
