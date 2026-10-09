import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { dbService } from "@/lib/db-service";
import { signAccessToken, signRefreshToken } from "@/lib/jwt";
import { createAuditLog } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const { identifier, password, deviceId, deviceName } = await req.json();

    if (!identifier || !password) {
      return NextResponse.json(
        { error: "Email/NIK dan password wajib diisi." },
        { status: 400 }
      );
    }

    const user = await dbService.findUserByEmailOrNik(identifier);
    if (!user) {
      return NextResponse.json(
        { error: "Kredensial tidak valid. Periksa kembali NIK/Email atau kata sandi Anda." },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: "Akun Anda dinonaktifkan oleh administrator. Hubungi HRD." },
        { status: 403 }
      );
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { error: "Kredensial tidak valid. Periksa kembali NIK/Email atau kata sandi Anda." },
        { status: 401 }
      );
    }

    // Device binding verification
    let deviceBound = false;
    let deviceWarning: string | null = null;

    if (deviceId) {
      if (!user.deviceId) {
        // First login on this device -> automatically bind device to this account
        await dbService.bindUserDevice(user.id, deviceId, deviceName || "Unknown Device");
        deviceBound = true;
      } else if (user.deviceId !== deviceId && user.role === "EMPLOYEE") {
        // Logged in from a different device than registered
        return NextResponse.json(
          {
            error: "Perangkat ini tidak terdaftar untuk akun Anda. Demi keamanan, satu akun terikat pada satu perangkat terdaftar. Ajukan pergantian perangkat ke HRD.",
            isDeviceMismatch: true,
            registeredDevice: user.deviceName || "Perangkat Lama",
          },
          { status: 403 }
        );
      }
    }

    const tokenPayload = {
      userId: user.id,
      email: user.email,
      nik: user.nik,
      name: user.name,
      role: user.role,
      branchId: user.branchId,
      shiftId: user.shiftId,
      deviceId: user.deviceId || deviceId,
    };

    const accessToken = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken(tokenPayload);

    // Audit log
    await createAuditLog({
      userId: user.id,
      action: "LOGIN",
      entityName: "users",
      entityId: user.id,
      newValues: { deviceId, deviceName },
    });

    // Check if biometric enrolled
    const activeBiometric = await dbService.getActiveFaceTemplate(user.id);

    return NextResponse.json({
      message: "Login berhasil.",
      accessToken,
      refreshToken,
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
        deviceId: user.deviceId || deviceId,
      },
    });
  } catch (error: any) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan internal pada server: " + error.message },
      { status: 500 }
    );
  }
}
