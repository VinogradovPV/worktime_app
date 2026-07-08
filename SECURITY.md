# Security Guidelines - WorkTime App

**Last Updated:** July 8, 2026

---

## 🔒 Secrets Management

### ⚠️ Critical Issues to Address

1. **Old API Token Exposure**
   - Status: ⚠️ MUST BE ROTATED
   - An old EXTERNAL_API_TOKEN was exposed in previous versions
   - Action: Rotate all API tokens on the FastAPI server
   - Verify: No hardcoded tokens in current codebase (✅ verified)

2. **Seed Endpoint Token**
   - Status: ⚠️ MUST BE DISABLED AFTER BOOTSTRAP
   - The POST /api/v1/internal/seed-admins endpoint exists on server
   - Action: After creating first admin, set ENABLE_ADMIN_SEED_ENDPOINT=false
   - Verify: Seed token is not stored in mobile repository

3. **Database Password**
   - Status: ⚠️ MUST NOT BE COMMITTED
   - PostgreSQL password is on the server, not in this repository
   - Action: Keep DATABASE_URL only in server environment variables
   - Verify: .env.example contains only placeholders

---

## 🔐 Password Security

### Requirements

- **Hashing Algorithm:** bcryptjs with salt rounds = 10
- **Minimum Length:** 8 characters (enforced on backend)
- **Complexity:** No specific requirements (user choice)
- **Storage:** Only passwordHash stored in database, never plain text

### Implementation

```python
# FastAPI backend
import bcryptjs

# Hash password
salt = bcryptjs.gensalt(rounds=10)
password_hash = bcryptjs.hashpw(password.encode(), salt)

# Verify password
bcryptjs.checkpw(password.encode(), password_hash)
```

---

## 🎫 JWT Token Security

### Access Token

- **Expiration:** 15-30 minutes
- **Signature:** HS256 or RS256
- **Claims:** user_id, role, status, iat, exp
- **Storage (Client):** SecureStore (iOS Keychain / Android Keystore)
- **Usage:** Authorization header: `Bearer <access_token>`

### Refresh Token

- **Expiration:** 7 days
- **Signature:** HS256 or RS256
- **Storage (Client):** SecureStore
- **Storage (Server):** Optional token blacklist table
- **Usage:** POST /api/v1/auth/refresh to get new access_token

### Token Blacklist

- Implement optional token blacklist for logout
- Store blacklisted tokens with expiration time
- Clean up expired tokens periodically

---

## 🔑 Authorization

### Bearer Token Validation

All protected endpoints must:
1. Extract token from Authorization header
2. Validate token signature
3. Check token expiration
4. Verify user status (active, not blocked)
5. Check user role for admin endpoints

### Role-Based Access Control (RBAC)

| Endpoint | Required Role | Notes |
|----------|---------------|-------|
| POST /api/v1/auth/register | None | Public |
| POST /api/v1/auth/login | None | Public |
| GET /api/v1/directories/* | None | Public, read-only |
| GET /api/v1/auth/me | Any authenticated | User info |
| POST /api/v1/auth/change-password | Any authenticated | User can change own password |
| POST /api/v1/admin/* | admin | Admin-only endpoints |
| POST /api/v1/directories/* | admin | Admin-only, create/update |

---

## 🛡️ CORS & HTTPS

### CORS Configuration

```python
# FastAPI backend
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://worktimeapp-pdfmhwoz.manus.space", "exp://..."],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### HTTPS Requirement

- All API endpoints must use HTTPS
- Mobile app enforces HTTPS for all requests
- Certificate pinning recommended for production

---

## 🚫 Rate Limiting

### Recommended Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| POST /api/v1/auth/login | 5 attempts | 15 minutes |
| POST /api/v1/auth/register | 3 requests | 1 hour |
| POST /api/v1/auth/refresh | 10 requests | 1 hour |
| Other endpoints | 100 requests | 1 hour |

### Implementation

Use FastAPI middleware or reverse proxy (nginx) for rate limiting.

---

## 🔍 Input Validation

### Login/Password

- **login:** 3-50 characters, alphanumeric + underscore
- **password:** 8-128 characters, any characters
- **displayName:** 1-100 characters, any characters

### Registration

- Validate all required fields
- Check password match (password === passwordConfirm)
- Verify orgUnitId and positionId exist
- Sanitize comment field

### Admin Endpoints

- Validate user IDs exist
- Validate role values
- Validate managedOrgUnitId for managers
- Sanitize all text inputs

---

## 📝 Audit Logging

### What to Log

All admin actions must be logged:
- User approval/rejection
- Password reset
- Role assignment
- User block/unblock
- Directory updates (org_units, positions)

### Audit Log Fields

- **user_id:** Who performed the action
- **action:** Type of action (string)
- **target_id:** Which user/resource was affected
- **details:** JSON with before/after values
- **created_at:** Timestamp
- **ip_address:** Optional, for security

### Example

```json
{
  "user_id": 1,
  "action": "approve_user",
  "target_id": 42,
  "details": {
    "old_status": "pending",
    "new_status": "active",
    "new_role": "user"
  },
  "created_at": "2026-07-08T10:30:00Z",
  "ip_address": "192.168.1.1"
}
```

---

## 🔐 Environment Variables

### Server (.env)

```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/worktime

# JWT
JWT_SECRET_KEY=<random-64-char-string>
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# CORS
ALLOWED_ORIGINS=https://worktimeapp-pdfmhwoz.manus.space,exp://...

# Admin Seed
ENABLE_ADMIN_SEED_ENDPOINT=true  # Set to false after bootstrap
SEED_TOKEN=<random-token>

# Email (if notifications enabled)
SMTP_HOST=...
SMTP_PORT=...
SMTP_USER=...
SMTP_PASSWORD=...
```

### Mobile (.env.example)

```bash
# API Configuration
EXPO_PUBLIC_WORKTIME_API_URL=https://api.worktime.example.com
EXPO_PUBLIC_API_VERSION=v1

# Never commit real secrets in mobile app
# Use SecureStore for runtime tokens
```

---

## ✅ Security Checklist

Before deployment:

- [ ] No hardcoded tokens in code
- [ ] No database passwords in repository
- [ ] HTTPS enabled on all endpoints
- [ ] CORS properly configured
- [ ] Rate limiting implemented
- [ ] Input validation on all endpoints
- [ ] Password hashing with bcryptjs (salt=10)
- [ ] JWT tokens with expiration
- [ ] Token blacklist for logout (optional)
- [ ] Audit logging for all admin actions
- [ ] Old API tokens rotated
- [ ] Seed endpoint disabled after bootstrap
- [ ] Environment variables documented
- [ ] .env.example contains only placeholders

---

## 📚 References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [bcryptjs Documentation](https://github.com/dcodeIO/bcrypt.js)
- [FastAPI Security](https://fastapi.tiangolo.com/tutorial/security/)
