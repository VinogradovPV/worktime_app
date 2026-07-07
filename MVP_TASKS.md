# MVP Implementation Tasks - Prioritized

**Last Updated:** July 6, 2026  
**Status:** Planning Phase  
**Total Tasks:** 15  
**Completed:** 0  
**In Progress:** 0  
**Blocked:** 0

---

## 🔴 CRITICAL TASKS (Must Complete First)

### Task 1: Fix TypeScript Errors
- **Status:** ❌ NOT STARTED
- **Priority:** CRITICAL (Blocks all other tasks)
- **Estimated Time:** 2-3 hours
- **Assigned To:** TBD
- **Description:** Remove broken tRPC sync references and fix TypeScript compilation
- **Files Affected:**
  - `lib/sync/syncService.ts` - Replace tRPC calls with REST API
  - `server/routers.ts` - Remove commented-out sync router
- **Acceptance Criteria:**
  - [ ] `pnpm run check` passes with 0 errors
  - [ ] No TypeScript compilation errors
  - [ ] Dev server runs without errors
- **Dependencies:** None
- **Blocked By:** None

---

### Task 2: Implement Auth Endpoints
- **Status:** ❌ NOT STARTED
- **Priority:** CRITICAL (Blocks Task 3)
- **Estimated Time:** 4-5 hours
- **Assigned To:** TBD
- **Description:** Create REST API endpoints for authentication
- **Endpoints to Create:**
  1. `POST /api/v1/auth/login` - User login
  2. `POST /api/v1/auth/refresh` - Token refresh
  3. `POST /api/v1/auth/logout` - User logout
  4. `GET /api/v1/auth/me` - Get current user
- **Files to Create/Update:**
  - `server/_core/auth-api.ts` - NEW
  - `server/_core/index.ts` - Update to mount endpoints
- **Acceptance Criteria:**
  - [ ] All 4 endpoints respond correctly
  - [ ] JWT tokens are properly signed
  - [ ] Invalid credentials return 401
  - [ ] Expired tokens are rejected
- **Dependencies:** Task 1
- **Blocked By:** None

---

### Task 3: Update Client Auth Flow
- **Status:** ❌ NOT STARTED
- **Priority:** CRITICAL (Blocks Task 4)
- **Estimated Time:** 3-4 hours
- **Assigned To:** TBD
- **Description:** Update client to use new REST auth endpoints
- **Files to Update:**
  - `lib/_core/api.ts` - Add auth methods
  - `lib/_core/auth.ts` - Update auth state
  - `hooks/use-auth.ts` - Update auth hook
- **Acceptance Criteria:**
  - [ ] Client can login with credentials
  - [ ] Client can refresh tokens
  - [ ] Client can logout
  - [ ] Tokens are stored securely
- **Dependencies:** Task 2
- **Blocked By:** None

---

## 🟠 HIGH PRIORITY TASKS (Implement After Critical)

### Task 4: Implement Sync Endpoints
- **Status:** ❌ NOT STARTED
- **Priority:** HIGH (Blocks Task 5)
- **Estimated Time:** 4-5 hours
- **Assigned To:** TBD
- **Description:** Create REST API endpoints for work day synchronization
- **Endpoints to Create:**
  1. `POST /api/v1/sync/upload-workdays` - Upload work days
  2. `GET /api/v1/sync/download-workdays` - Download work days
  3. `GET /api/v1/sync/status` - Get sync status
- **Files to Create/Update:**
  - `server/_core/sync-api.ts` - NEW
  - `server/_core/index.ts` - Update to mount endpoints
- **Acceptance Criteria:**
  - [ ] Client can upload work days
  - [ ] Client can download work days
  - [ ] Server validates authorization
  - [ ] Data is persisted correctly
- **Dependencies:** Task 2, Task 3
- **Blocked By:** None

---

### Task 5: Update Sync Service
- **Status:** ❌ NOT STARTED
- **Priority:** HIGH (Blocks Task 6)
- **Estimated Time:** 3-4 hours
- **Assigned To:** TBD
- **Description:** Rewrite sync service to use REST API instead of tRPC
- **Files to Update:**
  - `lib/sync/syncService.ts` - Replace tRPC with REST API
- **Acceptance Criteria:**
  - [ ] Sync service uses REST API
  - [ ] Offline queue works correctly
  - [ ] Retry logic handles failures
  - [ ] No TypeScript errors
- **Dependencies:** Task 4
- **Blocked By:** None

