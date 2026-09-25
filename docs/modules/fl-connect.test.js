#!/usr/bin/env node
// Alpha FlConnect tests — restore prior assertions + port-picker heal v0.2
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const src = fs.readFileSync(path.join(__dirname, 'fl-connect.js'), 'utf8');
const rooms = fs.readFileSync(path.join(__dirname, 'garden-rooms.js'), 'utf8');
const probeSrc = fs.readFileSync(path.join(__dirname, 'local-mind-probe.js'), 'utf8');

assert.ok(/v-connect-port-picker-v0/.test(src), 'marker');
assert.ok(/fl_localPort_manual/.test(src), 'port-only key');
assert.ok(/hasLocalMind|getManualBase|Looking…|ollamaReadyWhileBridgeWaits|flc-builders|manualQuiet/.test(src), 'heals');
assert.ok(/Garden → Settings/.test(src), 'Alpha wording');
assert.ok(/flc-hide-galaxy|fl-connect-open|garden-lumino/.test(rooms + fs.readFileSync(path.join(__dirname, 'garden-rooms.css'), 'utf8')), 'real galaxy hide');
assert.ok(/FlConnect\.probe|v-connect-under-more-v0/.test(probeSrc), 'LocalMindProbe soft-point'); // restored
assert.ok(/FlConnect\.unmount|fl-connect-mount-garden/.test(rooms), 'garden unmount'); // restored

const store = {};
const sandbox = {
  window: {},
  localStorage: {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; }
  },
  location: { hostname: 'thelatticetree.com', protocol: 'https:', hash: '', search: '' },
  document: {
    hidden: false,
    documentElement: { getAttribute: () => 'garden', classList: { add() {}, remove() {}, contains() { return false; } } },
    getElementById: () => null,
    createElement: () => ({
      style: {}, textContent: '', setAttribute() {}, appendChild() {}, addEventListener() {},
      dataset: {}, classList: { add() {}, contains() { return false; } }, type: '', className: ''
    }),
    head: { appendChild() {} },
    body: { contains: () => false, classList: { add() {}, remove() {} } },
    addEventListener() {},
    removeEventListener() {},
    querySelectorAll: () => []
  },
  fetch: async () => { throw new Error('offline'); },
  setTimeout: () => 1,
  clearTimeout() {},
  getComputedStyle: () => ({ display: 'block' }),
  navigator: { userAgent: 'test' },
  console,
  JSON,
  String,
  parseInt,
  URL,
  AbortSignal: { timeout: () => undefined },
  Date,
  Math
};
sandbox.window = sandbox;
vm.runInNewContext(src, sandbox);

assert.ok(sandbox.FlConnect);
assert.strictEqual(sandbox.FlConnect.STORAGE_ALPHA, 'fl_alpha_local_mind');
assert.ok(sandbox.FlConnect.LOOP_MAX_MS >= 5 * 60 * 1000, '5 min cap'); // restored
assert.strictEqual(sandbox.FlConnect.normalizePort('192.168.1.5:11434'), null);
assert.strictEqual(sandbox.FlConnect.normalizePort('localhost:11500'), '11500');

assert.strictEqual(sandbox.FlConnect.hasLocalMind(), false);
sandbox.FlConnect.remember({ name: 'test-model', base: 'http://127.0.0.1:11435' });
assert.ok(sandbox.FlConnect.hasLocalMind(), 'connected needs model');
const raw = store.fl_alpha_local_mind;
assert.ok(raw, 'wrote alpha key');
const parsed = JSON.parse(raw);
assert.ok(/11435/.test(parsed.url), 'Bridge URL remembered'); // restored
assert.strictEqual(parsed.model, 'test-model');

sandbox.FlConnect.stopLoop();
sandbox.FlConnect.unmount();
assert.ok(typeof sandbox.FlConnect.lookAgain === 'function', 'look again');

console.log('SMOKE_OK connect port picker alpha v0.2 heal');
console.log('local needs model · Bridge URL · soft-point · unmount · 5min · port-only');
