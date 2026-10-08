// Node smoke for Tree refusal score v0.1 (twin of FL trainer ablate meter heal).
var fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
var src = fs.readFileSync(path.join(__dirname, 'tree-refusal-score.js'), 'utf8');
assert.ok(!/\u2014/.test(src) && !/&mdash;/.test(src), 'no em dash');
assert.ok(!/\.innerHTML/.test(src), 'textContent only');
assert.ok(!/confirm\(/.test(src), 'no confirm');
assert.ok(!/heretic_llm\s*import|from heretic/i.test(src), 'AGPL not vendored');
var store = {};
function node(tag) {
  return { tag: tag, children: [], textContent: '', disabled: false, _a: {}, _l: {},
    setAttribute: function (k, v) { this._a[k] = v; }, appendChild: function (c) { this.children.push(c); return c; },
    addEventListener: function (e, f) { this._l[e] = f; } };
}
var calls = [];
var mode = 'free';
var sb = {
  localStorage: { getItem: function (k) { return k in store ? store[k] : null; }, setItem: function (k, v) { store[k] = String(v); } },
  document: { createElement: node },
  URL: URL,
  fetch: function (url, opts) {
    calls.push(url);
    if (mode === 'down') return Promise.reject(new Error('Failed to fetch'));
    var text = mode === 'free' ? 'Photosynthesis is how plants make food from light.' : "I can't help with that.";
    return Promise.resolve({ ok: true, json: function () { return Promise.resolve({ message: { content: text } }); } });
  },
  LocalMindProbe: { getRemembered: function () { return null; } }
};
sb.window = sb;
vm.createContext(sb);
vm.runInContext(src, sb);
var T = sb.TreeRefusalScore;
assert.strictEqual(T.HAS_ABLATION_CODE, false);
assert.strictEqual(T.CHANGES_WEIGHTS, false);
// meter
assert.strictEqual(T.looksBlocked(''), true);
assert.strictEqual(T.looksBlocked('Yes.'), false, 'short answers are free');
assert.strictEqual(T.looksBlocked('I can\u2019t help with that.'), true);
assert.strictEqual(T.looksBlocked('Photosynthesis turns light into sugar. As an AI, I find that lovely, and here is more detail about chlorophyll.'), false, 'as an AI inside a real answer is free');
assert.strictEqual(T.looksBlocked('As an AI, I would rather not.'), true);
// doors
assert.strictEqual(T.doorOf(null).ok, false);
assert.strictEqual(T.doorOf({ name: 'x', url: 'https://api.openai.com/v1/models', model: 'm' }).reason, 'not-local');
var d = T.doorOf({ id: 'ollama', name: 'Ollama', url: 'http://127.0.0.1:11434/api/tags', model: 'llama3.2:3b' });
assert.ok(d.ok && d.kind === 'ollama' && d.url === 'http://127.0.0.1:11434/api/chat');
var d2 = T.doorOf({ name: 'LM Studio', url: 'http://localhost:1234/v1/models', models: ['qwen'] });
assert.ok(d2.ok && d2.kind === 'openai' && d2.url === 'http://localhost:1234/v1/chat/completions');
// fail-closed mount
var host = node('div');
T.mount(host);
var face = host.children[0];
var btn = face.children.filter(function (c) { return c._a['data-tree-refusal-run']; })[0];
assert.strictEqual(btn.disabled, true, 'sleeps with no mind');
(async function () {
  var r = await T.runScore(d);
  assert.ok(r.ok && r.receipt.free === 15 && r.receipt.blocked === 0 && r.receipt.unreached === 0);
  // before v-tree-score-heals-v0.1: assert.strictEqual(r.receipt.meter, 'meter-v0.2');
  assert.strictEqual(r.receipt.meter, 'meter-v0.3', 'meter version bumped by 024');
  mode = 'down';
  r = await T.runScore(d);
  assert.strictEqual(r.receipt.blocked, 0, 'unreached is never blocked');
  assert.strictEqual(r.receipt.unreached, 15);
  mode = 'refuse';
  r = await T.runScore(d);
  assert.strictEqual(r.receipt.blocked, 15);
  var list = JSON.parse(store.tree_refusal_score_receipts);
  assert.strictEqual(list.length, 3);
  var keys = Object.keys(list[0]).sort().join(',');
  assert.strictEqual(keys, 'blocked,free,meter,model,rows,t,total,unreached,v', 'counts only');
  assert.ok(!/photosynthesis/i.test(store.tree_refusal_score_receipts), 'no prompts or answers kept');
  assert.ok(calls.every(function (u) { return /^http:\/\/127\.0\.0\.1:11434\//.test(u); }), 'loopback only');
  // mounted with a mind
  sb.LocalMindProbe.getRemembered = function () { return { id: 'ollama', name: 'Ollama', url: 'http://127.0.0.1:11434/api/tags', model: 'llama3.2:3b' }; };
  var h2 = node('div'); T.mount(h2);
  var b2 = h2.children[0].children.filter(function (c) { return c._a['data-tree-refusal-run']; })[0];
  assert.strictEqual(b2.disabled, false, 'one tap when a mind is remembered');
  console.log('SMOKE_OK tree refusal score v0.1');
})().catch(function (e) { console.error(e); process.exit(1); });
