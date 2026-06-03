/* ═══════════════════════════════════════════════════════════
   TutorAgent — app.js
   Handles: GROQ API calls, Ollama local, UI state, copy/edit,
            TXT/PDF download, token counter, toast, streaming sim
   ═══════════════════════════════════════════════════════════ */

'use strict';

/* ── DOM refs ─────────────────────────────────────────────── */
const $ = id => document.getElementById(id);

const groqApiKeyInput    = $('groqApiKey');
const toggleKeyBtn       = $('toggleKeyVisibility');
const copyApiKeyBtn      = $('copyApiKey');
const eyeIcon            = $('eyeIcon');

const modelRadios        = document.querySelectorAll('input[name="model"]');
const ollamaSubPanel     = $('ollamaSubPanel');
const ollamaModelInput   = $('ollamaModel');
const ollamaHostInput    = $('ollamaHost');

const systemCtxTA        = $('systemContext');
const clearSystemCtxBtn  = $('clearSystemCtx');
const copySystemCtxBtn   = $('copySystemCtx');

const userPromptTA       = $('userPrompt');
const clearUserPromptBtn = $('clearUserPrompt');
const copyUserPromptBtn  = $('copyUserPrompt');
const tokenCounter       = $('tokenCounter');

const sendBtn            = $('sendBtn');
const sendBtnLabel       = $('sendBtnLabel');
const sendSpinner        = $('sendSpinner');

const modelResponseTA    = $('modelResponse');
const editResponseBtn    = $('editResponseBtn');
const copyResponseBtn    = $('copyResponseBtn');
const downloadTxtBtn     = $('downloadTxtBtn');
const downloadPdfBtn     = $('downloadPdfBtn');
const responseMeta       = $('responseMeta');
const responseModelTag   = $('responseModelTag');
const responseTime       = $('responseTime');

const statusDot          = $('statusDot');
const statusLabel        = $('statusLabel');
const toast              = $('toast');
const themeToggleBtn     = $('themeToggleBtn');

/* ── State ────────────────────────────────────────────────── */
let isBusy        = false;
let isResponseEditable = false;
let abortCtrl     = null;
let streamTimeout = null;

/* ── GROQ Models map (value → display name) ──────────────── */
const MODEL_LABELS = {
  'meta-llama/llama-4-scout-17b-16e-instruct':    'Llama 4 Scout · GROQ',
  'meta-llama/llama-4-maverick-17b-128e-instruct':'Llama 4 Maverick · GROQ',
  'llama-3.3-70b-versatile':                       'Llama 3.3 70B · GROQ',
  'llama3-8b-8192':                                'Llama 3 8B · GROQ',
  'mixtral-8x7b-32768':                            'Mixtral 8×7B · GROQ',
  'gemma2-9b-it':                                  'Gemma 2 9B · GROQ',
  'deepseek-r1-distill-llama-70b':                 'DeepSeek R1 70B · GROQ',
  'qwen-qwq-32b':                                  'Qwen QwQ 32B · GROQ',
  'ollama':                                        'Ollama (LOCAL)',
};

/* ═══════════════════════════════════════════════════════════
   INIT — restore saved state
   ═══════════════════════════════════════════════════════════ */
(function init() {
  // Restore API key from sessionStorage (not localStorage for security)
  const savedKey = sessionStorage.getItem('tutor_groq_key');
  if (savedKey) groqApiKeyInput.value = savedKey;

  // Restore last selected model
  const savedModel = localStorage.getItem('tutor_model');
  if (savedModel) {
    const radio = document.querySelector(`input[name="model"][value="${savedModel}"]`);
    if (radio) radio.checked = true;
  }

  // Show/hide ollama panel
  updateOllamaPanel();

  // Restore theme preference
  const savedTheme = localStorage.getItem('tutor_theme') ?? 'dark';
  applyTheme(savedTheme);

  // Set status
  setStatus('ready', 'Ready');

  // Token counter update
  updateTokenCounter();
})();

/* ══════════════════════════════════════════════════════════
   THEME TOGGLE
   ══════════════════════════════════════════════════════════ */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  // Update aria label
  themeToggleBtn.setAttribute('aria-label',
    theme === 'light' ? 'Switch to Dark theme' : 'Switch to Light theme'
  );
}

themeToggleBtn.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme') ?? 'dark';
  const next    = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  localStorage.setItem('tutor_theme', next);
  showToast(next === 'light' ? '☀️ Switched to Light theme' : '🌙 Switched to Dark theme');
});

