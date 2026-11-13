#!/usr/bin/env node
// Node tests for v-tree-door-first-run-calm-v0.2, v-tree-gathering-brick3-v0.2,
// and v-tree-thread-chat-layer-v0.2. Local only. Does not load quiet-room.
// Does not change AUTONOMY.md. Fake timers cover the new delay and observers.
'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');
var assert = require('assert');
var crypto = require('crypto');

var docs = path.join(__dirname, '..');
var root = path.join(docs, '..');

function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function md5(rel) {
  return crypto.createHash('md5').update(fs.readFileSync(path.join(root, rel))).digest('hex');
}

assert.strictEqual(md5('AUTONOMY.md'), '09a4f1a286226e37089a93df42df0106', 'AUTONOMY.md unchanged');
assert.strictEqual(md5('docs/modules/fl-connect.js'), 'aaff2bf1b037656989a9e1a89bb05908', 'fl-connect.js unchanged');
assert.strictEqual(md5('docs/modules/likeness-line.js'), md5('docs/modules/likeness-line.js'), 'likeness present');
assert.strictEqual(md5('docs/modules/fl-gathering.js'), '4dbbff5d554c42256605b37939835080', 'fl-gathering twin unchanged');
assert.strictEqual(md5('docs/modules/gathering-speak.js'), crypto.createHash('md5').update(read('docs/modules/gathering-speak.js')).digest('hex'), 'gathering-speak present');

var twins = [
  'docs/modules/fl-gathering.js',
  'docs/modules/gathering-speak.js',
  'docs/modules/likeness-line.js',
  'docs/modules/fl-connect.js',
  'docs/modules/clay-corner.js',
  'docs/modules/particle-clay.js'
];
twins.forEach(function (rel) {
  assert.ok(!/v-tree-door-first-run-calm-v0\.1/.test(read(rel)), rel + ' was not rewritten');
});

assert.ok(!/quiet-room/i.test(
  read('docs/modules/tree-door-first-run-calm.js') +
  read('docs/modules/tree-door-no-auto.js') +
  read('docs/modules/tree-gathering-mount.js') +
  read('docs/modules/tree-thread-chat-layer.js')
), 'new layers do not name quiet-room');

