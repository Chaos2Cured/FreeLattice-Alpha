// Node smoke for Settings model chooser (Fix 3).
// Stars write entry.model through remember() into fl_alpha_local_mind.
// Later scans keep a still-present choice. A vanished name falls back
// in the entry with a visible note. No second storage key. No network.
// Do not call a real local door. Stubbed found-list only.

var fs = require('fs');
var path = require('path');
var vm = require('vm');
var assert = require('assert');

var store = {};
var writes = [];

var localStorage = {
  getItem: function (k) {
    return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null;
  },
  setItem: function (k, v) {
    writes.push(String(k));
    store[k] = String(v);
  },
  removeItem: function (k) { delete store[k]; },
  get length() { return Object.keys(store).length; },
  key: function (i) { return Object.keys(store)[i] || null; }
};

function El(tag) {
  this.tagName = String(tag || 'div').toUpperCase();
  this.tag = tag;
  this.id = '';
  this.className = '';
  this.textContent = '';
  this.hidden = false;
  this.disabled = false;
  this.type = '';
  this.value = '';
  this.placeholder = '';
  this.tabIndex = 0;
  this.attrs = {};
  this.children = [];
  this.childNodes = this.children;
  this.parent = null;
  this.listeners = {};
  this.style = {};
  var self = this;
  this.classList = {
    add: function (name) {
      if ((' ' + self.className + ' ').indexOf(' ' + name + ' ') === -1) {
        self.className = (self.className ? self.className + ' ' : '') + name;
      }
    },
    remove: function (name) {
      self.className = String(self.className || '')
        .split(/\s+/)
        .filter(function (c) { return c && c !== name; })
        .join(' ');
    },
    contains: function (name) {
      return (' ' + self.className + ' ').indexOf(' ' + name + ' ') !== -1;
    }
  };
  this.setAttribute = function (name, val) {
    var s = String(val);
    this.attrs[name] = s;
    if (name === 'id') this.id = s;
    if (name === 'class') this.className = s;
    if (name === 'hidden') this.hidden = true;
    if (name === 'disabled') this.disabled = true;
  };
  this.getAttribute = function (name) {
    if (name === 'id') return this.id || null;
    if (Object.prototype.hasOwnProperty.call(this.attrs, name)) return this.attrs[name];
    return null;
  };
  this.removeAttribute = function (name) {
    delete this.attrs[name];
    if (name === 'id') this.id = '';
    if (name === 'hidden') this.hidden = false;
    if (name === 'disabled') this.disabled = false;
  };
  this.appendChild = function (child) {
    this.children.push(child);
    child.parent = this;
    return child;
  };
  this.contains = function (node) {
    if (node === this) return true;
    for (var i = 0; i < this.children.length; i++) {
      if (this.children[i].contains && this.children[i].contains(node)) return true;
    }
    return false;
  };
  this.focus = function () {};
  this.addEventListener = function (type, fn) {
    this.listeners[type] = this.listeners[type] || [];
    this.listeners[type].push(fn);
  };
  this.dispatchEvent = function (ev) {
    var list = this.listeners[ev.type] || [];
    for (var i = 0; i < list.length; i++) list[i](ev);
    if (this.parent && this.parent.dispatchEvent) this.parent.dispatchEvent(ev);
  };
  this.click = function () {
    this.dispatchEvent({
      type: 'click',
      target: this,
      preventDefault: function () {}
    });
  };
  this.querySelector = function (sel) { return queryOne(this, sel); };
  this.querySelectorAll = function (sel) { return queryAll(this, sel); };
  Object.defineProperty(this, 'innerHTML', {
    get: function () { return this._innerHTML || ''; },
    set: function (v) {
      this._innerHTML = String(v);
      if (v === '') {
        this.children.length = 0;
      }
    }
  });
}

function walk(root, out) {
  out.push(root);
  for (var i = 0; i < (root.children || []).length; i++) walk(root.children[i], out);
  return out;
}

