# Server Audit Summary

**Date:** July 9, 2026  
**Target:** `/opt/worktime-sync` (Яндекс-сервер)  
**Status:** Pre-deployment audit

---

## 📊 Current Server State

### Docker Containers

Expected running containers:
- `worktime-api` - FastAPI backend service
- `worktime-postgres` - PostgreSQL database
- `worktime-nginx` - Nginx reverse proxy (optional)

**Verify:**
```bash
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"
```

### FastAPI Application

**Location:** `/opt/worktime-sync/api/app/main.py`

**Expected structure:**
```
/opt/worktime-sync/
├── api/
│   ├── app/
│   │   ├── main.py (FastAPI entry point)
│   │   ├── models/ (SQLAlchemy ORM models)
│   │   ├── routers/ (API route handlers)
│   │   └── dependencies/ (shared dependencies)
│   ├── requirements.txt (Python dependencies)
│   └── docker-compose.yml (container orchestration)
├── logs/ (application logs)
└── data/ (persistent data, if any)
```

**Verify:**
```bash
cd /opt/worktime-sync
ls -la api/
ls -la api/app/
cat api/requirements.txt | head -20
```

### PostgreSQL Database

**Container:** `worktime-postgres`  
**Database:** `worktime`  
**User:** `worktime_user`

**Verify:**
```bash
docker exec worktime-postgres psql -U worktime_user -d worktime -c "SELECT version();"
docker exec worktime-postgres psql -U worktime_user -d worktime -c "\dt"
```

### Current Tables

**Expected existing tables:**
- `users` (may have different schema than MVP requires)
- `work_events` (worktime tracking data)
- `work_day_summaries` (daily summaries)
- `org_units` (organizational structure)
- `positions` (job positions)

**Verify:**
```bash
docker exec worktime-postgres psql -U worktime_user -d worktime -c "\dt"
```

### Users Table Current Schema

**Check current structure:**
```bash
docker exec worktime-postgres psql -U worktime_user -d worktime -c "\d users"
```

**Expected columns (may vary):**
- `id` (PRIMARY KEY)
- `login` (UNIQUE, NOT NULL)
- `password_hash` (NOT NULL)
- `display_name` (NOT NULL)
- `email` (may exist)
- `phone` (may exist)
- `role` (may be VARCHAR or ENUM)
- `status` (may be VARCHAR or ENUM)
- `org_unit_id` (FOREIGN KEY to org_units)
- `position_id` (FOREIGN KEY to positions)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

**Migration will:**
- ADD missing columns (safe, idempotent)
- ADD missing constraints (safe, idempotent)
- NOT DROP existing columns (backward compatible)
- NOT MODIFY existing data types (unless necessary)

### Environment Variables

**Check what's currently set:**
```bash
docker exec worktime-api env | cut -d= -f1 | sort
```

**Expected variables:**
- `DATABASE_URL` - PostgreSQL connection string
- `FASTAPI_ENV` - Environment (development/production)
- `LOG_LEVEL` - Logging level
- `API_BASE_URL` - Public API URL

**New variables needed for Auth MVP:**
- `JWT_SECRET_KEY` - JWT signing secret
- `JWT_ALGORITHM` - JWT algorithm (HS256)
- `ACCESS_TOKEN_EXPIRE_MINUTES` - Access token TTL (30)
- `REFRESH_TOKEN_EXPIRE_DAYS` - Refresh token TTL (7)
- `ENABLE_ADMIN_SEED_ENDPOINT` - Enable admin bootstrap (true initially, false after)
- `ADMIN_SEED_TOKEN` - Admin seed endpoint token

---

## 🔍 Pre-Migration Analysis

### Potential Issues to Check

1. **Existing "employee" role in users.role:**
   - If found, migration will NOT delete it
   - MVP roles (user, unit_manager, department_manager, admin) will be added
   - Transition plan: existing employees can be migrated to "user" role

2. **Existing "inactive" status in users.status:**
   - If found, migration will NOT delete it
   - MVP statuses (pending, active, blocked, rejected, password_reset_required) will be added
   - Transition plan: existing inactive users can be migrated to "blocked" status

3. **Missing org_units or positions tables:**
   - Migration will CREATE them if missing
   - If they exist, migration will ADD missing columns only

4. **Existing audit_logs table:**
   - If exists with different schema, migration will NOT recreate it
   - New columns will be ADDED if missing

5. **Existing refresh_tokens table:**
   - If exists, migration will use it
   - If missing, migration will CREATE it

---

## 📋 Pre-Deployment Tasks

### 1. Backup Database

```bash
# Create backup directory
mkdir -p /backup

# Dump entire database
docker exec worktime-postgres pg_dump -U worktime_user -d worktime > /backup/worktime_backup_$(date +%Y%m%d_%H%M%S).sql

# Verify backup
ls -lh /backup/worktime_backup_*.sql
```

### 2. Document Current State

```bash
# Save current schema
docker exec worktime-postgres pg_dump -U worktime_user -d worktime --schema-only > /backup/worktime_schema_before_auth_patch.sql

# Save current users table structure
docker exec worktime-postgres psql -U worktime_user -d worktime -c "\d users" > /backup/users_table_structure_before.txt

# Save current roles and statuses
docker exec worktime-postgres psql -U worktime_user -d worktime -c "SELECT DISTINCT role FROM users;" > /backup/existing_roles_before.txt
docker exec worktime-postgres psql -U worktime_user -d worktime -c "SELECT DISTINCT status FROM users;" > /backup/existing_statuses_before.txt
```

### 3. Verify Containers are Healthy

```bash
# Check container status
docker ps | grep worktime

# Check container logs for errors
docker logs worktime-api | tail -20
docker logs worktime-postgres | tail -20

# Test database connection
docker exec worktime-postgres psql -U worktime_user -d worktime -c "SELECT 1"

# Test API health (if endpoint exists)
curl -s http://localhost:8000/health || echo "Health endpoint not available"
```

### 4. Review Environment

```bash
# Check available disk space
df -h /opt/worktime-sync

# Check available memory
free -h

# Check Docker resource usage
docker stats --no-stream
```

---

## ✅ Pre-Migration Checklist

Before running migration:

- [ ] Database backup created and verified
- [ ] Current schema documented
- [ ] Existing roles and statuses documented
- [ ] Containers are healthy and running
- [ ] Disk space available (at least 1GB free)
- [ ] Memory available (at least 512MB free)
- [ ] Network connectivity verified
- [ ] HTTPS certificate is valid
- [ ] Environment variables prepared
- [ ] Rollback plan reviewed

---

## 🚀 Next Steps

1. Review `01_migration_auth_mvp.sql` for specific changes
2. Run pre-migration tasks above
3. Apply migration (see `README_APPLY.md`)
4. Verify migration success
5. Deploy FastAPI auth endpoints
6. Test with mobile app

---

**Status:** Ready for pre-deployment analysis  
**Last Updated:** July 9, 2026
