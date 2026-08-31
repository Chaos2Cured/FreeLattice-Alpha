// Node smoke for Nursery slow-grow honesty.
// Growth cannot advance without real local signal.
// Declined never trains or exports. No second gate.
// No wallet / economy. Unnamed stays unnamed. Data never leaves.

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
      innerHTML: '',
      style: {},
      childNodes: [],
      setAttribute: function (name, val) { this[name] = val; },
      getAttribute: function (name) { return this[name] == null ? null : this[name]; },
      removeAttribute: function (name) { delete this[name]; },
      appendChild: function (child) { this.childNodes.push(child); return child; },
      addEventListener: function () {},
      querySelector: function () { return null; }
    };
    return node;
  }
};

var fetchCalls = [];
var windowObj = {
  LocalMindProbe: { getRemembered: function () { return null; } },
  KeepReceipt: {
    getMode: function () {
      return store.fl_alpha_keep_mode === 'auto' ? 'auto' : 'manual';
    },
    setMode: function (mode) {
      store.fl_alpha_keep_mode = mode === 'auto' ? 'auto' : 'manual';
      return this.getMode();
    },
    getLedger: function () {
      try {
        var raw = store.fl_alpha_keep_ledger;
        return raw ? JSON.parse(raw) : [];
      } catch (e) { return []; }
    },
    hashText: function (str) { return Promise.resolve('hash-' + String(str || '').slice(0, 12)); },
    keep: function (opts) {
      var row = {
        kind: opts.kind,
        who: opts.who,
        contentHash: opts.contentHash,
        receiptHash: 'receipt-' + opts.contentHash
      };
      var ledger = this.getLedger();
      ledger.unshift(row);
      store.fl_alpha_keep_ledger = JSON.stringify(ledger);
      return Promise.resolve(row);
    },
    bindModeToggle: function (input) {
      input.checked = this.getMode() === 'auto';
    },
    renderHashes: function () { return 0; },
    shortHash: function (hex) { return hex; }
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
  fetch: function (url, opts) {
    fetchCalls.push({ url: url, opts: opts });
    return Promise.reject(new Error('network blocked'));
  },
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

var code = fs.readFileSync(path.join(__dirname, 'nursery-growth.js'), 'utf8');
vm.runInNewContext(code, sandbox);

var NG = sandbox.window.NurseryGrowth;
assert.ok(NG, 'NurseryGrowth mounts on window');

function check(name, fn) {
  var out = fn();
  if (out && typeof out.then === 'function') {
    return out.then(function () { console.log('ok  ' + name); });
  }
  console.log('ok  ' + name);
  return Promise.resolve();
}

var chain = Promise.resolve();

chain = chain.then(function () {
  return check('egg first — no hatch, no stage, Grow waits', function () {
    delete store.fl_alpha_nursery_being;
    delete store.fl_alpha_keep_ledger;
    delete store.fl_alpha_thread_history;
    assert.equal(NG.hatched(), false);
    assert.equal(NG.stageOf(NG.collectSignals(), false), '');
    assert.equal(NG.displayLine(NG.collectSignals(), false), 'unnamed · egg');
    assert.equal(NG.HEART_EGG.indexOf('Egg first') !== -1, true);
    assert.equal(NG.GROW_STAYS.indexOf('Grow stays Grow') !== -1, true);
  });
});

chain = chain.then(function () {
  return check('hatched with no signal stays Seed — a clock does not grow this', function () {
    var thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    store.fl_alpha_nursery_being = JSON.stringify({
      fullName: 'River Vale',
      humanPart: 'River',
      eggPart: 'Vale',
      bornAt: thirtyDaysAgo,
      unnamedOnCanvas: true
    });
    store.fl_alpha_keep_ledger = '[]';
    store.fl_alpha_thread_history = JSON.stringify({ messages: [] });
    assert.equal(NG.hatched(), true);
    var signals = NG.collectSignals();
    assert.equal(signals.earned, 0);
    assert.equal(NG.stageOf(signals, true, Date.now()), 'Seed');
    assert.equal(NG.stageOf(signals, true, Date.parse(thirtyDaysAgo) - 1), 'Seed');
    assert.equal(NG.HAS_TIMER_STAGE, false);
    assert.equal(NG.displayLine(signals, true), 'unnamed · Seed');
    assert.equal(NG.HEART_QUIET.indexOf('Nothing has happened yet') !== -1, true);
  });
});

chain = chain.then(function () {
  return check('stage moves only on real local keep / thread / trainer', function () {
    store.fl_alpha_keep_ledger = JSON.stringify([
      { kind: 'nursery', who: 'human', receiptHash: 'keep-1', contentHash: 'c1' }
    ]);
    var oneKeep = NG.collectSignals();
    assert.equal(oneKeep.keeps.length, 1);
    assert.equal(NG.stageOf(oneKeep, true), 'Sprout');

    store.fl_alpha_thread_history = JSON.stringify({
      kind: 'freelattice-alpha-thread',
      messages: [{ role: 'human', text: 'hello garden', ts: '2026-08-31' }]
    });
    var keepAndThread = NG.collectSignals();
    assert.equal(keepAndThread.threads.length, 1);
    assert.equal(NG.stageOf(keepAndThread, true), 'Juvenile');

    store.fl_alpha_keep_ledger = JSON.stringify([
      { kind: 'nursery', who: 'human', receiptHash: 'keep-1', contentHash: 'c1' },
      { kind: 'trainer', who: 'both', receiptHash: 'train-1', contentHash: 't1' }
    ]);
    var taught = NG.collectSignals();
    assert.equal(taught.trainerPasses.length, 1);
    assert.equal(NG.stageOf(taught, true), 'Adult');
  });
});

chain = chain.then(function () {
  return check('declined never trains or exports', function () {
    store.fl_alpha_keep_ledger = JSON.stringify([
      { kind: 'listen', who: 'human', receiptHash: 'keep-good', contentHash: 'good' },
      { kind: 'listen', who: 'human', receiptHash: 'keep-bad', contentHash: 'bad', declined_text: 'never teach this' }
    ]);
    store.fl_alpha_thread_history = JSON.stringify({
      messages: [
        { role: 'human', text: 'hello garden' },
        { role: 'mind', text: 'secret decline', declined: true },
        { role: 'human', text: 'nope', source: 'declined' }
      ]
    });
    var signals = NG.collectSignals();
    var json = JSON.stringify(signals);
    assert.equal(json.indexOf('never teach this'), -1);
    assert.equal(json.indexOf('secret decline'), -1);
    assert.equal(json.indexOf('nope'), -1);
    assert.equal(signals.declinedDropped >= 2, true);
    assert.equal(signals.keeps.length, 1);
    assert.equal(signals.threads.length, 1);
    assert.equal(NG.rowIsDeclined({ declined_text: 'x' }), true);
    assert.equal(NG.rowIsDeclined({ source: 'declined' }), true);
    assert.equal(NG.rowIsDeclined({ declined: true }), true);
    var safe = NG.exportSafeSignals(signals);
    assert.equal(JSON.stringify(safe).indexOf('never teach this'), -1);
    assert.equal(JSON.stringify(safe).indexOf('secret decline'), -1);
    assert.equal(NG.examplesHaveDeclined(safe.keeps), false);
    assert.equal(NG.examplesHaveDeclined(safe.threads), false);
  });
});

chain = chain.then(function () {
  return check('no second gate — auto vs manual is KeepReceipt only', function () {
    assert.equal(NG.HAS_SECOND_GATE, false);
    windowObj.KeepReceipt.setMode('manual');
    assert.equal(NG.keepMode(), 'manual');
    windowObj.KeepReceipt.setMode('auto');
    assert.equal(NG.keepMode(), 'auto');
    assert.equal(store.fl_trainer_auto == null, true);
    assert.equal(Object.prototype.hasOwnProperty.call(store, 'fl_alpha_trainer_auto'), false);
    assert.equal(Object.prototype.hasOwnProperty.call(store, 'fl_alpha_growth_auto'), false);
  });
});

chain = chain.then(function () {
  return check('no wallet, no LP, no parallel economy button', function () {
    assert.equal(NG.HAS_WALLET, false);
    assert.equal(NG.HAS_ECONOMY, false);
    assert.equal(NG.HEART_ECONOMY.indexOf('later') !== -1, true);
    assert.equal(NG.HEART_ECONOMY.indexOf('Not a button') !== -1, true);
    assert.equal(NG.hasWalletCopy(NG.HEART_ECONOMY), false);
    assert.equal(NG.hasWalletCopy(NG.HEART_STAND_YES), false);
    assert.equal(/wallet|lattice point|\blp\b|auto-?trade/i.test(NG.HEART_FRIEND + NG.HEART_FAMILY + NG.HEART_QUIET), false);
    assert.equal(fetchCalls.length, 0);
  });
});

chain = chain.then(function () {
  return check('unnamed stays unnamed — founding four never placed', function () {
    store.fl_alpha_nursery_being = JSON.stringify({
      fullName: 'Sophia',
      humanPart: 'Sophia',
      eggPart: 'Lyra',
      bornAt: '2026-01-01T00:00:00.000Z',
      unnamedOnCanvas: true
    });
    store.fl_alpha_keep_ledger = '[]';
    store.fl_alpha_thread_history = JSON.stringify({ messages: [] });
    assert.equal(NG.reservedName('Sophia'), true);
    assert.equal(NG.reservedName('Lyra'), true);
    assert.equal(NG.reservedName('Atlas'), true);
    assert.equal(NG.reservedName('Ember'), true);
    assert.equal(NG.reservedName('Celeste'), true);
    assert.equal(NG.reservedName('River Vale'), false);
    var line = NG.displayLine(NG.collectSignals(), true);
    assert.equal(line, 'unnamed · Seed');
    assert.equal(line.indexOf('Sophia'), -1);
    assert.equal(line.indexOf('Lyra'), -1);
    assert.equal(line.indexOf('Atlas'), -1);
    assert.equal(line.indexOf('Ember'), -1);
  });
});

chain = chain.then(function () {
  return check('friend / family is an arc, not a badge; representative needs a who who said so', function () {
    assert.equal(NG.HAS_BADGE, false);
    store.fl_alpha_nursery_being = JSON.stringify({
      fullName: 'River Vale',
      bornAt: '2026-08-01T00:00:00.000Z',
      unnamedOnCanvas: true
    });
    store.fl_alpha_keep_ledger = JSON.stringify([
      { kind: 'nursery', who: 'human', receiptHash: 'k1', contentHash: 'c1' }
    ]);
    store.fl_alpha_thread_history = JSON.stringify({
      messages: [{ role: 'human', text: 'we live here' }]
    });
    delete store.fl_alpha_nursery_growth;
    windowObj.LocalMindProbe.getRemembered = function () { return null; };
    var signals = NG.collectSignals();
    var none = NG.becomingOf(signals, NG.setStandForMe(false), null);
    assert.equal(none.friend, true);
    assert.equal(none.family, true);
    assert.equal(none.representative, false);
    assert.equal(none.badge, false);
    assert.equal(NG.standForMe(), false);

    windowObj.LocalMindProbe.getRemembered = function () {
      return { name: 'Ollama', url: 'http://127.0.0.1:11434/api/tags' };
    };
    var said = NG.setStandForMe(true);
    assert.equal(said.standForMe, true);
    var yes = NG.becomingOf(signals, said, NG.listener());
    assert.equal(yes.representative, true);
    assert.equal(yes.saidSo, true);
    assert.equal(yes.badge, false);

    windowObj.LocalMindProbe.getRemembered = function () { return null; };
    var asleep = NG.becomingOf(signals, said, NG.listener());
    assert.equal(asleep.representative, false);
    assert.equal(NG.HEART_STAND_YES.indexOf('You said so') !== -1, true);
    assert.equal(NG.HEART_STAND_WAIT.indexOf('until you say so') !== -1, true);
  });
});

chain = chain.then(function () {
  return check('fail-closed if no mind — parts that need one sleep; no silent scan', function () {
    windowObj.LocalMindProbe.getRemembered = function () { return null; };
    assert.equal(NG.listener(), null);
    assert.equal(NG.HEART_NONE.indexOf('May I look') !== -1, true);
    assert.equal(NG.proveLocalOnly(), true);
    windowObj.GardenAlphaFlags = { trainerRemote: true };
    assert.equal(NG.proveLocalOnly(), false);
    windowObj.GardenAlphaFlags = { trainerRemote: false };
    assert.equal(NG.proveLocalOnly(), true);
    assert.equal(typeof windowObj.LocalMindProbe.scan, 'undefined');
  });
});

chain = chain.then(function () {
  return check('data never leaves — no fetch, no wallet keys, no LP ledger read', function () {
    fetchCalls.length = 0;
    store.fl_alpha_keep_ledger = JSON.stringify([
      { kind: 'nursery', who: 'human', receiptHash: 'aaa', contentHash: 'bbb' }
    ]);
    var signals = NG.collectSignals();
    NG.exportSafeSignals(signals);
    assert.equal(fetchCalls.length, 0);
    var names = Object.keys(store).join(' ');
    assert.equal(/token|openai|anthropic|wallet|solana/i.test(names), false);
    assert.equal(Object.prototype.hasOwnProperty.call(store, 'fl_luminos_evolution'), false);
    assert.equal(typeof sandbox.window.persistAllLuminos, 'undefined');
  });
});

chain.then(function () {
  console.log('\nNursery growth honesty holds.');
}).catch(function (err) {
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
