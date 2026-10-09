"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";
import {
  FileSpreadsheet,
  Download,
  Filter,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

export default function LaporanPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [attendances, setAttendances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  const loadData = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) return router.replace("/login");

    const userStr = localStorage.getItem("userProfile");
    if (userStr) setUser(JSON.parse(userStr));

    try {
      const url = statusFilter
        ? `/api/admin/attendances?status=${statusFilter}`
        : "/api/admin/attendances";
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setAttendances(data.attendances || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [router, statusFilter]);

  const exportToCSV = () => {
    if (attendances.length === 0) return alert("Tidak ada data untuk diekspor.");

    const headers = [
      "ID",
      "Tanggal",
      "Jam Server",
      "NIK",
      "Nama Karyawan",
      "Cabang",
      "Tipe Absen",
      "Status",
      "Jarak ke Kantor (m)",
      "Akurasi GPS (m)",
      "Skor Biometrik Wajah",
      "Device ID",
      "IP Address",
    ];

    const rows = attendances.map((a) => {
      const d = new Date(a.timestampServer);
      return [
        a.id,
        d.toISOString().slice(0, 10),
        d.toLocaleTimeString("id-ID"),
        `"${a.user?.nik || ""}"`,
        `"${a.user?.name || ""}"`,
        `"${a.branch?.name || ""}"`,
        a.type === "CHECK_IN" ? "MASUK" : "PULANG",
        a.status === "ON_TIME" ? "TEPAT WAKTU" : "TERLAMBAT",
        a.distanceToOfficeMeters.toFixed(0),
        a.accuracyMeters.toFixed(0),
        a.faceMatchScore,
        `"${a.deviceId}"`,
        a.ipAddress,
      ];
    });

    const csvContent =
      "\uFEFF" + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `Laporan_Presensi_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-24">
      <Navbar user={user} />

      <main className="mx-auto max-w-5xl px-4 pt-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 mb-1"
            >
              <ArrowLeft className="h-4 w-4" /> Kembali ke Dashboard
            </Link>
            <h1 className="text-2xl font-black text-gray-900">Rekapitulasi Laporan Presensi</h1>
            <p className="text-xs text-gray-500">
              Filter data kehadiran dan unduh laporan resmi format Excel/CSV.
            </p>
          </div>

          <button
            onClick={exportToCSV}
            className="flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-green-700 transition"
          >
            <Download className="h-4 w-4" /> Ekspor ke Excel (CSV)
          </button>
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm text-xs">
          <Filter className="h-4 w-4 text-gray-400" />
          <span className="font-semibold text-gray-600">Filter Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-gray-200 px-3 py-1.5 focus:border-indigo-600 focus:outline-none"
          >
            <option value="">Semua Status</option>
            <option value="ON_TIME">Tepat Waktu</option>
            <option value="LATE">Terlambat</option>
          </select>
          <span className="text-gray-400 text-[11px] ml-auto">
            Total {attendances.length} catatan ditemukan
          </span>
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 uppercase font-semibold text-[10px]">
                <tr>
                  <th className="p-3">Tanggal & Jam</th>
                  <th className="p-3">Karyawan</th>
                  <th className="p-3">Cabang</th>
                  <th className="p-3">Tipe</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Jarak</th>
                  <th className="p-3">Akurasi GPS</th>
                  <th className="p-3">Biometrik</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {attendances.map((a) => {
                  const d = new Date(a.timestampServer);
                  return (
                    <tr key={a.id} className="hover:bg-gray-50/50">
                      <td className="p-3 font-mono">
                        <div>{d.toLocaleDateString("id-ID")}</div>
                        <div className="text-[10px] text-gray-400">
                          {d.toLocaleTimeString("id-ID")}
                        </div>
                      </td>
                      <td className="p-3 font-semibold text-gray-900">
                        {a.user?.name}
                        <div className="text-[10px] text-gray-400 font-mono font-normal">
                          {a.user?.nik}
                        </div>
                      </td>
                      <td className="p-3">{a.branch?.name}</td>
                      <td className="p-3 font-bold">
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] ${
                            a.type === "CHECK_IN"
                              ? "bg-indigo-50 text-indigo-700"
                              : "bg-purple-50 text-purple-700"
                          }`}
                        >
                          {a.type === "CHECK_IN" ? "MASUK" : "PULANG"}
                        </span>
                      </td>
                      <td className="p-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            a.status === "ON_TIME"
                              ? "bg-green-50 text-green-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {a.status === "ON_TIME" ? "Tepat Waktu" : "Terlambat"}
                        </span>
                      </td>
                      <td className="p-3">{a.distanceToOfficeMeters.toFixed(0)} m</td>
                      <td className="p-3 font-mono">±{a.accuracyMeters.toFixed(0)}m</td>
                      <td className="p-3 text-indigo-600 font-mono">Jarak: {a.faceMatchScore}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <BottomNav role={user?.role} />
    </div>
  );
}
