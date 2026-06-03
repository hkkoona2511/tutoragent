/* ═══════════════════════════════════════════════════════════════
   TutorAgent — UI Functionality Tests
   Comprehensive automated tests for all UI interactions.
   Uses jsdom to simulate a browser DOM + mocha/chai assertions.
   ═══════════════════════════════════════════════════════════════ */

'use strict';

const { JSDOM } = require('jsdom');
const assert    = require('assert');
const fs        = require('fs');
const path      = require('path');

/* ── Paths ──────────────────────────────────────────────────── */
const HTML_PATH = path.resolve(__dirname, '..', 'index.html');
const JS_PATH   = path.resolve(__dirname, '..', 'app.js');
const htmlSource = fs.readFileSync(HTML_PATH, 'utf-8');
const jsSource   = fs.readFileSync(JS_PATH,   'utf-8');

/* ── Helper: spin up a fresh DOM + app.js for each test ────── */
function createApp() {
  const dom = new JSDOM(htmlSource, {
    url: 'http://localhost',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    resources: 'usable',
    beforeParse(window) {
      // Stub APIs not available in jsdom
      window.performance = { now: () => Date.now() };
      window.navigator.clipboard = {
        writeText: async (text) => { window.__clipboardContent = text; },
      };
      // Stub jsPDF
      window.jspdf = {
        jsPDF: class {
          constructor() { this._pages = 1; this._saved = null; }
          setFillColor() {}
          rect() {}
          setFont() {}
          setFontSize() {}
          setTextColor() {}
          text() {}
          setDrawColor() {}
          setLineWidth() {}
          line() {}
          splitTextToSize(t) { return t.split('\n'); }
          addPage() { this._pages++; }
          setPage() {}
          save(name) { this._saved = name; window.__pdfSaved = name; }
          get internal() { return { getNumberOfPages: () => this._pages }; }
        }
      };
      // Stub URL.createObjectURL / revokeObjectURL
      window.URL.createObjectURL = () => 'blob:mock';
      window.URL.revokeObjectURL = () => {};
      // Stub sessionStorage / localStorage
      const store = {};
      const mockStorage = {
        getItem:    (k) => store[k] ?? null,
        setItem:    (k, v) => { store[k] = String(v); },
        removeItem: (k) => { delete store[k]; },
        clear:      () => { Object.keys(store).forEach(k => delete store[k]); },
      };
      Object.defineProperty(window, 'sessionStorage', { value: mockStorage });
      Object.defineProperty(window, 'localStorage',   { value: mockStorage });
    },
  });

  // Inject app.js
  const scriptEl = dom.window.document.createElement('script');
  scriptEl.textContent = jsSource;
  dom.window.document.body.appendChild(scriptEl);

  return dom;
}

/* ── Shortcut helpers ──────────────────────────────────────── */
function click(doc, id) {
  const el = doc.getElementById(id);
  if (!el) throw new Error(`Element #${id} not found`);
  el.dispatchEvent(new doc.defaultView.MouseEvent('click', { bubbles: true }));
  return el;
}
function fireInput(doc, id) {
  const el = doc.getElementById(id);
  el.dispatchEvent(new doc.defaultView.Event('input', { bubbles: true }));
  return el;
}
function fireChange(doc, id) {
  const el = doc.getElementById(id);
  el.dispatchEvent(new doc.defaultView.Event('change', { bubbles: true }));
  return el;
}
function fireKeydown(doc, targetId, key, opts = {}) {
  const el = doc.getElementById(targetId);
  el.dispatchEvent(new doc.defaultView.KeyboardEvent('keydown', { key, bubbles: true, ...opts }));
  return el;
}

/* ═══════════════════════════════════════════════════════════════
   1. STATUS INDICATOR TESTS
   ═══════════════════════════════════════════════════════════════ */
