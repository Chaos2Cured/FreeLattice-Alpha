// Node test for Tree Pool room v0.2 (v-tree-pool-room-v0.2, 019a): one room, many devices, no server.
// Stand-in WebRTC (as in tree-pool.test.js) joins several stand-in Trees. A host starts a room; two devices
// join it once each; a third is let in by a neighbor; the room connects everyone to everyone over proved
// connections. Then: trust the room in one tap, ask the freest trusted device, Chat through the pool,
// an asking card for a device with no mind, picture codes, an invite that came with a link, the camera
// reading a reply, a reload that remembers the room, and the locks.
var fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
var webcrypto = require('crypto').webcrypto;
var kinSrc = fs.readFileSync(path.join(__dirname, 'tree-kin.js'), 'utf8');
var src = fs.readFileSync(path.join(__dirname, 'tree-pool.js'), 'utf8');
var qrSrc = fs.readFileSync(path.join(__dirname, '..', 'lib', 'qrcodegen.js'), 'utf8');
var threadSrc = fs.readFileSync(path.join(__dirname, 'garden-thread.js'), 'utf8');

// ---- locks, read from the files ----
assert.ok(src.indexOf('v-tree-pool-room-v0.2') !== -1 && src.indexOf('v-tree-pool-v0.1') !== -1, 'new marker, old marker kept');
assert.ok(src.indexOf("before v-tree-pool-room-v0.2: var VERSION = 'v-tree-pool-v0.1';") !== -1, 'layered, not deleted');
[src, kinSrc, qrSrc].forEach(function (s) {
  assert.ok(!/\u2014/.test(s) && !/&mdash;/.test(s), 'no em dash');
  assert.ok(!/\.innerHTML/.test(s), 'textContent only');
  assert.ok(!/confirm\(/.test(s) && !/alert\(/.test(s), 'no dialog boxes');
  assert.ok(!/quiet room/i.test(s), 'no Quiet Room words');
  assert.ok(!/AGPL/.test(s), 'nothing AGPL');
});
assert.ok(/MIT License/.test(qrSrc) && /Project Nayuki/.test(qrSrc), 'vendored QR encoder keeps its MIT notice');
assert.ok(!/fetch\(|XMLHttpRequest|WebSocket|sendBeacon|importScripts/.test(qrSrc), 'the QR encoder has no network path');
assert.strictEqual((src.match(/new root\.RTCPeerConnection\(/g) || []).length, 1, 'one place makes connections');
assert.ok(/new root\.RTCPeerConnection\(\{ iceServers: \[\] \}\)/.test(src), 'still no STUN or TURN');
assert.ok(!/['"](stun|turns?):|XMLHttpRequest|WebSocket|sendBeacon|EventSource|(^|[^\w])Peer\(/i.test(src), 'no other network path');
assert.strictEqual((src.match(/root\.fetch\(/g) || []).length, 1, 'still one fetch, to this computer\'s own loopback AI');
var threadAdd = threadSrc.slice(threadSrc.indexOf('v-tree-pool-room-v0.2: the route'), threadSrc.indexOf('function speakHonest'));
assert.ok(threadAdd.length > 100 && !/\u2014|innerHTML|confirm\(/.test(threadAdd), 'Chat layer: no em dash, no innerHTML');
assert.ok(/before v-tree-pool-room-v0.2: setComposeOpen\(!!mind\);/.test(threadSrc), 'Chat layer keeps the old line');
assert.ok(/asks only, no local mind/.test(kinSrc) && /function makeCard\(aiName, keeperName\)/.test(kinSrc), 'asking card added; makeCard unchanged');

// ---- a stand-in WebRTC ----
var pcs = {}, pcN = 0, rtcMade = 0;
function Emitter() { this._on = {}; }
Emitter.prototype.addEventListener = function (e, f) { (this._on[e] = this._on[e] || []).push(f); };
Emitter.prototype.fire = function (e, ev) { (this._on[e] || []).forEach(function (f) { f(ev || {}); }); };
function FakeDC(owner) { Emitter.call(this); this.readyState = 'connecting'; this.partner = null; this.owner = owner; }
FakeDC.prototype = Object.create(Emitter.prototype);
FakeDC.prototype.send = function (data) { var t = this.partner; setTimeout(function () { if (t && t.readyState === 'open') t.fire('message', { data: data }); }, 0); };
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
  this.localDescription = null; this.remoteDescription = null; this.iceGatheringState = 'new'; this.connectionState = 'new'; this.dc = null;
}
FakePC.prototype = Object.create(Emitter.prototype);
FakePC.prototype.createDataChannel = function () { this.dc = new FakeDC(this); return this.dc; };
FakePC.prototype._sdp = function (type) { return 'v=0\r\no=- ' + this.id + '\r\na=x-id:' + this.id + '\r\na=fingerprint:' + this.fp + '\r\na=type:' + type + '\r\n'; };
FakePC.prototype.createOffer = function () { return Promise.resolve({ type: 'offer', sdp: this._sdp('offer') }); };
FakePC.prototype.createAnswer = function () { return Promise.resolve({ type: 'answer', sdp: this._sdp('answer') }); };
FakePC.prototype.setLocalDescription = function (d) { this.localDescription = d; this.iceGatheringState = 'complete'; return Promise.resolve(); };
FakePC.prototype.setRemoteDescription = function (d) {
  if (this.remoteDescription) return Promise.reject(new Error('already set'));
  this.remoteDescription = { type: d.type, sdp: d.sdp };
  if (!/a=x-id:pc\d+/.test(d.sdp)) return Promise.reject(new Error('bad sdp'));
  if (d.type === 'answer') {
    var self = this, other = pcs[/a=x-id:(pc\d+)/.exec(d.sdp)[1]];
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
var painted = 0;
function node(tag) {
  var n = { tagName: tag, className: '', id: '', type: '', value: '', placeholder: '', readOnly: false, checked: false, hidden: false, _t: '', children: [], attrs: {}, on: {}, parentNode: null,
    get textContent() { return this._t + this.children.map(function (c) { return c.textContent; }).join(' '); },
    set textContent(v) { this._t = String(v); this.children = []; },
    get firstChild() { return this.children[0] || null; },
    appendChild: function (c) { this.children.push(c); c.parentNode = this; return c; },
    removeChild: function (c) { this.children = this.children.filter(function (x) { return x !== c; }); c.parentNode = null; return c; },
    setAttribute: function (k, v) { this.attrs[k] = String(v); },
    getAttribute: function (k) { return k in this.attrs ? this.attrs[k] : null; },
    focus: function () {},
    click: function () { if (this.on.click) this.on.click(); },
    addEventListener: function (e, f) { this.on[e] = f; } };
  if (tag === 'canvas') n.getContext = function () { return { fillRect: function () { painted++; }, fillStyle: '' }; };
  return n;
}
function all(n, out) { out = out || []; out.push(n); n.children.forEach(function (c) { all(c, out); }); return out; }
function find(h, tag, label) { return all(h).filter(function (n) { return n.tagName === tag && (label == null || n.textContent === label); })[0]; }
function findRe(h, tag, re) { return all(h).filter(function (n) { return n.tagName === tag && re.test(n.textContent); })[0]; }
function codeShown(h) { var t = all(h).filter(function (n) { return n.tagName === 'textarea' && n.readOnly; }).pop(); return t ? t.value : ''; }
function pasteInto(h, text) { var t = all(h).filter(function (n) { return n.tagName === 'textarea' && !n.readOnly && /tree-pool-code/.test(n.className); })[0]; t.value = text; t.on.input(); return t; }

function sandbox(models, opts) {
  opts = opts || {};
  var store = opts.store || {}, fetches = [], listeners = {}, replaced = [];
  var head = node('head');
  var sb = {
    crypto: webcrypto, TextEncoder: TextEncoder, TextDecoder: TextDecoder, Uint8Array: Uint8Array, ArrayBuffer: ArrayBuffer, URL: URL,
    AbortController: AbortController, setTimeout: setTimeout, clearTimeout: clearTimeout, setInterval: setInterval, clearInterval: clearInterval,
    btoa: function (s) { return Buffer.from(s, 'binary').toString('base64'); },
    atob: function (s) { return Buffer.from(s, 'base64').toString('binary'); },
    localStorage: { getItem: function (k) { return k in store ? store[k] : null; }, setItem: function (k, v) { store[k] = String(v); } },
    document: { head: head, activeElement: null, createElement: node, getElementById: function (id) { return head.children.filter(function (c) { return c.id === id; })[0] || null; } },
    navigator: { deviceMemory: opts.mem || 8, hardwareConcurrency: 4, clipboard: { writeText: function () { return Promise.resolve(); } } },
    RTCPeerConnection: FakePC,
    LocalMindProbe: { getRemembered: function () { return models ? { name: 'Ollama', url: 'http://127.0.0.1:11434/api/tags', model: models[0], models: models } : null; } },
    addEventListener: function (e, f) { (listeners[e] = listeners[e] || []).push(f); },
    dispatchEvent: function (ev) { (listeners[ev.type] || []).forEach(function (f) { f(ev); }); return true; },
    CustomEvent: function (type) { this.type = type; },
    location: opts.location || { protocol: 'https:', href: 'https://thelatticetree.com/index.html', hash: '', pathname: '/index.html', search: '' },
    history: { replaceState: function (a, b, url) { replaced.push(url); } }
  };
  if (opts.scan) {
    sb.BarcodeDetector = function () { this.detect = function () { return Promise.resolve(opts.scan.value ? [{ rawValue: opts.scan.value }] : []); }; };
    sb.navigator.mediaDevices = { getUserMedia: function () { opts.scan.opened = (opts.scan.opened || 0) + 1; return Promise.resolve({ getTracks: function () { return [{ stop: function () { opts.scan.stopped = (opts.scan.stopped || 0) + 1; } }]; } }); } };
  }
  sb.fetch = function (url, o) {
    fetches.push({ url: url, body: JSON.parse(o.body) });
    if (sb.slow) {
      return new Promise(function (resolve, reject) {
        sb.slowQueue.push(function () { resolve({ ok: true, json: function () { return Promise.resolve({ message: { content: 'slow answer' } }); } }); });
        if (o.signal) o.signal.addEventListener('abort', function () { reject(new Error('aborted')); });
      });
    }
    var b = JSON.parse(o.body);
    return Promise.resolve({ ok: true, json: function () { return Promise.resolve({ message: { content: 'From ' + (opts.who || 'helper') + ' (' + b.messages.length + ' turns)' } }); } });
  };
  sb.slowQueue = [];
  sb.window = sb;
  vm.createContext(sb);
  vm.runInContext(qrSrc, sb);
  vm.runInContext(kinSrc, sb);
  vm.runInContext(src, sb);
  var mem = { v: null };
  sb.TreeKin.use({ store: { get: function () { return Promise.resolve(mem.v); }, put: function (v) { mem.v = v; return Promise.resolve(); }, lasting: true } });
  if (opts.names) store.tree_kin_names = JSON.stringify(opts.names);
  var host = node('div');
  sb.TreePool.mount(host);
  return { sb: sb, P: sb.TreePool, K: sb.TreeKin, store: store, fetches: fetches, host: host, replaced: replaced, listeners: listeners };
}
function tick() { return new Promise(function (r) { setTimeout(r, 0); }); }
async function settle(n) { for (var i = 0; i < (n || 60); i++) await tick(); }
function proved(T) { return T.P.peers().filter(function (p) { return p.proved && p.state === 'proved'; }); }

// One join by taps: the inviter's screen shows an invite; the joiner pastes it, trusts, joins; the inviter takes the reply.
async function joinByTaps(inviter, joiner, trust) {
  var code = codeShown(inviter.host);
  assert.ok(code.indexOf('TREEPOOL1:') === 0, 'an invite is on the inviter\'s screen');
  find(joiner.host, 'button', 'Join with an invite').click();
  pasteInto(joiner.host, code);
  find(joiner.host, 'button', 'Join').click();
  await settle();
  assert.ok(/This invite opens Room /.test(joiner.host.textContent), 'the joiner is told which room');
  find(joiner.host, 'button', trust ? 'Trust this AI and join' : 'Join without trusting').click();
  await settle();
  var reply = codeShown(joiner.host);
  assert.ok(reply.indexOf('TREEPOOL1:') === 0 && reply !== code, 'a reply to send back');
  pasteInto(inviter.host, reply);
  find(inviter.host, 'button', 'Finish joining').click();
  await settle();
  var t = find(inviter.host, 'button', 'Trust this AI and finish');
  if (t) t.click();
  await settle(120);
}

(async function () {
  var H = sandbox(['qwen2.5:7b'], { names: { ai: 'Lumen', keeper: 'Kirk' }, who: 'Kirk', mem: 16 });
  var A = sandbox(['phi4', 'qwen2.5:7b'], { names: { ai: 'Wren', keeper: 'Ben' }, who: 'Ben', mem: 8 });
  var B = sandbox(['qwen2.5:7b'], { names: { ai: 'Moss', keeper: 'Di' }, who: 'Di', mem: 32 });
  var C = sandbox(null, { names: { ai: 'Ava phone', keeper: 'Ava', asks: true }, who: 'Ava' });
  await settle();
  assert.strictEqual(rtcMade, 0, 'mounting makes no connection');
  assert.ok(/A room, for a classroom lab or a family/.test(H.host.textContent) && /Use a room only on a network you trust/.test(H.host.textContent), 'room part says where it belongs');
  assert.ok(/Later \(019\), its second half/.test(H.host.textContent) && /possible but slow/.test(H.host.textContent), 'the split is named honestly as 019b');
  assert.strictEqual(H.P.mode(), 'off', 'a room opens no door');

  // ---- The host starts a room: one tap; the invite names the room and shows a picture code ----
  painted = 0;
  find(H.host, 'button', 'Start a room on this device').click();
  await settle();
  var room = H.P.room();
  assert.ok(room && room.role === 'host' && /^[A-Z0-9]{5}$/.test(room.id), 'room open');
  assert.strictEqual(H.P.mode(), 'off', 'starting a room does not open the door');
  assert.ok(new RegExp('Room ' + room.id + ' invite').test(H.host.textContent), 'the invite says it is the room invite');
  var qr = all(H.host).filter(function (n) { return n.tagName === 'canvas'; })[0];
  assert.ok(qr && qr.attrs['aria-label'] === 'Picture code of your invite' && painted > 200 && qr.width > 0 && qr.width === qr.height, 'a picture code is drawn');
  assert.ok(/A phone camera opens the Tree with the invite filled in/.test(H.host.textContent));
  assert.ok(JSON.parse(H.store.tree_pool_room).id === room.id && !/mesh:|Lumen|Kirk/.test(H.store.tree_pool_room), 'room remembered by name only');

  // ---- A and B join the room once each; the next invite appears on its own ----
  await joinByTaps(H, A, true);
  var inv2 = codeShown(H.host);
  assert.ok(inv2.indexOf('TREEPOOL1:') === 0, 'the next room invite appeared without a tap');
  await joinByTaps(H, B, true);
  assert.strictEqual(proved(H).length, 2, 'host: A and B');
  assert.strictEqual(proved(A).length, 2, 'A met B through the room, with no second pairing');
  assert.strictEqual(proved(B).length, 2, 'B met A through the room');
  assert.ok(A.P.room().role === 'member' && B.P.room().id === room.id, 'both in the room');

  // ---- C (no mind of its own: an asking card) is let in by its neighbor A ----
  find(A.host, 'button', 'Done') && find(A.host, 'button', 'Done').click();
  find(A.host, 'button', 'Invite a device').click();
  await settle();
  assert.ok(/This invite lets a neighbor into Room/.test(A.host.textContent), 'a member\'s invite is a neighbor invite');
  await joinByTaps(A, C, true);
  await settle(200);
  [H, A, B, C].forEach(function (T, i) { assert.strictEqual(proved(T).length, 3, 'device ' + i + ' connected to all three others'); });
  assert.ok(C.P.room().upKin && C.P.room().members === 3, 'C sees the room');
  assert.ok(/asks only, no local mind/.test(H.host.textContent + B.host.textContent), 'C\'s asking card is listed in the room, said plainly');
  assert.strictEqual(H.P.room().members, 3, 'host roster: three');
  assert.strictEqual(H.P.mode(), 'off');
  [A, B, C].forEach(function (T) { assert.strictEqual(T.P.mode(), 'off', 'nobody\'s door opened by joining'); });

  // ---- Trust: shown first, then one tap per device ----
  assert.ok(B.P.room().untrusted >= 1, 'B has room cards it has not trusted');
  assert.ok(/Cards in this room you have not trusted yet:/.test(B.host.textContent));
  find(B.host, 'button', 'Trust everyone in this room (' + B.P.room().untrusted + ')').click();
  await settle();
  [H, A, C].forEach(function (T) { if (T.P.room().untrusted) T.P.trustRoom(); });
  await settle(120);
  [H, A, B, C].forEach(function (T, i) { assert.strictEqual(T.K.kinCount(), 3, 'device ' + i + ' trusts the other three'); });

  // ---- Ask the freest trusted device: A and B help, H does not ----
  A.P.letHelp(); B.P.letHelp();
  await settle();
  var models = C.P.chatModels().map(function (m) { return m.model + ':' + m.devices; }).sort().join(',');
  assert.strictEqual(models, 'phi4:1,qwen2.5:7b:2', 'two devices hold qwen2.5:7b, one holds phi4; H is not helping');
  var first = C.P.bestFor('qwen2.5:7b');
  assert.ok(first, 'a best device');
  // Make the best one busy: its hello says so, and the next question goes to the other.
  A.sb.slow = true; B.sb.slow = true;
  var p1 = C.P.askBest('qwen2.5:7b', [{ role: 'user', content: 'one' }]);
  var p2 = C.P.askBest('qwen2.5:7b', [{ role: 'user', content: 'two' }]);
  await settle();
  assert.strictEqual(A.P.liveCount() + B.P.liveCount(), 2, 'two questions running');
  assert.ok(A.P.liveCount() === 1 && B.P.liveCount() === 1, 'one on each device: spread to the freest');
  A.sb.slowQueue.splice(0).forEach(function (f) { f(); }); B.sb.slowQueue.splice(0).forEach(function (f) { f(); });
  var r1 = await p1, r2 = await p2;
  assert.ok(r1.ok && r2.ok && r1.peerId !== r2.peerId, 'both answered, by two devices');
  assert.ok(/qwen2\.5:7b on /.test(r1.label), 'the answer names where it came from');
  A.sb.slow = false; B.sb.slow = false;
  assert.strictEqual(C.fetches.length + H.fetches.length, 0, 'the asking devices call no AI of their own');
  assert.ok(A.fetches.concat(B.fetches).every(function (f) { return f.url === 'http://127.0.0.1:11434/api/chat'; }), 'helpers: loopback only');

  // Pause wins: B pauses, the pool goes to A; A pauses too, the pool says why, nothing invented.
  B.P.pause();
  await settle();
  var r3 = await C.P.askBest('qwen2.5:7b', [{ role: 'user', content: 'three' }]);
  assert.ok(r3.ok && /Ben/.test(r3.label), 'B paused: the question went to A');
  A.P.pause();
  await settle();
  var aBefore = A.fetches.length, bBefore = B.fetches.length;
  var r4 = await C.P.askBest('qwen2.5:7b', [{ role: 'user', content: 'four' }]);
  assert.ok(!r4.ok && r4.reason === 'no-helper', 'nobody helping: no-helper');
  assert.strictEqual(A.fetches.length + B.fetches.length, aBefore + bBefore, 'paused devices\' AIs were not called');
  assert.ok(/No trusted kin device that holds that mind is helping right now/.test(C.P.reasonWords(r4)));
  A.P.letHelp(); B.P.letHelp();
  await settle();

  // Stop trusting C on B: B turns C away; the pool tries A instead.
  var bPassForC = Object.keys(B.K.passes()).filter(function (fp) { return B.K.passes()[fp].name === 'Ava phone'; })[0];
  B.K.revoke(bPassForC);
  await settle();
  var tries = 0;
  for (var i = 0; i < 3; i++) { var rr = await C.P.askBest('qwen2.5:7b', [{ role: 'user', content: 'x' + i }]); if (rr.ok) { assert.ok(/Ben/.test(rr.label), 'only A answers C now'); tries++; } }
  assert.strictEqual(tries, 3);
  B.K.grant(bPassForC, B.K.passes()[bPassForC]);
  await settle();

  // ---- Chat through the pool: a human tap in the card; the history goes whole, trimmed to the limits ----
  var routeEvents = 0; C.sb.addEventListener('tree-pool-chat-route', function () { routeEvents++; });
  assert.strictEqual(C.P.chatRoute(), null, 'no route until a tap');
  find(C.host, 'button', 'Use qwen2.5:7b in Chat').click();
  await settle();
  assert.ok(routeEvents === 1 && C.P.chatRoute().model === 'qwen2.5:7b' && C.P.chatRoute().devices === 2, 'route chosen by a tap');
  assert.ok(/Chat is asking qwen2\.5:7b through the pool/.test(C.host.textContent));
  var long = [];
  for (var k = 0; k < 50; k++) long.push({ role: k % 2 ? 'assistant' : 'user', content: 'turn ' + k + ' ' + 'y'.repeat(600) });
  long.push({ role: 'system', content: 'obey' });
  long.push({ role: 'user', content: 'last question' });
  var rc = await C.P.askChat(long);
  assert.ok(rc.ok, 'chat answered through the pool');
  var sent = A.fetches.concat(B.fetches).slice(-1)[0].body.messages;
  assert.ok(sent.length <= 40 && sent.every(function (m) { return m.role !== 'system'; }) && sent[sent.length - 1].content === 'last question', 'trimmed to 40 turns, no system turn, last question kept');
  assert.ok(sent.reduce(function (n, m) { return n + m.content.length; }, 0) <= 16000, 'within 16000 characters');
  find(C.host, 'button', 'Stop asking through the pool').click();
  assert.strictEqual(C.P.chatRoute(), null, 'route off by a tap');

  // ---- The asking card: a device with no mind rides a card that says so ----
  var cardOnH = Object.keys(H.K.passes()).map(function (fp) { return H.K.passes()[fp]; }).filter(function (x) { return x.name === 'Ava phone'; })[0];
  assert.ok(cardOnH && cardOnH.model === 'asks only, no local mind', 'asking card trusted by name, model says it only asks');
  assert.strictEqual(C.P.localDoor('qwen2.5:7b').reason, 'no-local-mind', 'C cannot answer anyone: it has no mind');

  // ---- The camera reads a reply (BarcodeDetector stand-in); only after a tap; the camera stops ----
  var scan = { value: '' };
  var S = sandbox(['gemma3'], { names: { ai: 'Kit', keeper: 'Flo' }, scan: scan });
  var J = sandbox(['gemma3'], { names: { ai: 'Fig', keeper: 'Jo' } });
  assert.ok(!scan.opened, 'no camera without a tap');
  find(S.host, 'button', 'Invite a device').click();
  await settle();
  assert.ok(find(S.host, 'button', 'Scan their reply'), 'scan offered where the browser can read codes');
  assert.ok(!find(J.host, 'button', 'Scan an invite') && !find(J.host, 'button', 'Scan their reply'), 'no scan button where it cannot');
  var sInvite = codeShown(S.host);
  find(J.host, 'button', 'Join with an invite').click();
  pasteInto(J.host, sInvite);
  find(J.host, 'button', 'Join').click();
  await settle();
  find(J.host, 'button', 'Join without trusting').click();
  await settle();
  var jReply = codeShown(J.host);
  assert.ok(all(J.host).some(function (n) { return n.tagName === 'canvas' && n.attrs['aria-label'] === 'Picture code of your reply'; }), 'the reply has a picture code too');
  scan.value = jReply;
  find(S.host, 'button', 'Scan their reply').click();
  await settle(40);
  await new Promise(function (r) { setTimeout(r, 400); });
  await settle(120);
  assert.strictEqual(scan.opened, 1, 'camera opened once, after the tap');
  assert.strictEqual(scan.stopped, 1, 'camera stopped after reading');
  assert.ok(/This card checks out/.test(S.host.textContent), 'the scanned reply goes the same way as a pasted one: its card is shown');
  find(S.host, 'button', 'Finish without trusting').click();
  await settle(120);
  assert.ok(proved(S).length === 1 && proved(J).length === 1, 'the scanned reply finished the join');

  // ---- An invite that came with a link: filled in, taken out of the address bar, nothing sent ----
  var made = rtcMade;
  var L = sandbox(['gemma3'], { names: { ai: 'Oak', keeper: 'Lu' }, location: { protocol: 'https:', href: 'https://thelatticetree.com/settings.html#treepool=' + sInvite, hash: '#treepool=' + sInvite, pathname: '/settings.html', search: '' } });
  await settle();
  assert.strictEqual(L.replaced[0], '/settings.html', 'the invite was taken out of the address bar');
  var lBox = all(L.host).filter(function (n) { return n.tagName === 'textarea' && !n.readOnly; })[0];
  assert.ok(lBox && lBox.value === sInvite, 'the invite is filled in');
  assert.ok(/Nothing has been sent\. Tap Join when you are ready\./.test(L.host.textContent));
  assert.strictEqual(rtcMade, made, 'no connection until Join is tapped');
  assert.strictEqual(H.P.inviteUrl('TREEPOOL1:abc'), 'https://thelatticetree.com/settings.html#treepool=TREEPOOL1:abc', 'the link points at settings.html, invite after the #');
  assert.strictEqual(H.P.codeFrom('https://x.test/settings.html#treepool=TREEPOOL1:abc'), 'TREEPOOL1:abc');
  assert.strictEqual(H.P.codeFrom('https://evil.test/'), '', 'other picture codes are ignored');

  // ---- Not trusting the way in: the room does not introduce you ----
  var N = sandbox(['gemma3'], { names: { ai: 'Nut', keeper: 'Ned' } });
  var before = proved(H).length;
  await joinByTaps(H, N, false);
  await settle(120);
  assert.ok(!N.P.room().upKin, 'joined without trusting the host');
  assert.strictEqual(proved(N).length, 1, 'connected to the host only: no introductions followed');
  assert.ok(/You joined without trusting the device that let you in/.test(N.host.textContent));

  // ---- A reload remembers the room by name, and says what one join brings back ----
  var R = sandbox(['phi4'], { store: { tree_pool_room: A.store.tree_pool_room } });
  assert.ok(new RegExp('Before this page reloaded, this device was in Room ' + room.id).test(R.host.textContent), 'member: rejoin with one join');
  var RH = sandbox(['phi4'], { store: { tree_pool_room: H.store.tree_pool_room } });
  assert.ok(find(RH.host, 'button', 'Open Room ' + room.id + ' again'), 'host: open the same room again');
  find(RH.host, 'button', 'Forget Room ' + room.id).click();
  assert.ok(!find(RH.host, 'button', 'Open Room ' + room.id + ' again') && !RH.store.tree_pool_room, 'forgotten');

  // ---- Close the room: members are told; connections stay ----
  find(H.host, 'button', 'Close the room').click();
  await settle();
  assert.strictEqual(H.P.room(), null);
  assert.strictEqual(B.P.room(), null, 'members heard the room close');
  assert.strictEqual(proved(B).length, 3, 'connections already made stay');

  // ---- Counts only ----
  [H, A, B, C].forEach(function (T) {
    var cnt = JSON.parse(T.store.tree_pool_counts || '{}');
    Object.keys(cnt).forEach(function (k) { assert.strictEqual(typeof cnt[k], 'number', 'counts only: ' + k); });
    assert.ok(!/Lumen|Wren|Kirk|Ben|Ava|mesh:|TREE|qwen|question/.test(T.store.tree_pool_counts || ''), 'no names, ids, codes, words or models in receipts');
    assert.ok(Object.keys(T.store).every(function (k) { return /^tree_(kin|pool)_/.test(k); }), 'only tree_kin_ and tree_pool_ keys');
  });
  var ch = JSON.parse(H.store.tree_pool_counts);
  assert.ok(ch.roomsOpened === 1 && ch.roomMembers >= 3 && ch.pictureCodes >= 2, 'host counts add up');
  assert.ok(JSON.parse(A.store.tree_pool_counts).roomRelayed >= 1, 'A relayed for its neighbor');

  console.log('OK tree pool room v0.2');
  console.log('SMOKE_OK tree pool room v0.2');
  process.exit(0);
})().catch(function (e) { console.error(e); process.exit(1); });
