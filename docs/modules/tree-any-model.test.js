// Node smoke for Tree any model v0.1 (v-tree-any-model-v0).
// Every local model is a choice, in any order. Connect adds to the sky.
// A chosen model is never called gone while it is at a found door.
// The paste field takes 127.0.0.1 only. No real network: fetch is stubbed.

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
  fetch: function (url) { return stubFetch(url); }
};
var fetchLog = [];
var stubDoors = {};
function stubFetch(url) {
  fetchLog.push(String(url));
  var body = stubDoors[String(url)];
  if (!body) return Promise.reject(new Error('Failed to fetch'));
  return Promise.resolve({ ok: true, status: 200, json: function () { return Promise.resolve(body); } });
}
sandbox.window = windowObj;
windowObj.localStorage = localStorage;
windowObj.document = document;
windowObj.CustomEvent = sandbox.CustomEvent;
windowObj.dispatchEvent = function (ev) { dispatched.push(ev); };

var code = fs.readFileSync(path.join(__dirname, 'local-mind-probe.js'), 'utf8');
vm.runInNewContext(code, sandbox);
var LMP = sandbox.window.LocalMindProbe;

var n = 0;
function names(k, prefix) { var a = []; for (var i = 0; i < k; i++) a.push(prefix + i + ':latest'); return a; }
function saved() { return JSON.parse(store.fl_alpha_local_mind); }

var BRIDGE = 'http://127.0.0.1:11435/api/tags';
var OLLAMA = 'http://127.0.0.1:11434/api/tags';
var LMS = 'http://127.0.0.1:1234/v1/models';

var tests = [];
function later(name, fn) { tests.push([name, fn]); }

later('MODEL_CAP is 64 and mergeFound is exported', function () {
  assert.equal(LMP.MODEL_CAP, 64);
  assert.equal(typeof LMP.mergeFound, 'function');
});

later('a door with 20 models lists all 20 (no cap of five); duplicates collapse', function () {
  var list = names(20, 'm');
  stubDoors['http://127.0.0.1:4321/api/tags'] = { models: list.concat(['m0:latest']).map(function (x) { return { name: x }; }) };
  return LMP.tryAddress('127.0.0.1:4321').then(function (r) {
    assert.ok(r.ok);
    assert.equal(r.models.length, 20);
  });
});

later('a bare port means this computer', function () {
  fetchLog.length = 0;
  return LMP.tryAddress('4321').then(function (r) {
    assert.ok(r.ok);
    assert.equal(fetchLog[0], 'http://127.0.0.1:4321/api/tags');
  });
});

later('localhost is normalized to 127.0.0.1', function () {
  fetchLog.length = 0;
  return LMP.tryAddress('http://localhost:4321').then(function (r) {
    assert.ok(r.ok);
    assert.equal(fetchLog[0].indexOf('http://127.0.0.1:4321'), 0);
  });
});

later('a LAN or outside address is refused with zero fetches', function () {
  fetchLog.length = 0;
  return Promise.all([
    LMP.tryAddress('192.168.1.20:11434'),
    LMP.tryAddress('https://example.com/v1/models'),
    LMP.tryAddress('127.0.0.1.evil.example:1234')
  ]).then(function (rs) {
    rs.forEach(function (r) { assert.equal(r.ok, false); assert.equal(r.refused, true); });
    assert.equal(fetchLog.length, 0);
  });
});

later('mergeFound adds a door and keeps the other doors', function () {
  delete store.fl_alpha_local_mind;
  LMP.remember(LMP.entryFromFoundList([
    { name: 'Ollama', url: OLLAMA, models: ['a:1', 'b:1'] },
    { name: 'LM Studio', url: LMS, models: ['qwen-lms'] }
  ], '', '', null));
  assert.equal(LMP.addRosterSeat('b:1', OLLAMA, 'python').ok, true);
  LMP.setChairBind('c1', { model: 'b:1', url: OLLAMA, tag: 'python' });
  LMP.setSpeakingChair('c1');
  var e = LMP.mergeFound({ name: 'Bridge', url: BRIDGE, models: ['a:1', 'b:1', 'c:1'], model: 'c:1' });
  assert.equal(e.minds.length, 3);
  assert.equal(e.url, BRIDGE);
  assert.equal(e.model, 'c:1');
  assert.ok(e.minds.some(function (m) { return m.url === LMS; }), 'LM Studio kept');
});

later('mergeFound keeps the roster, chair binds, speaking chair, and one key', function () {
  var s = saved();
  assert.equal(s.roster.length, 1);
  assert.equal(s.gatheringBinds.c1.model, 'b:1');
  assert.equal(s.speakingChair, 'c1');
  var keys = Object.keys(store).filter(function (k) { return /local_mind/.test(k); });
  assert.deepEqual(keys, ['fl_alpha_local_mind']);
});

later('mergeFound on a known door updates it in place (no duplicate door)', function () {
  var e = LMP.mergeFound({ name: 'Bridge', url: BRIDGE, models: ['a:1', 'b:1', 'c:1', 'd:1'], model: 'd:1' });
  assert.equal(e.minds.filter(function (m) { return m.url === BRIDGE; }).length, 1);
  assert.equal(e.models.length, 4);
  assert.equal(e.model, 'd:1');
});

