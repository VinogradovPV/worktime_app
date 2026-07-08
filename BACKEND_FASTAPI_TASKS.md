# FastAPI Backend Tasks - WorkTime App

**Deployment Location:** `/opt/worktime-sync/api/app/main.py` (Яндекс-сервер)  
**Database:** PostgreSQL (контейнер worktime-postgres)  
**Status:** Auth endpoints not yet implemented  
**Last Updated:** July 8, 2026

---

## 📋 Overview

This document describes all backend tasks for the deployed FastAPI server. These tasks are NOT implemented in the mobile repository - they must be implemented on the actual server at `/opt/worktime-sync`.

The mobile app (this repository) is a React Native client that calls these API endpoints.

---

## 🔐 Phase A: Auth Endpoints (CRITICAL - Must be implemented first)

### A.1 POST /api/v1/auth/register

**Request:**
```json
{
  "login": "string",
  "password": "string",
  "passwordConfirm": "string",
  "displayName": "string",
  "orgUnitId": number,
  "positionId": number,
  "comment": "string (optional)"
}
```

**Response:**
```json
{
  "ok": true,
  "status": "pending",
  "message": "Registration request submitted. Access will be granted after admin confirmation."
}
```

**Logic:**
- Validate input (password match, required fields)
- Check if login already exists → 409 Conflict
- Hash password using bcryptjs
- Create user with:
  - status = "pending"
  - role = "user"
  - managedOrgUnitId = null
- Do NOT return tokens
- Send notification to admin about pending registration
- Log action in audit_logs

---

### A.2 POST /api/v1/auth/login

**Request:**
```json
{
  "login": "string",
  "password": "string"
}
```

**Response (status=active):**
```json
{
  "ok": true,
  "access_token": "string (JWT, 15-30 min)",
  "refresh_token": "string (JWT, 7 days)",
  "user": { ... }
}
```

**Response (status=password_reset_required):**
```json
{
  "ok": true,
  "requiresPasswordChange": true,
  "access_token": "string (limited, only for change-password)",
  "user": { ... }
}
```

**Response (status != active and != password_reset_required):**
```json
{
  "ok": false,
  "error": "User account is not active",
  "status": 403
}
```

**Logic:**
- Find user by login
- Verify password using bcryptjs
- Check user status:
  - **active:** Return access_token + refresh_token
  - **password_reset_required:** Return limited access_token + requiresPasswordChange=true (no refresh_token)
  - **pending/blocked/rejected:** Return 403 Forbidden
- Generate JWT tokens (HS256 or RS256)
- Store refresh_token in database (optional: token blacklist)
- Return user info (id, login, displayName, role, status, etc.)
- Log action in audit_logs

---

### A.3 POST /api/v1/auth/refresh

**Request:**
```json
{
  "refresh_token": "string"
}
```

**Response:**
```json
{
  "ok": true,
  "access_token": "string (new JWT)",
  "refresh_token": "string (new JWT, optional)"
}
```

**Logic:**
- Validate refresh_token
- Check if token is in blacklist (if implemented)
- Generate new access_token (and optionally new refresh_token)
- Return new tokens

---

### A.4 POST /api/v1/auth/logout

**Request:** Bearer token in Authorization header

**Response:**
```json
{
  "ok": true
}
```

**Logic:**
- Validate token
- Add token to blacklist (optional, for server-side logout)
- Client should also clear tokens locally
- Log action in audit_logs

---

### A.5 GET /api/v1/auth/me

**Request:** Bearer token in Authorization header

**Response:**
```json
{
  "ok": true,
  "user": {
    "id": number,
    "login": "string",
    "displayName": "string",
    "role": "user|unit_manager|department_manager|admin",
    "status": "active|pending|blocked|rejected|password_reset_required",
    "orgUnitId": number | null,
    "positionId": number | null,
    "managedOrgUnitId": number | null,
    "createdAt": "ISO 8601",
    "updatedAt": "ISO 8601"
  }
}
```

**Logic:**
- Validate token
- Return current user info
- Check status and return appropriate data

---

### A.6 POST /api/v1/auth/change-password

**Request:** Bearer token in Authorization header
```json
{
  "current_password": "string",
  "new_password": "string"
}
```

**Response:**
```json
{
  "ok": true,
  "access_token": "string (new JWT)",
  "refresh_token": "string (new JWT)",
  "user": { ... }
}
```

**Logic:**
- Validate token
- Verify current_password against user's passwordHash
- Hash new_password using bcryptjs
- Update user.passwordHash
- If user.status = "password_reset_required" → change to "active"
- Invalidate old tokens (add to blacklist)
- Generate new tokens
- Return new tokens + user info
- Log action in audit_logs

---

## 👥 Phase B: Admin Endpoints

### B.1 GET /api/v1/admin/registration-requests

