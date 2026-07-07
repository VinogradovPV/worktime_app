# MVP Implementation Plan

**Goal:** Deliver a minimum viable product for WorkTime app with authentication, work time tracking, and admin management.

**Timeline:** 4 phases, estimated 2-3 weeks

---

## Phase 1: Fix Critical Issues (3-4 days)

### 1.1 Fix TypeScript Errors ✅ MUST DO

**Task:** Remove broken tRPC sync references from client

**Files to Fix:**
- `lib/sync/syncService.ts` - Replace tRPC calls with REST API calls
- `server/routers.ts` - Remove commented-out sync router

**Acceptance Criteria:**
- ✅ `pnpm run check` passes with 0 errors
- ✅ TypeScript compilation succeeds
- ✅ No console errors in dev server

**Estimated Time:** 2-3 hours

---

### 1.2 Implement Auth REST Endpoints ✅ MUST DO

**Task:** Create `/api/v1/auth/*` endpoints on Express server

**Endpoints to Create:**
1. `POST /api/v1/auth/login`
   - Request: `{ login: string, password: string }`
   - Response: `{ ok: boolean, access_token: string, refresh_token: string, user: UserResponse }`
   - Logic: Validate credentials, generate JWT tokens, return user data

2. `POST /api/v1/auth/refresh`
   - Request: `{ refresh_token: string }`
   - Response: `{ ok: boolean, access_token: string, refresh_token: string }`
   - Logic: Validate refresh token, issue new access token

3. `POST /api/v1/auth/logout`
   - Request: (empty body)
   - Response: `{ ok: boolean }`
   - Logic: Invalidate tokens (optional, client-side sufficient)

4. `GET /api/v1/auth/me`
   - Headers: `Authorization: Bearer <access_token>`
   - Response: `{ ok: boolean, user: UserResponse }`
   - Logic: Return current user from JWT payload

**Files to Create/Update:**
- `server/_core/auth-api.ts` - NEW file with auth endpoint handlers
- `server/_core/index.ts` - Mount auth endpoints

**Acceptance Criteria:**
- ✅ All 4 endpoints respond with correct status codes
- ✅ JWT tokens are properly signed and verified
- ✅ Invalid credentials return 401
- ✅ Expired tokens return 401
- ✅ Valid tokens return user data

**Estimated Time:** 4-5 hours

---

### 1.3 Update Client Auth Flow ✅ MUST DO

**Task:** Update client to use new REST auth endpoints

**Files to Update:**
- `lib/_core/api.ts` - Add auth methods (login, refresh, logout, me)
- `lib/_core/auth.ts` - Update auth state management
- `hooks/use-auth.ts` - Update auth hook to use REST API

**Changes:**
1. Replace tRPC auth calls with REST API calls
2. Implement automatic token refresh before expiration
3. Handle token expiration and re-login flow
4. Store tokens in secure storage (SecureStore)

**Acceptance Criteria:**
- ✅ Client can login with credentials
- ✅ Client can refresh tokens
- ✅ Client can logout
- ✅ Client can get current user info
- ✅ Tokens are stored securely

**Estimated Time:** 3-4 hours

---

## Phase 2: Implement Sync REST Endpoints (3-4 days)

### 2.1 Create Sync Endpoints ✅ MUST DO

**Task:** Create `/api/v1/sync/*` endpoints for work day synchronization

**Endpoints to Create:**
1. `POST /api/v1/sync/upload-workdays`
   - Headers: `Authorization: Bearer <access_token>`
   - Request: `{ workdays: WorkDayRequest[] }`
   - Response: `{ ok: boolean, synced_count: number }`
   - Logic: Validate user, store work days in database

2. `GET /api/v1/sync/download-workdays`
   - Headers: `Authorization: Bearer <access_token>`
   - Query: `?from_date=YYYY-MM-DD&to_date=YYYY-MM-DD`
   - Response: `{ ok: boolean, workdays: WorkDayResponse[] }`
   - Logic: Return user's work days for date range

3. `GET /api/v1/sync/status`
   - Headers: `Authorization: Bearer <access_token>`
   - Response: `{ ok: boolean, last_sync_at: string, pending_count: number }`
   - Logic: Return sync status for client

**Files to Create/Update:**
- `server/_core/sync-api.ts` - NEW file with sync endpoint handlers
- `server/_core/index.ts` - Mount sync endpoints

**Acceptance Criteria:**
- ✅ Client can upload work days
- ✅ Client can download work days
- ✅ Server validates user authorization
- ✅ Data is persisted correctly
- ✅ Date filtering works correctly

**Estimated Time:** 4-5 hours

---

### 2.2 Update Sync Service ✅ MUST DO

**Task:** Rewrite `lib/sync/syncService.ts` to use REST API

**Changes:**
1. Replace tRPC calls with REST API calls
2. Update offline queue to use REST endpoints
3. Implement retry logic for failed uploads
4. Handle network errors gracefully

**Acceptance Criteria:**
- ✅ Sync service uses REST API
- ✅ Offline queue works correctly
- ✅ Retry logic handles failures
- ✅ TypeScript errors are resolved

**Estimated Time:** 3-4 hours

---

## Phase 3: Implement Admin Endpoints (2-3 days)

### 3.1 Create Admin Endpoints ✅ SHOULD DO

**Task:** Create `/api/v1/admin/*` endpoints for user and org management

**Endpoints to Create:**
1. `GET /api/v1/admin/users`
   - Headers: `Authorization: Bearer <admin_token>`
   - Query: `?role=admin&status=active&limit=50&offset=0`
   - Response: `{ ok: boolean, users: UserResponse[], total: number }`
   - Logic: Return list of users (filtered by role, status, etc.)

