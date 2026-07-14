# Shelf — Library Management System

A full-stack web application for managing a personal book library, featuring three
distinct AI-powered capabilities: a natural-language Query Agent, auto-generated
Library Insights, and a Recommendation Engine — each built with a deliberate
safety-first integration pattern rather than a generic AI wrapper.

**Live demo:** https://library-frontend-h526.onrender.com
*(hosted on a free tier — the first request after a period of inactivity may take
30–60 seconds to wake up)*

---

## Key Features

- **Authentication & Authorization** — JWT-based auth with bcrypt password hashing,
  role-based access control (user vs. admin), and enforced server-side ownership
  checks on every write operation
- **Book Management** — full CRUD with search, sort, and pagination, scoped to the
  logged-in user (admins see and manage every book across the system)
- **Admin Dashboard** — manage all registered users and books, with built-in
  safeguards (an admin can't delete their own account or the last remaining admin)
- **AI Query Agent** — ask questions in plain English ("who owns the most books?",
  "show my 5 most expensive books") and get back a formatted result table plus a
  natural-language summary. The AI never generates raw SQL — it produces a
  constrained, whitelist-validated intent object that application code turns into a
  safe, parameterized query
- **Library Insights** — auto-generated reading-habit summaries with supporting
  charts, computed from real statistics first and only phrased by the AI
  afterward (never AI-invented numbers)
- **Recommendation Engine** — genre-based book suggestions grounded in real
  cross-user library data first, falling back to AI-generated suggestions (clearly
  labeled "unverified") only when there isn't enough data to recommend from

## Technology Stack

| Layer | Technology |
|---|---|
| Backend | Node.js, Express, PostgreSQL |
| Frontend | React (Vite), Tailwind CSS, Recharts |
| Authentication | JWT, bcrypt |
| AI | Groq (OpenAI-compatible API), `openai/gpt-oss-120b` |
| Testing | Jest + Supertest (backend), Vitest + React Testing Library (frontend) |
| Infrastructure | Docker, Docker Compose, GitHub Actions, Render |

## Testing

150 automated tests across both suites, run on every push and pull request via
GitHub Actions:

```bash
cd backend && npm test    # 114 tests — unit + integration, external services fully mocked
cd frontend && npm test   # 36 tests — components, auth context, route guards
```

## Running Locally

**With Docker (recommended — no local installs required):**
```bash
cp .env.example .env      # add a GROQ_API_KEY
docker compose up --build
```
Opens the app at `http://localhost:3000`, backend at `:5000`, Postgres at `:5432`.

**Without Docker:**
```bash
docker compose up -d postgres        # database only

cd backend
cp .env.example .env                 # add GROQ_API_KEY and JWT_SECRET
npm install && npm run migrate && npm run seed

cd ../frontend
npm install

cd ..
npm install                          # installs "concurrently" at the root
npm run dev                          # runs backend + frontend together
```

## Deployment

Deployed to [Render](https://render.com) using the included `render.yaml` Blueprint,
which provisions a PostgreSQL database, the backend web service, and the frontend
static site together from a single file.

## Project Structure

```
backend/                    Express API — controllers, models, AI services, tests
frontend/                   React app — pages, components, context, tests
docker-compose.yml          Full local stack (Postgres + backend + frontend)
render.yaml                 Render Blueprint for one-step deployment
.github/workflows/ci.yml    Runs backend + frontend test suites on every push/PR
```
