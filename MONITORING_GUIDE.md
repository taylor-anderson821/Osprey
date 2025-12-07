# Osprey Monitoring & Observability Guide

## Overview

Comprehensive monitoring strategy for a production SaaS application with 1,000 users.

---

## Table of Contents

1. [Monitoring Stack Overview](#monitoring-stack-overview)
2. [Application Performance Monitoring (APM)](#application-performance-monitoring)
3. [Error Tracking](#error-tracking)
4. [Uptime Monitoring](#uptime-monitoring)
5. [Log Management](#log-management)
6. [Database Monitoring](#database-monitoring)
7. [User Analytics](#user-analytics)
8. [Alerts & Notifications](#alerts--notifications)
9. [Cost Breakdown](#cost-breakdown)
10. [Implementation Guide](#implementation-guide)

---

## Monitoring Stack Overview

### Recommended Stack (Budget-Friendly)

| Component | Tool | Cost | Purpose |
|-----------|------|------|---------|
| **APM** | Sentry | Free tier | Error tracking, performance |
| **Uptime** | UptimeRobot | Free | Uptime checks, alerts |
| **Logs** | Better Stack (Logtail) | $5/mo | Centralized logging |
| **Database** | Built-in (DigitalOcean) | Included | DB metrics |
| **Analytics** | Plausible or PostHog | $9/mo | User behavior |
| **Status Page** | Statuspage.io | $29/mo | Public status |
| **Total** | | **$43/month** | |

### Alternative: Premium Stack

| Component | Tool | Cost | Purpose |
|-----------|------|------|---------|
| **APM** | Datadog | $15/host | Full observability |
| **Errors** | Sentry Pro | $26/mo | Advanced error tracking |
| **Logs** | Datadog | Included | Centralized logging |
| **Analytics** | Mixpanel | $25/mo | Product analytics |
| **Total** | | **$66/month** | |

---

## 1. Application Performance Monitoring (APM)

### Option A: Sentry (Recommended)

**Why Sentry:**
- Free tier: 5,000 errors/month
- Tracks errors, performance, releases
- Source map support
- User context
- Slack/email alerts

**Setup (15 minutes):**

```bash
# Backend
pip install sentry-sdk[fastapi]
```

```python
# backend/main.py
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

sentry_sdk.init(
    dsn=os.getenv("SENTRY_DSN"),
    integrations=[
        FastApiIntegration(),
        SqlalchemyIntegration(),
    ],
    traces_sample_rate=0.1,  # 10% of transactions
    profiles_sample_rate=0.1,
    environment="production",
    release=os.getenv("GIT_COMMIT", "unknown"),
)

# Add user context to errors
@app.middleware("http")
async def add_sentry_context(request: Request, call_next):
    if hasattr(request.state, "user"):
        sentry_sdk.set_user({
            "id": request.state.user.id,
            "email": request.state.user.email
        })
    response = await call_next(request)
    return response
```

```bash
# Frontend
npm install @sentry/react @sentry/tracing
```

```javascript
// frontend/src/main.jsx
import * as Sentry from "@sentry/react";
import { BrowserTracing } from "@sentry/tracing";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  integrations: [new BrowserTracing()],
  tracesSampleRate: 0.1,
  environment: "production",
  release: import.meta.env.VITE_GIT_COMMIT,
});
```

**What You'll See:**
- Real-time error notifications
- Stack traces with source maps
- Performance bottlenecks
- User impact (which users hit errors)
- Release tracking

---

## 2. Error Tracking

### Custom Error Logging

```python
# backend/monitoring.py

import logging
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text, JSON
from database import Base

class ErrorLog(Base):
    __tablename__ = "error_logs"
    
    id = Column(Integer, primary_key=True)
    timestamp = Column(DateTime(timezone=True), default=datetime.now)
    level = Column(String)  # ERROR, WARNING, CRITICAL
    message = Column(Text)
    user_id = Column(String, nullable=True)
    endpoint = Column(String)
    method = Column(String)
    status_code = Column(Integer)
    stack_trace = Column(Text, nullable=True)
    context = Column(JSON, nullable=True)

# Middleware to log errors
@app.middleware("http")
async def log_errors(request: Request, call_next):
    try:
        response = await call_next(request)
        return response
    except Exception as e:
        # Log to database
        db = SessionLocal()
        error_log = ErrorLog(
            level="ERROR",
            message=str(e),
            user_id=getattr(request.state, "user_id", None),
            endpoint=request.url.path,
            method=request.method,
            stack_trace=traceback.format_exc(),
            context={
                "headers": dict(request.headers),
                "query_params": dict(request.query_params)
            }
        )
        db.add(error_log)
        db.commit()
        db.close()
        
        # Re-raise for Sentry
        raise
```

**Error Dashboard Endpoint:**

```python
@app.get("/api/admin/errors")
async def get_errors(
    skip: int = 0,
    limit: int = 50,
    current_user: models.User = Depends(auth.require_admin),
    db: Session = Depends(get_db)
):
    """Get recent errors (admin only)"""
    errors = db.query(ErrorLog)\
        .order_by(ErrorLog.timestamp.desc())\
        .offset(skip)\
        .limit(limit)\
        .all()
    return errors
```

---

## 3. Uptime Monitoring

### Option A: UptimeRobot (Free)

**Setup (5 minutes):**

1. Go to uptimerobot.com
2. Create monitors:
   - **API Health Check:** `https://api.yourdomain.com/health` (every 5 min)
   - **Frontend:** `https://yourdomain.com` (every 5 min)
   - **Database:** Custom port check (if exposed)

3. Configure alerts:
   - Email notifications
   - Slack webhook
   - SMS (paid)

**Health Check Endpoint:**

```python
# backend/main.py

from sqlalchemy import text

@app.get("/health")
async def health_check(db: Session = Depends(get_db)):
    """Comprehensive health check"""
    try:
        # Check database
        db.execute(text("SELECT 1"))
        
        # Check critical services
        health = {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "database": "connected",
            "version": os.getenv("GIT_COMMIT", "unknown")
        }
        
        return health
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }, 503
```

### Option B: Better Uptime ($10/month)

- More detailed checks
- Status page included
- Incident management
- Better alerting

---

## 4. Log Management

### Option A: Better Stack (Logtail) - $5/month

**Setup:**

```bash
pip install logtail-python
```

```python
# backend/main.py
from logtail import LogtailHandler
import logging

# Configure logging
logtail_handler = LogtailHandler(source_token=os.getenv("LOGTAIL_TOKEN"))
logger = logging.getLogger()
logger.addHandler(logtail_handler)
logger.setLevel(logging.INFO)

# Log important events
@app.post("/api/upload")
async def upload_tlm_file(...):
    logger.info("File upload started", extra={
        "user_id": current_user.id,
        "filename": file.filename,
        "size": len(contents)
    })
    
    # ... process file ...
    
    logger.info("File upload completed", extra={
        "user_id": current_user.id,
        "sessions_created": len(result['sessions'])
    })
```

### Option B: Built-in Logging (Free)

**Structured Logging:**

```python
# backend/logging_config.py

import logging
import json
from datetime import datetime

class JSONFormatter(logging.Formatter):
    def format(self, record):
        log_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
        }
        
        if hasattr(record, "user_id"):
            log_data["user_id"] = record.user_id
        
        if hasattr(record, "extra"):
            log_data.update(record.extra)
        
        return json.dumps(log_data)

# Configure
logging.basicConfig(
    level=logging.INFO,
    handlers=[
        logging.FileHandler("/var/log/osprey/app.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)
logger.handlers[0].setFormatter(JSONFormatter())
```

**Log Rotation:**

```bash
# /etc/logrotate.d/osprey
/var/log/osprey/*.log {
    daily
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        systemctl reload osprey
    endscript
}
```

---

## 5. Database Monitoring

### DigitalOcean Built-in Metrics

**Available Metrics:**
- CPU usage
- Memory usage
- Disk I/O
- Connection count
- Query performance
- Slow queries

**Custom Monitoring:**

```python
# backend/monitoring.py

from sqlalchemy import Column, Integer, Float, DateTime, String
from datetime import datetime

class DatabaseMetrics(Base):
    __tablename__ = "database_metrics"
    
    id = Column(Integer, primary_key=True)
    timestamp = Column(DateTime(timezone=True), default=datetime.now)
    table_name = Column(String)
    row_count = Column(Integer)
    table_size_mb = Column(Float)
    index_size_mb = Column(Float)

@app.get("/api/admin/db-metrics")
async def get_db_metrics(
    current_user: models.User = Depends(auth.require_admin),
    db: Session = Depends(get_db)
):
    """Get database metrics"""
    metrics = db.execute(text("""
        SELECT 
            schemaname,
            tablename,
            pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
            n_live_tup as row_count
        FROM pg_stat_user_tables
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
    """)).fetchall()
    
    return [dict(row) for row in metrics]
```

**Slow Query Logging:**

```python
# backend/database.py

from sqlalchemy import event
from sqlalchemy.engine import Engine
import time
import logging

logger = logging.getLogger(__name__)

@event.listens_for(Engine, "before_cursor_execute")
def before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    conn.info.setdefault('query_start_time', []).append(time.time())

@event.listens_for(Engine, "after_cursor_execute")
def after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    total = time.time() - conn.info['query_start_time'].pop(-1)
    
    # Log slow queries (> 1 second)
    if total > 1.0:
        logger.warning(f"Slow query ({total:.2f}s): {statement[:200]}")
```

---

## 6. User Analytics

### Option A: Plausible Analytics ($9/month)

**Why Plausible:**
- Privacy-friendly (GDPR compliant)
- Lightweight (< 1KB script)
- No cookies
- Simple dashboard

**Setup:**

```html
<!-- frontend/index.html -->
<script defer data-domain="yourdomain.com" src="https://plausible.io/js/script.js"></script>
```

**Track Custom Events:**

```javascript
// Track important actions
window.plausible('Session Upload', {
  props: { sessions: 3 }
});

window.plausible('Subscription', {
  props: { plan: 'pilot' }
});
```

### Option B: PostHog (Self-hosted or $9/month)

**More Features:**
- Session recording
- Feature flags
- A/B testing
- Funnels
- Cohorts

```bash
npm install posthog-js
```

```javascript
// frontend/src/main.jsx
import posthog from 'posthog-js'

posthog.init('YOUR_API_KEY', {
  api_host: 'https://app.posthog.com'
})

// Track events
posthog.capture('session_uploaded', {
  session_count: 3,
  user_plan: 'pilot'
})
```

### Option C: Custom Analytics

```python
# backend/models.py

class AnalyticsEvent(Base):
    __tablename__ = "analytics_events"
    
    id = Column(Integer, primary_key=True)
    timestamp = Column(DateTime(timezone=True), default=datetime.now)
    user_id = Column(String, ForeignKey("users.id"))
    event_type = Column(String)  # "session_upload", "subscription", etc.
    properties = Column(JSON)

# Track events
@app.post("/api/upload")
async def upload_tlm_file(...):
    # ... upload logic ...
    
    # Track event
    event = AnalyticsEvent(
        user_id=current_user.id,
        event_type="session_upload",
        properties={
            "session_count": len(result['sessions']),
            "file_size": len(contents)
        }
    )
    db.add(event)
    db.commit()
```

**Analytics Dashboard:**

```python
@app.get("/api/admin/analytics")
async def get_analytics(
    days: int = 30,
    current_user: models.User = Depends(auth.require_admin),
    db: Session = Depends(get_db)
):
    """Get analytics summary"""
    from sqlalchemy import func
    from datetime import timedelta
    
    start_date = datetime.now() - timedelta(days=days)
    
    # Daily active users
    dau = db.query(
        func.date(AnalyticsEvent.timestamp).label('date'),
        func.count(func.distinct(AnalyticsEvent.user_id)).label('users')
    ).filter(
        AnalyticsEvent.timestamp >= start_date
    ).group_by(func.date(AnalyticsEvent.timestamp)).all()
    
    # Event counts
    events = db.query(
        AnalyticsEvent.event_type,
        func.count(AnalyticsEvent.id).label('count')
    ).filter(
        AnalyticsEvent.timestamp >= start_date
    ).group_by(AnalyticsEvent.event_type).all()
    
    return {
        "daily_active_users": [{"date": str(d.date), "users": d.users} for d in dau],
        "events": [{"type": e.event_type, "count": e.count} for e in events]
    }
```

---

## 7. Alerts & Notifications

### Slack Integration

```python
# backend/alerts.py

import requests
import os

def send_slack_alert(message: str, severity: str = "warning"):
    """Send alert to Slack"""
    webhook_url = os.getenv("SLACK_WEBHOOK_URL")
    
    color = {
        "info": "#36a64f",
        "warning": "#ff9900",
        "error": "#ff0000"
    }.get(severity, "#808080")
    
    payload = {
        "attachments": [{
            "color": color,
            "title": f"Osprey Alert - {severity.upper()}",
            "text": message,
            "footer": "Osprey Monitoring",
            "ts": int(datetime.now().timestamp())
        }]
    }
    
    requests.post(webhook_url, json=payload)

# Use in critical places
@app.post("/api/upload")
async def upload_tlm_file(...):
    try:
        # ... upload logic ...
        pass
    except Exception as e:
        send_slack_alert(
            f"Upload failed for user {current_user.id}: {str(e)}",
            severity="error"
        )
        raise
```

### Email Alerts

```python
# backend/alerts.py

from emails import Message

def send_email_alert(subject: str, body: str, to: str = "admin@yourdomain.com"):
    """Send email alert"""
    message = Message(
        subject=subject,
        html=body,
        mail_from=("Osprey Alerts", "alerts@yourdomain.com")
    )
    
    message.send(to=to, smtp={
        "host": os.getenv("SMTP_HOST"),
        "port": 587,
        "tls": True,
        "user": os.getenv("SMTP_USER"),
        "password": os.getenv("SMTP_PASSWORD")
    })
```

### Alert Rules

```python
# backend/monitoring.py

class AlertRule:
    """Define alert thresholds"""
    
    # Error rate
    ERROR_RATE_THRESHOLD = 0.05  # 5% error rate
    ERROR_RATE_WINDOW = 300  # 5 minutes
    
    # Response time
    SLOW_RESPONSE_THRESHOLD = 2.0  # 2 seconds
    
    # Database
    DB_CONNECTION_THRESHOLD = 80  # 80% of max connections
    
    # Disk space
    DISK_USAGE_THRESHOLD = 0.85  # 85% full

# Check and alert
async def check_error_rate(db: Session):
    """Check if error rate is too high"""
    recent_errors = db.query(ErrorLog).filter(
        ErrorLog.timestamp >= datetime.now() - timedelta(seconds=AlertRule.ERROR_RATE_WINDOW)
    ).count()
    
    total_requests = db.query(RequestLog).filter(
        RequestLog.timestamp >= datetime.now() - timedelta(seconds=AlertRule.ERROR_RATE_WINDOW)
    ).count()
    
    if total_requests > 0:
        error_rate = recent_errors / total_requests
        if error_rate > AlertRule.ERROR_RATE_THRESHOLD:
            send_slack_alert(
                f"High error rate: {error_rate:.1%} ({recent_errors}/{total_requests} requests)",
                severity="error"
            )
```

---

## 8. Metrics Dashboard

### Custom Admin Dashboard

```python
# backend/main.py

@app.get("/api/admin/dashboard")
async def get_dashboard_metrics(
    current_user: models.User = Depends(auth.require_admin),
    db: Session = Depends(get_db)
):
    """Get dashboard metrics"""
    from sqlalchemy import func
    from datetime import timedelta
    
    now = datetime.now()
    today = now.date()
    week_ago = now - timedelta(days=7)
    
    # User metrics
    total_users = db.query(func.count(models.User.id)).scalar()
    active_users_today = db.query(func.count(func.distinct(models.FlightSession.user_id))).filter(
        func.date(models.FlightSession.start_time) == today
    ).scalar()
    
    # Session metrics
    total_sessions = db.query(func.count(models.FlightSession.id)).scalar()
    sessions_today = db.query(func.count(models.FlightSession.id)).filter(
        func.date(models.FlightSession.start_time) == today
    ).scalar()
    sessions_this_week = db.query(func.count(models.FlightSession.id)).filter(
        models.FlightSession.start_time >= week_ago
    ).scalar()
    
    # Subscription metrics
    paid_users = db.query(func.count(models.Subscription.id)).filter(
        models.Subscription.status == "active",
        models.Subscription.plan_id != "free"
    ).scalar()
    
    mrr = db.query(func.sum(models.SubscriptionPlan.price_monthly)).join(
        models.Subscription
    ).filter(
        models.Subscription.status == "active",
        models.Subscription.billing_cycle == "monthly"
    ).scalar() or 0
    
    # Error metrics
    errors_today = db.query(func.count(ErrorLog.id)).filter(
        func.date(ErrorLog.timestamp) == today
    ).scalar()
    
    return {
        "users": {
            "total": total_users,
            "active_today": active_users_today,
            "paid": paid_users,
            "conversion_rate": (paid_users / total_users * 100) if total_users > 0 else 0
        },
        "sessions": {
            "total": total_sessions,
            "today": sessions_today,
            "this_week": sessions_this_week,
            "avg_per_day": sessions_this_week / 7
        },
        "revenue": {
            "mrr": mrr,
            "arr": mrr * 12
        },
        "health": {
            "errors_today": errors_today,
            "error_rate": (errors_today / sessions_today * 100) if sessions_today > 0 else 0
        }
    }
```

### Frontend Dashboard

```jsx
// frontend/src/components/AdminDashboard.jsx

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState(null);
  
  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);
  
  const fetchMetrics = async () => {
    const response = await fetch(`${API_URL}/api/admin/dashboard`, {
      headers: { 'Authorization': `Bearer ${getAccessToken()}` }
    });
    const data = await response.json();
    setMetrics(data);
  };
  
  if (!metrics) return <div>Loading...</div>;
  
  return (
    <div className="grid grid-cols-4 gap-4">
      <MetricCard
        title="Total Users"
        value={metrics.users.total}
        subtitle={`${metrics.users.active_today} active today`}
      />
      <MetricCard
        title="Paid Users"
        value={metrics.users.paid}
        subtitle={`${metrics.users.conversion_rate.toFixed(1)}% conversion`}
      />
      <MetricCard
        title="Sessions Today"
        value={metrics.sessions.today}
        subtitle={`${metrics.sessions.avg_per_day.toFixed(0)} avg/day`}
      />
      <MetricCard
        title="MRR"
        value={`$${metrics.revenue.mrr.toFixed(0)}`}
        subtitle={`$${metrics.revenue.arr.toFixed(0)} ARR`}
      />
    </div>
  );
}
```

---

## 9. Status Page

### Option A: Statuspage.io ($29/month)

- Public status page
- Incident management
- Subscriber notifications
- Integrates with monitoring tools

### Option B: Custom Status Page (Free)

```python
# backend/models.py

class SystemStatus(Base):
    __tablename__ = "system_status"
    
    id = Column(Integer, primary_key=True)
    timestamp = Column(DateTime(timezone=True), default=datetime.now)
    component = Column(String)  # "api", "database", "frontend"
    status = Column(String)  # "operational", "degraded", "down"
    message = Column(Text, nullable=True)

@app.get("/api/status")
async def get_system_status(db: Session = Depends(get_db)):
    """Public status endpoint"""
    latest_status = db.query(SystemStatus).order_by(
        SystemStatus.timestamp.desc()
    ).limit(10).all()
    
    return {
        "overall": "operational",
        "components": latest_status
    }
```

---

## 10. Cost Breakdown

### Budget Stack ($43/month)

| Service | Cost | What You Get |
|---------|------|--------------|
| Sentry | Free | 5K errors/month |
| UptimeRobot | Free | 50 monitors |
| Better Stack | $5 | Logs + uptime |
| Plausible | $9 | Analytics |
| Status Page | $29 | Public status |
| **Total** | **$43** | |

### Premium Stack ($66/month)

| Service | Cost | What You Get |
|---------|------|--------------|
| Datadog | $15 | Full APM |
| Sentry Pro | $26 | Unlimited errors |
| Mixpanel | $25 | Product analytics |
| **Total** | **$66** | |

### DIY Stack (Free)

- Built-in logging
- Custom error tracking
- UptimeRobot (free)
- Custom analytics
- **Total: $0**

---

## Implementation Checklist

### Week 1: Core Monitoring
- [ ] Set up Sentry (backend + frontend)
- [ ] Configure UptimeRobot
- [ ] Add health check endpoint
- [ ] Set up basic logging
- [ ] Configure Slack alerts

### Week 2: Metrics & Analytics
- [ ] Add custom error logging
- [ ] Set up analytics tracking
- [ ] Create admin dashboard
- [ ] Configure database monitoring
- [ ] Set up log rotation

### Week 3: Advanced Features
- [ ] Create status page
- [ ] Set up alert rules
- [ ] Add performance monitoring
- [ ] Configure slow query logging
- [ ] Test all alerts

---

## Quick Start (30 Minutes)

```bash
# 1. Set up Sentry (10 min)
pip install sentry-sdk[fastapi]
npm install @sentry/react

# Add to backend/main.py and frontend/src/main.jsx

# 2. Set up UptimeRobot (5 min)
# Go to uptimerobot.com, add monitors

# 3. Add health check (5 min)
# Add /health endpoint to backend

# 4. Configure Slack webhook (5 min)
# Get webhook URL from Slack, add to .env

# 5. Test everything (5 min)
# Trigger test error, check Sentry
# Check uptime monitor
# Send test Slack alert
```

---

## Key Metrics to Track

### Business Metrics
- Monthly Recurring Revenue (MRR)
- Customer Acquisition Cost (CAC)
- Churn rate
- Conversion rate (free → paid)
- Average Revenue Per User (ARPU)

### Technical Metrics
- Uptime (target: 99.9%)
- Response time (target: < 500ms)
- Error rate (target: < 1%)
- Database query time
- API endpoint performance

### User Metrics
- Daily Active Users (DAU)
- Monthly Active Users (MAU)
- Session uploads per user
- Feature usage
- User retention

---

## Alerts to Configure

### Critical (Immediate)
- Site down (> 2 minutes)
- Database connection failed
- Error rate > 5%
- Payment processing failed

### High Priority (15 minutes)
- Slow response time (> 2s)
- High memory usage (> 85%)
- Disk space low (< 15%)
- Failed backup

### Medium Priority (1 hour)
- Unusual traffic spike
- High error count
- Slow queries
- Failed email delivery

---

## Summary

**Minimum Viable Monitoring (Free):**
1. Sentry (free tier)
2. UptimeRobot (free)
3. Built-in logging
4. Health check endpoint

**Recommended Setup ($43/month):**
1. Sentry + Better Stack + Plausible
2. Comprehensive visibility
3. User analytics
4. Status page

**Start with the free tier, upgrade as you grow!**

For 1,000 users, the budget stack ($43/month) is perfect. You'll know immediately when something breaks, understand user behavior, and have professional monitoring.
