import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-jwt-key-min-32-chars-long-security-key-2026";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "super-secret-jwt-refresh-key-min-32-chars-security-2026";

export interface TokenPayload {
  userId: string;
  email: string;
  nik: string;
  role: string;
  name: string;
  branchId?: string | null;
  shiftId?: string | null;
  deviceId?: string | null;
}

export function signAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "8h" });
}

export function signRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: "30d" });
}

export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (error) {
    return null;
  }
}

export function verifyRefreshToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET) as TokenPayload;
  } catch (error) {
    return null;
  }
}

export function extractTokenFromHeader(authHeader?: string | null): string | null {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.substring(7);
}
