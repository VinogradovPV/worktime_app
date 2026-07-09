# FastAPI Backend Patch Instruction

**Target:** `/opt/worktime-sync/api/app/main.py` (Яндекс-сервер)  
**Database:** PostgreSQL (контейнер worktime-postgres)  
**API Base URL:** https://worktimeapi.duckdns.org  
**Status:** Ready for Auth endpoints implementation

---

## ⚠️ SECURITY REQUIREMENTS

**DO NOT:**
- Commit real API tokens, JWT secrets, or database passwords to git
- Log sensitive data (tokens, passwords, secrets)
- Use hardcoded credentials in code
- Share this patch with unauthorized personnel

**DO:**
- Use environment variables for all secrets
- Rotate API tokens after deployment
- Enable HTTPS only (no HTTP in production)
- Backup database before applying migrations
- Test on staging before production deployment

---

## 📋 Pre-Deployment Checklist

Before implementing any endpoints:

1. **Backup PostgreSQL database:**
   ```bash
   docker exec worktime-postgres pg_dump -U worktime_user -d worktime > /backup/worktime_before_auth_patch_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Check current FastAPI structure:**
   ```bash
   cd /opt/worktime-sync/api
   ls -la app/
   cat requirements.txt | grep -i fastapi
   ```

3. **Verify Docker containers:**
   ```bash
   docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}"
   ```

4. **Check environment variables (names only, no values):**
   ```bash
   docker exec worktime-api env | cut -d= -f1 | sort
   ```

---

## 🔐 Phase A: Auth Endpoints (CRITICAL)

### Required Environment Variables

Add to `.env` or docker-compose.yml:

```bash
# JWT Configuration
JWT_SECRET_KEY=<generate_secure_random_string>
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# Admin Seed (disable after first admin created)
ENABLE_ADMIN_SEED_ENDPOINT=false
ADMIN_SEED_TOKEN=<generate_secure_random_string>

# Database
DATABASE_URL=postgresql://worktime_user:<password>@worktime-postgres:5432/worktime

# API
API_BASE_URL=https://worktimeapi.duckdns.org
```

### A.1 Database Schema (PostgreSQL)

Create tables before implementing endpoints:

```sql
-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    login VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    org_unit_id INTEGER,
    position_id INTEGER,
    managed_org_unit_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (org_unit_id) REFERENCES org_units(id),
    FOREIGN KEY (position_id) REFERENCES positions(id),
    FOREIGN KEY (managed_org_unit_id) REFERENCES org_units(id)
);

-- Refresh tokens table
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    action VARCHAR(255) NOT NULL,
    resource_type VARCHAR(100),
    resource_id INTEGER,
    details TEXT,
    ip_address VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Org units table (if not exists)
CREATE TABLE IF NOT EXISTS org_units (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Positions table (if not exists)
CREATE TABLE IF NOT EXISTS positions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_users_login ON users(login);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
```

### A.2 FastAPI Implementation Template

Create `/opt/worktime-sync/api/app/routers/auth.py`:

```python
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, EmailStr, validator
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import jwt
import bcrypt
import os

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

# ============================================================================
# Models
# ============================================================================

class RegisterRequest(BaseModel):
    login: str
    password: str
    passwordConfirm: str
    displayName: str
    orgUnitId: int
    positionId: int
    comment: str = None

    @validator('password')
    def password_strength(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        return v

    @validator('passwordConfirm')
    def passwords_match(cls, v, values):
        if 'password' in values and v != values['password']:
            raise ValueError('Passwords do not match')
        return v


class LoginRequest(BaseModel):
    login: str
    password: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str
    new_password_confirm: str


# ============================================================================
# JWT Utilities
# ============================================================================

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "change-me-in-production")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", 7))


def create_access_token(user_id: int, expires_delta: timedelta = None):
    if expires_delta is None:
        expires_delta = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    expire = datetime.utcnow() + expires_delta
    payload = {
        "sub": str(user_id),
        "exp": expire,
        "type": "access"
    }
    encoded_jwt = jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return encoded_jwt


def create_refresh_token(user_id: int):
    expires_delta = timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    expire = datetime.utcnow() + expires_delta
    payload = {
        "sub": str(user_id),
        "exp": expire,
        "type": "refresh"
    }
    encoded_jwt = jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return encoded_jwt


def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode(), salt).decode()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode(), hashed_password.encode())


# ============================================================================
# Endpoints
# ============================================================================

