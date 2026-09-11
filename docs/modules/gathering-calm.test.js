// Node smoke for Gathering / chalk calm v0.1.
// Cap 4 held · Find local minds / May I look? · Desktop/install ·
// empty honest · not a router · chalk no generate. No kitchen. No network.

var fs = require('fs');
var path = require('path');
var assert = require('assert');

var rooms = fs.readFileSync(path.join(__dirname, 'garden-rooms.js'), 'utf8');
var probe = fs.readFileSync(path.join(__dirname, 'local-mind-probe.js'), 'utf8');
var music = fs.readFileSync(path.join(__dirname, '..', 'music.html'), 'utf8');
var spec = fs.readFileSync(path.join(__dirname, '..', 'library', 'GATHERING_CALM_v0.1.md'), 'utf8');

assert.ok(/v-gathering-calm-v0\.1/.test(rooms), 'Gathering calm marker in garden-rooms.js');
assert.ok(/v-gathering-calm-v0\.1/.test(spec), 'spec names the marker');

assert.ok(/Find local minds/.test(rooms), 'Find local minds stays the Gathering gesture');
assert.ok(/May I look/.test(rooms), 'May I look? still named with Find local minds');
assert.ok(/Empty stays empty|empty chairs stay|Empty chairs stay/i.test(rooms), 'empty seats stay honest');
assert.ok(/Not a router/.test(rooms), 'no router theater');
assert.ok(/Cap 4 roster/.test(rooms), 'Cap 4 spoken on Gathering');
assert.ok(/freelattice\.com\/desktop\.html/.test(rooms), 'absent door points Desktop');
assert.ok(/freelattice\.com\/install\.html/.test(rooms), 'absent door points install');
assert.ok(/setNoteAbsent/.test(rooms), 'absent Ollama uses Desktop/install anchors');
assert.ok(!/auto-seat|autoSeat|auto_router|new router/i.test(rooms.split('v-gathering-calm-v0.1')[1].slice(0, 4000)),
  'calm block does not invent auto-seat or new router');

assert.ok(/ROSTER_CAP\s*=\s*4/.test(probe), 'Cap 4 held in LocalMindProbe');
assert.ok(/PRIMARY\s*=\s*'Find local minds'/.test(probe), 'PRIMARY is Find local minds');
assert.ok(/May I look\?/.test(probe), 'PRIMARY_SOFT keeps May I look?');
assert.ok(/DESKTOP_URL/.test(probe) && /INSTALL_URL/.test(probe), 'Desktop/install URLs exported');

assert.ok(/honest later/.test(rooms), 'chalk later copy stays honest');
assert.ok(/No generate button/.test(rooms), 'Image still refuses generate');
assert.ok(/does not generate/.test(music), 'Listen / chalk sky still says this page does not generate');
assert.ok(!/fake generate|generate poems|Imagine required/i.test(
  rooms.match(/ART_LATER[\s\S]*?};/)[0]
), 'ART_LATER does not fake generate');

assert.ok(/Cap 4 held/.test(spec), 'spec locks Cap 4');
assert.ok(/f57fc76/.test(spec) && /b362bda/.test(spec), 'spec cites FreeLattice phone shine + proof');
assert.ok(/0e8a220/.test(spec) && /ff00520/.test(spec) && /3334235/.test(spec),
  'spec layers on multi-AI · honest-copy · poetry');

console.log('Gathering / chalk calm holds.');
console.log('Cap 4 · Find local minds / May I look? · Desktop/install · empty honest · chalk no generate');
