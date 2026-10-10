// Node test for the Tree's pool honest heals v0.1 (v-tree-pool-honest-heals-v0.1, paste 030).
// (1) The picture-code reader: jsQR 1.4.0 vendored and pinned, loaded only after a tap, a camera only
//     after a tap, and "Read a picture of the code" for a photo or screenshot. A real QR made by the
//     site's own qrcodegen is decoded here by the vendored jsQR, pixel by pixel.
// (2) Honest reasons arrive: paused and asleep are said by name, to trusted kin only, one state word.
// The harness (stand-in WebRTC and page) is the one from tree-no-install-mind.test.js, layered.
// The transport is a stand-in (labeled): FakePC/FakeDC relay the channel inside this process.
var fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert'), crypto = require('crypto');
var webcrypto = crypto.webcrypto;
var kinSrc = fs.readFileSync(path.join(__dirname, 'tree-kin.js'), 'utf8');
var src = fs.readFileSync(path.join(__dirname, 'tree-pool.js'), 'utf8');
var bmSrc = fs.readFileSync(path.join(__dirname, 'tree-browser-mind.js'), 'utf8');
var doorSrc = fs.readFileSync(path.join(__dirname, 'tree-door.js'), 'utf8');
var lib = path.join(__dirname, '..', 'lib');

