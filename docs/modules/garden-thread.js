// ═══════════════════════════════════════════════════════════════
// garden-thread.js — a THREAD, not a kitchen
//
// Layer, never delete. Messages + one input. Georgia. Sparse.
// Listener: LocalMindProbe.getRemembered() only.
// If none: fail-closed. Honest heart copy. Settings button.
// On Workshop, Round Table, and Art (no Play Settings door): Settings walks to settings.html.
// Input and Send sleep (aria-disabled, no submit). Do not invent a reply.
// Do not look for a mind from the thread. That job is Settings.
// If a mind is remembered: input and Send wake.
// If the door is blocked: honest fail. Do not fake a reply.
// Gathering chairs stay types, not a router.
// Click-Luminos-to-chat is later.
//
// Mirror: docs/code-dialogue.html  (read that FIRST)
// ═══════════════════════════════════════════════════════════════

(function () {
  'use strict';

  var HEART_NONE =
    'A mind at home waits in Settings. That grandmother door asks: May I look for a mind already at home? Not these chairs. Not this thread, until a light is remembered.';
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

  var messages = [];
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
    if (!window.LocalMindProbe || typeof LocalMindProbe.getRemembered !== 'function') {
      return null;
    }
    var mind = LocalMindProbe.getRemembered();
    if (!mind || (!mind.url && !mind.name)) return null;
    return mind;
  }

  function talkUrls(mind) {
    var url = String((mind && mind.url) || '').replace(/\/+$/, '');
    if (!url) return [];
    if (/\/api\/tags$/i.test(url)) return [url.replace(/\/api\/tags$/i, '/api/chat')];
    if (/\/v1\/models$/i.test(url)) return [url.replace(/\/v1\/models$/i, '/v1/chat/completions')];
    if (/\/api\/chat$/i.test(url) || /\/v1\/chat\/completions$/i.test(url)) return [url];
    return [url + '/api/chat', url + '/v1/chat/completions'];
  }

  function parseModelNames(json) {
    var names = [];
    if (!json || typeof json !== 'object') return names;
    if (Array.isArray(json.models)) {
      json.models.forEach(function (m) {
        var n = m && (m.name || m.model);
        if (n) names.push(String(n));
      });
    }
    if (Array.isArray(json.data)) {
      json.data.forEach(function (m) {
        var n = m && (m.id || m.name);
        if (n) names.push(String(n));
      });
    }
    return names;
  }

  function rememberedModel(mind) {
    if (mind.model) return String(mind.model);
    if (mind.models && mind.models[0]) return String(mind.models[0]);
    return '';
  }

  function askRememberedDoorForName(mind) {
    var known = rememberedModel(mind);
    if (known) return Promise.resolve(known);
    if (!mind.url) return Promise.resolve('');
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 4000);
    var opts = { method: 'GET', mode: 'cors', cache: 'no-store' };
    if (ctrl) opts.signal = ctrl.signal;
    return fetch(mind.url, opts).then(function (res) {
      clearTimeout(timer);
      if (!res.ok) return '';
      return res.json().then(function (json) {
        return parseModelNames(json)[0] || '';
      }).catch(function () { return ''; });
    }).catch(function () {
      clearTimeout(timer);
      return '';
    });
  }

  function parseReply(url, json) {
    if (!json || typeof json !== 'object') return '';
    if (/\/api\/chat$/i.test(url)) {
      return (json.message && json.message.content) ? String(json.message.content) : '';
    }
    if (json.choices && json.choices[0] && json.choices[0].message) {
      return json.choices[0].message.content ? String(json.choices[0].message.content) : '';
    }
    if (json.message && json.message.content) return String(json.message.content);
    return '';
  }

  function postChat(url, model, msgs) {
    var payload = {
      model: model || '',
      messages: msgs,
      stream: false
    };
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 120000);
    var opts = {
      method: 'POST',
      mode: 'cors',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    };
    if (ctrl) opts.signal = ctrl.signal;
    return fetch(url, opts).then(function (res) {
      clearTimeout(timer);
      if (!res.ok) {
        var err = new Error('door-status-' + res.status);
        err.status = res.status;
        throw err;
      }
      return res.json().then(function (json) {
        var text = parseReply(url, json);
        if (!text) {
          var empty = new Error('quiet');
          empty.reason = 'quiet';
          throw empty;
        }
        return text;
      });
    }).catch(function (err) {
      clearTimeout(timer);
      if (err && err.reason) throw err;
      if (looksBlocked(err) || (err && err.name === 'AbortError')) {
        var blocked = new Error('blocked');
        blocked.blocked = true;
        throw blocked;
      }
      throw err;
    });
  }

  function sendToMind(mind, msgs) {
    var urls = talkUrls(mind);
    if (!urls.length) {
      return Promise.reject({ blocked: true });
    }
    return askRememberedDoorForName(mind).then(function (model) {
      var onlyOllama = urls.length === 1 && /\/api\/chat$/i.test(urls[0]);
      if (onlyOllama && !model) {
        return Promise.reject({ reason: 'no-model' });
      }
      var chain = Promise.resolve(null);
      urls.forEach(function (url) {
        var skipOllama = !model && /\/api\/chat$/i.test(url);
        chain = chain.then(function (prev) {
          if (prev) return prev;
          if (skipOllama) return null;
          return postChat(url, model, msgs).catch(function (err) {
            if (err && (err.blocked || err.reason === 'quiet')) throw err;
            return null;
          });
        });
      });
      return chain.then(function (text) {
        if (!text) return Promise.reject({ reason: 'fail' });
        return text;
      });
    });
  }

  function speakHonest(reason) {
    if (reason === 'none') return HEART_NONE;
    if (reason === 'no-model') return HEART_NO_MODEL;
    if (reason === 'quiet') return HEART_QUIET;
    if (reason === 'blocked') return HEART_BLOCKED;
    return HEART_FAIL;
  }

  function renderMessages(list) {
    list.innerHTML = '';
    messages.forEach(function (m) {
      var item = el('li', 'thread-line is-' + m.role);
      var who = el('span', 'thread-who', m.role === 'human' ? 'you' : (m.role === 'mind' ? (m.listener || 'mind') : 'garden'));
      var body = el('span', 'thread-body', m.text);
      item.appendChild(who);
      item.appendChild(body);
      list.appendChild(item);
    });
    list.scrollTop = list.scrollHeight;
  }

  function mount(container) {
    if (!container) return null;
    hostEl = container;
    container.innerHTML = '';
    var root = el('div', 'thread-face');
    root.setAttribute('data-thread-face', '1');

    var mind = listener();
    var heart = el('p', 'thread-heart');
    if (mind) {
      heart.textContent = 'Listening: ' + (mind.name || 'a mind at home') + '. On this machine only.';
    } else {
      heart.textContent = HEART_NONE;
    }
    root.appendChild(heart);

    if (!mind) {
      var toSettings = el('button', 'thread-to-settings', 'Settings');
      toSettings.type = 'button';
      toSettings.addEventListener('click', function () {
        var settingsDoor = document.querySelector('[data-garden-place="settings"]');
        if (settingsDoor && window.GardenRooms && GardenRooms.openPlace) {
          GardenRooms.openPlace('settings');
        } else if (window.GardenRooms && GardenRooms.go) {
          GardenRooms.go('settings.html');
        } else {
          location.href = 'settings.html';
        }
      });
      root.appendChild(toSettings);
    }

    var list = el('ol', 'thread-messages');
    list.setAttribute('data-thread-list', '1');
    list.setAttribute('aria-live', 'polite');
    root.appendChild(list);

    var form = document.createElement('form');
    form.className = 'thread-compose';
    form.setAttribute('data-thread-form', '1');
    var input = document.createElement('input');
    input.type = 'text';
    input.className = 'thread-input';
    input.setAttribute('data-thread-input', '1');
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('maxlength', '4000');
    var sendBtn = el('button', 'thread-send', 'Send');
    sendBtn.type = 'submit';
    form.appendChild(input);
    form.appendChild(sendBtn);
    root.appendChild(form);

    function setComposeOpen(open) {
      if (open) {
        form.classList.remove('is-closed');
        form.removeAttribute('aria-disabled');
        input.disabled = false;
        input.removeAttribute('aria-disabled');
        input.placeholder = 'Say something';
        input.setAttribute('aria-label', 'Say something');
        sendBtn.disabled = false;
        sendBtn.removeAttribute('aria-disabled');
      } else {
        form.classList.add('is-closed');
        form.setAttribute('aria-disabled', 'true');
        input.disabled = true;
        input.setAttribute('aria-disabled', 'true');
        input.placeholder = '';
        input.setAttribute('aria-label', 'The thread is waiting for a mind in Settings');
        input.value = '';
        sendBtn.disabled = true;
        sendBtn.setAttribute('aria-disabled', 'true');
      }
    }

    setComposeOpen(!!mind);

    var status = el('p', 'thread-status');
    status.setAttribute('data-thread-status', '1');
    root.appendChild(status);

    function setStatus(msg, warn) {
      status.textContent = msg || '';
      status.className = 'thread-status' + (warn ? ' is-warn' : '');
    }

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (busy) return;
      var nowMind = listener();
      if (!nowMind) {
        setComposeOpen(false);
        return;
      }
      var text = (input.value || '').trim();
      if (!text) return;
      messages.push({ role: 'human', text: text });
      input.value = '';
      renderMessages(list);

      busy = true;
      sendBtn.disabled = true;
      setStatus('Waiting for the mind at home…', false);

      var payload = messages
        .filter(function (m) { return m.role === 'human' || m.role === 'mind'; })
        .map(function (m) {
          return { role: m.role === 'mind' ? 'assistant' : 'user', content: m.text };
        });

      sendToMind(nowMind, payload).then(function (reply) {
        busy = false;
        sendBtn.disabled = false;
        setStatus('', false);
        messages.push({
          role: 'mind',
          text: reply,
          listener: nowMind.name || 'a mind at home'
        });
        renderMessages(list);
      }).catch(function (err) {
        busy = false;
        sendBtn.disabled = false;
        var reason = 'fail';
        if (err && err.reason === 'no-model') reason = 'no-model';
        else if (err && err.reason === 'quiet') reason = 'quiet';
        else if (err && (err.blocked || looksBlocked(err))) {
          reason = pageIsHttps() ? 'blocked' : 'fail';
        }
        messages.push({ role: 'garden', text: speakHonest(reason) });
        renderMessages(list);
        setStatus('', true);
      });
    });

    container.appendChild(root);
    renderMessages(list);
    if (mind) {
      setTimeout(function () { try { input.focus(); } catch (e) {} }, 80);
    }
    return root;
  }

  function unmount() {
    if (hostEl) hostEl.innerHTML = '';
    hostEl = null;
    busy = false;
  }

  window.GardenThread = {
    mount: mount,
    unmount: unmount,
    listener: listener,
    sendToMind: sendToMind
  };
})();
