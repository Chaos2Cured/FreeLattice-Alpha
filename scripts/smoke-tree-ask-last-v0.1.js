// smoke-tree-ask-last-v0.1.js (MIT)
// The Gathering keeps Seal it on top, and Back from a thread keeps the ask.
var fs = require('fs');
var path = require('path');
var assert = require('assert');

var rootDir = path.join(__dirname, '..');
var roomsSrc = fs.readFileSync(path.join(rootDir, 'docs/modules/garden-rooms.js'), 'utf8');
assert.ok(roomsSrc.indexOf('v-tree-ask-last-v0.1') !== -1, 'the marker is on the garden');
assert.ok(roomsSrc.indexOf("zIndex = '1007'") !== -1, 'the ask sits above the shared shoulder');
var closeAt = roomsSrc.indexOf('function closeThread');
var closeUnmount = roomsSrc.indexOf('GardenThread.unmount', closeAt);
var closeLift = roomsSrc.indexOf('liftSealAsk(stage)', closeAt);
assert.ok(closeLift !== -1 && closeLift < closeUnmount, 'a thread close lifts the ask before the stage is cleared');
var hideAt = roomsSrc.indexOf('function hideRoomChat');
var hideLift = roomsSrc.indexOf('liftSealAsk(host)', hideAt);
var hideUnmount = roomsSrc.indexOf('GardenThread.unmount', hideAt);
assert.ok(hideLift !== -1 && hideLift < hideUnmount, 'closing room chat lifts the ask before the stage is cleared');
assert.ok(roomsSrc.indexOf('innerHTML') === roomsSrc.lastIndexOf('innerHTML') || roomsSrc.indexOf('function liftSealAsk') < roomsSrc.indexOf('stage.innerHTML'), 'the lift does not add a new clear');

var realSetTimeout = setTimeout;
var rafs = [];
var pops = [];
var observers = [];
var stack = [null];

