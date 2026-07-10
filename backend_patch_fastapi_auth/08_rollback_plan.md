# FastAPI Auth MVP - Rollback Plan

**Date:** July 10, 2026  
**Version:** 1.0  
**Purpose:** Procedures to rollback deployment if issues occur

---

## 🔄 Rollback Scenarios

### Scenario 1: Rollback Code Only (Database OK)

Use this if FastAPI code has issues but database is fine.

```bash
cd /opt/worktime-sync

# 1. Restore app files from backup
BACKUP_DATE=20260710_123456  # Use actual date from backup
rm -rf api/app
cp -r api/app.backup_$BACKUP_DATE api/app

# 2. Restart container
docker compose restart worktime-api

# 3. Wait for startup
sleep 10

# 4. Verify
curl -s https://worktimeapi.duckdns.org/api/v1/health
docker logs worktime-api | tail -20
```

### Scenario 2: Rollback Database Only (Code OK)

Use this if database migration has issues but code is fine.

```bash
cd /opt/worktime-sync

# 1. Restore database from backup
BACKUP_DATE=20260710_123456  # Use actual date from backup
docker exec worktime-postgres psql -U worktime_user -d worktime < worktime_backup_$BACKUP_DATE.sql

# 2. Verify database restored
docker exec worktime-postgres psql -U worktime_user -d worktime -c "SELECT COUNT(*) FROM users;"

# 3. Restart container (to reconnect to database)
docker compose restart worktime-api

# 4. Verify
curl -s https://worktimeapi.duckdns.org/api/v1/health
```

### Scenario 3: Rollback Both Code and Database

Use this if both code and database have issues.

```bash
cd /opt/worktime-sync

# 1. Restore app files
BACKUP_DATE=20260710_123456  # Use actual date from backup
rm -rf api/app
cp -r api/app.backup_$BACKUP_DATE api/app

# 2. Restore database
docker exec worktime-postgres psql -U worktime_user -d worktime < worktime_backup_$BACKUP_DATE.sql

# 3. Restart container
docker compose restart worktime-api

# 4. Wait for startup
sleep 10

# 5. Verify
curl -s https://worktimeapi.duckdns.org/api/v1/health
docker logs worktime-api | tail -30

# 6. Verify database
docker exec worktime-postgres psql -U worktime_user -d worktime -c "SELECT COUNT(*) FROM users;"
```

### Scenario 4: Partial Database Rollback (Undo Migration Only)

Use this if migration needs to be undone but app files are OK.

```bash
cd /opt/worktime-sync

# 1. Drop new tables created by migration
docker exec worktime-postgres psql -U worktime_user -d worktime << 'SQL'
DROP TABLE IF EXISTS refresh_tokens CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS positions CASCADE;
DROP TABLE IF EXISTS org_units CASCADE;
-- Do NOT drop users table if it existed before
SQL

# 2. Verify tables dropped
docker exec worktime-postgres psql -U worktime_user -d worktime -c "\dt"

# 3. Restart container
docker compose restart worktime-api

# 4. Verify
curl -s https://worktimeapi.duckdns.org/api/v1/health
```

---

## ✅ Post-Rollback Verification

After any rollback, verify:

### 1. Container Status

```bash
# Check if container is running
docker ps | grep worktime-api
# Expected: worktime-api container should be Up

# Check logs for errors
docker logs worktime-api | tail -30
# Expected: No critical errors, should see "Uvicorn running"
```

### 2. Health Endpoint

```bash
# Test health endpoint
curl -s https://worktimeapi.duckdns.org/api/v1/health | jq .
# Expected: {"status":"ok"}
```

### 3. Database Connection

```bash
# Test database connection
docker exec worktime-api python -c "from app.dependencies.database import SessionLocal; db = SessionLocal(); print('Database connected')"
# Expected: "Database connected"

# Or test directly
docker exec worktime-postgres psql -U worktime_user -d worktime -c "SELECT 1"
# Expected: 1
```

### 4. API Endpoints

```bash
# Test public endpoint
curl -s https://worktimeapi.duckdns.org/api/v1/directories/org-units | jq .
# Expected: JSON array of org units

# Test auth endpoint
curl -s -X POST https://worktimeapi.duckdns.org/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"login":"admin","password":"AdminPassword123!"}' | jq .
# Expected: access_token and refresh_token (or error if user doesn't exist)
```

### 5. Database Tables

```bash
# Check tables exist
docker exec worktime-postgres psql -U worktime_user -d worktime -c "\dt"

# Check users table
docker exec worktime-postgres psql -U worktime_user -d worktime -c "\d users"

# Count users
docker exec worktime-postgres psql -U worktime_user -d worktime -c "SELECT COUNT(*) FROM users;"
```

