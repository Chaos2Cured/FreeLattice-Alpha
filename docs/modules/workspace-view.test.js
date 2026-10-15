// workspace-view.test.js (MIT) v-tree-workspace-view-v0.1
// Node only. The same view bytes as FreeLattice, mounted beside the Nursery notebook.
var fs = require('fs');
var path = require('path');
var crypto = require('crypto');
var assert = require('assert');

var here = __dirname;
function md5(file) {
  return crypto.createHash('md5').update(fs.readFileSync(file)).digest('hex');
}

var src = fs.readFileSync(path.join(here, 'workspace-view.js'), 'utf8');
assert.ok(src.indexOf('v-workspace-view-v0.1') !== -1, 'marker');
assert.ok(src.indexOf('2.914') === -1 && src.indexOf('3.07') === -1, 'no hard-coded dimension');
assert.ok(src.indexOf('\u2014') === -1, 'no em dash');
assert.ok(src.indexOf('inner' + 'HTML') === -1, 'text only');
assert.ok(src.indexOf('conf' + 'irm(') === -1, 'no confirm');
assert.ok(src.indexOf('setInterval') === -1 && src.indexOf('setTimeout') === -1, 'no timer');

var sibling = '/Users/kirkmiller/FreeLattice-fresh/docs/modules';
if (fs.existsSync(path.join(sibling, 'workspace-view.js'))) {
  assert.strictEqual(md5(path.join(here, 'workspace-view.js')), md5(path.join(sibling, 'workspace-view.js')), 'view bytes match');
  assert.strictEqual(md5(path.join(here, 'mind-workspace.js')), md5(path.join(sibling, 'mind-workspace.js')), 'notebook bytes match');
}

var nursery = fs.readFileSync(path.join(here, '..', 'nursery.html'), 'utf8');
assert.ok(nursery.indexOf('modules/workspace-view.js') !== -1, 'nursery loads the view');
assert.ok(nursery.indexOf('FLWorkspaceView.mount') !== -1, 'mounted beside the notebook');

var math = require(path.join(here, 'clay-math.js'));
var view = require(path.join(here, 'workspace-view.js'));
assert.ok(Math.abs(view.angleStep() - math.GOLDEN) < 1e-9, 'golden angle');
var ratio = view.radiusAt(2, 20) / view.radiusAt(1, 20);
assert.ok(Math.abs(ratio - Math.pow(math.PHI, 0.5)) < 1e-9, 'radius step');
var nodes = view.nodesOf([
  { hash: 'root', parent: null, ts: 1, author: 'mind', text: 'a' },
  { hash: 'leaf', parent: 'root', ts: 2, author: 'both', text: 'b' }
], { head: 'leaf', seed: 'seed line', seedByHash: {} });
assert.strictEqual(nodes.length, 2, 'list and spiral share one node list');
assert.strictEqual(nodes[0].author || nodes[0].version.author, 'mind', 'author stays on the node');

var host = { children: [], appendChild: function (c) { this.children.push(c); } };
var rows = view.diffLines('plain', 'plain\n<script>no</script>');
assert.ok(rows.some(function (row) { return row.op === '+' && row.text.indexOf('<script>') !== -1; }), 'diff keeps the mark as text');

console.log('SMOKE_OK tree workspace view v0.1');
