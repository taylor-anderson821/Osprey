# Database Migrations Guide

## Overview

Osprey uses **Alembic** for database schema migrations. This ensures safe, trackable changes to your database structure in production.

## Quick Start

### Initial Setup (First Time Only)

```bash
cd backend
pip install -r requirements.txt

# Create initial migration from current models
alembic revision --autogenerate -m "Initial schema"

# Apply migration to database
alembic upgrade head
```

### Making Schema Changes

When you modify `backend/models.py`:

```bash
cd backend

# 1. Generate migration automatically
alembic revision --autogenerate -m "Add user preferences table"

# 2. Review the generated migration file in alembic/versions/
# Make sure it looks correct!

# 3. Apply migration to local database
alembic upgrade head

# 4. Test your changes locally

# 5. Commit migration file to git
git add alembic/versions/*.py
git commit -m "Add user preferences migration"
```

## Common Migration Scenarios

### Adding a New Column

**1. Update your model:**
```python
# backend/models.py
class User(Base):
    __tablename__ = "users"
    # ... existing columns ...
    timezone = Column(String, default="UTC")  # NEW COLUMN
```

**2. Generate migration:**
```bash
cd backend
alembic revision --autogenerate -m "Add timezone to users"
```

**3. Review generated file:**
```python
# alembic/versions/xxxx_add_timezone_to_users.py
def upgrade():
    op.add_column('users', sa.Column('timezone', sa.String(), nullable=True))
    # Optional: Set default for existing rows
    op.execute("UPDATE users SET timezone = 'UTC' WHERE timezone IS NULL")

def downgrade():
    op.drop_column('users', 'timezone')
```

**4. Apply:**
```bash
alembic upgrade head
```

### Adding a New Table

**1. Create model:**
```python
# backend/models.py
class Subscription(Base):
    __tablename__ = "subscriptions"
    id = Column(Integer, primary_key=True)
    user_id = Column(String, ForeignKey("users.id"))
    plan = Column(String)
    expires_at = Column(DateTime)
```

**2. Generate and apply:**
```bash
alembic revision --autogenerate -m "Add subscriptions table"
alembic upgrade head
```

### Renaming a Column (Careful!)

Alembic can't auto-detect renames. You need to manually edit:

```python
# alembic/versions/xxxx_rename_column.py
def upgrade():
    op.alter_column('users', 'photo_url', new_column_name='avatar_url')

def downgrade():
    op.alter_column('users', 'avatar_url', new_column_name='photo_url')
```

### Data Migrations

Sometimes you need to transform data, not just schema:

```python
# alembic/versions/xxxx_convert_altitude_units.py
from alembic import op
import sqlalchemy as sa

def upgrade():
    # Add new column
    op.add_column('flight_sessions', sa.Column('altitude_unit', sa.String(), nullable=True))
    
    # Set default for existing rows
    op.execute("UPDATE flight_sessions SET altitude_unit = 'feet'")
    
    # Make it non-nullable
    op.alter_column('flight_sessions', 'altitude_unit', nullable=False)

def downgrade():
    op.drop_column('flight_sessions', 'altitude_unit')
```

## Deployment Workflow

### Development → Production

**1. Develop locally:**
```bash
# Make model changes
# Generate migration
alembic revision --autogenerate -m "Description"
# Test locally
alembic upgrade head
```

**2. Commit to git:**
```bash
git add backend/models.py backend/alembic/versions/*.py
git commit -m "Add feature X with schema changes"
git push origin main
```

**3. Deploy to production:**

**Option A: Automated (Railway/Render)**
```bash
# Add to your Procfile or start command:
release: cd backend && alembic upgrade head
web: cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT
```

**Option B: Manual (DigitalOcean)**
```bash
# SSH into server
ssh user@your-droplet

# Pull latest code
cd /app/osprey
git pull origin main

# Run migrations
cd backend
source venv/bin/activate
alembic upgrade head

# Restart application
sudo systemctl restart osprey
```

**Option C: Docker**
```bash
# Update docker-compose.yml to run migrations on startup
# Or run manually:
docker-compose exec backend alembic upgrade head
docker-compose restart backend
```

