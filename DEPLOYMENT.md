# Deploying Osprey to Railway

Railway hosts all three services: **PostgreSQL**, **backend** (FastAPI), and **frontend** (React).
Estimated cost: ~$5/month on the Hobby plan.

---

## One-time setup

### 1. Create a Railway account
Sign up at [railway.app](https://railway.app). The Hobby plan ($5/month) covers all three services.

### 2. Push your code to GitHub
Railway deploys from a GitHub repository.

```bash
git add -A
git commit -m "Add auth and Railway deployment config"
git push
```

### 3. Create a new Railway project
In the Railway dashboard: **New Project → Deploy from GitHub repo** → select this repo.

---

## Deploy the database

In your Railway project: **+ New → Database → PostgreSQL**.

Railway will provision a PostgreSQL instance and automatically set `DATABASE_URL` in the project environment. Copy the `DATABASE_URL` value — you'll need it for the backend service.

---

## Deploy the backend

**+ New → GitHub Repo** → select this repo → set the **Root Directory** to `backend`.

### Environment variables to set:

| Variable | Value |
|---|---|
| `DATABASE_URL` | *(copied from the PostgreSQL service — Railway may inject this automatically if services share a project)* |
| `SECRET_KEY` | A long random string — generate with: `python3 -c "import secrets; print(secrets.token_hex(32))"` |
| `FRONTEND_URL` | *(set after frontend is deployed — come back to this)* |
| `PORT` | Railway sets this automatically |

Railway will run `alembic upgrade head` automatically on each deploy before starting the server (configured in `railway.toml`).

After deploy, copy the backend's public URL (e.g. `https://osprey-backend-production.up.railway.app`).

---

## Deploy the frontend

**+ New → GitHub Repo** → select this repo → set the **Root Directory** to `frontend`.

### Environment variables / build args to set:

| Variable | Value |
|---|---|
| `VITE_API_URL` | The backend URL from the previous step (e.g. `https://osprey-backend-production.up.railway.app`) |
| `PORT` | Railway sets this automatically |

> **Important:** `VITE_API_URL` is baked into the JavaScript bundle at build time. If you change the backend URL later, you must trigger a new frontend deploy.

After the frontend deploys, copy its public URL (e.g. `https://osprey-frontend-production.up.railway.app`).

---

## Finish backend CORS setup

Go back to the **backend** service → **Variables** → set:

```
FRONTEND_URL = https://osprey-frontend-production.up.railway.app
```

Then **redeploy** the backend (Railway dashboard → backend service → Redeploy).

---

## First login

1. Open the frontend URL in a browser.
2. Click **Create one** on the login page.
3. The **first registered user** is automatically made an admin.

---

## Local development (unchanged)

```bash
docker-compose up
```

The local setup still works exactly as before. Create a local account via the register page at `http://localhost:3000/register`.

---

## Environment variable summary

### Backend
| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `SECRET_KEY` | Yes | JWT signing secret — keep this private |
| `FRONTEND_URL` | Yes | Exact origin of the frontend (no trailing slash) |

### Frontend (build-time)
| Variable | Required | Notes |
|---|---|---|
| `VITE_API_URL` | Yes | Backend URL — baked in at build time |
