# FastAPI Auth MVP - Deployment Checklist

**Date:** July 9, 2026  
**Target:** Production Deployment to Yandex Server  
**Duration:** ~2-3 hours

---

## ✅ Pre-Deployment Phase

### Database Preparation

- [ ] Create backup of current database
  ```bash
  docker exec worktime-postgres pg_dump -U worktime_user -d worktime > /backup/worktime_backup_$(date +%Y%m%d_%H%M%S).sql
  ```

- [ ] Verify PostgreSQL is running
  ```bash
  docker ps | grep worktime-postgres
  ```

- [ ] Test database connection
  ```bash
  docker exec worktime-postgres psql -U worktime_user -d worktime -c "SELECT 1"
  ```

### Server Preparation

- [ ] Verify FastAPI container exists
  ```bash
  docker ps | grep worktime-api
  ```

- [ ] Check available disk space
  ```bash
  df -h /opt/worktime-sync
  ```

- [ ] Verify SSH access to `/opt/worktime-sync`
  ```bash
  ssh user@yandex-server "ls -la /opt/worktime-sync"
  ```

- [ ] Verify Docker Compose is available
  ```bash
  docker compose --version
  ```

### Documentation Review

- [ ] Read `00_server_audit_summary.md`
- [ ] Read `09_security_checklist.md`
- [ ] Read `06_fastapi_integration_notes.md`
- [ ] Read `10_FASTAPI_IMPLEMENTATION_GUIDE.md`

---

## 🔧 Installation Phase

### Step 1: Copy Files (15 min)

- [ ] Copy router files to `/opt/worktime-sync/api/app/routers/`
  ```bash
  cp 02_fastapi_auth_patch.py api/app/routers/auth.py
  cp 03_fastapi_admin_patch.py api/app/routers/admin.py
  cp 04_fastapi_directories_patch.py api/app/routers/directories.py
  cp 05_fastapi_audit_patch.py api/app/routers/audit.py
  ```

- [ ] Copy schemas to `/opt/worktime-sync/api/app/schemas/`
  ```bash
  cp app/schemas/*.py api/app/schemas/
  ```

- [ ] Copy models to `/opt/worktime-sync/api/app/models/`
  ```bash
  cp app/models/*.py api/app/models/
  ```

- [ ] Copy dependencies to `/opt/worktime-sync/api/app/dependencies/`
  ```bash
  cp app/dependencies/*.py api/app/dependencies/
  ```

- [ ] Copy utils to `/opt/worktime-sync/api/app/utils/`
  ```bash
  cp app/utils/*.py api/app/utils/
  ```

- [ ] Copy main.py to `/opt/worktime-sync/api/app/`
  ```bash
  cp app/main.py api/app/main.py
  ```

- [ ] Verify all files copied
  ```bash
  find api/app -type f -name "*.py" | wc -l
  ```

### Step 2: Database Migration (10 min)

- [ ] Execute SQL migration
  ```bash
  docker exec worktime-postgres psql -U worktime_user -d worktime -f - < 01_migration_auth_mvp.sql
  ```

- [ ] Verify tables created
  ```bash
  docker exec worktime-postgres psql -U worktime_user -d worktime -c "\dt"
  ```

- [ ] Verify users table structure
  ```bash
  docker exec worktime-postgres psql -U worktime_user -d worktime -c "\d users"
  ```

- [ ] Verify audit_logs table structure
  ```bash
  docker exec worktime-postgres psql -U worktime_user -d worktime -c "\d audit_logs"
  ```

### Step 3: Dependencies Installation (10 min)

- [ ] Add dependencies to requirements.txt
  ```bash
  cat >> requirements.txt << 'EOF'
  bcryptjs==4.1.1
  PyJWT==2.8.1
  python-multipart==0.0.6
  sqlalchemy==2.0.23
  psycopg2-binary==2.9.9
  EOF
  ```

- [ ] Install dependencies
  ```bash
  pip install -r requirements.txt
  ```

