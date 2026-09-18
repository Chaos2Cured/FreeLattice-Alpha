#!/usr/bin/env node
// Thin smoke: Gathering Grok-home · Workshop cortex v0
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const thread = fs.readFileSync(path.join(root, 'modules', 'garden-thread.js'), 'utf8');
const benches = fs.readFileSync(path.join(root, 'modules', 'workshop-benches.js'), 'utf8');
const probe = fs.readFileSync(path.join(root, 'modules', 'local-mind-probe.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'modules', 'garden-rooms.css'), 'utf8');
const cortexDoc = fs.readFileSync(path.join(root, 'library', 'WORKSHOP_CORTEX_ROUTER_v0.md'), 'utf8');
const pathDoc = fs.readFileSync(path.join(root, 'library', 'AUTONOMOUS_COMMIT_PATH_v0.md'), 'utf8');

assert.ok(/v-gathering-grokhome-cortex-v0/.test(thread), 'thread marker');
assert.ok(/v-gathering-grokhome-cortex-v0/.test(benches), 'benches marker');
assert.ok(/speakingLine|speaking · /.test(thread), 'speaking line');
assert.ok(/is-stop|Stop — cancel/.test(thread), 'Send+Stop');
assert.ok(/AbortSignal|signal\.aborted|talkAbort/.test(thread), 'AbortSignal Stop');
assert.ok(!/setTimeout\(function \(\) \{ if \(ctrl\) ctrl\.abort\(\); \}, 120000\)/.test(thread),
  'no 120s kill-timer on postChat');
assert.ok(/thread-answered|whoAnsweredMeta|answered:/.test(thread), 'who-answered');
assert.ok(/is-grokhome-scroll/.test(thread + css), 'long scroll');
assert.ok(/fl-alpha-speaking-changed/.test(probe), 'speaking change event');

assert.ok(/routeAsk/.test(benches), 'cortex routeAsk');
assert.ok(/@\(cortex\|memory\|continuity\|dream\)|@cortex/.test(benches), 'override tags');
assert.ok(/Ask-as|workshop-ask-as/.test(benches), 'Ask-as control');
assert.ok(/Asking ·|workshop-asking-chip/.test(benches), 'Asking chip');
assert.ok(/prepareCommitScaffold|Copy scaffold|Download scaffold/.test(benches), 'Prepare scaffold');
assert.ok(/HEART_SEAT_FIRST|Seat a mind in The Gathering first/.test(benches), 'fail-closed');
assert.ok(/allow-scripts/.test(benches), 'sandbox allow-scripts');
assert.ok(/No auto-commit|no auto-commit|git OFF|Git stays OFF/i.test(benches + pathDoc), 'git OFF / no auto-commit');

assert.ok(/v-gathering-grokhome-cortex-v0/.test(cortexDoc), 'cortex doc');
assert.ok(/No auto-commit tonight|no auto-commit/i.test(pathDoc), 'path doc');

// Router unit — seated only
const sandbox = {
  window: {},
  document: { createElement: function () { return {}; } },
  localStorage: { getItem: function () { return null; }, setItem: function () {}, removeItem: function () {}, length: 0, key: function () { return null; } },
  location: { protocol: 'http:' },
  navigator: {},
  console: console,
  AbortController: function () { this.signal = { aborted: false, addEventListener: function () {} }; this.abort = function () { this.signal.aborted = true; }; }
};
sandbox.window = sandbox;
sandbox.LocalMindProbe = {
  getRemembered: function () {
    return {
      speakingChair: 'memory',
      gatheringBinds: {
        cortex: { url: 'http://127.0.0.1:11434', model: 'qwen', tag: 'A' },
        memory: { url: 'http://127.0.0.1:11434', model: 'llama', tag: 'B' }
      }
    };
  },
  shortModelName: function (m) { return String(m || 'mind'); }
};
vm.runInNewContext(benches, sandbox);
const WB = sandbox.window.WorkshopBenches;
assert.ok(WB && WB.routeAsk, 'WorkshopBenches.routeAsk');
// dream not seated — @dream override ignored, falls to speaking memory
var r0 = WB.routeAsk('hello @dream', 'auto');
assert.ok(r0.ok, 'unseated @dream ignored; still routes among seated');
assert.strictEqual(r0.chair, 'memory', 'falls to speaking chair');
var r1 = WB.routeAsk('hello', 'auto');
assert.ok(r1.ok, 'auto ok');
assert.strictEqual(r1.chair, 'memory', 'speaking chair wins when seated');
var r2 = WB.routeAsk('please fix this code', 'auto');
assert.strictEqual(r2.chair, 'cortex', 'code keyword → cortex');
var r3 = WB.routeAsk('remember this', 'auto');
assert.strictEqual(r3.chair, 'memory', 'remember → memory');
var r4 = WB.routeAsk('plan the git path', 'auto');
// continuity not seated — should not pick continuity
assert.notStrictEqual(r4.chair, 'continuity', 'unseated continuity not chosen');
var r5 = WB.routeAsk('x', 'cortex');
assert.strictEqual(r5.chair, 'cortex', 'ask-as cortex');
sandbox.LocalMindProbe.getRemembered = function () { return { gatheringBinds: {}, speakingChair: '' }; };
assert.strictEqual(WB.routeAsk('code', 'auto').ok, false, 'none seated → fail-closed');

console.log('SMOKE_OK gathering grok-home · workshop cortex v0');
console.log('speaking · Stop≠timer · who-answered · cortex route · prepare scaffold · git OFF');
