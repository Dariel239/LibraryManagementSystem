# Deploying to Render (free tier, no credit card required)

This repo includes a `render.yaml` Blueprint that defines all three pieces: the Postgres
database, the backend web service, and the frontend static site. Render reads this file
and provisions everything from one dashboard action.

## 1. Push this project to GitHub
Render deploys from a Git repository, so create a new GitHub repo and push this project
to it first (the whole folder — `backend/`, `frontend/`, `render.yaml`, etc. at the root).

## 2. Create a Render account
Go to https://dashboard.render.com and sign up — no credit card needed for the free tier.

## 3. Deploy the Blueprint
1. In the Render dashboard, click **New** → **Blueprint**
2. Connect your GitHub account and select the repo you just pushed
3. Render will detect `render.yaml` and show you the three services it's about to create:
   `library-db`, `library-backend`, `library-frontend`
4. Click **Apply** — Render provisions the database, then builds and deploys both services

## 4. Add your Groq API key
The blueprint leaves `GROQ_API_KEY` blank on purpose (secrets aren't committed to Git).
Once the backend service exists:
1. Go to the `library-backend` service → **Environment**
2. Add `GROQ_API_KEY` with your real key from https://console.groq.com/keys
3. Save — this triggers a redeploy automatically

## 5. Connect frontend and backend URLs
Render assigns each service a URL like `https://library-backend-xxxx.onrender.com` —
you won't know the exact URL until after the first deploy, so these two are set manually:

1. Copy the backend's URL from its Render dashboard page
2. Go to `library-frontend` → **Environment**, set:
   ```
   VITE_API_URL=https://library-backend-xxxx.onrender.com/api
   ```
3. Go to `library-backend` → **Environment**, set:
   ```
   CLIENT_URL=https://library-frontend-xxxx.onrender.com
   ```
4. Both services will automatically redeploy with the correct URLs

## 6. Seed the database (optional, for demo data)
Render's free web services include a **Shell** tab. Open it on `library-backend` and run:
```
npm run seed
```

## What to expect on the free tier
- **Cold starts**: free web services spin down after 15 minutes of inactivity; the next
  request takes ~30-60 seconds to wake back up. Fine for demos, not for production traffic.
- **Monthly hour cap**: each workspace gets 750 free instance-hours/month, shared across all
  your free services. Two services running continuously would hit this around day 16 — in
  practice, spin-down (above) means idle time doesn't count, so this rarely bites a low-traffic
  demo, but worth knowing if you leave it under sustained load.
- **Database expiry**: Render's free Postgres expires 30 days after creation, with a 14-day
  grace period to upgrade before data is deleted. Fine for a school/portfolio project;
  re-run migrate + seed if you need to recreate it later.
- Everything else (SSL, environment variables, auto-deploy on git push) works the same as
  a paid plan.

## Updating your deployment later
Any `git push` to your connected branch triggers Render to rebuild and redeploy
automatically — no need to repeat the steps above.
