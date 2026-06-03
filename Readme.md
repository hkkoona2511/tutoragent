# TutorAgent — AI Learning Assistant

TutorAgent is an intelligent AI tutor web application powered by **GROQ LLMs** and local **Ollama models**. It provides a clean, responsive, and easy-to-use interface to ask questions, explore concepts, and get precise answers from state-of-the-art language models.

## ✨ Features

- **Multi-Model Support**: Access blazing-fast cloud models via GROQ (Llama 3.3, Llama 4).
- **Local Privacy**: Support for local models running via Ollama (e.g., Llama 3, Mistral) for offline, private use.
- **Customizable Context**: Define the AI's persona, goals, and constraints with a customizable System Context.
- **Export Options**: Easily copy responses, or export them as `.txt` or `.pdf` files.
- **Modern UI**: A beautiful, glassmorphism-inspired UI with light and dark mode support.
- **Token Tracking**: Real-time prompt length monitoring.

---

## 🚀 Installation & Setup

### Running Locally (Node.js)

1. **Clone the repository** (if you haven't already).
2. **Install dependencies**:
   Ensure you have [Node.js](https://nodejs.org/) installed, then run:
   ```bash
   npm install
   ```
3. **Start the server**:
   ```bash
   npm start
   ```
4. Open your browser and navigate to **`http://localhost:5500`**.

### Running with Docker

1. **Build the Docker image**:
   ```bash
   docker build -t tutor-agent .
   ```
2. **Run the Docker container**:
   ```bash
   docker run -p 5500:5500 tutor-agent
   ```
3. Open your browser and navigate to **`http://localhost:5500`**.

---

## 📖 Application User Guide

### 1. Configuration (Left Panel)

Before you start asking questions, you need to configure your model.

*   **GROQ API Key (Cloud Models)**
    *   If you plan to use GROQ models, paste your API key in the `GROQ API Key` field.
    *   You can obtain a free API key from the [GROQ Console](https://console.groq.com/keys).
    *   Your API key is only used locally in your browser and is not stored on any server.

*   **Model Selection**
    *   **☁️ GROQ Cloud**: Select from high-performance models like Llama 4 Scout and Llama 3.3 70B. These require a GROQ API Key.
    *   **🏠 Local (Ollama)**: Choose this option if you want to run models locally on your machine.
        *   You must have [Ollama](https://ollama.com/) installed and running locally.
        *   Specify the **Ollama Model Name** (e.g., `llama3`) and the **Host URL** (defaults to `http://localhost:11434`).

### 2. Chat Interface (Right Panel)

*   **System Context**
    *   Use this field to instruct the AI on *how* to behave. 
    *   *Example*: "You are an expert Python tutor. Explain concepts using simple analogies."
    
*   **User Prompt**
    *   Type your question, code snippet, or topic you want to learn about here.
    *   Click the **Send ✦** button to submit your prompt to the selected model.

*   **Model Response**
    *   The AI's answer will appear in this section.
    *   **Export Tools**: Use the buttons in the top right of the response block to:
        *   **Edit**: Toggle edit mode to manually adjust the response text.
        *   **Copy**: Copy the response to your clipboard.
        *   **↓ TXT**: Download the response as a plain text file.
        *   **↓ PDF**: Export the response as a nicely formatted PDF document.

### 3. Theme Toggle

*   Click the sun/moon icon in the top right corner of the application to switch between Light and Dark themes to suit your preference.
