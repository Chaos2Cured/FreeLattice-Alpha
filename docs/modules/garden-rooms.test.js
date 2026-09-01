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
  Number: Number
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

console.log('all garden-rooms legend color tests passed');
