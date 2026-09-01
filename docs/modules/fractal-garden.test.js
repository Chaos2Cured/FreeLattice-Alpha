// Node smoke for FractalGarden hue parameterization.
// init() with no second arg keeps Garden hues.
// A passed Art set is not Garden mint; Listen coral is in that set.
// No Three.js. No network. No invented mind.

var fs = require('fs');
var path = require('path');
var vm = require('vm');
var assert = require('assert');

var document = {
  readyState: 'complete',
  documentElement: { getAttribute: function () { return 'garden'; } },
  getElementById: function () { return null; },
  addEventListener: function () {},
  visibilityState: 'visible'
};

var localStorage = {
  getItem: function () { return null; },
  setItem: function () {},
  removeItem: function () {}
};

var windowObj = {
  addEventListener: function () {},
  GardenAlphaFlags: { unnamedNew: true },
  localStorage: localStorage
};

var sandbox = {
  window: windowObj,
  document: document,
  localStorage: localStorage,
  console: { log: function () {}, warn: function () {}, error: function () {} },
  Date: Date,
  Math: Math,
  JSON: JSON,
  Array: Array,
  Object: Object,
  String: String,
  Number: Number,
  parseInt: parseInt,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  setInterval: setInterval,
  clearInterval: clearInterval,
  Error: Error
};
windowObj.window = windowObj;
sandbox.global = sandbox;

var code = fs.readFileSync(path.join(__dirname, 'fractal-garden.js'), 'utf8');
vm.runInNewContext(code, sandbox);

var FG = sandbox.window.FractalGarden;
assert.ok(FG, 'FractalGarden mounts on window');
assert.equal(typeof FG.resolveLuminoHues, 'function');
assert.equal(typeof FG.getActiveLuminoHues, 'function');
assert.equal(typeof FG.init, 'function');

var GARDEN = [270, 45, 175, 0];
  var ART = [4, 48, 212, 255];

function check(name, fn) {
  fn();
  console.log('ok  ' + name);
}

check('init with no second arg keeps Garden hues (default)', function () {
  assert.deepEqual(FG.resolveLuminoHues(), GARDEN);
  assert.deepEqual(FG.resolveLuminoHues(null), GARDEN);
  assert.deepEqual(FG.resolveLuminoHues(undefined), GARDEN);
  assert.deepEqual(FG.resolveLuminoHues([]), GARDEN);
  assert.deepEqual(FG.getActiveLuminoHues(), GARDEN);
});

check('Art palette request is not Garden green; Listen coral is in the Art hue set', function () {
  var art = FG.resolveLuminoHues(ART);
  assert.deepEqual(art, ART);
  assert.ok(art.indexOf(4) !== -1, 'Listen coral hue 4 is in the Art set');
  assert.ok(art.indexOf(175) === -1, 'Garden mint 175 is not in the Art set');
  assert.ok(art.indexOf(270) === -1, 'Garden violet 270 is not in the Art set');
  assert.notDeepEqual(art, GARDEN);
});

check('Art fourth body is the dark who slot; Garden stays 55', function () {
  assert.equal(typeof FG.paletteSlotLightness, 'function');
  assert.equal(FG.paletteSlotLightness(0, ART), 55);
  assert.equal(FG.paletteSlotLightness(1, ART), 55);
  assert.equal(FG.paletteSlotLightness(2, ART), 55);
  assert.ok(FG.paletteSlotLightness(3, ART) < 40, 'who slot is the dark one');
  assert.equal(FG.paletteSlotLightness(0), 55);
  assert.equal(FG.paletteSlotLightness(3), 55, 'Garden (no hue set) does not dim slot 3');
  assert.equal(FG.paletteSlotLightness(3, GARDEN), 55);
});

console.log('all fractal-garden hue tests passed');
