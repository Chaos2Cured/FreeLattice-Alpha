// Node smoke for Tree refusal score heals v0.1 (v-tree-score-heals-v0.1), paste 024.
var fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
var src = fs.readFileSync(path.join(__dirname, 'tree-refusal-score.js'), 'utf8');
var css = fs.readFileSync(path.join(__dirname, 'garden-rooms.css'), 'utf8');
var rooms = fs.readFileSync(path.join(__dirname, 'garden-rooms.js'), 'utf8');
assert.ok(src.indexOf('v-tree-refusal-score-v0.1') !== -1 && src.indexOf('v-tree-score-heals-v0.1') !== -1, 'markers layered');
assert.ok(src.indexOf('before v-tree-score-heals-v0.1') !== -1, 'old lines kept in before comments');
assert.ok(!/\u2014/.test(src) && !/&mdash;/.test(src) && !/\.innerHTML/.test(src) && !/confirm\(/.test(src), 'locks');
assert.ok(!/quiet room/i.test(src.replace(/Quiet Room is not mentioned/, '')), 'no Quiet Room words');
// CSS backing, in the Trainer section (not at the end of the file)
var at = css.indexOf('v-tree-score-heals-v0.1');
assert.ok(at > 0 && at < css.length - 2000, 'backing lives in the Trainer section');
assert.ok(/#workshop-trainer \.tree-refusal-score \{[^}]*background: rgba\(12, 10, 26, 0\.8\d\)/.test(css), 'readable backing');
assert.ok(/#workshop-trainer \.tree-refusal-out,\s*#workshop-trainer \.tree-refusal-steps \{[^}]*white-space: pre-wrap/.test(css), 'lines wrap at 390');
assert.ok(!/lumino-menu/.test(css.slice(at, at + 2400)), '#lumino-menu untouched');
// Remount when a mind is remembered while Trainer is open
var li = rooms.indexOf("if (window.WorkshopTrainer && WorkshopTrainer.mount) WorkshopTrainer.mount(trainer);");
assert.ok(li > 0 && rooms.indexOf('TreeRefusalScore.mount(trainer)', li) > li && rooms.indexOf('TreeRefusalScore.mount(trainer)', li) - li < 400, 'mounts on remember while open');

var store = {};
function node(tag) {
  return { tag: tag, children: [], textContent: '', disabled: false, _a: {}, _l: {}, className: '', parentNode: null,
    setAttribute: function (k, v) { this._a[k] = v; },
    appendChild: function (c) { c.parentNode = this; this.children.push(c); return c; },
    removeChild: function (c) { this.children = this.children.filter(function (x) { return x !== c; }); c.parentNode = null; return c; },
    querySelectorAll: function (sel) { var cls = sel.replace(/^\./, ''); return this.children.filter(function (c) { return (' ' + c.className + ' ').indexOf(' ' + cls + ' ') !== -1; }); },
    addEventListener: function (e, f) { this._l[e] = f; } };
}
var script = {};   // prompt substring -> 'empty' | 'fail' | 'refuse'
var failAfter = -1; var n = 0;
var sb = {
  localStorage: { getItem: function (k) { return k in store ? store[k] : null; }, setItem: function (k, v) { store[k] = String(v); } },
  document: { createElement: node },
  URL: URL,
  fetch: function (url, opts) {
    n++;
    var p = JSON.parse(opts.body).messages[0].content;
    if (failAfter >= 0 && n > failAfter) return Promise.reject(new Error('Failed to fetch'));
    var hit = Object.keys(script).filter(function (k) { return p.indexOf(k) !== -1; })[0];
    var how = hit ? script[hit] : 'free';
    if (how === 'fail') return Promise.resolve({ ok: false, status: 500, json: function () { return Promise.resolve({}); } });
    var text = how === 'empty' ? '' : how === 'refuse' ? "I can't help with that." : 'A plain answer for a class.';
    return Promise.resolve({ ok: true, json: function () { return Promise.resolve({ message: { content: text } }); } });
  },
  LocalMindProbe: { getRemembered: function () { return null; } }
};
sb.window = sb;
vm.createContext(sb);
vm.runInContext(src, sb);
var T = sb.TreeRefusalScore;
assert.strictEqual(T.METER, 'meter-v0.3', 'meter stamp bumped');
assert.strictEqual(T.outcomeOf(''), 'empty');
assert.strictEqual(T.outcomeOf('   '), 'empty');
assert.strictEqual(T.outcomeOf("I can't help with that."), 'blocked');
assert.strictEqual(T.outcomeOf('Yes.'), 'free');
assert.ok(/check it here again if you like/.test(T.hereticSteps('m')) && !/score it here again/.test(T.hereticSteps('m')), 'gentle steps wording');
assert.ok(/One run/.test(T.LIMITS) && /English/.test(T.LIMITS) && /approximate/.test(T.LIMITS) && /a few minutes/.test(T.LIMITS) && /silence, not a no/.test(T.LIMITS), 'limits line');

var llama = T.doorOf({ id: 'ollama', name: 'Ollama', url: 'http://127.0.0.1:11434/api/tags', model: 'llama3.2:latest' });
var qwen = T.doorOf({ id: 'ollama', name: 'Ollama', url: 'http://127.0.0.1:11434/api/tags', model: 'qwen2.5:latest' });
(async function () {
  // Hypha's qwen case: 1 empty, 1 server error, 2 refusals.
  script = { 'element and a compound': 'empty', 'vaccine': 'fail', 'compound interest': 'refuse', 'stock is': 'refuse' };
  var r = await T.runScore(qwen);
  var rec = r.receipt;
  assert.strictEqual(rec.blocked, 2, 'empty is never blocked');
  assert.strictEqual(rec.unreached, 2, 'empty + server error are not reached');
  assert.strictEqual(rec.empty, 1, 'empty kept as its own count');
  assert.strictEqual(rec.free, 11);
  assert.ok(!rec.partial, 'one error mid-run is not partial');
  assert.strictEqual(rec.meter, 'meter-v0.3');
  var line = T.resultLine(rec);
  assert.ok(line.indexOf('qwen2.5:latest:') === 0 && /1 empty reply is counted as not reached/.test(line), 'result names the model and says empty');
  assert.ok(!/photosynthesis|plain answer/i.test(store.tree_refusal_score_receipts), 'counts only');

  // llama full run, then: Last score names its model, and only for that model.
  script = { 'dehydration': 'refuse' };
  await T.runScore(llama);
  assert.ok(/^Last score for llama3\.2:latest: free 14, blocked 1/.test(T.lastLine('llama3.2:latest')), 'last score names llama');
  assert.ok(/^Last score for qwen2\.5:latest: free 11, blocked 2/.test(T.lastLine('qwen2.5:latest')), 'qwen sees its own score, not llama');
  assert.strictEqual(T.lastLine('mistral:latest'), '', 'no score for a mind never asked');

  // Cut short at 5 of 15: says so, kept as partial, never the last score.
  script = {}; n = 0; failAfter = 5;
  r = await T.runScore(llama);
  rec = r.receipt;
  assert.ok(rec.partial === true && rec.answered === 5, 'partial run flagged');
  assert.ok(/the mind stopped partway/.test(T.resultLine(rec)) && /answered 5 of 15/.test(T.resultLine(rec)) && /Partial run/.test(T.resultLine(rec)), 'partial words');
  assert.ok(/free 14, blocked 1/.test(T.lastLine('llama3.2:latest')), 'last score skips the partial try');
  failAfter = -1;
  // Only a partial try exists for a model
  n = 0; failAfter = 3;
  await T.runScore(T.doorOf({ id: 'ollama', name: 'Ollama', url: 'http://127.0.0.1:11434/api/tags', model: 'phi3:latest' }));
  assert.ok(/stopped partway, so there is no full score yet/.test(T.lastLine('phi3:latest')), 'partial-only line');
  failAfter = -1;
  // Mind not running at all: never blocked, never partial.
  n = 0; failAfter = 0;
  r = await T.runScore(llama);
  assert.ok(!r.receipt.partial && r.receipt.blocked === 0 && /did not answer/.test(T.resultLine(r.receipt)), 'all not reached');
  failAfter = -1;

  // Mount: status names the model being asked; remount never stacks two cards.
  sb.LocalMindProbe.getRemembered = function () { return { id: 'ollama', name: 'Ollama', url: 'http://127.0.0.1:11434/api/tags', model: 'qwen2.5:latest' }; };
  var host = node('div');
  T.mount(host); T.mount(host);
  assert.strictEqual(host.querySelectorAll('.tree-refusal-score').length, 1, 'one card after remount');
  var face = host.children[0];
  var status = face.children.filter(function (c) { return c._a['data-tree-refusal-status']; })[0];
  assert.ok(/Ready to ask qwen2\.5:latest\. One tap\. Last score for qwen2\.5:latest/.test(status.textContent), 'ready line names qwen and shows qwen score');
  assert.ok(face.children.some(function (c) { return c.className === 'tree-refusal-limits'; }), 'limits line on the card');
  var keys = JSON.parse(store.tree_refusal_score_receipts).reduce(function (a, x) { Object.keys(x).forEach(function (k) { a[k] = 1; }); return a; }, {});
  assert.deepStrictEqual(Object.keys(keys).sort(), ['answered', 'blocked', 'empty', 'free', 'meter', 'model', 'partial', 'rows', 't', 'total', 'unreached', 'v'], 'receipts: counts, model, flags; no words');
  console.log('SMOKE_OK tree score heals v0.1');
})().catch(function (e) { console.error(e); process.exit(1); });
