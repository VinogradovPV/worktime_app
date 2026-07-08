# MVP Задачи - WorkTime App

**Last Updated:** July 8, 2026  
**Status:** Active Development  
**Total Tasks:** 14 (removed forgot-password from MVP)  
**Completed:** 1  
**In Progress:** 0  
**Blocked:** 0  

**Critical Fixes Applied:**
- ✅ Registration: No tokens returned, requires admin approval
- ✅ Reset Password: Returns tempPassword, requires change on first login
- ✅ All endpoints standardized to `/api/v1`
- ✅ JWT: Access 15m, Refresh 7d (HS256)
- ✅ Backend Stack: Express/TypeScript (not FastAPI)
- ✅ Audit Logging: Added to MVP (High Priority)
- ✅ Public Directories: Available before login (for registration form)

---

## 🟢 COMPLETED TASKS

### ✅ Task 1: Fix TypeScript Errors
- **Status:** ✅ COMPLETED
- **Priority:** CRITICAL
- **Actual Time:** 3 hours
- **Completion Date:** July 7, 2026
- **Description:** Removed broken tRPC sync references and fixed TypeScript compilation
- **Changes Made:**
  - Rewrote lib/sync/syncService.ts for REST API
  - Updated API functions uploadWorkDays and downloadWorkDays
  - Fixed all saveWorkDay calls
- **Result:** `pnpm run check` passes with 0 errors ✅

---

## 🔴 CRITICAL TASKS (Next Priority)

### Task 2: Implement Auth Endpoints (Including Registration)
- **Status:** ⏳ NOT STARTED
- **Priority:** CRITICAL (Blocks all other tasks)
- **Estimated Time:** 5-6 hours
- **Description:** Create REST API endpoints for authentication and user registration on Express/TypeScript server in this repository

- **Endpoints to Create:**
  1. POST /api/v1/auth/register - User registration (NEW USER - pending status)
  2. POST /api/v1/auth/login - User login with credentials
  3. POST /api/v1/auth/refresh - Token refresh using refresh_token
  4. POST /api/v1/auth/logout - User logout
  5. GET /api/v1/auth/me - Get current user info
  6. POST /api/v1/auth/change-password - Change user password

- **Registration Details (POST /api/v1/auth/register):**
  - **Request:** `{ login, password, passwordConfirm, displayName, orgUnitId, positionId, comment? }`
  - **Response:** `{ ok: true, status: "pending", message }`
  - **New User Properties:**
    - status = "pending" (NOT "active")
    - role = "user" (NOT selectable by user)
    - managedOrgUnitId = null
  - **CRITICAL:** Do NOT return access_token, refresh_token, or user session
  - Send admin notification for approval

- **Files to Create/Update:**
  - server/_core/auth-api.ts - NEW (create auth endpoints)
  - server/_core/index.ts - Update to mount endpoints
  - server/_core/jwt.ts - Use existing JWT utilities
  - server/_core/db.ts - Database access
  - Verify endpoints use `/api/v1` prefix
  - All endpoints must be in Express/TypeScript (not external API)

- **Acceptance Criteria:**
  - [ ] All 6 endpoints respond correctly
  - [ ] JWT tokens are properly signed (HS256)
  - [ ] Invalid credentials return 401
  - [ ] Expired tokens are rejected
  - [ ] Access token: 15-30 minutes, Refresh token: 7 days
  - [ ] Passwords verified with bcrypt
  - [ ] Registration does NOT return tokens
  - [ ] Registration creates user with status="pending"
  - [ ] Registration requires admin approval before activation
  - [ ] Client function register() works correctly

- **Dependencies:** None
- **Blocked By:** None

---

### Task 3: Test Auth Flow End-to-End
- **Status:** ⏳ BLOCKED (Waiting for Task 2)
- **Priority:** CRITICAL
- **Estimated Time:** 2-3 hours
- **Description:** Verify authentication works from mobile client to server
- **Test Scenarios:**
  1. Register new user → receive pending status
  2. Admin approves registration → user status changes to active
  3. Login with valid credentials → receive tokens
  4. Use access token to call GET /api/v1/auth/me
  5. Wait for access token to expire → call refresh
  6. Verify new access token works
  7. Logout → tokens invalidated

- **Files to Test:**
  - lib/_core/api.ts (register, login, refresh, logout, getMe)
  - hooks/use-auth.ts (useAuth hook)
  - lib/_core/auth.ts (token storage)

- **Acceptance Criteria:**
  - [ ] Registration returns pending status
  - [ ] Login returns valid tokens
  - [ ] Tokens stored in SecureStore
  - [ ] Refresh token works correctly
  - [ ] Logout clears tokens
  - [ ] useAuth hook updates state correctly
  - [ ] Admin can approve/reject registrations

- **Dependencies:** Task 2
- **Blocked By:** Task 2

---

## 🟡 HIGH PRIORITY TASKS

