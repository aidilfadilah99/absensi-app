import { NextResponse } from "next/server";
import { dbService } from "@/lib/db-service";
import { extractTokenFromHeader, verifyAccessToken } from "@/lib/jwt";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Sesi tidak valid." }, { status: 401 });
    }

    const attendances = await dbService.getUserAttendances(payload.userId, 50);

    return NextResponse.json({ attendances });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
