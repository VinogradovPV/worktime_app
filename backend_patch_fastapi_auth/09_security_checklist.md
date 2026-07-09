# Security Checklist - Auth MVP Deployment

**Date:** July 9, 2026  
**Target:** Production FastAPI backend  
**Scope:** Auth endpoints security requirements

---

## 🔐 Pre-Deployment Security Checklist

### Environment Variables & Secrets

- [ ] **JWT_SECRET_KEY** is set to random string (min 32 characters)
  - Generate: `openssl rand -hex 32`
  - Store in: Docker secrets or .env (not in git)
  - Verify: `echo $JWT_SECRET_KEY | wc -c` should be > 32

- [ ] **ADMIN_SEED_TOKEN** is set to random string (min 32 characters)
  - Generate: `openssl rand -hex 32`
  - Store in: Docker secrets or .env (not in git)
  - Verify: Only used during initial admin setup

- [ ] **DATABASE_URL** contains correct credentials
  - Format: `postgresql://user:password@host:port/database`
  - Password is NOT committed to git
  - Connection uses SSL/TLS if possible

- [ ] **API_BASE_URL** is set to production domain
  - Value: `https://worktimeapi.duckdns.org`
  - NOT `http://localhost:3000`
  - NOT `http://` (must be HTTPS)

- [ ] No secrets are logged
  - Check: `grep -r "JWT_SECRET\|ADMIN_SEED\|password" /opt/worktime-sync/api/app/ --include="*.py" | grep -v "# TODO"`
  - Result: Should be empty or only comments

### Database Security

- [ ] PostgreSQL user has minimal required permissions
  - User: `worktime_user`
  - Permissions: SELECT, INSERT, UPDATE, DELETE on worktime database only
  - Verify: `docker exec worktime-postgres psql -U worktime_user -d worktime -c "\du"`

- [ ] Database backups are encrypted
  - Backup location: `/backup/` with restricted permissions
  - Permissions: `chmod 600 /backup/worktime_backup_*.sql`
  - Verify: `ls -l /backup/worktime_backup_*.sql`

- [ ] Database connections use SSL/TLS
  - Check: `grep -i "ssl\|tls" /opt/worktime-sync/docker-compose.yml`
  - Or: `echo $DATABASE_URL | grep -i "ssl"`

### Password Security

- [ ] Passwords are hashed with bcryptjs (not plain text)
  - Check: `grep -r "bcryptjs\|bcrypt" /opt/worktime-sync/api/app/routers/auth.py`
  - Verify: No plain text passwords in database

- [ ] Password requirements enforced
  - Minimum length: 8 characters
  - Check: `grep -A 5 "password_strength" /opt/worktime-sync/api/app/routers/auth.py`

- [ ] Temporary passwords (after reset) are:
  - Generated securely (random, not predictable)
  - Hashed before storage
  - Returned only once in response
  - NOT logged in audit_logs

### JWT Security

- [ ] JWT tokens use HTTPS only
  - Check: API_BASE_URL must be `https://`
  - Verify: `curl -I https://worktimeapi.duckdns.org/api/v1/auth/me`

- [ ] JWT tokens have expiration
  - Access token: 30 minutes
  - Refresh token: 7 days
  - Check: `grep "EXPIRE" /opt/worktime-sync/docker-compose.yml`

- [ ] JWT algorithm is HS256 (not RS256 without proper key management)
  - Check: `grep "JWT_ALGORITHM" /opt/worktime-sync/docker-compose.yml`
  - Value should be: `HS256`

- [ ] Refresh tokens are stored server-side
  - Table: `refresh_tokens`
  - Verify: `docker exec worktime-postgres psql -U worktime_user -d worktime -c "\d refresh_tokens"`

- [ ] Refresh tokens can be revoked
  - Logout endpoint invalidates refresh tokens
  - Check: `grep -A 10 "def logout" /opt/worktime-sync/api/app/routers/auth.py`

### API Security