function matchOne(el, raw) {
  var sel = String(raw || '').trim();
  if (!sel || !el) return false;
  if (sel.charAt(0) === '#') return el.id === sel.slice(1);
  if (sel.charAt(0) === '.') {
    return (' ' + (el.className || '') + ' ').indexOf(' ' + sel.slice(1) + ' ') !== -1;
  }
  var attrEq = sel.match(/^\[([^\]]+?)="([^"]*)"\]$/);
  if (attrEq) return el.getAttribute(attrEq[1]) === attrEq[2];
  var attr = sel.match(/^\[([^\]]+)\]$/);
  if (attr) return el.getAttribute(attr[1]) != null;
  return (el.tag || '').toLowerCase() === sel.toLowerCase();
}

function splitCompound(compound) {
  var s = String(compound || '').trim();
  var parts = [];
  var buf = '';
  var i;
  var inAttr = false;
  for (i = 0; i < s.length; i++) {
    var ch = s.charAt(i);
    if (ch === '[') inAttr = true;
    if (ch === ']') inAttr = false;
    if (!inAttr && i > 0 && (ch === '.' || ch === '#' || ch === '[')) {
      if (buf) parts.push(buf);
      buf = ch;
    } else {
      buf += ch;
    }
  }
  if (buf) parts.push(buf);
  return parts;
}

function matchCompound(el, compound) {
  var parts = splitCompound(compound);
  if (!parts.length || (parts.length === 1 && !parts[0])) return false;
  if (/^[a-zA-Z]/.test(parts[0])) {
    if ((el.tag || '').toLowerCase() !== parts[0].toLowerCase()) return false;
    parts = parts.slice(1);
  }
  for (var i = 0; i < parts.length; i++) {
    if (parts[i] && !matchOne(el, parts[i])) return false;
  }
  return true;
}

function queryAll(root, selector) {
  var found = [];
  var nodes = walk(root, []);
  var sel = String(selector || '').trim();
  for (var i = 0; i < nodes.length; i++) {
    if (nodes[i] !== root && matchCompound(nodes[i], sel)) found.push(nodes[i]);
  }
  return found;
}

function queryOne(root, selector) {
  var all = queryAll(root, selector);
  return all.length ? all[0] : null;
}

var dispatched = [];
var document = {
  body: new El('body'),
  createElement: function (tag) { return new El(tag); }
};

var windowObj = {
  addEventListener: function () {},
  dispatchEvent: function (ev) { dispatched.push(ev); }
};

var sandbox = {
  window: windowObj,
  document: document,
  localStorage: localStorage,
  location: { protocol: 'http:', href: 'http://127.0.0.1/docs/settings.html' },
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
  Date: Date,
  CustomEvent: function (name, opts) {
    this.type = name;
    this.detail = opts && opts.detail;
  },
  fetch: function () {
    throw new Error('tests must not call a real local door');
  }
};
sandbox.window = windowObj;
windowObj.localStorage = localStorage;
windowObj.document = document;
windowObj.CustomEvent = sandbox.CustomEvent;
windowObj.dispatchEvent = function (ev) { dispatched.push(ev); };

var code = fs.readFileSync(path.join(__dirname, 'local-mind-probe.js'), 'utf8');
vm.runInNewContext(code, sandbox);

var LMP = sandbox.window.LocalMindProbe;
assert.ok(LMP, 'LocalMindProbe mounts on window');
assert.equal(LMP.STORAGE_KEY, 'fl_alpha_local_mind');
assert.equal(LMP.PRIMARY, 'May I look for a mind already at home?');

var FOUND = [{
  name: 'Ollama',
  url: 'http://127.0.0.1:11434/api/tags',
  models: [
    'qwen2.5:14b',
    'deepseek-coder-v2:latest',
    'llama3.1:8b',
    'codellama:latest',
    'moondream:latest'
  ]
}];

function check(name, fn) {
  fn();
  console.log('ok  ' + name);
}

function radiosOf(host) {
  return queryAll(host, '[role="radio"]');
}

