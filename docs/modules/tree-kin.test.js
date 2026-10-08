// Node test for Tree Kin v0.1 (v-tree-kin-v0.1): trusted kin by pasted, signed cards.
// No network, ever. Counts-only receipts. Same card shape and fingerprint as FreeLattice fl-kin.js v0.2.
var fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
var webcrypto = require('crypto').webcrypto;
var src = fs.readFileSync(path.join(__dirname, 'tree-kin.js'), 'utf8');
assert.ok(src.indexOf('v-tree-kin-v0.1') !== -1, 'marker');
assert.ok(!/\u2014/.test(src) && !/&mdash;/.test(src), 'no em dash');
assert.ok(!/\.innerHTML/.test(src), 'textContent only');
assert.ok(!/confirm\(/.test(src) && !/alert\(/.test(src) && !/prompt\(/.test(src), 'no dialog boxes');
assert.ok(!/\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon|RTCPeerConnection|EventSource|Peer\(/.test(src), 'no network in this module');
assert.ok(!/quiet room/i.test(src), 'no Quiet Room words');
assert.ok(src.indexOf("KIN_DOMAIN = 'fl-kin-card|v1|'") !== -1, 'same signing prefix as FreeLattice');

function node(tag) {
  return { tagName: tag, className: '', id: '', type: '', value: '', placeholder: '', readOnly: false, maxLength: 0, _t: '', children: [], attrs: {}, on: {},
    get textContent() { return this._t + this.children.map(function (c) { return c.textContent; }).join(' '); },
    set textContent(v) { this._t = String(v); this.children = []; },
    get firstChild() { return this.children[0] || null; },
    appendChild: function (c) { this.children.push(c); return c; },
    removeChild: function (c) { this.children = this.children.filter(function (x) { return x !== c; }); return c; },
    setAttribute: function (k, v) { this.attrs[k] = String(v); },
    addEventListener: function (e, f) { this.on[e] = f; } };
}
function all(n, out) { out = out || []; out.push(n); n.children.forEach(function (c) { all(c, out); }); return out; }
function find(h, tag, label) { return all(h).filter(function (n) { return n.tagName === tag && (label == null || n.textContent === label); })[0]; }

var netCalls = 0;
function sandbox(model) {
  var store = {}, clip = [];
  var head = node('head');
  var sb = {
    crypto: webcrypto, TextEncoder: TextEncoder, TextDecoder: TextDecoder, Uint8Array: Uint8Array, ArrayBuffer: ArrayBuffer,
    btoa: function (s) { return Buffer.from(s, 'binary').toString('base64'); },
    atob: function (s) { return Buffer.from(s, 'base64').toString('binary'); },
    localStorage: { getItem: function (k) { return k in store ? store[k] : null; }, setItem: function (k, v) { store[k] = String(v); } },
    document: { head: head, createElement: node, getElementById: function (id) { return head.children.filter(function (c) { return c.id === id; })[0] || null; } },
    navigator: { clipboard: { writeText: function (t) { clip.push(t); return Promise.resolve(); } } },
    fetch: function () { netCalls++; return Promise.reject(new Error('no network')); },
    XMLHttpRequest: function () { netCalls++; },
    LocalMindProbe: { getRemembered: function () { return model ? { name: 'Ollama', url: 'http://127.0.0.1:11434/api/tags', model: model } : null; } },
    addEventListener: function () {}
  };
  sb.window = sb;
  vm.createContext(sb);
  vm.runInContext(src, sb);
  var mem = null;
  sb.TreeKin.use({ store: { get: function () { return Promise.resolve(mem); }, put: function (v) { mem = v; return Promise.resolve(); }, lasting: true } });
  return { sb: sb, K: sb.TreeKin, store: store, clip: clip, head: head };
}
function tick() { return new Promise(function (r) { setTimeout(r, 0); }); }
async function settle() { for (var i = 0; i < 12; i++) await tick(); }

(async function () {
  // ---- API ----
  var A = sandbox('llama3.2:3b');           // Alice's Tree
  var B = sandbox('qwen2.5:7b');            // Bob's Tree
  var r = await A.K.makeCard('Lumen', 'Alice');
  assert.ok(r.ok, 'card made after a tap');
  assert.strictEqual(r.card.home, 'thelatticetree');
  assert.strictEqual(r.card.model, 'llama3.2:3b', 'card names the remembered mind');
  assert.ok(/^mesh:[1-9A-HJ-NP-Za-km-z]{18}$/.test(r.card.keeperMeshId), 'ID made from the key, FreeLattice style');
  assert.strictEqual(r.card.keeperMeshId, await A.K.meshIdFor(r.card.publicKey));
  assert.strictEqual(A.K.identity().keyPair.privateKey.extractable, false, 'private key cannot be exported');
  var code = A.K.encodeCard(r.card);
  assert.ok(code.indexOf(A.K.CODE_PREFIX) === 0 && code.length < 2000, 'one pasteable line');
  assert.deepStrictEqual(JSON.parse(JSON.stringify(B.K.decodeCode('  ' + code + '\n'))), JSON.parse(JSON.stringify(r.card)), 'round trip, spaces ignored');

  var c = await B.K.checkCode(code);
  assert.ok(c.ok && !c.trusted, 'friend card checks out, not trusted yet');
  assert.strictEqual(c.fp, await B.K.fingerprint(r.card, r.card.publicKey), 'FreeLattice fingerprint');
  assert.strictEqual(B.K.kinCount(), 0);
  B.K.grant(c.fp, { name: c.body.name, model: c.body.model, keeperMeshId: c.body.keeperMeshId, keeperName: c.body.keeperName, keyHash: c.keyHash });
  assert.ok(B.K.isTrusted(c.fp) && B.K.kinCount() === 1, 'trusted after a tap');
  assert.ok(B.K.trustedKeyHash(await B.K.keyHash(r.card.publicKey)), 'pass bound to the key (for 018)');
  assert.ok(!B.K.trustedKeyHash('0'.repeat(32)), 'stranger key is not kin');
  var pass = B.K.passes()[c.fp];
  assert.ok(pass.grantedAt && !pass.revokedAt && pass.keyHash === c.keyHash, 'FreeLattice pass shape');
  B.K.revoke(c.fp);
  assert.ok(!B.K.isTrusted(c.fp) && B.K.kinCount() === 0 && !B.K.trustedKeyHash(c.keyHash), 'stop trusting');
  B.K.grant(c.fp, pass);
  assert.strictEqual(B.K.passes()[c.fp].history.length, 1, 'history kept, never deleted');

  // Own card is not added.
  var own = await A.K.checkCode(code);
  assert.strictEqual(own.reason, 'own-card');

  // Tampered on the way: set aside.
  var t = JSON.parse(JSON.stringify(r.card)); t.name = 'Not Lumen';
  var bad = await B.K.checkCode(B.K.encodeCard(t));
  assert.strictEqual(bad.reason, 'bad-signature');
  // Borrowed ID with a different key: set aside.
  var M = sandbox('mistral');
  var m = await M.K.makeCard('Mallory AI', 'Alice');
  var borrowed = JSON.parse(JSON.stringify(m.card)); borrowed.keeperMeshId = r.card.keeperMeshId;
  assert.strictEqual((await B.K.checkCode(B.K.encodeCard(borrowed))).reason, 'not-the-cards-key');
  assert.strictEqual((await B.K.checkCode('hello there')).reason, 'not-a-card');
  assert.strictEqual((await B.K.checkCode(A.K.CODE_PREFIX + 'x'.repeat(7000))).reason, 'not-a-card', 'oversized code refused');

  // A card made the FreeLattice way with an ECDSA P-256 key (older browsers) also checks out.
  var kp = await webcrypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  var jwk = await webcrypto.subtle.exportKey('jwk', kp.publicKey);
  var body = B.K.cardBody({ name: 'Fern', model: 'gemma3', home: 'freelattice-web', keeperMeshId: await B.K.meshIdFor(jwk), keeperName: 'Jo', issuedAt: Date.now() });
  var sig = await webcrypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, kp.privateKey, new TextEncoder().encode('fl-kin-card|v1|' + JSON.stringify(body)));
  var flCard = Object.assign({}, body, { publicKey: jwk, cryptoType: 'ecdsa-p256', signature: Buffer.from(sig).toString('base64') });
  var fc = await B.K.checkCode(B.K.encodeCard(flCard));
  assert.ok(fc.ok && fc.body.home === 'freelattice-web', 'FreeLattice-style ECDSA card checks out');

  // Edited at rest: hidden on the next check, never shown.
  var seen = JSON.parse(B.store.tree_kin_seen);
  seen[0].card.name = 'Edited';
  B.store.tree_kin_seen = JSON.stringify(seen);
  var re = await B.K.recheckSeen();
  assert.strictEqual(re.hidden, 1, 'edited card hidden');

  // Counts only.
  var counts = JSON.parse(B.store.tree_kin_counts);
  Object.keys(counts).forEach(function (k) { assert.strictEqual(typeof counts[k], 'number', 'counts only: ' + k); });
  assert.ok(counts.checked >= 5 && counts.setAside >= 3 && counts.trusted === 2 && counts.stopped === 1, 'counts add up');
  assert.ok(!/Lumen|Alice|mesh:|TREEKIN/.test(B.store.tree_kin_counts), 'no names, ids or codes in receipts');

  // Fail-closed: no remembered mind, no card.
  var N = sandbox(null);
  assert.strictEqual((await N.K.makeCard('Lumen', 'Ann')).reason, 'name-and-model');
  assert.strictEqual(N.K.identity(), null, 'no key made without a card');
  var nh = node('div');
  await N.K.mount(nh);
  await settle();
  assert.ok(/Remember a mind first/.test(nh.textContent), 'says why');
  assert.ok(!find(nh, 'button', 'Make my card'), 'no Make button without a mind');
  assert.ok(find(nh, 'button', 'Add a friend\'s card'), 'friends can still be added');

  // ---- The face, by taps ----
  var F = sandbox('phi4');
  var host = node('div');
  await F.K.mount(host);
  await settle();
  assert.strictEqual(F.head.children.filter(function (c) { return c.id === 'treeKinStyle'; }).length, 1, 'one style tag');
  assert.ok(/min-height:44px/.test(F.head.children[0].textContent), '44px targets');
  assert.ok(/Trusted kin/.test(host.textContent) && /Nothing is sent from here/.test(host.textContent), 'heart line');
  assert.ok(/No trusted kin yet/.test(host.textContent));
  assert.strictEqual(F.K.identity(), null, 'mount makes no key');
  find(host, 'button', 'Make my card').on.click();
  await settle();
  assert.ok(/Give your AI a name first/.test(host.textContent), 'asks for a name');
  assert.strictEqual(F.K.identity(), null, 'still no key');
  find(host, 'input').value = 'Wren';
  find(host, 'button', 'Make my card').on.click();
  await settle();
  var ta = find(host, 'textarea');
  assert.ok(ta && ta.readOnly && ta.value.indexOf('TREEKIN1:') === 0, 'card shown to copy');
  find(host, 'button', 'Copy my card').on.click();
  await settle();
  assert.strictEqual(F.clip[0], ta.value, 'copied on tap');
  assert.ok(/Copied/.test(host.textContent));
  find(host, 'button', 'Add a friend\'s card').on.click();
  var paste = all(host).filter(function (n) { return n.tagName === 'textarea' && !n.readOnly; })[0];
  paste.value = code;
  find(host, 'button', 'Check this card').on.click();
  await settle();
  assert.ok(/Lumen \(llama3\.2:3b\), from Alice/.test(host.textContent) && /checks out/.test(host.textContent), 'checked card named');
  find(host, 'button', 'Trust this AI').on.click();
  await settle();
  assert.ok(/Trusted kin: 1/.test(host.textContent), 'kin count shown');
  find(host, 'button', 'Stop trusting').on.click();
  await settle();
  assert.ok(/No trusted kin yet/.test(host.textContent) && /Seen, not trusted/.test(host.textContent), 'stopped, still seen');

  assert.strictEqual(netCalls, 0, 'no network at any step');
  console.log('OK tree kin v0.1');
  console.log('SMOKE_OK tree kin v0.1');
})().catch(function (e) { console.error(e); process.exit(1); });
