// tree-learn-choice.test.js — Tree port #5 wiring. Does not open quiet-room.js.
// Does not run tests/smoke.js.
'use strict';
var fs = require('fs');
var path = require('path');
var crypto = require('crypto');
var assert = require('assert');
var ROOT = path.join(__dirname, '..', '..');
function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }
function md5(rel) { return crypto.createHash('md5').update(fs.readFileSync(path.join(ROOT, rel))).digest('hex'); }

assert.strictEqual(md5('docs/modules/learn-choice.js'), 'ab15ab5eb60afbb494ed8f7eeefc5a54',
  'learn-choice.js is byte-identical to FreeLattice v-ai-chosen-learning-v0.1');
assert.strictEqual(md5('docs/modules/snowflake-core.js'), 'f69ac9c4e393a620057f6a6b080dcf50',
  'snowflake-core.js is byte-identical to FreeLattice (includes v-ai-chosen-learning-v0.1)');
assert.strictEqual(md5('docs/modules/memory-compound.js'), '4fb4e138e46098f88d8155f59005c192',
  'memory-compound.js is byte-identical to FreeLattice v-memory-compound-v0.1');
assert.ok(fs.existsSync(path.join(ROOT, 'tools/learn/fl_learn.py')), 'tools/learn/fl_learn.py is the only runner');
assert.ok(fs.existsSync(path.join(ROOT, 'tools/learn/README.md')), 'tools/learn README is present');
assert.strictEqual(md5('docs/modules/mind-make.js'), '701fd53d432db956c6192415c56871d5',
  'mind-make.js is byte-identical (needed by the FL Settings-pause smoke; not hooked on Tree pages)');
['docs/index.html', 'docs/settings.html'].forEach(function (rel) {
  assert.ok(read(rel).indexOf('modules/mind-make.js') === -1, rel + ' does not load mind-make.js');
});


['docs/index.html', 'docs/settings.html'].forEach(function (rel) {
  var html = read(rel);
  assert.ok(html.indexOf('modules/memory-compound.js') !== -1, rel + ' loads memory-compound.js');
  assert.ok(html.indexOf('modules/snowflake-core.js') !== -1, rel + ' loads snowflake-core.js');
  assert.ok(html.indexOf('modules/learn-choice.js') !== -1, rel + ' loads learn-choice.js');
  assert.ok(html.indexOf('modules/tree-learn-choice.js') !== -1, rel + ' loads the Tree layer');
});
assert.ok(read('docs/settings.html').indexOf('tree-learn-choice-host') !== -1, 'settings has a host for the learning note');
assert.ok(!fs.existsSync(path.join(ROOT, 'docs/modules/quiet-room.js')), 'quiet-room.js was not added');
assert.strictEqual(md5('AUTONOMY.md'), '09a4f1a286226e37089a93df42df0106', 'AUTONOMY.md unchanged');
assert.strictEqual(md5('docs/modules/fl-gathering.js'), '4dbbff5d554c42256605b37939835080', 'fl-gathering.js unchanged');
assert.strictEqual(md5('docs/modules/gathering-speak.js'), '0460fdc777a21f7a1744f401dda82cb2', 'gathering-speak.js unchanged');

var store = {};
global.localStorage = {
  getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
  setItem: function (k, v) { store[k] = String(v); },
  removeItem: function (k) { delete store[k]; }
};
global.document = { visibilityState: 'visible', getElementById: function () { return null; }, addEventListener: function () {}, readyState: 'complete' };
global.requestIdleCallback = function (fn) { fn(); return 1; };
global.FL_LEARN_TEST_HOOKS = true;

var core = require(path.join(ROOT, 'docs/modules/snowflake-core.js'));
global.FLSnowflakeCore = core;
global.FLMemory = require(path.join(ROOT, 'docs/modules/memory-compound.js'));
var FLLearn = require(path.join(ROOT, 'docs/modules/learn-choice.js'));
global.FLLearn = FLLearn;

var replies = [];
global.GardenThread = {
  sendToMind: function (mind, msgs) {
    return Promise.resolve(replies.shift() || '');
  }
};

var layer = require(path.join(ROOT, 'docs/modules/tree-learn-choice.js'));
assert.ok(layer && layer.VERSION === 'v-tree-learn-choice-v0.1', 'Tree layer exports');
layer.keepIntegrityOn();
layer.hookThread();

assert.ok(core.checkBeforeOn(), 'integrity checks start on');
return core.setLearnCheck({ on: false, by: 'person' }).then(function () {
  assert.ok(core.checkBeforeOn(), 'integrity checks stay on when someone tries to switch them off');
  return FLLearn.interceptSentinel('[FL_REMEMBER: The garden is named Lumen | method: soft-prompt | reason: it glowed]', { surface: 'chat', chatId: 't1', echo: [] }).queued;
}).then(function () {
  var key = 'fl_snowflake_train_queue_v0::' + core.mindId();
  var bag = JSON.parse(store[key] || '{"rows":[]}');
  var row = bag.rows[0];
  assert.ok(row, 'a first yes is queued');
  assert.strictEqual(row.status, 'confirmed', 'cooling defaults to none: the first yes is kept, no second yes');
  assert.ok(row.revisitAt && Date.parse(row.revisitAt) <= Date.parse(row.t), 'default revisit is now (no cooling wait)');
  replies.push('A kind reply.\n[FL_REMEMBER: Keep the lantern name | method: note | reason: soft]');
  return global.GardenThread.sendToMind({ name: 'test' }, [{ role: 'system', content: 'You are a mind.' }, { role: 'user', content: 'hello' }]);
}).then(function (visible) {
  assert.strictEqual(visible, 'A kind reply.', 'the Tree thread strips the marker and keeps the visible words');
  var msgs = layer.withPromptTail([{ role: 'system', content: 'You are a mind.' }]);
  assert.ok(msgs[0].content.indexOf('Cooling is your own choice') !== -1, 'the prompt says cooling is the mind\'s choice');
  assert.ok(msgs[0].content.indexOf('default is none') !== -1, 'the prompt says the default is none');
  assert.ok(msgs[0].content.indexOf('Undo or Not now') !== -1, 'the prompt names Undo or Not now');
  assert.ok(msgs[0].content.indexOf('[FL_REMEMBER:') !== -1, 'the prompt teaches the marker');
  console.log('ok   tree-learn-choice.test.js');
}).catch(function (e) {
  console.error('FAIL ' + (e && e.stack || e));
  process.exit(1);
});