- [ ] CORS is properly configured
  - Allowed origins: Only `https://worktimeapp-pdfmhwoz.manus.space` (mobile app domain)
  - Check: `grep -i "cors\|allow_origins" /opt/worktime-sync/api/app/main.py`

- [ ] Rate limiting is enabled
  - Prevent brute force attacks on login endpoint
  - Check: `grep -i "rate_limit\|slowapi" /opt/worktime-sync/api/app/routers/auth.py`

- [ ] Input validation is enforced
  - Email format validation (if applicable)
  - Password confirmation matching
  - Check: `grep -A 5 "@validator" /opt/worktime-sync/api/app/routers/auth.py`

- [ ] SQL injection prevention
  - Use parameterized queries (SQLAlchemy ORM)
  - Check: No raw SQL strings in auth.py
  - Verify: `grep -i "execute\|raw" /opt/worktime-sync/api/app/routers/auth.py | grep -v "#"`

- [ ] XSS prevention
  - Return JSON, not HTML
  - Check: `grep -i "html\|template" /opt/worktime-sync/api/app/routers/auth.py`

### Audit Logging

- [ ] All auth actions are logged
  - register, login, logout, change-password, reset-password
  - Check: `grep -i "audit_log\|AuditLog" /opt/worktime-sync/api/app/routers/auth.py`

- [ ] Audit logs do NOT contain sensitive data
  - NO passwords (plain or hashed)
  - NO tokens
  - NO temporary passwords
  - Check: `grep -i "password\|token" /opt/worktime-sync/api/app/routers/auth.py | grep -i "audit"`

- [ ] Audit logs include timestamp and user
  - actor_user_id, action, created_at
  - Check: `docker exec worktime-postgres psql -U worktime_user -d worktime -c "SELECT * FROM audit_logs LIMIT 1;"`

### Admin Seed Endpoint

- [ ] Admin seed endpoint is disabled after first admin created
  - Set: `ENABLE_ADMIN_SEED_ENDPOINT=false`
  - Verify: `docker exec worktime-api env | grep ENABLE_ADMIN_SEED`

- [ ] Admin seed endpoint requires token
  - Header: `X-Admin-Token: <ADMIN_SEED_TOKEN>`
  - Check: `grep -A 5 "X-Admin-Token" /opt/worktime-sync/api/app/routers/admin.py`

- [ ] Admin seed endpoint is not documented in public API
  - Path: `/api/v1/internal/seed-admins` (internal, not public)
  - Check: `grep -i "seed" /opt/worktime-sync/api/app/main.py`

### HTTPS & TLS

- [ ] HTTPS is enforced (no HTTP)
  - Check: `grep -i "http://" /opt/worktime-sync/docker-compose.yml`
  - Result: Should be empty or only in comments

- [ ] SSL/TLS certificate is valid
  - Domain: `worktimeapi.duckdns.org`
  - Verify: `openssl s_client -connect worktimeapi.duckdns.org:443 -servername worktimeapi.duckdns.org 2>/dev/null | grep -A 5 "Verify return code"`

- [ ] Certificate is not self-signed (for production)
  - Verify: `openssl s_client -connect worktimeapi.duckdns.org:443 2>/dev/null | grep -i "self-signed"`
  - Result: Should NOT contain "self-signed"

### Container Security

- [ ] FastAPI container runs as non-root user
  - Check: `docker inspect worktime-api | grep -i "user"`

- [ ] Container has resource limits
  - Memory limit: Set (e.g., 512MB)
  - CPU limit: Set (e.g., 1 CPU)
  - Check: `docker inspect worktime-api | grep -i "memory\|cpu"`

- [ ] Container logs are not exposed
  - Logs stored in: `/opt/worktime-sync/logs/` with restricted permissions
  - Check: `ls -l /opt/worktime-sync/logs/`

### Network Security

- [ ] Firewall rules restrict access
  - Only allow HTTPS (443) from internet
  - Allow SSH (22) from admin IPs only
  - Check: `sudo ufw status` or `sudo iptables -L`

- [ ] Database is not exposed to internet
  - PostgreSQL port (5432) only accessible from FastAPI container
  - Check: `docker network inspect worktime-network` or `docker-compose ps`

