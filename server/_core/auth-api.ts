/**
 * Auth API endpoints for WorkTime App
 * Handles user authentication with JWT tokens
 */

import type { Express, Request, Response } from "express";
import { jwtVerify, SignJWT } from "jose";
import { ENV } from "./env";

// JWT configuration
const JWT_SECRET = new TextEncoder().encode(ENV.cookieSecret || "your-secret-key-change-in-production");
const ACCESS_TOKEN_EXPIRY = 15 * 60; // 15 minutes in seconds
const REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60; // 7 days in seconds

// Types
interface AuthUser {
  id: string;
  login: string;
  displayName: string;
  role: string;
  status: string;
  orgUnitId?: string;
  positionId?: string;
}

interface TokenPayload {
  userId: string;
  login: string;
  role: string;
  type: "access" | "refresh";
  iat: number;
  exp: number;
}

interface LoginRequest {
  login: string;
  password: string;
}

interface RefreshRequest {
  refresh_token: string;
}

interface AuthResponse {
  ok: boolean;
  access_token?: string;
  refresh_token?: string;
  user?: AuthUser;
  error?: string;
}

interface MeResponse {
  ok: boolean;
  user?: AuthUser;
  error?: string;
}

// Helper function to create JWT token
async function createToken(
  userId: string,
  login: string,
  role: string,
  type: "access" | "refresh",
  expirySeconds: number
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const token = await new SignJWT({
    userId,
    login,
    role,
    type,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setExpirationTime(now + expirySeconds)
    .sign(JWT_SECRET);

  return token;
}

// Helper function to verify JWT token
async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const verified = await jwtVerify(token, JWT_SECRET);
    return verified.payload as unknown as TokenPayload;
  } catch (error) {
    console.error("[Auth] Token verification failed:", error);
    return null;
  }
}

// Helper function to extract Bearer token from Authorization header
function extractBearerToken(authHeader?: string): string | null {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.slice("Bearer ".length).trim();
}

// Mock database function - in production, this would query PostgreSQL
// For now, we'll use hardcoded test users
async function getUserByLogin(login: string): Promise<AuthUser | null> {
  // Test users created via seed endpoint
  const testUsers: Record<string, AuthUser> = {
    "p.vinogradov": {
      id: "user-001",
      login: "p.vinogradov",
      displayName: "Винградов Павел",
      role: "admin",
      status: "active",
    },
    "v.kultsev": {
      id: "user-002",
      login: "v.kultsev",
      displayName: "Кульцев Владимир",
      role: "admin",
      status: "active",
    },
  };

  return testUsers[login] || null;
}

// Mock password verification - in production, use bcrypt
async function verifyPassword(password: string, login: string): Promise<boolean> {
  // Test passwords for demo
  const testPasswords: Record<string, string> = {
    "p.vinogradov": "VinogradovPavel2024!",
    "v.kultsev": "KultsevVladimir2024!",
  };

  return testPasswords[login] === password;
}

/**
 * POST /api/v1/auth/login
 * Authenticate user with login and password
 */
async function handleLogin(req: Request, res: Response): Promise<void> {
  try {
    const { login, password } = req.body as LoginRequest;

    // Validate input
    if (!login || !password) {
      res.status(400).json({
        ok: false,
        error: "login and password are required",
      } as AuthResponse);
      return;
    }

    // Get user from database
    const user = await getUserByLogin(login);
    if (!user) {
      res.status(401).json({
        ok: false,
        error: "Invalid login or password",
      } as AuthResponse);
      return;
    }

    // Check user status
    if (user.status !== "active") {
      res.status(403).json({
        ok: false,
        error: `User account is ${user.status}`,
      } as AuthResponse);
      return;
    }

    // Verify password
    const passwordValid = await verifyPassword(password, login);
    if (!passwordValid) {
      res.status(401).json({
        ok: false,
        error: "Invalid login or password",
      } as AuthResponse);
      return;
    }

    // Create tokens
    const accessToken = await createToken(
      user.id,
      user.login,
      user.role,
      "access",
      ACCESS_TOKEN_EXPIRY
    );
    const refreshToken = await createToken(
      user.id,
      user.login,
      user.role,
      "refresh",
      REFRESH_TOKEN_EXPIRY
    );

    res.json({
      ok: true,
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        login: user.login,
        displayName: user.displayName,
        role: user.role,
        status: user.status,
      },
    } as AuthResponse);
  } catch (error) {
    console.error("[Auth] Login failed:", error);
    res.status(500).json({
      ok: false,
      error: "Internal server error",
    } as AuthResponse);
  }
}