## Safety Tips

### Before Deploying Schema Changes:

1. **Backup your database!**
   ```bash
   # PostgreSQL backup
   pg_dump -h localhost -U osprey osprey > backup_$(date +%Y%m%d).sql
   ```

2. **Test migrations locally first**
   ```bash
   # Test upgrade
   alembic upgrade head
   
   # Test downgrade (rollback)
   alembic downgrade -1
   
   # Re-upgrade
   alembic upgrade head
   ```

3. **Review auto-generated migrations**
   - Alembic isn't perfect
   - Check for missing indexes
   - Verify foreign key constraints
   - Add data transformations if needed

4. **Use transactions**
   - Migrations run in transactions by default
   - If one fails, everything rolls back

5. **Plan for zero-downtime**
   - Add columns as nullable first
   - Deploy code that works with old AND new schema
   - Run migration
   - Deploy code that requires new schema
   - Make columns non-nullable if needed

## Common Commands

```bash
# Show current migration version
alembic current

# Show migration history
alembic history

# Upgrade to latest
alembic upgrade head

# Upgrade one version
alembic upgrade +1

# Downgrade one version
alembic downgrade -1

# Downgrade to specific version
alembic downgrade abc123

# Show SQL without executing
alembic upgrade head --sql

# Create empty migration (for data-only changes)
alembic revision -m "Migrate user data"
```

## Troubleshooting

### "Target database is not up to date"
```bash
# Check current version
alembic current

# Check what's pending
alembic history

# Upgrade
alembic upgrade head
```

### "Can't locate revision identified by 'xyz'"
```bash
# Your alembic_version table is out of sync
# Option 1: Stamp current version
alembic stamp head

# Option 2: Reset (DANGER - only in dev!)
# Drop alembic_version table and re-run
alembic stamp head
```

### Migration fails halfway
```bash
# Alembic uses transactions, so it should rollback
# But if it doesn't, you may need to:

# 1. Fix the migration file
# 2. Manually rollback database changes
# 3. Try again

# Or restore from backup
psql -h localhost -U osprey osprey < backup_20241206.sql
```

## Zero-Downtime Migration Example

**Scenario:** Rename `photo_url` to `avatar_url` without downtime

**Step 1: Add new column (deploy 1)**
```python
# models.py - support BOTH columns temporarily
class User(Base):
    photo_url = Column(String, nullable=True)  # OLD
    avatar_url = Column(String, nullable=True)  # NEW
```

```bash
alembic revision --autogenerate -m "Add avatar_url column"
alembic upgrade head
```

**Step 2: Copy data (deploy 2)**
```python
# Migration
def upgrade():
    op.execute("UPDATE users SET avatar_url = photo_url WHERE avatar_url IS NULL")
```

**Step 3: Update code to use new column (deploy 3)**
```python
# Update all code to use avatar_url instead of photo_url
```

**Step 4: Drop old column (deploy 4)**
```python
# Migration
def upgrade():
    op.drop_column('users', 'photo_url')
```

## Production Checklist

Before running migrations in production:

- [ ] Database backup completed
- [ ] Migration tested locally
- [ ] Migration tested on staging
- [ ] Downgrade path tested
- [ ] Team notified of deployment
- [ ] Monitoring/alerts ready
- [ ] Rollback plan documented
- [ ] Off-peak hours scheduled (if possible)

## Integration with CI/CD

### GitHub Actions Example

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Run migrations
        run: |
          cd backend
          pip install -r requirements.txt
          alembic upgrade head
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
      
      - name: Deploy application
        run: ./deploy.sh production
```

## Questions?

- **Q: Can I edit a migration after it's been applied?**
  - A: No! Create a new migration instead.

- **Q: Should I commit migration files?**
  - A: Yes! Always commit to git.

- **Q: What if two developers create migrations at the same time?**
  - A: Alembic handles this with revision chains. Merge conflicts are rare.

- **Q: Can I skip a migration?**
  - A: Not recommended. Migrations should be sequential.

- **Q: How do I test migrations on production data?**
  - A: Create a staging database with production data copy.

---

**Remember:** Migrations are code. Review them like code. Test them like code. Version them like code.
