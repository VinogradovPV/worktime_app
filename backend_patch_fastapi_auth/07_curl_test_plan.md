# API Testing Plan - Auth MVP

**Date:** July 9, 2026  
**Target:** https://worktimeapi.duckdns.org  
**Scope:** Auth, Admin, Directories endpoints

---

## 🧪 Test Environment Setup

```bash
# Set base URL
API_URL="https://worktimeapi.duckdns.org"

# Create test variables
ADMIN_LOGIN="admin"
ADMIN_PASSWORD="AdminPassword123!"
TEST_LOGIN="testuser_$(date +%s)"
TEST_PASSWORD="TestPassword123!"
TEST_DISPLAY_NAME="Test User $(date +%s)"
```

---

## 📋 Test Scenarios

### 1. Public Directories (No Auth Required)

#### 1.1 Get Organization Units

```bash
curl -X GET "$API_URL/api/v1/directories/org-units" \
  -H "Content-Type: application/json"

# Expected response:
# {
#   "ok": true,
#   "data": [
#     {"id": 1, "name": "...", "is_active": true},
#     ...
#   ]
# }
```

#### 1.2 Get Positions

```bash
curl -X GET "$API_URL/api/v1/directories/positions" \
  -H "Content-Type: application/json"

# Expected response:
# {
#   "ok": true,
#   "data": [
#     {"id": 1, "name": "...", "is_active": true},
#     ...
#   ]
# }
```

---

### 2. User Registration

#### 2.1 Register New User

```bash
curl -X POST "$API_URL/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "login": "'$TEST_LOGIN'",
    "password": "'$TEST_PASSWORD'",
    "passwordConfirm": "'$TEST_PASSWORD'",
    "displayName": "'$TEST_DISPLAY_NAME'",
    "orgUnitId": 1,
    "positionId": 1,
    "comment": "Test registration"
  }'

# Expected response:
# {
#   "ok": true,
#   "status": "pending",
#   "message": "Registration request submitted. Awaiting admin approval."
# }

# Save response for later tests
REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/api/v1/auth/register" ...)
```

#### 2.2 Register with Invalid Password

```bash
curl -X POST "$API_URL/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "login": "'$TEST_LOGIN'_invalid",
    "password": "weak",
    "passwordConfirm": "weak",
    "displayName": "Test",
    "orgUnitId": 1,
    "positionId": 1
  }'

# Expected response:
# {
#   "ok": false,
#   "error": "Password must be at least 8 characters"
# }
```

#### 2.3 Register with Mismatched Passwords

```bash
curl -X POST "$API_URL/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "login": "'$TEST_LOGIN'_mismatch",
    "password": "'$TEST_PASSWORD'",
    "passwordConfirm": "DifferentPassword123!",
    "displayName": "Test",
    "orgUnitId": 1,
    "positionId": 1
  }'

# Expected response:
# {
#   "ok": false,
#   "error": "Passwords do not match"
# }
```

#### 2.4 Register with Duplicate Login

```bash
# First registration
curl -X POST "$API_URL/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "login": "duplicate_user",
    "password": "'$TEST_PASSWORD'",
    "passwordConfirm": "'$TEST_PASSWORD'",
    "displayName": "First",
    "orgUnitId": 1,
    "positionId": 1
  }'

# Second registration with same login
curl -X POST "$API_URL/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "login": "duplicate_user",
    "password": "'$TEST_PASSWORD'",
    "passwordConfirm": "'$TEST_PASSWORD'",
    "displayName": "Second",
    "orgUnitId": 1,
    "positionId": 1
  }'

# Expected response:
# {
#   "ok": false,
#   "error": "Login already exists"
# }
```

---

### 3. Admin Seed (Bootstrap First Admin)

#### 3.1 Create First Admin

```bash
# Only works if ENABLE_ADMIN_SEED_ENDPOINT=true
curl -X POST "$API_URL/api/v1/internal/seed-admins" \
  -H "Content-Type: application/json" \
  -H "X-Admin-Token: $ADMIN_SEED_TOKEN" \
  -d '{
    "login": "'$ADMIN_LOGIN'",
    "password": "'$ADMIN_PASSWORD'",
    "displayName": "System Administrator"
  }'

# Expected response:
# {
#   "ok": true,
#   "user_id": 1,
#   "message": "Admin user created successfully"
# }

# Save admin credentials for later tests
echo "ADMIN_LOGIN=$ADMIN_LOGIN"
echo "ADMIN_PASSWORD=$ADMIN_PASSWORD"
```

#### 3.2 Seed Endpoint with Wrong Token

```bash
curl -X POST "$API_URL/api/v1/internal/seed-admins" \
  -H "Content-Type: application/json" \
  -H "X-Admin-Token: wrong_token" \
  -d '{
    "login": "another_admin",
    "password": "'$TEST_PASSWORD'",
    "displayName": "Another Admin"
  }'

# Expected response:
# {
#   "ok": false,
#   "error": "Invalid admin token"
# }
```

