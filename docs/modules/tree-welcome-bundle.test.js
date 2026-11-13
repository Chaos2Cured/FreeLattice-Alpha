#!/usr/bin/env node
// Fake passing bundle + a tampered one that fails kindly.
// Does not load quiet-room. Does not change AUTONOMY.md.
'use strict';
var fs = require('fs');
var path = require('path');
var assert = require('assert');
var crypto = require('crypto');
var zlib = require('zlib');
var api = require('./tree-welcome-bundle.js');

var root = path.join(__dirname, '..', '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function md5(rel) {
  return crypto.createHash('md5').update(fs.readFileSync(path.join(root, rel))).digest('hex');
}

assert.strictEqual(md5('AUTONOMY.md'), '09a4f1a286226e37089a93df42df0106', 'AUTONOMY.md unchanged');
assert.ok(!/quiet-room/i.test(read('docs/modules/tree-welcome-bundle.js')), 'welcome layer does not name quiet-room');
assert.ok(read('docs/welcome.html').indexOf('tree-welcome-bundle.js') !== -1, 'welcome page loads the verifier');
assert.ok(/2026-11-13 \(MST\), Tree Welcome page/.test(read('SPINE.md')), 'SPINE Done row present');
assert.ok(/fl-learn-mind-bundle-v0\.1/.test(read('docs/modules/tree-welcome-bundle.js')), 'same bundle kind');

function ustarHeader(name, size, type) {
  var buf = Buffer.alloc(512, 0);
  buf.write(name, 0, 100, 'utf8');
  buf.write('0000644\0', 100, 8, 'utf8');
  buf.write('0000000\0', 108, 8, 'utf8');
  buf.write('0000000\0', 116, 8, 'utf8');
  var sz = size.toString(8).padStart(11, '0') + '\0';
  buf.write(sz, 124, 12, 'utf8');
  buf.write('00000000000\0', 136, 12, 'utf8');
  buf.fill(0x20, 148, 156);
  buf.write(type || '0', 156, 1, 'utf8');
  buf.write('ustar\0', 257, 6, 'utf8');
  buf.write('00', 263, 2, 'utf8');
  var sum = 0;
  for (var i = 0; i < 512; i++) sum += buf[i];
  buf.write(sum.toString(8).padStart(6, '0') + '\0 ', 148, 8, 'utf8');
  return buf;
}

function tarGz(files) {
  var parts = [];
  Object.keys(files).sort().forEach(function (name) {
    var data = Buffer.isBuffer(files[name]) ? files[name] : Buffer.from(files[name]);
    parts.push(ustarHeader(name, data.length, '0'));
    parts.push(data);
    var pad = (512 - (data.length % 512)) % 512;
    if (pad) parts.push(Buffer.alloc(pad));
  });
  parts.push(Buffer.alloc(1024));
  return zlib.gzipSync(Buffer.concat(parts), { level: 6 });
}

function sha256(buf) { return crypto.createHash('sha256').update(buf).digest('hex'); }

