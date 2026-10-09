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
    if (!payload || (payload.role !== "HR_ADMIN" && payload.role !== "SUPERADMIN")) {
      return NextResponse.json({ error: "Akses hanya untuk Administrator/HRD." }, { status: 403 });
    }

    const employees = await dbService.getAllUsers();
    return NextResponse.json({ employees });
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
    if (!payload || (payload.role !== "HR_ADMIN" && payload.role !== "SUPERADMIN")) {
      return NextResponse.json({ error: "Akses hanya untuk Administrator/HRD." }, { status: 403 });
    }

    const body = await req.json();
    const { nik, name, email, password, phoneNumber, role, branchId, shiftId } = body;

    if (!nik || !name || !email) {
      return NextResponse.json({ error: "NIK, Nama, dan Email wajib diisi." }, { status: 400 });
    }

    const newEmp = await dbService.createUser({
      nik,
      name,
      email,
      password: password || "Password123!",
      phoneNumber,
      role: role || "EMPLOYEE",
      branchId,
      shiftId,
    });

    await createAuditLog({
      userId: payload.userId,
      action: "CREATE",
      entityName: "users",
      entityId: newEmp.id,
      newValues: { nik, name, email, role },
    });

    return NextResponse.json({ message: "Karyawan baru berhasil ditambahkan.", employee: newEmp });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Reset face enrollment or device binding
export async function PUT(req: Request) {
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

    const { targetUserId, action } = await req.json();

    if (!targetUserId || !action) {
      return NextResponse.json({ error: "targetUserId dan action wajib diisi." }, { status: 400 });
    }

    if (action === "RESET_FACE") {
      await dbService.resetUserFace(targetUserId, payload.userId);
      await createAuditLog({
        userId: payload.userId,
        action: "RESET_FACE",
        entityName: "users",
        entityId: targetUserId,
        newValues: { resetBy: payload.userId },
      });
      return NextResponse.json({ message: "Wajah karyawan berhasil di-reset. Karyawan dapat mendaftarkan ulang wajahnya." });
    }

    return NextResponse.json({ error: "Aksi tidak dikenali." }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
