import { NextResponse } from "next/server";
import { dbService } from "@/lib/db-service";
import { extractTokenFromHeader, verifyAccessToken } from "@/lib/jwt";
import { createAuditLog } from "@/lib/audit";

export async function GET() {
  try {
    const branches = await dbService.getAllBranches();
    return NextResponse.json({ branches });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = extractTokenFromHeader(authHeader);

    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const payload = verifyAccessToken(token);
    if (!payload || (payload.role !== "HR_ADMIN" && payload.role !== "SUPERADMIN")) {
      return NextResponse.json({ error: "Akses hanya untuk Administrator/HRD." }, { status: 403 });
    }

    const body = await req.json();
    const branch = await dbService.createBranch(body);

    await createAuditLog({
      userId: payload.userId,
      action: "CREATE",
      entityName: "branches",
      entityId: branch.id,
      newValues: body,
    });

    return NextResponse.json({ message: "Cabang kantor berhasil ditambahkan.", branch });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = extractTokenFromHeader(authHeader);

    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const payload = verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Sesi tidak valid." }, { status: 401 });
    }

    const body = await req.json();
    const { id, latitude, longitude, radiusMeters, name, address } = body;

    if (!id) {
      return NextResponse.json({ error: "ID cabang wajib diisi." }, { status: 400 });
    }

    const updateData: any = {};
    if (latitude !== undefined) updateData.latitude = Number(latitude);
    if (longitude !== undefined) updateData.longitude = Number(longitude);
    if (radiusMeters !== undefined) updateData.radiusMeters = Number(radiusMeters);
    if (name !== undefined) updateData.name = name;
    if (address !== undefined) updateData.address = address;

    const updated = await dbService.updateBranch(id, updateData);

    await createAuditLog({
      userId: payload.userId,
      action: "UPDATE",
      entityName: "branches",
      entityId: id,
      newValues: updateData,
    });

    return NextResponse.json({
      message: "Titik koordinat & radius geofence kantor berhasil diperbarui.",
      branch: updated,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