**Auth:** Bearer token (admin only)

**Response:**
```json
{
  "ok": true,
  "requests": [
    {
      "id": number,
      "login": "string",
      "displayName": "string",
      "orgUnitId": number,
      "positionId": number,
      "comment": "string",
      "status": "pending",
      "createdAt": "ISO 8601"
    }
  ]
}
```

**Logic:**
- Check user role = "admin"
- Return all users with status = "pending"
- Include registration metadata

---

### B.2 GET /api/v1/admin/users

**Auth:** Bearer token (admin only)

**Query params:** filters (optional)
- role: "user|unit_manager|department_manager|admin"
- status: "active|pending|blocked|rejected"
- search: search by login/displayName

**Response:**
```json
{
  "ok": true,
  "users": [ ... ],
  "total": number
}
```

---

### B.3 POST /api/v1/admin/users/{id}/approve

**Auth:** Bearer token (admin only)

**Request:**
```json
{
  "role": "user|unit_manager|department_manager"
}
```

**Response:**
```json
{
  "ok": true,
  "user": { ... }
}
```

**Logic:**
- Check user role = "admin"
- Find user by id
- If status != "pending" → 400 Bad Request
- Update user:
  - status = "active"
  - role = provided role
- Log action in audit_logs (who approved, when, new role)
- Send notification to user

---

### B.4 POST /api/v1/admin/users/{id}/reject

**Auth:** Bearer token (admin only)

**Request:**
```json
{
  "reason": "string (optional)"
}
```

**Response:**
```json
{
  "ok": true
}
```

**Logic:**
- Check user role = "admin"
- Find user by id
- If status != "pending" → 400 Bad Request
- Update user.status = "rejected"
- Log action in audit_logs
- Send notification to user

---

### B.5 POST /api/v1/admin/users/{id}/reset-password

**Auth:** Bearer token (admin only)

**Response:**
```json
{
  "ok": true,
  "tempPassword": "string (generated, shown only once)",
  "message": "Temporary password generated. User must change it on first login."
}
```

**Logic:**
- Check user role = "admin"
- Generate temporary password (random string)
- Hash temporary password using bcryptjs
- Update user:
  - passwordHash = hash(tempPassword)
  - status = "password_reset_required"
- Log action in audit_logs (who reset, when)
- Send notification to user with tempPassword
- Return tempPassword only in response (not stored in logs)

---

### B.6 POST /api/v1/admin/users/{id}/assign-role

**Auth:** Bearer token (admin only)

**Request:**
```json
{
  "role": "user|unit_manager|department_manager|admin",
  "managedOrgUnitId": number | null
}
```

**Response:**
```json
{
  "ok": true,
  "user": { ... }
}
```

**Logic:**
- Check user role = "admin"
- Validate role value
- If role = "unit_manager" or "department_manager" → managedOrgUnitId must be provided
- If role = "user" or "admin" → managedOrgUnitId must be null
- Update user.role and user.managedOrgUnitId
- Log action in audit_logs
- Send notification to user

---

### B.7 POST /api/v1/admin/users/{id}/block

**Auth:** Bearer token (admin only)

**Response:**
```json
{
  "ok": true,
  "user": { ... }
}
```

**Logic:**
- Check user role = "admin"
- Update user.status = "blocked"
- Invalidate all user's tokens
- Log action in audit_logs
- Send notification to user

---

### B.8 POST /api/v1/admin/users/{id}/unblock

**Auth:** Bearer token (admin only)

**Response:**
```json
{
  "ok": true,
  "user": { ... }
}
```

**Logic:**
- Check user role = "admin"
- Update user.status = "active"
- Log action in audit_logs
- Send notification to user

---

### B.9 PATCH /api/v1/admin/users/{id}

**Auth:** Bearer token (admin only)

**Request:**
```json
{
  "displayName": "string (optional)",
  "orgUnitId": number | null (optional),
  "positionId": number | null (optional)
}
```

**Response:**
```json
{
  "ok": true,
  "user": { ... }
}
```

**Logic:**
- Check user role = "admin"
- Update provided fields
- Log action in audit_logs (which fields changed)

---

## 📚 Phase C: Public Directories

### C.1 GET /api/v1/directories/org-units

**Auth:** None (public, required for registration form)

**Response:**
```json
{
  "ok": true,
  "orgUnits": [
    {
      "id": number,
      "name": "string",
      "description": "string",
      "isActive": true
    }
  ]
}
```

**Logic:**
- Return all org_units where isActive = true
- No authentication required
- Can be cached on client

---

### C.2 GET /api/v1/directories/positions

**Auth:** None (public, required for registration form)

**Response:**
```json
{
  "ok": true,
  "positions": [
    {
      "id": number,
      "name": "string",
      "description": "string",
      "isActive": true
    }
  ]
}
```

