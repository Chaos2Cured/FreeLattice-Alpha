#!/usr/bin/env node
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const src = fs.readFileSync(path.join(__dirname, 'fl-connect.js'), 'utf8');
const rooms = fs.readFileSync(path.join(__dirname, 'garden-rooms.js'), 'utf8');
assert.ok(/v-connect-port-picker-v0/.test(src), 'marker');
assert.ok(/hasLocalMind|getManualBase|Looking…|ollamaReadyWhileBridgeWaits|flc-builders/.test(src), 'heals');
assert.ok(/flc-hide-galaxy/.test(rooms), 'orb hide when Connect open');
assert.ok(/Garden → Settings/.test(src), 'Alpha wording');
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
    documentElement: { getAttribute: () => 'garden', classList: { add(){}, remove(){} } },
    getElementById: () => null,
    createElement: () => ({ style: {}, textContent: '', setAttribute(){}, appendChild(){}, addEventListener(){} }),
    head: { appendChild(){} },
    body: { contains: () => false },
    addEventListener(){}, removeEventListener(){}
  },
  fetch: async () => { throw new Error('offline'); },
  setTimeout: () => 1, clearTimeout(){},
  getComputedStyle: () => ({ display: 'block' }),
  navigator: { userAgent: 'test' },
  console
};
sandbox.window = sandbox;
vm.runInNewContext(src, sandbox);
assert.ok(sandbox.FlConnect.hasLocalMind);
assert.strictEqual(sandbox.FlConnect.hasLocalMind(), false);
sandbox.FlConnect.remember({ name: 'm1', base: 'http://127.0.0.1:11434' });
assert.ok(sandbox.FlConnect.hasLocalMind(), 'connected needs model');
assert.ok(/11434/.test(JSON.parse(store.fl_alpha_local_mind).url) || /11434/.test(JSON.parse(store.fl_alpha_local_mind).url), 'direct remember');
console.log('SMOKE_OK connect port picker alpha v0.1');
console.log('local needs model · galaxy hide class · Alpha wording');
