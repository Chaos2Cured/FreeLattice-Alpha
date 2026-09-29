#!/usr/bin/env node
// Thin smoke: Alpha Workshop porch twin v0 — Ask calm · History · Stop.
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const benches = fs.readFileSync(path.join(root, 'modules', 'workshop-benches.js'), 'utf8');
const thread = fs.readFileSync(path.join(root, 'modules', 'garden-thread.js'), 'utf8');
const mirror = fs.readFileSync(path.join(root, 'code-workshop.html'), 'utf8');
const galaxies = fs.readFileSync(path.join(root, 'GALAXIES.md'), 'utf8');
const doc = fs.readFileSync(path.join(root, 'library', 'WORKSHOP_PORCH_TWIN_v0.md'), 'utf8');
const workshop = fs.readFileSync(path.join(root, 'workshop.html'), 'utf8');

assert.ok(/v-alpha-workshop-porch-twin-v0/.test(benches), 'benches marker');
assert.ok(/v-alpha-workshop-porch-twin-v0/.test(doc), 'library marker');
assert.ok(/v-alpha-workshop-porch-twin-v0/.test(mirror), 'code-workshop mirror note');
assert.ok(/v-alpha-workshop-porch-twin-v0/.test(galaxies), 'GALAXIES marker');

// Chips · History · Stop
assert.ok(/EXAMPLE_CHIPS|workshop-chip|data-workshop-chip/.test(benches), 'example chips');
assert.ok(/Simple calculator|Pomodoro|Color palette|Markdown preview|Breathing circle/.test(benches), '3–5 example prompts');
assert.ok(/fl_alpha_workshop_history_v0/.test(benches), 'history storage key');
assert.ok(/Remix|data-workshop-history-remix/.test(benches), 'Remix');
assert.ok(/Clear|clearHistoryConsent|data-workshop-history-clear/.test(benches), 'consent clear');
assert.ok(/Load|data-workshop-history-load/.test(benches), 'Load');
assert.ok(/AbortController/.test(benches), 'AbortController Stop');
assert.ok(/Stop ≠ timeout|choice, not a timer|not a timer/i.test(benches + doc), 'Stop ≠ timeout');
assert.ok(/signal/.test(thread) && /function sendToMind\(mind, msgs, signal\)/.test(thread), 'sendToMind optional signal');
assert.ok(/reason === 'stopped'|stopped: true|err\.stopped/.test(thread), 'stopped reason');

// Sandbox sacred · no FL kitchen dump
assert.ok(/sandbox=["']allow-scripts["']|SANDBOX = 'allow-scripts'/.test(benches), 'sandbox allow-scripts only');
assert.ok(!/allow-same-origin|allow-net|allow-top-navigation/.test(benches.match(/SANDBOX[^=]*=\s*['"][^'"]+['"]/)[0]), 'no extra sandbox perms');
assert.ok(!/ws-mode-create|ws-mode-secondary|window\.AutoBuilder|FLHangCancel/.test(benches), 'no FreeLattice Create/Code/Projects kitchen dump');
assert.ok(/Not a Create\/Code\/Projects kitchen/.test(benches), 'explicit no-kitchen lock in benches');

// Soft faces
assert.ok(/Ask sits calm|chips · History · Stop/i.test(workshop), 'workshop heart porch sentence');
assert.ok(/694ec2e|e6bcd37/.test(doc + galaxies), 'Held tip lineage');

console.log('SMOKE_OK workshop porch twin v0');
console.log('Ask porch · chips · History · Stop · sandbox allow-scripts');
