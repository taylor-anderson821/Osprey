# Osprey Deployment & Migration Setup - Summary

## What I've Set Up For You

### 1. Database Migration System (Alembic)

**Files Created:**
- `backend/alembic.ini` - Alembic configuration
- `backend/alembic/env.py` - Migration environment
- `backend/alembic/script.py.mako` - Migration template
- `backend/alembic/versions/001_initial_schema.py` - Your initial database schema

**What This Does:**
- Tracks all database schema changes in version control
- Allows safe, reversible database updates in production
- Auto-generates migrations from model changes
- Prevents data loss during schema updates

### 2. Deployment Scripts

**Files Created:**
- `deploy.sh` - Automated deployment script
- Supports DigitalOcean, Railway, and Docker deployments

### 3. Documentation

**Files Created:**
- `MIGRATIONS.md` - Complete guide to database migrations
- `DEPLOYMENT_WORKFLOW.md` - Full deployment process documentation
- `DEPLOYMENT_QUICK_START.md` - 30-minute quick start guide
- `DEPLOYMENT_SUMMARY.md` - This file

### 4. Code Updates

**Modified Files:**
- `backend/requirements.txt` - Added Alembic
- `backend/main.py` - Disabled auto-create tables (now using migrations)

---

## How to Use This

### First Time Setup

```bash
# 1. Install Alembic
cd backend
pip install -r requirements.txt

# 2. Run initial migration (creates all tables)
alembic upgrade head

# 3. Your database is now ready!
```

### When You Change Database Schema

**Example: Adding a new column to User model**

```bash
# 1. Edit your model
# backend/models.py
class User(Base):
    # ... existing columns ...
    timezone = Column(String, default="UTC")  # NEW

# 2. Generate migration automatically
cd backend
alembic revision --autogenerate -m "Add timezone to users"

# 3. Review the generated file in alembic/versions/

# 4. Apply migration
alembic upgrade head

# 5. Commit to git
git add backend/models.py backend/alembic/versions/*.py
git commit -m "Add timezone field to users"
```

### Deploying to Production

**Simple Version:**
```bash
# On production server
cd /opt/osprey
git pull
cd backend
alembic upgrade head
systemctl restart osprey
```

**Automated Version:**
```bash
# Use the deploy script
./deploy.sh production
```

---

## Your Recommended Setup

### For 1,000 Users with 5 Sessions/Week Each

**Platform: DigitalOcean**
- **Cost:** $33/month
- **Droplet:** 2GB RAM, 2 vCPU ($18/month)
- **Database:** Managed PostgreSQL 1GB ($15/month)
- **Frontend:** Vercel (free)

**Why This Works:**
- Handles 5,000 uploads/week easily
- 16GB storage (2+ years of data)
- Professional reliability
- Easy to scale
- Automated backups included

**Upgrade Path:**
- Year 2: Add $15/month for more storage
- High traffic: Upgrade droplet to $36/month (4GB RAM)

---

## Key Concepts

### Migrations Solve These Problems:

**Without Migrations (Your Current Setup):**
```python
# main.py
models.Base.metadata.create_all(bind=database.engine)
```
- ❌ Can't track schema changes
- ❌ Can't rollback changes
- ❌ Risky in production
- ❌ No history of what changed when

**With Migrations (New Setup):**
```bash
alembic upgrade head
```
- ✅ Every change is tracked
- ✅ Can rollback if needed
- ✅ Safe for production
- ✅ Full history in git

### Deployment Workflow:

```
Local Development
    ↓
1. Make code changes
2. Generate migration (if schema changed)
3. Test locally
    ↓
Git Repository
    ↓
4. Push to git
    ↓
Production Server
    ↓
5. Pull code
6. Run migrations
7. Restart app
    ↓
Live Application
```

---

## Common Scenarios

### Scenario 1: Add New Feature (No Schema Change)

```bash
# Local
git add .
git commit -m "Add export feature"
git push

# Production
ssh server
cd /opt/osprey && git pull
systemctl restart osprey
```

**Time:** 2 minutes

### Scenario 2: Add New Database Column

```bash
# Local
# Edit models.py
alembic revision --autogenerate -m "Add column"
alembic upgrade head  # Test
git push

# Production
ssh server
cd /opt/osprey && git pull
cd backend && alembic upgrade head
systemctl restart osprey
```

