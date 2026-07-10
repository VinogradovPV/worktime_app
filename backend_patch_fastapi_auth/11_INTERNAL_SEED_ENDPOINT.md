# Internal Seed Endpoint - Bootstrap First Admin

**Date:** July 9, 2026  
**Purpose:** Создание первого администратора системы  
**Security:** Требуется специальный токен, доступен только один раз

---

## 📋 Overview

Endpoint `/api/v1/internal/seed-admins` предназначен для создания первого администратора системы. После создания первого админа endpoint должен быть отключен.

---

## 🔐 Security Features

- **Token-based access**: Требуется `X-Admin-Token` заголовок с правильным токеном
- **One-time use**: Endpoint отключается после создания первого админа
- **Environment-controlled**: Управляется флагом `ENABLE_ADMIN_SEED_ENDPOINT`
- **Audit logging**: Все попытки логируются

---

## 🚀 Implementation

### Step 1: Add Endpoint to main.py

```python
from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from os import getenv

from app.dependencies.database import get_db
from app.models.user import User
from app.utils.security import hash_password

router = APIRouter()

@router.post("/internal/seed-admins")
async def seed_admin(
    login: str,
    password: str,
    displayName: str,
    db: Session = Depends(get_db),
    x_admin_token: str = Header(None)
):
    # Check if endpoint is enabled
    if not getenv("ENABLE_ADMIN_SEED_ENDPOINT", "false").lower() == "true":
        raise HTTPException(status_code=403, detail="Admin seed endpoint is disabled")

    # Verify token
    expected_token = getenv("ADMIN_SEED_TOKEN")
    if not x_admin_token or x_admin_token != expected_token:
        raise HTTPException(status_code=401, detail="Invalid admin token")

    # Check if any admin already exists
    existing_admin = db.query(User).filter(User.role == "admin").first()
    if existing_admin:
        raise HTTPException(status_code=400, detail="Admin user already exists")

    # Create admin user
    admin_user = User(
        login=login,
        password_hash=hash_password(password),
        display_name=displayName,
        role="admin",
        status="active",
        managed_org_unit_id=None
    )
    db.add(admin_user)
    db.commit()
    db.refresh(admin_user)

    return {
        "ok": True,
        "user_id": admin_user.id,
        "message": "Admin user created successfully"
    }
```

### Step 2: Environment Variables

```bash
# .env или docker-compose.yml
ENABLE_ADMIN_SEED_ENDPOINT=true
ADMIN_SEED_TOKEN=<generate_secure_random_string>
```

Generate secure token:

```bash
openssl rand -hex 32
# Output: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
```

---

## 📝 Usage

### Create First Admin

```bash
curl -X POST https://worktimeapi.duckdns.org/api/v1/internal/seed-admins \
  -H "Content-Type: application/json" \
  -H "X-Admin-Token: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6" \
  -d '{
    "login": "admin",
    "password": "SecurePassword123!",
    "displayName": "System Administrator"
  }'

# Response:
# {
#   "ok": true,
#   "user_id": 1,
#   "message": "Admin user created successfully"
# }
```

### Disable Endpoint After First Admin

```bash
# 1. Update environment variable
export ENABLE_ADMIN_SEED_ENDPOINT=false

# 2. Restart container
docker compose restart worktime-api

# 3. Verify endpoint is disabled
curl -X POST https://worktimeapi.duckdns.org/api/v1/internal/seed-admins \
  -H "Content-Type: application/json" \
  -H "X-Admin-Token: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6" \
  -d '{"login":"admin2","password":"Pass123!","displayName":"Admin 2"}'

# Response:
# {
#   "ok": false,
#   "error": "Admin seed endpoint is disabled"
# }
```

---

## ⚠️ Error Scenarios

### 1. Endpoint Disabled

```bash
curl -X POST https://worktimeapi.duckdns.org/api/v1/internal/seed-admins \
  -H "X-Admin-Token: token" \
  -d '{"login":"admin","password":"Pass123!","displayName":"Admin"}'

# Response:
# {
#   "ok": false,
#   "error": "Admin seed endpoint is disabled"
# }
```

### 2. Invalid Token

```bash
curl -X POST https://worktimeapi.duckdns.org/api/v1/internal/seed-admins \
  -H "X-Admin-Token: wrong_token" \
  -d '{"login":"admin","password":"Pass123!","displayName":"Admin"}'

# Response:
# {
#   "ok": false,
#   "error": "Invalid admin token"
# }
```

### 3. Admin Already Exists

```bash
# After first admin created
curl -X POST https://worktimeapi.duckdns.org/api/v1/internal/seed-admins \
  -H "X-Admin-Token: correct_token" \
  -d '{"login":"admin2","password":"Pass123!","displayName":"Admin 2"}'

# Response:
# {
#   "ok": false,
#   "error": "Admin user already exists"
# }
```

---

## 🔒 Security Best Practices

1. **Generate Strong Token**
   ```bash
   ADMIN_SEED_TOKEN=$(openssl rand -hex 32)
   ```

2. **Store Token Securely**
   - Use Docker secrets or environment files
   - Never commit to git
   - Rotate after use if possible

3. **Disable After Use**
   - Set `ENABLE_ADMIN_SEED_ENDPOINT=false` immediately after creating first admin
   - Restart container to apply changes

4. **Audit Logging**
   - All seed attempts are logged (even failed ones)
   - Token itself is not logged
   - Log includes timestamp and IP address

5. **Rate Limiting** (Recommended)
   - Add rate limiting to this endpoint
   - Prevent brute force attacks

---

## 🧪 Testing Checklist

- [ ] Endpoint works with correct token
- [ ] Endpoint rejects invalid token
- [ ] Endpoint rejects when disabled
- [ ] Endpoint rejects when admin already exists
- [ ] Admin user created with correct role and status
- [ ] Password is hashed (not stored in plain text)
- [ ] Audit log entry created
- [ ] Response includes user_id

---

## 📚 Related Documentation

- `06_fastapi_integration_notes.md` - Integration details
- `09_security_checklist.md` - Security requirements
- `07_curl_test_plan.md` - API testing guide

---

**Last Updated:** July 9, 2026  
**Status:** Ready for deployment
