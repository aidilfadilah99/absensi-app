"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";
import { Shield, ArrowLeft, Lock, RefreshCw, Key } from "lucide-react";

export default function AuditLogPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) return router.replace("/login");

    const userStr = localStorage.getItem("userProfile");
    if (userStr) setUser(JSON.parse(userStr));

    try {
      const res = await fetch("/api/admin/audit-logs", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setLogs(data.auditLogs || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-24">
      <Navbar user={user} />

      <main className="mx-auto max-w-5xl px-4 pt-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 mb-1"
            >
              <ArrowLeft className="h-4 w-4" /> Kembali ke Dashboard
            </Link>
            <h1 className="text-2xl font-black text-gray-900">Log Audit Keamanan</h1>
            <p className="text-xs text-gray-500">
              Jejak rekaman aktivitas sistem yang tidak dapat diubah (Immutable Security Trail).
            </p>
          </div>

          <button
            onClick={loadData}
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>

        {/* Security Info Card */}
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 text-xs text-indigo-900 flex items-start gap-3">
          <Shield className="h-5 w-5 shrink-0 text-indigo-600 mt-0.5" />
          <div>
            <span className="font-bold">Standar Forensik & Akuntabilitas (UU PDP):</span>
            <p className="mt-0.5 text-indigo-800">
              Setiap aktivitas sensitif—termasuk login, enrollment biometrik wajah, penambahan karyawan, dan reset template—dicatat bersama stempel waktu server resmi dan alamat IP asal.
            </p>
          </div>
        </div>

        {/* Table Audit Logs */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 uppercase font-semibold text-[10px]">
                <tr>
                  <th className="p-3">Waktu Server</th>
                  <th className="p-3">Aksi</th>
                  <th className="p-3">Pelaku / Pengguna</th>
                  <th className="p-3">Entitas</th>
                  <th className="p-3">IP Address</th>
                  <th className="p-3">Detail Perubahan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-gray-400">
                      Belum ada catatan log aktivitas.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => {
                    const d = new Date(log.createdAt);
                    return (
                      <tr key={log.id} className="hover:bg-gray-50/50">
                        <td className="p-3 font-mono">
                          {d.toLocaleDateString("id-ID")} {d.toLocaleTimeString("id-ID")}
                        </td>
                        <td className="p-3">
                          <span
                            className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                              log.action === "LOGIN"
                                ? "bg-blue-50 text-blue-700"
                                : log.action === "ENROLL_FACE"
                                ? "bg-green-50 text-green-700"
                                : log.action === "RESET_FACE"
                                ? "bg-red-50 text-red-700"
                                : "bg-purple-50 text-purple-700"
                            }`}
                          >
                            {log.action}
                          </span>
                        </td>
                        <td className="p-3 font-semibold text-gray-900">
                          {log.user?.name || "Sistem"}
                          <div className="text-[10px] text-gray-400 font-mono font-normal">
                            {log.user?.nik || "-"}
                          </div>
                        </td>
                        <td className="p-3 font-mono text-gray-600">{log.entityName}</td>
                        <td className="p-3 font-mono text-gray-500">{log.ipAddress}</td>
                        <td className="p-3 font-mono text-[10px] text-gray-600 max-w-xs truncate">
                          {log.newValues || "-"}
                        </td>
                      </tr>
                    );
                  })
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
