import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { dbService } from "@/lib/db-service";
import { signAccessToken, signRefreshToken } from "@/lib/jwt";
import { createAuditLog } from "@/lib/audit";
import { checkRateLimit, getClientIp } from "@/lib/security";

export async function POST(req: Request) {
  try {
    const clientIp = getClientIp(req);
    const rateLimit = checkRateLimit(`login:${clientIp}`, 10, 60_000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: `Terlalu banyak percobaan login dari IP Anda. Silakan tunggu ${rateLimit.retryAfterSeconds} detik.`,
        },
        {
          status: 429,
          headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
        }
      );
    }

    const { identifier, password, deviceId, deviceName, forceBindDevice } = await req.json();

    if (!identifier || !password) {
      return NextResponse.json(
        { error: "Email/NIK dan password wajib diisi." },
        { status: 400 }
      );
    }

    const user = await dbService.findUserByEmailOrNik(String(identifier).trim());
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

    const isMatch = await bcrypt.compare(String(password), user.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { error: "Kredensial tidak valid. Periksa kembali NIK/Email atau kata sandi Anda." },
        { status: 401 }
      );
    }

    // Device binding verification
    const allowSelfDeviceSync = process.env.STRICT_DEVICE_LOCK !== "true";
    let activeDeviceId = user.deviceId;
    if (deviceId) {
      if (!user.deviceId || (forceBindDevice && allowSelfDeviceSync)) {
        const previousDevice = user.deviceId;
        await dbService.bindUserDevice(user.id, deviceId, deviceName || "Web Browser");
        activeDeviceId = deviceId;

        if (previousDevice && previousDevice !== deviceId) {
          await createAuditLog({
            userId: user.id,
            action: "DEVICE_BIND",
            entityName: "users",
            entityId: user.id,
            oldValues: { deviceId: previousDevice },
            newValues: { deviceId, deviceName },
            ipAddress: clientIp,
            userAgent: req.headers.get("user-agent") || undefined,
          });
        }
      } else if (user.deviceId !== deviceId && user.role === "EMPLOYEE") {
        return NextResponse.json(
          {
            error: allowSelfDeviceSync
              ? `Akun ini sebelumnya terikat pada perangkat "${user.deviceName || user.deviceId}". Klik tombol "Sinkronkan ke Perangkat Ini" di bawah jika Anda berpindah dari PC ke HP.`
              : `Akun ini terkunci pada perangkat "${user.deviceName || user.deviceId}". Hubungi HRD untuk persetujuan ganti perangkat.`,
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
      deviceId: activeDeviceId || deviceId,
    };

    const accessToken = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken(tokenPayload);

    await createAuditLog({
      userId: user.id,
      action: "LOGIN",
      entityName: "users",
      entityId: user.id,
      newValues: { deviceId: activeDeviceId || deviceId, deviceName },
      ipAddress: clientIp,
      userAgent: req.headers.get("user-agent") || undefined,
    });

    const activeBiometric = await dbService.getActiveFaceTemplate(user.id);

    const response = NextResponse.json({
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
        deviceId: activeDeviceId || deviceId,
        deviceName: deviceName || user.deviceName,
      },
    });

    // Set HttpOnly cookies for XSS resilience alongside Bearer token response
    const isProdSecure = process.env.NODE_ENV === "production" && process.env.FORCE_HTTPS_COOKIES === "true";
    response.cookies.set("accessToken", accessToken, {
      httpOnly: true,
      secure: isProdSecure,
      sameSite: "lax",
      path: "/",
      maxAge: 8 * 60 * 60,
    });
    response.cookies.set("refreshToken", refreshToken, {
      httpOnly: true,
      secure: isProdSecure,
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });

    return response;
  } catch (error: any) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan internal pada server: " + error.message },
      { status: 500 }
    );
  }
}

