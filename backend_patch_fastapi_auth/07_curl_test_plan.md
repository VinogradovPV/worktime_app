# FastAPI Auth MVP - cURL Test Plan

**Date:** July 10, 2026  
**Version:** 1.0  
**Purpose:** Complete API testing guide with 16 scenarios

---

## 📋 Setup

### Environment Variables

```bash
# Set base URL
API_URL="https://worktimeapi.duckdns.org"

# Placeholders (replace with actual values)
ADMIN_SEED_TOKEN="<generated_admin_seed_token>"
ADMIN_LOGIN="admin"
ADMIN_PASSWORD="AdminPassword123!"
TEST_LOGIN="testuser"
TEST_PASSWORD="Test1234!"
TEST_DISPLAY_NAME="Test User"
ORG_UNIT_ID=1
POSITION_ID=1
```

---

## 🧪 Test Scenarios

### Scenario 1: Health Check

```bash
curl -s -X GET $API_URL/api/v1/health | jq .
# Expected: {"status":"ok"}
```

### Scenario 2: Get Public Org Units

```bash
curl -s -X GET $API_URL/api/v1/directories/org-units | jq .
# Expected: [{"id":1,"name":"...","is_active":true}, ...]
```

### Scenario 3: Get Public Positions

```bash
curl -s -X GET $API_URL/api/v1/directories/positions | jq .
# Expected: [{"id":1,"name":"...","is_active":true}, ...]
```

### Scenario 4: User Registration (Pending Status)

```bash
curl -s -X POST $API_URL/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "login": "'$TEST_LOGIN'",
    "password": "'$TEST_PASSWORD'",
    "passwordConfirm": "'$TEST_PASSWORD'",
    "displayName": "'$TEST_DISPLAY_NAME'",
    "orgUnitId": '$ORG_UNIT_ID',
    "positionId": '$POSITION_ID'
  }' | jq .

# Expected: 
# {
#   "ok": true,
#   "status": "pending",
#   "message": "User registered successfully. Awaiting admin approval."
# }
```

### Scenario 5: Pending User Login (403 Error)

```bash
curl -s -X POST $API_URL/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "login": "'$TEST_LOGIN'",
    "password": "'$TEST_PASSWORD'"
  }' | jq .

# Expected: 
# {
#   "ok": false,
#   "error": "User is not active. Status: pending"
# }
# HTTP Status: 403
```

### Scenario 6: Admin Login

```bash
ADMIN_LOGIN_RESPONSE=$(curl -s -X POST $API_URL/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "login": "'$ADMIN_LOGIN'",
    "password": "'$ADMIN_PASSWORD'"
  }')

echo $ADMIN_LOGIN_RESPONSE | jq .

# Extract tokens for later use
ADMIN_ACCESS_TOKEN=$(echo $ADMIN_LOGIN_RESPONSE | jq -r '.access_token')
ADMIN_REFRESH_TOKEN=$(echo $ADMIN_LOGIN_RESPONSE | jq -r '.refresh_token')

echo "Admin Access Token: $ADMIN_ACCESS_TOKEN"
echo "Admin Refresh Token: $ADMIN_REFRESH_TOKEN"

# Expected:
# {
#   "ok": true,
#   "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
#   "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
#   "user": {
#     "id": 1,
#     "login": "admin",
#     "displayName": "System Administrator",
#     "role": "admin",
#     "status": "active"
#   }
# }
```

### Scenario 7: Get Registration Requests (Admin)

```bash
curl -s -X GET $API_URL/api/v1/admin/registration-requests \
  -H "Authorization: Bearer $ADMIN_ACCESS_TOKEN" | jq .

# Expected:
# [
#   {
#     "id": 2,
#     "login": "testuser",
#     "displayName": "Test User",
#     "status": "pending",
#     "createdAt": "2026-07-10T12:34:56.789Z"
#   }
# ]
```

### Scenario 8: Approve User Registration

