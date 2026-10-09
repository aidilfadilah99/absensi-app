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
      return NextResponse.json({ error: "Sesi tidak valid." }, { status: 401 });
    }

    const { descriptor, sampleCount = 3 } = await req.json();

    if (!descriptor || !Array.isArray(descriptor) || descriptor.length !== 128) {
      return NextResponse.json(
        { error: "Vektor embedding wajah tidak valid. Vektor harus berupa array float 128 dimensi." },
        { status: 400 }
      );
    }

    // Save encrypted face template
    const template = await dbService.saveFaceTemplate(payload.userId, descriptor, sampleCount);

    await createAuditLog({
      userId: payload.userId,
      action: "ENROLL_FACE",
      entityName: "face_templates",
      entityId: template.id,
      newValues: { sampleCount, enrolledAt: new Date() },
    });

    return NextResponse.json({
      message: "Pendaftaran wajah (Face Enrollment) berhasil disimpan dengan aman (Terenkripsi AES-256-GCM).",
      templateId: template.id,
      isEnrolled: true,
    });
  } catch (error: any) {
    console.error("Biometric enrollment error:", error);
    return NextResponse.json(
      { error: "Gagal menyimpan biometrik: " + error.message },
      { status: 500 }
    );
  }
}