- [ ] Verify installations
  ```bash
  python -c "import bcryptjs; import jwt; import sqlalchemy; print('All dependencies OK')"
  ```

### Step 4: Environment Variables (10 min)

- [ ] Generate JWT secret
  ```bash
  JWT_SECRET=$(openssl rand -hex 32)
  echo "JWT_SECRET_KEY=$JWT_SECRET"
  ```

- [ ] Generate admin seed token
  ```bash
  ADMIN_TOKEN=$(openssl rand -hex 32)
  echo "ADMIN_SEED_TOKEN=$ADMIN_TOKEN"
  ```

- [ ] Update .env or docker-compose.yml
  ```bash
  cat >> .env << 'EOF'
  JWT_SECRET_KEY=<generated_secret>
  JWT_ALGORITHM=HS256
  ACCESS_TOKEN_EXPIRE_MINUTES=30
  REFRESH_TOKEN_EXPIRE_DAYS=7
  ENABLE_ADMIN_SEED_ENDPOINT=true
  ADMIN_SEED_TOKEN=<generated_token>
  DATABASE_URL=postgresql://worktime_user:password@worktime-postgres:5432/worktime
  EOF
  ```

- [ ] Verify environment variables
  ```bash
  docker compose config | grep JWT_SECRET_KEY
  ```

### Step 5: Container Restart (10 min)

- [ ] Restart FastAPI container
  ```bash
  docker compose restart worktime-api
  ```

- [ ] Wait for startup
  ```bash
  sleep 10
  ```

- [ ] Check logs for errors
  ```bash
  docker logs worktime-api | tail -50
  ```

- [ ] Verify no critical errors
  ```bash
  docker logs worktime-api | grep -i "error" | head -10
  ```

---

## 🧪 Testing Phase

### Step 1: Health Check (5 min)

- [ ] Test health endpoint
  ```bash
  curl -s https://worktimeapi.duckdns.org/api/v1/health
  # Expected: {"status":"ok"}
  ```

- [ ] Test public directories endpoint
  ```bash
  curl -s https://worktimeapi.duckdns.org/api/v1/directories/org-units | jq .
  ```

### Step 2: Admin Seed (10 min)

- [ ] Create first admin
  ```bash
  curl -X POST https://worktimeapi.duckdns.org/api/v1/internal/seed-admins \
    -H "Content-Type: application/json" \
    -H "X-Admin-Token: $ADMIN_SEED_TOKEN" \
    -d '{
      "login": "admin",
      "password": "AdminPassword123!",
      "displayName": "System Administrator"
    }'
  # Expected: {"ok":true,"user_id":1,"message":"Admin user created successfully"}
  ```

- [ ] Verify admin created in database
  ```bash
  docker exec worktime-postgres psql -U worktime_user -d worktime -c "SELECT id, login, role, status FROM users WHERE role='admin';"
  ```

### Step 3: Auth Flow Testing (15 min)

- [ ] Test registration
  ```bash
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
  # Expected: {"ok":true,"status":"pending","message":"..."}
  ```

- [ ] Admin login
  ```bash
  ADMIN_LOGIN=$(curl -s -X POST https://worktimeapi.duckdns.org/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"login":"admin","password":"AdminPassword123!"}')
  ADMIN_TOKEN=$(echo $ADMIN_LOGIN | jq -r '.access_token')
  echo "Admin token: $ADMIN_TOKEN"
  ```

- [ ] Get pending requests
  ```bash
  curl -s -X GET https://worktimeapi.duckdns.org/api/v1/admin/registration-requests \
    -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
  ```

- [ ] Approve user
  ```bash
  curl -s -X POST https://worktimeapi.duckdns.org/api/v1/admin/users/2/approve \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"comment":"Approved"}'
  ```

- [ ] User login (after approval)
  ```bash
  curl -s -X POST https://worktimeapi.duckdns.org/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"login":"testuser","password":"Test1234!"}'
  # Expected: {"ok":true,"access_token":"...","refresh_token":"...","user":{...}}
  ```

