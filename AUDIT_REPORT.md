# Audit Report: WorkTime App MVP Recovery

**Date:** July 6, 2026  
**Status:** ✅ Sandbox Stable | ⚠️ Architecture Transitional | ❌ Auth Endpoints Missing

---

## 1. Sandbox Status

| Metric | Value | Status |
|--------|-------|--------|
| Disk Space | 29GB free (71% used) | ✅ OK |
| Inode Usage | 37% used | ✅ OK |
| Memory | 1.6GB free (45% used) | ✅ OK |
| Swap | 1.5GB free | ✅ OK |
| Project Size | 629MB | ✅ OK |

**Conclusion:** Sandbox is stable and ready for development.

---

## 2. Repository Status

| Check | Result | Status |
|-------|--------|--------|
| Package Manager | pnpm@9.12.0 | ✅ Correct |
| Lock File | pnpm-lock.yaml (454KB) | ✅ Present |
| npm Artifacts | None found | ✅ Clean |
| Git Status | No uncommitted changes | ✅ Clean |
| Last Commit | 74f2e05 (Fix sandbox recovery to use pnpm) | ✅ Recent |

**Conclusion:** Repository is clean and properly configured for pnpm.

---

## 3. Project Structure

### 3.1 Server Files ✅
```
server/_core/
├── index.ts              (Express app bootstrap)
├── oauth.ts              (OAuth routes - LIMITED)
├── trpc.ts               (tRPC setup)
├── auth.ts               (Session management)
├── api.ts                (API client)
├── context.ts            (Request context)
├── env.ts                (Environment variables)
└── ... (other utilities)
```

### 3.2 Client Files ✅
```
lib/_core/
├── api.ts                (REST API client - READY)
├── api-client.ts         (External API client - READY)
├── auth.ts               (Auth state management - READY)
└── jwt.ts                (JWT utilities - READY)

shared/
├── api-types.ts          (API types - COMPLETE)
└── types.ts              (Domain types - UPDATED)
```

### 3.3 Sync Service ❌
```
lib/sync/
└── syncService.ts        (BROKEN - uses removed tRPC router)
```

---

## 4. Critical Issues Found

### Issue 1: Missing Auth REST Endpoints ❌ CRITICAL

**Location:** `server/_core/oauth.ts`  
**Problem:** Only OAuth routes exist, no `/api/v1/auth/*` endpoints

**Current Routes:**
- ✅ POST /api/oauth/callback
- ✅ POST /api/oauth/mobile
- ✅ POST /api/auth/logout
- ✅ GET /api/auth/me
- ✅ GET /api/auth/session

**Missing Routes:**
- ❌ POST /api/v1/auth/login
- ❌ POST /api/v1/auth/refresh
- ❌ POST /api/v1/auth/register
- ❌ GET /api/v1/admin/users
- ❌ GET /api/v1/admin/org-units
- ❌ GET /api/v1/admin/positions

**Impact:** Client cannot authenticate users locally. Must use external API (worktimeapi.duckdns.org).

---

### Issue 2: Broken tRPC Sync Router ❌ CRITICAL

**Location:** `server/routers.ts` (line 22-24)  
**Problem:** `sync` router is commented out, but `lib/sync/syncService.ts` still calls it

**Error Messages:**
```
lib/sync/syncService.ts(105,40): error TS2339: Property 'sync' does not exist
lib/sync/syncService.ts(119,42): error TS2339: Property 'sync' does not exist
```

**Affected Code:**
```typescript
// syncService.ts line 105
const result = await trpc.sync.uploadWorkDays.mutate(workDays);  // ❌ BROKEN

// syncService.ts line 119
const result = await trpc.sync.downloadWorkDays();  // ❌ BROKEN
```

**Impact:** Sync functionality is completely broken. Client cannot upload/download work days.

---

### Issue 3: Architectural Drift ⚠️ MEDIUM

**Problem:** Project is in transitional state between two architectures:

1. **Old Architecture (tRPC):**
   - Client: `lib/trpc.ts` → `AppRouter`
   - Server: `server/routers.ts` with tRPC procedures
   - Status: ❌ Partially removed

