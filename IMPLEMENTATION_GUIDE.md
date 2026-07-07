# MVP Implementation Guide for Developers

**Purpose:** This guide provides step-by-step instructions for implementing the WorkTime MVP.

**Audience:** Backend and Frontend developers

**Last Updated:** July 6, 2026

---

## Quick Start

1. **Read the audit report:** `AUDIT_REPORT.md`
2. **Review the MVP plan:** `MVP_PLAN.md`
3. **Check the task list:** `MVP_TASKS.md`
4. **Follow this guide:** Step-by-step implementation

---

## Part 1: Fix Critical Issues

### Step 1.1: Fix TypeScript Errors

**Objective:** Remove broken tRPC sync references and make TypeScript compilation pass.

**Files to Fix:**
- `lib/sync/syncService.ts` - Lines 105, 119
- `server/routers.ts` - Lines 22-24

**Instructions:**

1. **Open `lib/sync/syncService.ts`**
   ```bash
   cd /home/ubuntu/worktime_app
   code lib/sync/syncService.ts
   ```

2. **Find the broken tRPC calls (around line 105 and 119)**
   ```typescript
   // BROKEN CODE - DO NOT USE
   const result = await trpc.sync.uploadWorkDays.mutate(workDays);
   const result = await trpc.sync.downloadWorkDays();
   ```

3. **Replace with REST API calls**
   ```typescript
   // FIXED CODE - USE THIS
   const result = await apiCall<{ ok: boolean; synced_count: number }>(
     '/api/v1/sync/upload-workdays',
     {
       method: 'POST',
       body: JSON.stringify({ workdays: workDays }),
     }
   );
   ```

4. **Update `server/routers.ts`**
   - Remove or comment out the sync router (lines 22-24)
   - The sync endpoints will be implemented as REST endpoints instead

5. **Verify TypeScript compilation**
   ```bash
   pnpm run check
   ```
   Expected output: `0 errors`

**Acceptance Criteria:**
- [ ] `pnpm run check` passes with 0 errors
- [ ] Dev server runs without TypeScript errors
- [ ] No console warnings about missing sync router

---

### Step 1.2: Implement Auth REST Endpoints

**Objective:** Create `/api/v1/auth/*` endpoints for user authentication.

**Files to Create/Update:**
- `server/_core/auth-api.ts` (NEW)
- `server/_core/index.ts` (UPDATE)

**Instructions:**

1. **Create `server/_core/auth-api.ts`**
   ```bash
   touch server/_core/auth-api.ts
   ```

2. **Implement the auth endpoints**
   ```typescript
   import express from 'express';
   import * as jwt from './jwt';
   import * as Auth from './auth';
   
   export function registerAuthRoutes(app: express.Express) {
     // POST /api/v1/auth/login
     app.post('/api/v1/auth/login', async (req, res) => {
       try {
         const { login, password } = req.body;
         
         // TODO: Validate credentials against database
         // TODO: Generate JWT tokens
         // TODO: Return user data
         
         res.json({
           ok: true,
           access_token: 'eyJ0eXAiOiJKV1QiLCJhbGc...',
           refresh_token: 'eyJ0eXAiOiJKV1QiLCJhbGc...',
           user: { id: 1, login, display_name: 'User', role: 'employee', status: 'active' }
         });
       } catch (error) {
         res.status(500).json({ ok: false, error: 'Internal server error' });
       }
     });
     
     // POST /api/v1/auth/refresh
     app.post('/api/v1/auth/refresh', async (req, res) => {
       try {
         const { refresh_token } = req.body;
         
         // TODO: Validate refresh token
         // TODO: Generate new access token
         
         res.json({
           ok: true,
           access_token: 'eyJ0eXAiOiJKV1QiLCJhbGc...',
           refresh_token: 'eyJ0eXAiOiJKV1QiLCJhbGc...'
         });
       } catch (error) {
         res.status(500).json({ ok: false, error: 'Internal server error' });
       }
     });
     
     // POST /api/v1/auth/logout
     app.post('/api/v1/auth/logout', async (req, res) => {
       try {
         // TODO: Invalidate token (optional, client-side sufficient)
         res.json({ ok: true });
       } catch (error) {
         res.status(500).json({ ok: false, error: 'Internal server error' });
       }
     });
     
     // GET /api/v1/auth/me
     app.get('/api/v1/auth/me', async (req, res) => {
       try {
         const token = req.headers.authorization?.replace('Bearer ', '');
         if (!token) {
           return res.status(401).json({ ok: false, error: 'Unauthorized' });
         }
         
         // TODO: Verify token and extract user data
         const user = { id: 1, login: 'user', display_name: 'User', role: 'employee', status: 'active' };
         
         res.json({ ok: true, user });
       } catch (error) {
         res.status(401).json({ ok: false, error: 'Unauthorized' });
       }
     });
   }
   ```

