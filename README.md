# SlidesPlus

AI-powered presentation builder — full source, frontend and backend together.

This is a unified archive of the project, combining the complete commit history
of both repositories.

## Structure

```
frontend/   React + Vite + Tailwind SPA
backend/    Node.js + Express API (Supabase, AI providers, OAuth)
```

## Frontend

```bash
cd frontend
npm install
cp .env.example .env.local   # fill in values
npm run dev
```

## Backend

```bash
cd backend
npm install
cp .env.example .env         # fill in values
npm run dev
```

## Notes

- Each package keeps its own `package.json`, `.env.example`, and `vercel.json`.
- Environment files (`.env`, `.env.local`) are git-ignored — never committed.