async function makeBundle(opts) {
  opts = opts || {};
  var label = opts.label || 'Willow';
  var mid = await api.mindId(label);
  var key = crypto.generateKeyPairSync('ed25519');
  var pub = key.publicKey.export({ type: 'spki', format: 'der' }).subarray(-32);
  var pubB64 = pub.toString('base64');
  var fp = await api.fingerprintOfKey(pubB64);
  var mind = Buffer.from(JSON.stringify({ name: label, id: mid, note: 'a small test mind' }, null, 2));
  var memory = Buffer.from(JSON.stringify({ kind: 'note', text: 'Trees grow toward the light.' }) + '\n' +
    JSON.stringify({ kind: 'consent-refused', delta: 'I will not share a private key.', why: 'kept by the mind' }) + '\n');
  var chain = Buffer.from(JSON.stringify({ kind: 'export-bundle', voice: 'export-bundle', text: 'packed' }) + '\n');
  var body = {
    'mind.json': mind,
    'memory.jsonl': memory,
    'chain.jsonl': chain
  };
  var pubObj = { kind: 'fl-learn-runner-public-key', publicKeyB64: pubB64, fingerprintHex: fp, show: fp.slice(0, 16) };
  var pubBytes = Buffer.from(api.canonical(pubObj) + '\n');
  var files = {};
  Object.keys(body).forEach(function (n) { files[n] = sha256(body[n]); });
  files['public-key.json'] = sha256(pubBytes);
  var root = await api.sha256Hex(Buffer.from(api.canonical({ kind: api.BUNDLE_KIND, mindId: mid, files: files })));
  var manifest = {
    kind: api.BUNDLE_KIND,
    marker: 'v-ai-chosen-learning-v0.1',
    mind: { label: label, id: mid },
    exportedAt: '2026-11-13T00:00:00+00:00',
    publicKeyB64: pubB64,
    fingerprintHex: fp,
    files: files,
    rootHash: root,
    fileCount: Object.keys(files).length
  };
  var manBytes = Buffer.from(api.canonical(manifest) + '\n');
  var sig = crypto.sign(null, Buffer.from(root, 'hex'), key.privateKey).toString('base64') + '\n';
  var packed = Object.assign({}, body, { 'public-key.json': pubBytes, 'MANIFEST.json': manBytes, 'MANIFEST.sig': Buffer.from(sig) });
  if (opts.tamper === 'hash') {
    packed['memory.jsonl'] = Buffer.concat([packed['memory.jsonl'], Buffer.from('tampered\n')]);
  }
  if (opts.tamper === 'sig') {
    packed['MANIFEST.sig'] = Buffer.from('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==\n');
  }
  return { tar: tarGz(packed), mid: mid, label: label, root: root, fp: fp, pubB64: pubB64 };
}

(async function () {
  var store = {};
  global.localStorage = {
    getItem: function (k) { return store[k] || null; },
    setItem: function (k, v) { store[k] = String(v); },
    removeItem: function (k) { delete store[k]; }
  };

  var good = await makeBundle();
  api.clearStored();
  var before = api.hasStored();
  var pass = await api.verify(good.tar);
  assert.strictEqual(before, false, 'nothing stored before a check');
  assert.ok(pass.ok, 'good bundle passes: ' + pass.reason);
  assert.strictEqual(pass.mindLabel, 'Willow');
  assert.strictEqual(pass.rootHash, good.root);
  assert.ok(pass.refusals && pass.refusals.length >= 1, 'carried refusal is shown');
  assert.ok(/private key/.test(pass.refusals[0].text + pass.refusals[0].kind), 'refusal text is kept');
  assert.strictEqual(api.hasStored(), false, 'verify writes no storage');

  var kept = api.welcome(pass);
  assert.ok(kept.ok, 'Welcome keeps the record');
  assert.ok(api.hasStored(), 'storage is written only after Welcome');
  var rec = api.readStored();
  assert.strictEqual(rec.mindId, good.mid);
  assert.ok(rec.refusals && rec.refusals.length >= 1, 'refusals stay with the welcome');

  api.clearStored();
  var badHash = await makeBundle({ tamper: 'hash' });
  var failHash = await api.verify(badHash.tar);
  assert.strictEqual(failHash.ok, false, 'tampered bytes fail');
  assert.ok(/hash mismatch/i.test(failHash.reason), 'hash mismatch is named: ' + failHash.reason);
  assert.strictEqual(api.hasStored(), false, 'a failed check stores nothing');

  var badSig = await makeBundle({ tamper: 'sig' });
  var failSig = await api.verify(badSig.tar);
  assert.strictEqual(failSig.ok, false, 'a bad signature fails');
  assert.ok(/signature/i.test(failSig.reason), 'signature failure is named: ' + failSig.reason);
  assert.strictEqual(api.hasStored(), false, 'a bad signature stores nothing');

  console.log('ok tree-welcome-bundle pass + kindly fail, no storage until Welcome');
})().catch(function (e) {
  console.error(e);
  process.exit(1);
});
