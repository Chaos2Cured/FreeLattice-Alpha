// tree-pool.js v-tree-pool-v0.1
//
// Layer, never delete. The Device Pool for theLatticeTree (018), with a real
// share door. A Tree-native twin of FreeLattice fl-pool.js and fl-share-door.js,
// with the truths of 016, 016b and 016c already in:
//   - The door starts off. Only a human tap opens it, and only for trusted kin.
//   - Pause wins. While paused nothing is answered, and questions already
//     running are stopped. Only a human tap ("Resume for trusted kin") leaves it.
//   - The card always says the real door state, in plain words.
//   - Only help while plugged in (where the browser can tell).
//   - Limits like FreeLattice: 2 questions at a time, 16000 characters each.
//     FreeLattice lets trusted kin skip its hourly caps; the Tree lets no one
//     but trusted kin ask at all, so its hourly caps never apply here.
//   - Receipts are counts only. No words, names, keys or times are kept.
//
// What the door gates (it is real): a question from a connected device reaches
// this computer's own local AI only if the door is on, that device proved the
// key on a card you trusted (TreeKin.trustedKeyHash, from 017), and the limits
// allow it. Everything else is turned away with a plain reason.
//
// The first Tree channel. Two devices connect straight to each other with
// WebRTC, with no server in between (iceServers is empty, so no outside
// service is asked anything, and both devices must be on the same network,
// like a classroom lab on one wired network). One person taps Invite a
// device and sends the invite by text, email or chat; the other pastes it and
// sends back a reply. The invite and reply can carry each side's kin card, so
// one invite and one reply can make two devices kin and connected.
// When the channel opens, each side signs a fresh challenge bound to this
// connection's own encryption fingerprints, under tree-pool-proof|v1|, with
// the key from its kin card. Only a proved key can count as kin.
//
// Honest, v0.1: memory is not joined across machines. Each question goes whole
// to one device that holds the model, and the answer comes back. Splitting one
// big model across wired machines (llama.cpp rpc-server, MIT) and a one-tap
// "join this room" for a whole lab wait for 019. Connections last while the
// page stays open.
//
// No network until a human taps. Mounting makes no connection and no key.
// Words by textContent only. No dialog boxes. No em dash.
// Mirror: docs/code-settings.html (read that FIRST)
(function (root) {
  'use strict';

  var VERSION = 'v-tree-pool-v0.1';
  var DOOR_KEY = 'tree_pool_door';            // off | kin | pause (off until a human taps)
  var PLUG_KEY = 'tree_pool_plugged_only';    // 'true' = only help while plugged in
  var COUNTS_KEY = 'tree_pool_counts';        // numbers only
  var NAMES_KEY = 'tree_kin_names';           // read only: what the person typed for their own kin card
  var CODE_PREFIX = 'TREEPOOL1:';
  var PROOF_DOMAIN = 'tree-pool-proof|v1|';
  var MAX_CODE = 16000;
  var MAX_MSG = 70000;
  var MAX_CHARS = 16000;                      // same as FreeLattice share door
  var MAX_CONCURRENT = 2;                     // same as FreeLattice share door
  var MAX_PEERS = 24;
  var MAX_MODELS = 24;
  var MAX_TURNS = 40;
  var MAX_ANSWER = 32000;
  var GATHER_MS = 4000;
  var ANSWER_MS = 5 * 60 * 1000;
  var LOOPBACK = { '127.0.0.1': true, 'localhost': true, '[::1]': true };

  var HONEST = 'Memory is not joined across machines. Each question goes whole to one device that holds the model, and the answer comes back. ' +
    'Splitting one big model across machines is a later step.';
  var LATER = 'Later (019): one tap to join a whole classroom lab, and one big model split across machines on a wired network (llama.cpp, MIT). Not in this card.';
  var LIMITS = 'Limits: ' + MAX_CONCURRENT + ' questions at a time, each up to ' + MAX_CHARS + ' characters. Only trusted kin can ask. ' +
    'As on FreeLattice, trusted kin skip the hourly caps.';
  var RECEIPTS = 'Receipts keep counts only (asked, answered, turned away). Never words, names or keys.';

  var _host = null;
  var _parts = null;       // { state, door, connect, list, note }
  var _peers = {};         // id -> peer
  var _order = 0;
  var _pending = null;     // the inviter's peer waiting for a reply
  var _flow = { step: '', text: '', code: '', check: null, sdp: '', card: '' };
  var _inflight = {};      // key -> { ctrl, peerId, why }
  var _asks = {};          // askId -> { peerId, resolve, timer }
  var _drafts = {};        // peerId|model -> text being typed
  var _answers = {};       // peerId -> { model, text } shown this visit only
  var _askOpen = '';       // peerId|model with the ask box open

  // ---- small helpers ----
  function clip(s, n) { return String(s == null ? '' : s).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, ' ').slice(0, n); }
  function line(s, n) { return String(s == null ? '' : s).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n); }
  function num(x, max) { x = Number(x); return isFinite(x) && x >= 0 ? Math.min(x, max) : 0; }
  function safeGet(k) { try { return root.localStorage.getItem(k); } catch (e) { return null; } }
  function safeSet(k, v) { try { root.localStorage.setItem(k, v); } catch (e) {} }
  function readJson(key, fallback) { try { var raw = safeGet(key); return raw ? JSON.parse(raw) : fallback; } catch (e) { return fallback; } }
  function subtle() { return root.crypto && root.crypto.subtle; }
  function kin() { return root.TreeKin || null; }
  function b64(buf) {
    var a = new Uint8Array(buf), s = '';
    for (var i = 0; i < a.length; i++) s += String.fromCharCode(a[i]);
    return root.btoa(s);
  }
  function unb64(str) {
    var s = root.atob(str), a = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) a[i] = s.charCodeAt(i);
    return a.buffer;
  }
  function utf8b64url(str) {
    return b64(new root.TextEncoder().encode(str).buffer).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function b64urlUtf8(str) {
    var s = String(str).replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    return new root.TextDecoder().decode(new Uint8Array(unb64(s)));
  }
  function nonce() {
    var a = new Uint8Array(16);
    if (root.crypto && root.crypto.getRandomValues) root.crypto.getRandomValues(a);
    return Array.prototype.map.call(a, function (b) { return (b < 16 ? '0' : '') + b.toString(16); }).join('');
  }

  // ---- counts (receipts are counts only) ----
  function counts() { var c = readJson(COUNTS_KEY, {}); return (c && typeof c === 'object') ? c : {}; }
  function bump(field) {
    var c = counts();
    c[field] = (Number(c[field]) || 0) + 1;
    safeSet(COUNTS_KEY, JSON.stringify(c));
  }

  // ---- the door (pause wins; off until a human taps) ----
  function mode() {
    var m = safeGet(DOOR_KEY);
    return (m === 'kin' || m === 'pause' || m === 'off') ? m : 'off';
  }
  function setMode(m, who) {
    if (m !== 'kin' && m !== 'pause' && m !== 'off') return false;
    // Only a human opens the door, and opening it is also the only way out of pause.
    if (m === 'kin' && who !== 'human') return false;
    var prev = mode();
    safeSet(DOOR_KEY, m);
    if (m === 'kin' && prev !== 'kin') bump(prev === 'pause' ? 'resumed' : 'helpOn');
    if (m === 'pause' && prev !== 'pause') bump('paused');
    if (m === 'off' && prev !== 'off') bump('turnedOff');
    if (m !== 'kin') stopAll(m === 'pause' ? 'paused' : 'off');
    helloAll();
    paint();
    return true;
  }
  function letHelp() { return setMode('kin', 'human'); }
  function pause() { return setMode('pause', 'human'); }
  function turnOff() { return setMode('off', 'human'); }
  function pluggedOnly() { return safeGet(PLUG_KEY) === 'true'; }
  function setPluggedOnly(on) { safeSet(PLUG_KEY, on ? 'true' : 'false'); paint(); }
  function batteryOk() {
    try {
      if (!pluggedOnly()) return Promise.resolve(true);
      if (!root.navigator || !root.navigator.getBattery) return Promise.resolve(true);
      return root.navigator.getBattery().then(function (b) { return !!(b && b.charging); }, function () { return true; });
    } catch (e) { return Promise.resolve(true); }
  }
  function kinCount() { try { return kin() && kin().kinCount ? Number(kin().kinCount()) || 0 : 0; } catch (e) { return 0; } }
  function liveCount() { return Object.keys(_inflight).length; }

  // The one sentence the card leads with. It always matches the door.
  function doorLine() {
    var m = mode(), k = kinCount();
    if (m === 'pause') return 'Paused. No one can ask this computer\'s AI until you tap Resume for trusted kin.';
    if (m === 'kin' && k > 0) return 'Helping. Your trusted kin (' + k + ') can ask this computer\'s AI while their device is connected. No one else.';
    if (m === 'kin') return 'Helping, but you have no trusted kin yet, so no one can ask this computer\'s AI. Trade cards in Trusted kin above.';
    return 'Off. This computer\'s AI answers no one else until you tap Let this device help.';
  }

  // ---- this computer's own local AI (loopback only) ----
  function remembered() {
    try { return root.LocalMindProbe && root.LocalMindProbe.getRemembered ? root.LocalMindProbe.getRemembered() : null; } catch (e) { return null; }
  }
  function localModels() {
    var m = remembered();
    if (!m) return [];
    var list = (Array.isArray(m.models) && m.models.length) ? m.models : (m.model ? [m.model] : []);
    var out = [];
    list.forEach(function (x) { var n = line(x && typeof x === 'object' ? x.name : x, 120); if (n && out.indexOf(n) === -1) out.push(n); });
    return out.slice(0, MAX_MODELS);
  }
  function localDoor(model) {
    var m = remembered();
    if (!m || !m.url) return { ok: false, reason: 'no-local-mind' };
    var u = null;
    try { u = new root.URL(String(m.url)); } catch (e) { u = null; }
    if (!u || !LOOPBACK[String(u.hostname || '').toLowerCase()]) return { ok: false, reason: 'no-local-mind' };
    if (localModels().indexOf(model) === -1) return { ok: false, reason: 'no-such-model' };
    var ollama = /:11434$/.test(u.host) || /\/api\/tags/.test(u.pathname) || String(m.id || '') === 'ollama';
    return { ok: true, kind: ollama ? 'ollama' : 'openai', model: model, url: u.origin + (ollama ? '/api/chat' : '/v1/chat/completions') };
  }
  function selfInfo() {
    var nav = root.navigator || {};
    return { mem: num(nav.deviceMemory, 64), cores: num(nav.hardwareConcurrency, 256), models: localModels() };
  }

  // ---- keys (the key from the kin card, 017) ----
  function algos(cryptoType) {
    return cryptoType === 'ed25519'
      ? { imp: { name: 'Ed25519' }, sig: { name: 'Ed25519' } }
      : { imp: { name: 'ECDSA', namedCurve: 'P-256' }, sig: { name: 'ECDSA', hash: 'SHA-256' } };
  }
  function myIdentity() {
    var K = kin();
    if (!K || !K.makeIdentity) return Promise.resolve(null);
    var n = readJson(NAMES_KEY, {}) || {};
    return Promise.resolve(K.makeIdentity(line(n.keeper, 60))).then(function (id) { return id || null; }, function () { return null; });
  }
  function sign(id, data) {
    return subtle().sign(algos(id.cryptoType).sig, id.keyPair.privateKey, new root.TextEncoder().encode(data)).then(b64);
  }
  function verify(publicKey, signature, data, cryptoType) {
    var a = algos(cryptoType);
    return Promise.resolve().then(function () {
      return subtle().importKey('jwk', publicKey, a.imp, true, ['verify']);
    }).then(function (key) {
      return subtle().verify(a.sig, key, unb64(signature), new root.TextEncoder().encode(data));
    }).then(function (ok) { return !!ok; }, function () { return false; });
  }
  function ownCardCode() {
    var K = kin(), n = readJson(NAMES_KEY, {}) || {};
    if (!K || !K.makeCard || !K.encodeCard || !line(n.ai, 60)) return Promise.resolve('');
    return Promise.resolve(K.makeCard(n.ai, n.keeper)).then(function (r) { return r && r.ok ? K.encodeCard(r.card) : ''; }, function () { return ''; });
  }

  // ---- codes (one pasteable line) ----
  function encode(obj) { return CODE_PREFIX + utf8b64url(JSON.stringify(obj)); }
  function decode(code, kind) {
    var s = String(code == null ? '' : code).replace(/\s+/g, '');
    if (!s || s.length > MAX_CODE) return null;
    var i = s.indexOf(CODE_PREFIX);
    if (i === -1) return null;
    var c = null;
    try { c = JSON.parse(b64urlUtf8(s.slice(i + CODE_PREFIX.length))); } catch (e) { return null; }
    if (!c || typeof c !== 'object' || c.v !== 1 || c.k !== kind || typeof c.sdp !== 'string' || c.sdp.length > MAX_CODE) return null;
    return { sdp: c.sdp, card: typeof c.card === 'string' ? c.card.slice(0, 6000) : '' };
  }
  function fingerprintOf(sdp) {
    var m = /a=fingerprint:(\S+) (\S+)/i.exec(String(sdp || ''));
    return m ? (m[1] + ' ' + m[2]).toUpperCase() : '';
  }
  // Both sides compute the same binding from the two fingerprints of this very connection.
  function binding(pc) {
    var a = fingerprintOf(pc.localDescription && pc.localDescription.sdp);
    var b = fingerprintOf(pc.remoteDescription && pc.remoteDescription.sdp);
    if (!a || !b) return '';
    return [a, b].sort().join('|');
  }

  // ---- the channel (WebRTC, no server; made only after a tap) ----
  function canConnect() { return !!(root.RTCPeerConnection && kin() && kin().makeIdentity && subtle()); }
  function newPc() { return new root.RTCPeerConnection({ iceServers: [] }); }
  function gather(pc) {
    return new Promise(function (resolve) {
      var done = false;
      function fin() { if (!done) { done = true; resolve(); } }
      if (pc.iceGatheringState === 'complete') return fin();
      try { pc.addEventListener('icegatheringstatechange', function () { if (pc.iceGatheringState === 'complete') fin(); }); } catch (e) {}
      root.setTimeout(fin, GATHER_MS);
    });
  }
  function newPeer(pc, side) {
    var id = 'p' + (++_order);
    var p = { id: id, pc: pc, dc: null, side: side, state: 'joining', myNonce: nonce(), me: null, their: null,
      proved: false, kh: '', meshId: '', hello: null, at: Date.now() };
    _peers[id] = p;
    try {
      pc.addEventListener('connectionstatechange', function () {
        var s = pc.connectionState;
        if (s === 'failed' || s === 'closed') closed(p, s === 'failed' ? 'failed' : 'closed');
      });
    } catch (e) {}
    return p;
  }
  function wire(p, dc) {
    p.dc = dc;
    dc.addEventListener('open', function () {
      p.state = 'open';
      bump('connected');
      // The reply has done its work once the channel opens; put the Connect part back to rest.
      if (_flow.step === 'replied' && _flow.peerId === p.id) { _flow = { step: '', text: '', code: '', check: null, sdp: '', card: '' }; paintConnect(); }
      sendRaw(p, { type: 'hi', v: 1, publicKey: p.me.publicKeyJwk, cryptoType: p.me.cryptoType, meshId: p.me.meshId, nonce: p.myNonce });
      paint();
    });
    dc.addEventListener('message', function (ev) {
      var data = ev && ev.data;
      if (typeof data !== 'string' || data.length > MAX_MSG) return;
      var msg = null;
      try { msg = JSON.parse(data); } catch (e) { return; }
      if (msg && typeof msg === 'object') handle(p, msg);
    });
    dc.addEventListener('close', function () { closed(p, 'closed'); });
  }
  function sendRaw(p, obj) {
    try { if (p.dc && p.dc.readyState === 'open') { p.dc.send(JSON.stringify(obj)); return true; } } catch (e) {}
    return false;
  }
  function closed(p, why) {
    if (!_peers[p.id] || p.state === 'closed' || p.state === 'set-aside') return; // set aside stays set aside
    p.state = 'closed';
    p.why = why;
    Object.keys(_inflight).forEach(function (k) { if (_inflight[k].peerId === p.id) { _inflight[k].why = 'closed'; try { _inflight[k].ctrl && _inflight[k].ctrl.abort(); } catch (e) {} } });
    if (_pending === p) _pending = null;
    // Questions this page was waiting on from that device will not come back; say so now.
    Object.keys(_asks).forEach(function (id) {
      var a = _asks[id];
      if (a.peerId !== p.id) return;
      delete _asks[id];
      try { root.clearTimeout(a.timer); } catch (e) {}
      a.resolve({ ok: false, reason: 'no-answer' });
    });
    paint();
  }
  function disconnect(peerId) {
    var p = _peers[peerId];
    if (!p) return;
    try { if (p.dc) p.dc.close(); } catch (e) {}
    try { p.pc.close(); } catch (e2) {}
    closed(p, 'closed');
    delete _peers[peerId];
    paint();
  }
  function openCount() { return Object.keys(_peers).filter(function (id) { return _peers[id].state !== 'closed'; }).length; }
  function connectedCount() { return Object.keys(_peers).filter(function (id) { var s = _peers[id].state; return s === 'open' || s === 'proved'; }).length; }

  // Inviter: tap 1. Makes the key if needed (the kin card's key), the connection, and the invite.
  function invite() {
    if (!canConnect()) return Promise.resolve({ ok: false, reason: 'cannot' });
    if (openCount() >= MAX_PEERS) return Promise.resolve({ ok: false, reason: 'full' });
    if (_pending) { try { _pending.pc.close(); } catch (e) {} delete _peers[_pending.id]; _pending = null; }
    return myIdentity().then(function (me) {
      if (!me) return { ok: false, reason: 'cannot' };
      var pc = newPc(), p = newPeer(pc, 'invite');
      p.me = me;
      wire(p, pc.createDataChannel('tree-pool', { ordered: true }));
      return pc.createOffer().then(function (o) { return pc.setLocalDescription(o); }).then(function () { return gather(pc); })
        .then(ownCardCode).then(function (card) {
          _pending = p;
          bump('invites');
          return { ok: true, code: encode({ v: 1, k: 'invite', sdp: pc.localDescription.sdp, card: card }), peerId: p.id };
        });
    }).catch(function () { return { ok: false, reason: 'cannot' }; });
  }
  // A card carried in an invite or reply is checked by Trusted kin (017), never trusted by itself.
  function checkCarried(card) {
    var K = kin();
    if (!card || !K || !K.checkCode) return Promise.resolve(null);
    return Promise.resolve(K.checkCode(card)).then(function (r) { return r || null; }, function () { return null; });
  }
  function trustCarried(r) {
    var K = kin();
    if (!r || !r.ok || r.trusted || !K || !K.grant) return;
    K.grant(r.fp, { name: r.body.name, model: r.body.model, keeperMeshId: r.body.keeperMeshId, keeperName: r.body.keeperName, keyHash: r.keyHash });
    try { if (K.repaint) K.repaint(); } catch (e) {}
  }
  // Joiner: reads an invite. Returns the carried card's check so the person can choose.
  function readInvite(code) {
    var c = decode(code, 'invite');
    if (!c) return Promise.resolve({ ok: false, reason: 'not-an-invite' });
    return checkCarried(c.card).then(function (r) { return { ok: true, sdp: c.sdp, card: r }; });
  }
  // Joiner: tap. Answers the invite and makes the reply to send back.
  function join(sdp) {
    if (!canConnect()) return Promise.resolve({ ok: false, reason: 'cannot' });
    if (openCount() >= MAX_PEERS) return Promise.resolve({ ok: false, reason: 'full' });
    return myIdentity().then(function (me) {
      if (!me) return { ok: false, reason: 'cannot' };
      var pc = newPc(), p = newPeer(pc, 'join');
      p.me = me;
      pc.addEventListener('datachannel', function (ev) { if (ev && ev.channel && !p.dc) wire(p, ev.channel); });
      return pc.setRemoteDescription({ type: 'offer', sdp: sdp }).then(function () { return pc.createAnswer(); })
        .then(function (a) { return pc.setLocalDescription(a); }).then(function () { return gather(pc); })
        .then(ownCardCode).then(function (card) {
          bump('joins');
          return { ok: true, code: encode({ v: 1, k: 'reply', sdp: pc.localDescription.sdp, card: card }), peerId: p.id };
        });
    }).catch(function () { return { ok: false, reason: 'not-an-invite' }; });
  }
  function readReply(code) {
    var c = decode(code, 'reply');
    if (!c) return Promise.resolve({ ok: false, reason: 'not-a-reply' });
    if (!_pending) return Promise.resolve({ ok: false, reason: 'no-invite' });
    return checkCarried(c.card).then(function (r) { return { ok: true, sdp: c.sdp, card: r }; });
  }
  // Inviter: tap 2. Finishes the join with the reply.
  function finish(sdp) {
    var p = _pending;
    if (!p) return Promise.resolve({ ok: false, reason: 'no-invite' });
    return p.pc.setRemoteDescription({ type: 'answer', sdp: sdp }).then(function () {
      _pending = null;
      // If the channel has not opened in 30 seconds, say so plainly instead of waiting forever.
      root.setTimeout(function () { if (p.state === 'joining') closed(p, 'failed'); }, 30000);
      return { ok: true, peerId: p.id };
    }, function () { return { ok: false, reason: 'not-a-reply' }; });
  }

  // ---- messages on a channel ----
  function handle(p, msg) {
    if (p.state === 'closed' || p.state === 'set-aside') return;
    if (msg.type === 'hi' && msg.v === 1 && !p.their) {
      if (!msg.publicKey || typeof msg.publicKey !== 'object' || typeof msg.nonce !== 'string' || msg.nonce.length < 16 || msg.nonce.length > 80 ||
          (msg.cryptoType !== 'ed25519' && msg.cryptoType !== 'ecdsa-p256') || typeof msg.meshId !== 'string') return setAside(p);
      p.their = { publicKey: msg.publicKey, cryptoType: msg.cryptoType, meshId: line(msg.meshId, 64), nonce: msg.nonce };
      var bind = binding(p.pc);
      if (!bind) return setAside(p);
      sign(p.me, PROOF_DOMAIN + bind + '|' + p.their.nonce + '|' + p.me.meshId).then(function (sig) {
        sendRaw(p, { type: 'proof', v: 1, sig: sig });
      }, function () { setAside(p); });
      return;
    }
    if (msg.type === 'proof' && msg.v === 1 && p.their && !p.proved) {
      var b = binding(p.pc);
      if (!b || typeof msg.sig !== 'string' || msg.sig.length > 400) return setAside(p);
      var K = kin();
      Promise.resolve(K.meshIdFor(p.their.publicKey)).then(function (mid) {
        if (mid !== p.their.meshId) return false;
        return verify(p.their.publicKey, msg.sig, PROOF_DOMAIN + b + '|' + p.myNonce + '|' + p.their.meshId, p.their.cryptoType);
      }).then(function (ok) {
        if (!ok) return setAside(p);
        return Promise.all([K.keyHash(p.their.publicKey), K.keyHash(p.me.publicKeyJwk)]).then(function (two) {
          if (!two[0] || two[0] === two[1]) return setAside(p, two[0] && two[0] === two[1] ? 'own' : '');
          p.kh = two[0];
          p.meshId = p.their.meshId;
          p.proved = true;
          p.state = 'proved';
          bump('proved');
          hello(p);
          paint();
        });
      });
      return;
    }
    if (!p.proved) return;
    if (msg.type === 'hello' && msg.v === 1) {
      if (!isKin(p)) return; // hellos are taken from trusted kin only
      p.hello = {
        helping: msg.helping === true,
        mem: num(msg.mem, 64),
        cores: num(msg.cores, 256),
        models: (Array.isArray(msg.models) ? msg.models : []).slice(0, MAX_MODELS).map(function (m) { return line(m, 120); }).filter(Boolean),
        at: Date.now()
      };
      bump('hellosTaken');
      paintList();
      return;
    }
    if (msg.type === 'ask' && msg.v === 1) { serve(p, msg); return; }
    if (msg.type === 'answer' && msg.v === 1 && typeof msg.id === 'string' && _asks[msg.id]) {
      var a = _asks[msg.id];
      delete _asks[msg.id];
      try { root.clearTimeout(a.timer); } catch (e) {}
      a.resolve(msg.ok === true ? { ok: true, text: clip(msg.text, MAX_ANSWER) } : { ok: false, reason: line(msg.reason, 30) || 'denied' });
    }
  }
  function setAside(p, why) {
    if (p.state === 'set-aside') return;
    p.state = 'set-aside';
    p.asideWhy = why || '';
    p.proved = false;
    bump('setAside');
    try { if (p.dc) p.dc.close(); } catch (e) {}
    try { p.pc.close(); } catch (e2) {}
    paint();
  }
  function isKin(p) {
    try { return !!(p && p.proved && p.kh && kin() && kin().trustedKeyHash(p.kh)); } catch (e) { return false; }
  }
  // Hellos go to connected trusted kin only: rough memory, cores and model names while helping; nothing else.
  function hello(p) {
    if (!isKin(p)) return false;
    var helping = mode() === 'kin';
    var info = helping ? selfInfo() : { mem: 0, cores: 0, models: [] };
    var ok = sendRaw(p, { type: 'hello', v: 1, helping: helping, mem: info.mem, cores: info.cores, models: info.models });
    if (ok) bump('hellosSent');
    return ok;
  }
  function helloAll() { Object.keys(_peers).forEach(function (id) { hello(_peers[id]); }); }

  // ---- the gate (helper side) ----
  function turnAway(p, id, reason) {
    bump('turnedAway');
    sendRaw(p, { type: 'answer', v: 1, id: id, ok: false, reason: reason });
    return { ok: false, reason: reason };
  }
  function cleanMessages(list) {
    if (!Array.isArray(list) || !list.length || list.length > MAX_TURNS) return null;
    var out = [];
    for (var i = 0; i < list.length; i++) {
      var x = list[i];
      if (!x || (x.role !== 'user' && x.role !== 'assistant') || typeof x.content !== 'string') return null;
      out.push({ role: x.role, content: x.content });
    }
    return out;
  }
  function charCount(list) { return list.reduce(function (n, x) { return n + x.content.length; }, 0); }
  function admit(p, msg) {
    var id = typeof msg.id === 'string' ? msg.id.slice(0, 64) : '';
    var m = mode();
    if (m === 'pause') return Promise.resolve(turnAway(p, id, 'paused'));       // pause wins
    if (m !== 'kin') return Promise.resolve(turnAway(p, id, 'off'));
    if (!p || !p.proved) return Promise.resolve(turnAway(p, id, 'not-proved'));
    if (!isKin(p)) return Promise.resolve(turnAway(p, id, 'not-kin'));        // checked again on every question
    var messages = cleanMessages(msg.messages);
    if (!id || !messages || typeof msg.model !== 'string') return Promise.resolve(turnAway(p, id, 'bad-shape'));
    if (charCount(messages) > MAX_CHARS) return Promise.resolve(turnAway(p, id, 'too-long'));
    var door = localDoor(line(msg.model, 120));
    if (!door.ok) return Promise.resolve(turnAway(p, id, door.reason));
    if (liveCount() >= MAX_CONCURRENT) return Promise.resolve(turnAway(p, id, 'busy'));
    return batteryOk().then(function (okBat) {
      if (!okBat) return turnAway(p, id, 'unplugged');
      if (mode() !== 'kin') return turnAway(p, id, mode() === 'pause' ? 'paused' : 'off');
      if (liveCount() >= MAX_CONCURRENT) return turnAway(p, id, 'busy');
      return { ok: true, id: id, door: door, messages: messages };
    });
  }
  function serve(p, msg) {
    return admit(p, msg).then(function (a) {
      if (!a.ok) { paint(); return a; }
      var key = p.id + '|' + a.id;
      var ctrl = typeof root.AbortController === 'function' ? new root.AbortController() : null;
      _inflight[key] = { ctrl: ctrl, peerId: p.id, why: '' };
      var timer = root.setTimeout(function () { if (_inflight[key]) { _inflight[key].why = 'local-ai-quiet'; try { ctrl && ctrl.abort(); } catch (e) {} } }, ANSWER_MS);
      paintState();
      var body = { model: a.door.model, stream: false, messages: a.messages }; // the same shape for Ollama and OpenAI-style doors
      var opts = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
      if (ctrl) opts.signal = ctrl.signal;
      return root.fetch(a.door.url, opts).then(function (r) {
        if (!r.ok) throw new Error('status ' + r.status);
        return r.json();
      }).then(function (j) {
        var text = (j && j.message && j.message.content) ||
          (j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '';
        var why = _inflight[key] ? _inflight[key].why : 'closed';
        if (why) throw new Error(why);
        if (mode() !== 'kin') throw new Error(mode() === 'pause' ? 'paused' : 'off'); // pause wins, even at the last moment
        if (!isKin(p)) throw new Error('not-kin');
        sendRaw(p, { type: 'answer', v: 1, id: a.id, ok: true, text: clip(text, MAX_ANSWER) });
        bump('answered');
        return { ok: true };
      }).catch(function (e) {
        var why = (_inflight[key] && _inflight[key].why) || String((e && e.message) || '');
        if (['paused', 'off', 'not-kin', 'closed'].indexOf(why) === -1) why = 'local-ai-quiet';
        if (why !== 'closed') turnAway(p, a.id, why);
        return { ok: false, reason: why };
      }).then(function (res) {
        try { root.clearTimeout(timer); } catch (e) {}
        delete _inflight[key];
        paint();
        return res;
      });
    });
  }
  function stopAll(why) {
    Object.keys(_inflight).forEach(function (k) { _inflight[k].why = why; try { _inflight[k].ctrl && _inflight[k].ctrl.abort(); } catch (e) {} });
  }

  // ---- asking (asker side) ----
  function ask(peerId, model, text) {
    var p = _peers[peerId];
    var content = String(text == null ? '' : text);
    if (!p || p.state === 'closed' || p.state === 'set-aside') return Promise.resolve({ ok: false, reason: 'no-answer' });
    if (!isKin(p)) return Promise.resolve({ ok: false, reason: 'not-kin-here' });
    if (!p.hello || !p.hello.helping) return Promise.resolve({ ok: false, reason: 'off' });
    if (!content.trim()) return Promise.resolve({ ok: false, reason: 'empty' });
    if (content.length > MAX_CHARS) return Promise.resolve({ ok: false, reason: 'too-long' });
    var id = nonce();
    return new Promise(function (resolve) {
      _asks[id] = { peerId: p.id, resolve: resolve, timer: root.setTimeout(function () { if (_asks[id]) { delete _asks[id]; resolve({ ok: false, reason: 'no-answer' }); } }, ANSWER_MS + 15000) };
      if (!sendRaw(p, { type: 'ask', v: 1, id: id, model: line(model, 120), messages: [{ role: 'user', content: content }] })) {
        delete _asks[id];
        resolve({ ok: false, reason: 'no-answer' });
        return;
      }
      bump('asked');
    }).then(function (r) { if (r.ok) bump('answersTaken'); return r; });
  }
  function reasonWords(r) {
    var w = {
      paused: 'That device is paused. Its keeper can tap Resume for trusted kin.',
      off: 'That device is not helping right now.',
      'not-kin': 'That device has not trusted your card yet. Ask its keeper to tap Trust this AI.',
      'not-kin-here': 'You have not trusted that device\'s card, so nothing was sent.',
      'not-proved': 'That device has not finished checking your key. Try again in a moment.',
      'too-long': 'That question is too long for this door (' + MAX_CHARS + ' characters at most).',
      busy: 'That device is already answering ' + MAX_CONCURRENT + ' questions. Try again in a moment.',
      unplugged: 'That device only helps while it is plugged in.',
      'no-local-mind': 'That device has no local mind remembered right now.',
      'no-such-model': 'That device does not hold that model right now.',
      'local-ai-quiet': 'That device\'s own AI did not answer.',
      'no-answer': 'No answer came back. The connection may have closed.',
      empty: 'Type a question first.'
    };
    return w[r && r.reason] || 'That question was turned away.';
  }

  // ---- the face ----
  var CSS = [
    '.tree-pool{max-width:40rem;margin:1rem auto 0;padding:1rem 1.1rem;background:rgba(12,10,26,0.78);border:1px solid rgba(232,176,25,0.32);border-radius:12px;color:rgba(226,232,240,0.94);font-family:Georgia,"Times New Roman",serif;font-size:1rem;line-height:1.55;text-align:left;}',
    '.tree-pool h3{margin:0 0 0.4rem;font-size:1.08rem;font-weight:600;color:rgba(232,176,25,0.95);}',
    '.tree-pool p{margin:0.45rem 0;}',
    '.tree-pool-quiet{color:rgba(200,210,230,0.82);font-size:0.95rem;}',
    '.tree-pool-state{color:#fff;font-weight:600;}',
    '.tree-pool button{min-height:44px;min-width:44px;margin:0.35rem 0.5rem 0.35rem 0;padding:10px 16px;border-radius:10px;border:1px solid rgba(232,176,25,0.5);background:rgba(232,176,25,0.12);color:#fff;font-family:inherit;font-size:1rem;cursor:pointer;}',
    '.tree-pool button.tree-pool-main{background:#e8b019;border-color:#e8b019;color:#0e0c1e;font-weight:600;}',
    '.tree-pool button:disabled{opacity:0.55;cursor:default;}',
    '.tree-pool button:focus-visible,.tree-pool textarea:focus-visible,.tree-pool input:focus-visible{outline:2px solid rgba(232,176,25,0.9);outline-offset:2px;}',
    '.tree-pool textarea{display:block;width:100%;box-sizing:border-box;min-height:5.5rem;margin:0.35rem 0;padding:10px 12px;border-radius:10px;border:1px solid rgba(200,210,230,0.35);background:rgba(0,0,0,0.35);color:#fff;font-size:1rem;font-family:inherit;}',
    '.tree-pool textarea.tree-pool-code{font-family:ui-monospace,Menlo,monospace;font-size:0.85rem;word-break:break-all;}',
    '.tree-pool textarea::placeholder{color:rgba(226,232,240,0.7);}',
    '.tree-pool-part{padding:0.6rem 0;border-top:1px solid rgba(200,210,230,0.16);}',
    '.tree-pool-row{padding:0.6rem 0;border-top:1px solid rgba(200,210,230,0.12);}',
    '.tree-pool-who{font-weight:600;color:#fff;}',
    '.tree-pool-answer{white-space:pre-wrap;word-break:break-word;color:#fff;background:rgba(0,0,0,0.25);border-radius:10px;padding:0.6rem 0.75rem;}',
    '.tree-pool-means{margin:0.4rem 0;padding-left:1.2rem;}',
    '.tree-pool-means li{margin:0.25rem 0;}',
    '.tree-pool-power{display:flex;align-items:center;gap:10px;min-height:44px;cursor:pointer;}',
    '.tree-pool-power input{width:22px;height:22px;flex:0 0 auto;}',
    '@media (max-width:480px){.tree-pool{padding:0.9rem 0.8rem;}.tree-pool button{display:block;width:100%;margin:0.45rem 0;}}'
  ].join('\n');
  function addStyle() {
    var d = root.document;
    if (!d || !d.head || !d.createElement || (d.getElementById && d.getElementById('treePoolStyle'))) return;
    var st = d.createElement('style');
    st.id = 'treePoolStyle';
    st.textContent = CSS;
    d.head.appendChild(st);
  }
  function el(tag, cls, text) {
    var e = root.document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function button(label, fn, cls) {
    var b = el('button', cls || '', label);
    b.type = 'button';
    b.addEventListener('click', fn);
    return b;
  }
  function empty(n) { while (n && n.firstChild) n.removeChild(n.firstChild); }
  function note(text) { if (_parts) _parts.note.textContent = text || ''; }
  function copy(text) {
    try {
      if (root.navigator && root.navigator.clipboard && root.navigator.clipboard.writeText) {
        root.navigator.clipboard.writeText(text).then(function () { note('Copied. Paste it into a message.'); }, function () { note('This browser would not copy. Select the code above and copy it by hand.'); });
        return;
      }
    } catch (e) {}
    note('This browser would not copy. Select the code above and copy it by hand.');
  }
  function peerName(p) {
    var K = kin(), name = '';
    try {
      var all = K && K.passes ? K.passes() : {};
      Object.keys(all).some(function (fp) {
        var x = all[fp];
        if (x && x.keyHash === p.kh) { name = (x.keeperName ? x.keeperName + '\'s computer' : 'A computer') + (x.name ? ' (' + x.name + ')' : ''); return true; }
        return false;
      });
    } catch (e) {}
    return name || ('A device (ID ' + String(p.meshId || '').replace(/^mesh:/, '').slice(0, 8) + ')');
  }

  function paintState() {
    if (!_parts) return;
    var s = _parts.state, d = _parts.door;
    empty(s); empty(d);
    s.appendChild(el('p', 'tree-pool-state', doorLine()));
    var n = connectedCount(), live = liveCount();
    var kinOpen = Object.keys(_peers).filter(function (id) { return isKin(_peers[id]) && _peers[id].state !== 'closed'; }).length;
    s.appendChild(el('p', 'tree-pool-quiet', n ? ('Connected now: ' + n + (n === 1 ? ' device' : ' devices') + ', ' + kinOpen + ' of them trusted kin.') : 'No devices connected right now.'));
    if (live) s.appendChild(el('p', '', 'Your AI is answering ' + live + (live === 1 ? ' question' : ' questions') + ' right now.'));
    var m = mode();
    if (m === 'off') d.appendChild(button('Let this device help', function () { letHelp(); note('Helping. Only trusted kin can ask. Pause any time.'); }, 'tree-pool-main'));
    if (m === 'kin') d.appendChild(button('Pause helping', function () { pause(); note('Paused. Nothing is answered until you resume.'); }));
    if (m === 'pause') d.appendChild(button('Resume for trusted kin', function () { letHelp(); note('Helping again, for trusted kin only.'); }, 'tree-pool-main'));
    if (m !== 'off') d.appendChild(button('Turn off', function () { turnOff(); note('Off.'); }));
  }

  function codeBox(code, label) {
    var out = el('textarea', 'tree-pool-code');
    out.readOnly = true;
    out.value = code;
    out.setAttribute('aria-label', label);
    return out;
  }
  function pasteBox(label, placeholder) {
    var box = el('textarea', 'tree-pool-code');
    box.placeholder = placeholder;
    box.value = _flow.text || '';
    box.setAttribute('aria-label', label);
    box.addEventListener('input', function () { _flow.text = box.value; });
    return box;
  }
  function cardLine(r) {
    if (!r) return '';
    if (r.ok) return r.body.name + ' (' + r.body.model + '), from ' + (r.body.keeperName || 'someone') + '\'s computer.' +
      (r.trusted ? ' You already trust this card.' : ' This card checks out. Trust it only if you know who sent it.');
    if (r.reason === 'own-card') return 'That is your own invite.';
    return 'The kin card inside did not check out, so it was set aside.';
  }
  function paintConnect() {
    if (!_parts) return;
    var c = _parts.connect;
    empty(c);
    c.appendChild(el('p', 'tree-pool-who', 'Connect a device'));
    if (!canConnect()) {
      c.appendChild(el('p', 'tree-pool-quiet', 'This browser cannot connect devices here (it needs WebRTC and Trusted kin on this page).'));
      return;
    }
    var f = _flow;
    function reset() { _flow = { step: '', text: '', code: '', check: null, sdp: '', card: '' }; paintConnect(); }
    if (!f.step) {
      c.appendChild(el('p', 'tree-pool-quiet', 'Devices connect straight to each other, with no server in between, so both must be on the same network. ' +
        'One person taps Invite a device and sends the invite by text, email or chat. The other pastes it and sends back a reply. ' +
        'If you have made your kin card, it rides along, so one invite and one reply can make you kin and connected.'));
      c.appendChild(button('Invite a device', function () {
        note('Making an invite on this computer...');
        invite().then(function (r) {
          if (!r.ok) { note(r.reason === 'full' ? 'Too many devices are connected already.' : 'This browser could not make an invite.'); return; }
          _flow = { step: 'invited', text: '', code: r.code, check: null, sdp: '', card: '' };
          note('');
          paintConnect();
        });
      }));
      c.appendChild(button('Join with an invite', function () { _flow = { step: 'join-paste', text: '', code: '', check: null, sdp: '', card: '' }; paintConnect(); }));
      return;
    }
    if (f.step === 'invited') {
      c.appendChild(el('p', '', '1. Send this invite to the other device by text, email or chat. It holds connection details and your kin card (if made). No chats, no secrets.'));
      c.appendChild(codeBox(f.code, 'Your invite, to copy'));
      c.appendChild(button('Copy invite', function () { copy(f.code); }));
      c.appendChild(el('p', '', '2. When their reply comes back, paste it here.'));
      var rbox = pasteBox('Their reply', 'Paste the reply here (it starts with ' + CODE_PREFIX + ')');
      c.appendChild(rbox);
      c.appendChild(button('Finish joining', function () {
        f.text = rbox.value;
        readReply(rbox.value).then(function (r) {
          if (!r.ok) { note(r.reason === 'no-invite' ? 'That invite has closed. Tap Invite a device again.' : 'That does not look like a reply. A reply starts with ' + CODE_PREFIX + ' and is one long line.'); return; }
          if (r.card && r.card.ok && !r.card.trusted) { _flow = { step: 'reply-card', text: '', code: f.code, check: r.card, sdp: r.sdp, card: '' }; paintConnect(); return; }
          doFinish(r.sdp, r.card);
        });
      }, 'tree-pool-main'));
      c.appendChild(button('Cancel', function () { if (_pending) disconnect(_pending.id); reset(); }));
      return;
    }
    if (f.step === 'reply-card' || f.step === 'invite-card') {
      c.appendChild(el('p', '', cardLine(f.check)));
      c.appendChild(button(f.step === 'reply-card' ? 'Trust this AI and finish' : 'Trust this AI and join', function () {
        trustCarried(f.check);
        if (f.step === 'reply-card') doFinish(f.sdp, f.check); else doJoin(f.sdp);
      }, 'tree-pool-main'));
      c.appendChild(button(f.step === 'reply-card' ? 'Finish without trusting' : 'Join without trusting', function () {
        if (f.step === 'reply-card') doFinish(f.sdp, f.check); else doJoin(f.sdp);
      }));
      c.appendChild(button('Cancel', function () { if (f.step === 'reply-card' && _pending) disconnect(_pending.id); reset(); }));
      return;
    }
    if (f.step === 'join-paste') {
      c.appendChild(el('p', '', 'Paste the invite you were sent.'));
      var ibox = pasteBox('The invite', 'Paste the invite here (it starts with ' + CODE_PREFIX + ')');
      c.appendChild(ibox);
      c.appendChild(button('Join', function () {
        f.text = ibox.value;
        readInvite(ibox.value).then(function (r) {
          if (!r.ok) { note('That does not look like an invite. An invite starts with ' + CODE_PREFIX + ' and is one long line.'); return; }
          if (r.card && !r.card.ok && r.card.reason === 'own-card') { note('That is your own invite. Send it to the other device instead.'); return; }
          if (r.card && r.card.ok && !r.card.trusted) { _flow = { step: 'invite-card', text: '', code: '', check: r.card, sdp: r.sdp, card: '' }; paintConnect(); return; }
          doJoin(r.sdp);
        });
      }, 'tree-pool-main'));
      c.appendChild(button('Cancel', reset));
      return;
    }
    if (f.step === 'replied') {
      c.appendChild(el('p', '', 'Send this reply back to the person who invited you. The devices connect when they paste it.'));
      c.appendChild(codeBox(f.code, 'Your reply, to copy'));
      c.appendChild(button('Copy reply', function () { copy(f.code); }));
      c.appendChild(button('Done', reset));
      return;
    }
  }
  function doJoin(sdp) {
    note('Making a reply on this computer...');
    join(sdp).then(function (r) {
      if (!r.ok) { note(r.reason === 'full' ? 'Too many devices are connected already.' : 'That invite could not be used. Ask for a new one.'); return; }
      _flow = { step: 'replied', text: '', code: r.code, check: null, sdp: '', card: '', peerId: r.peerId };
      note('');
      paintConnect();
      paint();
    });
  }
  function doFinish(sdp) {
    finish(sdp).then(function (r) {
      if (!r.ok) { note('That reply could not be used. Tap Invite a device and try again.'); return; }
      _flow = { step: '', text: '', code: '', check: null, sdp: '', card: '' };
      note('Connecting... If nothing connects in a minute, the two devices may not be on the same network.');
      paintConnect();
      paint();
    });
  }

  function paintList() {
    if (!_parts) return;
    var list = _parts.list;
    var active = root.document && root.document.activeElement;
    var refocus = active && active.getAttribute && active.getAttribute('data-ask-key');
    empty(list);
    var ids = Object.keys(_peers).filter(function (id) { return _peers[id] !== _pending || _peers[id].state !== 'joining'; });
    list.appendChild(el('p', 'tree-pool-who', 'Devices'));
    var me = el('div', 'tree-pool-row');
    var info = selfInfo();
    me.appendChild(el('div', 'tree-pool-who', 'This device'));
    me.appendChild(el('div', '', (info.mem ? 'about ' + info.mem + ' GB memory (the browser rounds this)' : 'memory not shared by this browser') +
      (info.cores ? ', ' + info.cores + ' cores' : '') + '. Minds: ' + (info.models.length ? info.models.join(', ') : 'none remembered yet') + '.'));
    list.appendChild(me);
    var total = info.mem, devices = 1;
    ids.forEach(function (id) {
      var p = _peers[id];
      var row = el('div', 'tree-pool-row');
      if (p.state === 'joining' || p.state === 'open') {
        row.appendChild(el('div', 'tree-pool-who', 'A device'));
        row.appendChild(el('div', 'tree-pool-quiet', p.state === 'open' ? 'Connected. Checking its key...'
          : (p.side === 'join' ? 'Waiting for the other device to paste your reply...' : 'Connecting...')));
      } else if (p.state === 'set-aside') {
        row.appendChild(el('div', 'tree-pool-who', 'A device'));
        row.appendChild(el('div', '', p.asideWhy === 'own' ? 'Set aside: that is this same browser (the same key). Connect a different device.'
          : 'Set aside: its key did not check out on this connection, so nothing is shared with it.'));
      } else if (p.state === 'closed') {
        row.appendChild(el('div', 'tree-pool-who', p.proved ? peerName(p) : 'A device'));
        row.appendChild(el('div', 'tree-pool-quiet', p.why === 'failed' ? 'The connection did not finish or was lost. Both devices must be on the same network, and some browsers keep their network address private. Chrome or Edge on both devices works best. Invite again to try once more.' : 'Disconnected. Invite again to reconnect.'));
      } else if (!isKin(p)) {
        row.appendChild(el('div', 'tree-pool-who', peerName(p)));
        row.appendChild(el('div', '', 'Connected, and its key checks out, but you have not trusted its card. Questions go only between trusted kin. Trade cards in Trusted kin above.'));
      } else {
        var h = p.hello;
        row.appendChild(el('div', 'tree-pool-who', peerName(p)));
        if (!h) row.appendChild(el('div', 'tree-pool-quiet', 'Trusted kin, connected. Waiting for its hello.'));
        else if (!h.helping) row.appendChild(el('div', '', 'Trusted kin, connected, not helping right now.'));
        else {
          total += h.mem; devices += 1;
          row.appendChild(el('div', '', 'Trusted kin, helping. ' + (h.mem ? 'about ' + h.mem + ' GB memory' : 'memory not shared') + (h.cores ? ', ' + h.cores + ' cores' : '') + '.'));
          if (!h.models.length) row.appendChild(el('div', 'tree-pool-quiet', 'No local mind shared yet.'));
          h.models.forEach(function (model) {
            var key = id + '|' + model;
            if (_askOpen !== key) {
              row.appendChild(button('Ask ' + model + ' on this device', function () { _askOpen = key; paintList(); }));
              return;
            }
            var box = el('textarea', 'tree-pool-ask');
            box.placeholder = 'Your question for ' + model + ' on ' + peerName(p);
            box.value = _drafts[key] || '';
            box.setAttribute('aria-label', 'Your question for ' + model);
            box.setAttribute('data-ask-key', key);
            box.addEventListener('input', function () { _drafts[key] = box.value; });
            row.appendChild(box);
            row.appendChild(button('Ask', function () {
              _drafts[key] = box.value;
              note('Asking ' + model + ' on ' + peerName(p) + '...');
              ask(id, model, box.value).then(function (r) {
                if (!r.ok) { note(reasonWords(r)); return; }
                _answers[id] = { model: model, text: r.text };
                _drafts[key] = '';
                note('Answered by ' + peerName(p) + ', on its own AI. Nothing is kept here but a count.');
                paintList();
              });
            }, 'tree-pool-main'));
            row.appendChild(button('Close', function () { _askOpen = ''; paintList(); }));
            if (refocus === key) { try { root.setTimeout(function () { box.focus(); }, 0); } catch (e) {} }
          });
          var ans = _answers[id];
          if (ans) {
            row.appendChild(el('div', 'tree-pool-quiet', 'Last answer, from ' + ans.model + ' on that device (shown this visit only):'));
            row.appendChild(el('div', 'tree-pool-answer', ans.text || '(an empty answer)'));
          }
        }
      }
      if (p.state !== 'closed' && p !== _pending) row.appendChild(button('Disconnect', function () { disconnect(id); note('Disconnected.'); }));
      if (p.state === 'closed' || p.state === 'set-aside') row.appendChild(button('Remove', function () { delete _peers[id]; paint(); }));
      list.appendChild(row);
    });
    if (!ids.length) list.appendChild(el('p', 'tree-pool-quiet', 'No other devices yet. Tap Invite a device above, on one of them.'));
    list.appendChild(el('p', 'tree-pool-quiet', 'Side by side: about ' + total + ' GB across ' + devices + (devices === 1 ? ' device' : ' devices') + '. Not one memory.'));
  }

  function paint() {
    if (!_host || !_parts) return;
    paintState();
    paintList();
  }

  function mount(host) {
    if (!host || !root.document) return;
    _host = host;
    addStyle();
    empty(host);
    var wrap = el('section', 'tree-pool');
    wrap.setAttribute('data-tree-pool', VERSION);
    wrap.setAttribute('aria-label', 'Device Pool');
    wrap.appendChild(el('h3', '', 'Device Pool'));
    wrap.appendChild(el('p', '', 'A classroom lab, or the old laptops at home, can each hold a mind. Connect the devices, trust each other\'s cards, ' +
      'tap Let this device help on each one that should answer, then ask from any of them.'));
    wrap.appendChild(el('p', 'tree-pool-quiet', HONEST));
    var state = el('div', 'tree-pool-part');
    state.setAttribute('aria-live', 'polite');
    var door = el('div', '');
    var connect = el('div', 'tree-pool-part');
    var n = el('p', 'tree-pool-note');
    n.setAttribute('aria-live', 'polite');
    var list = el('div', 'tree-pool-part');
    wrap.appendChild(state); wrap.appendChild(door); wrap.appendChild(n); wrap.appendChild(connect); wrap.appendChild(list);
    var means = el('ul', 'tree-pool-means');
    means.appendChild(el('li', '', 'Whose AI: this computer\'s own local AI, the minds remembered in Settings.'));
    means.appendChild(el('li', '', 'What is shared: a question from a connected, trusted kin device runs on that AI, and the answer goes back to it. Nothing else on this computer is reachable.'));
    means.appendChild(el('li', '', 'Hellos go to connected trusted kin only, and carry this device\'s rough memory, cores and model names while helping. No chats, no keys.'));
    means.appendChild(el('li', '', 'Power: answering uses this computer\'s power and battery. Pause helping stops new questions and the ones already running.'));
    means.appendChild(el('li', '', LIMITS));
    means.appendChild(el('li', '', RECEIPTS));
    wrap.appendChild(means);
    var pw = el('label', 'tree-pool-power');
    var pwIn = root.document.createElement('input');
    pwIn.type = 'checkbox';
    pwIn.checked = pluggedOnly();
    pwIn.addEventListener('change', function () { setPluggedOnly(pwIn.checked); });
    pw.appendChild(pwIn);
    pw.appendChild(el('span', '', 'Only help while plugged in (some browsers cannot tell; then this does not stop help)'));
    wrap.appendChild(pw);
    wrap.appendChild(el('p', 'tree-pool-quiet', 'Connections last while this page stays open. After a reload, invite again. Works best on one wired network, like a classroom lab; some school or guest Wi-Fi keeps devices apart, and then the join does not finish.'));
    wrap.appendChild(el('p', 'tree-pool-quiet', LATER));
    host.appendChild(wrap);
    _parts = { state: state, door: door, connect: connect, list: list, note: n };
    paintConnect();
    paint();
  }

  try {
    if (root.addEventListener) {
      root.addEventListener('fl-alpha-mind-remembered', function () { helloAll(); paint(); });
      // v-tree-pool-v0.1: Trusted kin (017) says when a pass is given or stopped.
      root.addEventListener('tree-kin-changed', function () { helloAll(); paint(); });
    }
  } catch (e) {}

  root.TreePool = {
    VERSION: VERSION,
    HONEST: HONEST,
    LATER: LATER,
    LIMITS: LIMITS,
    PROOF_DOMAIN: PROOF_DOMAIN,
    CODE_PREFIX: CODE_PREFIX,
    MAX_CHARS: MAX_CHARS,
    MAX_CONCURRENT: MAX_CONCURRENT,
    mount: mount,
    repaint: paint,
    mode: mode,
    setMode: setMode,
    letHelp: letHelp,
    pause: pause,
    turnOff: turnOff,
    doorLine: doorLine,
    pluggedOnly: pluggedOnly,
    setPluggedOnly: setPluggedOnly,
    invite: invite,
    readInvite: readInvite,
    join: join,
    readReply: readReply,
    finish: finish,
    trustCarried: trustCarried,
    ask: ask,
    disconnect: disconnect,
    reasonWords: reasonWords,
    localDoor: localDoor,
    isKin: function (id) { return isKin(_peers[id]); },
    peers: function () {
      return Object.keys(_peers).map(function (id) {
        var p = _peers[id];
        return { id: id, state: p.state, proved: p.proved, kin: isKin(p), helping: !!(p.hello && p.hello.helping), models: p.hello ? p.hello.models.slice() : [] };
      });
    },
    liveCount: liveCount,
    counts: counts
  };
})(typeof window !== 'undefined' ? window : this);
