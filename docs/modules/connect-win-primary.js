// connect-win-primary.js (MIT) v-tree-win-setup-primary-v0.1
// On Windows, after the connect card paints, Setup is the first Bridge link
// and Portable is the second. Same bridge-v0.1 files. textContent only.
(function (root) {
  'use strict';
  var SETUP_LABEL = 'Download Bridge \u00b7 Windows Setup';
  var PORTABLE_LABEL = 'Download Bridge \u00b7 Windows Portable';

  function isWindows() {
    var ua = '';
    try { ua = String((root.navigator && root.navigator.userAgent) || ''); } catch (e) { ua = ''; }
    return /windows/i.test(ua);
  }

  function hasClass(el, name) {
    return (' ' + String((el && el.className) || '') + ' ').indexOf(' ' + name + ' ') !== -1;
  }

  function addClass(el, name) {
    if (!hasClass(el, name)) el.className = (String(el.className || '') + ' ' + name).replace(/^\s+/, '');
  }

  function removeClass(el, name) {
    el.className = String(el.className || '').split(/\s+/).filter(function (c) { return c && c !== name; }).join(' ');
  }

  function walk(node, out) {
    if (!node) return;
    if (String(node.tagName || '').toLowerCase() === 'a') out.push(node);
    var kids = node.children || [];
    for (var i = 0; i < kids.length; i++) walk(kids[i], out);
  }

  function indexOfNode(parent, node) {
    var kids = (parent && parent.children) || [];
    for (var i = 0; i < kids.length; i++) if (kids[i] === node) return i;
    return -1;
  }

  function apply(host) {
    if (!isWindows() || !host) return false;
    var list = [];
    walk(host, list);
    var setup = null;
    var portable = null;
    for (var i = 0; i < list.length; i++) {
      var text = String(list[i].textContent || '');
      if (text.indexOf(SETUP_LABEL) !== -1) setup = list[i];
      else if (text.indexOf(PORTABLE_LABEL) !== -1) portable = list[i];
    }
    if (setup && portable) {
      var sameParent = setup.parentNode === portable.parentNode;
      var si = indexOfNode(setup.parentNode, setup);
      var pi = indexOfNode(portable.parentNode, portable);
      if (sameParent && si !== -1 && pi !== -1 && si < pi) return false;
      if (portable.parentNode && typeof portable.parentNode.insertBefore === 'function') {
        portable.parentNode.insertBefore(setup, portable);
      }
      if (hasClass(portable, 'flc-primary')) {
        addClass(setup, 'flc-primary');
        removeClass(portable, 'flc-primary');
      }
      return true;
    }
    if (setup || !portable) return false;
    var href = String(portable.href || '');
    if (href.indexOf('Windows_Portable') === -1 || href.indexOf('bridge-v0.1') === -1) return false;
    var doc = portable.ownerDocument || root.document;
    if (!doc || typeof doc.createElement !== 'function') return false;
    var made = doc.createElement('a');
    made.className = String(portable.className || '');
    made.textContent = SETUP_LABEL;
    made.href = href.replace('Windows_Portable', 'Windows_Setup');
    if (!portable.parentNode || typeof portable.parentNode.insertBefore !== 'function') return false;
    portable.parentNode.insertBefore(made, portable);
    if (hasClass(portable, 'flc-primary')) {
      addClass(made, 'flc-primary');
      removeClass(portable, 'flc-primary');
    }
    return true;
  }

  function boot() {
    var doc = root.document;
    if (!doc) return;
    function scan() {
      var ids = ['fl-connect-mount', 'fl-connect-mount-garden'];
      for (var i = 0; i < ids.length; i++) {
        var host = doc.getElementById ? doc.getElementById(ids[i]) : null;
        if (host) apply(host);
      }
    }
    scan();
    if (typeof root.MutationObserver === 'function' && doc.body) {
      var obs = new root.MutationObserver(function () { scan(); });
      obs.observe(doc.body, { childList: true, subtree: true });
    }
  }

  root.FLConnectWinPrimary = {
    VERSION: 'v-tree-win-setup-primary-v0.1',
    apply: apply,
    boot: boot
  };
  if (root.document) {
    if (root.document.body) boot();
    else if (root.document.addEventListener) root.document.addEventListener('DOMContentLoaded', boot);
  }
})(typeof window !== 'undefined' ? window : this);