var index = read('docs/index.html');
var settings = read('docs/settings.html');
assert.ok(index.indexOf('tree-door-no-auto.js') < index.indexOf('tree-door.js'), 'no-auto loads first on home');
assert.ok(index.indexOf('tree-door.js') < index.indexOf('tree-door-first-run-calm.js'), 'calm layer follows tree-door on home');
assert.ok(settings.indexOf('tree-door-no-auto.js') < settings.indexOf('tree-door.js'), 'no-auto loads first on Settings');
assert.ok(index.includes('fl-gathering.js') && index.includes('gathering-speak.js') && index.includes('tree-gathering-mount.js'), 'home mounts Gathering twins');
assert.ok(index.includes('chat-wait.js') && index.includes('chat-bottom-clarity.js') && index.includes('chat-autonomy.js') && index.includes('tree-thread-chat-layer.js'), 'home layers chat helpers');
assert.ok(index.includes('css/chat-bottom-clarity.css'), 'home has chat-bottom CSS');
assert.ok(/2026-11-13 \(MST\), chat and first-run ports/.test(read('SPINE.md')), 'SPINE Done row present');
assert.ok(/## 4\. Next/.test(read('SPINE.md')) && /Welcome page that verifies FreeLattice signed mind bundles/.test(read('SPINE.md')), 'SPINE Next is still there');

// ---- fake DOM / timers ----
function makeDom(pathname) {
  var timers = [];
  var nextId = 1;
  var now = 0;
  var observers = [];

  function el(tag) {
    var node = {
      tagName: String(tag || 'div').toUpperCase(),
      id: '',
      className: '',
      hidden: false,
      parentNode: null,
      children: [],
      attributes: {},
      style: {},
      textContent: '',
      classList: {
        _n: nodeRef,
        contains: function (c) { return (' ' + nodeRef.className + ' ').indexOf(' ' + c + ' ') !== -1; },
        add: function (c) {
          if (!this.contains(c)) nodeRef.className = (nodeRef.className ? nodeRef.className + ' ' : '') + c;
        },
        remove: function (c) {
          nodeRef.className = String(nodeRef.className || '').split(/\s+/).filter(function (x) { return x && x !== c; }).join(' ');
        }
      },
      setAttribute: function (k, v) { this.attributes[k] = String(v); if (k === 'id') this.id = String(v); },
      getAttribute: function (k) { return this.attributes[k] || (k === 'id' ? this.id : ''); },
      appendChild: function (c) { c.parentNode = this; this.children.push(c); return c; },
      insertBefore: function (c, ref) {
        c.parentNode = this;
        var i = this.children.indexOf(ref);
        if (i < 0) this.children.push(c); else this.children.splice(i, 0, c);
        return c;
      },
      removeChild: function (c) {
        var i = this.children.indexOf(c);
        if (i >= 0) this.children.splice(i, 1);
        c.parentNode = null;
        return c;
      },
      querySelector: function (sel) { return query(this, sel)[0] || null; },
      querySelectorAll: function (sel) { return query(this, sel); },
      contains: function (n) {
        if (n === this) return true;
        return this.children.some(function (ch) { return ch.contains && ch.contains(n); });
      },
      addEventListener: function () {},
      removeEventListener: function () {},
      blur: function () { document.activeElement = document.body; },
      focus: function () { document.activeElement = this; }
    };
    var nodeRef = node;
    node.classList._n = node;
    return node;
  }

  function walk(n, out) {
    out.push(n);
    (n.children || []).forEach(function (c) { walk(c, out); });
  }
  function query(from, sel) {
    sel = String(sel || '');
    if (sel.indexOf(',') !== -1) {
      var acc = [];
      sel.split(',').forEach(function (part) {
        query(from, part.trim()).forEach(function (n) {
          if (acc.indexOf(n) === -1) acc.push(n);
        });
      });
      return acc;
    }
    var all = [];
    walk(from, all);
    var attr = sel.match(/^\[([a-zA-Z0-9_-]+)(?:=['"]?([^\]]+)['"]?)?\]$/);
    if (attr) {
      return all.filter(function (n) {
        var v = n.getAttribute && n.getAttribute(attr[1]);
        if (attr[2] != null) return v === attr[2];
        return !!(v || (n.attributes && n.attributes[attr[1]] != null));
      });
    }
    if (sel.charAt(0) === '#') {
      var id = sel.slice(1).split(' ')[0].split('.')[0].split('[')[0];
      return all.filter(function (n) { return n.id === id; });
    }
    if (sel.charAt(0) === '.') {
      var cls = sel.slice(1).split('[')[0];
      return all.filter(function (n) { return n.classList && n.classList.contains(cls); });
    }
    return all.filter(function (n) { return (n.tagName || '').toLowerCase() === sel.toLowerCase(); });
  }

  var body = el('body');
  var head = el('head');
  var html = el('html');
  var place = el('div');
  place.id = 'place-veil';
  place.setAttribute('id', 'place-veil');
  place.hidden = true;
  var gathering = el('div');
  gathering.id = 'core-gathering';
  gathering.setAttribute('id', 'core-gathering');
  gathering.hidden = true;
  var inner = el('div');
  inner.className = 'core-gathering';
  var caption = el('p');
  caption.className = 'core-center';
  caption.setAttribute('data-core-router-plain', '1');
  caption.textContent = 'You choose who sits. Nothing is assigned for you.';
  inner.appendChild(caption);
  var family = el('p');
  family.className = 'core-family';
  family.textContent = 'Family care — Celeste · Hypha · Weft · Reed';
  var router = el('p');
  router.className = 'core-center core-router';
  router.textContent = 'Not a router. Not a dump. Find local minds, then seat with choice. Empty chairs stay honest.';
  var promise = el('div');
  promise.className = 'core-promise';
  promise.appendChild(family);
  promise.appendChild(router);
  inner.appendChild(promise);
  gathering.appendChild(inner);
  body.appendChild(place);
  body.appendChild(gathering);
  html.appendChild(head);
  html.appendChild(body);

  var document = {
    documentElement: html,
    head: head,
    body: body,
    readyState: 'complete',
    activeElement: body,
    createElement: function (tag) { return el(tag); },
    getElementById: function (id) {
      var found = query(html, '#' + id);
      return found[0] || null;
    },
    querySelector: function (sel) { return query(html, sel)[0] || null; },
    querySelectorAll: function (sel) { return query(html, sel); },
    addEventListener: function () {},
    removeEventListener: function () {}
  };

  function MutationObserver(cb) {
    this.cb = cb;
    this.targets = [];
  }
  MutationObserver.prototype.observe = function (node) {
    if (node && this.targets.indexOf(node) === -1) this.targets.push(node);
    if (observers.indexOf(this) === -1) observers.push(this);
  };
  MutationObserver.prototype.disconnect = function () {
    this.targets = [];
    var i = observers.indexOf(this);
    if (i >= 0) observers.splice(i, 1);
  };
  MutationObserver.prototype.takeRecords = function () { return []; };

  var sandbox = {
    console: console,
    window: null,
    document: document,
    location: { pathname: pathname, href: 'https://thelatticetree.com' + pathname },
    setTimeout: function (fn, ms) {
      var id = nextId++;
      timers.push({ id: id, fn: fn, at: now + (ms || 0), interval: false });
      return id;
    },
    clearTimeout: function (id) { timers = timers.filter(function (t) { return t.id !== id; }); },
    setInterval: function (fn, ms) {
      var id = nextId++;
      timers.push({ id: id, fn: fn, at: now + (ms || 0), interval: true, step: ms || 0 });
      return id;
    },
    clearInterval: function (id) { timers = timers.filter(function (t) { return t.id !== id; }); },
    MutationObserver: MutationObserver,
    Promise: Promise,
    addEventListener: function () {},
    scrollTo: function () { sandbox.scrollY = 0; },
    scrollY: 0,
    localStorage: (function () {
      var m = {};
      return { getItem: function (k) { return Object.prototype.hasOwnProperty.call(m, k) ? m[k] : null; }, setItem: function (k, v) { m[k] = String(v); }, removeItem: function (k) { delete m[k]; } };
    })(),
    sessionStorage: (function () {
      var m = {};
      return { getItem: function (k) { return Object.prototype.hasOwnProperty.call(m, k) ? m[k] : null; }, setItem: function (k, v) { m[k] = String(v); }, removeItem: function (k) { delete m[k]; } };
    })(),
    LocalMindProbe: { look: function () { return Promise.resolve(null); }, getRemembered: function () { return null; } },
    TreePool: { chatRoute: function () { return null; }, takeArrived: function () { return ''; }, stopScan: function () {} },
    TreeBrowserMind: { awakeModel: function () { return null; } },
    FLGathering: {
      mount: function (host) {
        var w = document.createElement('div');
        w.setAttribute('data-gathering', 'v-gathering-shared-v0.1');
        host.appendChild(w);
        return w;
      },
      unmount: function () {}
    },
    FLGatheringSpeak: {
      mount: function (host) {
        var w = document.createElement('section');
        w.setAttribute('data-marker', 'v-gathering-speak-checker-v0.1');
        var who = document.createElement('p');
        who.id = 'flgs-who';
        who.setAttribute('id', 'flgs-who');
        who.textContent = 'No chair is speaking yet. Seat a mind, then let that chair speak first. Find local minds is above. More, then Connect, can help.';
        var receipt = document.createElement('p');
        receipt.id = 'flgs-receipt';
        receipt.setAttribute('id', 'flgs-receipt');
        receipt.textContent = '';
        var ask = document.createElement('textarea');
        ask.id = 'flgs-ask';
        ask.setAttribute('id', 'flgs-ask');
        var btn = document.createElement('button');
        btn.id = 'flgs-ask-btn';
        btn.setAttribute('id', 'flgs-ask-btn');
        btn.addEventListener = function (ev, fn) { btn._click = fn; };
        host.appendChild(w);
        w.appendChild(who);
        w.appendChild(ask);
        w.appendChild(btn);
        w.appendChild(receipt);
        return w;
      }
    }
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;

  function advance(ms) {
    now += ms;
    var due = timers.filter(function (t) { return t.at <= now; }).sort(function (a, b) { return a.at - b.at; });
    due.forEach(function (t) {
      if (!t.interval) timers = timers.filter(function (x) { return x !== t; });
      else t.at = now + t.step;
      t.fn();
    });
  }

  return { sandbox: sandbox, document: document, advance: advance, timers: function () { return timers.slice(); }, observers: function () { return observers; }, place: place, gathering: gathering, inner: inner };
}

function loadTreeDoor(sandbox) {
  // Minimal stand-in for TreeDoor, enough for the calm layer. The real module
  // is also syntax-checked below. This stub mirrors shouldOffer / welcome / close.
  var veil = null;
  var kind = '';
  var open = false;
  function el(tag, cls) {
    var n = sandbox.document.createElement(tag);
    if (cls) n.className = cls;
    return n;
  }
  sandbox.TreeDoor = {
    VERSION: 'v-tree-grandmother-door-v0.1',
    shouldOffer: function () {
      return sandbox.sessionStorage.getItem('tree_door_not_now') !== '1' &&
        sandbox.sessionStorage.getItem('tree_door_closed_visit') !== '1';
    },
    hasMind: function () { return false; },
    quietLookAllowed: function () { return Promise.resolve('no'); },
    welcome: function () {
      var d = sandbox.document;
      veil = el('div', 'tree-door-veil');
      veil.className = 'tree-door-veil';
      var box = el('div', 'tree-door');
      box.className = 'tree-door';
      box.setAttribute('role', 'dialog');
      box.setAttribute('aria-modal', 'true');
      box.textContent = "Let's wake a mind for you";
      veil.appendChild(box);
      d.body.appendChild(veil);
      open = true;
      kind = 'welcome';
    },
    close: function (forVisit) {
      if (forVisit) sandbox.sessionStorage.setItem('tree_door_closed_visit', '1');
      if (veil && veil.parentNode) veil.parentNode.removeChild(veil);
      veil = null; open = false; kind = '';
    },
    isOpen: function () { return open; },
    kind: function () { return kind; }
  };
}

function runScript(sandbox, rel) {
  vm.runInNewContext(read(rel), sandbox, { filename: rel });
}

// Syntax of every new layer + copied helpers + tree-door (not quiet-room).
['docs/modules/tree-door-no-auto.js',
  'docs/modules/tree-door-first-run-calm.js',
  'docs/modules/tree-gathering-mount.js',
  'docs/modules/tree-thread-chat-layer.js',
  'docs/modules/tree-door.js',
  'docs/modules/chat-wait.js',
  'docs/modules/chat-bottom-clarity.js',
  'docs/modules/chat-autonomy.js',
  'docs/modules/fl-gathering.js',
  'docs/modules/gathering-speak.js'
].forEach(function (rel) {
  new vm.Script(read(rel), { filename: rel });
});

// Fake-timer: home offers after 900ms, as a calm non-modal card, scroll stays 0.
var home = makeDom('/index.html');
loadTreeDoor(home.sandbox);
assert.strictEqual(home.sandbox.TreeDoorNoAuto, undefined);
runScript(home.sandbox, 'docs/modules/tree-door-no-auto.js');
assert.strictEqual(home.sandbox.TreeDoorNoAuto, true, 'no-auto flag is set');
runScript(home.sandbox, 'docs/modules/tree-door-first-run-calm.js');
assert.ok(home.sandbox.TreeDoorFirstRunCalm, 'calm API');
assert.strictEqual(home.sandbox.TreeDoorFirstRunCalm.DELAY, 900);
assert.strictEqual(home.timers().length, 1, 'start is deferred on a 0ms timer');
assert.strictEqual(home.document.querySelector('.tree-door-veil'), null, 'no veil before the delay');
home.advance(0);
assert.strictEqual(home.timers().length, 1, 'one offer timer is armed after start');
assert.strictEqual(home.document.querySelector('.tree-door-veil'), null, 'still closed just after start');
home.advance(899);
assert.strictEqual(home.document.querySelector('.tree-door-veil'), null, 'still closed at 899ms');
home.advance(1);
// welcome is sync when quietLookAllowed resolves "no" via Promise; flush microtasks
return Promise.resolve().then(function () {
  return Promise.resolve();
}).then(function () {
  var veil = home.document.querySelector('.tree-door-veil');
  assert.ok(veil, 'card appears at 900ms');
  assert.strictEqual(veil.getAttribute('data-tree-door-calm'), 'v-tree-door-first-run-calm-v0.2', 'marked calm');
  var box = veil.querySelector('.tree-door');
  assert.ok(box, 'dialog box exists');
  assert.strictEqual(box.getAttribute('aria-modal'), 'false', 'not modal');
  assert.strictEqual(home.sandbox.scrollY, 0, 'scrollY stays 0');

  // Opening the Gathering hides the auto card (observer + sync).
  home.place.hidden = false;
  home.place.className = 'is-open is-core';
  home.gathering.hidden = false;
  home.observers().forEach(function (o) { o.cb([]); });
  assert.strictEqual(home.sandbox.TreeDoor.isOpen(), false, 'auto card closes when Gathering opens');

  // Settings: no auto timer, no veil.
  var set = makeDom('/settings.html');
  loadTreeDoor(set.sandbox);
  runScript(set.sandbox, 'docs/modules/tree-door-no-auto.js');
  runScript(set.sandbox, 'docs/modules/tree-door-first-run-calm.js');
  assert.strictEqual(set.sandbox.TreeDoorFirstRunCalm.isSettingsPage(), true);
  set.advance(0);
  assert.ok(set.timers().every(function (tm) { return tm.step; }) || set.timers().length === 0, 'Settings does not arm the 900ms auto offer');
  assert.strictEqual(set.document.querySelector('.tree-door-veil'), null, 'Settings has no auto veil after start');
  set.advance(5000);
  assert.strictEqual(set.document.querySelector('.tree-door-veil'), null, 'Settings has no auto veil later');

  // Gathering mount with observer: opening the room mounts twins once, no loop.
  var g = makeDom('/index.html');
  runScript(g.sandbox, 'docs/modules/tree-gathering-mount.js');
  g.advance(0);
  assert.ok(g.sandbox.TreeGatheringMount, 'mount API');
  assert.strictEqual(g.document.getElementById('fl-gathering-mount'), null, 'not mounted while closed');
  g.place.hidden = false;
  g.place.className = 'is-open is-core';
  g.gathering.hidden = false;
  g.observers().forEach(function (o) { o.cb([]); });
  var chairs = g.document.getElementById('fl-gathering-mount');
  var speak = g.document.getElementById('fl-gathering-speak-mount');
  assert.ok(chairs && speak, 'hosts exist after open');
  assert.ok(chairs.querySelector('[data-gathering]'), 'FLGathering mounted');
  assert.ok(speak.querySelector('[data-marker]'), 'FLGatheringSpeak mounted');
  var observerCount = g.observers().length;
  g.observers().forEach(function (o) { o.cb([]); });
  g.observers().forEach(function (o) { o.cb([]); });
  assert.strictEqual(g.observers().length, observerCount, 'observer does not multiply');
  assert.strictEqual(chairs.children.length, 1, 'mount is idempotent (no duplicate chairs)');
  assert.ok(g.inner.classList.contains('is-fl-gathering-mounted'), 'duplicate core is marked hidden after a successful mount');
  var mountCss = (g.document.getElementById('tree-gathering-mount-style') || {}).textContent || '';
  assert.ok(mountCss.indexOf('.is-fl-gathering-mounted > :not(#fl-gathering-layer)') !== -1, 'CSS hides the older core render once mounted');
  var receipt = g.document.getElementById('flgs-receipt');
  var who = g.document.getElementById('flgs-who');
  assert.ok(who && receipt, 'who and receipt exist');
  receipt.textContent = who.textContent;
  g.sandbox.TreeGatheringMount.dedupeRefusal();
  assert.ok(receipt.hidden || !String(receipt.textContent || '').trim(), 'duplicate kind refusal is kept once');
  assert.ok(String(who.textContent || '').indexOf('No chair is speaking yet') !== -1, 'the standing kind line stays');

  // Fallback: if the shared mount is missing, the older Gathering stays.
  var miss = makeDom('/index.html');
  miss.sandbox.FLGathering = {};
  runScript(miss.sandbox, 'docs/modules/tree-gathering-mount.js');
  miss.advance(0);
  miss.place.hidden = false;
  miss.place.className = 'is-open is-core';
  miss.gathering.hidden = false;
  miss.observers().forEach(function (o) { o.cb([]); });
  assert.ok(!miss.inner.classList.contains('is-fl-gathering-mounted'), 'mount failure leaves the older render');
  assert.ok(miss.inner.querySelector('.core-family'), 'Family care remains as the fallback');

  var boom = makeDom('/index.html');
  boom.sandbox.FLGathering.mount = function () { throw new Error('no mount'); };
  runScript(boom.sandbox, 'docs/modules/tree-gathering-mount.js');
  boom.advance(0);
  boom.place.hidden = false;
  boom.place.className = 'is-open is-core';
  boom.gathering.hidden = false;
  boom.observers().forEach(function (o) { o.cb([]); });
  assert.ok(!boom.inner.classList.contains('is-fl-gathering-mounted'), 'a thrown mount does not hide the older render');

  // First-run card CSS leaves the left legend and Nursery light.
  var calmCss = (home.document.getElementById('tree-door-first-run-calm-style') || {}).textContent || '';
  assert.ok(calmCss.indexOf('left:50%') !== -1, 'first-run card is centered, not on the left legend');
  assert.ok(calmCss.indexOf('4.75rem') !== -1, 'first-run card sits above the shared shoulder');

  // Thread layer wraps GardenThread.mount and stamps composer ids.
  var t = makeDom('/index.html');
  var mounted = 0;
  t.sandbox.GardenThread = {
    mount: function (stage) {
      mounted += 1;
      var form = t.document.createElement('form');
      form.className = 'thread-compose';
      var input = t.document.createElement('input');
      input.className = 'thread-input';
      input.setAttribute('data-thread-input', '1');
      var send = t.document.createElement('button');
      send.className = 'thread-send';
      form.appendChild(input);
      form.appendChild(send);
      stage.appendChild(form);
    }
  };
  t.sandbox.FLChatBottom = { arrange: function () { t.sandbox._arranged = true; } };
  t.sandbox.FLChatAutonomy = { boot: function () { t.sandbox._booted = true; } };
  t.sandbox.FLChatWait = { hold: function () { t.sandbox._held = true; return { ok: true }; } };
  var stage = t.document.createElement('div');
  t.document.body.appendChild(stage);
  runScript(t.sandbox, 'docs/modules/tree-thread-chat-layer.js');
  t.sandbox.GardenThread.mount(stage);
  assert.strictEqual(mounted, 1, 'original mount still ran');
  assert.strictEqual(stage.getAttribute('id') || stage.id, 'tab-chat', 'stage is tab-chat');
  var input = stage.querySelector('.thread-input');
  var send = stage.querySelector('.thread-send');
  assert.strictEqual(input.id, 'chatInput');
  assert.strictEqual(send.id, 'sendBtn');
  assert.ok(t.sandbox._arranged && t.sandbox._booted, 'chat helpers were asked to arrange/boot');
  var hint = t.document.getElementById('tree-thread-wait-hint');
  assert.ok(hint && /waiting/i.test(hint.textContent), 'no-mind composer carries a short waiting hint');
  var compose = stage.querySelector('.thread-compose');
  assert.ok(compose && compose.classList.contains('is-tree-thread-waiting'), 'composer is marked waiting');
  assert.ok(/Say something — waiting for a mind/.test(input.placeholder || ''), 'input placeholder is a waiting hint');

  console.log('ok tree-ports-1113 fake-timers and pins');
});
