# Osprey Flight Analytics - Deployment Guide

## Low-Cost Deployment Options

### Option 1: Railway (Recommended - Easiest)
**Cost:** $5/month (includes PostgreSQL)

1. Create account at [railway.app](https://railway.app)
2. Install Railway CLI: `npm i -g @railway/cli`
3. Deploy:
   ```bash
   railway login
   railway init
   railway add --database postgres
   railway up
   ```
4. Set environment variables in Railway dashboard
5. Deploy frontend to Vercel (free)

### Option 2: Render
**Cost:** Free tier available, $7/month for paid

1. Create account at [render.com](https://render.com)
2. Create PostgreSQL database (free tier)
3. Create Web Service for backend:
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Deploy frontend to Vercel or Render static site

### Option 3: Supabase + Vercel
**Cost:** Free tier (best for starting out)

1. **Database Setup (Supabase)**
   - Create project at [supabase.com](https://supabase.com)
   - Get connection string from Settings > Database
   - Run migrations (see below)

2. **Backend (Vercel Serverless)**
   - Convert FastAPI to Vercel serverless functions
   - Deploy: `vercel --prod`

3. **Frontend (Vercel)**
   - `cd frontend && vercel --prod`

### Option 4: AWS Lambda + RDS
**Cost:** ~$15-20/month (more scalable)

Use AWS SAM or Serverless Framework to deploy FastAPI as Lambda functions.

## Local Development

### Prerequisites
- Docker & Docker Compose
- Node.js 18+
- Python 3.11+

### Quick Start
```bash
# Start all services
docker-compose up

# Backend will be at http://localhost:8000
# Frontend will be at http://localhost:3000
# API docs at http://localhost:8000/docs
```

### Manual Setup (without Docker)

1. **Database**
   ```bash
   # Install PostgreSQL locally or use Docker
   docker run -d -p 5432:5432 \
     -e POSTGRES_USER=osprey \
     -e POSTGRES_PASSWORD=osprey_dev_password \
     -e POSTGRES_DB=osprey \
     postgres:15-alpine
   ```

2. **Backend**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   pip install -r requirements.txt
   export DATABASE_URL="postgresql://osprey:osprey_dev_password@localhost:5432/osprey"
   uvicorn main:app --reload
   ```

3. **Frontend**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## Database Migrations

The app auto-creates tables on startup, but for production:

```python
# Run this once to create tables
from backend.database import engine
from backend.models import Base
Base.metadata.create_all(bind=engine)
```

## Environment Variables

### Backend
- `DATABASE_URL`: PostgreSQL connection string
- `CORS_ORIGINS`: Allowed frontend origins (production)

### Frontend
- `VITE_API_URL`: Backend API URL

## Cost Breakdown

### Free Tier (0-100 users)
- Supabase: Free (500MB DB, 1GB storage)
- Vercel: Free (100GB bandwidth)
- **Total: $0/month**

### Starter (100-1000 users)
- Railway: $5/month (PostgreSQL + Backend)
- Vercel: Free (Frontend)
- **Total: $5/month**

### Growth (1000+ users)
- Railway Pro: $20/month
- Or AWS: RDS ($15) + Lambda ($5-10)
- **Total: $20-30/month**

## Adding Authentication

For production, add Supabase Auth or Auth0:

```bash
npm install @supabase/supabase-js
```

Update `backend/main.py` to verify JWT tokens on protected routes.

## Monitoring

- Railway/Render: Built-in logs and metrics
- Add Sentry for error tracking (free tier)
- Use Supabase dashboard for DB monitoring

## Next Steps

1. Add user authentication
2. Implement file size limits (10MB recommended)
3. Add rate limiting
4. Set up automated backups
5. Configure custom domain