3. **Update `server/_core/index.ts`**
   ```typescript
   import { registerAuthRoutes } from './auth-api';
   
   // In the app setup:
   registerAuthRoutes(app);
   ```

4. **Test the endpoints**
   ```bash
   curl -X POST http://localhost:3000/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"login": "p.vinogradov", "password": "password"}'
   ```

**Acceptance Criteria:**
- [ ] All 4 endpoints respond with correct status codes
- [ ] JWT tokens are properly signed
- [ ] Invalid credentials return 401
- [ ] Expired tokens return 401

---

### Step 1.3: Update Client Auth Flow

**Objective:** Update the client to use new REST auth endpoints.

**Files to Update:**
- `lib/_core/api.ts`
- `lib/_core/auth.ts`
- `hooks/use-auth.ts`

**Instructions:**

1. **Update `lib/_core/api.ts`**
   Add auth methods:
   ```typescript
   export async function login(login: string, password: string) {
     return apiCall<AuthLoginResponse>('/api/v1/auth/login', {
       method: 'POST',
       body: JSON.stringify({ login, password }),
     });
   }
   
   export async function refresh(refreshToken: string) {
     return apiCall<AuthRefreshResponse>('/api/v1/auth/refresh', {
       method: 'POST',
       body: JSON.stringify({ refresh_token: refreshToken }),
     });
   }
   
   export async function logout() {
     return apiCall<AuthLogoutResponse>('/api/v1/auth/logout', {
       method: 'POST',
     });
   }
   
   export async function getMe() {
     return apiCall<AuthMeResponse>('/api/v1/auth/me', {
       method: 'GET',
     });
   }
   ```

2. **Update `lib/_core/auth.ts`**
   Implement token refresh logic:
   ```typescript
   export async function refreshAccessToken() {
     const refreshToken = await getRefreshToken();
     if (!refreshToken) return false;
     
     try {
       const response = await refresh(refreshToken);
       if (response.ok) {
         await saveAccessToken(response.access_token);
         await saveRefreshToken(response.refresh_token);
         return true;
       }
     } catch (error) {
       console.error('Token refresh failed:', error);
     }
     return false;
   }
   ```

3. **Update `hooks/use-auth.ts`**
   Use new API methods:
   ```typescript
   export function useAuth() {
     const [user, setUser] = useState<User | null>(null);
     const [loading, setLoading] = useState(true);
     
     useEffect(() => {
       getMe().then(response => {
         if (response.ok) {
           setUser(response.user);
         }
       }).finally(() => setLoading(false));
     }, []);
     
     return { user, loading };
   }
   ```

**Acceptance Criteria:**
- [ ] Client can login with credentials
- [ ] Client can refresh tokens
- [ ] Client can logout
- [ ] Tokens are stored securely

---

## Part 2: Implement Sync REST Endpoints

### Step 2.1: Create Sync Endpoints

**Objective:** Create `/api/v1/sync/*` endpoints for work day synchronization.

**Files to Create/Update:**
- `server/_core/sync-api.ts` (NEW)
- `server/_core/index.ts` (UPDATE)

**Instructions:**

