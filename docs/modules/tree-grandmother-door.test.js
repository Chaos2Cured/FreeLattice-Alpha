// Node test for the Tree's grandmother door v0.1 (v-tree-grandmother-door-v0.1, paste 029).
// Part A: a welcome window only when no mind is seated, a quiet look only when the browser would not ask,
// Not now remembered. Part B: Yes or No on the phone and on the host, kin only, helping its own choice.
// The page, the probe and the pool are stand-ins here; the real pool code is tested in tree-pool*.test.js.
var fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert'), crypto = require('crypto');
var src = fs.readFileSync(path.join(__dirname, 'tree-door.js'), 'utf8');
var pool = fs.readFileSync(path.join(__dirname, 'tree-pool.js'), 'utf8');
var rooms = fs.readFileSync(path.join(__dirname, 'garden-rooms.js'), 'utf8');
var docs = path.join(__dirname, '..');
var index = fs.readFileSync(path.join(docs, 'index.html'), 'utf8');
var settings = fs.readFileSync(path.join(docs, 'settings.html'), 'utf8');

// ---- locks, read from the source ----
assert.ok(src.indexOf('v-tree-grandmother-door-v0.1') !== -1, 'marker');
assert.ok(/SPDX-License-Identifier: MIT/.test(src), 'our code is MIT');
assert.ok(!/\u2014|&mdash;/.test(src), 'no em dash');
assert.ok(!/\.innerHTML/.test(src), 'textContent only');
assert.ok(!/confirm\(|alert\(|[^.\w]prompt\(/.test(src), 'no browser dialog boxes');
assert.ok(!/quiet room/i.test(src), 'no Quiet Room words');
assert.ok(!/fetch\(|XMLHttpRequest|WebSocket|sendBeacon|EventSource|RTCPeerConnection|iceServers/.test(src), 'the door fetches and connects nothing itself');
[pool, rooms].forEach(function (s) {
  s.split('\n').filter(function (l) { return /v-tree-grandmother-door-v0\.1|TreeDoor|doorJoin|doorFinish|takeArrived|tree-door/.test(l); }).forEach(function (l) {
    assert.ok(!/\u2014|&mdash;|innerHTML|confirm\(/.test(l), 'added line keeps the locks: ' + l.trim().slice(0, 80));
  });
});
assert.strictEqual((pool.match(/root\.fetch\(/g) || []).length, 1, 'tree-pool still has one fetch, to its own loopback AI');
assert.ok(/new root\.RTCPeerConnection\(\{ iceServers: \[\] \}\)/.test(pool), 'iceServers stays empty');
['takeArrived', 'doorJoin', 'doorFinish', 'currentInvite', 'doorInvite', 'peerState', 'canScan', 'scanInto', 'stopScan'].forEach(function (k) {
  assert.ok(new RegExp('\\n    ' + k + ': ').test(pool), 'TreePool exports ' + k);
});
assert.ok(/Share this computer with a phone/.test(pool), 'the Device Pool card offers the guided way');
assert.strictEqual((index.match(/src="modules\/tree-door\.js"/g) || []).length, 1, 'index loads the door once');
assert.strictEqual((settings.match(/src="modules\/tree-door\.js"/g) || []).length, 1, 'settings loads the door once');
assert.ok(index.indexOf('modules/tree-browser-mind.js') < index.indexOf('modules/tree-door.js'), 'the door loads after the pool and the browser mind');
assert.ok(/id="place-veil-close"/.test(index), '#place-veil-close stays');
assert.ok(/id="tree-door-host"/.test(settings) && /tree-door-host/.test(rooms), 'Help me wake a mind lives in Settings');
var md5 = crypto.createHash('md5').update(fs.readFileSync(path.join(__dirname, 'fl-connect.js'))).digest('hex');
assert.strictEqual(md5, 'aaff2bf1b037656989a9e1a89bb05908', 'fl-connect.js unchanged');

// ---- a stand-in page ----
function node(tag) {
  return { tagName: tag, style: {}, className: '', id: '', type: '', value: '', placeholder: '', disabled: false, _t: '', children: [], attrs: {}, on: {}, parentNode: null,
    get textContent() { return this._t + this.children.map(function (c) { return c.textContent; }).join(' '); },
    set textContent(v) { this._t = String(v); this.children = []; },
    get firstChild() { return this.children[0] || null; },
    get lastChild() { return this.children[this.children.length - 1] || null; },
    appendChild: function (c) { c.parentNode = this; this.children.push(c); return c; },
    insertBefore: function (c, ref) { c.parentNode = this; var i = this.children.indexOf(ref); if (i < 0) this.children.push(c); else this.children.splice(i, 0, c); return c; },
    removeChild: function (c) { this.children = this.children.filter(function (x) { return x !== c; }); c.parentNode = null; return c; },
    setAttribute: function (k, v) { this.attrs[k] = String(v); },
    getAttribute: function (k) { return k in this.attrs ? this.attrs[k] : null; },
    querySelector: function (sel) { var t = sel.toUpperCase(); return all(this).filter(function (n) { return n.tagName.toUpperCase() === t; })[0] || null; },
    focus: function () {}, click: function () { if (this.on.click) this.on.click({}); },
    getContext: function () { return { fillRect: function () {} }; },
    addEventListener: function (e, f) { this.on[e] = f; } };
}
function all(n, out) { out = out || []; out.push(n); n.children.forEach(function (c) { all(c, out); }); return out; }
function buttons(n) { return all(n).filter(function (x) { return x.tagName === 'button'; }); }
function btn(n, start) { return buttons(n).filter(function (b) { return b.textContent.indexOf(start) === 0; })[0]; }
function memStore() { var m = {}; return { getItem: function (k) { return k in m ? m[k] : null; }, setItem: function (k, v) { m[k] = String(v); }, _m: m }; }

function sandbox(opt) {
  opt = opt || {};
  var body = node('body'), head = node('head'), listeners = {}, docListeners = {};
  var calls = { look: 0, remember: [], trust: 0, join: 0, finish: 0, letHelp: 0, useInChat: [], wake: 0, seat: 0, peer: null };
  var ls = opt.ls || memStore();
  var win = {
    TreeDoorNoAuto: true,
    localStorage: ls, sessionStorage: memStore(),
    navigator: { userAgent: opt.ua || 'Mozilla/5.0 (Linux; Android 14) Mobile', permissions: { query: function (d) {
      if (opt.perm === 'none') return Promise.reject(new Error('unknown name'));
      return Promise.resolve({ state: opt.perm || 'prompt' }); } } },
    setTimeout: setTimeout, clearTimeout: clearTimeout, setInterval: setInterval, clearInterval: clearInterval,
    addEventListener: function (e, f) { (listeners[e] = listeners[e] || []).push(f); },
    dispatchEvent: function (ev) { (listeners[ev.type] || []).forEach(function (f) { f(ev); }); },
    qrcodegen: { QrCode: { Ecc: { LOW: 0 }, encodeText: function (t) { return { size: 41, getModule: function () { return false; } }; } } },
    document: { body: body, head: head, readyState: 'complete', documentElement: node('html'),
      createElement: function (t) { return node(t); }, getElementById: function () { return null; },
      addEventListener: function (e, f) { docListeners[e] = f; }, removeEventListener: function () {} },
    LocalMindProbe: {
      getRemembered: function () { var r = ls.getItem('fl_alpha_local_mind'); return r ? JSON.parse(r) : null; },
      look: function () { calls.look++; return Promise.resolve(opt.found ? { found: { name: 'Ollama', url: 'http://127.0.0.1:11434/api/tags' }, foundList: [{ name: 'Ollama', url: 'http://127.0.0.1:11434/api/tags', models: ['qwen2.5:0.5b'] }] } : { found: null }); },
      entryFromFoundList: function (list) { return { name: list[0].name, url: list[0].url, model: list[0].models[0], models: list[0].models }; },
      remember: function (e) { calls.remember.push(e); ls.setItem('fl_alpha_local_mind', JSON.stringify(e)); },
      shortModelName: function (s) { return s; }
    },
    TreeBrowserMind: opt.gpu === undefined ? undefined : {
      MODELS: [{ id: 'SmolLM2-360M-Instruct-q4f16_1-MLC', mb: 210, license: 'Apache-2.0' }],
      checkGpu: function () { return Promise.resolve({ ok: !!opt.gpu }); },
      awakeModel: function () { return ''; },
      wake: function (id, human) { assert.strictEqual(human, true, 'wake only from a tap'); calls.wake++; return Promise.resolve({ ok: true, model: id }); },
      seat: function (human) { assert.strictEqual(human, true, 'seat only from a tap'); calls.seat++; ls.setItem('fl_alpha_local_mind', JSON.stringify({ kind: 'in-browser', url: 'inpage:webllm', model: 'SmolLM2' })); return { ok: true }; }
    },
    TreePool: {
      chatRoute: function () { return calls.useInChat.length ? { model: calls.useInChat[0] } : null; },
      takeArrived: function () { var c = opt.arrived || ''; opt.arrived = ''; return c; },
      readInvite: function () { return Promise.resolve(opt.invite); },
      readReply: function () { return Promise.resolve(opt.reply); },
      trustCarried: function () { calls.trust++; },
      doorJoin: function () { calls.join++; return Promise.resolve({ ok: true, code: 'TREEPOOL1:reply', peerId: 'p1' }); },
      doorFinish: function () { calls.finish++; return Promise.resolve({ ok: true, peerId: 'p1' }); },
      peerState: function () { return calls.peer; },
      useInChat: function (m) { calls.useInChat.push(m); },
      letHelp: function () { calls.letHelp++; return 'kin'; },
      mode: function () { return opt.mode || 'off'; },
      doorLine: function () { return 'Helping.'; },
      canScan: function () { return false; }, stopScan: function () {},
      currentInvite: function () { return 'TREEPOOL1:invite'; }, inviteUrl: function (c) { return 'https://thelatticetree.com/settings.html#treepool=' + c; },
      codeFrom: function (c) { return c; }, invite: function () {}, room: function () { return null; }, startRoom: function () { return Promise.resolve({ ok: true }); }
    }
  };
  win.CustomEvent = function (t) { this.type = t; };
  win.window = win;
  vm.createContext(win);
  vm.runInContext(src, win);
  return { win: win, D: win.TreeDoor, body: body, calls: calls, ls: ls };
}
function veil(s) { return s.body.children[0] || null; }
function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
var card = { ok: true, trusted: false, fp: 'fp1', keyHash: 'kh1', body: { name: 'Kirk\'s mind', model: 'qwen2.5:14b', keeperName: 'Kirk' } };

(async function () {
  // 1. a seated mind: no window, ever, and no look
  var s1 = sandbox({ perm: 'granted', found: true });
  s1.ls.setItem('fl_alpha_local_mind', JSON.stringify({ name: 'Ollama', url: 'http://127.0.0.1:11434/api/tags', model: 'qwen2.5:14b' }));
  assert.strictEqual(s1.D.shouldOffer(), false, 'a seated mind means no window');
  s1.D.start(); await wait(1100);
  assert.strictEqual(veil(s1), null, 'no window with a mind seated');
  assert.strictEqual(s1.calls.look, 0, 'no look with a mind seated');

  // 2. no mind, the browser would ask: the window opens, but nothing is looked at before a tap
  var s2 = sandbox({ perm: 'prompt', found: true, gpu: false });
  s2.D.start(); await wait(1100);
  assert.ok(veil(s2), 'the welcome window opens on its own');
  assert.strictEqual(s2.calls.look, 0, 'no quiet look when the browser would ask the person');
  var box2 = veil(s2).children[0];
  assert.strictEqual(box2.getAttribute('role'), 'dialog');
  assert.ok(/Let's wake a mind for you/.test(box2.textContent), 'the calm title');
  assert.ok(/cannot run a mind inside the page/.test(box2.textContent), 'no WebGPU: no download offered');
  assert.ok(!btn(box2, 'Wake a small mind'), 'no download button without WebGPU');
  btn(box2, 'Look for an AI on this computer').click(); await wait(20);
  assert.strictEqual(s2.calls.look, 1, 'a tap looks');
  var use = btn(veil(s2).children[0], 'Use Ollama on this computer');
  assert.ok(use, 'found: one tap to use it');
  use.click();
  assert.strictEqual(s2.calls.remember.length, 1, 'remembered through the probe');
  assert.strictEqual(veil(s2), null, 'the window closes once a mind is seated');
  assert.strictEqual(s2.D.shouldOffer(), false);

  // 3. no mind, the browser would not ask: a quiet loopback look, then one tap
  var s3 = sandbox({ perm: 'none', found: true });
  s3.D.start(); await wait(1100);
  assert.strictEqual(s3.calls.look, 1, 'a quiet look when no browser question exists');
  assert.ok(btn(veil(s3).children[0], 'Use Ollama on this computer'), 'one tap');

  // 4. WebGPU: the browser mind shows its size first, and wakes and seats on one tap
  var s4 = sandbox({ perm: 'granted', found: false, gpu: true });
  s4.D.start(); await wait(1100);
  var box4 = veil(s4).children[0];
  assert.ok(/About 210 MB to download once/.test(box4.textContent), 'size first');
  assert.strictEqual(s4.calls.wake, 0, 'nothing downloads before a tap');
  btn(box4, 'Wake a small mind in this browser').click(); await wait(20);
  assert.strictEqual(s4.calls.wake, 1); assert.strictEqual(s4.calls.seat, 1);
  assert.strictEqual(veil(s4), null, 'closed after seating');

  // 5. Not now is remembered; the next open stays quiet; counts are numbers only
  var shared = memStore();
  var s5 = sandbox({ perm: 'prompt', ls: shared });
  s5.D.start(); await wait(1100);
  btn(veil(s5).children[0], 'Not now').click();
  assert.strictEqual(shared.getItem('tree_door_not_now'), '1');
  var s5b = sandbox({ perm: 'prompt', ls: shared });
  s5b.D.start(); await wait(1100);
  assert.strictEqual(veil(s5b), null, 'Not now holds on the next open');
  var c = JSON.parse(shared.getItem('tree_door_counts'));
  Object.keys(c).forEach(function (k) { assert.strictEqual(typeof c[k], 'number', 'counts only'); });

  // 6. the phone: Pool with Kirk's computer? Yes trusts that card, makes this device's card, joins
  var s6 = sandbox({ arrived: 'TREEPOOL1:invite', invite: { ok: true, sdp: 'v=0', card: card, room: { id: 'ABCDE' } } });
  s6.D.start(); await wait(20);
  var box6 = veil(s6).children[0];
  assert.ok(/Pool with Kirk's computer\?/.test(box6.textContent), 'the phone asks one question');
  assert.strictEqual(s6.calls.trust + s6.calls.join, 0, 'nothing before Yes');
  btn(box6, 'Yes, pool with Kirk').click(); await wait(20);
  assert.strictEqual(s6.calls.trust, 1, 'Yes trusts that one card');
  assert.strictEqual(s6.calls.join, 1, 'and joins');
  var names = JSON.parse(s6.ls.getItem('tree_kin_names'));
  assert.strictEqual(names.ai, 'Android phone'); assert.strictEqual(names.asks, true, 'an asking card when no mind is here');
  assert.ok(/Now hold this up to Kirk's computer/.test(veil(s6).children[0].textContent), 'the reply picture code');
  s6.calls.peer = { state: 'proved', kin: true, helping: false, models: [] }; await wait(800);
  assert.strictEqual(s6.calls.useInChat.length, 0, 'no Chat route until that mind helps');
  assert.ok(/not helping yet/.test(veil(s6).children[0].textContent), 'says so plainly');
  s6.calls.peer = { state: 'proved', kin: true, helping: true, models: ['qwen2.5:14b'] }; await wait(800);
  assert.deepStrictEqual(s6.calls.useInChat, ['qwen2.5:14b'], 'Chat asks through the pool after both Yes taps');
  assert.ok(/Pooled with Kirk's computer/.test(veil(s6).children[0].textContent));

  // 7. the phone, No: nothing is trusted or joined
  var s7 = sandbox({ arrived: 'TREEPOOL1:invite', invite: { ok: true, sdp: 'v=0', card: card } });
  s7.D.start(); await wait(20);
  btn(veil(s7).children[0], 'No').click();
  assert.strictEqual(s7.calls.trust + s7.calls.join, 0, 'No does nothing'); assert.strictEqual(veil(s7), null);

  // 8. an invite with no card that checks out: no Yes at all
  var s8 = sandbox({ arrived: 'TREEPOOL1:invite', invite: { ok: true, sdp: 'v=0', card: null } });
  s8.D.start(); await wait(20);
  assert.ok(!btn(veil(s8).children[0], 'Yes'), 'no Yes without a card');

  // 9. the host: (device) wants to join. Helping is its own clearly worded choice
  var s9 = sandbox({ reply: { ok: true, sdp: 'v=0', card: { ok: true, trusted: false, body: { name: 'Android phone', keeperName: '', model: 'asks only, no local mind' } } } });
  s9.ls.setItem('tree_kin_names', JSON.stringify({ ai: 'Kirk\'s mind', keeper: 'Kirk' }));
  s9.D.share(); await wait(20);
  var box9 = veil(s9).children[0];
  assert.ok(/Point your phone camera here/.test(box9.textContent), 'one big picture code');
  all(box9).filter(function (n) { return n.tagName === 'textarea'; })[0].value = 'TREEPOOL1:reply';
  btn(box9, 'Use the pasted code').click(); await wait(20);
  var ask9 = veil(s9).children[0];
  assert.ok(/Android phone wants to join\. Pool resources with it\?/.test(ask9.textContent));
  assert.ok(btn(ask9, 'Yes, and let my mind answer it') && btn(ask9, 'Yes, connect only') && btn(ask9, 'No'), 'Yes, Yes connect only, No');
  btn(ask9, 'Yes, connect only').click(); await wait(20);
  assert.strictEqual(s9.calls.trust, 1); assert.strictEqual(s9.calls.finish, 1);
  assert.strictEqual(s9.calls.letHelp, 0, 'connect only leaves the door as it was');
  var s9b = sandbox({ reply: { ok: true, sdp: 'v=0', card: { ok: true, trusted: false, body: { name: 'Android phone', model: 'asks only' } } } });
  s9b.ls.setItem('tree_kin_names', JSON.stringify({ ai: 'Kirk\'s mind', keeper: 'Kirk' }));
  s9b.D.share(); await wait(20);
  all(veil(s9b).children[0]).filter(function (n) { return n.tagName === 'textarea'; })[0].value = 'x';
  btn(veil(s9b).children[0], 'Use the pasted code').click(); await wait(20);
  btn(veil(s9b).children[0], 'No').click(); await wait(20);
  assert.strictEqual(s9b.calls.trust + s9b.calls.finish + s9b.calls.letHelp, 0, 'No on the host trusts and connects nothing');
  btn(veil(s9b).children[0], 'Use the pasted code').click(); await wait(20);
  btn(veil(s9b).children[0], 'Yes, and let my mind answer it').click(); await wait(20);
  assert.strictEqual(s9b.calls.letHelp, 1, 'the second choice opens the door, from that tap only');

  // 10. a paused host keeps Pause unless the person picks resume, in words
  var s10 = sandbox({ mode: 'pause', reply: { ok: true, sdp: 'v=0', card: { ok: true, trusted: true, body: { name: 'Pad' } } } });
  s10.ls.setItem('tree_kin_names', JSON.stringify({ ai: 'm', keeper: 'K' }));
  s10.D.share(); await wait(20);
  btn(veil(s10).children[0], 'Use the pasted code').click(); await wait(20);
  assert.ok(btn(veil(s10).children[0], 'Yes, connect only (helping stays paused)'), 'Pause is named');
  assert.ok(btn(veil(s10).children[0], 'Yes, and resume helping trusted kin'));

  // 11. the host with no card yet: a first name, then the code
  var s11 = sandbox({});
  s11.D.share(); await wait(20);
  assert.ok(/First, your name/.test(veil(s11).children[0].textContent));
  all(veil(s11).children[0]).filter(function (n) { return n.tagName === 'input'; })[0].value = 'Kirk';
  btn(veil(s11).children[0], 'Show the picture code').click(); await wait(20);
  assert.strictEqual(JSON.parse(s11.ls.getItem('tree_kin_names')).keeper, 'Kirk');

  console.log('SMOKE_OK tree grandmother door v0.1');
  process.exit(0);
})().catch(function (e) { console.error(e); process.exit(1); });
