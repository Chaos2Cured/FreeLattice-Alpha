// Node smoke for Round Table sitting honesty.
// Fail-closed until a mind is remembered. Sitting is a who.
// Words only. No Sit button. No invented specialists. No invented
// consensus. No LP. No wallet. No kitchen. No network.

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
      value: '',
      placeholder: '',
      innerHTML: '',
      style: {},
      childNodes: [],
      classList: {
        add: function () {},
        remove: function () {},
        contains: function () { return false; }
      },
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
  LocalMindProbe: {
    getRemembered: function () { return null; },
    getRememberedMinds: function () { return []; }
  },
  GardenThread: {
    listener: function () { return windowObj.LocalMindProbe.getRemembered(); },
    sendToMind: function () { return Promise.reject({ reason: 'fail' }); }
  },
  addEventListener: function () {},
  dispatchEvent: function () {}
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
  Date: Date
};
windowObj.localStorage = localStorage;
sandbox.window = windowObj;

var src = fs.readFileSync(path.join(__dirname, 'round-table-sitting.js'), 'utf8');
vm.runInNewContext(src, sandbox);

var RT = sandbox.window.RoundTableSitting;
assert.ok(RT, 'RoundTableSitting mounts on window');

function check(name, fn) {
  fn();
  console.log('ok  ' + name);
}

check('fail-closed heart until a mind is remembered', function () {
  windowObj.LocalMindProbe.getRemembered = function () { return null; };
  windowObj.LocalMindProbe.getRememberedMinds = function () { return []; };
  assert.equal(RT.listener(), null);
  assert.equal(RT.sitters().length, 0);
  assert.equal(RT.speakHonest('none'), RT.HEART_NONE);
  assert.equal(RT.heartFor([]), RT.HEART_NONE);
  windowObj.LocalMindProbe.getRemembered = function () {
    return { name: 'Ollama', url: 'http://127.0.0.1:11434/api/tags' };
  };
  windowObj.LocalMindProbe.getRememberedMinds = function () {
    return [{ name: 'Ollama', url: 'http://127.0.0.1:11434/api/tags' }];
  };
  assert.equal(RT.listener().name, 'Ollama');
  assert.equal(RT.sitters().length, 1);
});

check('sitting is a who — a person at this table, not a topic, not a time', function () {
  assert.equal(RT.SITTING_WHO.indexOf('a person at this table') !== -1, true);
  assert.equal(RT.SITTING_WHO.indexOf('Not a topic') !== -1, true);
  assert.equal(RT.SITTING_WHO.indexOf('Not a time') !== -1, true);
  assert.equal(RT.QUESTION_HONESTY.indexOf('until someone sits') !== -1, true);
  assert.equal(RT.QUESTION_HONESTY.indexOf('Not a topic') !== -1, true);
  var empty = RT.whoLine([]);
  assert.equal(empty.indexOf('The chairs wait') !== -1, true);
  assert.equal(empty.indexOf('a person at this table') !== -1, true);
  var one = RT.whoLine([{ name: 'Ollama', url: 'http://127.0.0.1:11434' }]);
  assert.equal(one.indexOf('At this table: Ollama') !== -1, true);
  assert.equal(one.indexOf('A person at this table') !== -1, true);
  assert.equal(one.indexOf('Not a topic') !== -1, true);
  assert.equal(one.indexOf('Not a time') !== -1, true);
});

check('one remembered mind is enough; more than one may sit together', function () {
  var two = RT.whoLine([
    { name: 'Ollama', url: 'http://127.0.0.1:11434' },
    { name: 'LM Studio', url: 'http://127.0.0.1:1234' }
  ]);
  assert.equal(two.indexOf('Ollama') !== -1, true);
  assert.equal(two.indexOf('LM Studio') !== -1, true);
  assert.equal(two.indexOf('sit together') !== -1, true);
  assert.equal(two.indexOf('No invented consensus') !== -1, true);
  var heart = RT.heartFor([
    { name: 'Ollama', url: 'http://127.0.0.1:11434' }
  ]);
  assert.equal(heart.indexOf('Sitting with: Ollama') !== -1, true);
  assert.equal(heart.indexOf('A person at this table') !== -1, true);
});

check('no Sit button, no invented specialists, no LP, no wallet', function () {
  assert.equal(RT.HAS_SIT_BUTTON, false);
  assert.equal(RT.HAS_LP_PLANT, false);
  assert.equal(RT.HAS_WALLET, false);
  assert.equal(RT.inventedSpecialists([]).length, 0);
  assert.equal(RT.inventedSpecialists([{ name: 'Ollama' }]).length, 0);
  assert.equal(src.indexOf("textContent, 'Sit'") === -1, true);
  assert.equal(/el\('button',\s*'[^']*',\s*'Sit'\)/.test(src), false);
  assert.equal(src.indexOf("'Speak'") !== -1, true);
  RT.INVENTED_NAMES.forEach(function (name) {
    var line = RT.whoLine([{ name: 'Ollama', url: 'http://127.0.0.1:11434' }]);
    assert.equal(line.indexOf(name), -1, 'did not invent ' + name);
  });
});

check('no invented consensus, no invented reply', function () {
  assert.equal(RT.inventConsensus(), null);
  assert.equal(RT.NO_CONSENSUS.indexOf('No invented consensus') !== -1, true);
  assert.equal(RT.speakHonest('quiet').indexOf('Nothing was invented') !== -1, true);
  assert.equal(RT.speakHonest('blocked').indexOf('Nothing was invented') !== -1, true);
  assert.equal(RT.speakHonest('fail').indexOf('Nothing was invented') !== -1, true);
  assert.equal(RT.HEART_LATER.indexOf('joy first') !== -1, true);
  assert.equal(RT.HEART_LATER.indexOf('No wallet') !== -1, true);
  assert.equal(RT.HEART_LATER.indexOf('Kindling stays the chair') !== -1, true);
});

check('fail-closed mount sleeps Speak; no Sit; sitting copy stays', function () {
  windowObj.LocalMindProbe.getRemembered = function () { return null; };
  windowObj.LocalMindProbe.getRememberedMinds = function () { return []; };
  var host = document.createElement('div');
  var root = RT.mount(host);
  assert.ok(root);
  assert.equal(root.getAttribute('data-rt-asleep'), '1');
  assert.equal(root.getAttribute('aria-disabled'), 'true');
  var texts = [];
  function walk(node) {
    if (!node) return;
    if (node.textContent) texts.push(node.textContent);
    (node.childNodes || []).forEach(walk);
  }
  walk(root);
  var joined = texts.join(' | ');
  assert.equal(joined.indexOf('Sit') === -1 || joined.indexOf('Sitting') !== -1, true);
  assert.equal(joined.indexOf('Speak') !== -1, true);
  assert.equal(joined.indexOf('a person at this table') !== -1, true);
  assert.equal(joined.indexOf('Settings') !== -1, true);
  var foundSitBtn = false;
  (root.childNodes || []).forEach(function (n) {
    if (n.tag === 'button' && n.textContent === 'Sit') foundSitBtn = true;
  });
  assert.equal(foundSitBtn, false);
  RT.unmount();
});

console.log('\nRound Table sitting honesty holds.');
