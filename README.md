# Shelf — Library Management System

A full-stack library management app with AI-powered features: a natural-language
Query Agent, auto-generated Library Insights, and a Recommendation Engine.

## Stack
- **Backend**: Node.js, Express, PostgreSQL
- **Frontend**: React (Vite), Tailwind CSS
- **AI**: Groq API (OpenAI-compatible), `openai/gpt-oss-120b`

## Features
- User registration/login (JWT), first registered user auto-becomes admin
- Book CRUD scoped to the logged-in user (or all books for admins)
- Admin dashboard: manage all users and books
- **AI Query Agent** — ask questions like "who owns the most books?" in plain English,
  get back a formatted table + summary. Grounded via a whitelist-validated SQL builder,
  never raw LLM-generated SQL.
- **Library Insights** — auto-generated reading habit summaries (per-user or library-wide for admins)
- **Recommendation Engine** — genre-based suggestions, grounded in real library data first,
  falling back to AI-generated (clearly labeled "unverified") suggestions only when there
  isn't enough data

## Quick start (local, no Docker)

**One-time setup:**
```bash
docker compose up -d postgres     # just the database
cd backend && cp .env.example .env  # fill in GROQ_API_KEY and JWT_SECRET
npm install && npm run migrate && npm run seed
cd ../frontend && npm install
cd .. && npm install               # root: installs "concurrently"
```

**Every time you want to work:**
```bash
npm run dev
```
Then open http://localhost:3000. Backend runs on :5000, Postgres on :5432.

## Quick start (full Docker)
```bash
cp .env.example .env               # fill in GROQ_API_KEY
docker compose up --build
```
Open http://localhost:3000. This builds and runs all three services (Postgres, backend,
frontend via nginx) in containers — no local `npm install` needed at all.

## Running tests
```bash
cd backend && npm test    # 89 tests: unit + integration, all AI logic mocked (no API calls)
cd frontend && npm test   # 31 tests: components, auth context, route guards
```
Both suites run automatically on every push/PR via GitHub Actions (`.github/workflows/ci.yml`).

## Deployment
See [DEPLOYMENT.md](./DEPLOYMENT.md) for step-by-step instructions to deploy to Render's
free tier using the included `render.yaml` Blueprint.

## Project structure
```
backend/    Express API — see backend/src for controllers, models, AI services
frontend/   React app — see frontend/src for pages, components, context
docker-compose.yml   Full local stack (Postgres + backend + frontend)
.github/workflows/ci.yml   Runs backend + frontend tests on every push/PR
render.yaml           One-click Render deployment blueprint
```
