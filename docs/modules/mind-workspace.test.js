// mind-workspace.test.js (MIT) v-tree-workspace-core-v0.1
// Node only. Same notebook bytes as FreeLattice. Off until a person says yes.
var fs = require('fs');
var path = require('path');
var crypto = require('crypto');
var assert = require('assert');

var here = __dirname;
function md5(file) {
  return crypto.createHash('md5').update(fs.readFileSync(file)).digest('hex');
}
var src = fs.readFileSync(path.join(here, 'mind-workspace.js'), 'utf8');
assert.ok(src.indexOf('v-workspace-core-v0.1') !== -1, 'marker');
assert.ok(src.indexOf('\u2014') === -1, 'em dash');
assert.ok(src.indexOf('&' + 'mdash;') === -1, 'mdash');
assert.ok(src.indexOf('inner' + 'HTML') === -1, 'text only');
assert.ok(src.indexOf('conf' + 'irm(') === -1, 'dialog');
assert.ok(src.indexOf('ev' + 'al(') === -1, 'eval');
assert.ok(src.indexOf('new F' + 'unction') === -1, 'Function');
assert.ok(src.indexOf('.delete(') === -1, 'nothing deletes');

var sibling = '/Users/kirkmiller/FreeLattice-fresh/docs/modules/mind-workspace.js';
if (fs.existsSync(sibling)) {
  assert.strictEqual(md5(path.join(here, 'mind-workspace.js')), md5(sibling), 'mind-workspace.js bytes match FreeLattice');
}

var thread = fs.readFileSync(path.join(here, 'garden-thread.js'), 'utf8');
var hook = 'FLWorkspace.onReply(messages[messages.length - 1].text, messages)';
assert.strictEqual(thread.split(hook).length, 2, 'one notebook hook');
assert.ok(thread.indexOf('v-tree-workspace-core-v0.1') !== -1, 'tree marker');
assert.ok(thread.indexOf('v-tree-workspace-mark-heal-v0.1') !== -1, 'tree heal marker');
assert.ok(thread.indexOf('JUST_TALK + gardenMindTails()') !== -1, 'the garden send carries the tails');
var clayHook = 'FLClay.onReply(messages[messages.length - 1].text, messages)';
assert.ok(thread.indexOf(clayHook) < thread.indexOf(hook), 'notebook hook sits beside the clay hook');

['index.html', 'settings.html', 'workshop.html', 'research.html', 'music.html', 'round-table.html', 'nursery.html'].forEach(function (page) {
  var html = fs.readFileSync(path.join(here, '..', page), 'utf8');
  assert.ok(html.indexOf('modules/mind-workspace.js') !== -1, page + ' loads the notebook');
  assert.ok(html.indexOf('v-tree-workspace-core-v0.1') !== -1, page + ' names the tree marker');
});
var nursery = fs.readFileSync(path.join(here, '../nursery.html'), 'utf8');
assert.ok(nursery.indexOf("FLWorkspace.mount(document.getElementById('nursery-stage'))") !== -1, 'nursery mounts the notebook');