later('a chosen model past the old cap of five survives a later Find', function () {
  delete store.fl_alpha_local_mind;
  var list = names(12, 'x');
  LMP.remember(LMP.entryFromFoundList([{ name: 'Ollama', url: OLLAMA, models: list }], '', '', null));
  assert.ok(LMP.chooseModel(OLLAMA, 'x9:latest'));
  var e = LMP.entryFromFoundList([{ name: 'Ollama', url: OLLAMA, models: list }], '', '', saved());
  assert.equal(e.model, 'x9:latest');
  assert.ok(!e.modelNote, 'no gone note');
});

later('Bridge to 11434 keeps the chosen model and says Still speaking', function () {
  delete store.fl_alpha_local_mind;
  LMP.remember(LMP.entryFromFoundList([{ name: 'Bridge', url: BRIDGE, models: ['a:1', 'b:1', 'c:1'] }], '', '', null));
  assert.ok(LMP.chooseModel(BRIDGE, 'c:1'));
  var e = LMP.entryFromFoundList([{ name: 'Ollama', url: OLLAMA, models: ['a:1', 'b:1', 'c:1'] }], '', '', saved());
  assert.equal(e.model, 'c:1');
  assert.equal(e.modelNote, 'Still speaking with c:1, now through Ollama.');
});

later('a chosen model at another kind of door is named, not called gone', function () {
  var e = LMP.entryFromFoundList([
    { name: 'Ollama', url: OLLAMA, models: ['a:1'] },
    { name: 'LM Studio', url: LMS, models: ['qwen-lms'] }
  ], '', '', { url: OLLAMA, model: 'qwen-lms', minds: [] });
  assert.ok(/The chosen model qwen-lms is at LM Studio\. Tap it to speak with it again\./.test(e.modelNote), e.modelNote);
});

later('a truly gone model still gets the honest gone note', function () {
  var e = LMP.entryFromFoundList([{ name: 'Ollama', url: OLLAMA, models: ['a:1'] }], '', '',
    { url: OLLAMA, model: 'zz:9', minds: [] });
  assert.equal(e.model, 'a:1');
  assert.ok(e.modelNote && e.modelNote.indexOf('zz:9') !== -1);
  assert.ok(!/Still speaking/.test(e.modelNote));
});

later('the sky folds after eight, keeps the chosen star, and Show all opens every model', function () {
  delete store.fl_alpha_local_mind;
  var list = names(20, 's');
  LMP.remember(LMP.entryFromFoundList([{ name: 'Ollama', url: OLLAMA, models: list }], '', '', null));
  assert.ok(LMP.chooseModel(OLLAMA, 's15:latest'));
  var host = new El('div');
  LMP.paintConstellation(host, LMP.getRememberedMinds());
  var tiny = host.querySelectorAll('.settings-star-tiny');
  assert.equal(tiny.length, 9);
  assert.ok(tiny.some(function (t) {
    return t.getAttribute('data-mind-model') === 's15:latest' && t.getAttribute('aria-checked') === 'true';
  }));
  var more = host.querySelector('[data-sky-more]');
  assert.ok(more, 'Show all button');
  assert.equal(more.textContent, 'Show all 20 models');
  more.click();
  assert.equal(host.querySelectorAll('.settings-star-tiny').length, 20);
});

later('Gathering seat options are no longer capped at twelve', function () {
  assert.ok(LMP.getChairSeatOptions().length >= 20);
});

later('shared files carry the marker and keep the locks', function () {
  var fc = fs.readFileSync(path.join(__dirname, 'fl-connect.js'), 'utf8');
  var th = fs.readFileSync(path.join(__dirname, 'garden-thread.js'), 'utf8');
  var tr = fs.readFileSync(path.join(__dirname, 'garden-trainer.js'), 'utf8');
  assert.ok(fc.indexOf('v-tree-any-model-v0') !== -1);
  assert.ok(fc.indexOf('function chosenModelName') !== -1);
  assert.ok(fc.indexOf('aria-pressed') !== -1);
  assert.ok(th.indexOf('function heartListening') !== -1 && th.indexOf('data-thread-change') !== -1);
  assert.ok(tr.indexOf('function activeModelName') !== -1);
  var bare = tr.split('\n').filter(function (l) {
    return l.indexOf("getItem('fl_active_model')") !== -1 && !/^\s*\/\//.test(l);
  });
  assert.equal(bare.length, 1, 'fl_active_model read only inside activeModelName');
  [fc, th, tr, code].forEach(function (src) {
    var calls = src.split('\n').filter(function (l) { return /\bconfirm\(/.test(l) && !/^\s*\/\//.test(l); });
    assert.equal(calls.length, 0, 'no confirm() calls');
  });
});

tests.reduce(function (p, t) {
  return p.then(function () {
    return Promise.resolve(t[1]()).then(function () { n += 1; console.log('ok  ' + t[0]); });
  });
}, Promise.resolve()).then(function () {
  console.log(n + ' checks');
  console.log('SMOKE_OK tree any model v0.1');
}).catch(function (e) {
  console.error('FAIL', (e && e.stack) || e);
  process.exit(1);
});
