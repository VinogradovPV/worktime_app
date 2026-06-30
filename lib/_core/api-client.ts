/**
 * External API Client for Worktime Server
 * Connects to https://worktimeapi.duckdns.org
 */

const API_BASE_URL = typeof window !== 'undefined' 
  ? (window as any).__API_BASE_URL || "https://worktimeapi.duckdns.org"
  : process.env.VITE_API_BASE_URL || "https://worktimeapi.duckdns.org";

const API_TOKEN = typeof window !== 'undefined'
  ? (window as any).__API_TOKEN || ""
  : process.env.VITE_API_TOKEN || "";

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface ApiError {
  message: string;
  status: number;
  code?: string;
}

/**
 * Make authenticated API request
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${API_TOKEN}`,
    ...options.headers,
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw {
        message: errorData.error || errorData.message || `HTTP ${response.status}`,
        status: response.status,
        code: errorData.code,
      } as ApiError;
    }

    const data = await response.json();
    return data as T;
  } catch (error) {
    if (error instanceof TypeError) {
      throw {
        message: "Network error: Unable to reach API server",
        status: 0,
      } as ApiError;
    }
    throw error;
  }
}

/**
 * Test API connection
 */
export async function testApiConnection(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      headers: {
        "Authorization": `Bearer ${API_TOKEN}`,
      },
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Auth API methods
 */
export const authApi = {
  /**
   * Register new user
   */
  register: async (data: {
    login: string;
    password: string;
    displayName: string;
    orgUnitId: number;
    positionId: number;
  }) => {
    return apiRequest("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  /**
   * Login user
   */
  login: async (login: string, password: string) => {
    return apiRequest<{ token: string; user: any }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ login, password }),
    });
  },

  /**
   * Get current user info
   */
  getCurrentUser: async () => {
    return apiRequest("/api/auth/me", {
      method: "GET",
    });
  },

  /**
   * Logout
   */
  logout: async () => {
    return apiRequest("/api/auth/logout", {
      method: "POST",
    });
  },

  /**
   * Change password
   */
  changePassword: async (currentPassword: string, newPassword: string) => {
    return apiRequest("/api/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },
};

/**
 * Admin API methods
 */
export const adminApi = {
  /**
   * Get all users
   */
  getUsers: async () => {
    return apiRequest("/api/admin/users", {
      method: "GET",
    });
  },

  /**
   * Approve user registration
   */
  approveUser: async (userId: number) => {
    return apiRequest(`/api/admin/users/${userId}/approve`, {
      method: "POST",
    });
  },

  /**
   * Reject user registration
   */
  rejectUser: async (userId: number) => {
    return apiRequest(`/api/admin/users/${userId}/reject`, {
      method: "POST",
    });
  },

  /**
   * Block user
   */
  blockUser: async (userId: number) => {
    return apiRequest(`/api/admin/users/${userId}/block`, {
      method: "POST",
    });
  },

  /**
   * Unblock user
   */
  unblockUser: async (userId: number) => {
    return apiRequest(`/api/admin/users/${userId}/unblock`, {
      method: "POST",
    });
  },

  /**
   * Reset user password
   */
  resetPassword: async (userId: number) => {
    return apiRequest(`/api/admin/users/${userId}/reset-password`, {
      method: "POST",
    });
  },

  /**
   * Get organization units
   */
  getOrgUnits: async () => {
    return apiRequest("/api/admin/org-units", {
      method: "GET",
    });
  },

  /**
   * Create organization unit
   */
  createOrgUnit: async (data: {
    name: string;
    shortName: string;
    type: string;
    parentId?: number;
  }) => {
    return apiRequest("/api/admin/org-units", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  /**
   * Get positions
   */
  getPositions: async () => {
    return apiRequest("/api/admin/positions", {
      method: "GET",
    });
  },

  /**
   * Create position
   */
  createPosition: async (data: {
    name: string;
    shortName: string;
  }) => {
    return apiRequest("/api/admin/positions", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  /**
   * Get audit logs
   */
  getAuditLogs: async (filters?: {
    userId?: number;
    action?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters?.userId) params.append("userId", String(filters.userId));
    if (filters?.action) params.append("action", filters.action);
    if (filters?.startDate) params.append("startDate", filters.startDate);
    if (filters?.endDate) params.append("endDate", filters.endDate);

    return apiRequest(`/api/admin/audit-logs?${params.toString()}`, {
      method: "GET",
    });
  },
};

/**
 * Export API client
 */
export const apiClient = {
  auth: authApi,
  admin: adminApi,
  testConnection: testApiConnection,
};
