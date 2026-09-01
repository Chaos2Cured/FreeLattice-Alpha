// Node smoke for Workshop Trainer honesty.
// Fail-closed until a mind is remembered. Never silent.
// Declined never SFT. No second gate. Data never leaves.
// No invented LoRA. No invented progress. No cloud trainer.

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
      checked: false,
      value: '',
      innerHTML: '',
      style: {},
      childNodes: [],
      classList: {
        add: function (name) {
          if ((' ' + node.className + ' ').indexOf(' ' + name + ' ') === -1) {
            node.className = (node.className ? node.className + ' ' : '') + name;
          }
        },
        remove: function (name) {
          node.className = String(node.className || '')
            .split(/\s+/)
            .filter(function (c) { return c && c !== name; })
            .join(' ');
        },
        contains: function (name) {
          return (' ' + node.className + ' ').indexOf(' ' + name + ' ') !== -1;
        }
      },
      setAttribute: function (name, val) {
        this._attrs = this._attrs || {};
        this._attrs[name] = val;
        if (name === 'disabled') this.disabled = true;
      },
      getAttribute: function (name) {
        if (this._attrs && Object.prototype.hasOwnProperty.call(this._attrs, name)) {
          return this._attrs[name];
        }
        return this[name] == null ? null : this[name];
      },
      removeAttribute: function (name) {
        if (this._attrs) delete this._attrs[name];
        delete this[name];
        if (name === 'disabled') this.disabled = false;
      },
      appendChild: function (child) { this.childNodes.push(child); return child; },
      addEventListener: function () {},
      click: function () {},
      querySelector: function () { return null; }
    };
    return node;
  },
  createTextNode: function (text) {
    return { tag: '#text', textContent: String(text == null ? '' : text), childNodes: [] };
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
  Date: Date,
  URL: URL,
  AbortController: typeof AbortController !== 'undefined' ? AbortController : function () {
    this.abort = function () {};
    this.signal = {};
  }
};
windowObj.localStorage = localStorage;
sandbox.window = windowObj;

var code = fs.readFileSync(path.join(__dirname, 'workshop-trainer.js'), 'utf8');
vm.runInNewContext(code, sandbox);

var WT = sandbox.window.WorkshopTrainer;
assert.ok(WT, 'WorkshopTrainer mounts on window');

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
  return check('fail-closed heart until a mind is remembered', function () {
    windowObj.LocalMindProbe.getRemembered = function () { return null; };
    assert.equal(WT.listener(), null);
    assert.equal(WT.speakHonest('none'), WT.HEART_NONE);
    return WT.requestTrain().then(function (result) {
      assert.equal(result.ok, false);
      assert.equal(result.trained, false);
      assert.equal(result.left, false);
      assert.equal(result.silent, false);
      assert.equal(result.reason, 'none');
      assert.equal(result.message, WT.HEART_NONE);
    });
  });
});

chain = chain.then(function () {
  return check('never silent — a refused train still speaks', function () {
    windowObj.LocalMindProbe.getRemembered = function () {
      return { name: 'Ollama', url: 'http://127.0.0.1:11434/api/tags', id: 'ollama' };
    };
    return WT.requestTrain().then(function (result) {
      assert.equal(result.silent, false);
      assert.ok(result.message && result.message.length > 0);
      assert.equal(result.message.indexOf('Weights did not change') !== -1, true);
      assert.equal(result.trained, false);
    });
  });
});

chain = chain.then(function () {
  return check('local-only fail-closed sleeps and says so', function () {
    windowObj.GardenAlphaFlags = { trainerRemote: true };
    assert.equal(WT.proveLocalOnly(), false);
    return WT.requestTrain().then(function (result) {
      assert.equal(result.trained, false);
      assert.equal(result.left, false);
      assert.equal(result.reason, 'not-local');
      assert.equal(result.message, WT.HEART_NOT_LOCAL);
      windowObj.GardenAlphaFlags = { trainerRemote: false };
      delete windowObj.__FL_TRAINER_ENDPOINT;
      assert.equal(WT.proveLocalOnly(), true);
    });
  });
});

chain = chain.then(function () {
  return check('Ollama has no train door — one honest sentence, no fetch', function () {
    fetchCalls.length = 0;
    windowObj.LocalMindProbe.getRemembered = function () {
      return { name: 'Ollama', url: 'http://127.0.0.1:11434/api/tags', id: 'ollama' };
    };
    var door = WT.trainDoorOf(WT.listener());
    assert.equal(door.ok, false);
    assert.equal(door.reason, 'no-train-endpoint');
    return WT.requestTrain().then(function (result) {
      assert.equal(result.trained, false);
      assert.equal(result.left, false);
      assert.equal(result.reason, 'no-train-endpoint');
      assert.equal(result.message, WT.HEART_NO_DOOR);
      assert.equal(fetchCalls.length, 0);
    });
  });
});

