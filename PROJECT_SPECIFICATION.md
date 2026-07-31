# PrepMaster - Technical Engineering & Flow Specification
*Official Technical Blueprint & Implementation Reference Guide*

This document serves as the absolute engineering specification for the **PrepMaster** full-stack ecosystem. It maps out detailed data structures, API pipelines, logical flows, state synchronization mechanics, and specialized runtime safeguards.

---

## 🏛️ 1. Core Architectural Layout

PrepMaster is designed as a secure, sandboxed, full-stack application. It leverages a lightweight Express server hosting standard API routes and custom streaming pipelines, serving a highly responsive React client:

```text
                        ┌──────────────────────────────────────┐
                        │             React Client             │
                        │   (Global Theme, Local Device ID)    │
                        └──────────────────┬───────────────────┘
                                           │
                        ┌──────────────────▼───────────────────┐
                        │          HTTP REST Requests          │
                        │    (With Header: x-device-id)        │
                        └──────────────────┬───────────────────┘
                                           │
                                           ├────────────────────────┐
                                           │                        │
                        ┌──────────────────▼───────────────────┐ ┌──▼──────────────────┐
                        │         Express Web Backend          │ │  SSE Stream (Chat)  │
                        │            (server.ts)               │ │  (Real-Time Bytes)  │
                        └──────────────────┬───────────────────┘ └─────────────────────┘
                                           │
                        ┌──────────────────▼───────────────────┐
                        │      Google Gemini API (SDK)         │
                        │   (Rate Failover: 3.5 -> 3.1 Lite)   │
                        └──────────────────┬───────────────────┘
                                           │
                        ┌──────────────────▼───────────────────┐
                        │       High-Speed JSON Flat DB        │
                        │    (Multi-Tenant Device Filtering)   │
                        └──────────────────────────────────────┘
```

---

## 💾 2. Multi-Tenant Cloud Persistent Database Engine (Firestore with Local Fallback)

To guarantee secure, isolated, and highly-stable study environments that remain resilient across stateless server restarts (e.g., in Google Cloud Run), PrepMaster features a production-grade dual-mode database engine:

1. **Durable Cloud Persistence (Primary)**: Seamlessly integrates with **Google Cloud Firestore**. Records (study plans, uploaded custom syllabi, interactive MCQ scores, chat history logs, and chapter study notes) are written to and loaded from Firestore collections under a secure server proxy structure.
2. **Stateless JSON Flat-File Fallback (Secondary)**: If Firestore details are missing or if connection timeouts occur, the database layer automatically routes reads and writes back to local file storage (`src/db.json` via local caching). This protects the system from crashes and ensures high-availability.

### A. Device Identification & Multi-Tenancy
* On cold start, the client generates a unique cryptographic device identifier prefix (e.g., `DEV_ABCD123`) using a randomized base-36 string.
* This identifier is saved instantly to the client's `localStorage` under the `prepmaster_device_id` namespace.
* For all HTTP and streaming requests, the client appends this token as a custom header: `x-device-id`.
* **Zero-Overlap Isolation**: Both Firestore queries and local files filter records strictly by the device identifier, giving users their own private sandbox.

### B. Database Schema & Collections (`src/types.ts`)
The persistent storage layers (Cloud Firestore and local storage fallback) follow strongly-typed entity schemas:

| Entity | Key Fields | Field Types & Constraints | Purpose |
| :--- | :--- | :--- | :--- |
| **ExamPlan** | `id`, `name`, `created_at`, `device_id` | `UUID`, `string`, `ISO-8601`, `string` | Top-level certification practice session container bound to a workspace. |
| **Question** | `id`, `exam_plan_id`, `question_number`, `question_text`, `options`, `correct_answer` | `UUID`, `FK(ExamPlan)`, `number`, `string`, `Record<string, string>`, `string` | Individual multiple-choice question problem statement and option choices. |
| **UserAttempt** | `id`, `question_id`, `device_id`, `selected_answer`, `is_correct`, `explanation`, `attempted_at` | `UUID`, `FK(Question)`, `string`, `string`, `boolean`, `string`, `ISO-8601` | Logged evaluation response, grading status, and generated AI justification text. |
| **ProgressItem** | `question_id`, `question_number`, `status`, `selected_answer`, `explanation` | `string`, `number`, `'green' \| 'red' \| 'gray'`, `string`, `string` | Computed progress state map driving the sidebar navigation sheet and score metrics. |