1. **Create `server/_core/sync-api.ts`**
   ```typescript
   import express from 'express';
   
   export function registerSyncRoutes(app: express.Express) {
     // POST /api/v1/sync/upload-workdays
     app.post('/api/v1/sync/upload-workdays', async (req, res) => {
       try {
         const { workdays } = req.body;
         
         // TODO: Validate user authorization
         // TODO: Store work days in database
         // TODO: Return sync count
         
         res.json({ ok: true, synced_count: workdays.length });
       } catch (error) {
         res.status(500).json({ ok: false, error: 'Internal server error' });
       }
     });
     
     // GET /api/v1/sync/download-workdays
     app.get('/api/v1/sync/download-workdays', async (req, res) => {
       try {
         const { from_date, to_date } = req.query;
         
         // TODO: Validate user authorization
         // TODO: Fetch work days from database
         // TODO: Filter by date range
         
         res.json({ ok: true, workdays: [] });
       } catch (error) {
         res.status(500).json({ ok: false, error: 'Internal server error' });
       }
     });
     
     // GET /api/v1/sync/status
     app.get('/api/v1/sync/status', async (req, res) => {
       try {
         // TODO: Get sync status for user
         res.json({ ok: true, last_sync_at: new Date().toISOString(), pending_count: 0 });
       } catch (error) {
         res.status(500).json({ ok: false, error: 'Internal server error' });
       }
     });
   }
   ```

2. **Update `server/_core/index.ts`**
   ```typescript
   import { registerSyncRoutes } from './sync-api';
   
   // In the app setup:
   registerSyncRoutes(app);
   ```

**Acceptance Criteria:**
- [ ] All 3 endpoints respond correctly
- [ ] Authorization is validated
- [ ] Data is persisted correctly

---

### Step 2.2: Update Sync Service

**Objective:** Rewrite `lib/sync/syncService.ts` to use REST API.

**Instructions:**

1. **Update `lib/sync/syncService.ts`**
   Replace tRPC calls with REST API calls:
   ```typescript
   import * as api from '@/lib/_core/api';
   
   export async function syncWorkDays(workDays: WorkDay[]) {
     try {
       const response = await api.apiCall<{ ok: boolean; synced_count: number }>(
         '/api/v1/sync/upload-workdays',
         {
           method: 'POST',
           body: JSON.stringify({ workdays: workDays }),
         }
       );
       
       if (response.ok) {
         return { success: true, syncedCount: response.synced_count };
       } else {
         return { success: false, error: response.error };
       }
     } catch (error) {
       return { success: false, error: String(error) };
     }
   }
   
   export async function downloadWorkDays(fromDate: string, toDate: string) {
     try {
       const response = await api.apiCall<{ ok: boolean; workdays: WorkDay[] }>(
         `/api/v1/sync/download-workdays?from_date=${fromDate}&to_date=${toDate}`,
         { method: 'GET' }
       );
       
       if (response.ok) {
         return { success: true, workdays: response.workdays };
       } else {
         return { success: false, error: response.error };
       }
     } catch (error) {
       return { success: false, error: String(error) };
     }
   }
   ```

**Acceptance Criteria:**
- [ ] Sync service uses REST API
- [ ] No TypeScript errors
- [ ] Offline queue works correctly

---

## Part 3: Implement Admin Endpoints

### Step 3.1: Create Admin Endpoints

**Objective:** Create `/api/v1/admin/*` endpoints for user and org management.

**Files to Create/Update:**
- `server/_core/admin-api.ts` (NEW)
- `server/_core/index.ts` (UPDATE)

**Instructions:**

1. **Create `server/_core/admin-api.ts`**
   ```typescript
   import express from 'express';
   
   export function registerAdminRoutes(app: express.Express) {
     // GET /api/v1/admin/users
     app.get('/api/v1/admin/users', async (req, res) => {
       try {
         // TODO: Validate admin authorization
         // TODO: Fetch users from database
         // TODO: Apply filters (role, status, etc.)
         
         res.json({ ok: true, users: [], total: 0 });
       } catch (error) {
         res.status(500).json({ ok: false, error: 'Internal server error' });
       }
     });
     
     // GET /api/v1/admin/org-units
     app.get('/api/v1/admin/org-units', async (req, res) => {
       try {
         // TODO: Validate admin authorization
         // TODO: Fetch org units from database
         
         res.json({ ok: true, org_units: [], total: 0 });
       } catch (error) {
         res.status(500).json({ ok: false, error: 'Internal server error' });
       }
     });
     
     // GET /api/v1/admin/positions
     app.get('/api/v1/admin/positions', async (req, res) => {
       try {
         // TODO: Validate admin authorization
         // TODO: Fetch positions from database
         
         res.json({ ok: true, positions: [], total: 0 });
       } catch (error) {
         res.status(500).json({ ok: false, error: 'Internal server error' });
       }
     });
     
     // POST /api/v1/admin/users/:id/approve
     app.post('/api/v1/admin/users/:id/approve', async (req, res) => {
       try {
         const { id } = req.params;
         const { role } = req.body;
         
         // TODO: Validate admin authorization
         // TODO: Update user status to active
         // TODO: Assign role
         
         res.json({ ok: true, user: {} });
       } catch (error) {
         res.status(500).json({ ok: false, error: 'Internal server error' });
       }
     });
     
     // POST /api/v1/admin/users/:id/reject
     app.post('/api/v1/admin/users/:id/reject', async (req, res) => {
       try {
         const { id } = req.params;
         
         // TODO: Validate admin authorization
         // TODO: Update user status to rejected
         
         res.json({ ok: true });
       } catch (error) {
         res.status(500).json({ ok: false, error: 'Internal server error' });
       }
     });
   }
   ```

