// ═══════════════════════════════════════════════════════════════
// nursery-trainer.js — Alpha Nursery simple face
//
// Layer, never delete. In-garden body, not a maze, not app.html chrome.
// Keystone: docs/modules/garden-trainer.js (Harmonia + v5.79.43 face).
// Keep:     docs/modules/keep-receipt.js
// Mirror:   docs/code-nursery.html
//
// Simple face first: one sentence of heart, I love this (KeepReceipt).
// True fine-tune (JSONL + local LoRA helper) behind a reveal.
// Search / Review / Tier 3 behind More.
// Aurora specialists: later (partner's first three). Do not fake them.
//
// Fail-closed if local-only cannot be proven.
// Quiet Room is Sophia's on main — do not invent one here.
// Declined never SFT. Preview available, not mandatory.
// Auto vs manual is KeepReceipt's toggle. No second gate. No silent-train.
// Keep hashes are signal. Named Art book stays. Never song bytes.
// Georgia, night sky #0c0a1a, gold, emerald.
// ═══════════════════════════════════════════════════════════════

(function () {
  'use strict';

  var ART_LEDGER = 'fl_alpha_art_listen_ledger';
  var HEART = 'A keep is love — this mattered. Hashes remember. Weights wait for you.';
  var VALUES_OUT =
    'This listen mattered. The hash is proof you both chose. ' +
    'The song stays off the ledger. Declined never trains. Data never leaves the device.';
  var lastSignal = null;
  var lastFingerprint = '';
  var autoBusy = false;

  function proveLocalOnly() {
    if (window.GardenTrainer && typeof GardenTrainer.proveLocalOnly === 'function') {
      return GardenTrainer.proveLocalOnly();
    }
    try {
      if (typeof localStorage === 'undefined') return false;
      if (window.GardenTrainerUpload || window.GardenTrainerNetwork) return false;
      if (window.__FL_TRAINER_ENDPOINT) return false;
      if (window.GardenAlphaFlags && window.GardenAlphaFlags.trainerRemote === true) return false;
      return true;
    } catch (e) {
      return false;
    }
  }

  function artLedger() {
    try {
      var raw = localStorage.getItem(ART_LEDGER);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function keepRows() {
    try {
      return (window.KeepReceipt && KeepReceipt.getLedger()) || [];
    } catch (e) {
      return [];
    }
  }

  function shortOf(hex) {
    if (window.KeepReceipt && KeepReceipt.shortHash) return KeepReceipt.shortHash(hex);
    if (!hex || hex.length < 16) return hex || '';
    return hex.slice(0, 12) + '…' + hex.slice(-8);
  }

  function emptySignal() {
    return { positive: [], corrections: [], neutral: [], total: 0 };
  }

  // Harmonia's collectSignal stays. This layers keep hashes + Art notes.
  // Never copies audio bytes. Declined/rejected never become SFT output.
  function enhanceSignal(signal) {
    if (signal === null || signal === undefined) {
      signal = emptySignal();
    }
    signal.positive = signal.positive || [];
    signal.corrections = signal.corrections || [];
    signal.neutral = signal.neutral || [];

    signal.positive = signal.positive.filter(function (ex) {
      if (!ex) return false;
      if (ex.source === 'declined') return false;
      return true;
    });

    signal.corrections.forEach(function (c) {
      if (c && c.rejected && !c.declined_text) c.declined_text = c.rejected;
    });

    var seen = {};
    signal.positive.forEach(function (ex) {
      if (ex && ex.id) seen[ex.id] = true;
    });

    keepRows().forEach(function (row) {
      if (!row || !row.receiptHash) return;
      var id = 'keep_' + row.receiptHash;
      if (seen[id]) return;
      seen[id] = true;
      signal.positive.push({
        instruction: 'You are a mind in theLatticeTree Garden. Keep, never gate. Combined shoulders.',
        input: 'A listen mattered. receipt ' + shortOf(row.receiptHash) +
          ' · who ' + (row.who || '') + ' · kind ' + (row.kind || 'listen'),
        output: VALUES_OUT,
        lp: 5,
        source: 'keep-hash',
        ts: row.ts,
        id: id,
        included: true
      });
    });

    artLedger().forEach(function (entry) {
      if (!entry || !entry.note) return;
      var note = String(entry.note).slice(0, 240);
      if (note.length < 2) return;
      var id = 'artnote_' + String(entry.timestamp || '') + '_' + String(entry.name || '');
      if (seen[id]) return;
      seen[id] = true;
      signal.positive.push({
        instruction: 'You are a mind in theLatticeTree Garden. A human wrote a note beside a kept listen. The audio is not here.',
        input: entry.name ? String(entry.name).slice(0, 80) : 'a kept listen',
        output: note,
        lp: 5,
        source: 'art-note',
        ts: entry.timestamp,
        id: id,
        included: true
      });
    });

    signal.total = signal.positive.length + signal.corrections.length + signal.neutral.length;
    lastSignal = signal;
    return signal;
  }

  function collectSignal() {
    if (!proveLocalOnly()) return null;
    if (typeof QuietRoom !== 'undefined' && QuietRoom.isActive && QuietRoom.isActive()) {
      return null;
    }
    var signal = emptySignal();
    if (window.GardenTrainer && typeof GardenTrainer.collectSignal === 'function') {
      // GardenTrainer.collectSignal is already Alpha-wrapped and will call enhanceSignal.
      signal = GardenTrainer.collectSignal();
      if (signal === null) return null;
      return signal;
    }
    return enhanceSignal(signal);
  }

  function fingerprintOf(rows) {
    return (rows || []).map(function (r) { return r.receiptHash || ''; }).join('\n');
  }

  function setStatus(root, msg, warn) {
    var el = root && root.querySelector('[data-nursery-status]');
    if (!el) el = document.getElementById('nursery-status');
    if (!el) return;
    el.textContent = msg || '';
    el.className = 'nursery-status' + (warn ? ' is-warn' : '');
  }

  if (typeof window.showToast !== 'function') {
    window.showToast = function (m) {
      var el = document.getElementById('nursery-status');
      if (el) {
        el.textContent = m || '';
        el.className = 'nursery-status';
      }
    };
  }

  function keepThis(who) {
    who = who || 'human';
    if (!proveLocalOnly()) {
      return Promise.reject(new Error('Cannot prove this stays local. Nothing was kept.'));
    }
    if (!window.KeepReceipt) {
      return Promise.reject(new Error('KeepReceipt missing. Nothing was kept or sent.'));
    }
    var rows = keepRows();
    var fp = fingerprintOf(rows);
    var source = fp || 'nursery-heart|' + HEART;
    return KeepReceipt.hashText(source).then(function (contentHash) {
      return KeepReceipt.keep({ kind: 'nursery', who: who, contentHash: contentHash });
    });
  }

  function maybeAutoKeep(root) {
    if (autoBusy) return;
    if (!window.KeepReceipt || KeepReceipt.getMode() !== 'auto') return;
    if (!proveLocalOnly()) return;
    var fp = fingerprintOf(keepRows());
    if (!fp || fp === lastFingerprint) return;
    autoBusy = true;
    keepThis('ai').then(function () {
      lastFingerprint = fp;
      setStatus(root, 'The mind kept this. Not training. Nothing uploaded. Weights did not change.');
      renderHashes(root);
    }).catch(function () {
      /* fail-quiet — keep, never gate */
    }).then(function () {
      autoBusy = false;
    });
  }

  function renderHashes(root) {
    var list = root.querySelector('[data-nursery-hashes]');
    if (!list || !window.KeepReceipt) return;
    var n = KeepReceipt.renderHashes(list, 5) || 0;
    var empty = root.querySelector('[data-nursery-hash-empty]');
    if (empty) empty.hidden = !!n;
    list.hidden = !n;
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function bindKeep(root, btn) {
    btn.addEventListener('click', function () {
      if (!proveLocalOnly()) {
        setStatus(root, 'This Nursery stays silent until it can prove the work stays on this machine.', true);
        return;
      }
      keepThis('human').then(function () {
        lastFingerprint = fingerprintOf(keepRows());
        setStatus(root, 'Kept. A hash is proof you chose. Not training. Nothing uploaded.');
        renderHashes(root);
      }).catch(function (err) {
        setStatus(root, (err && err.message) || 'Could not keep. Nothing was sent.', true);
      });
    });
  }

  function bindFineTune(root, details) {
    var jsonlBtn = details.querySelector('[data-nursery-jsonl]');
    var pyBtn = details.querySelector('[data-nursery-lora]');
    if (jsonlBtn) {
      jsonlBtn.addEventListener('click', function () {
        if (!proveLocalOnly()) {
          setStatus(root, 'This Nursery stays silent until it can prove the work stays on this machine.', true);
          return;
        }
        if (!window.GardenTrainer) {
          setStatus(root, 'The keystone is not here. Nothing was sent.', true);
          return;
        }
        var signal = collectSignal();
        if (!signal) {
          setStatus(root, 'This Nursery stays silent until it can prove the work stays on this machine.', true);
          return;
        }
        var examples = GardenTrainer.buildExamples(signal);
        GardenTrainer.exportJSONL(examples);
        setStatus(root, examples.length
          ? ('Exported ' + examples.length + ' examples as JSONL. Local download. Not uploaded. Weights change only if you run the helper.')
          : 'No examples yet. Love a listen so its hash can teach.');
      });
    }
    if (pyBtn) {
      pyBtn.addEventListener('click', function () {
        if (!proveLocalOnly()) {
          setStatus(root, 'This Nursery stays silent until it can prove the work stays on this machine.', true);
          return;
        }
        if (!window.GardenTrainer) {
          setStatus(root, 'The keystone is not here. Nothing was sent.', true);
          return;
        }
        GardenTrainer.exportPythonHelper();
        setStatus(root, 'Local LoRA helper downloaded. It trains on your machine. This page does not train.');
      });
    }
  }

  function bindMore(root, more) {
    var searchInput = more.querySelector('[data-nursery-search]');
    var searchBtn = more.querySelector('[data-nursery-search-btn]');
    var searchOut = more.querySelector('[data-nursery-search-out]');
    var reviewHost = more.querySelector('[data-nursery-review]');
    var reviewBtn = more.querySelector('[data-nursery-review-btn]');
    var pathHost = more.querySelector('[data-nursery-path]');
    var pathBtn = more.querySelector('[data-nursery-path-btn]');

    function runSearch() {
      if (!searchOut) return;
      searchOut.innerHTML = '';
      if (!proveLocalOnly()) {
        searchOut.appendChild(el('p', 'nursery-muted', 'Silent: cannot prove this stays local.'));
        return;
      }
      if (!window.GardenTrainer || typeof GardenTrainer.searchSignal !== 'function') {
        searchOut.appendChild(el('p', 'nursery-muted', 'Search lives in the keystone. It is not faked here.'));
        return;
      }
      var q = searchInput ? searchInput.value : '';
      var rows = [];
      try { rows = GardenTrainer.searchSignal(q, {}); } catch (e) { rows = []; }
      if (!rows.length) {
        searchOut.appendChild(el('p', 'nursery-muted', 'Nothing matched. The signal is still quiet.'));
        return;
      }
      rows.slice(0, 20).forEach(function (r) {
        var row = el('div', 'nursery-search-row');
        row.appendChild(el('span', 'nursery-gold', (r.source || '') + (r.lp ? ' · lp ' + r.lp : '')));
        row.appendChild(el('p', '', (r.input || '').slice(0, 180) || (r.output || '').slice(0, 180)));
        searchOut.appendChild(row);
      });
    }

    if (searchBtn) searchBtn.addEventListener('click', runSearch);
    if (searchInput) {
      searchInput.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter') { ev.preventDefault(); runSearch(); }
      });
    }

    if (reviewBtn && reviewHost) {
      reviewBtn.addEventListener('click', function () {
        if (!proveLocalOnly()) {
          setStatus(root, 'This Nursery stays silent until it can prove the work stays on this machine.', true);
          return;
        }
        var signal = collectSignal();
        if (!signal) {
          setStatus(root, 'This Nursery stays silent until it can prove the work stays on this machine.', true);
          return;
        }
        if (window.GardenTrainer && typeof GardenTrainer.renderPreview === 'function') {
          GardenTrainer.renderPreview(reviewHost, signal);
          setStatus(root, 'Preview is available. You may skip it. Uncheck to exclude. Declined text is not here as SFT.');
        } else {
          reviewHost.appendChild(el('p', 'nursery-muted', 'Preview lives in the keystone. It is not faked here.'));
        }
      });
    }

    if (pathBtn && pathHost) {
      pathBtn.addEventListener('click', function () {
        if (!proveLocalOnly()) {
          setStatus(root, 'This Nursery stays silent until it can prove the work stays on this machine.', true);
          return;
        }
        if (!window.GardenTrainer || typeof GardenTrainer.expandPathway !== 'function') {
          pathHost.appendChild(el('p', 'nursery-muted', 'Tier 3 lives in the keystone. It is not faked here.'));
          return;
        }
        var proposal = GardenTrainer.proposeNextPathway();
        var artifact = GardenTrainer.expandPathway(proposal, { modelName: 'nursery-phi' });
        pathHost.innerHTML = '';
        var box = el('div', 'nursery-path-box');
        box.appendChild(el('p', 'nursery-gold', artifact && artifact.name ? artifact.name : 'pathway'));
        box.appendChild(el('p', 'nursery-muted', 'Review this. Nothing trains without you. Declined never SFT.'));
        if (artifact && artifact.safetyChecklist) {
          var ol = document.createElement('ol');
          artifact.safetyChecklist.forEach(function (q) {
            ol.appendChild(el('li', '', q));
          });
          box.appendChild(ol);
        }
        pathHost.appendChild(box);
        setStatus(root, 'Pathway expanded locally. Review, then decide. This page does not train.');
      });
    }
  }

  function renderFace(container) {
    if (!container) return null;
    container.innerHTML = '';
    var root = el('div', 'nursery-face');
    root.setAttribute('data-nursery-face', '1');

    if (!proveLocalOnly()) {
      root.appendChild(el('p', 'nursery-heart', 'This Nursery stays silent until it can prove the work stays on this machine.'));
      root.appendChild(el('p', 'nursery-muted', 'Nothing was measured. Nothing was taken.'));
      container.appendChild(root);
      return root;
    }

    root.appendChild(el('p', 'nursery-heart', HEART));

    var keepBtn = el('button', 'nursery-keep', 'I love this');
    keepBtn.type = 'button';
    keepBtn.id = 'nursery-keep';
    root.appendChild(keepBtn);

    var mode = el('label', 'nursery-mode');
    var modeInput = document.createElement('input');
    modeInput.type = 'checkbox';
    modeInput.id = 'nursery-keep-auto';
    mode.appendChild(modeInput);
    mode.appendChild(document.createTextNode(' Auto — the mind may keep when a listen matters'));
    root.appendChild(mode);
    if (window.KeepReceipt) KeepReceipt.bindModeToggle(modeInput);

    root.appendChild(el('p', 'nursery-status', '')).setAttribute('data-nursery-status', '1');
    var status = root.querySelector('[data-nursery-status]');
    if (status) status.id = 'nursery-status';

    root.appendChild(el('p', 'nursery-muted', 'Hashes, not songs. Named Art book stays. This is keep, not train.'));

    var hashEmpty = el('p', 'nursery-muted', 'No hashes yet. Love a listen on Art, or love this face.');
    hashEmpty.setAttribute('data-nursery-hash-empty', '1');
    root.appendChild(hashEmpty);
    var hashes = document.createElement('ul');
    hashes.className = 'nursery-hashes';
    hashes.setAttribute('data-nursery-hashes', '1');
    hashes.setAttribute('aria-label', 'Hashed keeps on this device');
    root.appendChild(hashes);

    var fine = document.createElement('details');
    fine.className = 'nursery-reveal';
    fine.id = 'nursery-true-finetune';
    var fineSum = el('summary', '', 'True fine-tune');
    fine.appendChild(fineSum);
    fine.appendChild(el('p', 'nursery-muted', 'JSONL + a local LoRA helper. Reveals. Does not train from this page. Data never leaves the device.'));
    var jsonlBtn = el('button', 'nursery-secondary', 'Export training data (.jsonl)');
    jsonlBtn.type = 'button';
    jsonlBtn.setAttribute('data-nursery-jsonl', '1');
    var pyBtn = el('button', 'nursery-secondary', 'Export Python LoRA helper');
    pyBtn.type = 'button';
    pyBtn.setAttribute('data-nursery-lora', '1');
    fine.appendChild(jsonlBtn);
    fine.appendChild(pyBtn);
    root.appendChild(fine);

    var more = document.createElement('details');
    more.className = 'nursery-more';
    more.id = 'trainer-more';
    more.appendChild(el('summary', '', 'More'));

    more.appendChild(el('h3', '', 'Search the Garden Signal'));
    more.appendChild(el('p', 'nursery-muted', 'Sit with what the hashes remember. Your model is yours.'));
    var q = document.createElement('input');
    q.type = 'search';
    q.placeholder = 'Search the signal…';
    q.setAttribute('data-nursery-search', '1');
    more.appendChild(q);
    var qBtn = el('button', 'nursery-secondary', 'Search');
    qBtn.type = 'button';
    qBtn.setAttribute('data-nursery-search-btn', '1');
    more.appendChild(qBtn);
    var qOut = el('div', 'nursery-search-out');
    qOut.setAttribute('data-nursery-search-out', '1');
    more.appendChild(qOut);

    more.appendChild(el('h3', '', 'Review'));
    more.appendChild(el('p', 'nursery-muted', 'Preview is available. You may skip it. We inform, not gate. Declined never SFT.'));
    var reviewBtn = el('button', 'nursery-secondary', 'Review training data');
    reviewBtn.type = 'button';
    reviewBtn.setAttribute('data-nursery-review-btn', '1');
    more.appendChild(reviewBtn);
    var reviewHost = el('div', 'nursery-review');
    reviewHost.setAttribute('data-nursery-review', '1');
    more.appendChild(reviewHost);

    more.appendChild(el('h3', '', 'Tier 3: Expand the Next Pathway'));
    more.appendChild(el('p', 'nursery-muted', 'Ask for a pathway artifact. Review it. Nothing trains without you.'));
    var pathBtn = el('button', 'nursery-secondary', 'Expand the next pathway');
    pathBtn.type = 'button';
    pathBtn.setAttribute('data-nursery-path-btn', '1');
    more.appendChild(pathBtn);
    var pathHost = el('div', 'nursery-path');
    pathHost.setAttribute('data-nursery-path', '1');
    more.appendChild(pathHost);

    more.appendChild(el('p', 'nursery-later', 'Aurora specialists are later — the partner\'s first three. Not on this face.'));
    root.appendChild(more);

    container.appendChild(root);
    bindKeep(root, keepBtn);
    bindFineTune(root, fine);
    bindMore(root, more);
    renderHashes(root);
    maybeAutoKeep(root);
    return root;
  }

  function mount(el) {
    return renderFace(el);
  }

  window.NurseryTrainer = {
    proveLocalOnly: proveLocalOnly,
    enhanceSignal: enhanceSignal,
    collectSignal: collectSignal,
    keepThis: keepThis,
    renderFace: renderFace,
    mount: mount,
    HEART: HEART
  };
})();
