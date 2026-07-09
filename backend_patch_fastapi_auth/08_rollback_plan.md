# Rollback Plan - Auth MVP Deployment

**Date:** July 9, 2026  
**Target:** Production FastAPI backend  
**Scope:** Emergency rollback procedures

---

## 🚨 When to Rollback

Rollback if any of these occur:

1. **API is not responding** after deployment
2. **Database migration failed** and left database in inconsistent state
3. **Authentication is broken** (login/register endpoints not working)
4. **Data corruption** detected in users table
5. **Performance degradation** (queries taking > 5 seconds)
6. **Security vulnerability** discovered in auth code
7. **Mobile app cannot connect** to backend

---

## 📋 Pre-Rollback Checklist

Before executing rollback:

- [ ] Identify the specific issue (check logs)
- [ ] Notify users that service is degraded
- [ ] Backup current database state (for post-mortem analysis)
- [ ] Stop accepting new requests (if possible)
- [ ] Prepare rollback commands

---

## 🔄 Rollback Procedures

### Option 1: Quick Rollback (Database + Code)

**Time to execute:** 5-10 minutes  
**Data loss:** None (using backup)  
**Recommended:** For critical failures

```bash
#!/bin/bash
set -e

cd /opt/worktime-sync

echo "=== Starting rollback procedure ==="

# Step 1: Stop FastAPI container
echo "Step 1: Stopping FastAPI container..."
docker compose stop worktime-api
sleep 2

# Step 2: Restore database from backup
echo "Step 2: Restoring database from backup..."
LATEST_BACKUP=$(ls -t /backup/worktime_backup_*.sql | head -1)
if [ -z "$LATEST_BACKUP" ]; then
    echo "ERROR: No backup found in /backup/"
    exit 1
fi

echo "Using backup: $LATEST_BACKUP"
docker exec worktime-postgres psql -U worktime_user -d worktime < "$LATEST_BACKUP"

# Step 3: Restore FastAPI code
echo "Step 3: Restoring FastAPI code..."
if [ -f "api/app/main.py.backup" ]; then
    cp api/app/main.py.backup api/app/main.py
    echo "Code restored from backup"
else
    echo "WARNING: No code backup found, using git to revert"
    cd api/app
    git checkout main.py
    cd ../../
fi

# Step 4: Restart containers
echo "Step 4: Restarting containers..."
docker compose restart worktime-api
docker compose restart worktime-postgres

# Step 5: Verify rollback
echo "Step 5: Verifying rollback..."
sleep 5
curl -s https://worktimeapi.duckdns.org/api/v1/health || echo "Health check failed"

echo "=== Rollback complete ==="
```

### Option 2: Database-Only Rollback

**Time to execute:** 3-5 minutes  
**Data loss:** None  
**Use case:** If only database migration failed, FastAPI code is fine

```bash
#!/bin/bash
set -e

cd /opt/worktime-sync

echo "=== Database-only rollback ==="

# Stop FastAPI to prevent connections during restore
docker compose stop worktime-api

# Find latest backup
LATEST_BACKUP=$(ls -t /backup/worktime_backup_*.sql | head -1)
echo "Restoring from: $LATEST_BACKUP"

# Restore database
docker exec worktime-postgres psql -U worktime_user -d worktime < "$LATEST_BACKUP"

# Restart FastAPI
docker compose restart worktime-api

echo "=== Database rollback complete ==="
```

### Option 3: Code-Only Rollback

**Time to execute:** 2-3 minutes  
**Data loss:** None  
**Use case:** If FastAPI code has bugs but database is fine

```bash
#!/bin/bash
set -e

cd /opt/worktime-sync

echo "=== Code-only rollback ==="

# Restore code from backup
if [ -f "api/app/main.py.backup" ]; then
    cp api/app/main.py.backup api/app/main.py
    echo "Code restored from backup"
else
    # Or use git to revert to previous commit
    cd api/app
    git log --oneline -5
    git checkout HEAD~1 main.py
    cd ../../
    echo "Code reverted to previous git commit"
fi

# Restart FastAPI
docker compose restart worktime-api

# Verify
sleep 3
curl -s https://worktimeapi.duckdns.org/api/v1/health

echo "=== Code rollback complete ==="
```

### Option 4: Manual Rollback (Step-by-Step)

**Time to execute:** 10-15 minutes  
**Use case:** If automated scripts fail

```bash
# Step 1: Check current status
docker ps
docker logs worktime-api | tail -20

# Step 2: Stop containers
docker compose stop worktime-api

# Step 3: Restore database
# Find backup file
ls -lh /backup/worktime_backup_*.sql

# Restore specific backup
docker exec worktime-postgres psql -U worktime_user -d worktime < /backup/worktime_backup_20260709_120000.sql

# Step 4: Restore code
cd /opt/worktime-sync/api/app
ls -la main.py*
cp main.py.backup main.py

# Step 5: Restart
cd /opt/worktime-sync
docker compose restart worktime-api

# Step 6: Verify
docker logs worktime-api | tail -20
curl https://worktimeapi.duckdns.org/api/v1/health
```

---

## ✅ Post-Rollback Verification

After executing rollback, verify:

