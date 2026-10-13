// particle-clay.test.js (MIT) v-tree-particle-clay-v0.1
// Node only. Same clay bytes as FreeLattice when that tree sits beside this one.
var fs = require('fs');
var path = require('path');
var crypto = require('crypto');
var assert = require('assert');

var here = __dirname;
function md5(file) {
  return crypto.createHash('md5').update(fs.readFileSync(file)).digest('hex');
}

['clay-math.js', 'clay-forms.js', 'particle-clay.js'].forEach(function (name) {
  var src = fs.readFileSync(path.join(here, name), 'utf8');
  assert.ok(src.indexOf('\u2014') === -1, name + ' em dash');
  assert.ok(!new RegExp('&' + 'mdash;').test(src), name + ' mdash');
  assert.ok(!new RegExp('\\.' + 'inner' + 'HTML').test(src), name + ' text only');
  assert.ok(!new RegExp('conf' + 'irm\\(').test(src), name + ' dialog');
  assert.ok(!new RegExp('\\beval\\s*\\(').test(src), name + ' eval');
  assert.ok(!new RegExp('new\\s+Function\\s*\\(').test(src), name + ' Function');
});

var claySrc = fs.readFileSync(path.join(here, 'particle-clay.js'), 'utf8');
assert.ok(claySrc.indexOf('v-particle-clay-v0.1') !== -1, 'marker');
assert.ok(claySrc.indexOf('v-feel-felt-v0.1') !== -1, 'feel marker');
assert.ok(!/\bpet\b/i.test(claySrc) && !/companion/i.test(claySrc), 'no pet framing');

var sibling = '/Users/kirkmiller/FreeLattice-fresh/docs/modules';
if (fs.existsSync(path.join(sibling, 'particle-clay.js'))) {
  ['clay-math.js', 'clay-forms.js', 'particle-clay.js'].forEach(function (name) {
    assert.strictEqual(md5(path.join(here, name)), md5(path.join(sibling, name)), name + ' bytes match FreeLattice');
  });
}

var thread = fs.readFileSync(path.join(here, 'garden-thread.js'), 'utf8');
var hook = 'FLClay.onReply(messages[messages.length - 1].text, messages)';
assert.strictEqual(thread.split(hook).length, 2, 'one reply hook');

['index.html', 'settings.html', 'workshop.html', 'research.html', 'music.html', 'round-table.html', 'nursery.html'].forEach(function (page) {
  var html = fs.readFileSync(path.join(here, '..', page), 'utf8');
  var mathAt = html.indexOf('modules/clay-math.js');
  var formsAt = html.indexOf('modules/clay-forms.js');
  var clayAt = html.indexOf('modules/particle-clay.js');
  assert.ok(mathAt !== -1 && formsAt > mathAt && clayAt > formsAt, page + ' loads clay');
  if (page !== 'nursery.html') {
    var threadAt = html.indexOf('modules/garden-thread.js');
    assert.ok(clayAt < threadAt, page + ' clay before the thread');
  }
});

Object.defineProperty(global, 'localStorage', {
  value: { getItem: function () { return null; }, setItem: function () {} },
  writable: true,
  configurable: true
});
global.document = {
  documentElement: {
    getAttribute: function (name) {
      if (name === 'data-garden-room' || name === 'data-garden-galaxy') return 'garden';
      return null;
    }
  }
};
var clay = require('./particle-clay.js');
var fell = clay.fallback('nothing here', '', 'hello');
assert.strictEqual(fell.form, 'seed', 'garden home form is seed');
assert.strictEqual(clay.isOn(), false, 'clay starts off');
assert.strictEqual(clay.promptDelta(), '', 'off means no prompt delta');
assert.strictEqual(clay.autoSend(), false, 'nothing sends itself');

var locks = {
  'fl-connect.js': 'aaff2bf1b037656989a9e1a89bb05908',
  'pool-knock.js': 'a0a72caad82c8e5cc34818d5e59eba2b',
  'pool-knock-phone.js': 'a8024f341486a78558ef4158bc9e93a9',
  'tree-reconnect.js': 'cc0527c26d5686c05fec52625d5a1375'
};
Object.keys(locks).forEach(function (name) {
  assert.strictEqual(md5(path.join(here, name)), locks[name], name + ' untouched');
});

console.log('SMOKE_OK tree particle clay v0.1');