/**
 * POST /api/v1/auth/refresh
 * Refresh access token using refresh token
 */
async function handleRefresh(req: Request, res: Response): Promise<void> {
  try {
    const { refresh_token } = req.body as RefreshRequest;

    if (!refresh_token) {
      res.status(400).json({
        ok: false,
        error: "refresh_token is required",
      } as AuthResponse);
      return;
    }

    // Verify refresh token
    const payload = await verifyToken(refresh_token);
    if (!payload || payload.type !== "refresh") {
      res.status(401).json({
        ok: false,
        error: "Invalid or expired refresh token",
      } as AuthResponse);
      return;
    }

    // Get user to verify they still exist and are active
    const user = await getUserByLogin(payload.login);
    if (!user || user.status !== "active") {
      res.status(403).json({
        ok: false,
        error: "User account is no longer active",
      } as AuthResponse);
      return;
    }

    // Create new tokens
    const newAccessToken = await createToken(
      user.id,
      user.login,
      user.role,
      "access",
      ACCESS_TOKEN_EXPIRY
    );
    const newRefreshToken = await createToken(
      user.id,
      user.login,
      user.role,
      "refresh",
      REFRESH_TOKEN_EXPIRY
    );

    res.json({
      ok: true,
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
    } as AuthResponse);
  } catch (error) {
    console.error("[Auth] Refresh failed:", error);
    res.status(500).json({
      ok: false,
      error: "Internal server error",
    } as AuthResponse);
  }
}

/**
 * POST /api/v1/auth/logout
 * Logout user (client-side token invalidation)
 */
async function handleLogout(req: Request, res: Response): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const token = extractBearerToken(authHeader);

    if (!token) {
      res.status(400).json({
        ok: false,
        error: "Authorization header is required",
      });
      return;
    }

    // Verify token is valid
    const payload = await verifyToken(token);
    if (!payload) {
      res.status(401).json({
        ok: false,
        error: "Invalid or expired token",
      });
      return;
    }

    // In production, add token to blacklist
    // For now, just return success - client will clear tokens locally
    res.json({
      ok: true,
    });
  } catch (error) {
    console.error("[Auth] Logout failed:", error);
    res.status(500).json({
      ok: false,
      error: "Internal server error",
    });
  }
}

/**
 * GET /api/v1/auth/me
 * Get current user information
 */
async function handleMe(req: Request, res: Response): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const token = extractBearerToken(authHeader);

    if (!token) {
      res.status(401).json({
        ok: false,
        error: "Authorization header is required",
      } as MeResponse);
      return;
    }

    // Verify access token
    const payload = await verifyToken(token);
    if (!payload || payload.type !== "access") {
      res.status(401).json({
        ok: false,
        error: "Invalid or expired access token",
      } as MeResponse);
      return;
    }

    // Get user from database
    const user = await getUserByLogin(payload.login);
    if (!user || user.status !== "active") {
      res.status(403).json({
        ok: false,
        error: "User account is no longer active",
      } as MeResponse);
      return;
    }

    res.json({
      ok: true,
      user: {
        id: user.id,
        login: user.login,
        displayName: user.displayName,
        role: user.role,
        status: user.status,
      },
    } as MeResponse);
  } catch (error) {
    console.error("[Auth] Me failed:", error);
    res.status(500).json({
      ok: false,
      error: "Internal server error",
    } as MeResponse);
  }
}

/**
 * Register auth routes
 */
export function registerAuthRoutes(app: Express): void {
  app.post("/api/v1/auth/login", handleLogin);
  app.post("/api/v1/auth/refresh", handleRefresh);
  app.post("/api/v1/auth/logout", handleLogout);
  app.get("/api/v1/auth/me", handleMe);

  console.log("[Auth] Routes registered: /api/v1/auth/*");
}