/* ══════════════════════════════════════════════════════════
   STATUS HELPERS
   ══════════════════════════════════════════════════════════ */
function setStatus(state, label) {
  statusDot.className   = `status-dot ${state}`;
  statusLabel.textContent = label;
}

/* ═══════════════════════════════════════════════════════════
   TOAST
   ═══════════════════════════════════════════════════════════ */
let toastTimer = null;
function showToast(msg, duration = 2600) {
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), duration);
}

/* ═══════════════════════════════════════════════════════════
   API KEY — toggle visibility & copy
   ═══════════════════════════════════════════════════════════ */
toggleKeyBtn.addEventListener('click', () => {
  const isHidden = groqApiKeyInput.type === 'password';
  groqApiKeyInput.type = isHidden ? 'text' : 'password';
  eyeIcon.innerHTML = isHidden
    ? /* eye-off */
      `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>`
    : /* eye */
      `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`;
  showToast(isHidden ? '🔓 Key visible' : '🔒 Key hidden');
});

groqApiKeyInput.addEventListener('input', () => {
  sessionStorage.setItem('tutor_groq_key', groqApiKeyInput.value.trim());
});

copyApiKeyBtn.addEventListener('click', async () => {
  const key = groqApiKeyInput.value.trim();
  if (!key) { showToast('⚠️ No API key to copy'); return; }
  await copyToClipboard(key, '🔑 API key copied');
});

/* ═══════════════════════════════════════════════════════════
   MODEL SELECTION
   ═══════════════════════════════════════════════════════════ */
modelRadios.forEach(radio => {
  radio.addEventListener('change', () => {
    localStorage.setItem('tutor_model', radio.value);
    updateOllamaPanel();
  });
});

function selectedModel() {
  return document.querySelector('input[name="model"]:checked')?.value ?? 'llama-3.3-70b-versatile';
}

function updateOllamaPanel() {
  const isOllama = selectedModel() === 'ollama';
  ollamaSubPanel.classList.toggle('visible', isOllama);
}

/* ═══════════════════════════════════════════════════════════
   SYSTEM CONTEXT
   ═══════════════════════════════════════════════════════════ */
clearSystemCtxBtn.addEventListener('click', () => {
  systemCtxTA.value = '';
  systemCtxTA.focus();
  showToast('🧹 System context cleared');
});

copySystemCtxBtn.addEventListener('click', async () => {
  await copyToClipboard(systemCtxTA.value, '📋 System context copied');
});

/* ═══════════════════════════════════════════════════════════
   USER PROMPT + TOKEN COUNTER
   ═══════════════════════════════════════════════════════════ */
clearUserPromptBtn.addEventListener('click', () => {
  userPromptTA.value = '';
  updateTokenCounter();
  userPromptTA.focus();
  showToast('🧹 Prompt cleared');
});

copyUserPromptBtn.addEventListener('click', async () => {
  await copyToClipboard(userPromptTA.value, '📋 Prompt copied');
});

userPromptTA.addEventListener('input', updateTokenCounter);

function updateTokenCounter() {
  const len  = userPromptTA.value.length;
  const toks = Math.ceil(len / 4);   // rough approx: ~4 chars per token
  tokenCounter.textContent = len === 0
    ? '0 chars'
    : `${len.toLocaleString()} chars · ~${toks.toLocaleString()} tokens`;
}

/* ═══════════════════════════════════════════════════════════
   SEND / MAIN ACTION
   ═══════════════════════════════════════════════════════════ */
sendBtn.addEventListener('click', handleSend);

// Ctrl+Enter / Cmd+Enter shortcut in the user prompt
userPromptTA.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    handleSend();
  }
});

