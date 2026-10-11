import jwt from "jsonwebtoken";

function getSecretKey(envVarName: string, devFallback: string): string {
  const secret = process.env[envVarName];
  if (!secret) {
    if (process.env.STRICT_PRODUCTION_SECRETS === "true") {
      throw new Error(`CRITICAL SECURITY ERROR: Environment variable ${envVarName} wajib dikonfigurasi di production.`);
    }
    return devFallback;
  }
  if (secret.length < 32 && process.env.STRICT_PRODUCTION_SECRETS === "true") {
    throw new Error(`CRITICAL SECURITY ERROR: ${envVarName} minimal harus 32 karakter.`);
  }
  return secret;
}

const JWT_SECRET = getSecretKey(
  "JWT_SECRET",
  "super-secret-jwt-key-min-32-chars-long-security-key-2026"
);
const JWT_REFRESH_SECRET = getSecretKey(
  "JWT_REFRESH_SECRET",
  "super-secret-jwt-refresh-key-min-32-chars-security-2026"
);

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
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

export function extractTokenFromHeader(authHeader?: string | null, cookieHeader?: string | null): string | null {
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7).trim();
  }
  if (cookieHeader) {
    const match = cookieHeader.match(/(?:^|;\s*)accessToken=([^;]+)/);
    if (match && match[1]) {
      return decodeURIComponent(match[1]);
    }
  }
  return null;
}

