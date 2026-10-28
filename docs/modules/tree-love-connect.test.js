// tree-love-connect.test.js (MIT)
// Static check for the Alpha Also connect shelf. The browser walk lives with the FreeLattice smoke.
var fs = require('fs');
var path = require('path');
var crypto = require('crypto');

var docs = path.join(__dirname, '..');
var settings = fs.readFileSync(path.join(docs, 'settings.html'), 'utf8');
var connect = fs.readFileSync(path.join(__dirname, 'fl-connect.js'));
var css = fs.readFileSync(path.join(__dirname, 'tree-love-connect.css'), 'utf8');

function fail(msg) {
  console.error('FAIL ' + msg);
  process.exit(1);
}

var md5 = crypto.createHash('md5').update(connect).digest('hex');
if (md5 !== 'aaff2bf1b037656989a9e1a89bb05908') fail('fl-connect ' + md5);
if (css.indexOf('v-tree-love-connect-v0.1') === -1) fail('marker');
if (css.indexOf('prefers-reduced-motion: reduce') === -1) fail('reduced motion');
['id="fl-also-connect"', 'id="fl-connect-mount"', 'id="settings-grandmother"', 'id="tree-door-host"', 'You are on Connect', 'A cloud key is not on this page', 'https://freelattice.com/install.html#bridge-download', 'https://freelattice.com/app.html'].forEach(function (bit) {
  if (settings.indexOf(bit) === -1) fail('missing ' + bit);
});
if (settings.indexOf('ghToken') !== -1) fail('token box');
if (settings.indexOf('lumino-menu') !== -1) fail('lumino menu');
if (settings.indexOf('fl_alpha_local_mind') !== -1) fail('storage collapsed into the page');
var slice = settings.slice(settings.indexOf('v-tree-love-connect-v0.1: Also connect'), settings.indexOf('id="settings-grandmother"'));
['\u2014', '&mdash;', 'innerHTML', 'confirm(', 'Quiet Room'].forEach(function (bad) {
  if (slice.indexOf(bad) !== -1) fail('slice ' + bad);
});
console.log('SMOKE_OK tree love connect v0.1');
