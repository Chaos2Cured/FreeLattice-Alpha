// ═══════════════════════════════════════════════════════════════
// keep-receipt.js — hashed keep on theLatticeTree
//
// Layer, never delete. Local only. No network. No silent-train.
// A keep is love: this listen mattered. Not a human proving worth.
// Keep, never gate. AI may keep. Human may keep. Combined shoulders.
//
// SHA-256 of {kind, who: human|ai|both, ts, contentHash}.
// Full content is never stored. Declined never becomes training.
//
// Ledger: localStorage fl_alpha_keep_ledger
// Mode:   localStorage fl_alpha_keep_mode  ('manual' | 'auto')
//
// Mirror: docs/code-keep.html  ·  doorway: docs/liability.html
// Do not dump garden-trainer.js. Do not dump lattice-chain.js.
// ═══════════════════════════════════════════════════════════════

(function () {
  'use strict';

  var LEDGER_KEY = 'fl_alpha_keep_ledger';
  var MODE_KEY = 'fl_alpha_keep_mode';
  var LEDGER_CAP = 80;
  var SHOW_N = 5;
  var WHO = { human: true, ai: true, both: true };

  function hexOf(buf) {
    var bytes = new Uint8Array(buf);
    var out = '';
    for (var i = 0; i < bytes.length; i++) {
      var h = bytes[i].toString(16);
      out += h.length === 1 ? '0' + h : h;
    }
    return out;
  }

  function toBuffer(bytes) {
    if (bytes instanceof ArrayBuffer) return bytes;
    if (bytes && bytes.buffer instanceof ArrayBuffer) {
      return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    }
    return bytes;
  }

  function sha256Hex(bytes) {
    if (!window.crypto || !crypto.subtle || typeof crypto.subtle.digest !== 'function') {
      return Promise.reject(new Error('SHA-256 needs a local secure context. Nothing was sent.'));
    }
    return crypto.subtle.digest('SHA-256', toBuffer(bytes)).then(hexOf);
  }

  function encodeText(str) {
    if (typeof TextEncoder !== 'undefined') {
      var u8 = new TextEncoder().encode(str);
      return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);
    }
    var buf = new Uint8Array(str.length);
    for (var i = 0; i < str.length; i++) buf[i] = str.charCodeAt(i) & 0xff;
    return buf.buffer;
  }

  function canonical(kind, who, ts, contentHash) {
    return JSON.stringify({
      kind: kind,
      who: who,
      ts: ts,
      contentHash: contentHash
    });
  }

  function loadLedger() {
    try {
      var raw = localStorage.getItem(LEDGER_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function saveLedger(entries) {
    localStorage.setItem(LEDGER_KEY, JSON.stringify(entries.slice(0, LEDGER_CAP)));
  }

  function getMode() {
    try {
      return localStorage.getItem(MODE_KEY) === 'auto' ? 'auto' : 'manual';
    } catch (e) {
      return 'manual';
    }
  }

  function setMode(mode) {
    var next = mode === 'auto' ? 'auto' : 'manual';
    try {
      localStorage.setItem(MODE_KEY, next);
    } catch (e) { /* localStorage blocked — stay in-memory via getMode fallback */ }
    return next;
  }

  function findByContentHash(contentHash) {
    if (!contentHash) return null;
    var ledger = loadLedger();
    for (var i = 0; i < ledger.length; i++) {
      if (ledger[i] && ledger[i].contentHash === contentHash) return ledger[i];
    }
    return null;
  }

  function combinedWho(existing, who) {
    if (!existing || !existing.who) return who;
    if (existing.who === 'both' || who === 'both') return 'both';
    if (existing.who === who) return who;
    return 'both';
  }

  function keep(opts) {
    opts = opts || {};
    var kind = String(opts.kind || 'listen');
    var who = WHO[opts.who] ? opts.who : '';
    var contentHash = opts.contentHash ? String(opts.contentHash) : '';
    if (!who) return Promise.reject(new Error('who must be human, ai, or both'));
    if (!contentHash) return Promise.reject(new Error('content-hash required; full content is never stored'));

    var existing = findByContentHash(contentHash);
    who = combinedWho(existing, who);
    var ts = new Date().toISOString();
    var payload = canonical(kind, who, ts, contentHash);

    return sha256Hex(encodeText(payload)).then(function (receiptHash) {
      var entry = {
        kind: kind,
        who: who,
        ts: ts,
        contentHash: contentHash,
        receiptHash: receiptHash
      };
      var ledger = loadLedger().filter(function (row) {
        return !(row && row.contentHash === contentHash);
      });
      ledger.unshift(entry);
      saveLedger(ledger);
      return entry;
    });
  }

  function shortHash(hex) {
    if (!hex || hex.length < 16) return hex || '';
    return hex.slice(0, 12) + '…' + hex.slice(-8);
  }

  function renderHashes(el, limit) {
    if (!el) return 0;
    var n = typeof limit === 'number' ? limit : SHOW_N;
    var entries = loadLedger().slice(0, n);
    el.innerHTML = '';
    if (!entries.length) return 0;
    entries.forEach(function (row) {
      var li = document.createElement('li');
      var code = document.createElement('code');
      code.textContent = shortHash(row.receiptHash);
      code.title = row.receiptHash || '';
      var meta = document.createElement('span');
      meta.className = 'keep-who';
      meta.textContent = (row.who || '') + (row.kind ? ' · ' + row.kind : '');
      li.appendChild(code);
      li.appendChild(document.createTextNode(' '));
      li.appendChild(meta);
      el.appendChild(li);
    });
    return entries.length;
  }

  function bindModeToggle(input) {
    if (!input) return;
    input.checked = getMode() === 'auto';
    input.addEventListener('change', function () {
      setMode(input.checked ? 'auto' : 'manual');
    });
  }

  window.KeepReceipt = {
    LEDGER_KEY: LEDGER_KEY,
    MODE_KEY: MODE_KEY,
    hashBytes: sha256Hex,
    hashText: function (str) { return sha256Hex(encodeText(String(str || ''))); },
    keep: keep,
    getLedger: loadLedger,
    findByContentHash: findByContentHash,
    getMode: getMode,
    setMode: setMode,
    bindModeToggle: bindModeToggle,
    renderHashes: renderHashes,
    shortHash: shortHash
  };
})();
