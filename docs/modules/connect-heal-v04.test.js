#!/usr/bin/env node
// v-connect-heal-v0.4: Hypha walk 3 heals (theLatticeTree side).
// Item 1: Settings Connect mount never collapses; one scroller; sky dims.
// Item 9: one restore path when leaving Settings (close, Nursery, twice).
// Shared fl-connect.js heals ride along byte-identical with FreeLattice.
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const css = fs.readFileSync(path.join(__dirname, 'garden-rooms.css'), 'utf8');
const rooms = fs.readFileSync(path.join(__dirname, 'garden-rooms.js'), 'utf8');
const mod = fs.readFileSync(path.join(__dirname, 'fl-connect.js'), 'utf8');

// Item 1: CSS layer (later in file than the v0.3 rule it corrects)
const layerAt = css.indexOf('v-connect-heal-v0.4');
assert.ok(layerAt > css.indexOf('#fl-connect-mount-garden {'), 'layer after the v0.3 mount rule');
const layer = css.slice(layerAt);
assert.ok(/#place-veil\.is-settings #fl-connect-mount-garden \{[^}]*flex: 0 0 auto;[^}]*max-height: none;[^}]*overflow: visible;/.test(layer), 'mount keeps full height, no inner scroller');
assert.ok(/#place-veil\.is-settings #fl-connect-mount-garden \.flc-wrap \{[^}]*max-height: none;[^}]*overflow: visible;/.test(layer), 'no nested .flc-wrap scroller');
assert.ok(/html\.flc-hide-galaxy #gardenContainer \{[^}]*opacity: 0\.12;/.test(layer), 'canvas sky dims while Connect is open');
assert.ok(/#place-veil\.is-settings #place-veil-close \{[^}]*position: sticky;/.test(layer), 'the garden stays reachable');
assert.ok(!/\u2014/.test(layer), 'no em dashes in the layer');

// Item 9: one restore path
assert.ok(/function flcRestoreGalaxy\(\)/.test(rooms), 'restore helper');
assert.ok(/function openPlace\(id\) \{\s*if \(!veil\) return;\s*flcRestoreGalaxy\(\);/.test(rooms), 'openPlace restores first');
assert.ok(/function closePlace\(opts\) \{\s*if \(!veil\) return;\s*flcRestoreGalaxy\(\);/.test(rooms), 'closePlace restores first');
assert.ok(/removeAttribute\('data-flc-was-hidden'\)/.test(rooms), 'marks forgotten so a second open records fresh');

// Item 9 runtime: run flcRestoreGalaxy against a tiny fake DOM
{
  const src = rooms.slice(rooms.indexOf('    function flcRestoreGalaxy() {'), rooms.indexOf('    function closePlace(opts) {'));
  const mk = (was, hidden) => {
    const attrs = { 'data-flc-was-hidden': was };
    return { hidden, getAttribute: (k) => (k in attrs ? attrs[k] : null), removeAttribute: (k) => { delete attrs[k]; }, attrs };
  };
  const nav = mk('0', true); const already = mk('1', true);
  const classes = new Set(['flc-hide-galaxy']); const body = new Set(['fl-connect-open']);
  let unmounted = 0;
  const ctx = {
    window: { FlConnect: { unmount() { unmounted++; } } },
    document: {
      getElementById: () => ({ hidden: false }),
      documentElement: { classList: { remove: (c) => classes.delete(c) } },
      body: { classList: { remove: (c) => body.delete(c) } },
      querySelectorAll: () => [nav, already].filter((n) => n.getAttribute('data-flc-was-hidden') !== null)
    }
  };
  ctx.FlConnect = ctx.window.FlConnect;
  vm.runInNewContext(src + '\nthis.run = flcRestoreGalaxy;', ctx);
  ctx.run();
  assert.strictEqual(nav.hidden, false, 'what Settings hid comes back');
  assert.strictEqual(already.hidden, true, 'what was already hidden stays hidden');
  assert.ok(!('data-flc-was-hidden' in nav.attrs) && !('data-flc-was-hidden' in already.attrs), 'marks cleared');
  assert.ok(!classes.has('flc-hide-galaxy') && !body.has('fl-connect-open'), 'hide classes cleared');
  assert.strictEqual(unmounted, 1, 'Connect loop unmounted');
}

// Shared core rides along
assert.ok(/v-connect-heal-v0\.4/.test(mod), 'fl-connect.js heal marker');
assert.ok(/Still using ' \+ keep/.test(mod), 'refusal names the port that stays');
new vm.Script(mod);
new vm.Script(rooms);
const opens = (css.match(/\{/g) || []).length; const closes = (css.match(/\}/g) || []).length;
assert.strictEqual(opens, closes, 'css braces balanced');

console.log('SMOKE_OK connect heal v0.4');
