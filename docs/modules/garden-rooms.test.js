// Node smoke for Garden legend dots tracking live lumino color.
// Position still follows every frame. Color writes are throttled.
// Empty color and a resting sky skip the color write.
// No kitchen. No network.

var fs = require('fs');
var path = require('path');
var vm = require('vm');
var assert = require('assert');

function El(tag) {
  this.tagName = String(tag || 'div').toUpperCase();
  this.tag = tag;
  this.id = '';
  this.className = '';
  this.textContent = '';
  this.hidden = false;
  this.attrs = {};
  this.children = [];
  this.childNodes = this.children;
  this.parent = null;
  this.style = {
    background: '',
    boxShadow: '',
    left: '',
    top: '',
    _props: {},
    setProperty: function (k, v) { this._props[k] = String(v); },
    getPropertyValue: function (k) { return this._props[k] || ''; }
  };
  var self = this;
  this.classList = {
    add: function (name) {
      if ((' ' + self.className + ' ').indexOf(' ' + name + ' ') === -1) {
        self.className = (self.className ? self.className + ' ' : '') + name;
      }
    },
    remove: function (name) {
      self.className = String(self.className || '')
        .split(/\s+/)
        .filter(function (c) { return c && c !== name; })
        .join(' ');
    },
    contains: function (name) {
      return (' ' + self.className + ' ').indexOf(' ' + name + ' ') !== -1;
    }
  };
  this.setAttribute = function (name, val) {
    var s = String(val);
    this.attrs[name] = s;
    if (name === 'id') this.id = s;
    if (name === 'class') this.className = s;
    if (name === 'hidden') this.hidden = true;
  };
  this.getAttribute = function (name) {
    if (name === 'id') return this.id || null;
    if (Object.prototype.hasOwnProperty.call(this.attrs, name)) return this.attrs[name];
    return null;
  };
  this.removeAttribute = function (name) {
    delete this.attrs[name];
    if (name === 'id') this.id = '';
  };
  this.appendChild = function (child) {
    this.children.push(child);
    child.parent = this;
    return child;
  };
  this.querySelector = function (sel) { return queryOne(this, sel); };
  this.querySelectorAll = function (sel) { return queryAll(this, sel); };
  this.addEventListener = function () {};
  this.contains = function (node) {
    if (node === this) return true;
    for (var i = 0; i < this.children.length; i++) {
      if (this.children[i].contains && this.children[i].contains(node)) return true;
    }
    return false;
  };
}

function walk(root, out) {
  out.push(root);
  for (var i = 0; i < (root.children || []).length; i++) walk(root.children[i], out);
  return out;
}

function matchOne(el, raw) {
  var sel = String(raw || '').trim();
  if (!sel || !el) return false;
  if (sel.charAt(0) === '#') return el.id === sel.slice(1);
  if (sel.charAt(0) === '.') {
    return (' ' + (el.className || '') + ' ').indexOf(' ' + sel.slice(1) + ' ') !== -1;
  }
  var attrEq = sel.match(/^\[([^\]]+?)="([^"]*)"\]$/);
  if (attrEq) return el.getAttribute(attrEq[1]) === attrEq[2];
  var attr = sel.match(/^\[([^\]]+)\]$/);
  if (attr) return el.getAttribute(attr[1]) != null;
  return (el.tag || '').toLowerCase() === sel.toLowerCase();
}