function checkedOf(host) {
  return queryAll(host, '[aria-checked="true"]');
}

function resetMemory() {
  Object.keys(store).forEach(function (k) { delete store[k]; });
  writes.length = 0;
  dispatched.length = 0;
}

check('renderFace does not persist before May I look', function () {
  resetMemory();
  var box = new El('div');
  LMP.renderFace(box);
  assert.equal(store[LMP.STORAGE_KEY], undefined);
  assert.equal(writes.length, 0);
  var ask = queryOne(box, '[data-mind-ask="1"]');
  assert.ok(ask, 'May I look stays the door');
  assert.equal(ask.textContent, LMP.PRIMARY);
});

check('first found list writes models[0] as the starting model', function () {
  resetMemory();
  var entry = LMP.entryFromFoundList(FOUND, 'Ollama', FOUND[0].url, null);
  assert.equal(entry.model, 'qwen2.5:14b');
  assert.deepEqual(entry.models, FOUND[0].models);
  assert.equal(entry.minds.length, 1);
});

check('choosing a model writes entry.model and remember() persists one key', function () {
  resetMemory();
  var first = LMP.entryFromFoundList(FOUND, 'Ollama', FOUND[0].url, null);
  LMP.remember(first);
  writes.length = 0;
  dispatched.length = 0;
  var host = new El('div');
  LMP.paintConstellation(host, LMP.getRememberedMinds());
  var stars = radiosOf(host);
  assert.equal(stars.length, 5);
  var pick = queryOne(host, '[data-mind-model="llama3.1:8b"]');
  assert.ok(pick, 'named model star is present');
  pick.click();
  var remembered = LMP.getRemembered();
  assert.equal(remembered.model, 'llama3.1:8b');
  assert.ok(writes.length, 'remember() wrote storage');
  writes.forEach(function (k) {
    assert.equal(k, LMP.STORAGE_KEY, 'no second storage key: ' + k);
  });
  assert.equal(Object.keys(store).length, 1);
  assert.ok(Object.prototype.hasOwnProperty.call(store, LMP.STORAGE_KEY));
  assert.ok(dispatched.length, 'fl-alpha-mind-remembered was dispatched');
  assert.equal(dispatched[dispatched.length - 1].type, 'fl-alpha-mind-remembered');
});

check('stars are role=radio and the chosen one is aria-checked=true', function () {
  resetMemory();
  var first = LMP.entryFromFoundList(FOUND, 'Ollama', FOUND[0].url, null);
  LMP.remember(first);
  LMP.chooseModel(FOUND[0].url, 'deepseek-coder-v2:latest');
  var host = new El('div');
  LMP.paintConstellation(host, LMP.getRememberedMinds());
  var stars = radiosOf(host);
  assert.equal(stars.length, 5);
  stars.forEach(function (star) {
    assert.equal(star.getAttribute('role'), 'radio');
    assert.equal(star.tag, 'button');
  });
  var checked = checkedOf(host);
  assert.equal(checked.length, 1);
  assert.equal(checked[0].getAttribute('aria-checked'), 'true');
  assert.equal(checked[0].getAttribute('data-mind-model'), 'deepseek-coder-v2:latest');
  var line = queryOne(host, '[data-mind-speaks="1"]');
  assert.ok(line, 'speaks-with line is present');
  assert.equal(line.textContent, LMP.speakWithLine('deepseek-coder-v2:latest'));
  var unlit = queryOne(host, '[data-mind-model="qwen2.5:14b"]');
  assert.equal(unlit.getAttribute('aria-checked'), 'false');
});