function memStore() {
  var s = {};
  return {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(s, k) ? s[k] : null; },
    setItem: function (k, v) { s[k] = String(v); },
    removeItem: function (k) { delete s[k]; }
  };
}
function walk(el, fn) {
  if (!el) return;
  fn(el);
  var kids = el.children || [];
  var i;
  for (i = 0; i < kids.length; i++) walk(kids[i], fn);
}
function textOf(el) {
  var out = '';
  walk(el, function (node) { out += '\n' + (node.textContent || ''); });
  return out;
}
function relink(parent) {
  var kids = parent.children || [];
  var i;
  for (i = 0; i < kids.length; i++) {
    kids[i].parentNode = parent;
    kids[i].parentElement = parent;
    kids[i].nextSibling = kids[i + 1] || null;
  }
}
function detach(child) {
  var parent = child && child.parentNode;
  if (!parent || !parent.children) return;
  parent.children = parent.children.filter(function (c) { return c !== child; });
  relink(parent);
}
function classNames(node) {
  return String(node.className || '').split(/\s+/).filter(Boolean);
}
function matches(node, sel) {
  var s = String(sel || '').replace(/^\s+|\s+$/g, '');
  if (!s || !node) return false;
  if (s.indexOf('[') === -1 && (s.indexOf(' ') !== -1 || s.indexOf(':') !== -1)) return false;
  if (s.charAt(0) === '#' && s.indexOf('.') === -1 && s.indexOf('[') === -1) return node.id === s.slice(1);
  if (s.charAt(0) === '.' && s.indexOf('[') === -1) {
    var want = s.slice(1);
    return classNames(node).indexOf(want) !== -1;
  }
  var attr = s.match(/^\[([^\=\]]+)(?:\=["']?([^"'\]]*)["']?)?\]$/);
  if (!attr || !node.getAttribute) return false;
  var val = node.getAttribute(attr[1]);
  if (val == null) return false;
  if (attr[2] == null) return true;
  return String(val) === attr[2];
}
function findAll(rootNode, sel) {
  var parts = String(sel || '').split(',');
  var out = [];
  walk(rootNode, function (node) {
    if (node === rootNode) return;
    var i;
    for (i = 0; i < parts.length; i++) if (matches(node, parts[i])) out.push(node);
  });
  return out;
}
function findOne(rootNode, sel) {
  if (sel && sel.charAt(0) === '#' && sel.indexOf(' ') === -1 && sel.indexOf('.') === -1 && sel.indexOf('[') === -1) {
    var id = sel.slice(1);
    var hit = null;
    walk(rootNode, function (node) { if (node.id === id) hit = node; });
    return hit;
  }
  var all = findAll(rootNode, sel);
  return all.length ? all[0] : null;
}
function el(tag) {
  var node = {
    tagName: String(tag || 'div').toUpperCase(),
    id: '',
    className: '',
    textContent: '',
    value: '',
    style: {},
    children: [],
    parentNode: null,
    parentElement: null,
    nextSibling: null,
    attrs: {},
    listeners: {},
    disabled: false,
    hidden: false,
    clientWidth: 320,
    clientHeight: 44,
    offsetWidth: 320,
    offsetHeight: 44,
    setAttribute: function (k, v) {
      this.attrs[k] = String(v);
      if (k === 'id') this.id = String(v);
      if (k === 'class') this.className = String(v);
      if (k === 'disabled') this.disabled = true;
    },
    getAttribute: function (k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; },
    hasAttribute: function (k) { return Object.prototype.hasOwnProperty.call(this.attrs, k); },
    removeAttribute: function (k) {
      delete this.attrs[k];
      if (k === 'disabled') this.disabled = false;
      if (k === 'class') this.className = '';
    },
    addEventListener: function (type, fn) { (this.listeners[type] = this.listeners[type] || []).push(fn); },
    removeEventListener: function () {},
    fire: function (type, ev) {
      var event = ev || { target: node, type: type };
      (node.listeners[type] || []).slice().forEach(function (fn) { fn(event); });
    },
    click: function () { node.fire('click', { target: node, type: 'click', preventDefault: function () {}, stopPropagation: function () {} }); },
    focus: function () { node.focused = true; },
    scrollIntoView: function (opts) { node.scrolled = opts || {}; },
    getBoundingClientRect: function () {
      return { x: 16, y: 72, top: 72, bottom: 116, left: 16, right: 200, width: 184, height: 44 };
    },
    contains: function (other) {
      var n = other;
      while (n) {
        if (n === node) return true;
        n = n.parentNode;
      }
      return false;
    },
    appendChild: function (child) {
      if (!child) return child;
      detach(child);
      child.parentNode = this;
      child.parentElement = this;
      this.children.push(child);
      relink(this);
      return child;
    },
    insertBefore: function (child, ref) {
      if (!child) return child;
      detach(child);
      child.parentNode = this;
      child.parentElement = this;
      var at = this.children.indexOf(ref);
      if (at < 0) this.children.push(child);
      else this.children.splice(at, 0, child);
      relink(this);
      return child;
    },
    removeChild: function (child) {
      detach(child);
      child.parentNode = null;
      child.parentElement = null;
      child.nextSibling = null;
      return child;
    },
    querySelector: function (sel) { return findOne(this, sel); },
    querySelectorAll: function (sel) { return findAll(this, sel); },
    closest: function (sel) {
      var n = node;
      while (n) {
        if (matches(n, sel)) return n;
        n = n.parentNode;
      }
      return null;
    }
  };
  node.classList = {
    add: function () {
      var list = classNames(node);
      var i;
      for (i = 0; i < arguments.length; i++) {
        if (list.indexOf(arguments[i]) === -1) list.push(arguments[i]);
      }
      node.className = list.join(' ');
    },
    remove: function () {
      var drop = Array.prototype.slice.call(arguments);
      node.className = classNames(node).filter(function (n) { return drop.indexOf(n) === -1; }).join(' ');
    },
    contains: function (name) { return classNames(node).indexOf(name) !== -1; }
  };
  Object.defineProperty(node, 'innerHTML', {
    configurable: true,
    get: function () { return ''; },
    set: function (v) {
      if (String(v) === '') {
        while (node.children.length) node.removeChild(node.children[0]);
      }
    }
  });
  return node;
}
function byId(id) {
  var found = null;
  walk(body, function (node) { if (node.id === id) found = node; });
  return found;
}
function makeIDB() {
  var databases = {};
  function clone(v) { return v == null ? v : JSON.parse(JSON.stringify(v)); }
  function makeDb() {
    var stores = {};
    return {
      objectStoreNames: { contains: function (n) { return !!stores[n]; } },
      createObjectStore: function (n, opts) { stores[n] = { keyPath: opts && opts.keyPath, rows: {} }; },
      transaction: function (storeName) {
        var store = stores[storeName];
        var tx = { oncomplete: null, onerror: null, onabort: null };
        var pending = 0;
        var closed = false;
        var finished = false;
        function finish() {
          if (finished || pending > 0 || !closed) return;
          finished = true;
          realSetTimeout(function () { if (tx.oncomplete) tx.oncomplete(); }, 0);
        }
        function request(fill) {
          pending += 1;
          var r = {};
          realSetTimeout(function () {
            var failed = false;
            try { fill(r); failed = !!r._fail; } catch (e) { failed = true; }
            if (failed) { if (r.onerror) r.onerror({}); }
            else if (r.onsuccess) r.onsuccess({ target: r });
            pending -= 1;
            finish();
          }, 0);
          return r;
        }
        var api = {
          get: function (key) {
            return request(function (r) {
              var row = store.rows[key];
              r.result = row ? clone(row) : undefined;
            });
          },
          getAll: function () {
            return request(function (r) {
              r.result = Object.keys(store.rows).map(function (k) { return clone(store.rows[k]); });
            });
          },
          add: function (record) {
            return request(function (r) {
              var key = record[store.keyPath];
              if (Object.prototype.hasOwnProperty.call(store.rows, key)) { r._fail = true; return; }
              store.rows[key] = clone(record);
              r.result = key;
            });
          },
          put: function (record) {
            return request(function (r) {
              store.rows[record[store.keyPath]] = clone(record);
              r.result = record[store.keyPath];
            });
          }
        };
        realSetTimeout(function () { closed = true; finish(); }, 0);
        tx.objectStore = function () { return api; };
        return tx;
      }
    };
  }
  return {
    open: function (name) {
      var req = {};
      realSetTimeout(function () {
        if (!databases[name]) {
          var db = makeDb();
          databases[name] = db;
          req.result = db;
          if (req.onupgradeneeded) req.onupgradeneeded({ target: { result: db } });
        } else req.result = databases[name];
        if (req.onsuccess) req.onsuccess({ target: { result: req.result } });
      }, 0);
      return req;
    }
  };
}
function flushRaf(limit) {
  var guard = 0;
  var cap = limit || 6;
  while (rafs.length && guard < cap) {
    guard += 1;
    var batch = rafs.splice(0, rafs.length);
    var i;
    for (i = 0; i < batch.length; i++) batch[i]();
  }
}
function goBack() {
  if (stack.length > 1) stack.pop();
  var ev = {
    state: stack[stack.length - 1],
    stopImmediatePropagation: function () { ev.stopped = true; }
  };
  var i;
  for (i = 0; i < pops.length; i++) {
    pops[i](ev);
    if (ev.stopped) break;
  }
  return ev;
}
function makeDock(label) {
  var dock = el('div');
  dock.id = 'fl-ws-asks';
  var btn = el('button');
  btn.setAttribute('aria-label', 'Approve seal');
  btn.textContent = label || 'Seal it';
  dock.appendChild(btn);
  return dock;
}