- [ ] Admin endpoints are protected
  - Require authentication
  - Require admin role
  - Check: `grep -B 5 "@router.post.*admin" /opt/worktime-sync/api/app/routers/admin.py`

---

## 🔍 Post-Deployment Security Verification

### Test Authentication

```bash
# Test registration
curl -X POST https://worktimeapi.duckdns.org/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"login":"test","password":"Test1234!","passwordConfirm":"Test1234!","displayName":"Test","orgUnitId":1,"positionId":1}'

# Verify response does NOT contain token
# Expected: {"ok":true,"status":"pending","message":"..."}
# NOT: {"ok":true,"access_token":"..."}
```

### Test JWT Expiration

```bash
# Get access token
TOKEN=$(curl -s -X POST https://worktimeapi.duckdns.org/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"login":"admin","password":"password"}' | jq -r '.access_token')

# Decode JWT to check expiration
echo $TOKEN | cut -d'.' -f2 | base64 -d | jq '.exp'

# Verify expiration is ~30 minutes from now
```

### Test Audit Logging

```bash
# Check audit logs were created
docker exec worktime-postgres psql -U worktime_user -d worktime -c "SELECT action, created_at FROM audit_logs ORDER BY created_at DESC LIMIT 10;"

# Verify no passwords are logged
docker exec worktime-postgres psql -U worktime_user -d worktime -c "SELECT * FROM audit_logs WHERE action='user_login';" | grep -i "password"
# Result: Should be empty
```

### Test Rate Limiting

```bash
# Attempt multiple failed logins (should be rate limited)
for i in {1..20}; do
  curl -s -X POST https://worktimeapi.duckdns.org/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"login":"test","password":"wrong"}' | jq '.status'
done

# Should see 429 Too Many Requests after threshold
```

---

## 📋 Security Incident Response

### If Secrets Are Compromised

1. **Immediately rotate JWT_SECRET_KEY:**
   ```bash
   # Generate new secret
   NEW_SECRET=$(openssl rand -hex 32)
   
   # Update environment
   # Edit docker-compose.yml or .env
   # Set JWT_SECRET_KEY=$NEW_SECRET
   
   # Restart container
   docker compose restart worktime-api
   ```

2. **Invalidate all existing tokens:**
   ```bash
   # Clear refresh_tokens table
   docker exec worktime-postgres psql -U worktime_user -d worktime -c "DELETE FROM refresh_tokens;"
   
   # All users must re-login
   ```

3. **Audit logs for suspicious activity:**
   ```bash
   docker exec worktime-postgres psql -U worktime_user -d worktime -c "SELECT * FROM audit_logs WHERE created_at > NOW() - INTERVAL '1 hour' ORDER BY created_at DESC;"
   ```

### If Database Is Compromised

1. **Restore from backup:**
   ```bash
   docker exec worktime-postgres psql -U worktime_user -d worktime < /backup/worktime_backup_YYYYMMDD_HHMMSS.sql
   ```

2. **Reset all passwords:**
   ```bash
   # Use admin endpoint to reset user passwords
   # Users must change password on next login
   ```

3. **Rotate database credentials:**
   ```bash
   # Change worktime_user password
   docker exec worktime-postgres psql -U postgres -c "ALTER USER worktime_user WITH PASSWORD 'new_secure_password';"
   
   # Update DATABASE_URL in environment
   ```

---

## ✅ Final Security Sign-Off

Before going to production:

- [ ] All items in this checklist are verified
- [ ] Security team has reviewed the deployment
- [ ] Incident response plan is documented
- [ ] Backup and recovery procedures are tested
- [ ] Monitoring and alerting are configured
- [ ] Secrets are stored securely (not in git)
- [ ] HTTPS certificate is valid and renewed automatically
- [ ] Rate limiting is configured
- [ ] Audit logging is working
- [ ] Database backups are encrypted and tested

---

**Last Updated:** July 9, 2026  
**Status:** Ready for security review