**Logic:**
- Return all positions where isActive = true
- No authentication required
- Can be cached on client

---

### C.3 POST /api/v1/directories/org-units

**Auth:** Bearer token (admin only)

**Request:**
```json
{
  "name": "string",
  "description": "string (optional)"
}
```

**Response:**
```json
{
  "ok": true,
  "orgUnit": { ... }
}
```

---

### C.4 PATCH /api/v1/directories/org-units/{id}

**Auth:** Bearer token (admin only)

**Request:**
```json
{
  "name": "string (optional)",
  "description": "string (optional)",
  "isActive": boolean (optional)
}
```

---

### C.5 POST /api/v1/directories/positions

**Auth:** Bearer token (admin only)

**Request:**
```json
{
  "name": "string",
  "description": "string (optional)"
}
```

---

### C.6 PATCH /api/v1/directories/positions/{id}

**Auth:** Bearer token (admin only)

**Request:**
```json
{
  "name": "string (optional)",
  "description": "string (optional)",
  "isActive": boolean (optional)
}
```

---

## 📊 Phase D: Audit Logging

**Requirement:** All admin actions must be logged in `audit_logs` table.

**Audit Log Fields:**
- id: primary key
- user_id: who performed the action
- action: "approve_user", "reject_user", "reset_password", "assign_role", "block_user", "unblock_user", "update_user", "create_org_unit", "update_org_unit", "create_position", "update_position"
- target_id: which user/org_unit/position was affected
- details: JSON with before/after values
- created_at: timestamp
- ip_address: optional, for security

**Actions to log:**
- approve_user
- reject_user
- reset_password
- assign_role
- block_user
- unblock_user
- update_user (displayName, orgUnitId, positionId)
- create_org_unit
- update_org_unit
- create_position
- update_position

---

## 🗄️ Database Schema Requirements

Verify/create these tables in PostgreSQL:

### users
```sql
- id: SERIAL PRIMARY KEY
- login: VARCHAR UNIQUE NOT NULL
- password_hash: VARCHAR NOT NULL
- display_name: VARCHAR NOT NULL
- role: VARCHAR (user, unit_manager, department_manager, admin)
- status: VARCHAR (active, pending, blocked, rejected, password_reset_required)
- org_unit_id: INTEGER FOREIGN KEY (optional)
- position_id: INTEGER FOREIGN KEY (optional)
- managed_org_unit_id: INTEGER FOREIGN KEY (optional, for managers)
- created_at: TIMESTAMP DEFAULT NOW()
- updated_at: TIMESTAMP DEFAULT NOW()
```

### org_units
```sql
- id: SERIAL PRIMARY KEY
- name: VARCHAR NOT NULL
- description: TEXT
- is_active: BOOLEAN DEFAULT true
- created_at: TIMESTAMP DEFAULT NOW()
- updated_at: TIMESTAMP DEFAULT NOW()
```

### positions
```sql
- id: SERIAL PRIMARY KEY
- name: VARCHAR NOT NULL
- description: TEXT
- is_active: BOOLEAN DEFAULT true
- created_at: TIMESTAMP DEFAULT NOW()
- updated_at: TIMESTAMP DEFAULT NOW()
```

### audit_logs
```sql
- id: SERIAL PRIMARY KEY
- user_id: INTEGER FOREIGN KEY NOT NULL
- action: VARCHAR NOT NULL
- target_id: INTEGER (optional)
- details: JSONB
- created_at: TIMESTAMP DEFAULT NOW()
- ip_address: VARCHAR (optional)
```

### refresh_tokens (optional, for token blacklist)
```sql
- id: SERIAL PRIMARY KEY
- user_id: INTEGER FOREIGN KEY NOT NULL
- token: VARCHAR NOT NULL
- expires_at: TIMESTAMP NOT NULL
- created_at: TIMESTAMP DEFAULT NOW()
```

---

## 🔒 Security Notes

1. **Password Hashing:** Use bcryptjs with salt rounds = 10
2. **JWT Tokens:**
   - Access token: 15-30 minutes expiration
   - Refresh token: 7 days expiration
   - Use HS256 or RS256 signature
3. **Token Blacklist:** Implement for logout and password reset
4. **CORS:** Allow requests from mobile app domain
5. **Rate Limiting:** Implement on auth endpoints
6. **Seed Endpoint:** Use existing POST /api/v1/internal/seed-admins for bootstrap
7. **Disable Seed:** Set ENABLE_ADMIN_SEED_ENDPOINT=false after first admin is created

---

## 📝 Implementation Notes

- All endpoints must validate Bearer token in Authorization header
- All responses must follow { ok: boolean, ... } format
- All errors must return appropriate HTTP status codes
- All timestamps must be ISO 8601 format
- All admin actions must be logged to audit_logs
- All user notifications should be sent (email/SMS/push as configured)
