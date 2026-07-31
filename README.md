# PrepMaster AI 🎓💼🤖

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.0-61dafb.svg)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind--CSS-4.0-38bdf8.svg)](https://tailwindcss.com/)
[![Express.js](https://img.shields.io/badge/Express-4.x-green.svg)](https://expressjs.com/)
[![Gemini API](https://img.shields.io/badge/Google--Gemini-API-orange.svg)](https://ai.google.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

**PrepMaster AI** is an elite, full-stack, AI-powered preparation suite designed to optimize study habits, elevate retention, and build professional confidence for high-stakes certification examinations and modern tech interviews. 

Featuring specialized tracks for **Generative AI Developers**, **Data Science Professionals**, and **Systems Architects**, the system acts as a personalized study co-pilot that evaluates CVs, generates custom syllabi, administers interactive quizzes, and guides live mock interviews.

---

## 🗺️ Functional Overview

PrepMaster AI delivers a dual-engine workspace, combining structured certification practice with a dynamic, AI-guided career coaching environment:

### 1. Unified Home Hub Navigation
*   **Dual-Track Workspace**: Instantly toggle between **Certification Exam Rooms** (for standard syllabus preparation) and the **AI Placement & Interview Suite** (for custom role preparation).
*   **Persistent Performance Trackers**: Tracks study progress, accuracies, and question history independently across both modes.

### 2. Certification Exam Rooms
*   **Realistic Exam Simulators**: Interactive practice zones loaded with real-world examination scenarios.
*   **Active Recall Navigation Sheet**: A dedicated navigation rail grouping questions in collapsible 50-item batches to jump instantly between problems.
*   **Adaptive Spot Grader**: Instantly grades choices, streams concise justifications, and logs results in real-time.

### 3. AI Interview Placement Suite
*   **4-Step Recruiter Consultation Wizard**:
    1.  *CV/Resume Intake*: Pastes plain text or processes resume uploads.
    2.  *Recruiter Evaluation*: Evaluates fit across seniorities (Junior, Mid, Senior, Principal) for specialized roles (e.g., *Generative AI Engineer*, *Lead Data Scientist*, *AI Solutions Architect*).
    3.  *Interactive Prep Consultation*: Converse with the AI coach or paste custom syllabi. Focus areas dynamically adapt to selected career paths.
    4.  *Syllabus Compiling & Locking*: Saves snapshot memory logs and outputs an immersive **8 to 15 key chapter bento map**.
*   **Dynamic Bento-Style Roadmap**: A highly interactive visual grid presenting chapters. Clicking a card opens:
    *   *Key Concept Explanations*: Comprehensive, text-book quality summaries, design-tradeoffs, and trap questions.
    *   *Study Notes Companion*: Take, edit, and persist custom notes for each chapter.
    *   *Targeted Google Search Anchors*: One-click search anchors mapping to official API guides and papers.
*   **Live Syllabus Re-writing**: Update your study map on the fly! Submit natural language instructions (e.g., *"Focus more on fine-tuning LLMs with LoRA"* or *"Add a behavioral STAR interview chapter"*) to dynamically restructure your bento board layout.
*   **Side-by-Side Tutor Chat**: A dedicated AI chatbot attached directly to each study module for real-time code debugging and conceptual deep-dives.
*   **10-Question MCQ Quizzes**: On-demand, topic-specific quizzes with full question-state persistence.

### 4. Durable Cloud Persistence & Multi-Tenant Isolation
*   **Production-Grade Firestore Integration**: Integrates directly with **Google Cloud Firestore**. Learning rooms, customized recruiter syllabi, notes, and quiz metrics are written directly to Firestore collections.
*   **Zero-Downtime Local JSON Fallback**: If Firestore credentials are not set up or are unreachable, the server automatically degrades gracefully to a stateless local JSON fallback cache (`src/db.json`). This protects the app from crashing and ensures high availability.
*   **Resilient Device ID Bridging**: Progress is securely isolated using a client-side Workspace ID (`deviceId`). Switching, pairing, or restoring workspaces across browsers and mobile phones is simple by copy-pasting the matching ID.
*   **Development Phase vs. Production Phase Toggle**: 
    *   **Development Phase (Sync Unlocked)**: Unlocks the workspace. Developers can manually enter custom Workspace IDs, select from active discovered workspace profiles queried dynamically from Cloud Firestore, or search & permanently cascade-delete old development profiles directly from the UI.
    *   **Production Phase (Sync Locked)**: Lock down the workspace ID for tenant-level isolation and safety, protecting production workspaces from accidental sync overrides.

### 5. High-Availability & Dual-Theme Core
*   **Zero-Downtime Redirection Shield**: Automatically routes queries to `gemini-3.1-flash-lite` if the primary `gemini-3.5-flash` model faces quota exhaustion or rate limits, isolating errors as clean system notifications.
*   **Unified Dual-Theme Engine**: Single global light/dark visual state synchronized instantly across all sub-apps, saving visual preferences to `localStorage` to avoid page-flickers.

---

## ⚙️ Project File Structure

```text
prepmaster/
├── src/
│   ├── components/
│   │   ├── PracticeSession.tsx  # Certification exam suite, navigation panel, hotkeys & spot grader
│   │   └── InterviewPrep.tsx    # Interview prep suite, Recruiter wizard, bento board, chats & quizzes
│   ├── types.ts                 # Strongly-typed data schemas for exams and interview structures
│   ├── parser.ts                # Deterministic Regex & Gemini-assisted file and document parser
│   ├── ai_service.ts            # Server-side Gemini API client, failover wrappers, and prompt layouts
│   ├── db.ts                    # Ultra-fast JSON flat-file storage manager
│   ├── offlineCache.ts          # LocalStorage safety cache fallbacks
│   ├── main.tsx                 # Web app entry point
│   └── index.css                # Global CSS stylesheet (Tailwind CSS configuration)
├── server.ts                    # Backend Express service, custom SSE pipelines, and asset routers
├── package.json                 # Project dependencies, dev scripts, and production build chains
├── .env.example                 # Example configuration file for required environment secrets
└── PROJECT_SPECIFICATION.md     # Deep technical specification, database models, and logic flows
```

---

## 🚀 Quick Start & Installation

Follow these steps to configure, build, and run PrepMaster AI on your local environment:

### 1. Prerequisites
Ensure you have the following installed:
- **Node.js** (v18.x or later recommended)
- **NPM** (v9.x or later)

### 2. Set Up the Project
Clone or download the project files, enter the directory, and install dependencies:
```bash
# Navigate to the project root
cd prepmaster

# Install required node modules
npm install
```

### 3. Configure the Environment
Create a `.env` file in the root folder using `.env.example` as a template:
```bash
cp .env.example .env
```
Fill in the configuration variables:
```env
# Google Gemini API key obtained from Google AI Studio (https://aistudio.google.com/)
GEMINI_API_KEY="AIzaSyYourKeyHere..."

# Application Host URL (used for client-server routing)
APP_URL="http://localhost:3000"
```

### 4. Run in Development Mode
To boot up the application with a hot-reloading development server:
```bash
npm run dev
```
The server will start up on **`http://localhost:3000`** with real-time TypeScript compiling via `tsx` and interactive asset pipelines.

### 5. Build & Start in Production Mode
To compile the system for production deployment (creating a single self-contained, bundled server for fast startup):
```bash
# Build frontend assets and bundle backend server
npm run build

# Start the optimized production runtime
npm run start
```
The Express server compiles cleanly into `dist/server.cjs` and serves static built assets directly from `dist/` on port `3000`.

---

## 💼 Professional Sharing Copy

Proud of your custom prep suite? Share your learning progress on **LinkedIn** using this polished template:

```text
🚀 Elevating career preparation to the next level with artificial intelligence!

I've been using PrepMaster AI to supercharge my study regimen for technical certification exams and placement interviews. 

What makes it highly unique:
1️⃣ Recruiter CV Evaluation: Tailors an 11-topic Bento Board syllabus around specialized roles.
2️⃣ Live Syllabus Rewriting: Instantly modifies active roadmaps dynamically using natural language prompts.
3️⃣ Real-Time Spot Quizzing: Interactively tests conceptual limits with 10-question MCQ modules.
4️⃣ Unified Dual-Theme: Seamless transition between Daylight Light and Cosmic Dark modes.

Built with React 19, Express, TypeScript, Tailwind CSS, and the Google Gemini SDK. 

🔗 Explore more: https://github.com/prepmaster-ai/prepmaster
```

---

*Happy learning, and pass your certifications with confidence!* 🚀