async function handleSend() {
  if (isBusy) {
    // Second click = abort
    abortCtrl?.abort();
    return;
  }

  const model      = selectedModel();
  const apiKey     = groqApiKeyInput.value.trim();
  const systemCtx  = systemCtxTA.value.trim();
  const userPrompt = userPromptTA.value.trim();

  // Validation
  if (!userPrompt) {
    showToast('⚠️ Please enter a prompt');
    userPromptTA.focus();
    return;
  }
  if (model !== 'ollama' && !apiKey) {
    showToast('⚠️ GROQ API key required');
    groqApiKeyInput.focus();
    return;
  }

  // Lock UI
  setBusy(true);
  clearResponse();
  setStatus('busy', 'Thinking…');

  const t0 = performance.now();

  try {
    let responseText;
    if (model === 'ollama') {
      responseText = await callOllama(systemCtx, userPrompt);
    } else {
      responseText = await callGroq(apiKey, model, systemCtx, userPrompt);
    }
    await streamTextEffect(responseText);
    const elapsed = ((performance.now() - t0) / 1000).toFixed(2);
    showResponseMeta(model, elapsed);
    setStatus('ready', 'Done');
    showToast(`✅ Response received in ${elapsed}s`);
  } catch (err) {
    if (err.name === 'AbortError') {
      modelResponseTA.value += '\n\n[Stopped by user]';
      setStatus('ready', 'Stopped');
      showToast('⛔ Request cancelled');
    } else {
      const msg = extractErrorMessage(err);
      modelResponseTA.value = `❌ Error: ${msg}`;
      setStatus('error', 'Error');
      showToast(`❌ ${msg}`, 4000);
    }
  } finally {
    setBusy(false);
  }
}

