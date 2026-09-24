#!/usr/bin/env node
// Thin Alpha smoke: FlConnect soft-point · fl_alpha_local_mind unbroken.
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const modPath = path.join(__dirname, 'fl-connect.js');
const probePath = path.join(__dirname, 'local-mind-probe.js');
const src = fs.readFileSync(modPath, 'utf8');
const probeSrc = fs.readFileSync(probePath, 'utf8');

assert.ok(/v-connect-under-more-v0/.test(src), 'marker');
assert.ok(/fl_alpha_local_mind/.test(src), 'alpha key named');
assert.ok(/11435/.test(src) && /bridge\/health/.test(src), 'bridge health');

const store = {};
const sandbox = {
  window: {},
  localStorage: {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
    setItem: function (k, v) { store[k] = String(v); },
    removeItem: function (k) { delete store[k]; }
  },
  location: { hostname: 'thelatticetree.com', protocol: 'https:', hash: '', search: '' },
  document: {
    documentElement: { getAttribute: function () { return 'garden'; } },
    getElementById: function () { return null; },
    createElement: function () { return { style: {}, textContent: '', appendChild: function () {} }; },
    head: { appendChild: function () {} },
    body: { contains: function () { return false; } }
  },
  fetch: async function () { throw new Error('offline stub'); },
  setInterval: function () { return 0; },
  clearInterval: function () {},
  console: console
};
sandbox.window = sandbox;
sandbox.navigator = { userAgent: 'test' };

vm.runInNewContext(src, sandbox);
assert.ok(sandbox.FlConnect, 'FlConnect global');
assert.ok(typeof sandbox.FlConnect.probe === 'function', 'probe');
assert.ok(typeof sandbox.FlConnect.remember === 'function', 'remember');
assert.strictEqual(sandbox.FlConnect.STORAGE_ALPHA, 'fl_alpha_local_mind');

sandbox.FlConnect.remember({ name: 'test-model', base: 'http://127.0.0.1:11435' });
const raw = store['fl_alpha_local_mind'];
assert.ok(raw, 'wrote alpha key');
const parsed = JSON.parse(raw);
assert.ok(/11435/.test(parsed.url), 'bridge url remembered');
assert.strictEqual(parsed.model, 'test-model');

assert.ok(/FlConnect\.probe|v-connect-under-more-v0/.test(probeSrc), 'LocalMindProbe soft-point');

console.log('SMOKE_OK connect under more alpha v0');
console.log('FlConnect · fl_alpha_local_mind · Bridge soft-point');