check('later scan that still lists the chosen model does not replace it', function () {
  resetMemory();
  var first = LMP.entryFromFoundList(FOUND, 'Ollama', FOUND[0].url, null);
  LMP.remember(first);
  LMP.chooseModel(FOUND[0].url, 'codellama:latest');
  var again = LMP.entryFromFoundList(FOUND, 'Ollama', FOUND[0].url, LMP.getRemembered());
  assert.equal(again.model, 'codellama:latest');
  assert.ok(!again.modelNote, 'no fallback note when the name is still present');
  LMP.remember(again);
  var host = new El('div');
  LMP.paintConstellation(host, LMP.getRememberedMinds());
  var checked = checkedOf(host);
  assert.equal(checked[0].getAttribute('data-mind-model'), 'codellama:latest');
});

check('later scan where the chosen model vanished surfaces a visible fallback', function () {
  resetMemory();
  var first = LMP.entryFromFoundList(FOUND, 'Ollama', FOUND[0].url, null);
  LMP.remember(first);
  LMP.chooseModel(FOUND[0].url, 'moondream:latest');
  var shrunk = [{
    name: 'Ollama',
    url: FOUND[0].url,
    models: ['qwen2.5:14b', 'llama3.1:8b']
  }];
  var fallen = LMP.entryFromFoundList(shrunk, 'Ollama', FOUND[0].url, LMP.getRemembered());
  assert.equal(fallen.model, 'qwen2.5:14b');
  assert.notEqual(fallen.model, 'moondream:latest');
  assert.ok(fallen.modelNote, 'fallback is named on the entry');
  assert.ok(fallen.modelNote.indexOf('moondream:latest') !== -1, 'gone name is in the note');
  assert.ok(fallen.modelNote.indexOf('qwen2.5:14b') !== -1, 'fallback name is in the note');
  LMP.remember(fallen);
  var host = new El('div');
  LMP.paintConstellation(host, LMP.getRememberedMinds());
  var names = radiosOf(host).map(function (r) { return r.getAttribute('data-mind-model'); });
  assert.equal(names.indexOf('moondream:latest'), -1, 'ghost name is not a lit star');
  var checked = checkedOf(host);
  assert.equal(checked.length, 1);
  assert.equal(checked[0].getAttribute('data-mind-model'), 'qwen2.5:14b');
  var line = queryOne(host, '[data-mind-speaks="1"]');
  assert.equal(line.textContent, fallen.modelNote);
});

check('no second storage key is written across choose and scan', function () {
  resetMemory();
  var first = LMP.entryFromFoundList(FOUND, 'Ollama', FOUND[0].url, null);
  LMP.remember(first);
  LMP.chooseModel(FOUND[0].url, 'llama3.1:8b');
  var again = LMP.entryFromFoundList(FOUND, 'Ollama', FOUND[0].url, LMP.getRemembered());
  LMP.remember(again);
  assert.equal(Object.keys(store).join(','), LMP.STORAGE_KEY);
  writes.forEach(function (k) {
    assert.equal(k, LMP.STORAGE_KEY);
  });
});

check('chooseModel without a remembered entry does not persist', function () {
  resetMemory();
  var out = LMP.chooseModel(FOUND[0].url, 'qwen2.5:14b');
  assert.equal(out, null);
  assert.equal(store[LMP.STORAGE_KEY], undefined);
  assert.equal(writes.length, 0);
});

check('two doors: marking primary writes that door onto the entry', function () {
  resetMemory();
  var two = LMP.entryFromFoundList([
    FOUND[0],
    {
      name: 'LM Studio',
      url: 'http://127.0.0.1:1234/v1/models',
      models: ['local-model']
    }
  ], 'Ollama', FOUND[0].url, null);
  LMP.remember(two);
  assert.equal(LMP.getRemembered().name, 'Ollama');
  var next = LMP.choosePrimary('http://127.0.0.1:1234/v1/models');
  assert.ok(next);
  assert.equal(next.name, 'LM Studio');
  assert.equal(next.url, 'http://127.0.0.1:1234/v1/models');
  assert.equal(next.model, 'local-model');
  var minds = next.minds;
  var studio = minds.filter(function (m) { return m.name === 'LM Studio'; })[0];
  assert.equal(studio.primary, true);
});

console.log('\nSettings model chooser smokes hold.');
