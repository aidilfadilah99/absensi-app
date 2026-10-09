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
    if (!payload || (payload.role !== "HR_ADMIN" && payload.role !== "SUPERADMIN")) {
      return NextResponse.json({ error: "Akses hanya untuk Administrator/HRD." }, { status: 403 });
    }

    const url = new URL(req.url);
    const branchId = url.searchParams.get("branchId") || undefined;
    const status = url.searchParams.get("status") || undefined;

    const attendances = await dbService.getAllAttendances({ branchId, status });

    return NextResponse.json({ attendances });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