#### 3.3 Seed Endpoint When Disabled

```bash
# After first admin created, set ENABLE_ADMIN_SEED_ENDPOINT=false
# Then try to create another admin

curl -X POST "$API_URL/api/v1/internal/seed-admins" \
  -H "Content-Type: application/json" \
  -H "X-Admin-Token: $ADMIN_SEED_TOKEN" \
  -d '{
    "login": "another_admin",
    "password": "'$TEST_PASSWORD'",
    "displayName": "Another Admin"
  }'

# Expected response:
# {
#   "ok": false,
#   "error": "Admin seed endpoint is disabled"
# }
```

---

### 4. Admin Approval/Rejection

#### 4.1 Get Pending Registration Requests (Admin Only)

```bash
# First, login as admin to get token
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "login": "'$ADMIN_LOGIN'",
    "password": "'$ADMIN_PASSWORD'"
  }')

ADMIN_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.access_token')

# Get pending requests
curl -X GET "$API_URL/api/v1/admin/registration-requests" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Expected response:
# {
#   "ok": true,
#   "data": [
#     {
#       "id": 1,
#       "login": "testuser_...",
#       "displayName": "Test User",
#       "status": "pending",
#       "created_at": "2026-07-09T..."
#     }
#   ]
# }
```

#### 4.2 Approve User Registration

```bash
USER_ID=1  # From pending requests

curl -X POST "$API_URL/api/v1/admin/users/$USER_ID/approve" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"comment": "Approved"}'

# Expected response:
# {
#   "ok": true,
#   "message": "User approved successfully"
# }
```

#### 4.3 Reject User Registration

```bash
USER_ID=2  # Different user

curl -X POST "$API_URL/api/v1/admin/users/$USER_ID/reject" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"comment": "Does not meet requirements"}'

# Expected response:
# {
#   "ok": true,
#   "message": "User rejected successfully"
# }
```

---

### 5. User Login

#### 5.1 Login with Valid Credentials

```bash
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "login": "'$TEST_LOGIN'",
    "password": "'$TEST_PASSWORD'"
  }')

echo $LOGIN_RESPONSE | jq .

# Expected response (after approval):
# {
#   "ok": true,
#   "access_token": "eyJ...",
#   "refresh_token": "eyJ...",
#   "user": {
#     "id": 1,
#     "login": "testuser_...",
#     "displayName": "Test User",
#     "role": "user",
#     "status": "active"
#   }
# }

# Save tokens for later tests
ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.access_token')
REFRESH_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.refresh_token')
```

#### 5.2 Login with Invalid Credentials

```bash
curl -X POST "$API_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "login": "'$TEST_LOGIN'",
    "password": "WrongPassword123!"
  }'

# Expected response:
# {
#   "ok": false,
#   "error": "Invalid credentials"
# }
```

#### 5.3 Login with Pending Status

```bash
# Try to login as user with pending status (before approval)
curl -X POST "$API_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "login": "pending_user",
    "password": "'$TEST_PASSWORD'"
  }'

# Expected response:
# {
#   "ok": false,
#   "error": "User account is pending approval"
# }
```

#### 5.4 Login with Blocked Status

```bash
# Try to login as blocked user
curl -X POST "$API_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "login": "blocked_user",
    "password": "'$TEST_PASSWORD'"
  }'

# Expected response:
# {
#   "ok": false,
#   "error": "User account is blocked"
# }
```

#### 5.5 Login with password_reset_required Status

```bash
# Try to login as user with password_reset_required status
curl -X POST "$API_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "login": "reset_required_user",
    "password": "'$TEST_PASSWORD'"
  }'

# Expected response:
# {
#   "ok": true,
#   "requiresPasswordChange": true,
#   "access_token": "eyJ...",
#   "user": {
#     "id": 1,
#     "login": "reset_required_user",
#     "status": "password_reset_required"
#   }
# }
# NOTE: No refresh_token in this case
```

---

### 6. Get Current User Info

#### 6.1 Get Me (Authenticated)

```bash
curl -X GET "$API_URL/api/v1/auth/me" \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# Expected response:
# {
#   "ok": true,
#   "user": {
#     "id": 1,
#     "login": "testuser_...",
#     "displayName": "Test User",
#     "role": "user",
#     "status": "active",
#     "orgUnitId": 1,
#     "positionId": 1
#   }
# }
```

#### 6.2 Get Me Without Token

```bash
curl -X GET "$API_URL/api/v1/auth/me"

# Expected response:
# {
#   "ok": false,
#   "error": "Missing authorization header"
# }
```

#### 6.3 Get Me with Invalid Token

```bash
curl -X GET "$API_URL/api/v1/auth/me" \
  -H "Authorization: Bearer invalid_token"

# Expected response:
# {
#   "ok": false,
#   "error": "Invalid token"
# }
```

---

### 7. Change Password

#### 7.1 Change Password (Normal User)