---

### Task 6: Implement Admin Endpoints
- **Status:** ❌ NOT STARTED
- **Priority:** HIGH (Can be parallel with Task 4-5)
- **Estimated Time:** 3-4 hours
- **Assigned To:** TBD
- **Description:** Create REST API endpoints for admin user and org management
- **Endpoints to Create:**
  1. `GET /api/v1/admin/users` - List users
  2. `GET /api/v1/admin/org-units` - List org units
  3. `GET /api/v1/admin/positions` - List positions
  4. `POST /api/v1/admin/users/{id}/approve` - Approve user
  5. `POST /api/v1/admin/users/{id}/reject` - Reject user
- **Files to Create/Update:**
  - `server/_core/admin-api.ts` - NEW
  - `server/_core/index.ts` - Update to mount endpoints
- **Acceptance Criteria:**
  - [ ] Admin can list users
  - [ ] Admin can approve/reject users
  - [ ] Admin can view org structure
  - [ ] Role-based access control works
- **Dependencies:** Task 2
- **Blocked By:** None

---

## 🟡 MEDIUM PRIORITY TASKS (Implement After High)

### Task 7: Add Input Validation
- **Status:** ❌ NOT STARTED
- **Priority:** MEDIUM
- **Estimated Time:** 2-3 hours
- **Assigned To:** TBD
- **Description:** Add request validation to all endpoints
- **Files to Update:**
  - `server/_core/auth-api.ts` - Add validation
  - `server/_core/sync-api.ts` - Add validation
  - `server/_core/admin-api.ts` - Add validation
- **Acceptance Criteria:**
  - [ ] Invalid requests return 400
  - [ ] Error messages are helpful
  - [ ] All fields are validated
- **Dependencies:** Task 2, Task 4, Task 6
- **Blocked By:** None

---

### Task 8: Add Error Handling
- **Status:** ❌ NOT STARTED
- **Priority:** MEDIUM
- **Estimated Time:** 2-3 hours
- **Assigned To:** TBD
- **Description:** Implement comprehensive error handling
- **Files to Update:**
  - `server/_core/auth-api.ts` - Add error handling
  - `server/_core/sync-api.ts` - Add error handling
  - `server/_core/admin-api.ts` - Add error handling
- **Acceptance Criteria:**
  - [ ] All errors return proper status codes
  - [ ] Error messages are consistent
  - [ ] Errors are logged properly
- **Dependencies:** Task 2, Task 4, Task 6
- **Blocked By:** None

---

### Task 9: Add Logging
- **Status:** ❌ NOT STARTED
- **Priority:** MEDIUM
- **Estimated Time:** 1-2 hours
- **Assigned To:** TBD
- **Description:** Add comprehensive logging for debugging
- **Files to Update:**
  - `server/_core/auth-api.ts` - Add logging
  - `server/_core/sync-api.ts` - Add logging
  - `server/_core/admin-api.ts` - Add logging
- **Acceptance Criteria:**
  - [ ] All important events are logged
  - [ ] Logs include timestamps and context
  - [ ] Sensitive data is not logged
- **Dependencies:** Task 2, Task 4, Task 6
- **Blocked By:** None

---

## 🟢 TESTING TASKS

### Task 10: Unit Tests for Auth
- **Status:** ❌ NOT STARTED
- **Priority:** HIGH
- **Estimated Time:** 2-3 hours
- **Assigned To:** TBD
- **Description:** Write unit tests for auth endpoints
- **Files to Create:**
  - `tests/auth-api.test.ts` - NEW
- **Acceptance Criteria:**
  - [ ] All auth endpoints have tests
  - [ ] Test coverage >80%
  - [ ] All tests pass
- **Dependencies:** Task 2
- **Blocked By:** None

---

### Task 11: Unit Tests for Sync
- **Status:** ❌ NOT STARTED
- **Priority:** HIGH
- **Estimated Time:** 2-3 hours
- **Assigned To:** TBD
- **Description:** Write unit tests for sync endpoints
- **Files to Create:**
  - `tests/sync-api.test.ts` - NEW
- **Acceptance Criteria:**
  - [ ] All sync endpoints have tests
  - [ ] Test coverage >80%
  - [ ] All tests pass
- **Dependencies:** Task 4
- **Blocked By:** None

---

### Task 12: Integration Tests
- **Status:** ❌ NOT STARTED
- **Priority:** HIGH
- **Estimated Time:** 3-4 hours
- **Assigned To:** TBD
- **Description:** Write integration tests for full auth and sync flows
- **Files to Create:**
  - `tests/integration.test.ts` - NEW
