# ROBIT AI Workspace

ROBIT is an advanced, privacy-first local AI Workspace. It is built to serve as a comprehensive desktop-like environment for interacting with large language models entirely on your local machine. It combines local LLM inference with modern web technologies to provide a secure and robust ecosystem for document analysis, research, and software planning without ever sending your sensitive data to the cloud.

## Features & Use Cases

- **Privacy-First Data Analysis (Local RAG)**
  Chat with your sensitive documents securely. Drag and drop PDFs, Markdown, TXT, and Code files directly into the Local RAG Engine. ROBIT will index and search through your files locally, providing accurate answers based entirely on your proprietary data.

- **Automated Web Research**
  Give ROBIT a topic, and the Web Research mode will autonomously browse the internet, scrape current information, and synthesize reports. Perfect for gathering the latest data on fast-moving topics.

- **AI OCR Extractor**
  Quickly digitize physical documents. Drag and drop images, screenshots, or receipts, and ROBIT's Vision AI will extract the text for immediate editing or processing.

- **Software Architecture & Coding Planning**
  An integrated workspace dedicated to software development planning. Draft architectures, map out project structures, and outline codebase changes securely before writing any code.

- **AI Translation**
  A fast, local translation interface for quickly translating text without relying on external translation APIs.

- **Hardware Detection & Model Advisor (WhichLLM)**
  ROBIT automatically analyzes your local system hardware (Total RAM, Free RAM, and GPU) to recommend the optimal local models (GGUF format).

## Tech Stack

- **Framework**: Astro (Static Site Generation)
- **UI**: React 18 & TailwindCSS v3
- **State Management**: React Query

## Project Structure

```text
/
├── public/                 # Static assets
├── src/
│   ├── components/         # Core React UI Modules (ChatArea, RAG, OCR, etc.)
│   ├── hooks/              # Custom React Hooks
│   ├── layouts/            # Astro Layouts
│   ├── pages/              # Routing
│   └── styles/             # Global CSS
└── package.json
```

## Commands

Run all commands from the root of the `ui` directory:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Builds the production UI to the `./dist/` folder |
| `npm run preview`         | Previews your build locally                      |