```bash
# 1. Check containers are running
docker ps | grep worktime

# 2. Check logs for errors
docker logs worktime-api | tail -20
docker logs worktime-postgres | tail -20

# 3. Test database connection
docker exec worktime-postgres psql -U worktime_user -d worktime -c "SELECT COUNT(*) FROM users;"

# 4. Test API endpoints
curl -s https://worktimeapi.duckdns.org/api/v1/health
curl -s https://worktimeapi.duckdns.org/api/v1/directories/org-units

# 5. Check audit logs for rollback action
docker exec worktime-postgres psql -U worktime_user -d worktime -c "SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 5;"

# 6. Notify users that service is restored
echo "Service restored successfully"
```

---

## 📊 Rollback Scenarios

### Scenario 1: Migration Failed (Database Inconsistent)

**Symptoms:**
- `ERROR: relation "users" does not exist`
- `ERROR: column "password_hash" does not exist`
- Database queries failing

**Solution:**
```bash
# Use Option 2: Database-only rollback
docker compose stop worktime-api
docker exec worktime-postgres psql -U worktime_user -d worktime < /backup/worktime_backup_latest.sql
docker compose restart worktime-api
```

### Scenario 2: FastAPI Won't Start

**Symptoms:**
- `docker logs worktime-api` shows Python errors
- Container exits immediately after restart
- API not responding

**Solution:**
```bash
# Use Option 3: Code-only rollback
cp /opt/worktime-sync/api/app/main.py.backup /opt/worktime-sync/api/app/main.py
docker compose restart worktime-api
```

### Scenario 3: Authentication Broken

**Symptoms:**
- Login endpoint returns 500 error
- Register endpoint fails
- Mobile app cannot authenticate

**Solution:**
```bash
# Check logs for specific error
docker logs worktime-api | grep -i "auth\|error"

# If code issue: Use Option 3 (code-only rollback)
# If database issue: Use Option 2 (database-only rollback)
# If both: Use Option 1 (full rollback)
```

### Scenario 4: Data Corruption

**Symptoms:**
- Users table has corrupted data
- Audit logs show unexpected changes
- Queries return wrong results

**Solution:**
```bash
# Use Option 1: Full rollback
# This will restore database from backup, losing any changes made after backup

# After rollback, investigate what caused corruption
docker exec worktime-postgres psql -U worktime_user -d worktime -c "SELECT * FROM audit_logs WHERE created_at > NOW() - INTERVAL '1 hour';"
```

### Scenario 5: Performance Degradation

**Symptoms:**
- Queries taking > 5 seconds
- High CPU/memory usage
- Timeouts on API endpoints

**Solution:**
```bash
# Check for missing indexes
docker exec worktime-postgres psql -U worktime_user -d worktime -c "\d+ users"

# If indexes missing: Re-apply migration
docker exec worktime-postgres psql -U worktime_user -d worktime -f backend_patch_fastapi_auth/01_migration_auth_mvp.sql

# If still slow: Use Option 1 (full rollback)
```

---

## 🔍 Post-Rollback Analysis

After successful rollback, investigate root cause:

```bash
# 1. Check deployment logs
cat /opt/worktime-sync/logs/deployment_*.log

# 2. Check FastAPI error logs
docker logs worktime-api > /tmp/api_logs_rollback.txt

# 3. Check database logs
docker logs worktime-postgres > /tmp/db_logs_rollback.txt

# 4. Review audit logs for suspicious activity
docker exec worktime-postgres psql -U worktime_user -d worktime -c "SELECT * FROM audit_logs WHERE created_at > NOW() - INTERVAL '1 hour' ORDER BY created_at DESC;" > /tmp/audit_logs_rollback.txt

# 5. Compare database schema before/after
docker exec worktime-postgres pg_dump -U worktime_user -d worktime --schema-only > /tmp/schema_after_rollback.sql
diff /backup/worktime_schema_before_auth_patch.sql /tmp/schema_after_rollback.sql > /tmp/schema_diff.txt

# 6. Document findings
cat > /tmp/rollback_analysis.md << EOF
# Rollback Analysis

## Issue
[Describe what went wrong]

## Root Cause
[Explain why it happened]

## Solution
[What needs to be fixed]

## Prevention
[How to prevent in future]
EOF
```

---

## 📞 Escalation

If rollback doesn't resolve the issue:

1. **Contact FastAPI development team**
   - Provide: `/tmp/api_logs_rollback.txt`
   - Provide: `/tmp/rollback_analysis.md`

2. **Contact database team**
   - Provide: `/tmp/db_logs_rollback.txt`
   - Provide: `/tmp/schema_diff.txt`

3. **Escalate to infrastructure team**
   - Provide: All logs and analysis files
   - Request: Full system diagnostics

---

## 🛡️ Prevention

To prevent needing rollback:

1. **Always create backups before deployment**
2. **Test on staging environment first**
3. **Have rollback plan documented and tested**
4. **Monitor logs during and after deployment**
5. **Have team on standby during deployment**
6. **Use gradual rollout (if possible)**
7. **Have automated health checks**

---

**Last Updated:** July 9, 2026  
**Status:** Ready for emergency use
