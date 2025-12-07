# Osprey Deployment Workflow

## Complete Guide: Development → Production

This guide covers how to deploy changes, including schema changes, to your production environment.

---

## Table of Contents

1. [Initial Production Setup](#initial-production-setup)
2. [Daily Development Workflow](#daily-development-workflow)
3. [Deploying Code Changes](#deploying-code-changes)
4. [Deploying Schema Changes](#deploying-schema-changes)
5. [Platform-Specific Instructions](#platform-specific-instructions)
6. [Rollback Procedures](#rollback-procedures)
7. [Monitoring & Alerts](#monitoring--alerts)

---

## Initial Production Setup

### 1. Choose Your Platform

**Recommended: DigitalOcean ($33/month)**

```bash
# 1. Create Droplet (Ubuntu 22.04, 2GB RAM)
# 2. Create Managed PostgreSQL Database
# 3. SSH into droplet
ssh root@your-droplet-ip

# 4. Install dependencies
apt update
apt install -y python3.11 python3-pip nodejs npm git docker.io docker-compose

# 5. Clone repository
cd /opt
git clone https://github.com/yourusername/osprey.git
cd osprey

# 6. Set up environment variables
cat > backend/.env << EOF
DATABASE_URL=postgresql://user:pass@your-db-host:25060/osprey?sslmode=require
CORS_ORIGINS=https://your-domain.com
EOF

# 7. Run initial migration
cd backend
pip3 install -r requirements.txt
alembic upgrade head

# 8. Set up systemd service (see below)
```

### 2. Create Systemd Service (DigitalOcean)

```bash
# Create service file
sudo nano /etc/systemd/system/osprey.service
```

```ini
[Unit]
Description=Osprey Flight Analytics API
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/osprey/backend
Environment="PATH=/usr/bin:/usr/local/bin"
Environment="DATABASE_URL=postgresql://user:pass@host:25060/osprey?sslmode=require"
ExecStart=/usr/bin/uvicorn main:app --host 0.0.0.0 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start
sudo systemctl enable osprey
sudo systemctl start osprey
sudo systemctl status osprey
```

### 3. Deploy Frontend

**Option A: Vercel (Recommended - Free)**

```bash
cd frontend
npm install -g vercel
vercel login
vercel --prod

# Set environment variable in Vercel dashboard:
# VITE_API_URL=https://api.your-domain.com
```

**Option B: Same Droplet with Nginx**

```bash
# Build frontend
cd frontend
npm install
npm run build

# Copy to nginx
sudo cp -r dist/* /var/www/html/

# Configure nginx
sudo nano /etc/nginx/sites-available/osprey
```

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        root /var/www/html;
        try_files $uri $uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## Daily Development Workflow

### Local Development

```bash
# 1. Create feature branch
git checkout -b feature/add-user-preferences

# 2. Make changes to code
# Edit backend/models.py, frontend/src/components/*, etc.

# 3. If you changed models, create migration
cd backend
alembic revision --autogenerate -m "Add user preferences"

# 4. Apply migration locally
alembic upgrade head

# 5. Test everything
cd ..
docker-compose up  # Test full stack

# 6. Commit changes
git add .
git commit -m "Add user preferences feature"
git push origin feature/add-user-preferences

# 7. Create pull request
# Review, test, merge to main
```

---

## Deploying Code Changes

### No Schema Changes (Easy)

**DigitalOcean:**
```bash
# SSH into server
ssh root@your-droplet-ip

# Pull latest code
cd /opt/osprey
git pull origin main

# Update backend dependencies (if changed)
cd backend
pip3 install -r requirements.txt

# Restart backend
sudo systemctl restart osprey

# Update frontend (if using same server)
cd ../frontend
npm install
npm run build
sudo cp -r dist/* /var/www/html/

# Done!
```

**Railway:**
```bash
# Automatic deployment on git push
git push origin main
# Railway detects changes and redeploys automatically
```

**Vercel (Frontend):**
```bash
# Automatic deployment on git push
git push origin main
# Or manual:
cd frontend && vercel --prod
```

---

## Deploying Schema Changes

### Step-by-Step Process

**1. Backup Database First!**

```bash
# From your local machine or server
pg_dump -h your-db-host -U osprey -d osprey > backup_$(date +%Y%m%d_%H%M%S).sql

# Or use DigitalOcean's automated backups (recommended)
```

**2. Test Migration Locally**

```bash
cd backend

# Test upgrade
alembic upgrade head

# Test downgrade (rollback)
alembic downgrade -1

# Re-upgrade
alembic upgrade head

# Verify application still works
cd .. && docker-compose up
```

**3. Deploy to Production**

**Option A: Automated (Recommended)**

Add to your deployment script:

```bash
# deploy.sh
#!/bin/bash
set -e

echo "Pulling latest code..."
git pull origin main

echo "Running migrations..."
cd backend
pip3 install -r requirements.txt
alembic upgrade head

echo "Restarting application..."
sudo systemctl restart osprey

echo "Deployment complete!"
```

**Option B: Manual**

```bash
# SSH into server
ssh root@your-droplet-ip

# Navigate to app
cd /opt/osprey

# Pull latest code (includes migration files)
git pull origin main

# Run migration
cd backend
pip3 install -r requirements.txt
alembic upgrade head

# Restart application
sudo systemctl restart osprey

# Check logs
sudo journalctl -u osprey -f
```

**4. Verify Deployment**

```bash
# Check health endpoint
curl https://your-domain.com/health

# Check database version
cd backend
alembic current

# Monitor logs for errors
sudo journalctl -u osprey -n 100
```

---

## Platform-Specific Instructions

### DigitalOcean Droplet

**Automated Deployment Script:**

```bash
# On your local machine, create deploy script
cat > deploy-to-do.sh << 'EOF'
#!/bin/bash
set -e

SERVER="root@your-droplet-ip"
APP_DIR="/opt/osprey"

echo "🚀 Deploying to DigitalOcean..."

# Backup database
echo "📦 Creating database backup..."
ssh $SERVER "pg_dump -h db-host -U osprey osprey > /backups/osprey_\$(date +%Y%m%d_%H%M%S).sql"

# Deploy code
echo "📤 Deploying code..."
ssh $SERVER << 'ENDSSH'
cd /opt/osprey
git pull origin main
cd backend
pip3 install -r requirements.txt
alembic upgrade head
sudo systemctl restart osprey
ENDSSH

# Deploy frontend (if on same server)
echo "🎨 Deploying frontend..."
ssh $SERVER << 'ENDSSH'
cd /opt/osprey/frontend
npm install
npm run build
sudo cp -r dist/* /var/www/html/
ENDSSH

echo "✅ Deployment complete!"
echo "🔍 Checking health..."
curl https://your-domain.com/health

EOF

chmod +x deploy-to-do.sh
```

**Usage:**
```bash
./deploy-to-do.sh
```

### Railway

**Procfile:**
```
release: cd backend && alembic upgrade head
web: cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT
```

**Deploy:**
```bash
git push railway main
# Railway automatically runs migrations before starting the app
```

### Docker Compose

**Update docker-compose.yml:**

```yaml
version: '3.8'

services:
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: osprey
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: osprey
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups

  backend:
    build: ./backend
    command: >
      sh -c "alembic upgrade head &&
             uvicorn main:app --host 0.0.0.0 --port 8000"
    environment:
      DATABASE_URL: postgresql://osprey:${DB_PASSWORD}@db:5432/osprey
    depends_on:
      - db
    ports:
      - "8000:8000"

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      VITE_API_URL: http://localhost:8000

volumes:
  postgres_data:
```

**Deploy:**
```bash
docker-compose down
docker-compose build
docker-compose up -d

# Check logs
docker-compose logs -f backend
```

---

## Rollback Procedures

### If Deployment Fails

**1. Rollback Code:**
```bash
# SSH into server
cd /opt/osprey
git log --oneline -5  # Find previous commit
git checkout abc123   # Previous working commit
sudo systemctl restart osprey
```

**2. Rollback Database Migration:**
```bash
cd backend

# Check current version
alembic current

# Rollback one migration
alembic downgrade -1

# Or rollback to specific version
alembic downgrade abc123

# Restart app
sudo systemctl restart osprey
```

**3. Restore from Backup (Last Resort):**
```bash
# Stop application
sudo systemctl stop osprey

# Restore database
psql -h db-host -U osprey osprey < backup_20241206_143022.sql

# Rollback code
cd /opt/osprey
git checkout previous-working-commit

# Restart
sudo systemctl start osprey
```

---

## Monitoring & Alerts

### Health Checks

**Create monitoring script:**

```bash
# /opt/osprey/monitor.sh
#!/bin/bash

HEALTH_URL="https://your-domain.com/health"
ALERT_EMAIL="admin@your-domain.com"

if ! curl -f -s $HEALTH_URL > /dev/null; then
    echo "Osprey is DOWN!" | mail -s "ALERT: Osprey Down" $ALERT_EMAIL
    sudo systemctl restart osprey
fi
```

**Add to crontab:**
```bash
# Check every 5 minutes
*/5 * * * * /opt/osprey/monitor.sh
```

### Log Monitoring

```bash
# View live logs
sudo journalctl -u osprey -f

# View errors only
sudo journalctl -u osprey -p err

# View last 100 lines
sudo journalctl -u osprey -n 100
```

### Database Monitoring

```bash
# Check database size
psql -h db-host -U osprey -d osprey -c "
SELECT 
    pg_size_pretty(pg_database_size('osprey')) as db_size,
    (SELECT count(*) FROM flight_sessions) as sessions,
    (SELECT count(*) FROM users) as users;
"

# Check slow queries
psql -h db-host -U osprey -d osprey -c "
SELECT query, calls, total_time, mean_time 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;
"
```

---

## Automated Backup Script

```bash
# /opt/osprey/backup.sh
#!/bin/bash

BACKUP_DIR="/backups"
DB_HOST="your-db-host"
DB_USER="osprey"
DB_NAME="osprey"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup
pg_dump -h $DB_HOST -U $DB_USER $DB_NAME | gzip > $BACKUP_DIR/osprey_$DATE.sql.gz

# Keep only last 30 days
find $BACKUP_DIR -name "osprey_*.sql.gz" -mtime +30 -delete

echo "Backup completed: osprey_$DATE.sql.gz"
```

**Add to crontab:**
```bash
# Daily backup at 2 AM
0 2 * * * /opt/osprey/backup.sh
```

---

## Quick Reference

### Common Deployment Commands

```bash
# Full deployment with schema changes
git pull && cd backend && alembic upgrade head && sudo systemctl restart osprey

# Code-only deployment
git pull && sudo systemctl restart osprey

# Check if migrations are pending
cd backend && alembic current

# View deployment logs
sudo journalctl -u osprey -f

# Rollback last migration
cd backend && alembic downgrade -1 && sudo systemctl restart osprey
```

### Emergency Contacts

- **Database Issues**: Check DigitalOcean dashboard
- **Application Down**: `sudo systemctl status osprey`
- **Migration Failed**: Restore from backup, rollback code
- **High CPU/Memory**: `htop` or upgrade droplet size

---

## Checklist: Before Every Deployment

- [ ] Code reviewed and tested locally
- [ ] Database backup completed (if schema changes)
- [ ] Migration tested locally (if schema changes)
- [ ] Team notified of deployment window
- [ ] Monitoring/alerts active
- [ ] Rollback plan ready
- [ ] Deploy during low-traffic period (if possible)

---

**Remember:** 
- Always backup before schema changes
- Test migrations locally first
- Deploy during off-peak hours
- Monitor logs after deployment
- Have a rollback plan ready
