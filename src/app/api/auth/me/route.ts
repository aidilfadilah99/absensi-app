import { NextResponse } from "next/server";
import { dbService } from "@/lib/db-service";
import { extractTokenFromHeader, verifyAccessToken } from "@/lib/jwt";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return NextResponse.json({ error: "Sesi tidak ditemukan atau kedaluwarsa." }, { status: 401 });
    }

    const payload = verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Token otentikasi tidak valid." }, { status: 401 });
    }

    const user = await dbService.findUserById(payload.userId);
    if (!user) {
      return NextResponse.json({ error: "Pengguna tidak ditemukan." }, { status: 404 });
    }

    const activeBiometric = await dbService.getActiveFaceTemplate(user.id);

    return NextResponse.json({
      user: {
        id: user.id,
        nik: user.nik,
        name: user.name,
        email: user.email,
        role: user.role,
        branch: user.branch,
        shift: user.shift,
        pdpConsentAccepted: user.pdpConsentAccepted,
        isBiometricEnrolled: !!activeBiometric,
        deviceId: user.deviceId,
        deviceName: user.deviceName,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
