// Node smoke for garden-init Art hue handoff.
// Garden init() is called with no second arg.
// Art passes its own hue set; Listen coral is in that set; Garden mint is not.
// No network. No invented mind.

var fs = require('fs');
var path = require('path');
var assert = require('assert');

var src = fs.readFileSync(path.join(__dirname, 'garden-init.js'), 'utf8');

function check(name, fn) {
  fn();
  console.log('ok  ' + name);
}

check('Garden init path has no second arg', function () {
  assert.ok(src.indexOf('FractalGarden.init(CONTAINER_ID)') !== -1);
  assert.ok(src.indexOf('else FractalGarden.init(CONTAINER_ID);') !== -1);
});

check('Art hue set is passed only on the art galaxy', function () {
  assert.ok(src.indexOf('var ART_LUMINO_HUES = [4, 48, 212, 255];') !== -1);
  assert.ok(src.indexOf("if (g === 'art') return ART_LUMINO_HUES;") !== -1);
  assert.ok(src.indexOf('FractalGarden.init(CONTAINER_ID, hues)') !== -1);
});

check('Art palette is not Garden green; Listen coral is in the Art hue set', function () {
  var m = src.match(/var ART_LUMINO_HUES = \[([^\]]+)\];/);
  assert.ok(m, 'ART_LUMINO_HUES is declared');
  var hues = m[1].split(',').map(function (s) { return parseInt(s.trim(), 10); });
  assert.ok(hues.indexOf(4) !== -1, 'Listen coral hue 4 is in the Art set');
  assert.ok(hues.indexOf(175) === -1, 'Garden mint 175 is not in the Art set');
  assert.ok(hues.indexOf(270) === -1, 'Garden violet 270 is not in the Art set');
});

console.log('all garden-init hue tests passed');
