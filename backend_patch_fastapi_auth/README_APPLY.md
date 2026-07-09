# FastAPI Backend Auth MVP Patch - Application Guide

**Target:** `/opt/worktime-sync/api/app/main.py` (Яндекс-сервер)  
**Database:** PostgreSQL (контейнер worktime-postgres)  
**Version:** MVP Auth Phase A  
**Date:** July 9, 2026

---

## 📋 Pre-Application Checklist

Before applying this patch:

- [ ] Read `00_server_audit_summary.md` to understand current server state
- [ ] Read `09_security_checklist.md` for security requirements
- [ ] Create database backup: `docker exec worktime-postgres pg_dump -U worktime_user -d worktime > /backup/worktime_backup_$(date +%Y%m%d_%H%M%S).sql`
- [ ] Verify FastAPI container is running: `docker ps | grep worktime-api`
- [ ] Verify PostgreSQL container is running: `docker ps | grep worktime-postgres`
- [ ] Prepare environment variables (see section 3 below)
- [ ] Have SSH access to `/opt/worktime-sync` directory
- [ ] Have Docker Compose access to restart containers

---

## 🚀 Application Steps

### Step 1: Database Migration (Idempotent)

```bash
cd /opt/worktime-sync

# Apply SQL migration (safe to run multiple times)
docker exec worktime-postgres psql -U worktime_user -d worktime -f - < backend_patch_fastapi_auth/01_migration_auth_mvp.sql

# Verify tables were created
docker exec worktime-postgres psql -U worktime_user -d worktime -c "\dt"

# Verify users table structure
docker exec worktime-postgres psql -U worktime_user -d worktime -c "\d users"
```

**Expected output:**
- Tables: users, org_units, positions, audit_logs, refresh_tokens
- Columns in users: id, login, password_hash, display_name, role, status, etc.

### Step 2: Environment Variables

Add to `.env` or `docker-compose.yml`:

```bash
# JWT Configuration
JWT_SECRET_KEY=<generate_secure_random_string_32_chars_min>
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# Admin Seed (disable after first admin created)
ENABLE_ADMIN_SEED_ENDPOINT=true
ADMIN_SEED_TOKEN=<generate_secure_random_string_32_chars_min>

# Database (update with actual credentials)
DATABASE_URL=postgresql://worktime_user:<password>@worktime-postgres:5432/worktime

# API
API_BASE_URL=https://worktimeapi.duckdns.org
```

**⚠️ SECURITY:** Do NOT commit real secrets to git. Use Docker secrets or environment files.

### Step 3: Update FastAPI Code

#### Option A: Apply Unified Patch (if available)

```bash
cd /opt/worktime-sync/api/app

# Backup original main.py
cp main.py main.py.backup

# Apply patch
patch -p0 < ../../backend_patch_fastapi_auth/fastapi_backend.patch

# Verify no errors
echo "Exit code: $?"
```

#### Option B: Manual Integration (if unified patch not available)

1. **Create routers directory if not exists:**
   ```bash
   mkdir -p /opt/worktime-sync/api/app/routers
   ```

2. **Copy router files:**
   ```bash
   cp backend_patch_fastapi_auth/02_fastapi_auth_patch.py /opt/worktime-sync/api/app/routers/auth.py
   cp backend_patch_fastapi_auth/03_fastapi_admin_patch.py /opt/worktime-sync/api/app/routers/admin.py
   cp backend_patch_fastapi_auth/04_fastapi_directories_patch.py /opt/worktime-sync/api/app/routers/directories.py
   cp backend_patch_fastapi_auth/05_fastapi_audit_patch.py /opt/worktime-sync/api/app/routers/audit.py
   ```

3. **Update main.py to include routers:**
   ```python
   from fastapi import FastAPI
   from app.routers import auth, admin, directories, audit
   
   app = FastAPI()
   
   # Include routers
   app.include_router(auth.router)
   app.include_router(admin.router)
   app.include_router(directories.router)
   app.include_router(audit.router)
   ```

4. **Update requirements.txt:**
   ```bash
   # Add to requirements.txt:
   bcryptjs==4.1.1
   PyJWT==2.8.1
   python-multipart==0.0.6
   sqlalchemy==2.0.23
   psycopg2-binary==2.9.9
   ```

5. **Install dependencies:**
   ```bash
   cd /opt/worktime-sync
   pip install -r requirements.txt
   ```

### Step 4: Restart Containers

```bash
cd /opt/worktime-sync

# Restart FastAPI container
docker compose restart worktime-api

# Check logs for errors
docker logs -f worktime-api

# Wait for startup (usually 5-10 seconds)
sleep 10

# Verify API is responding
curl -s https://worktimeapi.duckdns.org/api/v1/health || echo "API not responding yet"
```