2. **New Architecture (REST API):**
   - Client: `lib/_core/api.ts` → External API (worktimeapi.duckdns.org)
   - Server: Should have REST endpoints
   - Status: ⚠️ Incomplete

**Impact:** Neither architecture is complete. Client can't use local server for auth/sync.

---

## 5. What's Working ✅

| Component | Status | Details |
|-----------|--------|---------|
| API Types | ✅ Complete | shared/api-types.ts has all Auth/Admin/Org types |
| API Client | ✅ Ready | lib/_core/api.ts can call external API |
| Auth State | ✅ Ready | lib/_core/auth.ts manages tokens |
| JWT Utils | ✅ Ready | server/_core/jwt.ts can sign/verify tokens |
| UI Components | ✅ Ready | All screens and navigation work |
| Local Storage | ✅ Ready | AsyncStorage for offline data |

---

## 6. What's Broken ❌

| Component | Status | Details |
|----------|--------|---------|
| Auth Endpoints | ❌ Missing | No /api/v1/auth/* routes |
| Sync Endpoints | ❌ Missing | No /api/v1/sync/* routes |
| Admin Endpoints | ❌ Missing | No /api/v1/admin/* routes |
| Sync Service | ❌ Broken | Calls removed tRPC router |
| TypeScript Check | ❌ 2 Errors | syncService.ts references missing router |

---

## 7. Recommendations

### Immediate Actions (MVP Phase 1)

1. **Fix TypeScript Errors** (Priority: CRITICAL)
   - Remove or rewrite `lib/sync/syncService.ts` to use REST API
   - Update client to call `/api/v1/sync/*` instead of tRPC

2. **Implement Auth REST Endpoints** (Priority: CRITICAL)
   - Create `/api/v1/auth/login` endpoint
   - Create `/api/v1/auth/refresh` endpoint
   - Create `/api/v1/auth/logout` endpoint
   - Create `/api/v1/auth/me` endpoint

3. **Implement Sync REST Endpoints** (Priority: HIGH)
   - Create `/api/v1/sync/upload-workdays` endpoint
   - Create `/api/v1/sync/download-workdays` endpoint

4. **Implement Admin REST Endpoints** (Priority: MEDIUM)
   - Create `/api/v1/admin/users` endpoint
   - Create `/api/v1/admin/org-units` endpoint
   - Create `/api/v1/admin/positions` endpoint

### Post-MVP Actions

5. **Remove Old tRPC Code** (Priority: LOW)
   - Delete commented-out sync router
   - Clean up unused tRPC procedures
   - Update documentation

6. **Add Comprehensive Tests** (Priority: LOW)
   - Unit tests for auth endpoints
   - Integration tests for sync flow
   - E2E tests for full auth/sync cycle

---

## 8. Architecture Decision

**Decision:** Use REST API architecture (not tRPC)

**Rationale:**
- Simpler to maintain and debug
- Better compatibility with external API (worktimeapi.duckdns.org)
- Easier to document and test
- Aligns with todo_auth.md requirements

**Implementation:**
- All client-server communication via REST endpoints
- JWT tokens for authentication
- Request/response types in shared/api-types.ts
- Error handling with standardized error responses

---

## 9. Next Steps

1. ✅ **Phase 1 (Audit):** COMPLETE
2. ⏳ **Phase 2 (Analysis):** Analyze current code and plan implementation
3. ⏳ **Phase 3 (MVP Plan):** Create detailed MVP implementation plan
4. ⏳ **Phase 4 (Documentation):** Create implementation guide for developers

---

## Appendix: File Inventory

### Critical Files to Fix
- `lib/sync/syncService.ts` - Broken sync logic
- `server/routers.ts` - Commented-out sync router
- `server/_core/oauth.ts` - Limited auth routes

### Files Ready to Use
- `lib/_core/api.ts` - REST API client
- `shared/api-types.ts` - API types
- `lib/_core/auth.ts` - Auth state management
- `server/_core/jwt.ts` - JWT utilities

### Documentation Files
- `todo.md` - Project tasks
- `todo_auth.md` - Auth requirements
- `design.md` - UI design
- `server/README.md` - Server documentation