**Time:** 5 minutes

### Scenario 3: Add New Table

```bash
# Local
# Create new model in models.py
alembic revision --autogenerate -m "Add subscriptions table"
alembic upgrade head  # Test
git push

# Production
ssh server
cd /opt/osprey && git pull
cd backend && alembic upgrade head
systemctl restart osprey
```

**Time:** 5 minutes

### Scenario 4: Rollback Bad Deployment

```bash
# Production
ssh server
cd /opt/osprey
git log --oneline -5  # Find previous commit
git checkout abc123   # Previous version
cd backend && alembic downgrade -1  # Rollback migration
systemctl restart osprey
```

**Time:** 3 minutes

---

## Safety Features

### 1. Automatic Backups
- DigitalOcean: Daily automated backups
- Manual: `pg_dump` before each deployment

### 2. Rollback Capability
```bash
# Rollback last migration
alembic downgrade -1

# Rollback to specific version
alembic downgrade abc123
```

### 3. Transaction Safety
- Migrations run in transactions
- If one fails, everything rolls back
- Database stays consistent

### 4. Testing Before Production
```bash
# Always test locally first
alembic upgrade head
# Run your app, test features
alembic downgrade -1  # Test rollback
alembic upgrade head  # Re-apply
```

---

## Quick Reference

### Most Common Commands

```bash
# Create migration from model changes
alembic revision --autogenerate -m "Description"

# Apply all pending migrations
alembic upgrade head

# Rollback last migration
alembic downgrade -1

# Show current version
alembic current

# Show migration history
alembic history

# Deploy everything
git pull && cd backend && alembic upgrade head && systemctl restart osprey
```

### File Locations

```
backend/
├── alembic/
│   ├── versions/
│   │   └── 001_initial_schema.py  ← Your migrations
│   ├── env.py                      ← Migration environment
│   └── script.py.mako              ← Template
├── alembic.ini                     ← Configuration
├── models.py                       ← Your database models
└── main.py                         ← FastAPI app
```

---

## Next Steps

### Immediate (Before First Deployment):

1. **Test migrations locally:**
   ```bash
   cd backend
   pip install -r requirements.txt
   alembic upgrade head
   ```

2. **Choose hosting platform:**
   - Recommended: DigitalOcean ($33/month)
   - Alternative: Railway ($20/month)

3. **Read quick start:**
   - See `DEPLOYMENT_QUICK_START.md`

### Before Going Live:

1. **Set up automated backups**
2. **Configure monitoring/alerts**
3. **Test full deployment workflow**
4. **Document your specific server details**

### After Launch:

1. **Monitor logs regularly**
2. **Test backup restoration**
3. **Practice rollback procedure**
4. **Set up staging environment** (optional)

---

## Questions & Answers

**Q: Do I need to run migrations locally?**
A: Yes! Always test migrations locally before production.

**Q: What if I forget to create a migration?**
A: Your app will fail in production. Always run `alembic revision --autogenerate` after model changes.

**Q: Can I edit a migration after creating it?**
A: Yes, before applying it. After applying, create a new migration instead.

**Q: What if two people create migrations at the same time?**
A: Alembic handles this with revision chains. Merge conflicts are rare.

**Q: How do I backup before deployment?**
A: `pg_dump -h host -U user dbname > backup.sql` or use DigitalOcean's automated backups.

**Q: Can I skip Alembic and keep using create_all()?**
A: Not recommended for production. You'll lose data during schema changes.

---

## Support Resources

- **Alembic Docs:** https://alembic.sqlalchemy.org/
- **DigitalOcean Docs:** https://docs.digitalocean.com/
- **Your Docs:**
  - Quick Start: `DEPLOYMENT_QUICK_START.md`
  - Full Guide: `DEPLOYMENT_WORKFLOW.md`
  - Migrations: `MIGRATIONS.md`
  - Costs: `HOSTING_COSTS.md`

---

## Summary

You now have:
- ✅ Professional database migration system
- ✅ Safe deployment workflow
- ✅ Rollback capability
- ✅ Complete documentation
- ✅ Automated deployment scripts
- ✅ Cost-effective hosting plan

**You're ready to deploy Osprey to production safely!**

Start with `DEPLOYMENT_QUICK_START.md` for a 30-minute setup guide.
