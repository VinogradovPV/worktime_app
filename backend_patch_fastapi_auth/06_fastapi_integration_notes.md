# FastAPI Integration Notes - Auth MVP

**Date:** July 9, 2026  
**Target:** `/opt/worktime-sync/api/app/main.py`  
**Scope:** Integration details for Auth endpoints

---

## 📦 Dependencies

Add to `requirements.txt`:

```
bcryptjs==4.1.1
PyJWT==2.8.1
python-multipart==0.0.6
sqlalchemy==2.0.23
psycopg2-binary==2.9.9
```

Install:
```bash
pip install -r requirements.txt
```

---

## 🏗️ Project Structure

After integration, structure should be:

```
/opt/worktime-sync/api/app/
├── main.py                 # FastAPI entry point (updated)
├── models/
│   ├── __init__.py
│   ├── user.py            # User ORM model
│   ├── audit_log.py       # AuditLog ORM model
│   └── refresh_token.py   # RefreshToken ORM model
├── routers/
│   ├── __init__.py
│   ├── auth.py            # Auth endpoints (from 02_fastapi_auth_patch.py)
│   ├── admin.py           # Admin endpoints (from 03_fastapi_admin_patch.py)
│   ├── directories.py     # Directories endpoints (from 04_fastapi_directories_patch.py)
│   └── audit.py           # Audit endpoints (from 05_fastapi_audit_patch.py)
├── dependencies/
│   ├── __init__.py
│   ├── auth.py            # JWT verification, get_current_user()
│   └── database.py        # Database session management
├── schemas/
│   ├── __init__.py
│   ├── auth.py            # Pydantic schemas for auth
│   ├── user.py            # Pydantic schemas for user
│   └── common.py          # Common response schemas
└── utils/
    ├── __init__.py
    ├── security.py        # Password hashing, JWT generation
    └── audit.py           # Audit logging utilities
```

---

## 🔑 Key Components

### 1. Database Models (SQLAlchemy)

**User Model:**
```python
class User(Base):
    __tablename__ = "users"
    
    id: int = Column(Integer, primary_key=True)
    login: str = Column(String(255), unique=True, nullable=False)
    password_hash: str = Column(String(255), nullable=False)
    display_name: str = Column(String(255), nullable=False)
    role: str = Column(String(50), default="user")  # user, unit_manager, department_manager, admin
    status: str = Column(String(50), default="pending")  # pending, active, blocked, rejected, password_reset_required
    org_unit_id: int = Column(Integer, ForeignKey("org_units.id"), nullable=True)
    position_id: int = Column(Integer, ForeignKey("positions.id"), nullable=True)
    managed_org_unit_id: int = Column(Integer, ForeignKey("org_units.id"), nullable=True)
    last_login_at: datetime = Column(DateTime, nullable=True)
    created_at: datetime = Column(DateTime, default=datetime.utcnow)
    updated_at: datetime = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

**AuditLog Model:**
```python
class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id: int = Column(Integer, primary_key=True)
    actor_user_id: int = Column(Integer, ForeignKey("users.id"), nullable=True)
    action: str = Column(String(100), nullable=False)
    entity_type: str = Column(String(100), nullable=True)
    entity_id: int = Column(Integer, nullable=True)
    old_values: dict = Column(JSON, nullable=True)
    new_values: dict = Column(JSON, nullable=True)
    ip_address: str = Column(String(50), nullable=True)
    user_agent: str = Column(Text, nullable=True)
    created_at: datetime = Column(DateTime, default=datetime.utcnow)
```

### 2. Security Utilities

**Password Hashing:**
```python
import bcryptjs

def hash_password(password: str) -> str:
    return bcryptjs.hashpw(password.encode(), bcryptjs.gensalt()).decode()

def verify_password(password: str, password_hash: str) -> bool:
    return bcryptjs.checkpw(password.encode(), password_hash.encode())
```

**JWT Generation:**
```python
import jwt
from datetime import datetime, timedelta
from os import getenv

SECRET_KEY = getenv("JWT_SECRET_KEY")
ALGORITHM = getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30))
REFRESH_TOKEN_EXPIRE_DAYS = int(getenv("REFRESH_TOKEN_EXPIRE_DAYS", 7))

def create_access_token(user_id: int) -> str:
    expires = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": str(user_id), "exp": expires, "type": "access"}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def create_refresh_token(user_id: int) -> str:
    expires = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    payload = {"sub": str(user_id), "exp": expires, "type": "refresh"}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def verify_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.InvalidTokenError:
        return None