var body = el('body');
var head = el('head');
var rootEl = el('html');
rootEl.appendChild(body);
rootEl.setAttribute('data-garden-galaxy', 'shelf');
var place = el('div');
place.id = 'place-veil';
place.hidden = true;
body.appendChild(place);
var room = el('div');
room.id = 'room-chat';
room.hidden = true;
var roomStage = el('div');
roomStage.id = 'room-chat-stage';
room.appendChild(roomStage);
body.appendChild(room);
var thread = el('div');
thread.id = 'thread-veil';
thread.hidden = true;
var stage = el('div');
stage.id = 'thread-stage';
thread.appendChild(stage);
body.appendChild(thread);
var threadOpen = el('button');
threadOpen.id = 'thread-open';
threadOpen.textContent = 'Chat';
body.appendChild(threadOpen);
var threadClose = el('button');
threadClose.id = 'thread-close';
threadClose.textContent = 'the garden';
body.appendChild(threadClose);
var threadBody = el('div');
threadBody.className = 'thread-body';
body.appendChild(threadBody);
var placeClose = el('button');
placeClose.id = 'place-veil-close';
placeClose.textContent = 'the garden';
body.appendChild(placeClose);

global.window = global;
global.localStorage = memStore();
global.sessionStorage = memStore();
global.document = {
  readyState: 'complete',
  body: body,
  head: head,
  documentElement: rootEl,
  activeElement: null,
  visibilityState: 'visible',
  createElement: el,
  addEventListener: function (type, fn) { (this._keys = this._keys || {})[type] = (this._keys[type] || []).concat(fn); },
  getElementById: byId,
  querySelector: function (sel) { return findOne(body, sel) || findOne(rootEl, sel); },
  querySelectorAll: function (sel) { return findAll(body, sel); }
};
global.indexedDB = makeIDB();
global.innerHeight = 800;
global.innerWidth = 1280;
global.devicePixelRatio = 1;
global.location = { pathname: '/index.html', href: 'http://127.0.0.1/index.html' };
global.addEventListener = function (type, fn) {
  if (type === 'popstate') pops.push(fn);
};
global.removeEventListener = function () {};
global.getComputedStyle = function () {
  return { position: 'static', overflow: 'hidden', overflowY: 'hidden', backgroundColor: 'rgba(0,0,0,0)' };
};
global.matchMedia = function (q) { return { matches: String(q).indexOf('reduce') !== -1 }; };
global.history = {
  get state() { return stack[stack.length - 1]; },
  pushState: function (s) { stack.push(s); },
  back: function () { goBack(); }
};
global.requestAnimationFrame = function (fn) { rafs.push(fn); return rafs.length; };
global.cancelAnimationFrame = function () {};
global.setTimeout = function (fn, ms) {
  if (!ms) return realSetTimeout(fn, 0);
  return 0;
};
global.clearTimeout = function () {};
global.setInterval = function () { return 0; };
global.clearInterval = function () {};
global.MutationObserver = function (cb) {
  this.observe = function (target) { this.target = target; observers.push(this); };
  this.disconnect = function () {};
  this._cb = cb;
};
global.ResizeObserver = function () {
  this.observe = function () {};
  this.disconnect = function () {};
};
global.LocalMindProbe = { getRemembered: function () { return { name: 'Lumen', model: 'shelf-model', url: 'http://127.0.0.1:9' }; } };
global.FLMindSeal = {
  contextHash: function () { return Promise.resolve('abc123context'); },
  trustedMap: function () { return { 'shelf-model': { configHash: 'cfg' } }; }
};
global.GardenThread = {
  _host: null,
  mount: function (host) { this._host = host; },
  hostIs: function (host) { return this._host === host; },
  unmount: function () {
    var host = this._host;
    this._host = null;
    if (!host) return;
    while (host.children && host.children.length) host.removeChild(host.children[0]);
  }
};