describe('1 ▸ Status Indicator', () => {
  let dom, doc, win;

  beforeEach(() => { dom = createApp(); doc = dom.window.document; win = dom.window; });
  afterEach(() => dom.window.close());

  it('1.1 — should show "Ready" status on initial load', () => {
    const label = doc.getElementById('statusLabel');
    assert.strictEqual(label.textContent, 'Ready');
  });

  it('1.2 — statusDot should have "ready" class on load', () => {
    const dot = doc.getElementById('statusDot');
    assert.ok(dot.classList.contains('ready'), 'Expected status-dot to have "ready" class');
  });

  it('1.3 — setStatus("busy", "Thinking…") should update dot + label', () => {
    // Call internal setStatus via eval in the DOM context
    win.eval('setStatus("busy", "Thinking…")');
    const dot   = doc.getElementById('statusDot');
    const label = doc.getElementById('statusLabel');
    assert.ok(dot.classList.contains('busy'));
    assert.strictEqual(label.textContent, 'Thinking…');
  });

  it('1.4 — setStatus("error", "Error") should update dot + label', () => {
    win.eval('setStatus("error", "Error")');
    const dot   = doc.getElementById('statusDot');
    const label = doc.getElementById('statusLabel');
    assert.ok(dot.classList.contains('error'));
    assert.strictEqual(label.textContent, 'Error');
  });

  it('1.5 — setStatus("ready", "Done") should update dot + label', () => {
    win.eval('setStatus("ready", "Done")');
    const label = doc.getElementById('statusLabel');
    assert.strictEqual(label.textContent, 'Done');
  });

  it('1.6 — setStatus("ready", "Stopped") should update label', () => {
    win.eval('setStatus("ready", "Stopped")');
    const label = doc.getElementById('statusLabel');
    assert.strictEqual(label.textContent, 'Stopped');
  });
});

/* ═══════════════════════════════════════════════════════════════
   2. THEME TOGGLE (Dark / Light)
   ═══════════════════════════════════════════════════════════════ */
describe('2 ▸ Theme Toggle', () => {
  let dom, doc, win;

  beforeEach(() => { dom = createApp(); doc = dom.window.document; win = dom.window; });
  afterEach(() => dom.window.close());

  it('2.1 — should default to dark theme', () => {
    const theme = doc.documentElement.getAttribute('data-theme');
    assert.strictEqual(theme, 'dark');
  });

  it('2.2 — clicking theme toggle should switch to light theme', () => {
    click(doc, 'themeToggleBtn');
    const theme = doc.documentElement.getAttribute('data-theme');
    assert.strictEqual(theme, 'light');
  });

  it('2.3 — clicking theme toggle twice should return to dark theme', () => {
    click(doc, 'themeToggleBtn');
    click(doc, 'themeToggleBtn');
    const theme = doc.documentElement.getAttribute('data-theme');
    assert.strictEqual(theme, 'dark');
  });

  it('2.4 — light theme should persist in localStorage', () => {
    click(doc, 'themeToggleBtn');
    assert.strictEqual(win.localStorage.getItem('tutor_theme'), 'light');
  });

  it('2.5 — switching back to dark should persist in localStorage', () => {
    click(doc, 'themeToggleBtn');
    click(doc, 'themeToggleBtn');
    assert.strictEqual(win.localStorage.getItem('tutor_theme'), 'dark');
  });

  it('2.6 — aria-label should update on theme switch', () => {
    const btn = doc.getElementById('themeToggleBtn');
    click(doc, 'themeToggleBtn'); // now light
    assert.strictEqual(btn.getAttribute('aria-label'), 'Switch to Dark theme');
    click(doc, 'themeToggleBtn'); // now dark
    assert.strictEqual(btn.getAttribute('aria-label'), 'Switch to Light theme');
  });

  it('2.7 — toast should show theme switch message', () => {
    click(doc, 'themeToggleBtn');
    const toast = doc.getElementById('toast');
    assert.ok(toast.textContent.includes('Light theme'), `Toast said: "${toast.textContent}"`);
  });

  it('2.8 — moon and sun icon elements should exist', () => {
    assert.ok(doc.getElementById('themeIconDark'),  'Moon icon missing');
    assert.ok(doc.getElementById('themeIconLight'), 'Sun icon missing');
  });
});

/* ═══════════════════════════════════════════════════════════════
   3. GROQ API KEY — Show/Hide, Copy, Clear
   ═══════════════════════════════════════════════════════════════ */