```

### 3. Dependency Injection

**Get Current User:**
```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthCredentials

security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthCredentials = Depends(security), db: Session = Depends(get_db)):
    token = credentials.credentials
    payload = verify_token(token)
    
    if not payload or payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user_id = int(payload.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    return user

async def get_admin_user(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user
```

### 4. Audit Logging

**Log Action:**
```python
def log_audit_action(
    db: Session,
    actor_user_id: int,
    action: str,
    entity_type: str,
    entity_id: int,
    old_values: dict = None,
    new_values: dict = None,
    ip_address: str = None,
    user_agent: str = None
):
    audit_log = AuditLog(
        actor_user_id=actor_user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        old_values=old_values,
        new_values=new_values,
        ip_address=ip_address,
        user_agent=user_agent
    )
    db.add(audit_log)
    db.commit()
```

---

## 🔌 Integration Steps

### Step 1: Create Models

Create `/opt/worktime-sync/api/app/models/user.py`:
```python
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    # ... (see above)

class AuditLog(Base):
    __tablename__ = "audit_logs"
    # ... (see above)

class RefreshToken(Base):
    __tablename__ = "refresh_tokens"
    # ... (see migration)
```

### Step 2: Create Dependencies

Create `/opt/worktime-sync/api/app/dependencies/auth.py`:
```python
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthCredentials
# ... (see above)
```

### Step 3: Create Routers

Copy files from patch package:
- `02_fastapi_auth_patch.py` → `routers/auth.py`
- `03_fastapi_admin_patch.py` → `routers/admin.py`
- `04_fastapi_directories_patch.py` → `routers/directories.py`
- `05_fastapi_audit_patch.py` → `routers/audit.py`

### Step 4: Update main.py

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, admin, directories, audit
from app.dependencies.database import engine, Base

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="WorkTime API", version="1.0.0")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://worktimeapp-pdfmhwoz.manus.space"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(admin.router, prefix="/api/v1/admin", tags=["admin"])
app.include_router(directories.router, prefix="/api/v1/directories", tags=["directories"])
app.include_router(audit.router, prefix="/api/v1/audit", tags=["audit"])

@app.get("/api/v1/health")
async def health():
    return {"status": "ok"}
```

### Step 5: Install Dependencies

```bash
cd /opt/worktime-sync
pip install -r requirements.txt
```

### Step 6: Run Migration

```bash
docker exec worktime-postgres psql -U worktime_user -d worktime -f backend_patch_fastapi_auth/01_migration_auth_mvp.sql
```

### Step 7: Restart Container

```bash
docker compose restart worktime-api
```

---

## 🧪 Verification

After integration, verify:

```bash
# 1. Check logs
docker logs worktime-api | tail -20

# 2. Test health endpoint
curl https://worktimeapi.duckdns.org/api/v1/health

# 3. Test public endpoint
curl https://worktimeapi.duckdns.org/api/v1/directories/org-units

# 4. Test auth endpoint
curl -X POST https://worktimeapi.duckdns.org/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"login":"test","password":"Test1234!","passwordConfirm":"Test1234!","displayName":"Test","orgUnitId":1,"positionId":1}'
```

---

## 📝 Common Issues

### Issue: "ModuleNotFoundError: No module named 'bcryptjs'"

**Solution:** Install dependencies
```bash
pip install -r requirements.txt
```

### Issue: "JWT_SECRET_KEY not set"

**Solution:** Set environment variable
```bash
export JWT_SECRET_KEY=$(openssl rand -hex 32)
docker compose restart worktime-api
```

### Issue: "Database connection failed"

**Solution:** Check DATABASE_URL
```bash
docker exec worktime-api env | grep DATABASE_URL
docker exec worktime-postgres psql -U worktime_user -d worktime -c "SELECT 1"
```

### Issue: "CORS error from mobile app"

**Solution:** Update allowed_origins in main.py
```python
allow_origins=["https://worktimeapp-pdfmhwoz.manus.space"]
```

---

## 📚 References

- FastAPI Documentation: https://fastapi.tiangolo.com/
- SQLAlchemy ORM: https://docs.sqlalchemy.org/
- PyJWT: https://pyjwt.readthedocs.io/
- bcryptjs: https://github.com/pyca/bcrypt

---

**Last Updated:** July 9, 2026  
**Status:** Ready for integration
