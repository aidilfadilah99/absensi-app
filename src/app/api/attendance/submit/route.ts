import { NextResponse } from "next/server";
import { dbService } from "@/lib/db-service";
import { extractTokenFromHeader, verifyAccessToken } from "@/lib/jwt";
import { verifyAndConsumeChallenge } from "@/lib/liveness";
import { validateGeofenceAndLocation, checkSpeedAnomaly } from "@/lib/geofence";
import { calculateEuclideanDistance, evaluateFaceMatch } from "@/lib/crypto";
import { createAuditLog } from "@/lib/audit";
import { checkRateLimit, getClientIp, getZonedDateTimeParts } from "@/lib/security";

export async function POST(req: Request) {
  try {
    const clientIp = getClientIp(req);
    const rate = checkRateLimit(`attendance_submit:${clientIp}`, 15, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        {
          error: `Terlalu banyak permintaan absensi. Silakan coba lagi dalam ${rate.retryAfterSeconds} detik.`,
        },
        { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } }
      );
    }

    const token = extractTokenFromHeader(
      req.headers.get("authorization"),
      req.headers.get("cookie")
    );

    if (!token) {
      return NextResponse.json({ error: "Sesi tidak ditemukan atau kedaluwarsa." }, { status: 401 });
    }

    const payload = verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Sesi tidak valid." }, { status: 401 });
    }

    const body = await req.json();
    const {
      challengeToken,
      faceDescriptor,
      latitude,
      longitude,
      accuracyMeters,
      type = "CHECK_IN",
      deviceId,
      snapshotUrl,
      notes,
    } = body;

    // 1. Validasi Vektor Biometrik Wajah (128-dimensi Float)
    if (
      !faceDescriptor ||
      !Array.isArray(faceDescriptor) ||
      faceDescriptor.length !== 128 ||
      !faceDescriptor.every((v) => typeof v === "number" && Number.isFinite(v))
    ) {
      return NextResponse.json(
        { error: "Vektor wajah tidak terdeteksi atau tidak valid. Pastikan wajah terlihat jelas di kamera." },
        { status: 400 }
      );
    }

    // 2. Ambil data user & lokasi kantor
    const user = await dbService.findUserById(payload.userId);
    if (!user) {
      return NextResponse.json({ error: "Data karyawan tidak ditemukan." }, { status: 404 });
    }

    const branches = await dbService.getAllBranches();
    const branch =
      branches.find((b) => b.id === user.branchId) ||
      branches[0] || {
        id: "branch-jkt-01",
        latitude: -6.2088,
        longitude: 106.8456,
        radiusMeters: 250,
        name: "Kantor Pusat Jakarta",
        timezone: "Asia/Jakarta",
      };

    // 3. Validasi Geofence & Akurasi GPS
    const geoValidation = validateGeofenceAndLocation(
      Number(latitude),
      Number(longitude),
      Number(accuracyMeters || 12),
      branch.latitude,
      branch.longitude,
      branch.radiusMeters
    );

    if (geoValidation.isMockLocationSuspected) {
      return NextResponse.json(
        {
          error: `Lokasi mencurigakan terdeteksi: ${geoValidation.mockReason}. Harap matikan aplikasi Mock GPS / Fake Location.`,
          securityAlert: "MOCK_GPS_DETECTED",
        },
        { status: 400 }
      );
    }

    if (!geoValidation.isAccuracyAcceptable) {
      return NextResponse.json(
        {
          error: `Akurasi sinyal GPS Anda terlalu buruk (±${Number(accuracyMeters).toFixed(0)} meter). Maksimal toleransi adalah ${process.env.MAX_GPS_ACCURACY_METERS || 100} meter. Klik tombol "Di Kantor" atau "Kalibrasi GPS" pada kartu peta di bawah.`,
          accuracyMeters,
          requiredAccuracy: Number(process.env.MAX_GPS_ACCURACY_METERS) || 100,
        },
        { status: 400 }
      );
    }

    if (!geoValidation.isWithinGeofence) {
      return NextResponse.json(
        {
          error: `Anda berada di luar radius kantor (${geoValidation.distanceMeters.toFixed(0)} meter dari ${branch.name}). Maksimal radius yang diizinkan adalah ${branch.radiusMeters} meter. Klik tombol "Di Kantor" atau "Kalibrasi GPS" untuk menyesuaikan lokasi pengujian.`,
          distanceMeters: geoValidation.distanceMeters,
          radiusMeters: branch.radiusMeters,
          officeName: branch.name,
        },
        { status: 400 }
      );
    }

    // 4. Validasi Pencocokan Wajah dengan Template Terdaftar (Server-Side Matching)
    const storedDescriptor = await dbService.getActiveFaceTemplate(user.id);
    if (!storedDescriptor) {
      return NextResponse.json(
        {
          error: "Anda belum mendaftarkan wajah (Face Enrollment). Silakan klik tombol 'Daftarkan Wajah Sekarang' di bawah.",
          requiresEnrollment: true,
        },
        { status: 400 }
      );
    }

    const distance = calculateEuclideanDistance(faceDescriptor, storedDescriptor);
    const matchEvaluation = evaluateFaceMatch(distance);

    if (!matchEvaluation.isMatch) {
      return NextResponse.json(
        {
          error: `Verifikasi wajah gagal. Jarak kemiripan tidak mencukupi (Skor: ${matchEvaluation.confidencePercentage}%, Jarak: ${matchEvaluation.distance}). Pastikan wajah Anda menghadap kamera dengan pencahayaan yang cukup.`,
          matchScore: matchEvaluation.confidencePercentage,
          distance: matchEvaluation.distance,
        },
        { status: 401 }
      );
    }

    // 5. Verifikasi Liveness Challenge Token (Anti-Replay & User Binding)
    if (!challengeToken) {
      return NextResponse.json(
        { error: "Token tantangan liveness wajib disertakan untuk mencegah pemalsuan absensi." },
        { status: 400 }
      );
    }

    const livenessResult = verifyAndConsumeChallenge(challengeToken, payload.userId);
    if (!livenessResult.isValid) {
      return NextResponse.json(
        { error: livenessResult.error || "Verifikasi liveness gagal atau sesi telah kedaluwarsa." },
        { status: 401 }
      );
    }

    // 6. Cek Idempotensi Absen Harian & Anomali Kecepatan Perpindahan Lokasi (Impossible Travel)
    const serverTime = new Date();
    const branchTimezone = (branch as any).timezone || "Asia/Jakarta";
    const currentZoned = getZonedDateTimeParts(serverTime, branchTimezone);

    const recentAttendances = await dbService.getUserAttendances(user.id, 10);
    if (process.env.ALLOW_DUPLICATE_ATTENDANCE !== "true") {
      const duplicateSameDay = recentAttendances.find((a: any) => {
        const attZoned = getZonedDateTimeParts(new Date(a.timestampServer), branchTimezone);
        return a.type === type && attZoned.dateStr === currentZoned.dateStr;
      });

      if (duplicateSameDay) {
        return NextResponse.json(
          {
            error: `Anda sudah tercatat melakukan Absen ${type === "CHECK_IN" ? "Masuk" : "Pulang"} pada hari ini (${currentZoned.dateStr}). Pilih tab "${type === "CHECK_IN" ? "Absen Pulang" : "Lihat Riwayat"}" jika ingin melanjutkan.`,
          },
          { status: 409 }
        );
      }
    }

    if (recentAttendances.length > 0) {
      const latestRecord = recentAttendances[0];
      const prevTime = new Date(latestRecord.timestampServer);
      const elapsedSec = (serverTime.getTime() - prevTime.getTime()) / 1000;

      // Only evaluate speed anomaly if previous record was more than 30 seconds ago on the same day
      if (elapsedSec > 30 && elapsedSec < 12 * 3600) {
        const speedCheck = checkSpeedAnomaly(
          Number(latestRecord.latitude),
          Number(latestRecord.longitude),
          prevTime,
          Number(latitude),
          Number(longitude),
          serverTime
        );
        if (speedCheck.isAnomaly) {
          return NextResponse.json(
            {
              error: `Terdeteksi perpindahan lokasi tidak wajar (Impossible Travel: ${speedCheck.speedKmh} km/jam dari lokasi absen sebelumnya).`,
              securityAlert: "IMPOSSIBLE_TRAVEL_DETECTED",
            },
            { status: 400 }
          );
        }
      }
    }

    // 7. Evaluasi Status Kehadiran Terhadap Shift Menggunakan Timezone Cabang Kantor
    let attendanceStatus: "ON_TIME" | "LATE" | "EARLY_DEPARTURE" = "ON_TIME";

    if (user.shift) {
      if (type === "CHECK_IN") {
        const [shiftH, shiftM] = user.shift.startTime.split(":").map(Number);
        const shiftStartTotalMinutes = shiftH * 60 + shiftM;
        const tolerance = user.shift.lateToleranceMinutes || 15;

        if (currentZoned.totalMinutes > shiftStartTotalMinutes + tolerance) {
          attendanceStatus = "LATE";
        }
      } else if (type === "CHECK_OUT") {
        const [shiftH, shiftM] = user.shift.endTime.split(":").map(Number);
        const shiftEndTotalMinutes = shiftH * 60 + shiftM;

        if (currentZoned.totalMinutes < shiftEndTotalMinutes) {
          attendanceStatus = "EARLY_DEPARTURE";
        }
      }
    }

    // 8. Simpan Absensi ke Database
    const attendance = await dbService.createAttendance({
      userId: user.id,
      branchId: branch.id,
      shiftId: user.shiftId,
      type,
      status: attendanceStatus,
      latitude: Number(latitude),
      longitude: Number(longitude),
      accuracyMeters: Number(accuracyMeters || 12),
      distanceToOfficeMeters: geoValidation.distanceMeters,
      isWithinGeofence: true,
      isMockLocationDetected: false,
      faceMatchScore: matchEvaluation.distance,
      livenessVerified: true,
      deviceId: deviceId || user.deviceId || "web-client",
      ipAddress: clientIp,
      userAgent: req.headers.get("user-agent") || undefined,
      snapshotUrl: snapshotUrl || null,
      notes: notes || null,
    });

    // 9. Catat Audit Log
    await createAuditLog({
      userId: user.id,
      action: "CREATE",
      entityName: "attendances",
      entityId: attendance.id,
      newValues: {
        type,
        status: attendanceStatus,
        distanceMeters: geoValidation.distanceMeters,
        faceMatchDistance: matchEvaluation.distance,
        livenessAction: livenessResult.action,
        serverTime: serverTime.toISOString(),
      },
      ipAddress: clientIp,
      userAgent: req.headers.get("user-agent") || undefined,
    });

    return NextResponse.json({
      success: true,
      message: `Presensi ${type === "CHECK_IN" ? "Masuk" : "Pulang"} Berhasil Tercatat!`,
      data: {
        id: attendance.id,
        type,
        status: attendanceStatus,
        serverTimestamp: serverTime.toISOString(),
        officeName: branch.name,
        distanceMeters: geoValidation.distanceMeters,
        accuracyMeters: Number(accuracyMeters || 12),
        matchConfidence: matchEvaluation.confidencePercentage,
        matchDistance: matchEvaluation.distance,
      },
    });
  } catch (error: any) {
    console.error("Attendance submission error:", error);
    return NextResponse.json(
      { error: "Gagal memproses absensi: " + error.message },
      { status: 500 }
    );
  }
}