/* ── GROQ API call ─────────────────────────────────────────── */
async function callGroq(apiKey, model, systemCtx, userPrompt) {
  abortCtrl = new AbortController();

  const messages = [];
  if (systemCtx) messages.push({ role: 'system', content: systemCtx });
  messages.push({ role: 'user', content: userPrompt });

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    signal: abortCtrl.signal,
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens:  4096,
      stream:      false,
    }),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody?.error?.message ?? `HTTP ${res.status}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '(empty response)';
}

/* ── Ollama local API call ─────────────────────────────────── */
async function callOllama(systemCtx, userPrompt) {
  abortCtrl   = new AbortController();
  const host  = ollamaHostInput.value.trim().replace(/\/$/, '');
  const model = ollamaModelInput.value.trim() || 'llama3';

  const messages = [];
  if (systemCtx) messages.push({ role: 'system', content: systemCtx });
  messages.push({ role: 'user', content: userPrompt });

  const res = await fetch(`${host}/api/chat`, {
    method: 'POST',
    signal: abortCtrl.signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, stream: false }),
  });

  if (!res.ok) throw new Error(`Ollama HTTP ${res.status} — is it running?`);

  const data = await res.json();
  return data?.message?.content ?? '(empty response)';
}

/* ═══════════════════════════════════════════════════════════
   STREAMING TEXT EFFECT (visual typewriter)
   ═══════════════════════════════════════════════════════════ */
function streamTextEffect(fullText) {
  return new Promise(resolve => {
    modelResponseTA.classList.add('typing-cursor');
    let i = 0;
    const chunkSize = 8;  // chars per tick

    function tick() {
      if (i >= fullText.length) {
        modelResponseTA.classList.remove('typing-cursor');
        resolve();
        return;
      }
      const slice = fullText.slice(i, i + chunkSize);
      modelResponseTA.value += slice;
      i += chunkSize;
      // Auto-scroll to bottom
      modelResponseTA.scrollTop = modelResponseTA.scrollHeight;
      streamTimeout = setTimeout(tick, 12);
    }
    tick();
  });
}

/* ═══════════════════════════════════════════════════════════
   RESPONSE BLOCK — Edit, Copy, Download TXT/PDF
   ═══════════════════════════════════════════════════════════ */

/* Toggle editable */
editResponseBtn.addEventListener('click', () => {
  isResponseEditable = !isResponseEditable;
  modelResponseTA.readOnly = !isResponseEditable;
  modelResponseTA.classList.toggle('editable', isResponseEditable);
  editResponseBtn.textContent = isResponseEditable ? '🔒 Lock' : 'Edit';
  if (isResponseEditable) modelResponseTA.focus();
  showToast(isResponseEditable ? '✏️ Response is now editable' : '🔒 Response locked');
});

/* Copy response */
copyResponseBtn.addEventListener('click', async () => {
  const text = modelResponseTA.value.trim();
  if (!text) { showToast('⚠️ Nothing to copy'); return; }
  await copyToClipboard(text, '📋 Response copied');
});

/* Download as .txt */
downloadTxtBtn.addEventListener('click', () => {
  const text = modelResponseTA.value.trim();
  if (!text) { showToast('⚠️ Nothing to download'); return; }
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  triggerDownload(blob, `TutorAgent_Response_${dateStamp()}.txt`);
  showToast('⬇️ TXT downloaded');
});

/* Export as PDF via jsPDF */
downloadPdfBtn.addEventListener('click', () => {
  const text = modelResponseTA.value.trim();
  if (!text) { showToast('⚠️ Nothing to export'); return; }

  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });

    // Header
    doc.setFillColor(13, 21, 37);
    doc.rect(0, 0, 210, 297, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(129, 140, 248);
    doc.text('TutorAgent — AI Response', 14, 20);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(139, 160, 204);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);

    const model = selectedModel();
    doc.text(`Model: ${MODEL_LABELS[model] ?? model}`, 14, 34);

    // System context (if any)
    const sysCtx = systemCtxTA.value.trim();
    let yPos = 42;
    if (sysCtx) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(200, 210, 255);
      doc.text('System Context:', 14, yPos);
      yPos += 6;

      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.setTextColor(139, 160, 204);
      const sysLines = doc.splitTextToSize(sysCtx, 182);
      doc.text(sysLines, 14, yPos);
      yPos += sysLines.length * 5 + 6;
    }

    // Divider line
    doc.setDrawColor(80, 100, 180);
    doc.setLineWidth(0.3);
    doc.line(14, yPos, 196, yPos);
    yPos += 8;

    // Response body
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(200, 220, 255);
    doc.text('Response:', 14, yPos);
    yPos += 7;

    doc.setFont('courier', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(220, 230, 255);

    const pageH   = 297;
    const margin  = 14;
    const maxW    = 182;
    const lineH   = 5.2;
    const maxY    = pageH - 16;

    const lines = doc.splitTextToSize(text, maxW);
    for (const line of lines) {
      if (yPos + lineH > maxY) {
        doc.addPage();
        // Re-apply dark background on new page
        doc.setFillColor(13, 21, 37);
        doc.rect(0, 0, 210, 297, 'F');
        yPos = 16;
        doc.setFont('courier', 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(220, 230, 255);
      }
      doc.text(line, margin, yPos);
      yPos += lineH;
    }

    // Footer on each page
    const totalPages = doc.internal.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(75, 96, 144);
      doc.text(`TutorAgent — Page ${p} of ${totalPages}`, 14, 293);
      doc.text('github.com/your-org/tutoragent', 120, 293);
    }

    doc.save(`TutorAgent_Response_${dateStamp()}.pdf`);
    showToast('📄 PDF exported successfully');
  } catch (err) {
    console.error('PDF export error:', err);
    showToast('❌ PDF export failed: ' + err.message, 4000);
  }
});

/* ═══════════════════════════════════════════════════════════
   UI HELPERS
   ═══════════════════════════════════════════════════════════ */

function setBusy(busy) {
  isBusy = busy;
  sendBtn.disabled = false;  // always clickable (second click = abort)
  sendBtnLabel.textContent = busy ? 'Stop ◼' : 'Send ✦';
  sendSpinner.hidden = !busy;
  if (!busy) clearTimeout(streamTimeout);
}

function clearResponse() {
  modelResponseTA.value = '';
  modelResponseTA.classList.remove('typing-cursor', 'editable');
  modelResponseTA.readOnly = true;
  isResponseEditable = false;
  editResponseBtn.textContent = 'Edit';
  responseMeta.hidden = true;
}

function showResponseMeta(model, elapsed) {
  responseModelTag.textContent = MODEL_LABELS[model] ?? model;
  responseTime.textContent     = `⏱ ${elapsed}s`;
  responseMeta.hidden = false;
}

function extractErrorMessage(err) {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return 'Unknown error';
}

function dateStamp() {
  const d = new Date();
  return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
}
function pad(n) { return String(n).padStart(2, '0'); }

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a   = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

async function copyToClipboard(text, successMsg) {
  try {
    await navigator.clipboard.writeText(text);
    showToast(successMsg ?? '📋 Copied!');
  } catch {
    // Fallback for non-secure context
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
    showToast(successMsg ?? '📋 Copied!');
  }
}

/* ── Keyboard shortcut reminder ─────────────────────────── */
document.addEventListener('keydown', e => {
  // Escape → cancel request
  if (e.key === 'Escape' && isBusy) {
    abortCtrl?.abort();
  }
});

console.log('%cTutorAgent 🤖 ready. Press Ctrl+Enter in the prompt box to send.', 
  'color:#818cf8;font-weight:bold;font-size:13px;');
