# MVP Задачи - WorkTime App

**Last Updated:** July 7, 2026  
**Status:** Active Development  
**Total Tasks:** 15  
**Completed:** 1  
**In Progress:** 0  
**Blocked:** 0  
**Critical Fixes Applied:**
- ✅ Registration: No tokens returned, requires admin approval
- ✅ Reset Password: Returns tempPassword, requires change on first login
- ✅ All endpoints standardized to `/api/v1`
- ✅ JWT: Access 15m, Refresh 7d (HS256)

---

## 🟢 COMPLETED TASKS

### ✅ Task 1: Fix TypeScript Errors
- **Status:** ✅ COMPLETED
- **Priority:** CRITICAL
- **Actual Time:** 3 hours
- **Completion Date:** July 7, 2026
- **Description:** Removed broken tRPC sync references and fixed TypeScript compilation
- **Changes Made:**
  - Deleted scripts/create-first-admin.ts
  - Rewrote lib/sync/syncService.ts for REST API
  - Updated API functions uploadWorkDays and downloadWorkDays
  - Fixed all saveWorkDay calls
- **Result:** `pnpm run check` passes with 0 errors ✅

---

## 🔴 CRITICAL TASKS (Next Priority)

### Task 2: Implement Auth Endpoints
- **Status:** ⏳ NOT STARTED
- **Priority:** CRITICAL (Blocks all other tasks)
- **Estimated Time:** 4-5 hours
- **Description:** Create REST API endpoints for authentication on FastAPI server
- **Endpoints to Create:**
  1. POST /api/v1/auth/login - User login with credentials
  2. POST /api/v1/auth/refresh - Token refresh using refresh_token
  3. POST /api/v1/auth/logout - User logout
  4. GET /api/v1/auth/me - Get current user info
- **Files to Create/Update:**
  - server/_core/auth-api.ts - NEW (create auth endpoints)
  - server/_core/index.ts - Update to mount endpoints
  - server/_core/jwt.ts - Use existing JWT utilities
- **Acceptance Criteria:**
  - [ ] All 4 endpoints respond correctly
  - [ ] JWT tokens are properly signed (HS256)
  - [ ] Invalid credentials return 401
  - [ ] Expired tokens are rejected
  - [ ] Access token: 15-30 minutes, Refresh token: 7 days
  - [ ] Passwords verified with bcrypt
- **Dependencies:** None
- **Blocked By:** None
- **Test Credentials:**
  - login: p.vinogradov, password: VinogradovPavel2024!
  - login: v.kultsev, password: KultsevVladimir2024!

---

### Task 3: Test Auth Flow End-to-End
- **Status:** ⏳ BLOCKED (Waiting for Task 2)
- **Priority:** CRITICAL
- **Estimated Time:** 2-3 hours
- **Description:** Verify authentication works from mobile client to server
- **Test Scenarios:**
  1. Login with valid credentials → receive tokens
  2. Use access token to call GET /api/v1/auth/me
  3. Wait for access token to expire → call refresh
  4. Verify new access token works
  5. Logout → tokens invalidated
- **Files to Test:**
  - lib/_core/api.ts (login, refresh, logout, getMe)
  - hooks/use-auth.ts (useAuth hook)
  - lib/_core/auth.ts (token storage)
- **Acceptance Criteria:**
  - [ ] Login returns valid tokens
  - [ ] Tokens stored in SecureStore
  - [ ] Refresh token works correctly
  - [ ] Logout clears tokens
  - [ ] useAuth hook updates state correctly
- **Dependencies:** Task 2
- **Blocked By:** Task 2

---

## 🟡 HIGH PRIORITY TASKS

### Task 4: Implement Admin Endpoints
- **Status:** ⏳ NOT STARTED
- **Priority:** HIGH
- **Estimated Time:** 3-4 hours
- **Description:** Create admin endpoints for user management
- **Endpoints to Create:**
  1. GET /api/v1/admin/registration-requests - List pending registrations
  2. POST /api/v1/admin/users/{id}/approve - Approve user registration
  3. POST /api/v1/admin/users/{id}/reject - Reject user registration
  4. GET /api/v1/admin/users - List all users
  5. POST /api/v1/admin/users/{id}/reset-password - Reset user password
- **Acceptance Criteria:**
  - [ ] Only admin users can access these endpoints
  - [ ] All endpoints require Bearer token
  - [ ] Responses follow API contract
- **Dependencies:** Task 2 (Auth endpoints)
- **Blocked By:** Task 2

---

### Task 5: Implement Directory Endpoints
- **Status:** ⏳ NOT STARTED
- **Priority:** HIGH
- **Estimated Time:** 2-3 hours
- **Description:** Create endpoints for org units and positions
- **Endpoints to Create:**
  1. GET /api/v1/directories/org-units - List org units
  2. POST /api/v1/directories/org-units - Create org unit (admin only)
  3. GET /api/v1/directories/positions - List positions
  4. POST /api/v1/directories/positions - Create position (admin only)
- **Acceptance Criteria:**
  - [ ] All endpoints return correct data
  - [ ] Create endpoints require admin role
  - [ ] Responses follow API contract