describe('3 ▸ GROQ API Key', () => {
  let dom, doc, win;

  beforeEach(() => { dom = createApp(); doc = dom.window.document; win = dom.window; });
  afterEach(() => dom.window.close());

  it('3.1 — API key input should exist and default to password type', () => {
    const input = doc.getElementById('groqApiKey');
    assert.ok(input, 'API key input not found');
    assert.strictEqual(input.type, 'password');
  });

  it('3.2 — toggle visibility should switch to text type (show key)', () => {
    click(doc, 'toggleKeyVisibility');
    const input = doc.getElementById('groqApiKey');
    assert.strictEqual(input.type, 'text');
  });

  it('3.3 — toggle visibility twice should return to password type (hide key)', () => {
    click(doc, 'toggleKeyVisibility');
    click(doc, 'toggleKeyVisibility');
    const input = doc.getElementById('groqApiKey');
    assert.strictEqual(input.type, 'password');
  });

  it('3.4 — show key toast should say "Key visible"', () => {
    click(doc, 'toggleKeyVisibility');
    const toast = doc.getElementById('toast');
    assert.ok(toast.textContent.includes('Key visible'));
  });

  it('3.5 — hide key toast should say "Key hidden"', () => {
    click(doc, 'toggleKeyVisibility');
    click(doc, 'toggleKeyVisibility');
    const toast = doc.getElementById('toast');
    assert.ok(toast.textContent.includes('Key hidden'));
  });

  it('3.6 — copy with empty key should show warning toast', () => {
    click(doc, 'copyApiKey');
    const toast = doc.getElementById('toast');
    assert.ok(toast.textContent.includes('No API key to copy'));
  });

  it('3.7 — copy with a key should copy to clipboard', (done) => {
    const input = doc.getElementById('groqApiKey');
    input.value = 'gsk_test_key_12345';
    click(doc, 'copyApiKey');
    // clipboard.writeText is async, give it a tick
    setTimeout(() => {
      assert.strictEqual(win.__clipboardContent, 'gsk_test_key_12345');
      done();
    }, 50);
  });

  it('3.8 — clear with empty key should show "already empty" toast', () => {
    const input = doc.getElementById('groqApiKey');
    input.value = '';
    click(doc, 'clearApiKey');
    const toast = doc.getElementById('toast');
    assert.ok(toast.textContent.includes('already empty'));
  });

  it('3.9 — clear should empty the API key input', () => {
    const input = doc.getElementById('groqApiKey');
    input.value = 'gsk_test_key_12345';
    click(doc, 'clearApiKey');
    assert.strictEqual(input.value, '');
  });

  it('3.10 — clear should remove key from sessionStorage', () => {
    const input = doc.getElementById('groqApiKey');
    input.value = 'gsk_test_key_12345';
    fireInput(doc, 'groqApiKey'); // triggers sessionStorage save
    assert.strictEqual(win.sessionStorage.getItem('tutor_groq_key'), 'gsk_test_key_12345');
    click(doc, 'clearApiKey');
    assert.strictEqual(win.sessionStorage.getItem('tutor_groq_key'), null);
  });

  it('3.11 — clear should show "API key cleared" toast', () => {
    const input = doc.getElementById('groqApiKey');
    input.value = 'gsk_test_key_12345';
    click(doc, 'clearApiKey');
    const toast = doc.getElementById('toast');
    assert.ok(toast.textContent.includes('API key cleared'));
  });

  it('3.12 — typing a key should save to sessionStorage', () => {
    const input = doc.getElementById('groqApiKey');
    input.value = 'gsk_new_key';
    fireInput(doc, 'groqApiKey');
    assert.strictEqual(win.sessionStorage.getItem('tutor_groq_key'), 'gsk_new_key');
  });
});

/* ═══════════════════════════════════════════════════════════════
   4. MODEL SELECTION — Radio buttons
   ═══════════════════════════════════════════════════════════════ */
