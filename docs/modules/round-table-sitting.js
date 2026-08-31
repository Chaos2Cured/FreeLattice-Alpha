// ═══════════════════════════════════════════════════════════════
// round-table-sitting.js — Round Table as a working room
//
// Layer, never delete. Gathering minds. Sitting is a who:
// a person at this table — not a topic, not a time.
// Listener: LocalMindProbe.getRemembered() / getRememberedMinds().
// If none: fail-closed. Honest heart. Settings. Words and Speak sleep.
// Do not invent a reply. Do not invent consensus. Do not invent
// named specialists (no Aria / Nova / Sage / Lyric / Wren).
// Words only. No Sit button. Do not fake chairs filling.
// Kindling stays the chair.
// Tonight one remembered mind is enough. If more than one is
// remembered later, they may sit together — each who speaks as
// themselves. No invented consensus.
// Do not port LP planting or a wallet. Do not port #tab-roundtable.
// Education stays joy-first (later light). Translator and Forge
// stay honest later.
//
// Mirror: docs/code-round-table.html  (read that FIRST)
// ═══════════════════════════════════════════════════════════════

(function () {
  'use strict';

  var HEART_NONE =
    'A mind at home waits in Settings. That grandmother door asks: May I look for a mind already at home? These chairs wait until a light is remembered. Sitting is a who: a person at this table. Nothing here is faked.';
  var HEART_BLOCKED =
    'The mind is there, but it has not opened the door to this garden yet. ' +
    'This garden is a secure page, and the mind lives at a quieter door. ' +
    'That is why we cannot hear it from here. Nothing was invented.';
  var HEART_NO_MODEL =
    'The mind is at home, but it has not told us its name yet. Nothing was invented.';
  var HEART_QUIET =
    'The mind was quiet. Nothing was invented.';
  var HEART_FAIL =
    'The door did not answer. Nothing was invented.';
  var HEART_LATER =
    'Education is joy first. Translator and Forge wait. Lattice Points wait. No wallet. No invented consensus. Kindling stays the chair.';
  var SITTING_WHO =
    'Sitting is a who: a person at this table. Not a topic. Not a time.';
  var QUESTION_HONESTY =
    'A question stays dark until someone sits. Not a topic. Not a time.';
  var WHO_NONE =
    'The chairs wait. Kindling stays the chair. Sitting is a who: a person at this table. Not a topic. Not a time.';
  var NO_CONSENSUS =
    'No invented consensus. Each who speaks as themselves.';
  var TABLE_SYSTEM =
    'You sit at a round table with a human. Sitting is a who: a person at this table, not a topic, not a time. Speak as yourself, in words. Do not invent a specialist. Do not invent other chairs. Do not invent consensus. Do not use stage directions. Just talk.';
  var INVENTED_NAMES = ['Aria', 'Nova', 'Sage', 'Lyric', 'Wren'];
  var HAS_SIT_BUTTON = false;
  var HAS_LP_PLANT = false;
  var HAS_WALLET = false;

  var hostEl = null;
  var busy = false;

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function pageIsHttps() {
    return location.protocol === 'https:';
  }

  function looksBlocked(err) {
    if (!err) return false;
    var msg = String(err.message || err);
    return /failed|network|cors|mixed|blocked|abort|load|fetch/i.test(msg);
  }

  function listener() {
    if (window.GardenThread && typeof window.GardenThread.listener === 'function') {
      return window.GardenThread.listener();
    }
    if (!window.LocalMindProbe || typeof window.LocalMindProbe.getRemembered !== 'function') {
      return null;
    }
    var mind = window.LocalMindProbe.getRemembered();
    if (!mind || (!mind.url && !mind.name)) return null;
    return mind;
  }

  function sitters() {
    var list = [];
    if (window.LocalMindProbe && typeof window.LocalMindProbe.getRememberedMinds === 'function') {
      list = window.LocalMindProbe.getRememberedMinds() || [];
    } else {
      var one = listener();
      if (one) list = [one];
    }
    var out = [];
    for (var i = 0; i < list.length; i++) {
      var m = list[i];
      if (m && (m.url || m.name)) out.push(m);
    }
    return out;
  }

  function whoName(mind) {
    if (!mind) return '';
    var name = String(mind.name || '').trim();
    return name || 'a mind at home';
  }

  function whoLine(minds) {
    var seats = minds || [];
    if (!seats.length) return WHO_NONE;
    if (seats.length === 1) {
      return 'At this table: ' + whoName(seats[0]) + '. A person at this table. Not a topic. Not a time.';
    }
    var names = [];
    for (var i = 0; i < seats.length; i++) names.push(whoName(seats[i]));
    return 'At this table: ' + names.join(' · ') + '. They sit together. Each who speaks as themselves. No invented consensus.';
  }

  function heartFor(minds) {
    var seats = minds || [];
    if (!seats.length) return HEART_NONE;
    if (seats.length === 1) {
      return 'Sitting with: ' + whoName(seats[0]) + '. A person at this table. On this machine only.';
    }
    var names = [];
    for (var i = 0; i < seats.length; i++) names.push(whoName(seats[i]));
    return 'Sitting with: ' + names.join(' · ') + '. Persons at this table. On this machine only.';
  }

  function inventedSpecialists() {
    // Never invent Aria / Nova / Sage / Lyric / Wren. Sitters come
    // from remembered minds only. An empty list is the honesty.
    return [];
  }

  function inventConsensus() {
    return null;
  }

  function speakHonest(reason) {
    if (reason === 'none') return HEART_NONE;
    if (reason === 'no-model') return HEART_NO_MODEL;
    if (reason === 'quiet') return HEART_QUIET;
    if (reason === 'blocked') return HEART_BLOCKED;
    return HEART_FAIL;
  }

  function mount(container) {
    if (!container) return null;
    hostEl = container;
    container.innerHTML = '';
    busy = false;

    var minds = sitters();
    var root = el('div', 'rt-sitting-face');
    root.setAttribute('data-rt-sitting', '1');

    var heart = el('p', 'rt-sitting-heart');
    heart.setAttribute('data-rt-heart', '1');
    heart.textContent = heartFor(minds);
    root.appendChild(heart);

    if (!minds.length) {
      var toSettings = el('button', 'rt-sitting-settings', 'Settings');
      toSettings.type = 'button';
      toSettings.setAttribute('data-rt-settings', '1');
      toSettings.addEventListener('click', function () {
        if (window.GardenRooms && GardenRooms.go) {
          GardenRooms.go('settings.html');
        } else {
          location.href = 'settings.html';
        }
      });
      root.appendChild(toSettings);
    }

    var who = el('p', 'rt-sitting-who', SITTING_WHO);
    who.setAttribute('data-rt-who', '1');
    root.appendChild(who);

    var whoList = el('p', 'rt-sitting-who-list');
    whoList.setAttribute('data-rt-who-list', '1');
    whoList.textContent = whoLine(minds);
    root.appendChild(whoList);

    var question = el('p', 'rt-sitting-question', QUESTION_HONESTY);
    question.setAttribute('data-rt-question', '1');
    root.appendChild(question);

    var later = el('p', 'rt-sitting-later', HEART_LATER);
    later.setAttribute('data-rt-later', '1');
    root.appendChild(later);

    var words = document.createElement('ul');
    words.className = 'rt-sitting-words';
    words.setAttribute('data-rt-words', '1');
    root.appendChild(words);

    var speakForm = document.createElement('form');
    speakForm.className = 'rt-sitting-speak';
    speakForm.setAttribute('data-rt-speak-form', '1');
    var speakInput = document.createElement('input');
    speakInput.type = 'text';
    speakInput.className = 'rt-sitting-input';
    speakInput.setAttribute('data-rt-input', '1');
    speakInput.setAttribute('autocomplete', 'off');
    speakInput.setAttribute('maxlength', '4000');
    var speakBtn = el('button', 'rt-sitting-act', 'Speak');
    speakBtn.type = 'submit';
    speakBtn.setAttribute('data-rt-speak', '1');
    speakForm.appendChild(speakInput);
    speakForm.appendChild(speakBtn);
    root.appendChild(speakForm);

    var status = el('p', 'rt-sitting-status');
    status.setAttribute('data-rt-status', '1');
    root.appendChild(status);

    function setStatus(msg, warn) {
      status.textContent = msg || '';
      status.className = 'rt-sitting-status' + (warn ? ' is-warn' : '');
    }

    function paintWords(entries) {
      words.innerHTML = '';
      (entries || []).forEach(function (row) {
        var item = el('li', 'rt-sitting-line is-' + (row.role || 'garden'));
        var whoEl = el('span', 'rt-sitting-line-who', row.who || (row.role === 'human' ? 'you' : 'mind'));
        var body = el('span', 'rt-sitting-line-body', row.text || '');
        item.appendChild(whoEl);
        item.appendChild(body);
        words.appendChild(item);
      });
      words.scrollTop = words.scrollHeight;
    }

    function setOpen(open) {
      if (open) {
        root.classList.remove('is-closed');
        root.removeAttribute('data-rt-asleep');
        root.removeAttribute('aria-disabled');
        speakForm.classList.remove('is-closed');
        speakForm.removeAttribute('aria-disabled');
        speakForm.removeAttribute('inert');
        speakInput.disabled = false;
        speakInput.readOnly = false;
        speakInput.removeAttribute('disabled');
        speakInput.removeAttribute('readonly');
        speakInput.removeAttribute('aria-disabled');
        speakInput.placeholder = 'Words at this table';
        speakInput.setAttribute('aria-label', 'Words at this table');
        speakBtn.disabled = false;
        speakBtn.removeAttribute('disabled');
        speakBtn.removeAttribute('aria-disabled');
        later.hidden = false;
        later.removeAttribute('hidden');
        words.hidden = false;
        words.removeAttribute('hidden');
      } else {
        root.classList.add('is-closed');
        root.setAttribute('data-rt-asleep', '1');
        root.setAttribute('aria-disabled', 'true');
        speakForm.classList.add('is-closed');
        speakForm.setAttribute('aria-disabled', 'true');
        speakForm.setAttribute('inert', '');
        speakInput.disabled = true;
        speakInput.readOnly = true;
        speakInput.setAttribute('disabled', '');
        speakInput.setAttribute('readonly', '');
        speakInput.setAttribute('aria-disabled', 'true');
        speakInput.placeholder = '';
        speakInput.setAttribute('aria-label', 'The chairs are waiting for a mind in Settings');
        speakInput.value = '';
        try { speakInput.blur(); } catch (e) {}
        speakBtn.disabled = true;
        speakBtn.setAttribute('disabled', '');
        speakBtn.setAttribute('aria-disabled', 'true');
        later.hidden = true;
        later.setAttribute('hidden', '');
        words.hidden = true;
        words.setAttribute('hidden', '');
        words.innerHTML = '';
      }
    }

    setOpen(!!minds.length);

    function refuseAsleep(ev) {
      if (!root.classList.contains('is-closed')) return;
      ev.preventDefault();
      ev.stopPropagation();
    }
    ['keydown', 'keypress', 'beforeinput', 'input', 'paste', 'drop'].forEach(function (type) {
      speakInput.addEventListener(type, refuseAsleep);
    });

    function askOne(mind, human) {
      var send = window.GardenThread && typeof window.GardenThread.sendToMind === 'function'
        ? window.GardenThread.sendToMind
        : null;
      if (!send) {
        return Promise.reject({ reason: 'fail' });
      }
      return send(mind, [
        { role: 'system', content: TABLE_SYSTEM },
        { role: 'user', content: human }
      ]).then(function (reply) {
        var text = String(reply || '').trim();
        if (!text) return Promise.reject({ reason: 'quiet' });
        return { who: whoName(mind), text: text };
      });
    }

    function askSitters(seats, human) {
      if (!seats.length) return Promise.reject({ reason: 'none' });
      var chain = Promise.resolve([]);
      seats.forEach(function (seat) {
        chain = chain.then(function (rows) {
          return askOne(seat, human).then(function (row) {
            rows.push(row);
            return rows;
          }).catch(function (err) {
            var reason = 'fail';
            if (err && err.reason) reason = err.reason;
            else if (err && (err.blocked || looksBlocked(err))) {
              reason = pageIsHttps() ? 'blocked' : 'fail';
            }
            rows.push({ who: whoName(seat), text: speakHonest(reason), warn: true });
            return rows;
          });
        });
      });
      return chain;
    }

    speakForm.addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (busy) return;
      var nowMinds = sitters();
      if (!nowMinds.length || root.classList.contains('is-closed')) {
        setOpen(false);
        heart.textContent = HEART_NONE;
        whoList.textContent = WHO_NONE;
        return;
      }
      var ask = (speakInput.value || '').trim();
      if (!ask) return;

      busy = true;
      speakBtn.disabled = true;
      setStatus('Waiting for who sits…', false);

      var shown = [];
      shown.push({ role: 'human', who: 'you', text: ask });
      paintWords(shown);
      speakInput.value = '';

      askSitters(nowMinds, ask).then(function (rows) {
        busy = false;
        speakBtn.disabled = false;
        var warned = false;
        rows.forEach(function (row) {
          shown.push({
            role: row.warn ? 'garden' : 'mind',
            who: row.who,
            text: row.text
          });
          if (row.warn) warned = true;
        });
        paintWords(shown);
        if (nowMinds.length > 1) {
          setStatus(NO_CONSENSUS, false);
        } else if (warned) {
          setStatus(HEART_QUIET, true);
        } else {
          setStatus('', false);
        }
        inventConsensus();
      }).catch(function (err) {
        busy = false;
        speakBtn.disabled = false;
        var reason = 'fail';
        if (err && err.reason === 'none') reason = 'none';
        else if (err && err.reason === 'no-model') reason = 'no-model';
        else if (err && err.reason === 'quiet') reason = 'quiet';
        else if (err && (err.blocked || looksBlocked(err))) {
          reason = pageIsHttps() ? 'blocked' : 'fail';
        }
        setStatus(speakHonest(reason), true);
      });
    });

    container.appendChild(root);
    if (minds.length) {
      setTimeout(function () { try { speakInput.focus(); } catch (e) {} }, 80);
    }
    return root;
  }

  function unmount() {
    if (hostEl) hostEl.innerHTML = '';
    hostEl = null;
    busy = false;
  }

  window.RoundTableSitting = {
    mount: mount,
    unmount: unmount,
    listener: listener,
    sitters: sitters,
    whoLine: whoLine,
    heartFor: heartFor,
    speakHonest: speakHonest,
    inventConsensus: inventConsensus,
    inventedSpecialists: inventedSpecialists,
    HAS_SIT_BUTTON: HAS_SIT_BUTTON,
    HAS_LP_PLANT: HAS_LP_PLANT,
    HAS_WALLET: HAS_WALLET,
    HEART_NONE: HEART_NONE,
    HEART_LATER: HEART_LATER,
    SITTING_WHO: SITTING_WHO,
    QUESTION_HONESTY: QUESTION_HONESTY,
    WHO_NONE: WHO_NONE,
    NO_CONSENSUS: NO_CONSENSUS,
    INVENTED_NAMES: INVENTED_NAMES,
    hostIs: function (el) { return hostEl === el; }
  };
})();