### Task 4: Implement Admin Endpoints
- **Status:** ⏳ NOT STARTED
- **Priority:** HIGH
- **Estimated Time:** 4-5 hours
- **Description:** Create admin endpoints for user management on Express/TypeScript server

- **Endpoints to Create:**
  1. GET /api/v1/admin/registration-requests - List pending registrations
  2. POST /api/v1/admin/users/{id}/approve - Approve user registration (with role assignment)
  3. POST /api/v1/admin/users/{id}/reject - Reject user registration
  4. GET /api/v1/admin/users - List all users
  5. POST /api/v1/admin/users/{id}/reset-password - Reset user password (generates tempPassword, sets status=password_reset_required)
  6. POST /api/v1/admin/users/{id}/assign-role - Assign role to user (user, unit_manager, department_manager, admin)
  7. POST /api/v1/admin/users/{id}/block - Block user
  8. POST /api/v1/admin/users/{id}/unblock - Unblock user
  9. PATCH /api/v1/admin/users/{id} - Update user (orgUnitId, positionId, displayName)

- **Audit Logging Required:**
  - All approve/reject/block/unblock/reset-password/assign-role actions
  - All user profile changes (orgUnitId, positionId)

- **Reset Password Logic:**
  - Generate random tempPassword (8-12 chars)
  - Hash tempPassword with bcrypt
  - Set user status = "password_reset_required"
  - Return tempPassword only in response (never log it)
  - User must call POST /api/v1/auth/change-password after login
  - After password change, status = "active"

- **Role Assignment Logic:**
  - unit_manager: managedOrgUnitId = specified org unit
  - department_manager: managedOrgUnitId = specified department
  - admin: managedOrgUnitId = null
  - user: managedOrgUnitId = null

- **Acceptance Criteria:**
  - [ ] Only admin users can access these endpoints
  - [ ] All endpoints require Bearer token
  - [ ] Responses follow API contract
  - [ ] resetPassword returns tempPassword (not actual password)
  - [ ] resetPassword sets status = password_reset_required
  - [ ] Role assignment sets managedOrgUnitId correctly
  - [ ] All admin actions logged to audit_logs table
  - [ ] All endpoints use `/api/v1` prefix

- **Dependencies:** Task 2 (Auth endpoints)
- **Blocked By:** Task 2

---

### Task 5: Implement Directory Endpoints
- **Status:** ⏳ NOT STARTED
- **Priority:** HIGH
- **Estimated Time:** 2-3 hours
- **Description:** Create endpoints for org units and positions on Express/TypeScript server

- **Public/Read-Only Endpoints (no auth required):**
  1. GET /api/v1/directories/org-units - List active org units only (isActive=true)
  2. GET /api/v1/directories/positions - List active positions only (isActive=true)
  - These endpoints are used during registration and by authenticated users

- **Admin-Only Endpoints:**
  1. POST /api/v1/directories/org-units - Create org unit (admin only)
  2. PATCH /api/v1/directories/org-units/{id} - Update org unit (admin only)
  3. POST /api/v1/directories/positions - Create position (admin only)
  4. PATCH /api/v1/directories/positions/{id} - Update position (admin only)
  - All create/update actions logged to audit_logs

- **Acceptance Criteria:**
  - [ ] GET endpoints don't require auth (public)
  - [ ] GET endpoints return only active records (isActive=true)
  - [ ] POST/PATCH endpoints require admin role
  - [ ] POST/PATCH endpoints log to audit_logs
  - [ ] Responses follow API contract
  - [ ] All endpoints use `/api/v1` prefix
  - [ ] Public endpoints work before user login (for registration form)

- **Dependencies:** Task 2 (Auth endpoints)
- **Blocked By:** Task 2

---

### Task 6: Implement Sync Endpoints
- **Status:** ⏳ NOT STARTED
- **Priority:** HIGH
- **Estimated Time:** 2-3 hours
- **Description:** Create endpoints for work day synchronization on Express/TypeScript server

- **Endpoints to Create:**
  1. POST /api/v1/sync/upload-workdays - Upload work days (requires auth)
  2. GET /api/v1/sync/download-workdays - Download work days (requires auth)
  3. GET /api/v1/sync/status - Get sync status (requires auth)

- **Acceptance Criteria:**
  - [ ] Upload stores work days in database
  - [ ] Download retrieves work days for date range
  - [ ] Status returns correct pending count
  - [ ] All endpoints require Bearer token
  - [ ] All endpoints use `/api/v1` prefix

- **Dependencies:** Task 2 (Auth endpoints)
- **Blocked By:** Task 2

---

### Task 7: Implement Audit Logging
- **Status:** ⏳ NOT STARTED
- **Priority:** HIGH (Part of Admin MVP)
- **Estimated Time:** 2-3 hours
- **Description:** Implement audit logging for all admin actions on Express/TypeScript server

- **Requirements:**
  - Log all approve/reject/block/unblock/reset-password/assign-role actions
  - Log all org unit and position create/update actions
  - Log user profile changes (orgUnitId, positionId)
  - Store in audit_logs table with: userId, action, targetUserId, changes, timestamp