2. `GET /api/v1/admin/org-units`
   - Headers: `Authorization: Bearer <admin_token>`
   - Response: `{ ok: boolean, org_units: OrgUnitResponse[], total: number }`
   - Logic: Return organizational structure

3. `GET /api/v1/admin/positions`
   - Headers: `Authorization: Bearer <admin_token>`
   - Response: `{ ok: boolean, positions: PositionResponse[], total: number }`
   - Logic: Return list of positions

4. `POST /api/v1/admin/users/{id}/approve`
   - Headers: `Authorization: Bearer <admin_token>`
   - Request: `{ role: string }`
   - Response: `{ ok: boolean, user: UserResponse }`
   - Logic: Approve pending user and assign role

5. `POST /api/v1/admin/users/{id}/reject`
   - Headers: `Authorization: Bearer <admin_token>`
   - Request: `{ reason?: string }`
   - Response: `{ ok: boolean }`
   - Logic: Reject pending user

**Files to Create/Update:**
- `server/_core/admin-api.ts` - NEW file with admin endpoint handlers
- `server/_core/index.ts` - Mount admin endpoints

**Acceptance Criteria:**
- ✅ Admin can list users
- ✅ Admin can approve/reject pending users
- ✅ Admin can view org structure
- ✅ Admin can view positions
- ✅ Role-based access control works

**Estimated Time:** 3-4 hours

---

## Phase 4: Testing & Deployment (2-3 days)

### 4.1 Integration Testing ✅ MUST DO

**Task:** Test end-to-end auth and sync flows

**Test Scenarios:**
1. ✅ User registration → pending → admin approval → login
2. ✅ User login → token generation → token refresh
3. ✅ User logout → token invalidation
4. ✅ Work day upload → sync → download
5. ✅ Offline work → sync when online
6. ✅ Admin user management

**Acceptance Criteria:**
- ✅ All scenarios pass
- ✅ No console errors
- ✅ No TypeScript errors
- ✅ Performance acceptable

**Estimated Time:** 2-3 hours

---

### 4.2 Documentation & Deployment ✅ MUST DO

**Task:** Document API endpoints and deploy MVP

**Deliverables:**
1. API documentation (endpoints, request/response examples)
2. Deployment guide
3. User manual
4. Admin manual

**Files to Create:**
- `API_DOCUMENTATION.md` - REST API reference
- `DEPLOYMENT.md` - Deployment instructions
- `USER_MANUAL.md` - User guide
- `ADMIN_MANUAL.md` - Admin guide

**Acceptance Criteria:**
- ✅ Documentation is complete
- ✅ API is deployed and accessible
- ✅ All endpoints are tested
- ✅ Users can login and track time

**Estimated Time:** 2-3 hours

---

## Dependencies & Blockers

### Critical Path
```
Phase 1.1 (Fix TS Errors)
    ↓
Phase 1.2 (Auth Endpoints)
    ↓
Phase 1.3 (Auth Client)
    ↓
Phase 2.1 (Sync Endpoints)
    ↓
Phase 2.2 (Sync Client)
    ↓
Phase 3 (Admin Endpoints) [Parallel with Phase 2]
    ↓
Phase 4 (Testing & Deployment)
```

### Blockers
- ⚠️ Database connectivity: Must have working PostgreSQL connection
- ⚠️ External API: Must have access to worktimeapi.duckdns.org for reference
- ⚠️ Admin users: Must have seed admin users for testing

---

## Success Criteria for MVP

| Criterion | Status | Priority |
|-----------|--------|----------|
| User can login with credentials | ⏳ Pending | CRITICAL |
| User can track work time | ⏳ Pending | CRITICAL |
| User can sync offline data | ⏳ Pending | CRITICAL |
| Admin can manage users | ⏳ Pending | HIGH |
| Admin can view reports | ⏳ Pending | MEDIUM |
| No TypeScript errors | ❌ 2 errors | CRITICAL |
| All tests pass | ⏳ Pending | HIGH |

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Database connectivity issues | Medium | High | Test DB connection early |
| JWT token expiration edge cases | Medium | Medium | Implement comprehensive token refresh logic |
| Offline sync conflicts | Low | High | Implement conflict resolution strategy |
| Performance degradation with large datasets | Low | Medium | Add pagination and caching |
| Security vulnerabilities in auth | Low | Critical | Security review before deployment |

---

## Post-MVP Features (Not in Scope)

- [ ] Email/SMS notifications
- [ ] Advanced reporting and analytics
- [ ] Mobile app push notifications
- [ ] Audit logging and compliance
- [ ] Multi-language support
- [ ] Advanced role-based access control
- [ ] API rate limiting and throttling
- [ ] Webhook support for integrations

---

## Metrics & KPIs

### Development Metrics
- Lines of code added: ~2000-3000
- Test coverage: >80%
- Code review time: <24 hours
- Deployment time: <30 minutes

### User Metrics
- Time to login: <2 seconds
- Time to sync: <5 seconds
- Uptime: >99.5%
- Error rate: <0.1%

---

## Communication Plan

### Stakeholders
- Product Manager: Weekly sync
- Engineering Lead: Daily standup
- QA Team: Daily testing updates
- Users: Release notes after deployment

### Status Reports
- Daily: Dev team standup
- Weekly: Stakeholder update
- Bi-weekly: Full project review

---

## Appendix: API Response Format

### Success Response
```json
{
  "ok": true,
  "data": { ... }
}
```

### Error Response
```json
{
  "ok": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

### Auth Response
```json
{
  "ok": true,
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "user": {
    "id": 1,
    "login": "p.vinogradov",
    "display_name": "Павел Виноградов",
    "role": "admin",
    "status": "active"
  }
}
```