---

## 📡 3. REST & Streaming API Specification (`server.ts`)

Endpoints process the header `x-device-id` to scope database lookups dynamically.

### A. Plan & Question Management
*   `GET /api/plans`: Reads all `ExamPlan` objects where `device_id` matches the incoming header.
*   `GET /api/plans/:planId/questions`: Resolves parsed exam questions. Asserts ownership checks.
*   `GET /api/plans/:planId/progress`: Combines `UserAttempt` arrays and `Question` maps to return structured `ProgressItem` arrays for instantaneous visual feedback in sidebars and progress rings.
*   `POST /api/plans/:planId/delete`: Purges the plan, questions, and attempt rows matching the device ID safely.
*   `GET /api/workspaces`: Queries distinct active Workspace IDs registered in Cloud Firestore or local database fallback.
*   `DELETE /api/workspaces/:id`: Cascade-deletes all plans, questions, attempts, and interview roadmaps bound to the specified Workspace ID.

### B. The Real-Time SSE (Server-Sent Events) Pipeline
To prevent request timeouts and deliver a snappy learning workspace, answer evaluations and chat responses utilize a direct streaming SSE server connection:

1.  **Request Initiation**: Client sends a POST request with payload `{ question_id, selected_answer }` to `/api/evaluate`.
2.  **SSE Connection Boot**: Server configures standard headers:
    ```http
    Content-Type: text/event-stream
    Cache-Control: no-cache
    Connection: keep-keep-alive
    ```
3.  **Prompt Delivery**: The backend wraps the question, options, and choice with a strict prompt envelope and sends it to the Gemini API.
4.  **Token Streaming**: As Gemini returns chunks, the Express server writes them immediately to the response socket using standard SSE formats (`data: [chunk_content]\n\n`).
5.  **Final Compilation**: Once the streaming session finishes, the complete string is saved in the database under `UserAttempt`, and a special `[DONE]` marker is transmitted, signalling the client to close the reader safely.

---

## 🧙‍♂️ 4. The 4-Step Recruiter Consultation Flow

The interview preparation section uses a multi-stage wizard to transition students from raw resumes to fully personalized interactive syllabus workspaces:

```text
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│     Step 1      │      │     Step 2      │      │     Step 3      │      │     Step 4      │
│  Resume Intake  ├─────►│  Fit Analysis   ├─────►│  Coach Consult  ├─────►│   Compilation   │
│  (Plain Text)   │      │  (Role Selection)│      │  (Interactive)  │      │  (Bento Board)  │
└─────────────────┘      └─────────────────┘      └─────────────────┘      └─────────────────┘
```

1.  **Step 1: Bio Intake**: Captures plaintext bio data or parsed resumes. If empty, the system provides standard templates corresponding to active engineering tracks.
2.  **Step 2: Recruiter Suggestions**: Calls Gemini to evaluate fit across hierarchical seniorities (Junior, Mid, Senior, Principal) for selected specialized roles. Displays interactive cards with estimated fit ratings and critical target keywords.
3.  **Step 3: Coach Consultation**: Opens a live conversational chat with the Virtual Coach. The client can customize technical boundaries (e.g., fine-tuning models, building advanced RAG, configuring `@google/genai` wrappers) or upload a custom syllabus.
4.  **Step 4: Compiling Bento Board**: Triggers a final syllabus compilation. The AI parses the conversation log, maps **8 to 15 key chapters**, details concepts, drafts mock MCQs, and writes the structured workspace into the database.

---