```bash
# Get user ID from registration requests (usually 2 if first user)
USER_ID=2

curl -s -X POST $API_URL/api/v1/admin/users/$USER_ID/approve \
  -H "Authorization: Bearer $ADMIN_ACCESS_TOKEN" \
  -H "Content-Type: application/json" | jq .

# Expected:
# {
#   "ok": true,
#   "message": "User approved successfully"
# }
```

### Scenario 9: User Login (Active Status)

```bash
USER_LOGIN_RESPONSE=$(curl -s -X POST $API_URL/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "login": "'$TEST_LOGIN'",
    "password": "'$TEST_PASSWORD'"
  }')

echo $USER_LOGIN_RESPONSE | jq .

# Extract tokens for later use
USER_ACCESS_TOKEN=$(echo $USER_LOGIN_RESPONSE | jq -r '.access_token')
USER_REFRESH_TOKEN=$(echo $USER_LOGIN_RESPONSE | jq -r '.refresh_token')

echo "User Access Token: $USER_ACCESS_TOKEN"
echo "User Refresh Token: $USER_REFRESH_TOKEN"

# Expected:
# {
#   "ok": true,
#   "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
#   "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
#   "user": {
#     "id": 2,
#     "login": "testuser",
#     "displayName": "Test User",
#     "role": "user",
#     "status": "active"
#   }
# }
```

### Scenario 10: Get Current User Profile

```bash
curl -s -X GET $API_URL/api/v1/auth/me \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" | jq .

# Expected:
# {
#   "id": 2,
#   "login": "testuser",
#   "displayName": "Test User",
#   "role": "user",
#   "status": "active",
#   "orgUnitId": 1,
#   "positionId": 1,
#   "lastLoginAt": "2026-07-10T12:35:00.000Z"
# }
```

### Scenario 11: Admin Reset User Password

```bash
USER_ID=2

RESET_RESPONSE=$(curl -s -X POST $API_URL/api/v1/admin/users/$USER_ID/reset-password \
  -H "Authorization: Bearer $ADMIN_ACCESS_TOKEN" \
  -H "Content-Type: application/json")

echo $RESET_RESPONSE | jq .

# Extract temporary password
TEMP_PASSWORD=$(echo $RESET_RESPONSE | jq -r '.tempPassword')
echo "Temporary Password: $TEMP_PASSWORD"

# Expected:
# {
#   "ok": true,
#   "tempPassword": "aB3cD4eF5gH6iJ7k",
#   "message": "Password reset successfully. User must change password on next login."
# }
```

### Scenario 12: Login with Temp Password (Password Reset Required)

```bash
TEMP_LOGIN_RESPONSE=$(curl -s -X POST $API_URL/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "login": "'$TEST_LOGIN'",
    "password": "'$TEMP_PASSWORD'"
  }')

echo $TEMP_LOGIN_RESPONSE | jq .

# Extract limited access token
LIMITED_ACCESS_TOKEN=$(echo $TEMP_LOGIN_RESPONSE | jq -r '.access_token')

# Expected:
# {
#   "ok": true,
#   "status": "password_reset_required",
#   "requiresPasswordChange": true,
#   "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
#   "user": {
#     "id": 2,
#     "login": "testuser",
#     "displayName": "Test User",
#     "role": "user",
#     "status": "password_reset_required"
#   }
# }
# Note: refresh_token is NOT returned
```

### Scenario 13: Change Password

```bash
curl -s -X POST $API_URL/api/v1/auth/change-password \
  -H "Authorization: Bearer $LIMITED_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "current_password": "'$TEMP_PASSWORD'",
    "new_password": "NewPassword123!"
  }' | jq .

# Expected:
# {
#   "ok": true,
#   "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
#   "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
#   "user": {
#     "id": 2,
#     "login": "testuser",
#     "displayName": "Test User",
#     "role": "user",
#     "status": "active"
#   }
# }
```