### Step 5: Create First Admin User

```bash
# Use admin seed endpoint (only if ENABLE_ADMIN_SEED_ENDPOINT=true)
curl -X POST https://worktimeapi.duckdns.org/api/v1/internal/seed-admins \
  -H "Content-Type: application/json" \
  -H "X-Admin-Token: $ADMIN_SEED_TOKEN" \
  -d '{
    "login": "admin",
    "password": "SecurePassword123!",
    "displayName": "System Administrator"
  }'

# Response should be:
# {
#   "ok": true,
#   "user_id": 1,
#   "message": "Admin user created successfully"
# }

# After success, DISABLE the seed endpoint:
# Set ENABLE_ADMIN_SEED_ENDPOINT=false in .env
# Restart container: docker compose restart worktime-api
```

### Step 6: Test Endpoints

See `07_curl_test_plan.md` for comprehensive test scenarios.

Quick smoke test:

```bash
# Test registration
curl -X POST https://worktimeapi.duckdns.org/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "login": "testuser",
    "password": "Test1234!",
    "passwordConfirm": "Test1234!",
    "displayName": "Test User",
    "orgUnitId": 1,
    "positionId": 1
  }'

# Test public directories
curl -X GET https://worktimeapi.duckdns.org/api/v1/directories/org-units

curl -X GET https://worktimeapi.duckdns.org/api/v1/directories/positions
```

---

## ⚠️ Rollback Plan

If something goes wrong:

```bash
cd /opt/worktime-sync

# 1. Restore database from backup
docker exec worktime-postgres psql -U worktime_user -d worktime < /backup/worktime_backup_YYYYMMDD_HHMMSS.sql

# 2. Restore FastAPI code
cd /opt/worktime-sync/api/app
cp main.py.backup main.py

# 3. Restart container
cd /opt/worktime-sync
docker compose restart worktime-api

# 4. Verify rollback
docker logs -f worktime-api
```

See `08_rollback_plan.md` for detailed rollback procedures.

---

## 📊 Verification

After deployment, verify:

1. **Database tables exist:**
   ```bash
   docker exec worktime-postgres psql -U worktime_user -d worktime -c "\dt"
   ```

2. **FastAPI is running:**
   ```bash
   docker ps | grep worktime-api
   ```

3. **API endpoints respond:**
   ```bash
   curl -s https://worktimeapi.duckdns.org/api/v1/health
   ```

4. **Mobile app can register:**
   - Open mobile app
   - Navigate to registration screen
   - Fill in form with test data
   - Submit registration
   - Check that response is `status: pending`

5. **Admin can approve users:**
   - Login as admin
   - Navigate to admin panel
   - Find pending registration request
   - Click "Approve"
   - Verify user status changed to "active"

---

## 📞 Support & Troubleshooting

### Common Issues

**Issue: "Connection refused" when accessing API**
- Solution: Check if worktime-api container is running: `docker ps | grep worktime-api`
- Check logs: `docker logs worktime-api`

**Issue: "Database connection error"**
- Solution: Verify DATABASE_URL environment variable is set correctly
- Check PostgreSQL container: `docker ps | grep worktime-postgres`
- Test connection: `docker exec worktime-postgres psql -U worktime_user -d worktime -c "SELECT 1"`

**Issue: "JWT secret not set"**
- Solution: Set JWT_SECRET_KEY environment variable
- Restart container: `docker compose restart worktime-api`

**Issue: "Migration failed"**
- Solution: Check if tables already exist: `docker exec worktime-postgres psql -U worktime_user -d worktime -c "\dt"`
- Migration is idempotent, safe to re-run

### Debug Mode

Enable debug logging:

```bash
# Set environment variable
export DEBUG=true

# Restart container
docker compose restart worktime-api

# View logs
docker logs -f worktime-api
```

---

## 📝 Documentation

- `00_server_audit_summary.md` - Current server state analysis
- `01_migration_auth_mvp.sql` - Database schema migration
- `02_fastapi_auth_patch.py` - Auth endpoints implementation
- `03_fastapi_admin_patch.py` - Admin endpoints implementation
- `04_fastapi_directories_patch.py` - Public directories endpoints
- `05_fastapi_audit_patch.py` - Audit logging implementation
- `06_fastapi_integration_notes.md` - Integration details
- `07_curl_test_plan.md` - API testing guide
- `08_rollback_plan.md` - Rollback procedures
- `09_security_checklist.md` - Security requirements

---

**Last Updated:** July 9, 2026  
**Status:** Ready for deployment