```bash
curl -X POST "$API_URL/api/v1/auth/change-password" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "current_password": "'$TEST_PASSWORD'",
    "new_password": "NewPassword123!"
  }'

# Expected response:
# {
#   "ok": true,
#   "message": "Password changed successfully"
# }

# Update password variable for future tests
TEST_PASSWORD="NewPassword123!"
```

#### 7.2 Change Password with Wrong Current Password

```bash
curl -X POST "$API_URL/api/v1/auth/change-password" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "current_password": "WrongPassword123!",
    "new_password": "AnotherPassword123!"
  }'

# Expected response:
# {
#   "ok": false,
#   "error": "Current password is incorrect"
# }
```

#### 7.3 Change Password with password_reset_required Status

```bash
# User with password_reset_required can change password
curl -X POST "$API_URL/api/v1/auth/change-password" \
  -H "Authorization: Bearer $RESET_REQUIRED_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "current_password": "TempPassword123!",
    "new_password": "NewPassword123!"
  }'

# Expected response:
# {
#   "ok": true,
#   "message": "Password changed successfully. Status updated to active."
# }

# After this, user status should be "active"
```

---

### 8. Token Refresh

#### 8.1 Refresh Access Token

```bash
curl -X POST "$API_URL/api/v1/auth/refresh" \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "'$REFRESH_TOKEN'"
  }'

# Expected response:
# {
#   "ok": true,
#   "access_token": "eyJ...",
#   "refresh_token": "eyJ..."
# }

# Update tokens for future tests
ACCESS_TOKEN=$(echo $RESPONSE | jq -r '.access_token')
REFRESH_TOKEN=$(echo $RESPONSE | jq -r '.refresh_token')
```

#### 8.2 Refresh with Invalid Token

```bash
curl -X POST "$API_URL/api/v1/auth/refresh" \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "invalid_token"
  }'

# Expected response:
# {
#   "ok": false,
#   "error": "Invalid refresh token"
# }
```

#### 8.3 Refresh with Expired Token

```bash
# Wait for token to expire (if testing with short expiration)
# Or use token from old login session

curl -X POST "$API_URL/api/v1/auth/refresh" \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "expired_token"
  }'

# Expected response:
# {
#   "ok": false,
#   "error": "Refresh token has expired"
# }
```

---

### 9. Logout

#### 9.1 Logout (Invalidate Tokens)

```bash
curl -X POST "$API_URL/api/v1/auth/logout" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json"

# Expected response:
# {
#   "ok": true,
#   "message": "Logged out successfully"
# }

# After logout, refresh_token should be invalidated
```

#### 9.2 Use Token After Logout

```bash
# Try to use access token after logout
curl -X GET "$API_URL/api/v1/auth/me" \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# Expected response:
# {
#   "ok": false,
#   "error": "Token has been revoked"
# }
```

---

### 10. Admin User Management

#### 10.1 Assign Role to User

```bash
curl -X POST "$API_URL/api/v1/admin/users/$USER_ID/assign-role" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "role": "unit_manager",
    "managedOrgUnitId": 1
  }'

# Expected response:
# {
#   "ok": true,
#   "message": "Role assigned successfully"
# }
```

#### 10.2 Block User

```bash
curl -X POST "$API_URL/api/v1/admin/users/$USER_ID/block" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"comment": "Suspicious activity"}'

# Expected response:
# {
#   "ok": true,
#   "message": "User blocked successfully"
# }
```

#### 10.3 Unblock User

```bash
curl -X POST "$API_URL/api/v1/admin/users/$USER_ID/unblock" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"comment": "Issue resolved"}'

# Expected response:
# {
#   "ok": true,
#   "message": "User unblocked successfully"
# }
```

#### 10.4 Reset User Password

```bash
curl -X POST "$API_URL/api/v1/admin/users/$USER_ID/reset-password" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json"

# Expected response:
# {
#   "ok": true,
#   "tempPassword": "TempPassword123!",
#   "message": "Password reset successfully. User must change password on next login."
# }

# Note: tempPassword is returned only once
```

---

## 📊 Test Summary

Create a test report:

```bash
cat > /tmp/test_report.md << 'EOF'
# API Test Report

Date: $(date)
Environment: Production
API URL: https://worktimeapi.duckdns.org

## Test Results

| Test Case | Status | Notes |
|-----------|--------|-------|
| Public Directories | PASS/FAIL | |
| User Registration | PASS/FAIL | |
| Admin Seed | PASS/FAIL | |
| Admin Approval | PASS/FAIL | |
| User Login | PASS/FAIL | |
| Get User Info | PASS/FAIL | |
| Change Password | PASS/FAIL | |
| Token Refresh | PASS/FAIL | |
| Logout | PASS/FAIL | |
| Admin User Management | PASS/FAIL | |

## Issues Found

- Issue 1: ...
- Issue 2: ...

## Recommendations

- Recommendation 1: ...
- Recommendation 2: ...
EOF
```

---

**Last Updated:** July 9, 2026  
**Status:** Ready for testing
