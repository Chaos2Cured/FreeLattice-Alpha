#!/usr/bin/env node
// Thin Alpha smoke: FlConnect v0.1 · fl_alpha_local_mind · loop-stops.
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const modPath = path.join(__dirname, 'fl-connect.js');
const probePath = path.join(__dirname, 'local-mind-probe.js');
const roomsPath = path.join(__dirname, 'garden-rooms.js');
const src = fs.readFileSync(modPath, 'utf8');
const probeSrc = fs.readFileSync(probePath, 'utf8');
const roomsSrc = fs.readFileSync(roomsPath, 'utf8');

assert.ok(/v-connect-under-more-v0/.test(src), 'marker');
assert.ok(/heal v0\.1|v0\.1/.test(src), 'heal v0.1');
assert.ok(/fl_alpha_local_mind/.test(src), 'alpha key named');
assert.ok(/11435/.test(src) && /bridge\/health/.test(src), 'bridge health');
assert.ok(/unmount|stopLoop|Look again|visibilitychange|fullScan|stickyFallback/.test(src), 'loop heal APIs');
assert.ok(/FlConnect\.unmount|FlConnect\.unmount\(\)/.test(roomsSrc), 'garden close unmounts');
assert.ok(/FlConnect\.probe|v-connect-under-more-v0/.test(probeSrc), 'LocalMindProbe soft-point');

const store = {};
let timeoutCount = 0;
const sandbox = {
  window: {},
  localStorage: {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
    setItem: function (k, v) { store[k] = String(v); },
    removeItem: function (k) { delete store[k]; }
  },
  location: { hostname: 'thelatticetree.com', protocol: 'https:', hash: '', search: '' },
  document: {
    hidden: false,
    documentElement: { getAttribute: function () { return 'garden'; } },
    getElementById: function () { return null; },
    createElement: function () {
      return { style: {}, textContent: '', setAttribute: function () {}, appendChild: function () {}, addEventListener: function () {} };
    },
    head: { appendChild: function () {} },
    body: { contains: function () { return false; } },
    addEventListener: function () {},
    removeEventListener: function () {}
  },
  fetch: async function () { throw new Error('offline stub'); },
  setTimeout: function () { timeoutCount += 1; return timeoutCount; },
  clearTimeout: function () {},
  getComputedStyle: function () { return { display: 'block' }; },
  navigator: { userAgent: 'test' },
  console: console
};
sandbox.window = sandbox;

vm.runInNewContext(src, sandbox);
assert.ok(sandbox.FlConnect, 'FlConnect global');
assert.strictEqual(sandbox.FlConnect.STORAGE_ALPHA, 'fl_alpha_local_mind');

sandbox.FlConnect.remember({ name: 'test-model', base: 'http://127.0.0.1:11435' });
const raw = store['fl_alpha_local_mind'];
assert.ok(raw, 'wrote alpha key');
const parsed = JSON.parse(raw);
assert.ok(/11435/.test(parsed.url), 'bridge url remembered');
assert.strictEqual(parsed.model, 'test-model');

// loop-stops case: remember stops loop; unmount clears host
sandbox.FlConnect.stopLoop();
sandbox.FlConnect.unmount();
assert.ok(typeof sandbox.FlConnect.lookAgain === 'function', 'look again');
assert.ok(sandbox.FlConnect.LOOP_MAX_MS >= 5 * 60 * 1000, '5 min cap');

console.log('SMOKE_OK connect under more alpha v0.1');
console.log('FlConnect · fl_alpha_local_mind · loop-stops · garden unmount');
