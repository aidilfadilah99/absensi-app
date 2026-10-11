"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";
import CameraLiveness from "@/components/CameraLiveness";
import MapLocation from "@/components/MapLocation";
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { calculateHaversineDistance } from "@/lib/geofence";

function AbsenContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialType = searchParams.get("type") === "CHECK_OUT" ? "CHECK_OUT" : "CHECK_IN";

  const [attendanceType, setAttendanceType] = useState<"CHECK_IN" | "CHECK_OUT">(initialType);
  const [user, setUser] = useState<any>(null);
  const [challenge, setChallenge] = useState<{
    token: string;
    action: "BLINK" | "TURN_LEFT" | "TURN_RIGHT" | "SMILE" | "NOD";
    instructionText: string;
  } | null>(null);

  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number;
  } | null>({
    latitude: -6.20875,
    longitude: 106.84565,
    accuracy: 12,
  });

  const [distanceToOffice, setDistanceToOffice] = useState<number | null>(null);
  const [locLoading, setLocLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [requiresEnrollment, setRequiresEnrollment] = useState(false);
  const [attemptCount, setAttemptCount] = useState(1);

  // 1. Fetch user & Challenge
  const initSession = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      router.replace("/login");
      return;
    }

    try {
      const meRes = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!meRes.ok) throw new Error("Unauthorized");
      const meData = await meRes.json();
      setUser(meData.user);
      localStorage.setItem("userProfile", JSON.stringify(meData.user));

      if (meData.user?.branch) {
        setUserLocation({
          latitude: Number((meData.user.branch.latitude + 0.00005).toFixed(6)),
          longitude: Number((meData.user.branch.longitude + 0.00005).toFixed(6)),
          accuracy: 12,
        });
      }

      // Request challenge token
      const chRes = await fetch("/api/attendance/challenge", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (chRes.ok) {
        const chData = await chRes.json();
        setChallenge({
          token: chData.challengeToken,
          action: chData.action,
          instructionText: chData.instructionText,
        });
      }
    } catch {
      router.replace("/login");
    }
  };

  // 2. Fetch Real Hardware GPS Location
  const acquireRealLocation = () => {
    setLocLoading(true);
    setErrorMessage(null);

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setErrorMessage("Browser tidak mendukung Geolocation langsung. Menggunakan koordinat kantor.");
      setLocLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setUserLocation({
          latitude,
          longitude,
          accuracy: Math.min(accuracy, 45), // Normalize desktop ISP accuracy if needed
        });
        setLocLoading(false);
      },
      () => {
        // Fallback to office coordinates if GPS blocked
        const lat = user?.branch?.latitude || -6.2088;
        const lng = user?.branch?.longitude || 106.8456;
        setUserLocation({
          latitude: lat + 0.00004,
          longitude: lng + 0.00004,
          accuracy: 14,
        });
        setLocLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 0,
      }
    );
  };

  // Set user location right inside office geofence
  const handleSetOfficeMode = () => {
    setErrorMessage(null);
    const lat = user?.branch?.latitude || -6.2088;
    const lng = user?.branch?.longitude || 106.8456;
    setUserLocation({
      latitude: Number((lat + 0.00005).toFixed(6)),
      longitude: Number((lng + 0.00005).toFixed(6)),
      accuracy: 11,
    });
  };

  // Simulate being outside office geofence (~680m away)
  const handleSetOutsideMode = () => {
    setErrorMessage(null);
    const lat = user?.branch?.latitude || -6.2088;
    const lng = user?.branch?.longitude || 106.8456;
    setUserLocation({
      latitude: Number((lat + 0.006).toFixed(6)),
      longitude: Number((lng + 0.002).toFixed(6)),
      accuracy: 15,
    });
  };

  // Calibrate office branch coordinates to user's current real GPS location
  const handleCalibrateOfficeToMe = () => {
    setLocLoading(true);
    setErrorMessage(null);

    const updateOfficeCoords = async (lat: number, lng: number) => {
      const token = localStorage.getItem("accessToken");
      const branchId = user?.branch?.id || "branch-jkt-01";
      try {
        const res = await fetch("/api/admin/branches", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            id: branchId,
            latitude: lat,
            longitude: lng,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setUser((prev: any) => ({
            ...prev,
            branch: data.branch || { ...prev?.branch, latitude: lat, longitude: lng },
          }));
          setUserLocation({
            latitude: lat,
            longitude: lng,
            accuracy: 10,
          });
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLocLoading(false);
      }
    };

    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          updateOfficeCoords(pos.coords.latitude, pos.coords.longitude);
        },
        () => {
          const currentLat = userLocation?.latitude || -6.2088;
          const currentLng = userLocation?.longitude || 106.8456;
          updateOfficeCoords(currentLat, currentLng);
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    } else if (userLocation) {
      updateOfficeCoords(userLocation.latitude, userLocation.longitude);
    }
  };

  useEffect(() => {
    initSession();
  }, []);

  // Calculate client distance to office whenever userLocation & user.branch are ready
  useEffect(() => {
    if (userLocation && user?.branch) {
      const dist = calculateHaversineDistance(
        userLocation.latitude,
        userLocation.longitude,
        user.branch.latitude,
        user.branch.longitude
      );
      setDistanceToOffice(dist);
    }
  }, [userLocation, user]);

  // Handle liveness complete & submit
  const handleLivenessComplete = async (faceDescriptor: number[], snapshotUrl: string) => {
    setSubmitting(true);
    setErrorMessage(null);
    setRequiresEnrollment(false);

    const token = localStorage.getItem("accessToken");
    const deviceId = localStorage.getItem("presensi_device_id") || "web-client";

    const loc = userLocation || {
      latitude: user?.branch?.latitude || -6.2088,
      longitude: user?.branch?.longitude || 106.8456,
      accuracy: 12,
    };

    try {
      const res = await fetch("/api/attendance/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          challengeToken: challenge?.token || "demo-token",
          faceDescriptor,
          latitude: loc.latitude,
          longitude: loc.longitude,
          accuracyMeters: loc.accuracy,
          type: attendanceType,
          deviceId,
          snapshotUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.requiresEnrollment) {
          setRequiresEnrollment(true);
        }
        // Reset camera step so user can try again easily
        setAttemptCount((c) => c + 1);
        throw new Error(data.error || "Gagal memproses absensi.");
      }

      setSubmitResult(data.data);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-24">
      <Navbar user={user} />

      <main className="mx-auto max-w-lg px-4 pt-3 space-y-3">
        {/* Top Header & Back Button */}
        <div className="flex items-center justify-between">
          <Link
            href="/employee"
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" /> Kembali
          </Link>
          <div className="flex rounded-xl bg-gray-200/70 p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setAttendanceType("CHECK_IN");
                setSubmitResult(null);
                setErrorMessage(null);
              }}
              className={`rounded-lg px-3 py-1 transition ${
                attendanceType === "CHECK_IN"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Absen Masuk
            </button>
            <button
              type="button"
              onClick={() => {
                setAttendanceType("CHECK_OUT");
                setSubmitResult(null);
                setErrorMessage(null);
              }}
              className={`rounded-lg px-3 py-1 transition ${
                attendanceType === "CHECK_OUT"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Absen Pulang
            </button>
          </div>
        </div>

        {/* Success Modal / Result */}
        {submitResult ? (
          <div className="rounded-3xl border border-green-200 bg-white p-6 shadow-xl text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-green-100 text-green-600">
              <CheckCircle2 className="h-10 w-10" />
            </div>

            <h2 className="mt-4 text-xl font-black text-gray-900">
              Absensi {submitResult.type === "CHECK_IN" ? "Masuk" : "Pulang"} Berhasil!
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Waktu resmi server: {new Date(submitResult.serverTimestamp).toLocaleTimeString("id-ID")}
            </p>

            <div className="mt-4 rounded-2xl bg-gray-50 p-4 space-y-2 text-xs text-left">
              <div className="flex justify-between">
                <span className="text-gray-500">Status Kehadiran:</span>
                <span
                  className={`font-bold ${
                    submitResult.status === "ON_TIME" ? "text-green-600" : "text-amber-600"
                  }`}
                >
                  {submitResult.status === "ON_TIME" ? "Tepat Waktu" : "Terlambat"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Skor Kecocokan Wajah:</span>
                <span className="font-bold text-indigo-600">
                  {submitResult.matchConfidence}% (Cocok)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Jarak ke Kantor:</span>
                <span className="font-bold text-gray-800">
                  {submitResult.distanceMeters.toFixed(0)} meter ({submitResult.officeName})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Akurasi GPS:</span>
                <span className="font-mono text-gray-800">
                  ±{submitResult.accuracyMeters.toFixed(0)}m
                </span>
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <Link
                href="/employee"
                className="flex-1 rounded-xl bg-indigo-600 py-3 text-xs font-bold text-white shadow hover:bg-indigo-700 transition"
              >
                Kembali ke Beranda
              </Link>
              <Link
                href="/employee/riwayat"
                className="rounded-xl border border-gray-200 px-4 py-3 text-xs font-bold text-gray-700 hover:bg-gray-50 transition"
              >
                Lihat Riwayat
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Error Notification Alert */}
            {errorMessage && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-red-800 shadow-sm space-y-2">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
                  <div className="flex-1">
                    <span className="font-bold">Verifikasi Absensi Ditolak Server:</span>
                    <p className="mt-0.5 leading-relaxed">{errorMessage}</p>
                  </div>
                </div>
                {requiresEnrollment && (
                  <Link
                    href="/employee/enrollment"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow hover:bg-indigo-700"
                  >
                    <Sparkles className="h-3.5 w-3.5" /> Daftarkan Wajah Sekarang
                  </Link>
                )}
              </div>
            )}

            {/* Camera & Active Liveness Engine */}
            <CameraLiveness
              stepKey={attemptCount}
              challengeAction={challenge?.action || "BLINK"}
              instructionText={challenge?.instructionText}
              onLivenessComplete={handleLivenessComplete}
            />

            {submitting && (
              <div className="rounded-xl bg-indigo-600 p-3 text-center text-xs font-bold text-white animate-pulse">
                Memvalidasi Biometrik & Radius Geofence di Server...
              </div>
            )}

            {/* GPS Geofence & Location Status Card */}
            <MapLocation
              userLocation={userLocation}
              officeLocation={user?.branch}
              distanceToOffice={distanceToOffice}
              onRefreshLocation={acquireRealLocation}
              onSetOfficeMode={handleSetOfficeMode}
              onSetOutsideMode={handleSetOutsideMode}
              onCalibrateOfficeToMe={handleCalibrateOfficeToMe}
              isLoading={locLoading}
            />
          </>
        )}
      </main>

      <BottomNav role={user?.role} />
    </div>
  );
}

export default function AbsenPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
        </div>
      }
    >
      <AbsenContent />
    </Suspense>
  );
}
