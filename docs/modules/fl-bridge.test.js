// fl-bridge.test.js (MIT) v-tree-bridge-knock-v0.1
// Node only. Same letter bytes as FreeLattice. This page never fetches.
var fs = require('fs');
var path = require('path');
var crypto = require('crypto');
var assert = require('assert');

var here = __dirname;
var src = fs.readFileSync(path.join(here, 'fl-bridge.js'), 'utf8');
assert.ok(src.indexOf('v-bridge-knock-v0.1') !== -1, 'marker');
assert.ok(src.indexOf('\u2014') === -1, 'em dash');
assert.ok(src.indexOf('&' + 'mdash;') === -1, 'mdash');
assert.ok(src.indexOf('inner' + 'HTML') === -1, 'text only');
assert.ok(src.indexOf('conf' + 'irm(') === -1, 'dialog');
assert.ok(src.indexOf('ev' + 'al(') === -1, 'eval');
assert.ok(src.indexOf('new F' + 'unction') === -1, 'Function');
['fe' + 'tch', 'XML' + 'HttpRequest', 'Web' + 'Socket', 'send' + 'Beacon'].forEach(function (needle) {
  assert.ok(src.indexOf(needle) === -1, 'no ' + needle);
});

function md5(file) {
  return crypto.createHash('md5').update(fs.readFileSync(file)).digest('hex');
}
var sibling = '/Users/kirkmiller/FreeLattice-fresh/docs/modules/fl-bridge.js';
if (fs.existsSync(sibling)) {
  assert.strictEqual(md5(path.join(here, 'fl-bridge.js')), md5(sibling), 'fl-bridge.js bytes match FreeLattice');
}

var bridge = require('./fl-bridge.js');
assert.strictEqual(bridge.isOn(), false, 'starts off');
assert.strictEqual(bridge.promptDelta(), '', 'off means no prompt delta');
assert.strictEqual(bridge.dbOpens(), 0, 'off means no IndexedDB open');
assert.strictEqual(bridge.hasDoor(), false, 'the Tree page has no desktop door');
var seen = bridge.consumeReply('Hi [FL_BRIDGE: {"op":"draft","subject":"s","body":"n"}] there');
assert.strictEqual(seen.drafted, false, 'off does not draft');
assert.ok(seen.visible.indexOf('[FL_BRIDGE') === -1, 'tag stripped');
assert.strictEqual(bridge.dbOpens(), 0, 'still no IndexedDB');

var thread = fs.readFileSync(path.join(here, 'garden-thread.js'), 'utf8');
assert.ok(thread.indexOf('FLBridge.consumeReply') !== -1, 'the thread strips a letter tag');
var settings = fs.readFileSync(path.join(here, '../settings.html'), 'utf8');
assert.ok(settings.indexOf('modules/fl-bridge.js') !== -1, 'settings loads the letter module');
assert.ok(settings.indexOf('v-tree-bridge-knock-v0.1') !== -1, 'tree marker');

console.log('SMOKE_OK tree bridge knock v0.1');
