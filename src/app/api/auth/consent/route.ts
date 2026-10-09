import { NextResponse } from "next/server";
import { dbService } from "@/lib/db-service";
import { extractTokenFromHeader, verifyAccessToken } from "@/lib/jwt";
import { createAuditLog } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Token expired or invalid" }, { status: 401 });
    }

    await dbService.updateUserConsent(payload.userId);

    await createAuditLog({
      userId: payload.userId,
      action: "UPDATE",
      entityName: "users",
      entityId: payload.userId,
      newValues: { pdpConsentAccepted: true, consentTimestamp: new Date() },
    });

    return NextResponse.json({
      message: "Persetujuan pemrosesan data biometrik dan lokasi (UU PDP) berhasil disimpan.",
      pdpConsentAccepted: true,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