describe('4 ▸ Model Selection', () => {
  let dom, doc, win;

  beforeEach(() => { dom = createApp(); doc = dom.window.document; win = dom.window; });
  afterEach(() => dom.window.close());

  it('4.1 — Llama 3.3 70B should be the default selected model', () => {
    const checked = doc.querySelector('input[name="model"]:checked');
    assert.ok(checked, 'No model selected');
    assert.strictEqual(checked.value, 'llama-3.3-70b-versatile');
  });

  it('4.2 — should have exactly 3 model radio buttons', () => {
    const radios = doc.querySelectorAll('input[name="model"]');
    assert.strictEqual(radios.length, 3);
  });

  it('4.3 — user can select Llama 4 Scout', () => {
    const radio = doc.getElementById('modelLlama4Scout');
    radio.checked = true;
    fireChange(doc, 'modelLlama4Scout');
    const checked = doc.querySelector('input[name="model"]:checked');
    assert.strictEqual(checked.value, 'meta-llama/llama-4-scout-17b-16e-instruct');
  });

  it('4.4 — user can select Llama 3.3 70B', () => {
    const radio = doc.getElementById('modelLlama370b');
    radio.checked = true;
    fireChange(doc, 'modelLlama370b');
    const checked = doc.querySelector('input[name="model"]:checked');
    assert.strictEqual(checked.value, 'llama-3.3-70b-versatile');
  });

  it('4.5 — user can select Ollama (LOCAL)', () => {
    const radio = doc.getElementById('modelOllama');
    radio.checked = true;
    fireChange(doc, 'modelOllama');
    const checked = doc.querySelector('input[name="model"]:checked');
    assert.strictEqual(checked.value, 'ollama');
  });

  it('4.6 — selecting Ollama should show the Ollama sub-panel', () => {
    const radio = doc.getElementById('modelOllama');
    radio.checked = true;
    fireChange(doc, 'modelOllama');
    const panel = doc.getElementById('ollamaSubPanel');
    assert.ok(panel.classList.contains('visible'), 'Ollama sub-panel should be visible');
  });

  it('4.7 — selecting a GROQ model should hide the Ollama sub-panel', () => {
    // First select Ollama
    const ollamaRadio = doc.getElementById('modelOllama');
    ollamaRadio.checked = true;
    fireChange(doc, 'modelOllama');
    // Now switch to GROQ model
    const groqRadio = doc.getElementById('modelLlama370b');
    groqRadio.checked = true;
    fireChange(doc, 'modelLlama370b');
    const panel = doc.getElementById('ollamaSubPanel');
    assert.ok(!panel.classList.contains('visible'), 'Ollama sub-panel should be hidden');
  });

  it('4.8 — selected model should persist in localStorage', () => {
    const radio = doc.getElementById('modelLlama4Scout');
    radio.checked = true;
    fireChange(doc, 'modelLlama4Scout');
    assert.strictEqual(
      win.localStorage.getItem('tutor_model'),
      'meta-llama/llama-4-scout-17b-16e-instruct'
    );
  });

  it('4.9 — Ollama sub-panel should have model name and host URL inputs', () => {
    assert.ok(doc.getElementById('ollamaModel'), 'ollamaModel input missing');
    assert.ok(doc.getElementById('ollamaHost'),  'ollamaHost input missing');
  });

  it('4.10 — Ollama model name should default to "llama3"', () => {
    const input = doc.getElementById('ollamaModel');
    assert.strictEqual(input.value, 'llama3');
  });

  it('4.11 — Ollama host URL should default to "http://localhost:11434"', () => {
    const input = doc.getElementById('ollamaHost');
    assert.strictEqual(input.value, 'http://localhost:11434');
  });

  it('4.12 — decommissioned models should NOT be present', () => {
    const values = [...doc.querySelectorAll('input[name="model"]')].map(r => r.value);
    const decommissioned = [
      'meta-llama/llama-4-maverick-17b-128e-instruct',
      'llama3-8b-8192',
      'mixtral-8x7b-32768',
      'gemma2-9b-it',
      'deepseek-r1-distill-llama-70b',
      'qwen-qwq-32b',
    ];
    for (const model of decommissioned) {
      assert.ok(!values.includes(model), `Decommissioned model "${model}" should NOT exist`);
    }
  });
});

/* ═══════════════════════════════════════════════════════════════
   5. SYSTEM CONTEXT — Copy & Clear
   ═══════════════════════════════════════════════════════════════ */
describe('5 ▸ System Context', () => {
  let dom, doc, win;

  beforeEach(() => { dom = createApp(); doc = dom.window.document; win = dom.window; });
  afterEach(() => dom.window.close());

  it('5.1 — system context textarea should exist with default text', () => {
    const ta = doc.getElementById('systemContext');
    assert.ok(ta, 'systemContext textarea missing');
    assert.ok(ta.value.includes('helpful'), `Default value: "${ta.value}"`);
  });

  it('5.2 — clear button should empty the system context textarea', () => {
    const ta = doc.getElementById('systemContext');
    assert.ok(ta.value.length > 0, 'Should have default text');
    click(doc, 'clearSystemCtx');
    assert.strictEqual(ta.value, '');
  });

  it('5.3 — clear button should show "cleared" toast', () => {
    click(doc, 'clearSystemCtx');
    const toast = doc.getElementById('toast');
    assert.ok(toast.textContent.includes('System context cleared'));
  });

  it('5.4 — copy button should copy system context to clipboard', (done) => {
    click(doc, 'copySystemCtx');
    setTimeout(() => {
      const ta = doc.getElementById('systemContext');
      // clipboard was set before clear, so check default value was copied
      assert.ok(win.__clipboardContent !== undefined, 'Clipboard should have been written');
      done();
    }, 50);
  });

  it('5.5 — system context textarea should be editable', () => {
    const ta = doc.getElementById('systemContext');
    ta.value = 'New system context';
    assert.strictEqual(ta.value, 'New system context');
  });
});