@router.post("/register")
async def register(req: RegisterRequest, db: Session = Depends(get_db)):
    """
    Register new user (creates pending account, requires admin approval)
    """
    # Check if login exists
    existing_user = db.query(User).filter(User.login == req.login).first()
    if existing_user:
        raise HTTPException(status_code=409, detail="Login already exists")
    
    # Create user
    user = User(
        login=req.login,
        password_hash=hash_password(req.password),
        display_name=req.displayName,
        org_unit_id=req.orgUnitId,
        position_id=req.positionId,
        status="pending",
        role="user",
        managed_org_unit_id=None
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Log action
    audit_log = AuditLog(
        action="user_registered",
        resource_type="user",
        resource_id=user.id,
        details=f"User {req.login} registered, awaiting approval"
    )
    db.add(audit_log)
    db.commit()
    
    return {
        "ok": True,
        "status": "pending",
        "message": "Registration request submitted. Access will be granted after admin confirmation."
    }


@router.post("/login")
async def login(req: LoginRequest, db: Session = Depends(get_db)):
    """
    Login user (returns tokens if active or password_reset_required)
    """
    user = db.query(User).filter(User.login == req.login).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Check status
    if user.status == "pending":
        raise HTTPException(status_code=403, detail="User account is pending admin approval")
    elif user.status == "blocked":
        raise HTTPException(status_code=403, detail="User account is blocked")
    elif user.status == "rejected":
        raise HTTPException(status_code=403, detail="Registration request was rejected")
    
    # Generate tokens
    access_token = create_access_token(user.id)
    
    response = {
        "ok": True,
        "access_token": access_token,
        "user": {
            "id": user.id,
            "login": user.login,
            "displayName": user.display_name,
            "role": user.role,
            "status": user.status
        }
    }
    
    # Add refresh token if active
    if user.status == "active":
        refresh_token = create_refresh_token(user.id)
        response["refresh_token"] = refresh_token
    
    # Add password change requirement
    if user.status == "password_reset_required":
        response["requiresPasswordChange"] = True
    
    # Log action
    audit_log = AuditLog(
        user_id=user.id,
        action="user_login",
        resource_type="user",
        resource_id=user.id
    )
    db.add(audit_log)
    db.commit()
    
    return response


@router.post("/change-password")
async def change_password(
    req: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Change user password (required after password reset or first login)
    """
    # Verify current password
    if not verify_password(req.current_password, current_user.password_hash):
        raise HTTPException(status_code=401, detail="Current password is incorrect")
    
    # Validate new password
    if len(req.new_password) < 8:
        raise HTTPException(status_code=400, detail="New password must be at least 8 characters")
    
    if req.new_password != req.new_password_confirm:
        raise HTTPException(status_code=400, detail="Passwords do not match")
    
    # Update password
    current_user.password_hash = hash_password(req.new_password)
    if current_user.status == "password_reset_required":
        current_user.status = "active"
    
    db.commit()
    
    # Log action
    audit_log = AuditLog(
        user_id=current_user.id,
        action="password_changed",
        resource_type="user",
        resource_id=current_user.id
    )
    db.add(audit_log)
    db.commit()
    
    return {"ok": True, "message": "Password changed successfully"}


@router.get("/me")
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """
    Get current user information
    """
    return {
        "ok": True,
        "user": {
            "id": current_user.id,
            "login": current_user.login,
            "displayName": current_user.display_name,
            "role": current_user.role,
            "status": current_user.status,
            "orgUnitId": current_user.org_unit_id,
            "positionId": current_user.position_id,
            "managedOrgUnitId": current_user.managed_org_unit_id
        }
    }


@router.post("/refresh")
async def refresh_access_token(
    refresh_token: str,
    db: Session = Depends(get_db)
):
    """
    Refresh access token using refresh token
    """
    try:
        payload = jwt.decode(refresh_token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        
        user_id = int(payload.get("sub"))
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        new_access_token = create_access_token(user.id)
        return {
            "ok": True,
            "access_token": new_access_token
        }
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")


@router.post("/logout")
async def logout(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Logout user (invalidate refresh tokens)
    """
    # Delete all refresh tokens for this user
    db.query(RefreshToken).filter(RefreshToken.user_id == current_user.id).delete()
    db.commit()
    
    # Log action
    audit_log = AuditLog(
        user_id=current_user.id,
        action="user_logout",
        resource_type="user",
        resource_id=current_user.id
    )
    db.add(audit_log)
    db.commit()
    
    return {"ok": True, "message": "Logged out successfully"}
```

---

## 📋 Phase B: Admin Endpoints (HIGH Priority)

See BACKEND_FASTAPI_TASKS.md for complete specifications:
- POST /api/v1/admin/users/{id}/approve
- POST /api/v1/admin/users/{id}/reject
- POST /api/v1/admin/users/{id}/reset-password
- POST /api/v1/admin/users/{id}/assign-role
- POST /api/v1/admin/users/{id}/block
- POST /api/v1/admin/users/{id}/unblock
- GET /api/v1/admin/registration-requests

---

## 📋 Phase C: Public Directories (MEDIUM Priority)

- GET /api/v1/directories/org-units (public, no auth required)
- GET /api/v1/directories/positions (public, no auth required)

---

## 🚀 Deployment Steps

1. **Backup database:**
   ```bash
   docker exec worktime-postgres pg_dump -U worktime_user -d worktime > /backup/worktime_backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Apply database schema:**
   ```bash
   docker exec worktime-postgres psql -U worktime_user -d worktime -f /path/to/schema.sql
   ```

3. **Update FastAPI code:**
   ```bash
   cd /opt/worktime-sync/api
   # Copy auth.py to app/routers/
   # Update main.py to include auth router
   # Update requirements.txt with: bcryptjs, pyjwt, python-multipart
   ```

4. **Restart containers:**
   ```bash
   docker compose restart worktime-api
   docker logs -f worktime-api
   ```

5. **Test endpoints:**
   ```bash
   curl -X POST https://worktimeapi.duckdns.org/api/v1/auth/register \
     -H "Content-Type: application/json" \
     -d '{"login":"test","password":"Test1234!","passwordConfirm":"Test1234!","displayName":"Test User","orgUnitId":1,"positionId":1}'
   ```

---

## ⚠️ Post-Deployment

1. **Rotate API tokens** - old tokens exposed in previous versions must be rotated
2. **Disable admin seed endpoint** - set ENABLE_ADMIN_SEED_ENDPOINT=false after first admin created
3. **Monitor logs** - check for errors and security issues
4. **Test mobile app** - verify registration, login, and token refresh work correctly

---

## 📞 Support

For issues:
1. Check `/opt/worktime-sync/logs/` for FastAPI errors
2. Check PostgreSQL logs: `docker logs worktime-postgres`
3. Verify environment variables are set correctly
4. Ensure HTTPS certificate is valid

---

**Last Updated:** July 9, 2026  
**Status:** Ready for implementation
