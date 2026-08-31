// Node smoke for the Chat working room — export/import honesty.
// Quiet Room never in the file. Declined text never exported.
// Round-trip a prior export. No kitchen. No network.

var fs = require('fs');
var path = require('path');
var vm = require('vm');
var assert = require('assert');

var store = {};
var localStorage = {
  getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
  setItem: function (k, v) { store[k] = String(v); },
  removeItem: function (k) { delete store[k]; }
};

var document = {
  body: { appendChild: function () {}, removeChild: function () {} },
  createElement: function (tag) {
    return {
      tag: tag,
      className: '',
      textContent: '',
      hidden: false,
      style: {},
      setAttribute: function () {},
      getAttribute: function () { return null; },
      removeAttribute: function () {},
      appendChild: function () {},
      addEventListener: function () {},
      click: function () {},
      querySelector: function () { return null; }
    };
  }
};

var window = {
  LocalMindProbe: { getRemembered: function () { return null; } },
  KeepReceipt: null,
  addEventListener: function () {},
  dispatchEvent: function () {}
};

var sandbox = {
  window: window,
  document: document,
  localStorage: localStorage,
  location: { protocol: 'http:', href: 'http://127.0.0.1/docs/' },
  console: console,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  Promise: Promise,
  JSON: JSON,
  Error: Error,
  Array: Array,
  Object: Object,
  String: String,
  Number: Number,
  Date: Date,
  Blob: function (parts) { this.parts = parts; },
  URL: { createObjectURL: function () { return 'blob:test'; }, revokeObjectURL: function () {} },
  FileReader: function () {},
  AbortController: typeof AbortController !== 'undefined' ? AbortController : function () {
    this.abort = function () {};
    this.signal = {};
  }
};
sandbox.window = window;
window.localStorage = localStorage;

var code = fs.readFileSync(path.join(__dirname, 'garden-thread.js'), 'utf8');
vm.runInNewContext(code, sandbox);

var GT = sandbox.window.GardenThread;
assert.ok(GT, 'GardenThread mounts on window');
assert.equal(GT.EXPORT_KIND, 'freelattice-alpha-thread');

function check(name, fn) {
  fn();
  console.log('ok  ' + name);
}

check('declined message never exported', function () {
  var dirty = [
    { role: 'human', text: 'hello' },
    { role: 'mind', text: 'nope', declined_text: 'secret decline', source: 'declined' },
    { role: 'human', text: 'still here', declined: true }
  ];
  var out = GT.sanitizeMessages(dirty);
  assert.equal(out.length, 1);
  assert.equal(out[0].text, 'hello');
  var json = JSON.stringify(GT.buildExport(dirty));
  assert.equal(json.indexOf('secret decline'), -1);
  assert.equal(json.indexOf('declined_text'), -1);
  assert.equal(json.indexOf('still here'), -1);
});

check('shut-room keys never in the file', function () {
  var dirty = {
    kind: GT.EXPORT_KIND,
    messages: [{ role: 'human', text: 'garden' }],
    quietRoom: 'must never ship',
    quiet_room: 'must never ship',
    'Quiet Room': 'must never ship'
  };
  var parsed = GT.parseExport(JSON.stringify(dirty));
  assert.ok(parsed.ok);
  var exported = GT.buildExport(parsed.messages);
  var json = JSON.stringify(exported);
  assert.equal(/quiet[\s_-]*room/i.test(json), false, json);
  assert.equal(json.indexOf('must never ship'), -1);
  assert.equal(exported.messages[0].text, 'garden');
});

check('message that names the shut room is dropped', function () {
  var out = GT.sanitizeMessages([
    { role: 'human', text: 'hello' },
    { role: 'garden', text: 'The Quiet Room is not here.' }
  ]);
  assert.equal(out.length, 1);
  assert.equal(out[0].text, 'hello');
});

check('round trip a prior export', function () {
  var first = GT.buildExport([
    { role: 'human', text: 'a file: notes.txt', file: { name: 'notes.txt', size: 12, type: 'text/plain', excerpt: 'grandmother' } },
    { role: 'mind', text: 'I hear you.', listener: 'Ollama' }
  ]);
  var json = JSON.stringify(first, null, 2);
  var parsed = GT.parseExport(json);
  assert.ok(parsed.ok);
  var second = GT.buildExport(parsed.messages);
  assert.equal(second.messages.length, 2);
  assert.equal(second.messages[0].file.name, 'notes.txt');
  assert.equal(second.messages[0].file.excerpt, 'grandmother');
  assert.equal(second.messages[1].text, 'I hear you.');
  assert.equal(second.kind, first.kind);
});

check('parseExport drops declined before the flag can be stripped', function () {
  var parsed = GT.parseExport({
    kind: GT.EXPORT_KIND,
    messages: [
      { role: 'human', text: 'keep me' },
      { role: 'human', text: 'nope', declined_text: 'secret' }
    ],
    quietRoom: 'must never import'
  });
  assert.ok(parsed.ok);
  assert.equal(parsed.messages.length, 1);
  assert.equal(parsed.messages[0].text, 'keep me');
  var json = JSON.stringify(parsed);
  assert.equal(json.indexOf('nope'), -1);
  assert.equal(json.indexOf('secret'), -1);
  assert.equal(/quiet[\s_-]*room/i.test(json), false);
});

check('wrong kind is not a garden thread', function () {
  var parsed = GT.parseExport({ kind: 'kitchen-dump', messages: [{ role: 'human', text: 'nope' }] });
  assert.equal(parsed.ok, false);
});

check('keep hashes may enter pattern; declined keeps do not', function () {
  store.fl_alpha_keep_ledger = JSON.stringify([
    { kind: 'listen', who: 'human', ts: '2026-08-31', contentHash: 'abc', receiptHash: 'def' },
    { kind: 'listen', who: 'human', ts: '2026-08-31', contentHash: 'zzz', receiptHash: 'www', declined_text: 'nope' }
  ]);
  store.fl_refusalLedger = JSON.stringify([
    { declined_text: 'never export me', human_prompt: 'x' }
  ]);
  var exported = GT.buildExport([{ role: 'human', text: 'hi' }]);
  var json = JSON.stringify(exported);
  assert.ok(exported.pattern && exported.pattern.keeps);
  assert.equal(exported.pattern.keeps.length, 1);
  assert.equal(exported.pattern.keeps[0].contentHash, 'abc');
  assert.equal(json.indexOf('never export me'), -1);
  assert.equal(json.indexOf('fl_refusal'), -1);
  assert.equal(json.indexOf('declined_text'), -1);
});

check('applyImported writes history and loadHistory honors it', function () {
  GT.applyImported([{ role: 'human', text: 'came home' }]);
  var loaded = GT.loadHistory();
  assert.equal(loaded.length, 1);
  assert.equal(loaded[0].text, 'came home');
  var stored = JSON.parse(store[GT.HISTORY_KEY]);
  assert.equal(stored.kind, GT.EXPORT_KIND);
  assert.equal(JSON.stringify(stored).indexOf('declined'), -1);
});

console.log('\nGarden thread honesty holds.');