/* ═══════════════════════════════════════════════════════════════
   6. USER PROMPT — Send, Stop, Clear, Copy, Token Estimation
   ═══════════════════════════════════════════════════════════════ */
describe('6 ▸ User Prompt', () => {
  let dom, doc, win;

  beforeEach(() => { dom = createApp(); doc = dom.window.document; win = dom.window; });
  afterEach(() => dom.window.close());

  /* ── Token counter ─────────────────────────────────────── */
  it('6.1 — token counter should show "0 chars" when prompt is empty', () => {
    const counter = doc.getElementById('tokenCounter');
    assert.strictEqual(counter.textContent, '0 chars');
  });

  it('6.2 — typing in prompt should update the token counter', () => {
    const ta = doc.getElementById('userPrompt');
    ta.value = 'Hello world, this is a test prompt!';
    fireInput(doc, 'userPrompt');
    const counter = doc.getElementById('tokenCounter');
    assert.ok(counter.textContent.includes('chars'), `Counter: "${counter.textContent}"`);
    assert.ok(counter.textContent.includes('tokens'), `Should show tokens: "${counter.textContent}"`);
    assert.ok(!counter.textContent.startsWith('0 chars'), 'Counter should not be zero');
  });

  it('6.3 — token estimation should be ~len/4', () => {
    const ta = doc.getElementById('userPrompt');
    ta.value = 'a'.repeat(100); // exactly 100 chars
    fireInput(doc, 'userPrompt');
    const counter = doc.getElementById('tokenCounter');
    // Should show 100 chars · ~25 tokens
    assert.ok(counter.textContent.includes('100'), 'Should show 100 chars');
    assert.ok(counter.textContent.includes('25'),  'Should show ~25 tokens');
  });

  /* ── Clear ──────────────────────────────────────────────── */
  it('6.4 — clear button should empty the user prompt', () => {
    const ta = doc.getElementById('userPrompt');
    ta.value = 'Some prompt text';
    click(doc, 'clearUserPrompt');
    assert.strictEqual(ta.value, '');
  });

  it('6.5 — clear should reset token counter to "0 chars"', () => {
    const ta = doc.getElementById('userPrompt');
    ta.value = 'Some prompt text';
    fireInput(doc, 'userPrompt');
    click(doc, 'clearUserPrompt');
    const counter = doc.getElementById('tokenCounter');
    assert.strictEqual(counter.textContent, '0 chars');
  });

  it('6.6 — clear should show "Prompt cleared" toast', () => {
    const ta = doc.getElementById('userPrompt');
    ta.value = 'Some text';
    click(doc, 'clearUserPrompt');
    const toast = doc.getElementById('toast');
    assert.ok(toast.textContent.includes('Prompt cleared'));
  });

  /* ── Copy ───────────────────────────────────────────────── */
  it('6.7 — copy button should copy user prompt to clipboard', (done) => {
    const ta = doc.getElementById('userPrompt');
    ta.value = 'Copy this prompt';
    click(doc, 'copyUserPrompt');
    setTimeout(() => {
      assert.strictEqual(win.__clipboardContent, 'Copy this prompt');
      done();
    }, 50);
  });

  /* ── Send button ────────────────────────────────────────── */
  it('6.8 — send button should exist and show "Send ✦"', () => {
    const label = doc.getElementById('sendBtnLabel');
    assert.strictEqual(label.textContent, 'Send ✦');
  });

  it('6.9 — send with empty prompt should show warning toast', () => {
    click(doc, 'sendBtn');
    const toast = doc.getElementById('toast');
    assert.ok(toast.textContent.includes('Please enter a prompt'));
  });

  it('6.10 — send with prompt but no API key should show "API key required" toast', () => {
    const ta = doc.getElementById('userPrompt');
    ta.value = 'What is AI?';
    click(doc, 'sendBtn');
    const toast = doc.getElementById('toast');
    assert.ok(toast.textContent.includes('API key required'));
  });

  it('6.11 — setBusy(true) should change button label to "Stop ◼"', () => {
    win.eval('setBusy(true)');
    const label = doc.getElementById('sendBtnLabel');
    assert.strictEqual(label.textContent, 'Stop ◼');
  });

  it('6.12 — setBusy(false) should restore button label to "Send ✦"', () => {
    win.eval('setBusy(true)');
    win.eval('setBusy(false)');
    const label = doc.getElementById('sendBtnLabel');
    assert.strictEqual(label.textContent, 'Send ✦');
  });

  it('6.13 — spinner should be visible when busy', () => {
    win.eval('setBusy(true)');
    const spinner = doc.getElementById('sendSpinner');
    assert.strictEqual(spinner.hidden, false);
  });

  it('6.14 — spinner should be hidden when not busy', () => {
    win.eval('setBusy(true)');
    win.eval('setBusy(false)');
    const spinner = doc.getElementById('sendSpinner');
    assert.strictEqual(spinner.hidden, true);
  });
});