- **Dependencies:** Task 2 (Auth endpoints)
- **Blocked By:** Task 2

---

### Task 6: Implement Sync Endpoints
- **Status:** ⏳ NOT STARTED
- **Priority:** HIGH
- **Estimated Time:** 2-3 hours
- **Description:** Create endpoints for work day synchronization
- **Endpoints to Create:**
  1. POST /api/v1/sync/upload-workdays - Upload work days
  2. GET /api/v1/sync/download-workdays - Download work days
  3. GET /api/v1/sync/status - Get sync status
- **Acceptance Criteria:**
  - [ ] Upload stores work days in database
  - [ ] Download retrieves work days for date range
  - [ ] Status returns correct pending count
- **Dependencies:** Task 2 (Auth endpoints)
- **Blocked By:** Task 2

---

## 🟠 MEDIUM PRIORITY TASKS

### Task 7: Implement User Registration
- **Status:** ⏳ NOT STARTED
- **Priority:** MEDIUM
- **Estimated Time:** 2-3 hours
- **Description:** Create POST /api/v1/auth/register endpoint
- **Requirements:**
  - Create user with status "pending"
  - Validate input (login, password, displayName, orgUnitId, positionId)
  - Send notification to admins
  - Return status "pending" (not tokens)
- **Acceptance Criteria:**
  - [ ] New user created with correct fields
  - [ ] Status is "pending" (not "active")
  - [ ] Role is "user" (not selectable)
  - [ ] No tokens returned
  - [ ] Admin notification sent
- **Dependencies:** Task 2 (Auth endpoints)
- **Blocked By:** Task 2

---

### Task 8: Implement Change Password
- **Status:** ⏳ NOT STARTED
- **Priority:** MEDIUM
- **Estimated Time:** 1-2 hours
- **Description:** Create POST /api/v1/auth/change-password endpoint
- **Requirements:**
  - Verify current password
  - Update password with bcrypt
  - Invalidate all existing tokens
- **Acceptance Criteria:**
  - [ ] Password updated correctly
  - [ ] Old password verified
  - [ ] New password hashed with bcrypt
  - [ ] User logged out after change
- **Dependencies:** Task 2 (Auth endpoints)
- **Blocked By:** Task 2

---

### Task 9: Implement Forgot Password
- **Status:** ⏳ NOT STARTED
- **Priority:** MEDIUM
- **Estimated Time:** 2-3 hours
- **Description:** Create POST /api/v1/auth/forgot-password endpoint
- **Requirements:**
  - Generate reset token
  - Send reset link via email
  - Validate reset token
  - Allow password reset
- **Acceptance Criteria:**
  - [ ] Reset token generated
  - [ ] Email sent with reset link
  - [ ] Token expires after 24 hours
  - [ ] Password reset works with valid token
- **Dependencies:** Task 2 (Auth endpoints)
- **Blocked By:** Task 2

---

## 🔵 LOW PRIORITY TASKS

### Task 10: Add Logging and Monitoring
- **Status:** ⏳ NOT STARTED
- **Priority:** LOW
- **Estimated Time:** 2-3 hours
- **Description:** Add structured logging for debugging and monitoring
- **Requirements:**
  - Log all API requests/responses
  - Log authentication events
  - Log errors with stack traces
- **Dependencies:** All endpoints
- **Blocked By:** None

---

### Task 11: Add Rate Limiting
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

### Task 12: Add Request Validation
- **Status:** ⏳ NOT STARTED
- **Priority:** LOW
- **Estimated Time:** 2-3 hours
- **Description:** Add Pydantic validation for all endpoints
- **Requirements:**
  - Validate request bodies
  - Validate query parameters
  - Return 400 Bad Request for invalid input
- **Dependencies:** All endpoints
- **Blocked By:** None

---

### Task 13: Add CORS Configuration
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

### Task 14: Add API Documentation
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

### Task 15: Performance Testing
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
Task 2 (Auth Endpoints) ⏳
    ↓
├─→ Task 3 (Auth Flow Test) ⏳
├─→ Task 4 (Admin Endpoints) ⏳
├─→ Task 5 (Directory Endpoints) ⏳
├─→ Task 6 (Sync Endpoints) ⏳
├─→ Task 7 (Registration) ⏳
├─→ Task 8 (Change Password) ⏳
└─→ Task 9 (Forgot Password) ⏳

Tasks 10-15 (Low Priority) - No dependencies
```

---

## 🎯 Completion Criteria for MVP

- [x] TypeScript compilation: 0 errors
- [ ] All Critical tasks completed (2, 3)
- [ ] All High Priority tasks completed (4, 5, 6)
- [ ] End-to-end auth flow working
- [ ] End-to-end sync flow working
- [ ] Admin can approve/reject users
- [ ] Mobile app can login and sync data
- [ ] No critical bugs in production

---

## 📝 Notes

- Credentials for testing are in Task 2
- All endpoints must use Bearer token authentication (except login, register, health)
- All responses must follow the API contract defined in shared/api-types.ts
- Database changes must be backward compatible
- All code must pass TypeScript compilation
