import { NextResponse } from "next/server";
import { generateLivenessChallenge } from "@/lib/liveness";
import { extractTokenFromHeader, verifyAccessToken } from "@/lib/jwt";
import { checkRateLimit, getClientIp } from "@/lib/security";

export async function POST(req: Request) {
  try {
    const clientIp = getClientIp(req);
    const rate = checkRateLimit(`challenge:${clientIp}`, 30, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: `Terlalu banyak permintaan tantangan liveness. Coba lagi dalam ${rate.retryAfterSeconds} detik.` },
        { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } }
      );
    }

    const token = extractTokenFromHeader(
      req.headers.get("authorization"),
      req.headers.get("cookie")
    );
    const payload = token ? verifyAccessToken(token) : null;

    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const challenge = generateLivenessChallenge(payload.userId);

    return NextResponse.json({
      challengeToken: challenge.token,
      action: challenge.action,
      instructionText: challenge.instructionText,
      serverTime: new Date().toISOString(),
      expiresAt: new Date(challenge.expiresAt).toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

