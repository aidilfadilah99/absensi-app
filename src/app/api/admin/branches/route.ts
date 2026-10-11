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
    const token = extractTokenFromHeader(
      req.headers.get("authorization"),
      req.headers.get("cookie")
    );

    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const payload = verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Sesi tidak valid." }, { status: 401 });
    }

    const body = await req.json();
    const { id, latitude, longitude, radiusMeters, name, address, isCalibration } = body;

    if (!id) {
      return NextResponse.json({ error: "ID cabang wajib diisi." }, { status: 400 });
    }

    const isAdmin = payload.role === "HR_ADMIN" || payload.role === "SUPERADMIN";
    const allowDemoCalibration =
      isCalibration === true && process.env.ALLOW_DEMO_CALIBRATION !== "false";

    if (!isAdmin && !allowDemoCalibration) {
      return NextResponse.json(
        { error: "Forbidden: Hanya Administrator/HRD yang diizinkan mengubah konfigurasi cabang kantor." },
        { status: 403 }
      );
    }

    const updateData: any = {};

    if (latitude !== undefined) {
      const latNum = Number(latitude);
      if (isNaN(latNum) || latNum < -90 || latNum > 90) {
        return NextResponse.json({ error: "Nilai latitude tidak valid (-90 s/d 90)." }, { status: 400 });
      }
      updateData.latitude = latNum;
    }

    if (longitude !== undefined) {
      const lngNum = Number(longitude);
      if (isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
        return NextResponse.json({ error: "Nilai longitude tidak valid (-180 s/d 180)." }, { status: 400 });
      }
      updateData.longitude = lngNum;
    }

    // Only HR_ADMIN or SUPERADMIN can alter radius, branch name, or address
    if (isAdmin) {
      if (radiusMeters !== undefined) {
        const radNum = Number(radiusMeters);
        if (isNaN(radNum) || radNum < 10 || radNum > 5000) {
          return NextResponse.json(
            { error: "Radius geofence harus berada di antara 10 hingga 5000 meter." },
            { status: 400 }
          );
        }
        updateData.radiusMeters = radNum;
      }
      if (name !== undefined) updateData.name = String(name).trim();
      if (address !== undefined) updateData.address = String(address).trim();
    }

    const updated = await dbService.updateBranch(id, updateData);

    await createAuditLog({
      userId: payload.userId,
      action: "UPDATE",
      entityName: "branches",
      entityId: id,
      newValues: { ...updateData, isCalibration: !!isCalibration },
    });

    return NextResponse.json({
      message: "Titik koordinat & radius geofence kantor berhasil diperbarui.",
      branch: updated,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

