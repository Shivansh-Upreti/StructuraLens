/* Sandbox worker: the ONLY place learner code is evaluated.
 * - Runs off the main thread, so a runaway loop can be killed with worker.terminate().
 * - Has no DOM access. Network/storage APIs are removed here as defence in depth, and the
 *   production CSP for /sandbox/* sets connect-src 'none' so exfiltration is blocked by the browser.
 * This is hardening, not a perfect sandbox: it protects the page and the user's session,
 * not against code that merely burns this worker's own CPU (which the timeout handles).
 *
 * C, C++, Java and Python are first translated to JavaScript by the LanguageAdapter (line numbers
 * preserved), then traced by the same engine as JavaScript, so the call stack and tree behave identically.
 */
import { runCustom } from './custom.js';
import { transpile, makeRuntime, isLang, LANGS } from './languageAdapter.js';

for (const name of ['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'importScripts', 'indexedDB', 'caches', 'BroadcastChannel', 'Worker', 'SharedWorker']) {
  try { Object.defineProperty(self, name, { value: undefined, writable: false, configurable: false }); } catch (e) { /* already locked */ }
}

self.onmessage = (e) => {
  const { code, call, limits, lang } = e.data || {};
  const L = isLang(lang) ? lang : 'javascript';
  try {
    let src = String(code), entry = String(call), js = null, fromMain = false;
    if (L !== 'javascript') {
      const t = transpile(L, src);
      js = t.js; src = t.js;
      if (t.entry) { entry = t.entry; fromMain = true; }
      else if (!t.fnNames.length) throw new Error(`No ${LANGS[L].label} function found. Define the recursive function you want to trace.`);
    }
    const trace = runCustom(src, entry, limits, L === 'javascript' ? {} : { runtime: (print) => makeRuntime(L, print) });
    if (trace.error && L !== 'javascript') trace.error = `${trace.error} (in the JavaScript translated from your ${LANGS[L].label}; this adapter supports a teaching subset of the language)`;
    Object.assign(trace, { entry, fromMain, js });
    self.postMessage({ ok: true, trace });
  } catch (err) {
    self.postMessage({ ok: false, error: String((err && err.message) || err).slice(0, 300) });
  }
};
