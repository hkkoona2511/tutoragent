# TutorAgent - Technical Skill Profile

This document outlines the technical architecture, design patterns, technology stack, and core functionalities of the **TutorAgent** project. It serves as a developer-centric guide to understanding how the application is built and operates.

---

## 1. Project Overview

**TutorAgent** is a lightweight, frontend-heavy web application that interfaces directly with Large Language Models (LLMs). It acts as an AI learning assistant. It provides a split-pane UI where users can configure their AI model parameters (API keys, cloud vs local models) on the left, and interact with the AI through a chat interface on the right.

## 2. Technology Stack

*   **Frontend**: 
    *   Vanilla HTML5 (Semantic HTML, Accessible ARIA attributes)
    *   Vanilla CSS3 (Custom properties for theming, Glassmorphism design, Flexbox/Grid layouts)
    *   Vanilla JavaScript (ES6+, asynchronous operations, DOM manipulation)
*   **Backend (Serving)**:
    *   Node.js with Express.js (`^4.18.2`)
    *   Minimal backend used strictly for serving static files (HTML, CSS, JS).
*   **APIs & Integrations**:
    *   **GROQ API**: For cloud-based, high-speed inference.
    *   **Ollama API**: For local, privacy-first inference.
*   **Libraries (Client-side)**:
    *   `jsPDF` (loaded via CDN) for generating PDF exports of chat responses.

## 3. Architecture & Design Patterns

The application follows a **Monolithic Client-Side API Consumer** pattern.

*   **Stateless Backend**: The Node/Express server does not manage sessions, database states, or proxy API requests. Its sole responsibility is to serve the application shell.
*   **Direct-to-API Frontend**: The client-side JavaScript (`app.js`) directly manages network requests to third-party LLM providers (GROQ) and local LLM services (Ollama). 
*   **Event-Driven DOM Updates**: The UI is updated reactively based on user events (clicks, keypresses) and network state changes (loading, streaming, completed, error).
*   **Local State Management**: Application state (API keys, theme preferences, selected models) is persisted using the browser's `localStorage` and `sessionStorage`.

## 4. Core Components

### 4.1. `app.js` (Application Logic)
The core engine of the frontend. Key responsibilities include:
*   **State Management**: Tracks `isBusy`, `isResponseEditable`, and holds the `AbortController` for cancelling requests.
*   **DOM Binding**: Selects and caches DOM elements, attaching event listeners for UI interaction.
*   **Network Layer**: Contains the `callGroq()` and `callOllama()` asynchronous functions that format messages and construct `fetch` requests.
*   **UI Effects**: Implements a `streamTextEffect` which simulates a typewriter effect by chunking the full text response over `setTimeout` loops. Also manages a custom toast notification system (`showToast()`) and Light/Dark theme toggling.
*   **Export Utilities**: Uses the browser's `Blob` API to trigger `.txt` downloads and utilizes `jsPDF` to manually draw text, headers, and backgrounds onto a PDF canvas.

### 4.2. `index.html` (Application Shell)
*   Implements a responsive, grid-based split layout.
*   Uses `aria-*` tags extensively for accessibility (e.g., `aria-live`, `aria-hidden`, `role="radiogroup"`).
*   Includes embedded SVG icons to minimize external asset requests.

### 4.3. `server.js` (Web Server)
*   A basic Express server running on port 5500 (or `process.env.PORT`).
*   Uses `express.static` to serve the project root.
*   Includes a wildcard fallback route (`app.get('*')`) that returns `index.html` for any unmatched route.

### 4.4. `styles.css` (Styling & Theming)
*   Uses CSS Variables (`:root` and `[data-theme="light"]`) to define color palettes.
*   Implements **Glassmorphism** via `backdrop-filter: blur()`, semi-transparent backgrounds, and subtle borders.
*   Contains keyframe animations for the animated background orbs and UI elements like the loading spinner and typewriter cursor.

## 5. API Integration Details

### GROQ Cloud API (`https://api.groq.com/openai/v1/chat/completions`)
*   **Auth**: Bearer token via the user-provided API key.
*   **Supported Models**: Configured to use `meta-llama/llama-4-scout-17b-16e-instruct` and `llama-3.3-70b-versatile`.
*   **Format**: OpenAI-compatible JSON payload (`model`, `messages`, `temperature`, `max_tokens`).
*   **Handling**: Awaits the full response payload (streaming is set to `false` in the code, and simulated visually on the frontend).

### Ollama Local API (`http://localhost:11434/api/chat`)
*   **Auth**: None required (local).
*   **Format**: Standard Ollama JSON payload (`model`, `messages`).
*   **Handling**: Connects to the user-defined host and model name. Requires Ollama to be actively running on the host machine.

## 6. Key Functionalities

1.  **Token Estimation**: `updateTokenCounter()` provides a rough estimate of prompt tokens by dividing character count by 4.
2.  **Request Cancellation**: Uses the native `AbortController` API to allow users to cancel long-running requests by clicking the 'Stop' button or pressing `Escape`.
3.  **PDF Export**: Manually calculates page heights, splits text into chunks using `doc.splitTextToSize()`, and handles multi-page rendering using `jsPDF`.
4.  **Secure Storage**: The GROQ API key is stored in `sessionStorage` (cleared when the tab closes) rather than `localStorage` to prevent long-term credential leakage. Theme and model preferences are kept in `localStorage`.
