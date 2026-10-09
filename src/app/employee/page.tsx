"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";
import PrivacyConsentModal from "@/components/PrivacyConsentModal";
import {
  Clock,
  MapPin,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Camera,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";

export default function EmployeeDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [todayAttendance, setTodayAttendance] = useState<{
    checkIn?: any;
    checkOut?: any;
  }>({});
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState("");
  const [currentDate, setCurrentDate] = useState("");

  // Clock ticker
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
      setCurrentDate(
        now.toLocaleDateString("id-ID", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch user data & today's attendance
  const loadData = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      router.replace("/login");
      return;
    }

    try {
      // Fetch me
      const meRes = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!meRes.ok) throw new Error("Unauthorized");
      const meData = await meRes.json();
      setUser(meData.user);
      localStorage.setItem("userProfile", JSON.stringify(meData.user));

      // Fetch attendances
      const attRes = await fetch("/api/attendance/history", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (attRes.ok) {
        const attData = await attRes.json();
        const todayStr = new Date().toISOString().slice(0, 10);
        const todayList = (attData.attendances || []).filter((a: any) =>
          a.timestampServer.startsWith(todayStr)
        );
        const checkIn = todayList.find((a: any) => a.type === "CHECK_IN");
        const checkOut = todayList.find((a: any) => a.type === "CHECK_OUT");
        setTodayAttendance({ checkIn, checkOut });
      }
    } catch {
      router.replace("/login");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [router]);

  const handleAcceptConsent = async () => {
    const token = localStorage.getItem("accessToken");
    await fetch("/api/auth/consent", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    setUser((prev: any) => ({ ...prev, pdpConsentAccepted: true }));
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-24">
      <Navbar user={user} />

      {/* UU PDP Consent Modal */}
      <PrivacyConsentModal
        isOpen={user && !user.pdpConsentAccepted}
        onAccept={handleAcceptConsent}
      />

      <main className="mx-auto max-w-lg px-4 pt-4 space-y-4">
        {/* Face Enrollment Banner if not registered */}
        {user && !user.isBiometricEnrolled && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white">
                <Camera className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-amber-900">
                  Daftarkan Wajah Anda (Wajib)
                </h3>
                <p className="mt-0.5 text-xs text-amber-800 leading-relaxed">
                  Anda belum merekam template biometrik wajah. Daftarkan sekarang agar dapat melakukan absensi masuk dan pulang.
                </p>
                <Link
                  href="/employee/enrollment"
                  className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow hover:bg-amber-700"
                >
                  <Sparkles className="h-3.5 w-3.5" /> Rekam Wajah Sekarang
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Realtime Clock & Status Card */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-700 via-indigo-600 to-indigo-900 p-6 text-white shadow-xl shadow-indigo-600/20">
          <div className="flex items-center justify-between">
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur-md">
              {currentDate}
            </span>
            <span className="flex items-center gap-1 rounded-full bg-emerald-400/20 px-2.5 py-1 text-xs font-bold text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" /> Realtime Server
            </span>
          </div>

          <div className="my-5 text-center">
            <div className="font-mono text-4xl font-black tracking-tight sm:text-5xl">
              {currentTime}
            </div>
            <p className="mt-1 text-xs text-indigo-200 font-medium">
              Jadwal Kerja: {user?.shift?.name || "Reguler (08:00 - 17:00)"}
            </p>
          </div>

          {/* Quick Action Absen */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Link
              href="/employee/absen?type=CHECK_IN"
              className={`flex flex-col items-center justify-center rounded-2xl p-3.5 text-center transition ${
                todayAttendance.checkIn
                  ? "bg-white/10 text-emerald-200 cursor-default"
                  : "bg-white text-indigo-900 shadow-lg hover:bg-indigo-50 active:scale-95"
              }`}
            >
              <div className="text-xs font-bold uppercase tracking-wider">Absen Masuk</div>
              <div className="mt-1 text-xs font-semibold">
                {todayAttendance.checkIn ? (
                  <span className="flex items-center gap-1 text-emerald-300">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {new Date(todayAttendance.checkIn.timestampServer).toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                ) : (
                  "Klik untuk Absen"
                )}
              </div>
            </Link>

            <Link
              href="/employee/absen?type=CHECK_OUT"
              className={`flex flex-col items-center justify-center rounded-2xl p-3.5 text-center transition ${
                todayAttendance.checkOut
                  ? "bg-white/10 text-emerald-200 cursor-default"
                  : "bg-white/20 text-white hover:bg-white/30 active:scale-95"
              }`}
            >
              <div className="text-xs font-bold uppercase tracking-wider">Absen Pulang</div>
              <div className="mt-1 text-xs font-semibold">
                {todayAttendance.checkOut ? (
                  <span className="flex items-center gap-1 text-emerald-300">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {new Date(todayAttendance.checkOut.timestampServer).toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                ) : (
                  "Klik untuk Pulang"
                )}
              </div>
            </Link>
          </div>
        </div>

        {/* Office & Geofence Info */}
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-indigo-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Lokasi Penugasan
              </h3>
            </div>
            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-600">
              Radius {user?.branch?.radiusMeters || 200}m
            </span>
          </div>

          <div className="mt-3">
            <h4 className="text-sm font-bold text-gray-900">{user?.branch?.name || "Kantor Pusat"}</h4>
            <p className="mt-0.5 text-xs text-gray-500">{user?.branch?.address || "Jakarta Selatan"}</p>
          </div>
        </div>

        {/* Quick Menu Links */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/employee/izin"
            className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-4 shadow-sm hover:border-indigo-100 hover:shadow-md transition"
          >
            <div>
              <div className="text-xs font-bold uppercase text-gray-400">Pengajuan</div>
              <div className="text-sm font-bold text-gray-900 mt-0.5">Izin / Sakit</div>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </Link>

          <Link
            href="/employee/riwayat"
            className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-4 shadow-sm hover:border-indigo-100 hover:shadow-md transition"
          >
            <div>
              <div className="text-xs font-bold uppercase text-gray-400">Laporan</div>
              <div className="text-sm font-bold text-gray-900 mt-0.5">Riwayat Absen</div>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </Link>
        </div>

        {/* Security Device Info Badge */}
        <div className="rounded-2xl border border-slate-200 bg-slate-100 p-3 text-[11px] text-slate-600 flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-medium">
            <ShieldCheck className="h-4 w-4 text-indigo-600" /> Device Terkunci: {user?.deviceName || "Perangkat Terdaftar"}
          </span>
          <Link href="/employee/enrollment" className="text-indigo-600 font-bold hover:underline">
            Ulangi Wajah
          </Link>
        </div>
      </main>

      <BottomNav role={user?.role} />
    </div>
  );
}
