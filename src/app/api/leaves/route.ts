import { NextResponse } from "next/server";
import { dbService } from "@/lib/db-service";
import { extractTokenFromHeader, verifyAccessToken } from "@/lib/jwt";
import { createAuditLog } from "@/lib/audit";

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

    let leaves: any[] = [];
    if (payload.role === "HR_ADMIN" || payload.role === "SUPERADMIN") {
      leaves = await dbService.getAllLeaveRequests();
    } else {
      leaves = await dbService.getUserLeaveRequests(payload.userId);
    }

    return NextResponse.json({ leaves });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
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

    const { type, startDate, endDate, reason, attachmentUrl } = await req.json();

    if (!type || !startDate || !endDate || !reason) {
      return NextResponse.json(
        { error: "Tipe pengajuan, tanggal mulai, tanggal selesai, dan alasan wajib diisi." },
        { status: 400 }
      );
    }

    const leave = await dbService.createLeaveRequest({
      userId: payload.userId,
      type,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      reason,
      attachmentUrl: attachmentUrl || null,
    });

    await createAuditLog({
      userId: payload.userId,
      action: "CREATE",
      entityName: "leave_requests",
      entityId: leave.id,
      newValues: { type, startDate, endDate, reason },
    });

    return NextResponse.json({
      message: "Pengajuan izin/sakit berhasil diajukan dan menunggu persetujuan atasan.",
      leave,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