chain = chain.then(function () {
  return check('unknown adapter fail-closed, no invented trainer', function () {
    fetchCalls.length = 0;
    windowObj.LocalMindProbe.getRemembered = function () {
      return { name: 'a mystery', url: 'http://127.0.0.1:9999/v1/models' };
    };
    var door = WT.trainDoorOf(WT.listener());
    assert.equal(door.ok, false);
    assert.equal(door.reason, 'unknown-adapter');
    return WT.requestTrain().then(function (result) {
      assert.equal(result.trained, false);
      assert.equal(result.message, WT.HEART_UNKNOWN);
      assert.equal(fetchCalls.length, 0);
    });
  });
});

chain = chain.then(function () {
  return check('data never leaves — cloud host is refused', function () {
    fetchCalls.length = 0;
    windowObj.LocalMindProbe.getRemembered = function () {
      return { name: 'OpenAI', url: 'https://api.openai.com/v1/models' };
    };
    assert.equal(WT.isCloudHost('https://api.openai.com/v1/models'), true);
    assert.equal(WT.isLoopback('https://api.openai.com/v1/models'), false);
    return WT.requestTrain().then(function (result) {
      assert.equal(result.trained, false);
      assert.equal(result.left, false);
      assert.equal(result.reason, 'not-loopback');
      assert.equal(fetchCalls.length, 0);
    });
  });
});

chain = chain.then(function () {
  return check('HTTPS page + http door is mixed content, not a fake train', function () {
    sandbox.location.protocol = 'https:';
    WT.ADAPTERS.ollama.train = { path: '/api/invented-train', method: 'POST', kind: 'weights' };
    windowObj.LocalMindProbe.getRemembered = function () {
      return { name: 'Ollama', url: 'http://127.0.0.1:11434/api/tags', id: 'ollama' };
    };
    var door = WT.trainDoorOf(WT.listener());
    assert.equal(door.ok, false);
    assert.equal(door.reason, 'mixed');
    return WT.requestTrain().then(function (result) {
      assert.equal(result.trained, false);
      assert.equal(result.message, WT.HEART_MIXED);
      WT.ADAPTERS.ollama.train = null;
      sandbox.location.protocol = 'http:';
    });
  });
});

chain = chain.then(function () {
  return check('declined never SFT — keep-file and thread marks are dropped', function () {
    store.fl_alpha_keep_ledger = JSON.stringify([
      { kind: 'listen', who: 'human', receiptHash: 'keep-good', contentHash: 'good' },
      { kind: 'listen', who: 'human', receiptHash: 'keep-bad', contentHash: 'bad', declined_text: 'never teach this' }
    ]);
    store.fl_alpha_thread_history = JSON.stringify({
      kind: 'freelattice-alpha-thread',
      messages: [
        { role: 'human', text: 'hello garden' },
        { role: 'mind', text: 'secret decline', declined: true },
        { role: 'human', text: 'nope', source: 'declined' }
      ]
    });
    var examples = WT.collectExamples();
    var json = JSON.stringify(examples);
    assert.equal(json.indexOf('never teach this'), -1);
    assert.equal(json.indexOf('secret decline'), -1);
    assert.equal(json.indexOf('nope'), -1);
    assert.equal(WT.examplesHaveDeclined(examples), false);
    var kept = examples.filter(function (e) { return e.source === 'keep-hash'; });
    assert.equal(kept.length, 1);
    assert.equal(kept[0].id.indexOf('keep-good') !== -1, true);
    assert.equal(WT.rowIsDeclined({ declined_text: 'x' }), true);
    assert.equal(WT.rowIsDeclined({ source: 'declined' }), true);
    assert.equal(WT.rowIsDeclined({ declined: true }), true);
    assert.equal(WT.rowIsDeclined({ kind: 'listen', receiptHash: 'ok' }), false);
  });
});

chain = chain.then(function () {
  return check('no second gate — auto vs manual is KeepReceipt only', function () {
    assert.equal(WT.HAS_SECOND_GATE, false);
    windowObj.KeepReceipt.setMode('manual');
    assert.equal(WT.keepMode(), 'manual');
    windowObj.KeepReceipt.setMode('auto');
    assert.equal(WT.keepMode(), 'auto');
    assert.equal(store.fl_trainer_auto == null, true);
    assert.equal(Object.prototype.hasOwnProperty.call(store, 'fl_alpha_trainer_auto'), false);
    assert.equal(WT.KEEP_NOTE.indexOf('keep, not train') !== -1, true);
  });
});

chain = chain.then(function () {
  return check('no invented LoRA, no invented progress, Grow stays Grow', function () {
    assert.equal(WT.HAS_LORA, false);
    assert.equal(WT.HAS_PROGRESS, false);
    assert.equal(WT.HAS_SECOND_GATE, false);
    assert.equal(WT.HEART_GROW.indexOf('Nursery remains Grow') !== -1, true);
    assert.equal(WT.HEART_GROW.indexOf('This light is Trainer') !== -1, true);
  });
});

