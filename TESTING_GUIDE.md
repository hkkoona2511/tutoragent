# TutorAgent — Functionality Testing Guide

This document outlines the comprehensive functionality testing strategy for **TutorAgent**. It details the testing points for the application's core features as described in `Readme.md` and `TutorAgentSKILL.md`.

Since TutorAgent follows a **Monolithic Client-Side API Consumer** pattern with a stateless backend, the testing heavily focuses on client-side state management, DOM interactions, API integrations, and user experience features.

---

## 1. Test Environment Setup

The application uses Mocha and Chai in combination with `jsdom` to simulate a browser environment for comprehensive UI functionality testing.

### Installation
1. Ensure Node.js is installed.
2. Run `npm install` to install all dependencies, including testing libraries (`mocha`, `chai`, `jsdom`, `supertest`).

### Execution
Run the automated test suite using:
```bash
npm test
```
This executes both the server tests (`test/server.test.js`) and the comprehensive UI tests (`test/ui.test.js`).

---

## 2. Core Functionality Test Cases

The following test scenarios cover all critical functionalities of the TutorAgent application.

### 2.1. Configuration Panel (Left Pane)

**GROQ API Key Management**
- **Default State**: Input field is empty, type is `password`.
- **Toggle Visibility**: Clicking the "eye" icon toggles the input type between `password` and `text`, updating the icon and showing a toast notification.
- **Secure Storage**: Typing in the field saves the key securely to `sessionStorage` (not `localStorage`).
- **Copy Functionality**: Clicking the copy button copies the key to the clipboard. Shows a warning toast if empty.
- **Clear Functionality**: Clicking the clear (×) button empties the input, removes the key from `sessionStorage`, and focuses the field.

**Model Selection**
- **Default State**: Llama 3.3 70B is selected by default.
- **Model Switching**: Users can select between available cloud models (Llama 4 Scout, Llama 3.3 70B) and the local model (Ollama).
- **Persistence**: The selected model is saved to `localStorage` and restored on page reload.
- **Local Ollama Panel**: 
  - Selecting "Ollama (LOCAL)" dynamically displays the Ollama sub-panel (Model Name and Host URL inputs).
  - Selecting any GROQ cloud model hides the Ollama sub-panel.

### 2.2. Chat Interface (Right Pane)

**System Context**
- **Default State**: Populated with a default AI persona instruction.
- **Clear/Copy**: Can be cleared or copied to clipboard via dedicated icon buttons.

**User Prompt & Token Tracking**
- **Input & Estimation**: Typing in the prompt area dynamically updates the token counter. Token estimation uses a rough approximation of `(character count / 4)`.
- **Clear/Copy**: Dedicated buttons to clear the prompt (resetting token counter to 0) and copy the text.
- **Send Trigger**: The request can be sent by clicking "Send ✦" or by using the `Ctrl+Enter` (`Cmd+Enter` on Mac) keyboard shortcut.
- **Validation**:
  - Submitting an empty prompt displays a warning toast.
  - Submitting to a GROQ model without an API key displays a warning toast and focuses the key input.

**Model Response & Export Options**
- **Visual Streaming**: The response uses `streamTextEffect()` to simulate a typewriter effect across chunks using `setTimeout`.
- **Edit Mode**: By default, the response textarea is `readonly`. Clicking "Edit" toggles it to editable, changes the button text to "🔒 Lock", and applies styling changes.
- **Copy**: Copies the generated AI response to the clipboard.
- **TXT Export**: "↓ TXT" generates a Blob and triggers a plain text file download.
- **PDF Export**: "↓ PDF" utilizes `jsPDF` to generate a multi-page PDF document featuring headers, background colors, system context, and the response text.
- **Response Metadata**: Displays the selected model name and the elapsed request time upon completion.

### 2.3. Application State & Global UI

**Theme Toggling**
- **Switching**: Clicking the sun/moon icon switches between dark and light data-themes.
- **Persistence**: The theme choice is saved to `localStorage` and applied on initialization.
- **Accessibility**: The `aria-label` updates dynamically to reflect the action (e.g., "Switch to Light theme").

**Status Indicators**
- **States**: The header status dot and label dynamically change based on application state: `Ready` (blue), `Thinking…` (yellow/pulse), `Done` (green), `Error` (red), and `Stopped` (gray).
- **Busy State UI**: When busy, the send button text changes to "Stop ◼", and a loading spinner is visible.

**Request Cancellation**
- Native `AbortController` is used to cancel pending fetch requests.
- Triggered by clicking "Stop ◼" or pressing the `Escape` key.
- Displays a "Stopped by user" message in the response area and updates the status to `Stopped`.

**Notifications (Toasts)**
- Ephemeral, non-blocking toast notifications appear for user actions (copy success, errors, settings changes) and automatically disappear after 2.6 seconds.

---

## 3. Server Validation

TutorAgent employs a minimalistic backend for static serving. Tests ensure:
- `GET /` serves `index.html`.
- Static assets (`styles.css`, `app.js`) are served correctly with appropriate MIME types.
- A fallback wildcard route (`/*`) correctly serves `index.html` for unknown paths.

---

## 4. API Integration Expectations

While actual API calls are mocked or bypassed in unit tests, the integration logic expects:
- **GROQ API**: Sent to `https://api.groq.com/openai/v1/chat/completions` with a Bearer token.
- **Ollama API**: Sent to the user-defined host (default `http://localhost:11434/api/chat`) with no auth headers.
- Both integrations handle HTTP errors gracefully and parse the error messages into the UI response area.
