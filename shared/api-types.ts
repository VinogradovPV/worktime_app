/**
 * API Types - Типы данных для REST API endpoints
 * 
 * Все типы используют snake_case для совместимости с PostgreSQL.
 * На клиенте они преобразуются в camelCase при необходимости.
 */

/**
 * Роли пользователей
 */
export enum UserRole {
  USER = "user",
  UNIT_MANAGER = "unit_manager",
  DEPARTMENT_MANAGER = "department_manager",
  ADMIN = "admin",
}

/**
 * Статусы пользователей
 */
export enum UserStatus {
  PENDING = "pending",
  ACTIVE = "active",
  BLOCKED = "blocked",
  INACTIVE = "inactive",
}

/**
 * Пользователь
 */
export interface User {
  id: number;
  login: string;
  display_name: string | null;
  role: UserRole;
  status: UserStatus;
  org_unit_id: number;
  position_id: number;
  managed_org_unit_id: number | null;
  created_at: string;
  updated_at: string;
}

/**
 * Структурное подразделение
 */
export interface OrgUnit {
  id: number;
  name: string;
  short_name: string;
  type: string;
  parent_id: number | null;
  created_at: string;
  updated_at: string;
}

/**
 * Должность
 */
export interface Position {
  id: number;
  name: string;
  short_name: string;
  created_at: string;
  updated_at: string;
}

/**
 * Заявка на регистрацию
 */
export interface RegistrationRequest {
  id: number;
  login: string;
  display_name: string;
  org_unit_id: number;
  position_id: number;
  comment: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  updated_at: string;
}

/**
 * Рабочий день
 */
export interface WorkDay {
  id: number;
  user_id: number;
  date: string; // YYYY-MM-DD
  status: "working" | "vacation" | "sick" | "holiday" | "weekend";
  hours: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Рабочее событие (начало/конец смены, перерыв и т.д.)
 */
export interface WorkEvent {
  id: number;
  user_id: number;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM:SS
  event_type: "start" | "end" | "break_start" | "break_end";
  comment: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * API Response wrapper
 */
export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Auth Responses
 */

export interface LoginRequest {
  login: string;
  password: string;
}

export interface LoginResponse {
  ok: boolean;
  access_token: string;
  refresh_token: string;
  user: User;
}

export interface RegisterRequest {
  login: string;
  password: string;
  password_confirm: string;
  display_name: string;
  org_unit_id: number;
  position_id: number;
  comment?: string;
}

export interface RegisterResponse {
  ok: boolean;
  status: "pending";
  message: string;
}

export interface RefreshRequest {
  refresh_token: string;
}

export interface RefreshResponse {
  ok: boolean;
  access_token: string;
  refresh_token: string;
}

export interface MeResponse {
  ok: boolean;
  user: User;
}

export interface LogoutResponse {
  ok: boolean;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

export interface ChangePasswordResponse {
  ok: boolean;
}

/**
 * Admin Responses
 */

export interface GetUsersResponse {
  ok: boolean;
  users: User[];
  total: number;
}

export interface GetRegistrationRequestsResponse {
  ok: boolean;
  requests: RegistrationRequest[];
  total: number;
}

export interface ApproveUserRequest {
  role: UserRole;
}

export interface ApproveUserResponse {
  ok: boolean;
  user: User;
}

export interface RejectUserRequest {
  reason?: string;
}

export interface RejectUserResponse {
  ok: boolean;
}

export interface BlockUserResponse {
  ok: boolean;
}

export interface UnblockUserResponse {
  ok: boolean;
}

export interface ResetPasswordResponse {
  ok: boolean;
  temp_password: string;
}

export interface AssignRoleRequest {
  role: UserRole;
}

export interface AssignRoleResponse {
  ok: boolean;
}

/**
 * Directory Responses
 */

export interface GetOrgUnitsResponse {
  ok: boolean;
  org_units: OrgUnit[];
  total: number;
}

export interface CreateOrgUnitRequest {
  name: string;
  short_name: string;
  type: string;
  parent_id?: number;
}

export interface CreateOrgUnitResponse {
  ok: boolean;
  org_unit: OrgUnit;
}

export interface GetPositionsResponse {
  ok: boolean;
  positions: Position[];
  total: number;
}

export interface CreatePositionRequest {
  name: string;
  short_name: string;
}

export interface CreatePositionResponse {
  ok: boolean;
  position: Position;
}

/**
 * Sync Responses
 */

export interface UploadWorkDaysRequest {
  workdays: WorkDay[];
}

export interface UploadWorkDaysResponse {
  ok: boolean;
  synced_count: number;
}

export interface DownloadWorkDaysRequest {
  from_date: string; // YYYY-MM-DD
  to_date: string; // YYYY-MM-DD
}

export interface DownloadWorkDaysResponse {
  ok: boolean;
  workdays: WorkDay[];
}

export interface GetSyncStatusResponse {
  ok: boolean;
  last_sync_at: string;
  pending_count: number;
}

/**
 * Health Check Response
 */

export interface HealthResponse {
  ok: boolean;
  status: "healthy" | "degraded" | "unhealthy";
  version: string;
  timestamp: string;
}