- **Acceptance Criteria:**
  - [ ] All admin actions logged to audit_logs
  - [ ] Audit logs include userId, action, targetUserId, changes
  - [ ] Audit logs include timestamp
  - [ ] GET /api/v1/admin/audit-logs returns filtered logs
  - [ ] Logs are immutable (no delete/update)

- **Dependencies:** Task 2 (Auth endpoints), Task 4 (Admin endpoints)
- **Blocked By:** Task 2, Task 4

---

## 🔵 LOW PRIORITY TASKS

### Task 8: Add Rate Limiting
- **Status:** ⏳ NOT STARTED
- **Priority:** LOW
- **Estimated Time:** 1-2 hours
- **Description:** Implement rate limiting for API endpoints
- **Requirements:**
  - Limit login attempts (5 per minute)
  - Limit API calls (100 per minute per user)
  - Return 429 Too Many Requests

- **Dependencies:** Task 2 (Auth endpoints)
- **Blocked By:** None

---

### Task 9: Add Request Validation
- **Status:** ⏳ NOT STARTED
- **Priority:** LOW
- **Estimated Time:** 2-3 hours
- **Description:** Add validation for all endpoints
- **Requirements:**
  - Validate request bodies
  - Validate query parameters
  - Return 400 Bad Request for invalid input

- **Dependencies:** All endpoints
- **Blocked By:** None

---

### Task 10: Add CORS Configuration
- **Status:** ⏳ NOT STARTED
- **Priority:** LOW
- **Estimated Time:** 1 hour
- **Description:** Configure CORS for mobile app
- **Requirements:**
  - Allow requests from mobile app domain
  - Allow credentials
  - Allow necessary headers

- **Dependencies:** None
- **Blocked By:** None

---

### Task 11: Add API Documentation
- **Status:** ⏳ NOT STARTED
- **Priority:** LOW
- **Estimated Time:** 2-3 hours
- **Description:** Create OpenAPI/Swagger documentation
- **Requirements:**
  - Document all endpoints
  - Document request/response schemas
  - Document error codes

- **Dependencies:** All endpoints
- **Blocked By:** None

---

### Task 12: Performance Testing
- **Status:** ⏳ NOT STARTED
- **Priority:** LOW
- **Estimated Time:** 2-3 hours
- **Description:** Test API performance and optimize
- **Requirements:**
  - Load test endpoints
  - Measure response times
  - Identify bottlenecks
  - Optimize queries

- **Dependencies:** All endpoints
- **Blocked By:** None

---

## 📊 Task Dependencies

```
Task 1 (TypeScript) ✅
    ↓
Task 2 (Auth + Registration) ⏳
    ↓
├─→ Task 3 (Auth Flow Test) ⏳
├─→ Task 4 (Admin Endpoints) ⏳
│   ├─→ Task 7 (Audit Logging) ⏳
├─→ Task 5 (Directory Endpoints) ⏳
├─→ Task 6 (Sync Endpoints) ⏳
└─→ Task 8 (Rate Limiting) ⏳

Tasks 9-12 (Low Priority) - No dependencies
```

---

## 🎯 Completion Criteria for MVP

- [x] TypeScript compilation: 0 errors
- [ ] All Critical tasks completed (2, 3)
- [ ] All High Priority tasks completed (4, 5, 6, 7)
- [ ] End-to-end auth flow working (including registration)
- [ ] End-to-end sync flow working
- [ ] Admin can approve/reject/block/unblock users
- [ ] Admin can reset passwords (with tempPassword)
- [ ] Admin can assign roles (user, unit_manager, department_manager, admin)
- [ ] Audit logging works for all admin actions
- [ ] Public directories endpoints work (for registration form)
- [ ] Mobile app can register, login, and sync data
- [ ] No critical bugs in production

---

## 📝 Notes

- **Backend Stack:** All endpoints implemented in Express/TypeScript server in this repository (server/_core/)
- **External API:** External backend (https://worktimeapi.duckdns.org) is out of scope for this repository task
- **Credentials:** Testing credentials provided through secure environment variables (seed script)
- **Authentication:** All endpoints require Bearer token (except login, register, health, public directories)
- **API Contract:** All responses must follow shared/api-types.ts
- **Database:** Changes must be backward compatible
- **TypeScript:** All code must pass compilation
- **Registration:** Part of Task 2 (Critical Auth Endpoints) - does NOT return tokens
- **Seed Script:** scripts/create-first-admin.ts ready for use
- **Audit Logging:** Part of Task 7 (High Priority) - required for MVP
- **Public Directories:** GET endpoints for org-units and positions don't require auth (needed for registration form)
- **Forgot Password:** Moved to Post-MVP (requires email/SMS which not available in MVP)
- **Role Management:** Supports user, unit_manager, department_manager, admin with proper managedOrgUnitId assignment
