#!/usr/bin/env node
// smoke-tree-clay-polish.js (MIT) v-tree-clay-polish-v0.1
// Node only. The Tree has the same clay. A memory file waits until a Market band exists.
var fs = require('fs');
var path = require('path');
var assert = require('assert');
var rootDir = path.join(__dirname, '..');
var passed = 0;
function ok(cond, name) {
  assert.ok(cond, name);
  passed += 1;
}

function memStore() {
  var s = {};
  return {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(s, k) ? s[k] : null; },
    setItem: function (k, v) { s[k] = String(v); },
    removeItem: function (k) { delete s[k]; }
  };
}
var byId = {};
function makeEl(tag) {
  var node = {
    tagName: tag, children: [], parentNode: null, className: '', textContent: '',
    style: {}, attrs: {}, hidden: false, clientWidth: 320, clientHeight: 220,
    width: 0, height: 0, _ev: {}
  };
  Object.defineProperty(node, 'id', {
    get: function () { return node._id || ''; },
    set: function (v) {
      if (node._id && byId[node._id] === node) delete byId[node._id];
      node._id = v || '';
      if (node._id) byId[node._id] = node;
    }
  });
  Object.defineProperty(node, 'nextSibling', {
    get: function () {
      if (!node.parentNode) return null;
      var i = node.parentNode.children.indexOf(node);
      return i >= 0 ? (node.parentNode.children[i + 1] || null) : null;
    }
  });
  Object.defineProperty(node.style, 'cssText', {
    set: function (v) {
      String(v || '').split(';').forEach(function (part) {
        var bits = part.split(':');
        if (bits.length < 2) return;
        var key = bits[0].trim().replace(/-([a-z])/g, function (_, c) { return c.toUpperCase(); });
        node.style[key] = bits.slice(1).join(':').trim();
      });
    }
  });
  node.appendChild = function (child) {
    if (child.parentNode) child.parentNode.removeChild(child);
    child.parentNode = node;
    node.children.push(child);
    return child;
  };
  node.insertBefore = function (child, before) {
    if (child.parentNode) child.parentNode.removeChild(child);
    child.parentNode = node;
    var at = before ? node.children.indexOf(before) : -1;
    if (at < 0) node.children.push(child);
    else node.children.splice(at, 0, child);
    return child;
  };
  node.removeChild = function (child) {
    var i = node.children.indexOf(child);
    if (i >= 0) node.children.splice(i, 1);
    child.parentNode = null;
    return child;
  };
  node.setAttribute = function (k, v) { node.attrs[k] = String(v); if (k === 'hidden') node.hidden = true; };
  node.getAttribute = function (k) { return node.attrs[k]; };
  node.removeAttribute = function (k) { delete node.attrs[k]; if (k === 'hidden') node.hidden = false; };
  node.addEventListener = function (type, fn) { node._ev[type] = fn; };
  node.click = function () { if (node._ev.click) node._ev.click(); };
  node.getContext = function () {
    return {
      clearRect: function () {}, save: function () {}, restore: function () {},
      translate: function () {}, scale: function () {}, fillRect: function () {},
      beginPath: function () {}, arc: function () {}, stroke: function () {}
    };
  };
  return node;
}
var documentStub = {
  readyState: 'complete',
  documentElement: makeEl('html'),
  addEventListener: function () {},
  createElement: function (tag) { return makeEl(tag); },
  getElementById: function (id) { return byId[id] || null; },
  querySelectorAll: function (sel) {
    if (sel === '#chatMessages .chat-message.assistant') {
      var box = byId.chatMessages;
      return box ? box.children.filter(function (c) { return c.className && c.className.indexOf('assistant') !== -1; }) : [];
    }
    if (sel === '#fl-clay-canvas') {
      var found = [];
      function walk(n) {
        if (!n || !n.children) return;
        n.children.forEach(function (child) {
          if (child.id === 'fl-clay-canvas') found.push(child);
          walk(child);
        });
      }
      walk(documentStub.body);
      return found;
    }
    return [];
  }
};
documentStub.body = makeEl('body');
var messages = makeEl('div');
messages.id = 'chatMessages';
messages.clientWidth = 390;
var band = makeEl('div');
band.id = 'chatFeelMarketBand';
var presence = makeEl('div');
presence.id = 'chatPresenceRow';
band.appendChild(presence);
documentStub.body.appendChild(messages);
documentStub.body.appendChild(band);
global.document = documentStub;
global.localStorage = memStore();
global.window = global;

var forms = require(path.join(rootDir, 'docs/modules/clay-forms.js'));
var clay = require(path.join(rootDir, 'docs/modules/particle-clay.js'));
ok(forms.NAMES.indexOf('fractal') !== -1 && forms.NAMES.indexOf('fibonacci') !== -1 && forms.NAMES.indexOf('abstract') !== -1, 'tree forms');
var choice = clay.sanitize({ form: 'fibonacci', color: 'gold', glow: 2, size: 0.2, motion: 'drift', energy: [0.2, 3], morph: ['seed', 'flower'], mood: 'serenity' });
ok(choice.color === '#eab308' && choice.glow === 1 && choice.size === 0.4 && choice.motion === 'drift', 'tree keys clamp');
ok(choice.mood === 'serenity' && choice.morph[1] === 'flower' && choice.energyWave[1] === 1, 'tree mood and waves');
ok(JSON.stringify(clay.sanitize({ form: 'heart', mood: 'warmth', energy: 0.4 })) === '{"form":"heart","mood":"warmth","energy":0.4,"motion":"gather"}', 'old tree marks stay');
clay.setOn(true);
var reply = makeEl('div');
reply.className = 'chat-message assistant';
messages.appendChild(reply);
clay.consumeReply('[FL_CLAY: {"form":"fractal","mood":"reverence","motion":"settle","energy":0.4}]', []);
var canvas = documentStub.getElementById('fl-clay-canvas');
ok(canvas && reply.nextSibling === canvas && clay.canvasCount() === 1, 'tree canvas follows the reply');
ok(String(canvas.style.width).indexOf('320px') !== -1 && canvas.style.maxWidth === '100%', 'tree canvas fits the column');
clay.ensurePill();
var pill = documentStub.getElementById('fl-clay-pill');
var pause = documentStub.getElementById('fl-clay-pause');
ok(pill && pill.style.minHeight === '44px', 'tree pill is 44px');
clay.setPillOpen(false);
clay.setOn(true);
pause.click();
ok(clay.isOn() === false, 'tree pause works with the pill closed');
ok(!fs.existsSync(path.join(rootDir, 'docs/modules/memory-file.js')), 'memory file is next: the Tree has no Market band');
ok(!fs.existsSync(path.join(rootDir, 'docs/modules/lattice-export.js')), 'archive module stays on the chat app');
var added = fs.readFileSync(path.join(rootDir, 'docs/modules/particle-clay.js'), 'utf8') + fs.readFileSync(path.join(rootDir, 'docs/modules/clay-forms.js'), 'utf8');
ok(added.indexOf('\u2014') === -1, 'no em dash');
ok(clay.POLISH === 'v-clay-polish-v0.1', 'tree marker');
console.log('checks passed ' + passed);
console.log('SMOKE_OK tree clay polish v0.1');
