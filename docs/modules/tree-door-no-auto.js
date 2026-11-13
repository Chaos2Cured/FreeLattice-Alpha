// tree-door-no-auto.js v-tree-door-first-run-calm-v0.1
// SPDX-License-Identifier: MIT
// Layer, never delete. Load this before tree-door.js.
// Stops tree-door.js from auto-opening the full-screen modal veil.
// tree-door-first-run-calm.js offers a non-modal, dismissible card instead.
(function (root) {
  'use strict';
  root.TreeDoorNoAuto = true;
})(typeof window !== 'undefined' ? window : this);
