# FastAPI Auth MVP - Security Checklist

**Date:** July 10, 2026  
**Version:** 2.0  
**Purpose:** Comprehensive security requirements for FastAPI Auth MVP deployment

---

## 🔐 Critical Security Requirements

### 1. API Token Management

- [ ] **Old exposed API token must be rotated**
  - Identify all services using old `EXTERNAL_API_TOKEN`
  - Generate new token: `openssl rand -hex 32`
  - Update all services simultaneously
  - Verify old token no longer works
  - Document rotation date/time
  - Audit log token changes

- [ ] **Verify no old tokens in git history**
  ```bash
  git log --all --source --full-history -S "EXTERNAL_API_TOKEN" -- .
  git log --all --source --full-history -S "old_token_value" -- .
  # Should return nothing
  ```

### 2. Seed Endpoint Security

- [ ] **Seed endpoint is protected by token**
  - Header: `X-Admin-Token` required
  - Token is 32+ hex characters
  - Token is NOT hardcoded in code
  - Token is NOT committed to git

- [ ] **Seed endpoint must be disabled after bootstrap**
  - Set: `ENABLE_ADMIN_SEED_ENDPOINT=false`
  - Restart container: `docker compose restart worktime-api`
  - Verify endpoint returns 403:
    ```bash
    curl -X POST https://worktimeapi.duckdns.org/api/v1/internal/seed-admins \
      -H "X-Admin-Token: any_token" \
      -d '{"login":"test","password":"Test123!","displayName":"Test"}'
    # Expected: {"ok":false,"error":"Admin seed endpoint is disabled"}
    ```

- [ ] **Verify active admin users exist before disabling**
  ```bash
  docker exec worktime-postgres psql -U worktime_user -d worktime -c \
    "SELECT COUNT(*) FROM users WHERE role='admin' AND status='active';"
  # Expected: >= 1
  ```

- [ ] **Seed endpoint is NOT accessible from mobile app**
  - Mobile app does NOT have seed token
  - Mobile app does NOT call `/api/v1/internal/seed-admins`
  - Only server-side bootstrap uses this endpoint

### 3. Database Security

- [ ] **Database password stays ONLY in server environment**
  - NOT in git repository
  - NOT in code
  - NOT in documentation
  - Stored in: `.env` file (NOT committed) or Docker secrets
  - Verify: `git log --all -p | grep -i "password" | head -5`
  - Result: Should return nothing

- [ ] **Database connection uses SSL/TLS**
  - `DATABASE_URL` includes `sslmode=require`
  - Certificate is valid (not self-signed)
  - Connection pool configured correctly

- [ ] **Database user has minimal permissions**
  - User: `worktime_user`
  - Can only SELECT, INSERT, UPDATE, DELETE
  - Cannot drop tables or databases
  - Cannot create new users

### 4. JWT Secret Management

- [ ] **JWT_SECRET_KEY must be strong**
  - Minimum 32 characters
  - Mix of uppercase, lowercase, numbers, special chars
  - Generated with: `openssl rand -hex 32`
  - Example: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6`

- [ ] **JWT_SECRET_KEY is NOT committed to git**
  ```bash
  git log --all -p | grep -i "JWT_SECRET" | head -5
  # Should return nothing
  ```

- [ ] **JWT_SECRET_KEY is NOT in code**
  - Default value in code is placeholder only
  - Production value from environment variable
  - `.env` file is in `.gitignore`

- [ ] **JWT algorithm is HS256 (not HS512 or others)**
  - Check: `grep "JWT_ALGORITHM" docker-compose.yml`
  - Value: `HS256`

### 5. CORS Configuration

- [ ] **CORS allows ONLY mobile and web origins**
  - Mobile app: `https://worktimeapp-pdfmhwoz.manus.space`
  - Web admin (if exists): `https://admin.worktimeapi.duckdns.org`
  - NO `allow_origins=["*"]`
  - NO localhost in production
  - Check: `grep -A 5 "allow_origins" app/main.py`

- [ ] **CORS credentials enabled only when needed**
  - `allow_credentials=True` if using cookies
  - `allow_credentials=False` if using Bearer tokens

### 6. Rate Limiting

- [ ] **Rate limiting on auth endpoints**
  - `/api/v1/auth/register`: 5 requests per hour per IP
  - `/api/v1/auth/login`: 10 requests per hour per IP
  - `/api/v1/auth/refresh`: 30 requests per hour per IP

- [ ] **Rate limiting on admin endpoints**
  - `/api/v1/admin/*`: 100 requests per hour per user

- [ ] **Rate limiting on seed endpoint**
  - `/api/v1/internal/seed-admins`: 1 request per minute per IP

### 7. No Secrets in Git

- [ ] **Verify no secrets committed**
  ```bash
  git log --all -p | grep -E "(password|token|secret|key|JWT_SECRET|ADMIN_SEED)" | head -10
  # Should return nothing
  ```