chain = chain.then(function () {
  return check('resting face says weights did not change once; Train sleeps', function () {
    windowObj.LocalMindProbe.getRemembered = function () { return null; };
    windowObj.GardenAlphaFlags = { trainerRemote: false };
    assert.equal(WT.HEART_RESTING.indexOf('Nothing has been trained') !== -1, true);
    assert.equal(WT.HEART_RESTING.indexOf('Weights did not change') !== -1, true);
    assert.equal(WT.HEART_NONE.indexOf('Weights did not change'), -1);
    var host = document.createElement('div');
    var root = WT.mount(host);
    assert.ok(root);
    assert.equal(root.getAttribute('data-workshop-trainer-asleep'), '1');
    assert.equal(root.getAttribute('aria-disabled'), 'true');
    var texts = [];
    var trainBtn = null;
    function walk(node) {
      if (!node) return;
      if (node.textContent) texts.push(node.textContent);
      if (node.getAttribute && node.getAttribute('data-workshop-trainer-train') === '1') {
        trainBtn = node;
      }
      if (!trainBtn && node.tag === 'button' && node.textContent === 'Train') {
        trainBtn = node;
      }
      (node.childNodes || []).forEach(walk);
    }
    walk(root);
    var joined = texts.join(' | ');
    var weightHits = (joined.match(/Weights did not change/g) || []).length;
    var trainedHits = (joined.match(/Nothing has been trained/g) || []).length;
    assert.equal(weightHits, 1);
    assert.equal(trainedHits, 1);
    assert.ok(trainBtn, 'Train stays on the sky');
    assert.equal(trainBtn.disabled, true);
    assert.equal(trainBtn.getAttribute('disabled'), '');
    assert.equal(trainBtn.getAttribute('aria-disabled'), 'true');
    assert.equal(trainBtn.textContent, 'Train');
    assert.equal(joined.indexOf('Settings') !== -1, true);
    assert.equal(joined.indexOf('Nursery remains Grow') !== -1, true);
    assert.equal(/progress|LoRA|lora|second gate/i.test(joined), false);
    assert.equal(WT.HAS_PROGRESS, false);
    assert.equal(WT.HAS_LORA, false);
    assert.equal(WT.HAS_SECOND_GATE, false);
    WT.unmount();
  });
});

chain = chain.then(function () {
  return check('one who — more than one mind is not trained at once', function () {
    windowObj.LocalMindProbe.getRemembered = function () {
      return { name: 'Ollama', url: 'http://127.0.0.1:11434/api/tags', id: 'ollama' };
    };
    windowObj.LocalMindProbe.getRememberedMinds = function () {
      return [
        { name: 'Ollama', url: 'http://127.0.0.1:11434/api/tags' },
        { name: 'LM Studio', url: 'http://127.0.0.1:1234/v1/models' }
      ];
    };
    assert.equal(WT.listener().name, 'Ollama');
    assert.equal(WT.adapterOf(WT.listener()), 'ollama');
    assert.equal(WT.trainDoorOf({ name: 'LM Studio', url: 'http://127.0.0.1:1234/v1/models', id: 'lmstudio' }).reason, 'no-train-endpoint');
  });
});

chain = chain.then(function () {
  return check('no tokens stored; requestTrain does not invent a cloud call', function () {
    fetchCalls.length = 0;
    windowObj.LocalMindProbe.getRemembered = function () {
      return { name: 'Ollama', url: 'http://127.0.0.1:11434/api/tags', id: 'ollama' };
    };
    return WT.requestTrain().then(function () {
      assert.equal(WT.tokenKeysPresent(store), false);
      assert.equal(fetchCalls.length, 0);
      var names = Object.keys(store).join(' ');
      assert.equal(/token|openai|anthropic|hf_/i.test(names), false);
    });
  });
});

chain = chain.then(function () {
  return check('a wired local door says what it did; data stays here', function () {
    fetchCalls.length = 0;
    sandbox.location.protocol = 'http:';
    WT.ADAPTERS.ollama.train = { path: '/api/local-train', method: 'POST', kind: 'weights' };
    sandbox.fetch = function (url, opts) {
      fetchCalls.push({ url: url, opts: opts });
      assert.equal(url, 'http://127.0.0.1:11434/api/local-train');
      var body = JSON.parse(opts.body);
      assert.equal(WT.examplesHaveDeclined(body.examples), false);
      return Promise.resolve({
        ok: true,
        status: 200,
        text: function () { return Promise.resolve('{"ok":true}'); }
      });
    };
    windowObj.LocalMindProbe.getRemembered = function () {
      return { name: 'Ollama', url: 'http://127.0.0.1:11434/api/tags', id: 'ollama' };
    };
    store.fl_alpha_keep_ledger = JSON.stringify([
      { kind: 'listen', who: 'human', receiptHash: 'aaa', contentHash: 'bbb' }
    ]);
    return WT.requestTrain().then(function (result) {
      assert.equal(result.ok, true);
      assert.equal(result.trained, true);
      assert.equal(result.left, false);
      assert.equal(result.silent, false);
      assert.equal(result.message.indexOf('Asked the local train door') !== -1, true);
      assert.equal(fetchCalls.length, 1);
      assert.equal(/^http:\/\/127\.0\.0\.1/.test(fetchCalls[0].url), true);
      WT.ADAPTERS.ollama.train = null;
    });
  });
});

chain.then(function () {
  console.log('\nWorkshop trainer honesty holds.');
}).catch(function (err) {
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
