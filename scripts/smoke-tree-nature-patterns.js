// smoke-tree-nature-patterns.js (MIT) v-tree-nature-patterns-v0.1
// Node only. The Tree keeps the pool gap and the lesson words.
// A first-digit hint and image making stay next, where the Tree has no such view.
var fs = require('fs');
var path = require('path');
var crypto = require('crypto');
var assert = require('assert');

var rootDir = path.join(__dirname, '..');
var flWorkspace = process.env.FL_WORKSPACE || path.join(rootDir, '..', 'FreeLattice-fresh');

function md5(file) {
  return crypto.createHash('md5').update(fs.readFileSync(file)).digest('hex');
}
function absent(rel) {
  assert.strictEqual(fs.existsSync(path.join(rootDir, rel)), false, rel + ' stays next');
}

var crown = require(path.join(rootDir, 'docs/modules/crown-shyness.js'));
var confidence = require(path.join(rootDir, 'docs/modules/confidence-first.js'));
var pool = fs.readFileSync(path.join(rootDir, 'docs/modules/tree-pool.js'), 'utf8');
var trainer = fs.readFileSync(path.join(rootDir, 'docs/modules/nursery-trainer.js'), 'utf8');
var nursery = fs.readFileSync(path.join(rootDir, 'docs/nursery.html'), 'utf8');
var indexHtml = fs.readFileSync(path.join(rootDir, 'docs/index.html'), 'utf8');
var settings = fs.readFileSync(path.join(rootDir, 'docs/settings.html'), 'utf8');

assert.strictEqual(crown.LINE, 'Keeps a small gap: no one helper takes more than a third, and 20% stays yours.');
var greedy = crown.decide({ capacity: 6, peer: 'a', counts: { a: 2 }, waiting: ['b'], kin: false, totalInflight: 2 });
assert.strictEqual(greedy.reason, 'crown');
var room = crown.decide({ capacity: 2, peer: 'a', counts: { a: 1 }, waiting: ['b'], kin: true, totalInflight: 1 });
assert.strictEqual(room.reason, 'headroom', 'headroom never lent, kin included');
var paused = crown.decide({ capacity: 2, peer: 'a', counts: {}, waiting: [], kin: true, paused: true, totalInflight: 0 });
assert.strictEqual(paused.reason, 'pause');
assert.ok(pool.indexOf(crown.LINE) !== -1, 'pool card says the gap');
assert.ok(pool.indexOf('function crownHold') !== -1, 'pool uses the same rule');
assert.ok(pool.indexOf('MAX_CONCURRENT = 2') !== -1, 'concurrent cap stays');
assert.ok(indexHtml.indexOf('modules/crown-shyness.js') !== -1, 'garden loads the gap');
assert.ok(indexHtml.indexOf('modules/crown-shyness.js') < indexHtml.indexOf('modules/tree-pool.js'), 'gap loads first');
assert.ok(settings.indexOf('modules/crown-shyness.js') < settings.indexOf('modules/tree-pool.js'), 'settings loads the gap first');

assert.ok(confidence.promptAddon().indexOf('Want to try the next one?') !== -1);
assert.strictEqual(confidence.consider('I do not know'), confidence.NUDGE);
assert.ok(!/timer|countdown|wrong|incorrect|second/i.test(confidence.NUDGE));
assert.ok(trainer.indexOf('FLConfidence.mount') !== -1, 'trainer face layers the lesson');
assert.ok(nursery.indexOf('modules/confidence-first.js') !== -1, 'nursery page loads the lesson');
assert.ok(nursery.indexOf('modules/confidence-first.js') < nursery.indexOf('modules/nursery-trainer.js'), 'lesson loads first');
assert.strictEqual(md5(path.join(rootDir, 'docs/modules/garden-trainer.js')), '488117a27be26e7d6b00445b0d975d03', 'trainer file stays');

// v-seal-ask-heal-v0.1: notebook was 0943268564d875bbb0093303d27ffc2c. The honest line now names this browser.
// v-seal-ask-in-view-v0.1: notebook was f82f3b880ad1d71680890b97d802f12f, then c81b9a95164f328f99641f76584ebe73. The ask comes into view.
// v-seal-ask-chat-tab-v0.1: notebook was 83daf3156966cc16c608322f9f9685a1. The ask moves beside Chat when the thread opens.
// v-seal-ask-settle-v0.1: notebook was df660dc31ea6d765d69e8e387e6fdfb0. The ask waits for the panel box.
// v-seal-ask-after-tap-v0.1: notebook was 0ad079e66d39b5866b923d697867650b. The ask scrolls after the Chat tab's own motion.
// v-seal-ask-last-two-v0.1: notebook was cd29c1c878ec159f45db5a97bed05e58. Back from Nursery closes Nursery, and the heart stays when it fits.
// v-pool-honest-heals-v0.1: notebook was e08a08752b311327ddab56b3c66de77d. Back when Chat was already open keeps the ask.
var notebook = 'f1c88664d3e99362e02c625defb241bc';
assert.strictEqual(md5(path.join(rootDir, 'docs/modules/mind-workspace.js')), notebook, 'notebook matches');
if (fs.existsSync(path.join(flWorkspace, 'docs/modules/mind-workspace.js'))) {
  assert.strictEqual(md5(path.join(flWorkspace, 'docs/modules/mind-workspace.js')), notebook, 'notebook parity');
  assert.strictEqual(md5(path.join(rootDir, 'docs/modules/crown-shyness.js')), md5(path.join(flWorkspace, 'docs/modules/crown-shyness.js')), 'gap parity');
  assert.strictEqual(md5(path.join(rootDir, 'docs/modules/confidence-first.js')), md5(path.join(flWorkspace, 'docs/modules/confidence-first.js')), 'lesson parity');
}

['docs/modules/benford-hint.js', 'docs/modules/image-local.js', 'docs/modules/style-ledger.js', 'docs/modules/image-safety.js', 'docs/modules/clay-corner.js', 'docs/modules/particle-clay.js'].forEach(function (rel) {
  assert.strictEqual(fs.existsSync(path.join(rootDir, rel)), true, rel + ' is here');
  if (fs.existsSync(path.join(flWorkspace, rel))) {
    assert.strictEqual(md5(path.join(rootDir, rel)), md5(path.join(flWorkspace, rel)), rel + ' matches');
  }
});
absent('docs/modules/lattice-export.js');

var hold = pool.slice(pool.indexOf('function crownHold'), pool.indexOf('function admit'));
var lesson = trainer.slice(trainer.indexOf('v-confidence-first-v0.1'), trainer.indexOf('return face'));
var added = hold + '\n' + lesson;
assert.ok(hold.indexOf('function crownHold') === 0, 'gap helper is present');
assert.ok(added.indexOf('\u2014') === -1, 'no long dash in the new tree lines');
assert.ok(added.indexOf('conf' + 'irm(') === -1, 'no dialog');
assert.ok(added.indexOf('inner' + 'HTML') === -1, 'text only');

console.log('SMOKE_OK tree nature patterns v0.1');
