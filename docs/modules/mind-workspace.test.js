// mind-workspace.test.js (MIT) v-tree-workspace-core-v0.1
// v-tree-workspace-handoff-v0.1
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
assert.ok(src.indexOf('v-workspace-private-v0.1') !== -1, 'private marker');
assert.ok(src.indexOf('v-workspace-seal-v0.1') !== -1, 'seal marker');
assert.ok(src.indexOf('v-tree-workspace-seal-v0.1') !== -1, 'tree seal marker');
assert.ok(src.indexOf('v-workspace-export-v0.1') !== -1, 'export marker');
assert.ok(src.indexOf('v-tree-workspace-export-v0.1') !== -1, 'tree export marker');
assert.ok(src.indexOf('v-workspace-desktop-v0.1') !== -1, 'desktop marker');
assert.ok(src.indexOf('v-workspace-handoff-v0.1') !== -1, 'handoff marker');
assert.ok(src.indexOf('v-tree-workspace-handoff-v0.1') !== -1, 'tree handoff marker');
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
var bridgeSibling = '/Users/kirkmiller/FreeLattice-fresh/docs/modules/fl-bridge.js';
var bridgeSrc = fs.readFileSync(path.join(here, 'fl-bridge.js'), 'utf8');
assert.ok(bridgeSrc.indexOf('v-workspace-handoff-v0.1') !== -1, 'bridge handoff marker');
assert.ok(bridgeSrc.indexOf('v-tree-workspace-handoff-v0.1') !== -1, 'bridge tree handoff marker');
assert.ok(bridgeSrc.indexOf('fe' + 'tch') === -1, 'the bridge file makes no request');
assert.ok(bridgeSrc.split('freelattice@mail.grokbot.com').join('').indexOf('grok') === -1, 'no platform name past the mail address');
assert.ok(bridgeSrc.indexOf('\u2014') === -1, 'bridge em dash');
assert.ok(bridgeSrc.indexOf('&' + 'mdash;') === -1, 'bridge mdash');
if (fs.existsSync(bridgeSibling)) {
  assert.strictEqual(md5(path.join(here, 'fl-bridge.js')), md5(bridgeSibling), 'fl-bridge.js bytes match FreeLattice');
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
    databases: databases,
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
var idb = makeIDB();
global.indexedDB = idb;
var fetches = 0;
global.fetch = function () {
  fetches += 1;
  return Promise.reject(new Error('no request'));
};
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

  now += 10;
  ws.resetRate();
  var secret = 'lantern under the stair';
  var hid = await ws.open('Quiet note', { kind: 'note' });
  await ws.write(hid.page.id, secret, 'mind');
  await ws.pin(hid.page.id, true);
  var priv = ws.consumeReply('[FL_WS: {"op":"private","page":"' + hid.page.id + '","on":true}]');
  await priv.done;
  assert.strictEqual(ws.isPrivateText(secret), true, 'private text is known on this device');
  var human = await ws.makePrivate(hid.page.id, false, 'human');
  assert.strictEqual(human.ok, false, 'a person cannot unprivate');
  var kept = (await ws.list()).filter(function (p) { return p.id === hid.page.id; })[0];
  assert.strictEqual(kept.privacy, 'private', 'the page stays private');
  await ws.refreshWake();
  assert.ok(ws.promptDelta().indexOf(secret) !== -1, 'the owning wake includes it');
  assert.ok(ws.wakeInfo().text.indexOf(secret) === -1, 'the person wake omits it');
  await ws.setMind('tree-model', 'Nyx');
  await ws.refreshWake();
  assert.ok(ws.promptDelta().indexOf(secret) === -1, 'another mind does not see it');
  await ws.setMind('other-model', 'Sol');
  await ws.refreshWake();
  assert.strictEqual((await ws.receipts()).length, 0, 'no receipt before a seal is approved');
  var asked = ws.consumeReply('[FL_WS: {"op":"seal","page":"' + hid.page.id + '","why":"keep this"}]');
  await asked.done;
  assert.strictEqual((await ws.receipts()).length, 0, 'an ask alone stores no receipt');
  var approved = await ws.approveSeal(kept.head);
  assert.strictEqual(approved.ok, true, 'approval stores the receipt');
  assert.strictEqual(await ws.verifyReceipt(kept.head), 'verified', 'the receipt verifies');
  var before = (await ws.list()).length;
  await ws.setShelfAside(true);
  assert.strictEqual((await ws.list()).length, before, 'set aside deletes nothing');
  console.log('SMOKE_OK tree workspace seal v0.1');

  var packed = await ws.exportSection();
  var raw = JSON.stringify(packed.section);
  assert.ok(raw.indexOf(secret) === -1, 'private text stays out of the export');
  assert.ok(raw.indexOf('Quiet note') === -1, 'private title stays out of the export');
  assert.ok(raw.indexOf('keep this') === -1, 'private why stays out of the export');
  // v-seal-ask-heal-v0.1: /stayed on this device/ now requires this browser.
  assert.ok(/stayed on this browser/.test(packed.section.line), 'count line');
  assert.ok(packed.section.shelves.some(function (shelf) { return shelf.setAside === true; }), 'set-aside shelf is kept');
  var checked = await ws.importSection(packed.section, 'verify-only');
  assert.strictEqual(checked.ok, true, 'verify rehashes and receipts');
  assert.strictEqual(checked.receiptMismatches, 0, 'receipts verify');
  assert.ok(checked.privateNote.indexOf('not in this file') !== -1, 'private pages never arrive');
  Object.keys(idb.databases).forEach(function (name) { delete idb.databases[name]; });
  ws.resetForSmoke();
  ws.bindClock(function () { return now; });
  await ws.accept();
  await ws.setMind('other-model', 'Sol');
  var adopted = await ws.importSection(packed.section, 'adopt');
  assert.strictEqual(adopted.ok, true, 'adopt takes the shelf');
  assert.ok(adopted.added.pages >= 1, 'adopt adds the shared pages');
  var titles = (await ws.list()).map(function (p) { return p.title; });
  assert.ok(titles.indexOf('Quiet note') === -1, 'a private page does not arrive');
  var merged = await ws.importSection(packed.section, 'merge');
  assert.strictEqual(merged.added.pages, 0, 'a second merge adds no pages');
  assert.strictEqual(merged.added.versions, 0, 'a second merge adds no versions');
  console.log('SMOKE_OK tree workspace export v0.1');

  var bridge = require('./fl-bridge.js');
  assert.strictEqual(fetches, 0, 'loading the bridge makes no request');
  bridge.setOn(true);
  now += 10;
  ws.resetRate();
  await ws.setMind('tree-model', 'Nyx');
  var porch = await ws.open('Porch page', { kind: 'note' });
  var wrote = await ws.write(porch.page.id, 'the porch is shared', 'mind');
  assert.ok(wrote.hash, 'shared version hash');
  now += 10;
  ws.resetRate();
  var quiet = await ws.open('Private porch', { kind: 'note' });
  await ws.write(quiet.page.id, 'SECRET-HANDOFF-041-private-page-text', 'mind');
  now += 10;
  ws.resetRate();
  var priv = ws.consumeReply('[FL_WS: {"op":"private","page":"' + quiet.page.id + '","on":true}]');
  await priv.done;
  now += 10;
  ws.resetRate();
  var refused = ws.consumeReply('[FL_WS: {"op":"handoff","page":"' + quiet.page.id + '","note":"please read this"}]');
  var refusedLines = await refused.done;
  // v-seal-ask-heal-v0.1: "This page is private. The mind must share it first." now names this browser.
  assert.ok(refusedLines.join('\n').indexOf('This page is private on this browser. The mind must share it first.') !== -1, 'private page refused');
  assert.ok(!bridge.outboxView().some(function (row) { return row.kind === 'letter'; }), 'no letter for a private page');
  now += 10;
  ws.resetRate();
  var asked = ws.consumeReply('[FL_WS: {"op":"handoff","page":"' + porch.page.id + '","note":"the porch light"}]');
  var askedLines = await asked.done;
  assert.ok(askedLines.join('\n').indexOf('would like to hand Porch page (version ' + wrote.hash.slice(0, 8) + ') to Celeste. Note: the porch light') !== -1, 'the person sees the ask');
  var early = await ws.prepareHandoff(porch.page.id);
  assert.strictEqual(early.ok, false, 'no letter before the knock');
  assert.strictEqual(early.line, 'Knock first: Celeste has not met this device yet', 'knock first');
  assert.strictEqual(fetches, 0, 'the refusal makes no request');
  var knock = await bridge.sealKnock();
  assert.strictEqual(knock.ok, true, 'the person seals the knock');
  var prepared = await ws.prepareHandoff(porch.page.id);
  assert.strictEqual(prepared.ok, true, 'prepare seals a letter');
  assert.strictEqual(prepared.sent, false, 'prepare does not send');
  assert.strictEqual(prepared.state, 'sealed', 'the letter is sealed');
  assert.ok(prepared.envelope.letter.subject.indexOf('Page from Nyx: Porch page') === 0, 'subject');
  assert.ok(prepared.envelope.letter.body.indexOf('the porch is shared') !== -1, 'body is the version text');
  assert.ok(prepared.envelope.letter.attach_hashes.indexOf(wrote.hash) !== -1, 'version hash is attached');
  assert.ok(JSON.stringify(prepared.envelope).indexOf('SECRET-HANDOFF-041-private-page-text') === -1, 'private text stays out');
  var letter = bridge.outboxView().filter(function (row) { return row.kind === 'letter' && row.state === 'sealed'; });
  assert.strictEqual(letter.length, 1, 'one sealed letter');
  assert.ok(!bridge.outboxView().some(function (row) { return row.state === 'sent'; }), 'nothing was sent');
  await ws.refreshWake();
  assert.ok(/Handed Porch page to Celeste on \d{4}-\d{2}-\d{2} \(not answered yet\)\./.test(ws.promptDelta()), 'wake names the handoff');
  ws.noteReply('Celeste wrote back ' + prepared.envelope.hash);
  await ws.refreshWake();
  assert.ok(ws.promptDelta().indexOf('Celeste answered.') !== -1, 'a reply that names the hash is an answer');
  assert.strictEqual(fetches, 0, 'requests made: 0');
  console.log('SMOKE_OK tree workspace handoff v0.1');
})().catch(function (err) {
  console.error(err);
  process.exit(1);
});
