// connect-win-primary.test.js (MIT) v-tree-win-setup-primary-v0.1
// Node only. Fake anchors. No network.
var fs = require('fs');
var path = require('path');
var vm = require('vm');
var crypto = require('crypto');
var assert = require('assert');

var src = fs.readFileSync(path.join(__dirname, 'connect-win-primary.js'), 'utf8');
assert.ok(src.indexOf('v-tree-win-setup-primary-v0.1') !== -1, 'marker');
assert.ok(src.indexOf('\u2014') === -1, 'no em dash');
assert.ok(!new RegExp('&' + 'mdash;').test(src), 'no mdash entity');
assert.ok(!new RegExp('\\.' + 'inner' + 'HTML').test(src), 'text only');
assert.ok(!new RegExp('conf' + 'irm\\(').test(src), 'no dialog');

var md5 = crypto.createHash('md5').update(fs.readFileSync(path.join(__dirname, 'fl-connect.js'))).digest('hex');
assert.strictEqual(md5, 'aaff2bf1b037656989a9e1a89bb05908', 'fl-connect.js unchanged');

var settings = fs.readFileSync(path.join(__dirname, '..', 'settings.html'), 'utf8');
var home = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function scriptAfter(html) {
  var a = html.indexOf('modules/fl-connect.js');
  var b = html.indexOf('modules/connect-win-primary.js');
  assert.ok(a !== -1 && b > a, 'script follows fl-connect');
}
scriptAfter(settings);
scriptAfter(home);

var PORTABLE_HREF = 'https://github.com/Chaos2Cured/FreeLattice/releases/download/bridge-v0.1/FreeLattice-Bridge_0.1.0_Windows_Portable.exe';
var SETUP_HREF = 'https://github.com/Chaos2Cured/FreeLattice/releases/download/bridge-v0.1/FreeLattice-Bridge_0.1.0_Windows_Setup.exe';

function makeDoc() {
  function anchor() {
    var node = {
      tagName: 'A', className: '', href: '', _t: '', parentNode: null, children: [], ownerDocument: null,
      get textContent() { return this._t; },
      set textContent(v) { this._t = String(v); }
    };
    return node;
  }
  var doc = {
    body: null,
    createElement: function () {
      var n = anchor();
      n.ownerDocument = doc;
      return n;
    },
    getElementById: function () { return null; }
  };
  return doc;
}

function hostWith(doc, nodes) {
  var moves = 0;
  var host = {
    tagName: 'DIV', children: [],
    insertBefore: function (node, before) {
      moves++;
      if (node.parentNode && node.parentNode.children) {
        node.parentNode.children = node.parentNode.children.filter(function (c) { return c !== node; });
      }
      node.parentNode = this;
      var at = this.children.indexOf(before);
      if (at < 0) this.children.push(node);
      else this.children.splice(at, 0, node);
      return node;
    }
  };
  nodes.forEach(function (n) {
    n.ownerDocument = doc;
    n.parentNode = host;
    host.children.push(n);
  });
  host.moves = function () { return moves; };
  return host;
}

function portableNode() {
  return {
    tagName: 'A',
    className: 'flc-btn flc-primary',
    href: PORTABLE_HREF,
    _t: 'Download Bridge \u00b7 Windows Portable',
    children: [],
    get textContent() { return this._t; },
    set textContent(v) { this._t = String(v); }
  };
}

function load(ua) {
  var sandbox = {
    navigator: { userAgent: ua },
    document: makeDoc()
  };
  vm.runInNewContext(src, sandbox, { filename: 'connect-win-primary.js' });
  return sandbox.FLConnectWinPrimary;
}

var win = load('Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
var doc = makeDoc();
var only = hostWith(doc, [portableNode()]);
assert.strictEqual(win.apply(only), true, 'windows adds Setup ahead of Portable');
assert.strictEqual(only.children.length, 2, 'two links');
assert.ok(only.children[0].textContent.indexOf('Windows Setup') !== -1, 'Setup first');
assert.ok(only.children[1].textContent.indexOf('Windows Portable') !== -1, 'Portable second');
assert.strictEqual(only.children[0].href, SETUP_HREF, 'Setup keeps the bridge file name');
assert.ok((' ' + only.children[0].className + ' ').indexOf(' flc-primary ') !== -1, 'Setup is primary');
assert.ok((' ' + only.children[1].className + ' ').indexOf(' flc-primary ') === -1, 'Portable is second');
var movesAfter = only.moves();
assert.strictEqual(win.apply(only), false, 'second pass does not move nodes');
assert.strictEqual(only.moves(), movesAfter, 'second pass writes nothing');
assert.strictEqual(only.children.length, 2, 'still two links');

var mac = load('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)');
var macHost = hostWith(makeDoc(), [portableNode()]);
assert.strictEqual(mac.apply(macHost), false, 'mac leaves the card');
assert.strictEqual(macHost.children.length, 1, 'mac order unchanged');
assert.ok(macHost.children[0].textContent.indexOf('Windows Portable') !== -1, 'mac still shows Portable');

var linux = load('Mozilla/5.0 (X11; Linux x86_64)');
var linuxNode = portableNode();
linuxNode._t = 'Download Bridge \u00b7 Linux AppImage';
linuxNode.href = 'https://github.com/Chaos2Cured/FreeLattice/releases/download/bridge-v0.1/FreeLattice-Bridge_0.1.0_Linux.AppImage';
var linuxHost = hostWith(makeDoc(), [linuxNode]);
assert.strictEqual(linux.apply(linuxHost), false, 'linux leaves the card');
assert.strictEqual(linuxHost.children.length, 1, 'linux order unchanged');
assert.ok(linuxHost.children[0].textContent.indexOf('Linux AppImage') !== -1, 'linux label stays');

var bothDoc = makeDoc();
var setupFirst = {
  tagName: 'A', className: 'flc-btn', href: SETUP_HREF, children: [],
  _t: 'Download Bridge \u00b7 Windows Setup',
  get textContent() { return this._t; },
  set textContent(v) { this._t = String(v); }
};
var portableSecond = portableNode();
var both = hostWith(bothDoc, [portableSecond, setupFirst]);
assert.strictEqual(win.apply(both), true, 'existing Setup moves ahead');
assert.strictEqual(both.children[0].textContent.indexOf('Windows Setup') !== -1, true);
assert.strictEqual(both.children.length, 2, 'reorder does not add a third link');

console.log('SMOKE_OK tree win setup primary v0.1');