### Scenario 14: Block User

```bash
USER_ID=2

curl -s -X POST $API_URL/api/v1/admin/users/$USER_ID/block \
  -H "Authorization: Bearer $ADMIN_ACCESS_TOKEN" \
  -H "Content-Type: application/json" | jq .

# Expected:
# {
#   "ok": true,
#   "message": "User blocked successfully"
# }
```

### Scenario 15: Blocked User Login (403 Error)

```bash
curl -s -X POST $API_URL/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "login": "'$TEST_LOGIN'",
    "password": "NewPassword123!"
  }' | jq .

# Expected:
# {
#   "ok": false,
#   "error": "User is not active. Status: blocked"
# }
# HTTP Status: 403
```

### Scenario 16: Verify Audit Logs

```bash
curl -s -X GET "$API_URL/api/v1/audit/logs?limit=20" \
  -H "Authorization: Bearer $ADMIN_ACCESS_TOKEN" | jq .

# Expected: Array of audit log entries with:
# - action: "admin_approve_user", "admin_reset_user_password", "admin_block_user", etc.
# - actor_user_id: 1 (admin ID)
# - entity_type: "user"
# - entity_id: 2 (user ID)
# - old_values and new_values
# - created_at timestamp
# - NO tempPassword in logs
```

---

## 🔄 Refresh Token Test

```bash
# Use refresh token to get new access token
REFRESH_RESPONSE=$(curl -s -X POST $API_URL/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "'$USER_REFRESH_TOKEN'"
  }')

echo $REFRESH_RESPONSE | jq .

# Expected:
# {
#   "ok": true,
#   "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
#   "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
#   "user": {...}
# }
```

---

## 🚨 Error Scenarios

### Invalid Token

```bash
curl -s -X GET $API_URL/api/v1/auth/me \
  -H "Authorization: Bearer invalid_token" | jq .

# Expected:
# {
#   "ok": false,
#   "error": "Invalid token"
# }
# HTTP Status: 401
```

### Missing Authorization Header

```bash
curl -s -X GET $API_URL/api/v1/auth/me | jq .

# Expected:
# {
#   "ok": false,
#   "error": "Not authenticated"
# }
# HTTP Status: 401
```

### Non-Admin Access to Admin Endpoint

```bash
curl -s -X GET $API_URL/api/v1/admin/users \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" | jq .

# Expected:
# {
#   "ok": false,
#   "error": "Admin access required"
# }
# HTTP Status: 403
```

### Password Mismatch on Registration

```bash
curl -s -X POST $API_URL/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "login": "newuser",
    "password": "Pass1234!",
    "passwordConfirm": "DifferentPass123!",
    "displayName": "New User",
    "orgUnitId": 1,
    "positionId": 1
  }' | jq .

# Expected:
# {
#   "ok": false,
#   "error": "Passwords do not match"
# }
# HTTP Status: 400
```

---

## ✅ Test Results Summary

After running all tests, verify:

- [ ] Scenario 1: Health check returns 200
- [ ] Scenario 2: Org units list is not empty
- [ ] Scenario 3: Positions list is not empty
- [ ] Scenario 4: Registration returns pending status
- [ ] Scenario 5: Pending user cannot login (403)
- [ ] Scenario 6: Admin can login and get tokens
- [ ] Scenario 7: Admin can see pending requests
- [ ] Scenario 8: Admin can approve user
- [ ] Scenario 9: Approved user can login and get tokens
- [ ] Scenario 10: User can get their profile
- [ ] Scenario 11: Admin can reset password
- [ ] Scenario 12: User can login with temp password (limited token)
- [ ] Scenario 13: User can change password and get full tokens
- [ ] Scenario 14: Admin can block user
- [ ] Scenario 15: Blocked user cannot login (403)
- [ ] Scenario 16: Audit logs contain all admin actions

---

**Last Updated:** July 10, 2026  
**Status:** Ready for testing
