# QuizBuilder — AI-Powered Knowledge Quiz App

Generate and take 5-question multiple-choice quizzes on any topic, powered by Claude and Wikipedia.

---

## Quick start

### 1. Backend (Python / FastAPI)

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY

uvicorn main:app --reload --port 8000
```

### 2. Frontend (React / Vite)

```bash
cd frontend
npm install
npm run dev
# Opens at http://localhost:5173
```

The Vite dev server proxies `/api/*` to `http://localhost:8000`, so no CORS issues in development.

---

## System architecture

```
Browser (React)
    │  HTTP/REST
    ▼
FastAPI backend (main.py)
    ├── POST /generate-quiz   — generate a quiz from a topic
    ├── POST /submit          — score a quiz, persist result
    ├── GET  /history         — list past results
    └── GET  /history/:id     — full result detail
         │
         ├── Wikipedia API → context injection (RAG)
         ├── Prompt builder → structured JSON prompt
         ├── Anthropic claude-sonnet-4-6 → 5 MCQs as JSON
         ├── Response parser → validates schema
         ├── In-memory session store (dict, keyed by UUID)
         └── SQLite → persists scored results
```

### Data flow

1. User submits a topic
2. Backend fetches the Wikipedia summary for that topic (~600 words)
3. Prompt builder injects the context into a strict JSON-schema prompt
4. Claude returns a JSON array of 5 questions with `question`, `options[4]`, `correct_index`, `explanation`
5. Response parser validates — no markdown wrapping, valid indices, 4 options each
6. Session UUID returned to the client; quiz state held server-side (avoids answer-key tampering)
7. On submit, backend scores answers, writes to SQLite, deletes the session, returns results + explanations

---

## Technical decisions

### Model: claude-sonnet-4-6
Fast enough for a responsive UI (typically 2–4s), instruction-following is reliable for structured output, and cost is appropriate for an MVP.

### JSON-mode prompting, not function-calling
The prompt explicitly says "respond with ONLY a valid JSON array, no markdown". This keeps the response parser trivial (`json.loads` + shape assertions) and avoids SDK complexity. The tradeoff is that if Claude adds prose, parsing fails — the parser strips markdown fences as a fallback.

### Server-side session state (in-memory dict)
Correct answers are never sent to the client, which prevents a malicious user from simply faking a perfect score. The session dict maps UUID → quiz data and is deleted after submission. The tradeoff is that sessions are lost on server restart; acceptable for MVP, Redis would fix it for production.

### Wikipedia RAG
A single `wikipedia-api` call fetches ~600 words of context and injects them before the prompt. This measurably improves factual accuracy for niche topics at essentially zero latency cost (Wikipedia API is fast). The fallback if the page doesn't exist is graceful — Claude generates from its own knowledge.

### SQLite for persistence
Zero-config, no separate process, files alongside the app. For the scale of this MVP it's ideal. Migration path to Postgres is straightforward with SQLAlchemy if needed.

### React + Vite (no Redux, no React Router)
State is lifted to `App.tsx` using a simple `view` enum. There are only 4 screens and no URL-based navigation requirements, so a router would be overengineering. `useState` at the top level is the right tool here.

---

## Bonus features implemented

- **Wikipedia RAG** — context injected per topic for factual grounding
- **SQLite persistence** — all scored quizzes saved; browsable in the History screen
- **Explanations** — every question returns a `why` explanation shown after submission
- **Session integrity** — correct answers held server-side, never exposed to the client

---

## Project structure

```
quiz-builder/
├── backend/
│   ├── main.py            # FastAPI app, all routes
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── index.html
    ├── vite.config.ts
    ├── package.json
    └── src/
        ├── App.tsx           # Root, view state machine
        ├── index.css         # All styles
        ├── main.tsx
        ├── types/index.ts    # Shared TypeScript types
        ├── hooks/useApi.ts   # API client functions
        └── components/
            ├── HomeScreen.tsx
            ├── QuizScreen.tsx
            ├── ResultsScreen.tsx
            └── HistoryScreen.tsx
```

---

## Potential improvements (beyond MVP)

- Swap in-memory sessions for Redis (restart-safe, horizontally scalable)
- Add difficulty selection (easy / medium / hard) in the prompt
- Stream quiz questions one-at-a-time using SSE for faster perceived load
- Add user accounts / auth for multi-user history
- Support image-based questions via Claude's vision capabilities