### Step 4: Audit Logging Test (10 min)

- [ ] Check audit logs
  ```bash
  curl -s -X GET https://worktimeapi.duckdns.org/api/v1/audit/logs \
    -H "Authorization: Bearer $ADMIN_TOKEN" | jq . | head -20
  ```

- [ ] Verify audit entries exist
  ```bash
  docker exec worktime-postgres psql -U worktime_user -d worktime -c "SELECT COUNT(*) FROM audit_logs;"
  ```

### Step 5: Mobile App Testing (30 min)

- [ ] Open mobile app
- [ ] Navigate to registration screen
- [ ] Fill in registration form with test data
- [ ] Submit registration
- [ ] Verify response shows `status: pending`
- [ ] Check mobile app logs for any errors
- [ ] Admin approves registration in admin panel
- [ ] User logs in with credentials
- [ ] Verify user can access protected resources

---

## 🔒 Security Phase

### Step 1: Disable Seed Endpoint

- [ ] Update environment variable
  ```bash
  ENABLE_ADMIN_SEED_ENDPOINT=false
  ```

- [ ] Restart container
  ```bash
  docker compose restart worktime-api
  ```

- [ ] Verify endpoint is disabled
  ```bash
  curl -X POST https://worktimeapi.duckdns.org/api/v1/internal/seed-admins \
    -H "X-Admin-Token: $ADMIN_SEED_TOKEN" \
    -d '{"login":"admin2","password":"Pass123!","displayName":"Admin 2"}'
  # Expected: {"ok":false,"error":"Admin seed endpoint is disabled"}
  ```

### Step 2: Rotate Exposed Tokens

- [ ] Change EXTERNAL_API_TOKEN on production server
- [ ] Update any services using old token
- [ ] Verify new token works

### Step 3: Security Verification

- [ ] Verify HTTPS is enabled
- [ ] Verify CORS is configured correctly
- [ ] Verify no debug mode is enabled
- [ ] Verify no hardcoded secrets in code
- [ ] Verify rate limiting is configured (if applicable)

---

## 📊 Post-Deployment Phase

### Step 1: Monitoring

- [ ] Set up error monitoring/alerting
- [ ] Monitor API response times
- [ ] Monitor database connection pool
- [ ] Monitor disk space usage

### Step 2: Documentation

- [ ] Update deployment date in documentation
- [ ] Document any custom configurations
- [ ] Document admin credentials (securely)
- [ ] Create runbook for common operations

### Step 3: Backup & Recovery

- [ ] Verify backup was created before deployment
- [ ] Document backup location
- [ ] Test backup restoration procedure
- [ ] Document rollback procedure

### Step 4: Team Communication

- [ ] Notify team of successful deployment
- [ ] Share API documentation
- [ ] Share admin credentials (securely)
- [ ] Provide support contact information

---

## 🚨 Rollback Procedure

If deployment fails:

```bash
# 1. Restore database
docker exec worktime-postgres psql -U worktime_user -d worktime < /backup/worktime_backup_YYYYMMDD_HHMMSS.sql

# 2. Restore FastAPI code
cd /opt/worktime-sync/api/app
git checkout HEAD -- .

# 3. Restart container
docker compose restart worktime-api

# 4. Verify rollback
curl -s https://worktimeapi.duckdns.org/api/v1/health
```

See `08_rollback_plan.md` for detailed rollback procedures.

---

## 📋 Sign-Off

- [ ] All pre-deployment checks passed
- [ ] All installation steps completed
- [ ] All testing passed
- [ ] Security verification completed
- [ ] Post-deployment documentation updated
- [ ] Team notified of deployment

**Deployed by:** ___________________  
**Date:** ___________________  
**Time:** ___________________  
**Notes:** ___________________

---

**Last Updated:** July 9, 2026  
**Status:** Ready for deployment