var ws = require(path.join(rootDir, 'docs/modules/mind-workspace.js'));
require(path.join(rootDir, 'docs/modules/garden-rooms.js'));

global.addEventListener('popstate', function (e) {
  if (e && e.stopped) return;
  if (!thread.classList.contains('is-open')) return;
  if (global.GardenRooms && typeof global.GardenRooms.closeThread === 'function') {
    global.GardenRooms.closeThread();
  }
});

function flushRoom() {
  var i;
  for (i = 0; i < observers.length; i++) {
    if (observers[i].target && observers[i].target.id === 'room-chat' && observers[i]._cb) {
      try { observers[i]._cb([]); } catch (eObs) {}
    }
  }
}

(async function () {
  var rooms = global.GardenRooms;
  assert.strictEqual(typeof rooms.liftSealAsk, 'function', 'the garden can lift an ask');

  place.hidden = false;
  place.classList.add('is-core');
  place.classList.add('is-open');
  room.hidden = false;
  var dock = makeDock('Seal it');
  room.appendChild(dock);
  assert.ok(room.contains(dock), 'the ask starts inside the Gathering card');
  assert.strictEqual(rooms.liftSealAsk(room), true, 'an ask inside the Gathering card is lifted');
  assert.strictEqual(dock.parentNode, body, 'the lifted ask is on the garden, not in the card');
  assert.strictEqual(dock.style.position, 'fixed', 'the lifted ask is fixed on the garden');
  assert.strictEqual(dock.style.zIndex, '1007', 'Seal it is above the shared shoulder');
  assert.ok(dock.querySelector('[aria-label="Approve seal"]').scrolled, 'Seal it is brought into view');
  assert.ok(!room.contains(dock), 'the Gathering card no longer clips the ask');

  room.appendChild(dock);
  dock.style.position = '';
  dock.style.zIndex = '';
  assert.ok(room.contains(dock), 'the ask can be drawn back into the card');
  flushRoom();
  flushRaf(4);
  assert.strictEqual(dock.parentNode, body, 'the Gathering watch lifts an ask that lands in the card');
  assert.strictEqual(dock.style.zIndex, '1007', 'the watched ask stays above the shoulder');

  assert.strictEqual(rooms.liftSealAsk(stage), false, 'an ask on the garden is not pulled into a closed thread');
  stage.appendChild(dock);
  assert.strictEqual(rooms.liftSealAsk(room), false, 'an open thread keeps its own ask');
  assert.ok(stage.contains(dock), 'the thread ask stays in the thread');

  place.classList.remove('is-core');
  place.classList.remove('is-open');
  place.hidden = true;
  room.hidden = true;
  if (dock.parentNode) dock.parentNode.removeChild(dock);

  var form = el('form');
  var row = el('div');
  var input = el('textarea');
  input.setAttribute('data-thread-input', '1');
  row.appendChild(input);
  form.appendChild(row);
  stage.appendChild(form);
  thread.hidden = false;
  thread.classList.add('is-open');
  global.GardenThread.mount(stage);

  assert.strictEqual(ws.SEAL_LAST, 'v-seal-ask-last-two-v0.1', 'the notebook marker stays');
  var now = 4000000;
  ws.bindClock(function () { return now; });
  async function drain() {
    var i;
    for (i = 0; i < 24; i++) {
      await new Promise(function (resolve) { realSetTimeout(resolve, 0); });
      await ws.settled();
    }
  }
  await ws.setMind('shelf-model', 'Lumen');
  await ws.accept();
  await drain();
  var opened = await ws.open('a quiet note', { kind: 'note' });
  await drain();
  var pageId = opened.page.id;
  now += 6000;
  ws.resetRate();
  await ws.write(pageId, 'a line for the heart', 'mind');
  await drain();
  var asked = await ws.askSeal(pageId, 'because the heart asked');
  await drain();
  flushRaf(6);
  assert.strictEqual(asked.ok, true, 'the mind asked');
  assert.strictEqual(ws.sealState(pageId), 'asked', 'the ask is open');
  global.history.pushState({ treeWayBack: 1 });
  var live = byId('fl-ws-asks');
  assert.ok(live, 'the ask is on the page');
  if (!stage.contains(live)) stage.appendChild(live);
  assert.ok(stage.contains(live), 'the ask sits in the open thread');
  goBack();
  assert.strictEqual(ws.sealState(pageId), 'asked', 'Back from a thread leaves the ask open');
  assert.ok(!thread.classList.contains('is-open'), 'Back closes the thread');
  live = byId('fl-ws-asks');
  assert.ok(live && live.parentNode === body, 'the ask stays on the garden after the thread closes');
  assert.ok(textOf(live).indexOf('Seal it') !== -1, 'Seal it stays shown');
  assert.strictEqual(live.style.zIndex, '1007', 'Seal it stays on top after the thread closes');
  assert.ok(textOf(body).indexOf('Saved your answer for later.') === -1, 'the first Back does not defer');
  goBack();
  await drain();
  assert.strictEqual(ws.sealState(pageId), 'later', 'a second Back defers the ask');
  assert.ok(textOf(body).indexOf('Saved your answer for later.') !== -1, 'deferring says so');

  console.log('SMOKE_OK tree ask last v0.1');
})().catch(function (err) {
  console.error(err);
  process.exit(1);
});
