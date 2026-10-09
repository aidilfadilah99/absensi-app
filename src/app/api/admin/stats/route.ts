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

    const stats = await dbService.getTodayStats();
    const branches = await dbService.getAllBranches();
    const shifts = await dbService.getAllShifts();

    return NextResponse.json({
      stats,
      totalBranches: branches.length,
      totalShifts: shifts.length,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
