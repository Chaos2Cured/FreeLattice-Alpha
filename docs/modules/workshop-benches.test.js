// Node smoke for Workshop benches honesty.
// Git toggle defaults OFF. Nothing leaves. No tokens. No invented code.
// Fail-closed until a mind is remembered. No kitchen. No network.

var fs = require('fs');
var path = require('path');
var vm = require('vm');
var assert = require('assert');

var store = {};
var localStorage = {
  getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
  setItem: function (k, v) { store[k] = String(v); },
  removeItem: function (k) { delete store[k]; },
  get length() { return Object.keys(store).length; },
  key: function (i) { return Object.keys(store)[i] || null; }
};

var document = {
  body: { appendChild: function () {}, removeChild: function () {} },
  createElement: function (tag) {
    var node = {
      tag: tag,
      className: '',
      textContent: '',
      hidden: false,
      disabled: false,
      readOnly: false,
      checked: false,
      value: '',
      placeholder: '',
      innerHTML: '',
      style: {},
      childNodes: [],
      setAttribute: function (name, val) { this[name] = val; },
      getAttribute: function (name) { return this[name] == null ? null : this[name]; },
      removeAttribute: function (name) { delete this[name]; },
      appendChild: function (child) { this.childNodes.push(child); return child; },
      addEventListener: function () {},
      click: function () {},
      blur: function () {},
      focus: function () {},
      querySelector: function () { return null; }
    };
    return node;
  }
};

var windowObj = {
  LocalMindProbe: { getRemembered: function () { return null; } },
  GardenThread: {
    listener: function () { return windowObj.LocalMindProbe.getRemembered(); },
    sendToMind: function () { return Promise.reject({ reason: 'fail' }); }
  },
  addEventListener: function () {},
  dispatchEvent: function () {},
  confirm: function () { return false; }
};

var sandbox = {
  window: windowObj,
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
  AbortController: typeof AbortController !== 'undefined' ? AbortController : function () {
    this.abort = function () {};
    this.signal = {};
  }
};
windowObj.localStorage = localStorage;
sandbox.window = windowObj;

var code = fs.readFileSync(path.join(__dirname, 'workshop-benches.js'), 'utf8');
vm.runInNewContext(code, sandbox);

var WB = sandbox.window.WorkshopBenches;
assert.ok(WB, 'WorkshopBenches mounts on window');

function check(name, fn) {
  fn();
  console.log('ok  ' + name);
}

check('git toggle defaults OFF', function () {
  delete store[WB.GIT_PUSH_KEY];
  assert.equal(WB.isGitPushOn(), false);
  assert.equal(WB.GIT_OFF.indexOf('Nothing leaves this machine') !== -1, true);
});

check('git toggle OFF refuses commit and push; nothing left', function () {
  WB.setGitPushOn(false);
  var commit = WB.requestCommit();
  var push = WB.requestPush({ confirmed: true });
  assert.equal(commit.ok, false);
  assert.equal(commit.left, false);
  assert.equal(commit.reason, 'off');
  assert.equal(push.ok, false);
  assert.equal(push.left, false);
  assert.equal(push.reason, 'off');
});

check('git toggle ON still needs confirm before push', function () {
  WB.setGitPushOn(true);
  assert.equal(WB.isGitPushOn(), true);
  var waiting = WB.requestPush({ confirmed: false });
  assert.equal(waiting.ok, false);
  assert.equal(waiting.left, false);
  assert.equal(waiting.reason, 'needs-confirm');
});

check('git toggle ON and confirmed still has no local git door', function () {
  WB.setGitPushOn(true);
  var pushed = WB.requestPush({ confirmed: true });
  assert.equal(pushed.ok, false);
  assert.equal(pushed.left, false);
  assert.equal(pushed.reason, 'no-door');
  assert.equal(pushed.message.indexOf('Tokens were not stored') !== -1, true);
  var committed = WB.requestCommit();
  assert.equal(committed.ok, false);
  assert.equal(committed.left, false);
  assert.equal(committed.reason, 'no-door');
});

check('no tokens stored on the page', function () {
  WB.setGitPushOn(true);
  WB.requestPush({ confirmed: true });
  assert.equal(WB.tokenKeysPresent(store), false);
  assert.equal(Object.prototype.hasOwnProperty.call(store, 'fl_publish_token'), false);
  var names = Object.keys(store).join(' ');
  assert.equal(/token|github|pat|secret/i.test(names), false);
});

check('sandbox is allow-scripts only — no invented generate', function () {
  assert.equal(WB.sandboxAttr(), 'allow-scripts');
  assert.equal(WB.SANDBOX.indexOf('allow-same-origin'), -1);
  assert.equal(WB.HEART_LATER.indexOf('galaxy builder') !== -1, true);
});

check('extractCode does not invent code', function () {
  var empty = WB.extractCode('');
  assert.equal(empty.code, '');
  assert.equal(empty.words, '');
  var words = WB.extractCode('I cannot write that.');
  assert.equal(words.code, '');
  assert.equal(words.words, 'I cannot write that.');
  var fenced = WB.extractCode('```html\n<h1>hi</h1>\n```');
  assert.equal(fenced.code, '<h1>hi</h1>');
  var doc = WB.extractCode('<!DOCTYPE html><html></html>');
  assert.equal(doc.code.indexOf('<!DOCTYPE html>') === 0, true);
});

check('fail-closed heart until a mind is remembered', function () {
  windowObj.LocalMindProbe.getRemembered = function () { return null; };
  assert.equal(WB.listener(), null);
  assert.equal(WB.speakHonest('none'), WB.HEART_NONE);
  windowObj.LocalMindProbe.getRemembered = function () {
    return { name: 'Ollama', url: 'http://127.0.0.1:11434/api/tags' };
  };
  assert.equal(WB.listener().name, 'Ollama');
});

check('no invented reply when the door is quiet or blocked', function () {
  assert.equal(WB.speakHonest('quiet').indexOf('Nothing was invented') !== -1, true);
  assert.equal(WB.speakHonest('blocked').indexOf('Nothing was invented') !== -1, true);
  assert.equal(WB.speakHonest('fail').indexOf('Nothing was invented') !== -1, true);
});

console.log('\nWorkshop benches honesty holds.');
