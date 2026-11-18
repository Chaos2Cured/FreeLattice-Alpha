// tree-make-picture-click.test.js (MIT) v-clay-voice-brush-1-v0.1
// Node only. Confirms index.html loads chat-bottom-clarity.js, and that
// after that module boots, handleImageGenClick routes to the Settings door.
var fs = require('fs');
var path = require('path');
var assert = require('assert');
var vm = require('vm');

var here = __dirname;
var docs = path.join(here, '..');
var index = fs.readFileSync(path.join(docs, 'index.html'), 'utf8');
assert.ok(index.indexOf('modules/chat-bottom-clarity.js') !== -1, 'index.html loads chat-bottom-clarity.js');

var loc = { href: 'index.html' };
var sandbox = {
  console: console,
  document: {
    readyState: 'complete',
    addEventListener: function () {},
    getElementById: function () { return null; },
    querySelector: function () { return null; },
    createElement: function () { return { style: {}, setAttribute: function () {}, appendChild: function () {} }; },
    createElementNS: function () { return { setAttribute: function () {}, appendChild: function () {} }; }
  },
  addEventListener: function () {},
  window: null,
  location: loc,
  module: { exports: {} },
  exports: {},
  globalThis: null,
  MutationObserver: function () { this.observe = function () {}; this.disconnect = function () {}; }
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.runInNewContext(fs.readFileSync(path.join(here, 'chat-bottom-clarity.js'), 'utf8'), sandbox, { filename: 'chat-bottom-clarity.js' });
assert.strictEqual(typeof sandbox.handleImageGenClick, 'function', 'handler defined at module load (before or after Gathering)');
sandbox.handleImageGenClick();
assert.strictEqual(loc.href, 'settings.html#tree-image-door-host', 'routes to the Settings image door');
console.log('SMOKE_OK tree make-a-picture click routes to settings.html#tree-image-door-host');