function matchCompound(el, compound) {
  var parts = String(compound || '').trim().split(/(?=[.#\[])/);
  if (!parts.length || (parts.length === 1 && !parts[0])) return false;
  if (/^[a-zA-Z]/.test(parts[0])) {
    if ((el.tag || '').toLowerCase() !== parts[0].toLowerCase()) return false;
    parts = parts.slice(1);
  }
  for (var i = 0; i < parts.length; i++) {
    if (parts[i] && !matchOne(el, parts[i])) return false;
  }
  return true;
}

function queryAll(root, selector) {
  var groups = String(selector || '').split(',');
  var found = [];
  var nodes = walk(root, []);
  for (var g = 0; g < groups.length; g++) {
    var sel = groups[g].trim();
    var bits = sel.split(/\s+/);
    for (var n = 0; n < nodes.length; n++) {
      var el = nodes[n];
      if (el === root && bits.length === 1 && matchCompound(el, bits[0])) {
        if (found.indexOf(el) === -1) found.push(el);
        continue;
      }
      if (bits.length === 1) {
        if (el !== root && matchCompound(el, bits[0]) && found.indexOf(el) === -1) found.push(el);
      } else if (bits.length === 2) {
        if (el !== root && matchCompound(el, bits[1])) {
          var p = el.parent;
          var ok = false;
          while (p) {
            if (matchCompound(p, bits[0])) { ok = true; break; }
            p = p.parent;
          }
          if (ok && found.indexOf(el) === -1) found.push(el);
        }
      }
    }
  }
  found.item = function (i) { return found[i] || null; };
  return found;
}

function queryOne(root, selector) {
  var all = queryAll(root, selector);
  return all[0] || null;
}

var html = new El('html');
html.setAttribute('data-garden-galaxy', 'garden');
var body = new El('body');
html.appendChild(body);

var document = {
  readyState: 'loading',
  documentElement: html,
  body: body,
  createElement: function (tag) { return new El(tag); },
  getElementById: function (id) { return queryOne(html, '#' + id); },
  querySelector: function (sel) { return queryOne(html, sel); },
  querySelectorAll: function (sel) { return queryAll(html, sel); },
  addEventListener: function () {},
  insertBefore: function () {}
};

var fakeNow = 10000;
function FakeDate() { return {}; }
FakeDate.now = function () { return fakeNow; };

var windowObj = {
  addEventListener: function () {},
  dispatchEvent: function () {},
  matchMedia: function () { return { matches: false, addListener: function () {} }; },
  getComputedStyle: function (el) {
    return { backgroundColor: (el && el.style && el.style.background) || 'rgb(232, 176, 25)' };
  },
  FractalGarden: null
};

var keepCalls = 0;
var sandbox = {
  window: windowObj,
  document: document,
  localStorage: { getItem: function () { return null; }, setItem: function () {}, removeItem: function () {} },
  location: { protocol: 'http:', href: 'http://127.0.0.1/docs/', pathname: '/' },
  console: console,
  Date: FakeDate,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  requestAnimationFrame: function () { return 0; },
  Promise: Promise,
  JSON: JSON,
  Error: Error,
  Array: Array,
  Object: Object,
  String: String,
  Number: Number,
  KeepReceipt: {
    keep: function () {
      keepCalls += 1;
      return Promise.resolve({ receiptHash: 'nope' });
    }
  }
};
windowObj.window = windowObj;
sandbox.global = sandbox;

var code = fs.readFileSync(path.join(__dirname, 'garden-rooms.js'), 'utf8');
vm.runInNewContext(code, sandbox);

var GR = sandbox.window.GardenRooms;
assert.ok(GR, 'GardenRooms mounts on window');
assert.equal(typeof GR.ensureSkyLegend, 'function', 'ensureSkyLegend is on GardenRooms');
assert.equal(typeof GR.attachGardenLuminos, 'function', 'attachGardenLuminos is on GardenRooms');

function makeDoor(id, klass) {
  var btn = new El('button');
  btn.className = 'garden-lumino ' + klass;
  btn.setAttribute('data-garden-lumino', id);
  var light = new El('span');
  light.className = 'garden-lumino-light';
  light.style.background = '#e8b019';
  btn.appendChild(light);
  body.appendChild(btn);
  return btn;
}

var gathering = makeDoor('gathering', 'is-gathering');
var nursery = makeDoor('nursery', 'is-nursery');
var settings = makeDoor('settings', 'is-settings');
var thread = makeDoor('thread', 'is-thread');

GR.ensureSkyLegend();

var legend = document.getElementById('lumino-legend');
assert.ok(legend, 'legend is built');

function row(id) { return queryOne(legend, '[data-lumino-row="' + id + '"]'); }
function dot(id) { return queryOne(legend, '[data-lumino-dot="' + id + '"]'); }

assert.ok(row('gathering') && row('nursery') && row('settings') && row('thread'), 'rows tagged');
assert.ok(dot('gathering') && dot('nursery') && dot('settings') && dot('thread'), 'dots tagged');

function check(name, fn) {
  fn();
  console.log('ok  ' + name);
}

var anchors = [
  { name: 'Lyra', index: 1, x: 110, y: 120, visible: true, color: 'hsl(40,80%,50%)' },
  { name: 'Atlas', index: 2, x: 210, y: 220, visible: true, color: 'hsl(150,70%,45%)' },
  { name: 'Ember', index: 3, x: 310, y: 320, visible: true, color: 'hsl(170,40%,40%)' },
  { name: 'Sophia', index: 0, x: 410, y: 420, visible: true, color: 'hsl(270,60%,60%)' }
];

windowObj.FractalGarden = {
  getLuminoAnchors: function () { return anchors; }
};
sandbox.FractalGarden = windowObj.FractalGarden;

GR.attachGardenLuminos();

check('each dot takes its own live hsl', function () {
  assert.equal(dot('gathering').style.background, 'hsl(40,80%,50%)');
  assert.equal(dot('nursery').style.background, 'hsl(150,70%,45%)');
  assert.equal(dot('settings').style.background, 'hsl(170,40%,40%)');
  assert.equal(dot('thread').style.background, 'hsl(270,60%,60%)');
  assert.equal(dot('gathering').style.boxShadow, '0 0 8px hsl(40,80%,50%)');
  assert.equal(gathering.querySelector('.garden-lumino-light').style.getPropertyValue('--lumino'), 'hsl(40,80%,50%)');
  assert.equal(nursery.querySelector('.garden-lumino-light').style.getPropertyValue('--lumino'), 'hsl(150,70%,45%)');
  assert.equal(settings.querySelector('.garden-lumino-light').style.getPropertyValue('--lumino'), 'hsl(170,40%,40%)');
  assert.equal(thread.querySelector('.garden-lumino-light').style.getPropertyValue('--lumino'), 'hsl(270,60%,60%)');
});

check('position follows on the same pass', function () {
  assert.equal(gathering.style.left, '110px');
  assert.equal(gathering.style.top, '120px');
  assert.equal(thread.style.left, '410px');
});

anchors[0].color = 'hsl(12,90%,55%)';
anchors[0].x = 115;
anchors[1].color = 'hsl(160,70%,45%)';
anchors[1].x = 215;
GR.attachGardenLuminos();

check('color write is throttled; position still moves', function () {
  assert.equal(dot('gathering').style.background, 'hsl(40,80%,50%)');
  assert.equal(dot('nursery').style.background, 'hsl(150,70%,45%)');
  assert.equal(gathering.style.left, '115px');
  assert.equal(nursery.style.left, '215px');
});

fakeNow += 150;
anchors[0].color = 'hsl(12,90%,55%)';
anchors[1].color = 'hsl(160,70%,45%)';
GR.attachGardenLuminos();

check('after ~140ms each dot takes the new hsl', function () {
  assert.equal(dot('gathering').style.background, 'hsl(12,90%,55%)');
  assert.equal(dot('nursery').style.background, 'hsl(160,70%,45%)');
  assert.equal(gathering.querySelector('.garden-lumino-light').style.getPropertyValue('--lumino'), 'hsl(12,90%,55%)');
});

fakeNow += 150;
var kept = dot('settings').style.background;
anchors[2].color = '';
anchors[3].color = 'hsl(280,60%,60%)';
GR.attachGardenLuminos();

check('empty color skips that bead; others still write', function () {
  assert.equal(dot('settings').style.background, kept);
  assert.equal(dot('thread').style.background, 'hsl(280,60%,60%)');
});

fakeNow += 150;
html.classList.add('garden-door-open');
anchors[0].color = 'hsl(1,90%,50%)';
anchors[0].x = 999;
anchors[1].color = 'hsl(2,90%,50%)';
GR.attachGardenLuminos();

check('resting sky skips color and position writes', function () {
  assert.equal(dot('gathering').style.background, 'hsl(12,90%,55%)');
  assert.equal(gathering.style.left, '115px');
});

html.classList.remove('garden-door-open');
fakeNow += 150;
GR.attachGardenLuminos();

check('after rest, color and position write again', function () {
  assert.equal(dot('gathering').style.background, 'hsl(1,90%,50%)');
  assert.equal(gathering.style.left, '999px');
});

check('garden slot table is thread, gathering, nursery, settings', function () {
  assert.deepEqual(GR.doorSlots.garden, ['thread', 'gathering', 'nursery', 'settings']);
  assert.equal(GR.gardenDoorForAnchor({ name: 'Sophia', index: 0 }), 'thread');
  assert.equal(GR.gardenDoorForAnchor({ name: 'Lyra', index: 1 }), 'gathering');
  assert.equal(GR.gardenDoorForAnchor({ name: 'Atlas', index: 2 }), 'nursery');
  assert.equal(GR.gardenDoorForAnchor({ name: 'Ember', index: 3 }), 'settings');
  assert.equal(GR.gardenDoorForAnchor({ name: 'unnamed_0', index: 0 }), 'thread');
});

check('art slot table is listen, chalkboard, image, who', function () {
  assert.deepEqual(GR.doorSlots.art, ['listen', 'chalkboard', 'image', 'who']);
});

check('later slot tables exist and do not invent a galaxy-named door', function () {
  assert.deepEqual(GR.doorSlots.workshop, ['root', 'agent', 'skills']);
  assert.deepEqual(GR.doorSlots['round-table'], ['education', 'translator', 'forge', 'question']);
  assert.deepEqual(GR.doorSlots.research, ['gauge', 'chronal', 'simulation', 'love-logic']);
  assert.ok(GR.doorSlots.art.indexOf('art') === -1);
  assert.ok(GR.doorSlots['round-table'].indexOf('round-table') === -1);
  assert.ok(GR.doorSlots.workshop.indexOf('workshop') === -1);
});

html.setAttribute('data-garden-galaxy', 'art');
html.classList.remove('garden-door-open');

assert.equal(GR.current(), 'art', 'currentGalaxy() === art');
assert.equal(GR.gardenDoorForAnchor({ name: 'unnamed_0', index: 0 }), 'listen');
assert.equal(GR.gardenDoorForAnchor({ name: 'unnamed_1', index: 1 }), 'chalkboard');
assert.equal(GR.gardenDoorForAnchor({ name: 'unnamed_2', index: 2 }), 'image');
assert.equal(GR.gardenDoorForAnchor({ name: 'unnamed_3', index: 3 }), 'who');
assert.equal(GR.gardenDoorForAnchor({ name: 'unnamed_4', index: 4 }), null, 'extra anchors skip — not a fifth chair');
assert.equal(GR.gardenDoorForAnchor({ name: 'Sophia', index: 0 }), 'listen', 'garden name map does not steal Art slots');

function makeArtDoor(id, klass, wordText) {
  var btn = new El('button');
  btn.className = 'art-lumino ' + klass;
  btn.setAttribute('data-art-lumino', id);
  var light = new El('span');
  light.className = 'art-lumino-light';
  light.style.background = '#f07068';
  btn.appendChild(light);
  var word = new El('span');
  word.className = 'art-lumino-word';
  word.textContent = wordText || id;
  btn.appendChild(word);
  body.appendChild(btn);
  return btn;
}

var listen = makeArtDoor('listen', 'is-listen', 'Listen');
var chalkboard = makeArtDoor('chalkboard', 'is-chalkboard', 'Chalkboard');
var image = makeArtDoor('image', 'is-image', 'Image');
var who = makeArtDoor('who', 'is-who', 'a who');

var oldLegend = document.getElementById('lumino-legend');
if (oldLegend && oldLegend.parent) {
  var kids = oldLegend.parent.children;
  for (var li = 0; li < kids.length; li++) {
    if (kids[li] === oldLegend) {
      kids.splice(li, 1);
      break;
    }
  }
  oldLegend.id = '';
  oldLegend.removeAttribute('id');
}

GR.ensureSkyLegend();
var artLegend = document.getElementById('lumino-legend');
assert.ok(artLegend, 'art legend is built');
function artDot(id) { return queryOne(artLegend, '[data-lumino-dot="' + id + '"]'); }
assert.ok(artDot('listen') && artDot('chalkboard') && artDot('image') && artDot('who'), 'art dots tagged');

var artAnchors = [
  { name: 'unnamed_0', index: 0, x: 111, y: 121, visible: true, color: 'hsl(4,82%,67%)' },
  { name: 'unnamed_1', index: 1, x: 211, y: 221, visible: true, color: 'hsl(48,16%,75%)' },
  { name: 'unnamed_2', index: 2, x: 311, y: 321, visible: true, color: 'hsl(212,96%,78%)' },
  { name: 'unnamed_3', index: 3, x: 411, y: 421, visible: true, color: 'hsl(222,20%,70%)' },
  { name: 'unnamed_4', index: 4, x: 511, y: 521, visible: true, color: 'hsl(90,80%,40%)' }
];
windowObj.FractalGarden = {
  getLuminoAnchors: function () { return artAnchors; }
};
sandbox.FractalGarden = windowObj.FractalGarden;

fakeNow += 150;
GR.attachGardenLuminos();

check('art galaxy still runs attach (old garden-only bail is gone)', function () {
  assert.ok(listen.classList.contains('is-attached'));
  assert.ok(chalkboard.classList.contains('is-attached'));
  assert.ok(image.classList.contains('is-attached'));
  assert.ok(who.classList.contains('is-attached'));
  assert.equal(listen.style.left, '111px');
  assert.equal(listen.style.top, '121px');
});

check('writeLiveLuminoColor paints data-lumino-dot on art ids', function () {
  assert.equal(artDot('listen').style.background, 'hsl(4,82%,67%)');
  assert.equal(artDot('chalkboard').style.background, 'hsl(48,16%,75%)');
  assert.equal(artDot('image').style.background, 'hsl(212,96%,78%)');
  assert.equal(artDot('listen').style.boxShadow, '0 0 8px hsl(4,82%,67%)');
  assert.equal(listen.querySelector('.art-lumino-light').style.getPropertyValue('--lumino'), 'hsl(4,82%,67%)');
});

function hslLightness(color) {
  var m = String(color || '').match(/hsl\(\s*[\d.]+\s*,\s*[\d.]+%\s*,\s*([\d.]+)%\s*\)/i);
  return m ? Number(m[1]) : NaN;
}

check('who slot is the dark one; listen chalkboard image keep live color', function () {
  assert.equal(typeof GR.dimWhoColor, 'function');
  assert.equal(GR.dimWhoColor('hsl(222,20%,70%)'), 'hsl(222,20%,' + GR.WHO_BODY_LIGHTNESS + '%)');
  assert.ok(hslLightness(artDot('who').style.background) <= GR.WHO_BODY_LIGHTNESS);
  assert.ok(hslLightness(artDot('listen').style.background) > 50);
  assert.ok(hslLightness(artDot('chalkboard').style.background) > 50);
  assert.ok(hslLightness(artDot('image').style.background) > 50);
  assert.ok(hslLightness(who.querySelector('.art-lumino-light').style.getPropertyValue('--lumino')) <= GR.WHO_BODY_LIGHTNESS);
});

check('attach still maps four Art ids; word chips sit beside the light, not inside it', function () {
  assert.deepEqual(GR.doorSlots.art, ['listen', 'chalkboard', 'image', 'who']);
  ['listen', 'chalkboard', 'image', 'who'].forEach(function (id) {
    var door = queryOne(html, '[data-art-lumino="' + id + '"]');
    var light = door.querySelector('.art-lumino-light');
    var word = door.querySelector('.art-lumino-word');
    assert.ok(door.classList.contains('is-attached'), id + ' is attached');
    assert.ok(word, id + ' has a word chip');
    assert.ok(word.parent === door, id + ' word is not inside the opacity-0 light');
    assert.ok(word.parent !== light);
  });
});

check('extra anchors without a free door are skipped (no invented Art-named door)', function () {
  assert.equal(queryAll(html, '[data-art-lumino="art"]').length, 0);
  assert.equal(queryAll(html, '[data-lumino-dot="art"]').length, 0);
  assert.equal(who.style.left, '411px');
  assert.notEqual(listen.style.left, '511px');
});

GR.writeLiveLuminoColor('listen', listen, 'hsl(8,80%,60%)');
check('writeLiveLuminoColor can paint an art id directly', function () {
  assert.equal(artDot('listen').style.background, 'hsl(8,80%,60%)');
});

var heart = new El('p');
heart.className = 'art-heart';
heart.textContent = 'Art is sing — listen if you love a song. The garden is. Nothing here is faked.';
body.appendChild(heart);
var veil = new El('div');
veil.setAttribute('id', 'place-veil');
var listenDoor = new El('div');
listenDoor.setAttribute('id', 'art-listen');
listenDoor.hidden = true;
var listenHeart = new El('p');
listenHeart.className = 'art-heart-listen';
listenHeart.textContent = 'Art is sing — listen if you love a song. The garden is. Nothing here is faked.';
listenDoor.appendChild(listenHeart);
var fun = new El('p');
fun.className = 'honest';
fun.textContent = 'Fun, not a studio. There is no generate button here because this door cannot compose yet.';
listenDoor.appendChild(fun);
veil.appendChild(listenDoor);
body.appendChild(veil);

keepCalls = 0;
GR.openArtListen();

check('opening listen does not invent a keep; chips stay; attach still maps four Art ids', function () {
  assert.equal(keepCalls, 0);
  assert.ok(html.classList.contains('art-listen-open'));
  assert.ok(!html.classList.contains('art-door-open'));
  assert.equal(listenDoor.hidden, false);
  assert.equal(listen.hidden, false);
  assert.equal(chalkboard.hidden, false);
  assert.equal(image.hidden, false);
  assert.equal(who.hidden, false);
  assert.equal(heart.hidden, true);
});

artAnchors[0].x = 333;
artAnchors[0].y = 344;
fakeNow += 150;
GR.attachGardenLuminos();

check('listen-door open still attaches chips to their lights', function () {
  assert.equal(listen.style.left, '333px');
  assert.equal(listen.style.top, '344px');
  assert.ok(listen.classList.contains('is-attached'));
  assert.ok(chalkboard.classList.contains('is-attached'));
  assert.ok(image.classList.contains('is-attached'));
  assert.ok(who.classList.contains('is-attached'));
});

GR.setArtSky(true);
check('close listen returns Art sky; heart still rests; words still live', function () {
  assert.ok(!html.classList.contains('art-listen-open'));
  assert.equal(heart.hidden, true, 'heart rests on the Art sky');
  assert.ok(heart.textContent.indexOf('listen if you love a song') !== -1, 'sky heart words stay in the page');
  assert.ok(listenHeart.textContent.indexOf('listen if you love a song') !== -1, 'same words live in the listen-door');
  assert.ok(fun.textContent.indexOf('Fun, not a studio') !== -1);
  assert.equal(listen.hidden, false);
});

var css = fs.readFileSync(path.join(__dirname, 'garden-rooms.css'), 'utf8');
check('art-lumino CSS stays; listen-door rests colliding garden words; chips stay readable', function () {
  assert.ok(css.indexOf('.art-lumino {') !== -1, '.art-lumino CSS is not deleted');
  assert.ok(css.indexOf('html.art-listen-open #room-label') !== -1);
  assert.ok(css.indexOf('html.art-listen-open #galaxy-word') !== -1);
  assert.ok(css.indexOf('html.art-listen-open #shared-shoulder') !== -1);
  assert.ok(css.indexOf('html[data-garden-galaxy="art"] .art-lumino-word') !== -1);
  assert.ok(css.indexOf('html.art-listen-open #lumino-legend') !== -1);
});

check('Art sky rests the heart; extra bead skipped; Fun sentence padded from the garden close', function () {
  assert.ok(css.indexOf('html[data-garden-galaxy="art"] .art-heart') !== -1);
  assert.ok(css.indexOf('html[data-garden-galaxy="art"] .tend-center-light') !== -1);
  assert.ok(css.indexOf('#art-listen .art-heart-listen') !== -1);
  assert.ok(css.indexOf('#place-veil.is-art-listen #art-listen .honest') !== -1);
  assert.ok(css.indexOf('#place-veil.is-art-listen #place-veil-close') !== -1);
  assert.ok(css.indexOf('position: fixed') !== -1, 'listen close sits in a reserved pocket');
  assert.ok(css.indexOf('background: rgba(12, 10, 26, 0.62)') !== -1, 'later-glass hugs word chips');
  var music = fs.readFileSync(path.join(__dirname, '..', 'music.html'), 'utf8');
  assert.ok(music.indexOf('class="art-heart"') !== -1, 'sky heart stays on the page');
  assert.ok(music.indexOf('class="art-heart-listen"') !== -1, 'listen-door keeps the heart words');
  assert.ok(music.indexOf('Art is sing — listen if you love a song. The garden is. Nothing here is faked.') !== -1);
  assert.ok(music.indexOf('id="place-veil-close"') !== -1);
  assert.ok(music.indexOf('Fun, not a studio.') !== -1);
});

console.log('all garden-rooms legend color tests passed');