/* ═══════════════════════════════════════════════════════════════
   7. MODEL RESPONSE — Edit, Copy, TXT & PDF Download
   ═══════════════════════════════════════════════════════════════ */
describe('7 ▸ Model Response', () => {
  let dom, doc, win;

  beforeEach(() => { dom = createApp(); doc = dom.window.document; win = dom.window; });
  afterEach(() => dom.window.close());

  /* ── Edit toggle ────────────────────────────────────────── */
  it('7.1 — response textarea should be read-only by default', () => {
    const ta = doc.getElementById('modelResponse');
    assert.strictEqual(ta.readOnly, true);
  });

  it('7.2 — clicking Edit should make response editable', () => {
    click(doc, 'editResponseBtn');
    const ta = doc.getElementById('modelResponse');
    assert.strictEqual(ta.readOnly, false);
  });

  it('7.3 — Edit button text should change to "🔒 Lock" when editable', () => {
    click(doc, 'editResponseBtn');
    const btn = doc.getElementById('editResponseBtn');
    assert.ok(btn.textContent.includes('Lock'), `Button says: "${btn.textContent}"`);
  });

  it('7.4 — clicking Edit again should lock the response', () => {
    click(doc, 'editResponseBtn');
    click(doc, 'editResponseBtn');
    const ta  = doc.getElementById('modelResponse');
    const btn = doc.getElementById('editResponseBtn');
    assert.strictEqual(ta.readOnly, true);
    assert.strictEqual(btn.textContent, 'Edit');
  });

  it('7.5 — editable class should toggle on response textarea', () => {
    const ta = doc.getElementById('modelResponse');
    click(doc, 'editResponseBtn');
    assert.ok(ta.classList.contains('editable'));
    click(doc, 'editResponseBtn');
    assert.ok(!ta.classList.contains('editable'));
  });

  it('7.6 — edit toast should confirm editable state', () => {
    click(doc, 'editResponseBtn');
    const toast = doc.getElementById('toast');
    assert.ok(toast.textContent.includes('editable'));
  });

  it('7.7 — lock toast should confirm locked state', () => {
    click(doc, 'editResponseBtn');
    click(doc, 'editResponseBtn');
    const toast = doc.getElementById('toast');
    assert.ok(toast.textContent.includes('locked'));
  });

  /* ── Copy ───────────────────────────────────────────────── */
  it('7.8 — copy with empty response should show warning', () => {
    click(doc, 'copyResponseBtn');
    const toast = doc.getElementById('toast');
    assert.ok(toast.textContent.includes('Nothing to copy'));
  });

  it('7.9 — copy with response text should copy to clipboard', (done) => {
    const ta = doc.getElementById('modelResponse');
    ta.value = 'AI is a fascinating field.';
    click(doc, 'copyResponseBtn');
    setTimeout(() => {
      assert.strictEqual(win.__clipboardContent, 'AI is a fascinating field.');
      done();
    }, 50);
  });

  /* ── TXT Download ───────────────────────────────────────── */
  it('7.10 — TXT download with empty response should show warning', () => {
    click(doc, 'downloadTxtBtn');
    const toast = doc.getElementById('toast');
    assert.ok(toast.textContent.includes('Nothing to download'));
  });

  it('7.11 — TXT download with content should show success toast', () => {
    // Stub the <a> click to avoid jsdom errors
    const origCreateEl = doc.createElement.bind(doc);
    doc.createElement = (tag) => {
      const el = origCreateEl(tag);
      if (tag === 'a') el.click = () => {}; // no-op
      return el;
    };
    const ta = doc.getElementById('modelResponse');
    ta.value = 'Response content for download';
    click(doc, 'downloadTxtBtn');
    const toast = doc.getElementById('toast');
    assert.ok(toast.textContent.includes('TXT downloaded'));
    doc.createElement = origCreateEl; // restore
  });

  /* ── PDF Download ───────────────────────────────────────── */
  it('7.12 — PDF download with empty response should show warning', () => {
    click(doc, 'downloadPdfBtn');
    const toast = doc.getElementById('toast');
    assert.ok(toast.textContent.includes('Nothing to export'));
  });

  it('7.13 — PDF download with content should trigger jsPDF save', () => {
    const ta = doc.getElementById('modelResponse');
    ta.value = 'Response for PDF export';
    click(doc, 'downloadPdfBtn');
    assert.ok(win.__pdfSaved, 'jsPDF save should have been called');
    assert.ok(win.__pdfSaved.startsWith('TutorAgent_Response_'));
    assert.ok(win.__pdfSaved.endsWith('.pdf'));
  });

  it('7.14 — PDF download should show success toast', () => {
    const ta = doc.getElementById('modelResponse');
    ta.value = 'Another PDF test';
    click(doc, 'downloadPdfBtn');
    const toast = doc.getElementById('toast');
    assert.ok(toast.textContent.includes('PDF exported successfully'));
  });

  /* ── Response meta ──────────────────────────────────────── */
  it('7.15 — response meta should be hidden initially', () => {
    const meta = doc.getElementById('responseMeta');
    assert.strictEqual(meta.hidden, true);
  });

  it('7.16 — showResponseMeta should display model tag and elapsed time', () => {
    win.eval('showResponseMeta("llama-3.3-70b-versatile", "1.23")');
    const meta = doc.getElementById('responseMeta');
    assert.strictEqual(meta.hidden, false);
    const tag  = doc.getElementById('responseModelTag');
    const time = doc.getElementById('responseTime');
    assert.ok(tag.textContent.includes('Llama 3.3 70B'));
    assert.ok(time.textContent.includes('1.23'));
  });

  it('7.17 — clearResponse should reset everything', () => {
    // First set some response state
    const ta = doc.getElementById('modelResponse');
    ta.value = 'Some response';
    click(doc, 'editResponseBtn');
    win.eval('showResponseMeta("llama-3.3-70b-versatile", "1.00")');
    // Now clear
    win.eval('clearResponse()');
    assert.strictEqual(ta.value, '');
    assert.strictEqual(ta.readOnly, true);
    assert.ok(!ta.classList.contains('editable'));
    assert.strictEqual(doc.getElementById('responseMeta').hidden, true);
    assert.strictEqual(doc.getElementById('editResponseBtn').textContent, 'Edit');
  });
});

