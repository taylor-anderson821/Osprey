# Osprey Flight Analytics - SaaS Platform

A web-based SaaS platform for RC soaring pilots to upload telemetry data, analyze flight performance, and track progression over time.

## Features

- **File Upload**: Drag-and-drop TLM file processing
- **Session Analytics**: View detailed flight sessions with altitude charts
- **Thermal Detection**: Automatic identification of thermals with start/end markers
- **Daily Summaries**: Aggregate statistics across multiple flying days
- **Performance Tracking**: Monitor thermal/launch ratios and altitude gains

## Architecture

### Backend (FastAPI + PostgreSQL)
- Processes binary TLM files from Spektrum receivers
- Identifies flight events (launches, thermals, troughs)
- Stores analytics as JSON in PostgreSQL
- RESTful API for frontend consumption

### Frontend (React + Recharts)
- Modern, responsive UI with Tailwind CSS
- Interactive altitude charts with thermal annotations
- Session history and daily summaries
- Real-time file upload with progress feedback

### Database Schema
- `flight_sessions`: Session metadata and altitude time-series
- `thermals`: Individual thermal records with gain/duration stats

## Tech Stack

- **Backend**: Python 3.11, FastAPI, SQLAlchemy, NumPy
- **Frontend**: React 18, Vite, Recharts, Tailwind CSS
- **Database**: PostgreSQL 15
- **Deployment**: Docker, Railway/Render/Vercel

## Getting Started

### Local Development

1. **Clone and setup**
   ```bash
   git clone <repo>
   cd osprey-saas
   ```

2. **Start with Docker Compose**
   ```bash
   docker-compose up
   ```

3. **Access the app**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

### Manual Setup

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions.

## API Endpoints

- `POST /api/upload` - Upload and process TLM file
- `GET /api/sessions` - List all sessions
- `GET /api/sessions/{id}` - Get session detail with thermals
- `GET /api/daily-summary` - Get daily aggregated stats

## Project Structure

```
.
├── backend/
│   ├── main.py              # FastAPI app and routes
│   ├── models.py            # SQLAlchemy models
│   ├── schemas.py           # Pydantic schemas
│   ├── database.py          # Database connection
│   ├── osprey_processor.py  # TLM file processing logic
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── App.jsx          # Main app component
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
├── docker-compose.yml
└── DEPLOYMENT.md
```

## Deployment

Multiple low-cost options available:

- **Railway**: $5/month (recommended for simplicity)
- **Render**: Free tier available
- **Supabase + Vercel**: Free tier (best for starting)
- **AWS Lambda + RDS**: ~$15-20/month (most scalable)

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment guides.

## Cost Estimates

- **0-100 users**: $0/month (free tiers)
- **100-1000 users**: $5/month (Railway)
- **1000+ users**: $20-30/month (Railway Pro or AWS)

## Roadmap

- [ ] User authentication (Supabase Auth)
- [ ] Metric/Imperial unit toggle
- [ ] Export analytics as PDF
- [ ] Compare sessions side-by-side
- [ ] Mobile app (React Native)
- [ ] Social features (share sessions)

## Original Python Script

The original desktop Python script (`osprey.py`) is still available for local use. This SaaS platform wraps that functionality in a web interface with persistent storage.

## License

See LICENSE file

## Contributing

Contributions welcome! Please open an issue or PR.
