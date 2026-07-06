/**
 * API Types - Shared types for REST API communication
 * Uses snake_case to match PostgreSQL database schema
 */

// ============================================================================
// Auth Types
// ============================================================================

export interface AuthLoginRequest {
  login: string;
  password: string;
}

export interface AuthLoginResponse {
  ok: boolean;
  access_token: string;
  refresh_token: string;
  user: UserResponse;
}

export interface AuthRefreshRequest {
  refresh_token: string;
}

export interface AuthRefreshResponse {
  ok: boolean;
  access_token: string;
  refresh_token: string;
}

export interface AuthMeResponse {
  ok: boolean;
  user: UserResponse;
}

export interface AuthLogoutResponse {
  ok: boolean;
}

// ============================================================================
// User Types
// ============================================================================

export type UserRole = "admin" | "unit_manager" | "department_manager" | "employee";
export type UserStatus = "pending" | "active" | "blocked" | "rejected" | "password_reset_required";

export interface UserResponse {
  id: number;
  login: string;
  display_name: string;
  role: UserRole;
  status: UserStatus;
  last_login_at?: string;
  email?: string;
  avatar_url?: string;
}

export interface UserListResponse {
  ok: boolean;
  users: UserResponse[];
  total: number;
}

// ============================================================================
// Organization Types
// ============================================================================

export interface OrgUnitResponse {
  id: number;
  name: string;
  code?: string;
  parent_id?: number;
  description?: string;
}

export interface OrgUnitListResponse {
  ok: boolean;
  org_units: OrgUnitResponse[];
  total: number;
}

// ============================================================================
// Position Types
// ============================================================================

export interface PositionResponse {
  id: number;
  name: string;
  code?: string;
  description?: string;
}

export interface PositionListResponse {
  ok: boolean;
  positions: PositionResponse[];
  total: number;
}

// ============================================================================
// Work Event Types
// ============================================================================

export type WorkEventType =
  | "work_start"
  | "work_end"
  | "break_start"
  | "break_end"
  | "temporary_exit_start"
  | "temporary_exit_end";

export interface WorkEventResponse {
  id: number;
  type: WorkEventType;
  timestamp: string; // ISO 8601
  duration_ms?: number;
  notes?: string;
}

// ============================================================================
// Work Day Types
// ============================================================================

export type WorkDayStatus =
  | "not_started"
  | "working"
  | "on_break"
  | "on_temporary_exit"
  | "completed"
  | "vacation"
  | "sick_leave"
  | "holiday";

export interface WorkDayResponse {
  id: number;
  date: string; // YYYY-MM-DD
  user_id: number;
  status: WorkDayStatus;
  events: WorkEventResponse[];
  total_worked_ms: number;
  total_break_ms: number;
  total_temporary_exit_ms: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface WorkDayListResponse {
  ok: boolean;
  work_days: WorkDayResponse[];
  total: number;
}

// ============================================================================
// Sync Types
// ============================================================================

export interface SyncEventRequest {
  date: string; // YYYY-MM-DD
  events: WorkEventResponse[];
}

export interface SyncEventResponse {
  ok: boolean;
  message?: string;
  work_day?: WorkDayResponse;
}

// ============================================================================
// Error Response
// ============================================================================

export interface ErrorResponse {
  ok: false;
  error: string;
  details?: Record<string, unknown>;
}

// ============================================================================
// API Response Wrapper
// ============================================================================

export type ApiResponse<T> = T | ErrorResponse;