2. **Update `server/_core/index.ts`**
   ```typescript
   import { registerAdminRoutes } from './admin-api';
   
   // In the app setup:
   registerAdminRoutes(app);
   ```

**Acceptance Criteria:**
- [ ] All admin endpoints respond correctly
- [ ] Authorization is validated
- [ ] Role-based access control works

---

## Part 4: Testing

### Step 4.1: Unit Tests

**Objective:** Write unit tests for all endpoints.

**Files to Create:**
- `tests/auth-api.test.ts`
- `tests/sync-api.test.ts`
- `tests/admin-api.test.ts`

**Instructions:**

1. **Create `tests/auth-api.test.ts`**
   ```typescript
   import { describe, it, expect } from 'vitest';
   import { login, refresh, logout, getMe } from '@/lib/_core/api';
   
   describe('Auth API', () => {
     it('should login with valid credentials', async () => {
       const result = await login('p.vinogradov', 'password');
       expect(result.ok).toBe(true);
       expect(result.access_token).toBeDefined();
     });
     
     it('should fail with invalid credentials', async () => {
       const result = await login('invalid', 'invalid');
       expect(result.ok).toBe(false);
     });
   });
   ```

2. **Run tests**
   ```bash
   pnpm test
   ```

**Acceptance Criteria:**
- [ ] All tests pass
- [ ] Test coverage >80%
- [ ] No console errors

---

## Part 5: Deployment

### Step 5.1: Prepare for Deployment

**Instructions:**

1. **Verify all endpoints work**
   ```bash
   pnpm run check
   ```

2. **Run all tests**
   ```bash
   pnpm test
   ```

3. **Build the project**
   ```bash
   pnpm run build
   ```

4. **Create a checkpoint**
   ```bash
   webdev_save_checkpoint
   ```

5. **Push to GitHub**
   ```bash
   git add -A
   git commit -m "MVP: Implement auth, sync, and admin endpoints"
   git push origin main
   ```

**Acceptance Criteria:**
- [ ] All tests pass
- [ ] No TypeScript errors
- [ ] Build succeeds
- [ ] Checkpoint created
- [ ] Code pushed to GitHub

---

## Troubleshooting

### Issue: TypeScript errors in syncService.ts

**Solution:**
1. Check that all tRPC references are removed
2. Verify REST API calls are properly formatted
3. Run `pnpm run check` to see specific errors

### Issue: Auth endpoints return 500 errors

**Solution:**
1. Check server logs for error messages
2. Verify database connection
3. Check JWT token generation

### Issue: Sync endpoints don't persist data

**Solution:**
1. Check database connection
2. Verify user authorization
3. Check database schema

---

## Next Steps

After completing the MVP implementation:

1. **Gather user feedback** on MVP features
2. **Fix bugs** identified during testing
3. **Plan Phase 2** features (advanced reporting, notifications, etc.)
4. **Deploy to production** when ready

---

## Resources

- `AUDIT_REPORT.md` - Current project status
- `MVP_PLAN.md` - High-level implementation plan
- `MVP_TASKS.md` - Detailed task list
- `shared/api-types.ts` - API type definitions
- `todo_auth.md` - Auth requirements

---

## Questions?

Contact the project lead for clarification on any step.