/* ═══════════════════════════════════════════════════════════════
   8. MISCELLANEOUS TESTS
   ═══════════════════════════════════════════════════════════════ */
describe('8 ▸ Miscellaneous', () => {
  let dom, doc, win;

  beforeEach(() => { dom = createApp(); doc = dom.window.document; win = dom.window; });
  afterEach(() => dom.window.close());

  /* ── Toast ──────────────────────────────────────────────── */
  it('8.1 — showToast should display message and add "show" class', () => {
    win.eval('showToast("Test message")');
    const toast = doc.getElementById('toast');
    assert.strictEqual(toast.textContent, 'Test message');
    assert.ok(toast.classList.contains('show'));
  });

  /* ── Branding ───────────────────────────────────────────── */
  it('8.2 — page title should be "TutorAgent — AI Learning Assistant"', () => {
    assert.strictEqual(doc.title, 'TutorAgent — AI Learning Assistant');
  });

  it('8.3 — brand name should be visible in header', () => {
    const brandName = doc.querySelector('.brand-name');
    assert.ok(brandName, 'Brand name element missing');
    assert.strictEqual(brandName.textContent, 'TutorAgent');
  });

  it('8.4 — brand subtitle should say "AI Learning Assistant"', () => {
    const sub = doc.querySelector('.brand-sub');
    assert.ok(sub);
    assert.strictEqual(sub.textContent, 'AI Learning Assistant');
  });

  /* ── SEO / Meta ─────────────────────────────────────────── */
  it('8.5 — meta description should exist', () => {
    const meta = doc.querySelector('meta[name="description"]');
    assert.ok(meta, 'Meta description tag missing');
    assert.ok(meta.content.length > 10, 'Meta description should be meaningful');
  });

  it('8.6 — should have lang="en" on html element', () => {
    assert.strictEqual(doc.documentElement.lang, 'en');
  });

  /* ── Semantic / Accessibility ────────────────────────────── */
  it('8.7 — should have a header with role="banner"', () => {
    const header = doc.querySelector('header[role="banner"]');
    assert.ok(header, 'Banner header missing');
  });

  it('8.8 — should have a main with role="main"', () => {
    const main = doc.querySelector('main[role="main"]');
    assert.ok(main, 'Main role missing');
  });

  it('8.9 — should have a footer with role="contentinfo"', () => {
    const footer = doc.querySelector('footer[role="contentinfo"]');
    assert.ok(footer, 'Footer contentinfo missing');
  });

  it('8.10 — footer should contain copyright year 2026', () => {
    const footer = doc.querySelector('.app-footer');
    assert.ok(footer.textContent.includes('2026'));
  });

  it('8.11 — footer should mention GROQ & Ollama', () => {
    const footer = doc.querySelector('.app-footer');
    assert.ok(footer.textContent.includes('GROQ'));
    assert.ok(footer.textContent.includes('Ollama'));
  });

  /* ── Layout structure ───────────────────────────────────── */
  it('8.12 — should have a configuration panel (aside)', () => {
    const aside = doc.querySelector('aside.panel-config');
    assert.ok(aside, 'Config panel aside missing');
  });

  it('8.13 — should have a chat panel (section)', () => {
    const section = doc.querySelector('section.panel-chat');
    assert.ok(section, 'Chat panel section missing');
  });

  /* ── Toast element ──────────────────────────────────────── */
  it('8.14 — toast element should exist with role="status"', () => {
    const toast = doc.getElementById('toast');
    assert.ok(toast);
    assert.strictEqual(toast.getAttribute('role'), 'status');
  });

  it('8.15 — toast should have aria-live="polite"', () => {
    const toast = doc.getElementById('toast');
    assert.strictEqual(toast.getAttribute('aria-live'), 'polite');
  });

  /* ── MODEL_LABELS ───────────────────────────────────────── */
  it('8.16 — MODEL_LABELS should contain exactly 3 entries', () => {
    const labels = win.eval('MODEL_LABELS');
    assert.strictEqual(Object.keys(labels).length, 3);
  });

  it('8.17 — MODEL_LABELS should include "Ollama (LOCAL)"', () => {
    const labels = win.eval('MODEL_LABELS');
    assert.strictEqual(labels['ollama'], 'Ollama (LOCAL)');
  });

  /* ── Background orbs ────────────────────────────────────── */
  it('8.18 — animated background orbs should exist', () => {
    const orbs = doc.querySelectorAll('.orb');
    assert.strictEqual(orbs.length, 3, 'Should have 3 background orbs');
  });

  it('8.19 — bg-orbs container should have aria-hidden="true"', () => {
    const container = doc.querySelector('.bg-orbs');
    assert.strictEqual(container.getAttribute('aria-hidden'), 'true');
  });

  /* ── GROQ Console link ──────────────────────────────────── */
  it('8.20 — GROQ console link in hint text should open in new tab', () => {
    const link = doc.querySelector('.hint-text a');
    assert.ok(link);
    assert.strictEqual(link.getAttribute('target'), '_blank');
    assert.ok(link.getAttribute('rel').includes('noopener'));
  });

  /* ── Keyboard shortcuts ─────────────────────────────────── */
  it('8.21 — Ctrl+Enter on prompt should trigger send (validation fires)', () => {
    fireKeydown(doc, 'userPrompt', 'Enter', { ctrlKey: true });
    const toast = doc.getElementById('toast');
    // Should show "Please enter a prompt" since the prompt is empty
    assert.ok(toast.textContent.includes('Please enter a prompt'));
  });

  /* ── Streaming text effect ──────────────────────────────── */
  it('8.22 — streamTextEffect should progressively fill the response textarea', (done) => {
    const ta = doc.getElementById('modelResponse');
    win.eval('streamTextEffect("Hello AI World!")');
    // After enough time, the full text should appear
    setTimeout(() => {
      assert.ok(ta.value.length > 0, 'Response should have content');
      assert.ok(ta.value.includes('Hello'), `Got: "${ta.value}"`);
      done();
    }, 300);
  });

  /* ── dateStamp utility ──────────────────────────────────── */
  it('8.23 — dateStamp() should return a YYYYMMDD_HHMM format', () => {
    const stamp = win.eval('dateStamp()');
    assert.ok(/^\d{8}_\d{4}$/.test(stamp), `dateStamp returned: "${stamp}"`);
  });

  /* ── pad utility ────────────────────────────────────────── */
  it('8.24 — pad(5) should return "05"', () => {
    const result = win.eval('pad(5)');
    assert.strictEqual(result, '05');
  });

  it('8.25 — pad(12) should return "12"', () => {
    const result = win.eval('pad(12)');
    assert.strictEqual(result, '12');
  });
});
