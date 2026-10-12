// tree-reconnect.test.js (MIT) v-tree-reconnect-v0.1
// Node only. Fake localStorage, fake relay window. No network.
var fs = require('fs'), path = require('path'), vm = require('vm'), crypto = require('crypto'), assert = require('assert');
var webcrypto = require('crypto').webcrypto;

var kinSrc = fs.readFileSync(path.join(__dirname, 'tree-kin.js'), 'utf8');
var src = fs.readFileSync(path.join(__dirname, 'tree-reconnect.js'), 'utf8');
assert.ok(src.indexOf('v-tree-reconnect-v0.1') !== -1, 'marker');
assert.ok(!/\u2014/.test(src) && !new RegExp('&md' + 'ash;').test(src), 'no em dash');
assert.ok(!new RegExp('\\.' + 'inner' + 'HTML').test(src), 'text only');
assert.ok(!new RegExp('conf' + 'irm\\(').test(src), 'no dialog');
assert.ok(src.indexOf('That computer did not answer at its last address. Ask it for a new join link.') !== -1, 'plain words');
assert.ok(!/\bscan\b|255\.255\.255|for \(var i = 1; i < 255/.test(src), 'no scanning');

function b64url(s) {
  return Buffer.from(s, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function node(tag) {
  return { tagName: tag, className: '', id: '', type: '', style: {}, _t: '', children: [], on: {},
    get textContent() { return this._t + this.children.map(function (c) { return c.textContent; }).join(' '); },
    set textContent(v) { this._t = String(v); this.children = []; },
    get firstChild() { return this.children[0] || null; },
    appendChild: function (c) { this.children.push(c); return c; },
    removeChild: function (c) { this.children = this.children.filter(function (x) { return x !== c; }); return c; },
    addEventListener: function (e, f) { (this.on[e] = this.on[e] || []).push(f); },
    click: function () { (this.on.click || []).forEach(function (f) { f(); }); }
  };
}
function all(n, out) { out = out || []; out.push(n); (n.children || []).forEach(function (c) { all(c, out); }); return out; }

(async function () {
  // WebCrypto work does not keep the Node loop alive by itself. Hold one timer until the end.
  var hold = setInterval(function () {}, 1000);
  // ---- real TreeKin: forget and signReconnect, key never exported ----
  var store = {};
  var kinSb = {
    crypto: webcrypto, TextEncoder: TextEncoder, TextDecoder: TextDecoder, Uint8Array: Uint8Array, ArrayBuffer: ArrayBuffer,
    btoa: function (s) { return Buffer.from(s, 'binary').toString('base64'); },
    atob: function (s) { return Buffer.from(s, 'base64').toString('binary'); },
    localStorage: { getItem: function (k) { return k in store ? store[k] : null; }, setItem: function (k, v) { store[k] = String(v); } },
    document: { readyState: 'complete', addEventListener: function () {}, getElementById: function () { return null; }, createElement: node },
    addEventListener: function () {}, removeEventListener: function () {}, setTimeout: setTimeout, clearTimeout: clearTimeout
  };
  kinSb.window = kinSb;
  vm.createContext(kinSb);
  vm.runInContext(kinSrc, kinSb);
  var mem = null;
  kinSb.TreeKin.use({ store: { get: function () { return Promise.resolve(mem); }, put: function (v) { mem = v; return Promise.resolve(); }, lasting: true } });
  var made = await kinSb.TreeKin.makeAskerCard('Phone', 'Ada');
  assert.ok(made.ok, 'asker card');
  var checked = await kinSb.TreeKin.verifyCard(made.card);
  assert.ok(checked.ok, 'card checks');
  kinSb.TreeKin.grant(checked.fp, { name: 'Phone', model: made.card.model, keeperMeshId: made.card.keeperMeshId, keeperName: 'Ada', keyHash: checked.keyHash });
  assert.ok(kinSb.TreeKin.isTrusted(checked.fp), 'trusted');
  var snap = kinSb.TreeKin.forget(checked.fp);
  assert.ok(snap && snap.keyHash === checked.keyHash && !kinSb.TreeKin.isTrusted(checked.fp), 'forget removes kin trust');
  kinSb.TreeKin.grant(checked.fp, snap);
  assert.ok(kinSb.TreeKin.isTrusted(checked.fp), 'grant restores the snap');
  var desk = '0123456789abcdef';
  var chal = 'ab'.repeat(16);
  var sg = await kinSb.TreeKin.signReconnect('fl-reconnect|v1|' + chal + '|' + desk + '|' + checked.fp);
  assert.ok(sg.ok && typeof sg.sig === 'string' && !sg.privateKey && !sg.key, 'signature only, key stays inside');
  assert.strictEqual(kinSb.TreeKin.identity().keyPair.privateKey.extractable, false, 'still non-exportable');
  var data = Buffer.from('fl-reconnect|v1|' + chal + '|' + desk + '|' + checked.fp, 'utf8');
  var key = crypto.createPublicKey({ key: made.card.publicKey, format: 'jwk' });
  var verified = made.card.cryptoType === 'ed25519'
    ? crypto.verify(null, data, key, Buffer.from(sg.sig, 'base64'))
    : crypto.verify('sha256', data, { key: key, dsaEncoding: 'ieee-p1363' }, Buffer.from(sg.sig, 'base64'));
  assert.ok(verified, 'desktop can verify the phone signature');

  // ---- the reconnect module, with fakes ----
  var ls = {};
  var listeners = [];
  var host = node('div'); host.id = 'tree-reconnect-host';
  var invites = 0;
  var posts = [];
  var currentCard = { ok: true, fp: 'fedcba9876543210', body: { name: 'Kitchen Mac' } };
  var knockMode = 'bad';
  var sb = {
    crypto: webcrypto, TextEncoder: TextEncoder, TextDecoder: TextDecoder, Uint8Array: Uint8Array,
    btoa: function (s) { return Buffer.from(s, 'binary').toString('base64'); },
    atob: function (s) { return Buffer.from(s, 'base64').toString('binary'); },
    localStorage: { getItem: function (k) { return k in ls ? ls[k] : null; }, setItem: function (k, v) { ls[k] = String(v); } },
    document: {
      readyState: 'complete',
      getElementById: function (id) { return id === 'tree-reconnect-host' ? host : null; },
      createElement: node,
      addEventListener: function () {}
    },
    addEventListener: function (type, fn) { if (type === 'message') listeners.push(fn); },
    removeEventListener: function (type, fn) { if (type === 'message') listeners = listeners.filter(function (f) { return f !== fn; }); },
    setTimeout: function (fn, ms) { var timer = setTimeout(fn, ms); if (timer.unref) timer.unref(); return timer; },
    clearTimeout: function (id) { clearTimeout(id); },
    TreeKin: {
      forget: function (fp) { sb.TreeKin._forgot = fp; return { name: 'Kitchen Mac', model: 'asks only, no local mind', keeperMeshId: 'mesh:abc', keeperName: 'Ada', keyHash: 'kh' }; },
      grant: function (fp) { sb.TreeKin._granted = fp; },
      checkCode: function () { return Promise.resolve({ ok: true, fp: '1111222233334444' }); },
      signReconnect: function () { return Promise.resolve({ ok: true, sig: 'c2ln', cryptoType: 'ed25519' }); }
    },
    TreePool: {
      invite: function () { invites++; return Promise.resolve({ ok: true, code: 'TREEPOOL1:' + b64url(JSON.stringify({ v: 1, card: 'TREEKIN1:abc', sdp: 'v=0' })) }); },
      readReply: function () { return Promise.resolve({ ok: true, sdp: 'v=0', card: currentCard }); },
      finish: function () { return Promise.resolve({ ok: true, peerId: 'p1' }); }
    },
    PoolKnockPhone: {
      link: function () { return { h: '192.168.1.40', p: 5001 }; },
      knock: function () {
        var self = sb.TreePool;
        return Promise.resolve(self.readReply('x')).then(function () {
          return knockMode === 'good' ? { ok: true, peerId: 'p1', choice: 'connect' } : { ok: false, reason: 'no' };
        });
      }
    }
  };
  sb.window = sb;
  vm.createContext(sb);
  vm.runInContext(src, sb);
  var R = sb.TreeReconnect;
  assert.strictEqual(R.load().length, 0, 'nothing saved before a good join');
  await sb.PoolKnockPhone.knock();
  assert.strictEqual(R.load().length, 0, 'a refused join saves nothing');
  knockMode = 'good';
  currentCard = { ok: false, fp: 'fedcba9876543210', body: { name: 'Nope' } };
  await sb.PoolKnockPhone.knock();
  assert.strictEqual(R.load().length, 0, 'a card that did not check saves nothing');
  currentCard = { ok: true, fp: 'fedcba9876543210', body: { name: 'Kitchen Mac' } };
  await sb.PoolKnockPhone.knock();
  var saved = R.load();
  assert.strictEqual(saved.length, 1, 'one record after a good join');
  assert.strictEqual(saved[0].deskFp, 'fedcba9876543210');
  assert.strictEqual(saved[0].h, '192.168.1.40');
  assert.strictEqual(saved[0].name, 'Kitchen Mac');
  var clock = Date.now();
  R.now = function () { return ++clock; };
  for (var i = 0; i < 9; i++) {
    currentCard = { ok: true, fp: ('000000000000000' + i).slice(-16), body: { name: 'Mac ' + i } };
    await sb.PoolKnockPhone.knock();
  }
  assert.strictEqual(R.load().length, 8, 'at most 8');
  assert.ok(!R.load().some(function (r) { return r.deskFp === 'fedcba9876543210'; }), 'oldest dropped');

  ls['fl-tree-paired-v1'] = JSON.stringify([{ v: 1, deskFp: 'aaaaaaaaaaaaaaaa', h: '8.8.8.8', p: 80, name: 'Public', pairedAt: 1, lastAt: 1 }].concat(R.load()));
  assert.ok(R.load().every(function (r) { return R.isPrivateLan(r.h); }), 'non-private h refused when loading');
  assert.ok(!R.load().some(function (r) { return r.h === '8.8.8.8'; }), 'public address is not listed');

  var fp = R.load()[0].deskFp;
  var forgot = R.forget(fp);
  assert.strictEqual(forgot.ok, true, 'forget');
  assert.strictEqual(sb.TreeKin._forgot, fp, 'forget also untrusts');
  assert.ok(!R.load().some(function (r) { return r.deskFp === fp; }), 'record removed');
  assert.ok(host.textContent.indexOf('Forgotten.') !== -1, 'row says Forgotten');
  var undone = R.undo();
  assert.strictEqual(undone.ok, true, 'undo');
  assert.strictEqual(sb.TreeKin._granted, fp, 'undo grants the trust back');
  assert.ok(R.load().some(function (r) { return r.deskFp === fp; }), 'record restored');
  R.forget(fp);
  var now = Date.now();
  R.now = function () { return now + 11000; };
  assert.strictEqual(R.undo().ok, false, 'undo after 10s cannot');

  // message posted to the exact origin only; another origin or window is ignored
  var rec = { v: 1, deskFp: desk, h: '10.0.0.8', p: 4321, name: 'Study', pairedAt: 1, lastAt: 1 };
  var opens = 0;
  var win = { postMessage: function (msg, origin) { posts.push({ msg: msg, origin: origin, win: win }); } };
  var other = { postMessage: function () {} };
  invites = 0;
  var pending = R.reconnect(rec, { open: function (u) { opens++; assert.ok(u.indexOf('http://10.0.0.8:4321/relay?r=1') === 0, 'opens the remembered relay'); return win; }, timeoutMs: 400, answerMs: 400 });
  await new Promise(function (r) { setTimeout(r, 15); });
  assert.strictEqual(posts.length, 1, 'hello posted once');
  assert.strictEqual(posts[0].origin, 'http://10.0.0.8:4321', 'exact origin');
  assert.strictEqual(posts[0].msg.type, 'fl-reconnect-hello');
  var goodC = 'cd'.repeat(16);
  listeners.slice().forEach(function (fn) {
    fn({ source: other, origin: 'http://10.0.0.8:4321', data: { type: 'fl-reconnect-challenge', v: 1, c: goodC } });
    fn({ source: win, origin: 'http://evil.example', data: { type: 'fl-reconnect-challenge', v: 1, c: goodC } });
  });
  await new Promise(function (r) { setTimeout(r, 20); });
  assert.strictEqual(invites, 0, 'a message from another origin or window is ignored');
  listeners.slice().forEach(function (fn) {
    fn({ source: win, origin: 'http://10.0.0.8:4321', data: { type: 'fl-reconnect-challenge', v: 1, c: goodC } });
  });
  await new Promise(function (r) { setTimeout(r, 30); });
  var knockMsg = posts.filter(function (p) { return p.msg && p.msg.type === 'fl-reconnect'; })[0];
  assert.ok(knockMsg && knockMsg.origin === 'http://10.0.0.8:4321', 'knock posted to the exact origin');
  listeners.slice().forEach(function (fn) {
    fn({ source: win, origin: 'http://10.0.0.8:4321', data: { type: 'fl-knock-answer', v: 1, ok: true, answer: 'TREEPOOL1:' + b64url(JSON.stringify({ v: 1, k: 'reply', sdp: 'v=0' })), choice: 'connect' } });
  });
  var done = await pending;
  assert.ok(done.ok, 'reconnect finishes when the answer is from that window');

  opens = 0; invites = 0;
  var dead = await R.reconnect(rec, { open: function () { opens++; return { postMessage: function () {} }; }, timeoutMs: 40 });
  assert.strictEqual(dead.ok, false, 'dead address');
  assert.strictEqual(opens, 1, 'one try, no retry loop');
  assert.strictEqual(invites, 0, 'a dead address does not go looking');
  assert.ok(host.textContent.indexOf('That computer did not answer at its last address. Ask it for a new join link.') !== -1, 'plain words on a dead address');

  var buttons = all(host).filter(function (n) { return n.tagName === 'button'; });
  // The dead sentence replaces the list. Mount again and measure the real buttons.
  R.paint();
  buttons = all(host).filter(function (n) { return n.tagName === 'button'; });
  assert.ok(buttons.length >= 2, 'reconnect and forget are buttons');
  buttons.forEach(function (b) { assert.strictEqual(b.style.minHeight, '44px', '44px'); });

  clearInterval(hold);
  console.log('tree-reconnect.test.js ok');
})().catch(function (e) { console.error(e); process.exit(1); });
