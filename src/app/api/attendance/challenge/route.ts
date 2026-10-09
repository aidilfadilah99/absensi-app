import { NextResponse } from "next/server";
import { generateLivenessChallenge } from "@/lib/liveness";
import { extractTokenFromHeader, verifyAccessToken } from "@/lib/jwt";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = extractTokenFromHeader(authHeader);

    if (!token || !verifyAccessToken(token)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const challenge = generateLivenessChallenge();

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
