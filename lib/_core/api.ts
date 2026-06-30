import { Platform } from "react-native";
import * as Auth from "./auth";

type ApiResponse<T> = {
  data?: T;
  error?: string;
};

// External API configuration
const EXTERNAL_API_BASE_URL = "https://worktimeapi.duckdns.org";
const EXTERNAL_API_TOKEN = "6b7a58028382f9b59413cdea2a028ab17ac8545a9c5a43cf4e010c35a076e200";

export async function apiCall<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${EXTERNAL_API_TOKEN}`,
    ...((options.headers as Record<string, string>) || {}),
  };

  // Add session token for native platform if available
  if (Platform.OS !== "web") {
    const sessionToken = await Auth.getSessionToken();
    if (sessionToken) {
      headers["Authorization"] = `Bearer ${sessionToken}`;
      console.log("[API] Using session token for native platform");
    }
  }

  const baseUrl = EXTERNAL_API_BASE_URL;
  const cleanBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = `${cleanBaseUrl}${cleanEndpoint}`;
  
  console.log("[API] Making request to:", url);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: "include",
    });

    console.log("[API] Response status:", response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[API] Error response:", errorText);
      let errorMessage = errorText;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error || errorJson.message || errorText;
      } catch {
        // Not JSON, use text as is
      }
      throw new Error(errorMessage || `API call failed: ${response.statusText}`);
    }

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      const data = await response.json();
      console.log("[API] JSON response received");
      return data as T;
    }

    const text = await response.text();
    console.log("[API] Text response received");
    return (text ? JSON.parse(text) : {}) as T;
  } catch (error) {
    console.error("[API] Request failed:", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Unknown error occurred");
  }
}

/**
 * Authentication API calls
 */

// Register new user
export async function register(data: {
  login: string;
  password: string;
  displayName: string;
  orgUnitId: number;
  positionId: number;
}): Promise<{ user: any; token: string }> {
  return apiCall("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// Login user
export async function login(login: string, password: string): Promise<{ token: string; user: any }> {
  const result = await apiCall<{ token: string; user: any }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ login, password }),
  });
  
  // Store session token
  if (result.token) {
    await Auth.setSessionToken(result.token);
  }
  
  return result;
}

// Logout
export async function logout(): Promise<void> {
  try {
    await apiCall<void>("/api/auth/logout", {
      method: "POST",
    });
  } finally {
    await Auth.removeSessionToken();
  }
}

// Get current authenticated user
export async function getMe(): Promise<{
  id: number;
  login: string;
  displayName: string | null;
  role: string;
  status: string;
  orgUnitId: number;
  positionId: number;
} | null> {
  try {
    const result = await apiCall<{ user: any }>("/api/auth/me");
    return result.user || null;
  } catch (error) {
    console.error("[API] getMe failed:", error);
    return null;
  }
}

// Change password
export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await apiCall<void>("/api/auth/change-password", {
    method: "POST",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

/**
 * Admin API calls
 */

// Get all users
export async function getUsers(): Promise<any[]> {
  const result = await apiCall<{ users: any[] }>("/api/admin/users");
  return result.users || [];
}

// Approve user registration
export async function approveUser(userId: number): Promise<void> {
  await apiCall<void>(`/api/admin/users/${userId}/approve`, {
    method: "POST",
  });
}

// Reject user registration
export async function rejectUser(userId: number): Promise<void> {
  await apiCall<void>(`/api/admin/users/${userId}/reject`, {
    method: "POST",
  });
}

// Block user
export async function blockUser(userId: number): Promise<void> {
  await apiCall<void>(`/api/admin/users/${userId}/block`, {
    method: "POST",
  });
}

// Unblock user
export async function unblockUser(userId: number): Promise<void> {
  await apiCall<void>(`/api/admin/users/${userId}/unblock`, {
    method: "POST",
  });
}

// Reset user password
export async function resetPassword(userId: number): Promise<{ tempPassword: string }> {
  return apiCall("/api/admin/users/{userId}/reset-password", {
    method: "POST",
  });
}

// Get organization units
export async function getOrgUnits(): Promise<any[]> {
  const result = await apiCall<{ orgUnits: any[] }>("/api/admin/org-units");
  return result.orgUnits || [];
}

// Create organization unit
export async function createOrgUnit(data: {
  name: string;
  shortName: string;
  type: string;
  parentId?: number;
}): Promise<any> {
  return apiCall("/api/admin/org-units", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// Get positions
export async function getPositions(): Promise<any[]> {
  const result = await apiCall<{ positions: any[] }>("/api/admin/positions");
  return result.positions || [];
}

// Create position
export async function createPosition(data: {
  name: string;
  shortName: string;
}): Promise<any> {
  return apiCall("/api/admin/positions", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// Get audit logs
export async function getAuditLogs(filters?: {
  userId?: number;
  action?: string;
  startDate?: string;
  endDate?: string;
}): Promise<any[]> {
  const params = new URLSearchParams();
  if (filters?.userId) params.append("userId", String(filters.userId));
  if (filters?.action) params.append("action", filters.action);
  if (filters?.startDate) params.append("startDate", filters.startDate);
  if (filters?.endDate) params.append("endDate", filters.endDate);

  const result = await apiCall<{ logs: any[] }>(`/api/admin/audit-logs?${params.toString()}`);
  return result.logs || [];
}

// Assign role to user
export async function assignRole(userId: number, role: string): Promise<void> {
  await apiCall<void>(`/api/admin/users/${userId}/assign-role`, {
    method: "POST",
    body: JSON.stringify({ role }),
  });
}

// OAuth callback handler - exchange code for session token
export async function exchangeOAuthCode(
  code: string,
  state: string,
): Promise<{ sessionToken: string; user: any }> {
  console.log("[API] exchangeOAuthCode called");
  const params = new URLSearchParams({ code, state });
  const endpoint = `/api/oauth/mobile?${params.toString()}`;
  console.log("[API] Calling OAuth mobile endpoint:", endpoint);
  
  try {
    const result = await apiCall<{ app_session_id: string; user: any }>(endpoint);
    const sessionToken = result.app_session_id;
    console.log("[API] OAuth exchange result:", {
      hasSessionToken: !!sessionToken,
      hasUser: !!result.user,
    });
    return {
      sessionToken,
      user: result.user,
    };
  } catch (error) {
    console.error("[API] OAuth exchange failed:", error);
    throw error;
  }
}

// Test API connection
export async function testConnection(): Promise<boolean> {
  try {
    const response = await fetch(`${EXTERNAL_API_BASE_URL}/health`, {
      headers: {
        "Authorization": `Bearer ${EXTERNAL_API_TOKEN}`,
      },
    });
    return response.ok;
  } catch {
    return false;
  }
}
