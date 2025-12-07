# Osprey Deployment - Quick Start

## TL;DR - Deploy in 30 Minutes

### For 1,000 Users: Use DigitalOcean ($33/month)

---

## Step 1: Create DigitalOcean Resources (10 min)

1. **Create Droplet**
   - Go to digitalocean.com
   - Create Droplet: Ubuntu 22.04, 2GB RAM ($18/month)
   - Note the IP address

2. **Create Database**
   - Create Managed PostgreSQL: 1GB RAM ($15/month)
   - Note connection details

---

## Step 2: Deploy Backend (10 min)

```bash
# SSH into droplet
ssh root@YOUR_DROPLET_IP

# Install dependencies
apt update && apt install -y python3.11 python3-pip git

# Clone repo
cd /opt
git clone YOUR_REPO_URL osprey
cd osprey

# Set environment
cat > backend/.env << EOF
DATABASE_URL=postgresql://USER:PASS@DB_HOST:25060/osprey?sslmode=require
EOF

# Install and migrate
cd backend
pip3 install -r requirements.txt
alembic upgrade head

# Create systemd service
cat > /etc/systemd/system/osprey.service << 'EOF'
[Unit]
Description=Osprey API
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/osprey/backend
EnvironmentFile=/opt/osprey/backend/.env
ExecStart=/usr/local/bin/uvicorn main:app --host 0.0.0.0 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# Start service
systemctl enable osprey
systemctl start osprey
systemctl status osprey
```

---

## Step 3: Deploy Frontend (10 min)

```bash
# On your local machine
cd frontend

# Install Vercel CLI
npm install -g vercel

# Deploy
vercel login
vercel --prod

# In Vercel dashboard, set environment variable:
# VITE_API_URL = http://YOUR_DROPLET_IP:8000
```

**Done!** Your app is live.

---

## Daily Workflow

### Making Changes (No Schema Changes)

```bash
# 1. Make changes locally
git add .
git commit -m "Add feature"
git push

# 2. Deploy to server
ssh root@YOUR_DROPLET_IP
cd /opt/osprey
git pull
systemctl restart osprey

# 3. Frontend auto-deploys via Vercel
```

### Making Schema Changes

```bash
# 1. Update models locally
# Edit backend/models.py

# 2. Create migration
cd backend
alembic revision --autogenerate -m "Add new column"

# 3. Test locally
alembic upgrade head
# Test your app

# 4. Commit and push
git add .
git commit -m "Add new column migration"
git push

# 5. Deploy to server
ssh root@YOUR_DROPLET_IP
cd /opt/osprey
git pull
cd backend
alembic upgrade head
systemctl restart osprey
```

---

## Common Commands

```bash
# View logs
journalctl -u osprey -f

# Restart service
systemctl restart osprey

# Check database
cd /opt/osprey/backend
alembic current

# Rollback migration
alembic downgrade -1
```

---

## Backup (Important!)

```bash
# Create backup script
cat > /opt/osprey/backup.sh << 'EOF'
#!/bin/bash
pg_dump -h DB_HOST -U USER osprey | gzip > /backups/osprey_$(date +%Y%m%d).sql.gz
EOF

chmod +x /opt/osprey/backup.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add: 0 2 * * * /opt/osprey/backup.sh
```

---

## Troubleshooting

**App won't start:**
```bash
journalctl -u osprey -n 50
```

**Database connection error:**
```bash
# Check .env file
cat /opt/osprey/backend/.env

# Test connection
psql "postgresql://USER:PASS@DB_HOST:25060/osprey?sslmode=require"
```

**Migration failed:**
```bash
cd /opt/osprey/backend
alembic current
alembic downgrade -1
# Fix issue, then:
alembic upgrade head
```

---

## Cost Breakdown

- Droplet (2GB): $18/month
- PostgreSQL (1GB): $15/month
- Vercel Frontend: $0/month
- **Total: $33/month**

Supports 1,000 users, 5,000 uploads/week, 16GB data/year.

---

## Need Help?

- Full guide: See `DEPLOYMENT_WORKFLOW.md`
- Migrations: See `MIGRATIONS.md`
- Hosting options: See `HOSTING_COSTS.md`
