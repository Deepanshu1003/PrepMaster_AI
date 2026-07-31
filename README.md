# PrepMaster AI 🎓💼🤖

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb.svg)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind--CSS-4.0-38bdf8.svg)](https://tailwindcss.com/)
[![Express.js](https://img.shields.io/badge/Express-4.x-green.svg)](https://expressjs.com/)
[![Gemini API](https://img.shields.io/badge/Google--Gemini-API-orange.svg)](https://ai.google.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

**PrepMaster AI** is an intelligent, full-stack certification preparation and interactive mock interview platform. Powered by Google Gemini AI, React 18, Express, and Cloud Firestore, it transforms study materials and CVs into active learning workspaces.

---

## Key Features

*   🎯 **Certification Exam Rooms**: Real-world exam simulators, active recall navigation rails, hotkeys, and real-time AI answer grading.
*   💼 **AI Placement & Interview Suite**: 4-step recruiter consultation wizard (CV intake, fit analysis, custom syllabus generator, and interactive bento board roadmaps).
*   🤖 **Interactive AI Copilots**: Side-by-side tutor chatbot for code debugging, live natural-language syllabus rewriting, and on-demand MCQ quizzes.
*   ☁️ **Cloud Persistence & Sync**: Production-grade Google Cloud Firestore integration with local cache fallbacks and multi-tenant workspace isolation.
*   🛡️ **Resilient Core**: Automatic AI failover shield (`gemini-3.5-flash` → `gemini-3.1-flash-lite`) and synchronized dual-theme support.

---

## ⚙️ Project Structure

```text
prepmaster/
├── src/
│   ├── components/
│   │   ├── PracticeSession.tsx  # Certification exam suite & spot grader
│   │   └── InterviewPrep.tsx    # Recruiter wizard, bento roadmap & tutor chat
│   ├── types.ts                 # Strongly-typed data schemas
│   ├── parser.ts                # Document and file parsing logic
│   ├── ai_service.ts            # Server-side Gemini API client & failover shield
│   └── main.tsx                 # Client entry point
├── server.ts                    # Backend Express server & SSE streaming routes
├── package.json                 # Dependencies & scripts
└── PROJECT_SPECIFICATION.md     # System architecture & engineering spec
```

---

## 🚀 Quick Start

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment**:
   Create a `.env` file from `.env.example`:
   ```env
   GEMINI_API_KEY="your_gemini_api_key"
   APP_URL="http://localhost:3000"
   ```

3. **Run Development Server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

4. **Production Build**:
   ```bash
   npm run build
   npm run start
   ```

---

## 💼 LinkedIn Share Template

```text
🚀 Elevating certification prep & tech interview practice with PrepMaster AI!

I've been using PrepMaster AI to supercharge my technical interview preparation.

Key highlights:
1️⃣ Recruiter CV Analysis: Builds a personalized Bento Board syllabus based on career goals.
2️⃣ Live Syllabus Rewriting: Refactors study roadmaps using natural language prompts.
3️⃣ Real-Time Spot Quizzes & Tutor Chat: Instant AI feedback via Server-Sent Events (SSE).

Tech Stack: TypeScript, React 18, Express, Tailwind CSS, Google Gemini API, and Firestore.

🔗 https://github.com/prepmaster-ai/prepmaster
```

---

*Happy learning! Ace your certifications and master your interviews with confidence!* 🚀 💼