// ---- locks, read from the source ----
assert.ok(src.indexOf('v-tree-pool-honest-heals-v0.1') !== -1 && doorSrc.indexOf('v-tree-pool-honest-heals-v0.1') !== -1, 'marker');
[src, doorSrc].forEach(function (s) {
  s.split('\n').filter(function (l) { return /v-tree-pool-honest-heals-v0\.1|jsQR|JSQR|picture|whyNone|helpState|knew/i.test(l); }).forEach(function (l) {
    assert.ok(!/\u2014|&mdash;|\.innerHTML|confirm\(|alert\(/.test(l), 'added line keeps the locks: ' + l.trim().slice(0, 80));
    assert.ok(!/quiet room/i.test(l), 'no Quiet Room words');
  });
});
assert.strictEqual((src.match(/root\.fetch\(/g) || []).length, 1, 'tree-pool still has one fetch, to its own loopback AI');
assert.ok(/new root\.RTCPeerConnection\(\{ iceServers: \[\] \}\)/.test(src), 'iceServers stays empty');
assert.ok(!/fetch\(|XMLHttpRequest|WebSocket|sendBeacon/.test(doorSrc), 'the door still fetches nothing');
var md5 = crypto.createHash('md5').update(fs.readFileSync(path.join(__dirname, 'fl-connect.js'))).digest('hex');
assert.strictEqual(md5, 'aaff2bf1b037656989a9e1a89bb05908', 'fl-connect.js unchanged');
// The vendored reader: the pinned file, its license, and the SRI the script tag carries.
var jsqrPath = path.join(lib, 'jsqr', 'jsQR-1.4.0.js');
assert.ok(fs.existsSync(jsqrPath), 'docs/lib/jsqr/jsQR-1.4.0.js is vendored (paste 030, step 2)');
var jsqrBytes = fs.readFileSync(jsqrPath);
assert.strictEqual(crypto.createHash('sha256').update(jsqrBytes).digest('hex'), 'bc40c8a15196236b2314db0856f72ca0b49980cd5413b8c852a7349f5fee0859', 'jsQR sha256 pin');
assert.ok(src.indexOf("'sha256-" + crypto.createHash('sha256').update(jsqrBytes).digest('base64') + "'") !== -1, 'the SRI in tree-pool.js matches the file');
assert.ok(/Apache License\s+Version 2\.0/.test(fs.readFileSync(path.join(lib, 'jsqr', 'LICENSE-jsQR.txt'), 'utf8')), 'the Apache-2.0 license is kept');
assert.ok(!/GNU AFFERO|AGPL/i.test(jsqrBytes.toString('utf8')), 'no AGPL');
assert.ok(/getUserMedia/.test(src) && !/getUserMedia/.test(doorSrc), 'the camera is asked only from tree-pool.js scans');
assert.ok(/\.tree-door input\.tree-pool-file\{display:none/.test(doorSrc), 'the door file box stays hidden under the door input rule');

// ---- (1) a real picture code, made by the site's qrcodegen, read by the vendored jsQR ----
var qsb = { console: console }; qsb.window = qsb; qsb.self = qsb;
vm.createContext(qsb);
vm.runInContext(fs.readFileSync(path.join(lib, 'qrcodegen.js'), 'utf8') + '\nthis.qrcodegen = qrcodegen;', qsb);
vm.runInContext(jsqrBytes.toString('utf8'), qsb);
assert.strictEqual(typeof qsb.jsQR, 'function', 'jsQR sets window.jsQR as a plain script');
var makeQr = null;
function render(text, scale, invert) {
  var qr = makeQr(qsb.qrcodegen, text), border = 4;
  var n = (qr.size + border * 2) * scale, px = new Uint8ClampedArray(n * n * 4);
  for (var y = 0; y < n; y++) for (var x = 0; x < n; x++) {
    var mx = Math.floor(x / scale) - border, my = Math.floor(y / scale) - border;
    var dark = mx >= 0 && my >= 0 && mx < qr.size && my < qr.size && qr.getModule(mx, my);
    if (invert) dark = !dark;
    var i = (y * n + x) * 4, v = dark ? 0 : 255;
    px[i] = px[i + 1] = px[i + 2] = v; px[i + 3] = 255;
  }
  return { px: px, n: n, size: qr.size };
}
var reply = 'TREEPOOL1.' + Buffer.from(crypto.randomBytes(800)).toString('base64').replace(/[^A-Za-z0-9]/g, 'x');

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
  assert.ok(f.ok, "finished " + JSON.stringify(f));
  await settle();
  return { aId: inv.peerId, bId: j.peerId };
}
var SMALL = 'SmolLM2-360M-Instruct-q4f16_1-MLC', QWEN = 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC';
var SMALL = 'SmolLM2-360M-Instruct-q4f16_1-MLC';
function chat(S, model, q) { return S.P.askBest(model, [{ role: 'user', content: q }]); }
(async function () {
  var T0 = sandbox(['x']);
  var PREFIX = T0.P.CODE_PREFIX;
  makeQr = T0.P.makeQr;
  // jsQR 1.4.0 cannot read version 23 (109 modules): the raw encoder would draw it, makeQr draws 24.
  var t23 = PREFIX + 'x'.repeat(1040 - PREFIX.length);
  var raw23 = qsb.qrcodegen.QrCode.encodeText(t23, qsb.qrcodegen.QrCode.Ecc.LOW);
  assert.strictEqual(raw23.version, 23, 'this text would be version 23');
  assert.strictEqual(makeQr(qsb.qrcodegen, t23).version, 24, 'drawn as 24 instead');
  var r23 = render(t23, 3, false), g23 = qsb.jsQR(r23.px, r23.n, r23.n);
  assert.ok(g23 && g23.data === t23, 'and it reads back');
  // Every length from a short invite to a long real one (GC's walk: 1874 characters) reads back whole.
  for (var L = 300; L <= 2300; L += 50) {
    var tL = PREFIX + crypto.randomBytes(L).toString('base64').slice(0, L - PREFIX.length);
    var rL = render(tL, 3, false), gL = qsb.jsQR(rL.px, rL.n, rL.n);
    assert.ok(gL && gL.data === tL, L + ' characters read back');
  }
  var code = PREFIX + reply.slice(reply.indexOf('.') + 1);
  var img = render(code, 4, false);
  var got = qsb.jsQR(img.px, img.n, img.n, { inversionAttempts: 'attemptBoth' });
  assert.ok(got && T0.P.codeFrom(got.data) === code, 'a ' + code.length + '-character reply, QR ' + img.size + ' modules, read back whole');
  var link = 'https://thelatticetree.com/settings.html#treepool=' + encodeURIComponent(code);
  var img2 = render(link, 3, true);
  var got2 = qsb.jsQR(img2.px, img2.n, img2.n, { inversionAttempts: 'attemptBoth' });
  assert.ok(got2 && T0.P.codeFrom(got2.data) === code, 'an invite link, light on dark, read back to its code');
  // Nothing loads and no camera opens until a tap: mounting adds no script.
  var host0 = node('div'); T0.P.mount(host0);
  assert.ok(!T0.head.children.some(function (c) { return c.tagName === 'script'; }), 'no reader script before a tap');
  assert.strictEqual(T0.P.JSQR_PATH, 'lib/jsqr/jsQR-1.4.0.js');
  // A file that is not a picture is refused in plain words, with no reader loaded.
  var rNot = await T0.P.readPicture({ type: 'text/plain', size: 10 });
  assert.ok(!rNot.ok && /not a picture/.test(T0.P.pictureWords(rNot)), 'not a picture');
  var rBig = await T0.P.readPicture({ type: 'image/png', size: 30 * 1024 * 1024 });
  assert.ok(!rBig.ok && rBig.reason === 'too-big');
  // The picture button: a hidden file box, opened only by the tap.
  var spot = node('div'), said = [], clicked = 0, codes = [];
  T0.P.pictureInto(spot, function (c) { codes.push(c); }, function (t) { said.push(t); });
  var fileBox = all(spot).filter(function (x) { return x.tagName === 'input'; })[0];
  var pb = all(spot).filter(function (x) { return x.tagName === 'button'; })[0];
  assert.ok(fileBox && fileBox.type === 'file' && fileBox.getAttribute('accept') === 'image/*' && fileBox.hidden, 'a hidden image box');
  assert.strictEqual(pb.textContent, 'Read a picture of the code');
  fileBox.click = function () { clicked++; };
  pb.on.click();
  assert.strictEqual(clicked, 1, 'the box opens only after the tap');

  // ---- (2) honest reasons arrive (stand-in transport, labeled above) ----
  // Kirk's computer: Ollama seated, then an in-browser mind. The asker has no mind of its own.
  var H = sandbox(['qwen2.5:14b'], { gpu: 'f16', names: { ai: 'Kirk\'s mind', keeper: 'Kirk' }, who: 'Kirk' });
  var A = sandbox(null, { names: { ai: 'Ada asks', keeper: 'Ada', asks: true }, who: 'Ada' });
  var c = await connect(H, A, true);
  H.P.letHelp(); await settle();
  var r1 = await chat(A, 'qwen2.5:14b', 'hello, are you there?');
  assert.ok(r1.ok && /on Kirk's computer/.test(r1.label), 'helping: answered');
  var ps = A.P.peerState(c.bId);
  assert.strictEqual(ps.helpState, 'helping', 'the state word arrived');
  H.P.pause(); await settle();
  assert.strictEqual(A.P.peerState(c.bId).helpState, 'paused');
  assert.strictEqual(A.P.peerState(c.bId).models.length, 0, 'paused: no minds named in the hello (nothing new sent)');
  var before = H.fetches.length;
  var r2 = await chat(A, 'qwen2.5:14b', 'what is two plus two?');
  assert.ok(!r2.ok && r2.reason === 'no-helper' && r2.why === 'paused', 'paused: the reason arrives');
  assert.strictEqual(A.P.reasonWords(r2) + ' Nothing was invented.', 'Kirk\'s computer is paused. Its keeper can tap Resume for trusted kin. Nothing was invented.');
  assert.strictEqual(H.fetches.length, before, 'nothing was asked while paused');
  // A stopped card with the same key and no keeper name must not hide the trusted card.
  var rawPasses = JSON.parse(A.store.tree_kin_passes);
  var keptHash = rawPasses[Object.keys(rawPasses)[0]].keyHash;
  var orderedPasses = { '000-stopped': { name: 'My mind', model: 'qwen2.5:14b', keeperName: '', keyHash: keptHash, keeperMeshId: 'mesh:old', grantedAt: 1, revokedAt: 2 } };
  Object.keys(rawPasses).forEach(function (fp) { orderedPasses[fp] = rawPasses[fp]; });
  A.store.tree_kin_passes = JSON.stringify(orderedPasses);
  var rStopped = await chat(A, 'qwen2.5:14b', 'named?');
  assert.strictEqual(A.P.reasonWords(rStopped), 'Kirk\'s computer is paused. Its keeper can tap Resume for trusted kin.', 'a stopped card does not hide the trusted keeper');
  H.P.setMode('kin', 'human'); await settle();
  assert.ok((await chat(A, 'qwen2.5:14b', 'again?')).ok, 'resumed: answered');
  // The in-browser mind: wake, seat, lend; then sleep.
  await H.B.wake(SMALL, true); assert.ok(H.B.seat(true).ok); await settle();
  assert.ok((await chat(A, SMALL, 'hi?')).ok, 'in-browser mind answered');
  H.B.sleep(); await settle();
  assert.strictEqual(A.P.peerState(c.bId).helpState, 'asleep', 'asleep arrived as a state word');
  var r3 = await chat(A, SMALL, 'still there?');
  assert.ok(!r3.ok && r3.why === 'asleep', 'asleep: the reason arrives');
  assert.strictEqual(A.P.reasonWords(r3) + ' Nothing was invented.', 'The in-browser mind on Kirk\'s computer is asleep. Nothing was invented.');
  // Off: said plainly too.
  H.P.turnOff(); await settle();
  var r4 = await chat(A, SMALL, 'off?');
  assert.ok(!r4.ok && r4.why === 'off' && A.P.reasonWords(r4) === 'Kirk\'s computer is not helping right now.');
  // A mind no device ever named keeps the old words.
  var r5 = await chat(A, 'never-heard:1b', 'who?');
  assert.ok(!r5.ok && !r5.why && /No trusted kin device that holds that mind is helping right now/.test(A.P.reasonWords(r5)), 'the old words stay');
  // Kin only: a device that did not trust Kirk's card hears no hello, so no state word and no reason.
  var H2 = sandbox(['qwen2.5:14b'], { names: { ai: 'Kirk 2', keeper: 'Kirk' } });
  var S = sandbox(null, { names: { ai: 'Stranger', keeper: 'Sam', asks: true } });
  var c2 = await connect(H2, S, false);
  H2.P.letHelp(); await settle(); H2.P.pause(); await settle();
  var st = S.P.peerState(c2.bId);
  assert.ok(st && !st.helpState, 'not kin: no state word taken');
  assert.ok(!(await chat(S, 'qwen2.5:14b', 'x')).why, 'not kin: no reason named');
  // Counts only: no words or names kept in the receipts.
  assert.ok(!/Kirk|two plus two|asleep/.test(String(A.store.tree_pool_counts || '')) && !/two plus two/.test(String(H.store.tree_pool_counts || '')), 'counts only');
  console.log('SMOKE_OK tree pool honest heals v0.1');
  process.exit(0);
})().catch(function (e) { console.error(e); process.exit(1); });