- [ ] **Verify .env is in .gitignore**
  ```bash
  cat .gitignore | grep ".env"
  # Should contain .env
  ```

- [ ] **Verify no hardcoded credentials**
  - All credentials from environment variables
  - Default values are placeholders only
  - Code review for hardcoded values

### 8. No tempPassword in Logs

- [ ] **Temporary passwords NEVER logged**
  - Audit logs exclude `tempPassword` field
  - Application logs do NOT contain temp passwords
  - Search logs:
    ```bash
    docker logs worktime-api | grep -i "password" | grep -i "temp"
    # Should return nothing
    ```

- [ ] **Sensitive data NOT logged**
  - Password hashes NOT logged
  - JWT tokens NOT logged
  - User credentials NOT logged
  - API keys NOT logged

### 9. HTTPS Only

- [ ] **HTTPS enforced in production**
  - All endpoints require HTTPS
  - HTTP redirects to HTTPS
  - HSTS header set: `Strict-Transport-Security: max-age=31536000`

- [ ] **TLS certificate is valid**
  - Not self-signed
  - Not expired
  - Matches domain name
  - From trusted CA

- [ ] **TLS version 1.2 or higher**
  - Disable TLS 1.0 and 1.1
  - Prefer TLS 1.3

---

## ✅ Pre-Deployment Checklist

### Environment Variables

- [ ] `JWT_SECRET_KEY` is set (32+ hex chars)
- [ ] `ADMIN_SEED_TOKEN` is set (32+ hex chars)
- [ ] `DATABASE_URL` has correct credentials
- [ ] `ENABLE_ADMIN_SEED_ENDPOINT=true` (temporarily)
- [ ] `JWT_ALGORITHM=HS256`
- [ ] `ACCESS_TOKEN_EXPIRE_MINUTES=30`
- [ ] `REFRESH_TOKEN_EXPIRE_DAYS=7`

### Database

- [ ] PostgreSQL is running
- [ ] Database `worktime` exists
- [ ] User `worktime_user` exists
- [ ] SQL migration applied successfully
- [ ] Tables created: `users`, `org_units`, `positions`, `audit_logs`, `refresh_tokens`

### Code

- [ ] No secrets in git history
- [ ] No hardcoded credentials
- [ ] Dependencies are up to date
- [ ] Debug mode is disabled
- [ ] CORS configured correctly

### Testing

- [ ] Health endpoint works
- [ ] Public directories endpoints work
- [ ] Registration works (returns pending status)
- [ ] Admin seed endpoint works
- [ ] Admin login works
- [ ] User approval works
- [ ] User login works (after approval)
- [ ] Audit logs created

---

## 🚨 Post-Deployment Verification

### Immediate After Deployment

- [ ] **Verify HTTPS working**
  ```bash
  curl -I https://worktimeapi.duckdns.org/api/v1/health
  # Should show 200 OK
  ```

- [ ] **Verify seed endpoint disabled**
  ```bash
  curl -X POST https://worktimeapi.duckdns.org/api/v1/internal/seed-admins \
    -H "X-Admin-Token: any_token" \
    -d '{"login":"test","password":"Test123!","displayName":"Test"}'
  # Should return 403 Forbidden
  ```

- [ ] **Verify no secrets in logs**
  ```bash
  docker logs worktime-api | grep -i "secret\|password\|token" | head -5
  # Should return nothing
  ```

- [ ] **Verify database connection encrypted**
  ```bash
  docker exec worktime-api env | grep DATABASE_URL
  # Should show sslmode=require
  ```

### Weekly Security Checks

- [ ] Review audit logs for suspicious activity
- [ ] Check for failed login attempts
- [ ] Verify no new admin users created unexpectedly
- [ ] Verify all users have correct status

### Monthly Security Audit

- [ ] Review all API tokens
- [ ] Check for exposed secrets
- [ ] Verify TLS certificate expiration
- [ ] Review CORS configuration
- [ ] Check rate limiting effectiveness
- [ ] Audit user access patterns
- [ ] Clean up old logs

---

## 📞 Security Incident Response

### If Secrets Are Exposed

1. Immediately rotate all secrets
2. Update all services with new secrets
3. Restart all containers
4. Invalidate all existing tokens
5. Notify all users to re-login
6. Review audit logs for unauthorized access

### If Unauthorized Access Detected

1. Block suspicious user
2. Invalidate user tokens
3. Review audit logs
4. Notify security team

---

## ✅ Final Sign-Off

- [ ] All critical requirements verified
- [ ] All pre-deployment checks passed
- [ ] All post-deployment verification passed
- [ ] Incident response plan documented
- [ ] Security team approved
- [ ] Ready for production

**Deployment Date:** ___________________  
**Approved by:** ___________________  
**Status:** ☐ Approved ☐ Approved with conditions ☐ Rejected

---

**Last Updated:** July 10, 2026  
**Status:** Ready for deployment
