"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";
import {
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  Building2,
  FileSpreadsheet,
  Shield,
  ArrowUpRight,
  Check,
  X,
} from "lucide-react";

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<any>({
    totalEmployees: 0,
    presentCount: 0,
    onTimeCount: 0,
    lateCount: 0,
    absentCount: 0,
    attendanceRate: 0,
  });
  const [recentAttendances, setRecentAttendances] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAll = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      router.replace("/login");
      return;
    }
    const userStr = localStorage.getItem("userProfile");
    if (userStr) {
      const u = JSON.parse(userStr);
      if (u.role !== "HR_ADMIN" && u.role !== "SUPERADMIN") {
        router.replace("/employee");
        return;
      }
      setUser(u);
    }

    try {
      const [statsData, attData, leavesData] = await Promise.all([
        fetch("/api/admin/stats", { headers: { Authorization: `Bearer ${token}` } }).then((r) =>
          r.json()
        ),
        fetch("/api/admin/attendances", { headers: { Authorization: `Bearer ${token}` } }).then((r) =>
          r.json()
        ),
        fetch("/api/leaves", { headers: { Authorization: `Bearer ${token}` } }).then((r) =>
          r.json()
        ),
      ]);

      if (statsData.stats) setStats(statsData.stats);
      if (attData.attendances) setRecentAttendances(attData.attendances.slice(0, 8));
      if (leavesData.leaves) setLeaves(leavesData.leaves);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [router]);

  const handleLeaveApproval = async (id: string, status: "APPROVED" | "REJECTED") => {
    const token = localStorage.getItem("accessToken");
    try {
      const res = await fetch("/api/leaves", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) {
        loadAll();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-24">
      <Navbar user={user} />

      <main className="mx-auto max-w-5xl px-4 pt-6 space-y-6">
        {/* Welcome Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 p-6 text-white shadow-xl">
          <div>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur-md">
              Panel Pengawasan HRD & Administrator
            </span>
            <h1 className="mt-3 text-2xl font-black">Ringkasan Presensi Hari Ini</h1>
            <p className="mt-1 text-xs text-indigo-200">
              Monitoring kehadiran karyawan berbasis verifikasi biometrik dan geofence GPS real-time.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/laporan"
              className="flex items-center gap-1.5 rounded-xl bg-white/10 px-4 py-2.5 text-xs font-bold text-white backdrop-blur-md hover:bg-white/20 transition"
            >
              <FileSpreadsheet className="h-4 w-4" /> Ekspor Laporan
            </Link>
            <Link
              href="/admin/karyawan"
              className="flex items-center gap-1.5 rounded-xl bg-indigo-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg hover:bg-indigo-600 transition"
            >
              <Users className="h-4 w-4" /> Kelola Karyawan
            </Link>
          </div>
        </div>

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500">Total Karyawan</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-black text-gray-900">{stats.totalEmployees}</div>
            <p className="mt-1 text-[11px] text-gray-500">Terdaftar di sistem</p>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500">Hadir Hari Ini</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-50 text-green-600">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-black text-green-600">{stats.presentCount}</div>
            <p className="mt-1 text-[11px] text-green-600 font-semibold">{stats.attendanceRate}% Kehadiran</p>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500">Tepat Waktu</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-black text-gray-900">{stats.onTimeCount}</div>
            <p className="mt-1 text-[11px] text-gray-500">Sesuai jam shift</p>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500">Terlambat</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <AlertCircle className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-black text-amber-600">{stats.lateCount}</div>
            <p className="mt-1 text-[11px] text-amber-600">Di luar toleransi</p>
          </div>
        </div>

        {/* Quick Management Links */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Link
            href="/admin/karyawan"
            className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-4 shadow-sm hover:border-indigo-200 transition"
          >
            <div>
              <div className="text-xs text-gray-400 font-bold uppercase">Manajemen</div>
              <div className="text-sm font-bold text-gray-900 mt-0.5">Karyawan & Wajah</div>
            </div>
            <ArrowUpRight className="h-4 w-4 text-gray-400" />
          </Link>

          <Link
            href="/admin/cabang"
            className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-4 shadow-sm hover:border-indigo-200 transition"
          >
            <div>
              <div className="text-xs text-gray-400 font-bold uppercase">Geofence</div>
              <div className="text-sm font-bold text-gray-900 mt-0.5">Cabang & Radius</div>
            </div>
            <Building2 className="h-4 w-4 text-gray-400" />
          </Link>

          <Link
            href="/admin/laporan"
            className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-4 shadow-sm hover:border-indigo-200 transition"
          >
            <div>
              <div className="text-xs text-gray-400 font-bold uppercase">Rekapitulasi</div>
              <div className="text-sm font-bold text-gray-900 mt-0.5">Laporan Presensi</div>
            </div>
            <FileSpreadsheet className="h-4 w-4 text-gray-400" />
          </Link>

          <Link
            href="/admin/audit-log"
            className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-4 shadow-sm hover:border-indigo-200 transition"
          >
            <div>
              <div className="text-xs text-gray-400 font-bold uppercase">Keamanan</div>
              <div className="text-sm font-bold text-gray-900 mt-0.5">Audit Log</div>
            </div>
            <Shield className="h-4 w-4 text-gray-400" />
          </Link>
        </div>

        {/* Pending Leave Approvals if any */}
        {leaves.length > 0 && (
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold text-gray-900">Permohonan Izin / Sakit Karyawan</h2>
            <p className="text-xs text-gray-500">Persetujuan izin, cuti, dan dinas luar</p>

            <div className="mt-3 space-y-2">
              {leaves.slice(0, 5).map((l) => (
                <div
                  key={l.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50/70 p-3 text-xs"
                >
                  <div>
                    <span className="font-bold text-gray-900">{l.user?.name || "Karyawan"}</span>
                    <span className="mx-1.5 text-gray-400">•</span>
                    <span className="font-semibold text-indigo-600">{l.type}</span>
                    <span className="ml-2 text-gray-500">
                      ({new Date(l.startDate).toLocaleDateString("id-ID")} s/d{" "}
                      {new Date(l.endDate).toLocaleDateString("id-ID")})
                    </span>
                    <p className="mt-1 text-gray-600 italic">&quot;{l.reason}&quot;</p>
                  </div>

                  <div className="flex items-center gap-2">
                    {l.status === "PENDING" ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleLeaveApproval(l.id, "APPROVED")}
                          className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 font-bold text-white hover:bg-green-700"
                        >
                          <Check className="h-3.5 w-3.5" /> Setujui
                        </button>
                        <button
                          type="button"
                          onClick={() => handleLeaveApproval(l.id, "REJECTED")}
                          className="flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 font-bold text-white hover:bg-red-700"
                        >
                          <X className="h-3.5 w-3.5" /> Tolak
                        </button>
                      </>
                    ) : (
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          l.status === "APPROVED"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {l.status === "APPROVED" ? "Disetujui" : "Ditolak"}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Live Attendance Stream Table */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Aktivitas Absensi Terbaru</h2>
              <p className="text-xs text-gray-500">Waktu server, kecocokan biometrik & jarak kantor</p>
            </div>
            <Link href="/admin/laporan" className="text-xs font-bold text-indigo-600 hover:underline">
              Lihat Semua
            </Link>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 uppercase font-semibold text-[10px]">
                <tr>
                  <th className="p-3">Karyawan</th>
                  <th className="p-3">Waktu Server</th>
                  <th className="p-3">Tipe</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Jarak Geofence</th>
                  <th className="p-3">Skor Wajah</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {recentAttendances.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-gray-400">
                      Belum ada catatan absensi hari ini.
                    </td>
                  </tr>
                ) : (
                  recentAttendances.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50/50">
                      <td className="p-3 font-semibold text-gray-900">
                        {item.user?.name || "Karyawan"}
                        <div className="text-[10px] text-gray-400 font-mono font-normal">
                          {item.user?.nik}
                        </div>
                      </td>
                      <td className="p-3 font-mono">
                        {new Date(item.timestampServer).toLocaleTimeString("id-ID")}
                      </td>
                      <td className="p-3 font-bold">
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] ${
                            item.type === "CHECK_IN"
                              ? "bg-indigo-50 text-indigo-700"
                              : "bg-purple-50 text-purple-700"
                          }`}
                        >
                          {item.type === "CHECK_IN" ? "MASUK" : "PULANG"}
                        </span>
                      </td>
                      <td className="p-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            item.status === "ON_TIME"
                              ? "bg-green-50 text-green-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {item.status === "ON_TIME" ? "Tepat Waktu" : "Terlambat"}
                        </span>
                      </td>
                      <td className="p-3">
                        {item.distanceToOfficeMeters.toFixed(0)} m
                        <span className="text-[10px] text-gray-400 ml-1">
                          (±{item.accuracyMeters.toFixed(0)}m)
                        </span>
                      </td>
                      <td className="p-3 text-indigo-600 font-mono font-semibold">
                        Jarak: {item.faceMatchScore}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <BottomNav role={user?.role} />
    </div>
  );
}