---

## 🚨 Emergency Rollback (Full System Reset)

Use this only if normal rollback doesn't work.

```bash
cd /opt/worktime-sync

# 1. Stop all containers
docker compose down

# 2. Restore app files
BACKUP_DATE=20260710_123456  # Use actual date from backup
rm -rf api/app
cp -r api/app.backup_$BACKUP_DATE api/app

# 3. Restore database
docker exec worktime-postgres psql -U worktime_user -d worktime < worktime_backup_$BACKUP_DATE.sql

# 4. Start containers
docker compose up -d

# 5. Wait for startup
sleep 15

# 6. Verify all services
docker compose ps
curl -s https://worktimeapi.duckdns.org/api/v1/health
```

---

## 📋 Rollback Decision Tree

Use this to decide which rollback scenario to use:

```
Is the API responding?
├─ NO → Scenario 3: Rollback Both
└─ YES
   ├─ Are endpoints returning correct data?
   │  ├─ NO (wrong schema, missing fields) → Scenario 1: Rollback Code Only
   │  └─ YES
   │     ├─ Are database tables correct?
   │     │  ├─ NO (tables missing, wrong structure) → Scenario 2: Rollback Database Only
   │     │  └─ YES → No rollback needed, debug issue
   │     └─ Are there database errors?
   │        ├─ YES → Scenario 2: Rollback Database Only
   │        └─ NO → Debug application code
```

---

## 🔍 Debugging Before Rollback

Before rolling back, check these things:

### 1. Check Application Logs

```bash
docker logs worktime-api | tail -50
# Look for: error, exception, traceback
```

### 2. Check Database Logs

```bash
docker logs worktime-postgres | tail -50
# Look for: error, connection refused, permission denied
```

### 3. Check Environment Variables

```bash
docker compose config | grep -E "JWT_SECRET|DATABASE_URL|ENABLE_ADMIN"
# Verify all required variables are set
```

### 4. Test Database Connection

```bash
docker exec worktime-api python << 'PYEOF'
import os
from sqlalchemy import create_engine

db_url = os.getenv("DATABASE_URL")
print(f"Database URL: {db_url}")

try:
    engine = create_engine(db_url)
    with engine.connect() as conn:
        result = conn.execute("SELECT 1")
        print("Database connection: OK")
except Exception as e:
    print(f"Database connection error: {e}")
PYEOF
```

### 5. Check API Response

```bash
# Test with verbose output
curl -v https://worktimeapi.duckdns.org/api/v1/health

# Test with detailed error
curl -s -X GET https://worktimeapi.duckdns.org/api/v1/auth/me \
  -H "Authorization: Bearer invalid_token" | jq .
```

---

## 📊 Backup Verification

Before rolling back, verify backups are valid:

### 1. Verify App Backup

```bash
# Check backup directory exists
ls -la api/app.backup_*

# Check backup has files
find api/app.backup_20260710_123456 -name "*.py" | wc -l
# Expected: > 20 files
```

### 2. Verify Database Backup

```bash
# Check backup file exists and has size
ls -lh worktime_backup_20260710_123456.sql
# Expected: file size > 1MB

# Check backup is valid SQL
head -20 worktime_backup_20260710_123456.sql
# Expected: SQL comments and CREATE TABLE statements

# Verify backup is not corrupted
tail -10 worktime_backup_20260710_123456.sql
# Expected: Should end with "COMMIT;" or similar
```

---

## 🔄 Rollback Procedure Checklist

- [ ] Identified which rollback scenario to use
- [ ] Located correct backup files (app and/or database)
- [ ] Verified backup files are valid
- [ ] Stopped or restarted containers as needed
- [ ] Restored files from backup
- [ ] Restarted containers
- [ ] Waited for startup (10-15 seconds)
- [ ] Verified health endpoint
- [ ] Verified database connection
- [ ] Verified API endpoints
- [ ] Checked logs for errors
- [ ] Documented what went wrong
- [ ] Notified team

---

## 📞 Support

If rollback doesn't work:

1. Check logs: `docker logs worktime-api`
2. Check database: `docker logs worktime-postgres`
3. Verify backups exist: `ls -la api/app.backup_*`
4. Try emergency rollback (full system reset)
5. Contact system administrator

---

## 🎯 Prevention

To avoid needing rollback:

1. **Test in staging first** - Apply changes to staging environment
2. **Create backups** - Always backup before deployment
3. **Verify backups** - Test restore procedure before production
4. **Gradual rollout** - Deploy to small subset first
5. **Monitor logs** - Watch logs during and after deployment
6. **Have runbook** - Document all deployment steps
7. **Team communication** - Notify team before deployment

---

**Last Updated:** July 10, 2026  
**Status:** Ready for emergency use
