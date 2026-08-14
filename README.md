<img src="frontend/public/favicon.png" width="64" height="64" alt="SlidesPlus logo" />

# SlidesPlus

AI-powered presentation builder — built before alternatives like Claude, ChatGPT, or other AI tools could generate full presentations on their own.

## What it is

SlidesPlus builds complete presentations from an idea, a prompt, or a reference document, using AI to generate and edit every slide. Unlike a traditional PowerPoint generator, each slide **is stored as HTML** (1920×1080 sections), which allows for free-form design, animations, real typography, and layouts a classic slide engine can't achieve.

## How it works

1. **AI generation** — a wizard asks questions to understand the context (topic, audience, tone) and builds the presentation section by section, matching against ~45 base templates and generating the HTML for each slide with the chosen model.
2. **Visual editing** — once generated, each slide can be edited from a visual editor (drag, resize, styling) without touching code.
3. **Direct code editing** — for full control, each slide's HTML can be edited directly in an embedded Monaco editor.

There's also chat-based iteration on an existing presentation, public read-only views for sharing a deck, and real-time collaboration (Yjs) for multiple people editing at once.

## AI providers used

- **Gemini** (Google)
- **ChatGPT / GPT** (OpenAI)
- **NVIDIA NIM** — Llama 4, Qwen, DeepSeek, through an OpenAI-compatible endpoint

The backend selects (or lets you select) the model depending on the step in the flow (wizard, slide generation, chat).

## Authentication

Email/password (JWT + bcrypt), Google login, and GitHub login. There's also a Spotify integration (not for login — it's used to embed music/album art inside slides).

## Stack

- **Frontend**: React 19 + Vite + TypeScript + Tailwind, Zustand, react-router-dom, Monaco Editor, GSAP/Framer Motion/Three.js for visual effects, PPTX/PDF export, i18n (ES/EN).
- **Backend**: Node.js + Express, Supabase + Postgres, Passport (OAuth), Multer, Playwright for e2e tests.

## Structure

```
frontend/   React + Vite + Tailwind SPA
backend/    Node.js + Express API (Supabase, AI providers, OAuth)
```

## Running the project

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local   # fill in values
npm run dev
```

### Backend

```bash
cd backend
npm install
cp .env.example .env         # fill in values
npm run dev
```

## Notes

- Each package keeps its own `package.json`, `.env.example`, and `vercel.json`.
- Environment files (`.env`, `.env.local`) are git-ignored — never committed.