- **Test Scenarios:**
  - [ ] User registration → approval → login
  - [ ] Token refresh flow
  - [ ] Work day upload → sync → download
  - [ ] Offline sync when online
- **Acceptance Criteria:**
  - [ ] All scenarios pass
  - [ ] No console errors
  - [ ] Performance acceptable
- **Dependencies:** Task 3, Task 5
- **Blocked By:** None

---

## 📚 DOCUMENTATION TASKS

### Task 13: API Documentation
- **Status:** ❌ NOT STARTED
- **Priority:** MEDIUM
- **Estimated Time:** 2-3 hours
- **Assigned To:** TBD
- **Description:** Document all REST API endpoints
- **Files to Create:**
  - `API_DOCUMENTATION.md` - NEW
- **Acceptance Criteria:**
  - [ ] All endpoints documented
  - [ ] Request/response examples provided
  - [ ] Error codes documented
- **Dependencies:** Task 2, Task 4, Task 6
- **Blocked By:** None

---

### Task 14: User Manual
- **Status:** ❌ NOT STARTED
- **Priority:** MEDIUM
- **Estimated Time:** 2-3 hours
- **Assigned To:** TBD
- **Description:** Write user manual for MVP features
- **Files to Create:**
  - `USER_MANUAL.md` - NEW
- **Acceptance Criteria:**
  - [ ] All features documented
  - [ ] Screenshots provided
  - [ ] Troubleshooting section included
- **Dependencies:** All tasks
- **Blocked By:** None

---

### Task 15: Admin Manual
- **Status:** ❌ NOT STARTED
- **Priority:** MEDIUM
- **Estimated Time:** 2-3 hours
- **Assigned To:** TBD
- **Description:** Write admin manual for user management
- **Files to Create:**
  - `ADMIN_MANUAL.md` - NEW
- **Acceptance Criteria:**
  - [ ] User management documented
  - [ ] Org structure management documented
  - [ ] Troubleshooting section included
- **Dependencies:** Task 6
- **Blocked By:** None

---

## Task Dependencies Graph

```
Task 1 (Fix TS Errors)
    ↓
Task 2 (Auth Endpoints)
    ↓
Task 3 (Auth Client)
    ├─→ Task 6 (Admin Endpoints)
    └─→ Task 4 (Sync Endpoints)
            ↓
        Task 5 (Sync Client)
            ↓
        Task 10-12 (Tests)
            ↓
        Task 13-15 (Documentation)
```

---

## Implementation Schedule

### Week 1
- **Day 1-2:** Task 1 (Fix TS Errors)
- **Day 2-3:** Task 2 (Auth Endpoints)
- **Day 3-4:** Task 3 (Auth Client)
- **Day 4-5:** Task 6 (Admin Endpoints)

### Week 2
- **Day 1-2:** Task 4 (Sync Endpoints)
- **Day 2-3:** Task 5 (Sync Client)
- **Day 3-4:** Task 7-9 (Validation, Error Handling, Logging)
- **Day 4-5:** Task 10-12 (Tests)

### Week 3
- **Day 1-2:** Task 13-15 (Documentation)
- **Day 2-3:** Final testing and bug fixes
- **Day 3-4:** Deployment preparation
- **Day 4-5:** MVP Release

---

## Resource Allocation

| Role | Allocation | Tasks |
|------|-----------|-------|
| Backend Developer | 100% | Tasks 1, 2, 4, 6, 7, 8, 9 |
| Frontend Developer | 100% | Tasks 3, 5 |
| QA Engineer | 50% | Tasks 10, 11, 12 |
| Technical Writer | 50% | Tasks 13, 14, 15 |

---

## Risk Mitigation

| Risk | Probability | Mitigation |
|------|-------------|-----------|
| Task 1 takes longer | Medium | Start immediately, have backup developer ready |
| Database issues | Low | Test DB connection before starting Task 2 |
| Token expiration edge cases | Medium | Comprehensive testing in Task 12 |
| Performance issues | Low | Add caching and pagination in Task 7 |

---

## Success Metrics

- ✅ All 15 tasks completed
- ✅ 0 TypeScript errors
- ✅ >80% test coverage
- ✅ All endpoints documented
- ✅ User can login and track time
- ✅ Admin can manage users
- ✅ MVP deployed and accessible