## 🛡️ 5. Zero-Downtime Model Failover System

To prevent study disruptions from API rate limits, daily quotas, or transient service outages, the backend implements an automated model redirection shield in `src/ai_service.ts`:

| Strategy Layer | Target Model | Role & Behaviour | Trigger Condition |
| :--- | :--- | :--- | :--- |
| **Primary Route** | `gemini-3.5-flash` | High-intelligence reasoning model for syllabus generation, SSE answer evaluation, and deep tutor chat. | Default invocation target. |
| **Failover Shield** | `gemini-3.1-flash-lite` | High-availability lightweight fallback model providing real-time streaming response continuity. | Automatically intercepted when Primary encounters `429 Rate Limit`, quota exhaustion, or socket timeout errors. |
| **Error Guard** | System Notification | Emits a structured error event to client UI if all allocation routes fail. | Both Primary and Fallback model endpoints return non-recoverable errors. |

---

## 🛠️ 6. Live Syllabus Rewrite Engine

Instead of locking students into static roadmap chapters, the Bento Board provides a **Live AI Playbook Expander and Coach**.

*   **Natural Language Customization**: Students submit adjustment queries directly to the coach (e.g., *"Focus more on fine-tuning LLMs with LoRA"*).
*   **Prompt-Driven Mutation**: The server receives the text, passes the active syllabus structure to Gemini, and commands the AI to refactor, expand, insert, or merge bento board chapter nodes.
*   **Seamless In-DB Sync**: The revised structure updates the database instantaneously and forces a clean client bento re-render with elegant sliding animations.

---

## 🎨 7. Unified Theme State Synchronization

To prevent discordant visual layouts, PrepMaster enforces a single global theme state synchronized across all sub-apps.

*   **Storage Key**: `interview_theme` in `localStorage` (`'dark'` or `'light'`).
*   **Default Detection**: Resolves stored preference first, falling back to system OS `prefers-color-scheme`.
*   **Context Propagation**: Passed down from `App.tsx` to active views (`PracticeSession` and `InterviewPrep`).
*   **Visual Application**: Drives conditional Tailwind utility classes (`bg-slate-900` vs `bg-white`) to eliminate layout flickers across modals, code blocks, and charts.

---

## 📝 8. MCQ Quiz State & Score Persistence

Spot-quizzes preserve user state robustly so students never lose progress upon page refreshes, sidebar interactions, or workspace toggles:

*   **Local State Isolation**: Maintains an active `currentIndex`, `selectedAnswer`, and `score` mapping.
*   **DB Synchronization**: Saves the active progress matrix into the user's database session under the active chapter node.
*   **Cold-Start Recovery**: When opening a chapter bento, the component reads the matching chapter's persistent quiz states, automatically restoring user answer history and position.

---

## ⌨️ 9. Interactive Hotkeys Reference

To minimize trackpad usage during heavy study sprints, the application maps physical keys directly to state changes:

| Key Command | Action triggered in Workspace |
|:---|:---|
| `ArrowRight` ( `→` ) | Jump to the **next** question in the active exam. |
| `ArrowLeft` ( `←` ) | Jump to the **preceding** question in the active exam. |
| `Keys 1 to 6` | Toggle radio button choices `A` through `F` dynamically. |
| `Enter` | Submit the selected option to trigger the Streaming Evaluator. |
| `Ctrl / Cmd + Enter` | Post follow-up messages to the side-by-side tutor chatbot instantly. |

---

## 📱 10. iPad & Tablet Viewport Ergonomics

To support students working on the go, PrepMaster adjusts layout configurations selectively:

*   **Sidebar Overlay Breakpoints**: Sidebars collapse into responsive overlay drawers starting at `lg` (1024px) rather than the default `md` (768px). This protects the center learning theater layout on standard iPad viewports.
*   **Column-Span Transitions**: In desktop view, collapsing the syllabus list or tutor panels smoothly shifts the central concept layout col-span from `col-span-6` to a wide `col-span-12`, maximizing code-reading space.