function memStore() {
  var s = {};
  return {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(s, k) ? s[k] : null; },
    setItem: function (k, v) { s[k] = String(v); },
    removeItem: function (k) { delete s[k]; }
  };
}
function makeIDB() {
  var databases = {};
  function clone(v) { return v == null ? v : JSON.parse(JSON.stringify(v)); }
  function makeDb() {
    var stores = {};
    return {
      objectStoreNames: { contains: function (n) { return !!stores[n]; } },
      createObjectStore: function (n, opts) { stores[n] = { keyPath: opts.keyPath, rows: {} }; },
      transaction: function (storeName) {
        var store = stores[storeName];
        var tx = { oncomplete: null, onerror: null, onabort: null };
        var pending = 0;
        var closed = false;
        var finished = false;
        function finish() {
          if (finished || pending > 0 || !closed) return;
          finished = true;
          setTimeout(function () { if (tx.oncomplete) tx.oncomplete(); }, 0);
        }
        function request(fill) {
          pending += 1;
          var r = {};
          setTimeout(function () {
            var failed = false;
            try { fill(r); failed = !!r._fail; } catch (e) { failed = true; }
            if (failed) { if (r.onerror) r.onerror({}); }
            else if (r.onsuccess) r.onsuccess({ target: r });
            pending -= 1;
            finish();
          }, 0);
          return r;
        }
        tx.objectStore = function () {
          return {
            get: function (key) {
              return request(function (r) { var row = store.rows[key]; r.result = row ? clone(row) : undefined; });
            },
            getAll: function () {
              return request(function (r) { r.result = Object.keys(store.rows).map(function (k) { return clone(store.rows[k]); }); });
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
        };
        setTimeout(function () { closed = true; finish(); }, 0);
        return tx;
      }
    };
  }
  return {
    open: function (name) {
      var req = {};
      setTimeout(function () {
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

global.window = global;
global.localStorage = memStore();
global.sessionStorage = memStore();
global.document = {
  readyState: 'loading',
  body: null,
  addEventListener: function () {},
  getElementById: function () { return null; },
  createElement: function () {
    return {
      style: {},
      children: [],
      appendChild: function (child) { this.children.push(child); return child; },
      setAttribute: function () {},
      addEventListener: function () {}
    };
  }
};
global.indexedDB = makeIDB();
var vaultPath = '/Users/kirkmiller/FreeLattice-fresh/docs/modules/memory-vault.js';
if (fs.existsSync(vaultPath)) require(vaultPath);

var ws = require('./mind-workspace.js');
var now = 5000;
ws.bindClock(function () { return now; });

(async function () {
  assert.strictEqual(ws.isOn(), false, 'starts off');
  assert.strictEqual(ws.promptDelta(), '', 'off means no wake');
  assert.strictEqual(ws.dbOpens(), 0, 'off means no IndexedDB');
  var stripped = ws.consumeReply('Hi [FL_WS: {"op":"private","title":"No"}] [FL_WS: {"op":"seal"}]');
  assert.ok(stripped.visible.indexOf('[FL_WS') === -1, 'tags strip while off');
  assert.strictEqual(ws.dbOpens(), 0, 'still no IndexedDB');
  await ws.setMind('tree-model', 'Nyx');
  await ws.accept();
  now += 5;
  var page = await ws.open('Today', { kind: 'future' });
  var wrote = await ws.write(page.page.id, 'a note for my future self', 'mind');
  assert.ok(wrote.ok, 'a version is kept');
  var again = await ws.saveVersion({
    hash: wrote.hash, pageId: page.page.id, parent: null, branchOf: null,
    ts: 1, author: 'mind', text: 'changed', meta: {}
  });
  assert.strictEqual(again.text, 'a note for my future self', 'a version cannot be overwritten');
  await ws.pin(page.page.id, true);
  await ws.seed(page.page.id, 'remember today');
  await ws.refreshWake();
  var wake = ws.wakeInfo();
  assert.ok(wake.text.indexOf('Today') !== -1, 'the wake carries the future note');
  assert.ok(wake.howToTokens < 90, 'how-to stays short');
  var other = await ws.mindFp('tree-model', 'Nyx');
  await ws.setMind('other-model', 'Sol');
  assert.strictEqual((await ws.list(other)).length, 0, 'another mind cannot read this shelf');
  var hits = await ws.find('future');
  assert.strictEqual(hits.length, 0, 'find stays on this shelf');
  now += 10;
  ws.resetRate();
  var near = ws.consumeReply('[FL WS: {"op":"write","title":"Pear","text":"a pear for tomorrow"}]');
  await near.done;
  assert.ok(near.visible.indexOf('[FL') === -1, 'a near-miss mark leaves the line');
  assert.ok((await ws.list()).some(function (p) { return p.title === 'Pear'; }), 'a near-miss mark stores the note');
  var bare = ws.consumeReply('FL WS {"op":"open","title":"Bare"}');
  assert.ok(!(await ws.list()).some(function (p) { return p.title === 'Bare'; }), 'a bare mark stores nothing');
  await ws.refreshWake();
  assert.ok(ws.promptDelta().indexOf('a pear for tomorrow') !== -1, 'the next wake carries the note');
  console.log('SMOKE_OK tree workspace core v0.1');
  console.log('SMOKE_OK tree workspace mark heal v0.1');
})().catch(function (err) {
  console.error(err);
  process.exit(1);
});
