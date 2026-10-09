"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ArrowLeft,
  ChevronRight,
} from "lucide-react";

export default function RiwayatPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [attendances, setAttendances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      router.replace("/login");
      return;
    }
    const userStr = localStorage.getItem("userProfile");
    if (userStr) setUser(JSON.parse(userStr));

    fetch("/api/attendance/history", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setAttendances(data.attendances || []);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-24">
      <Navbar user={user} />

      <main className="mx-auto max-w-lg px-4 pt-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-gray-900">Riwayat Absensi</h1>
            <p className="text-xs text-gray-500">Log kehadiran terverifikasi biometrik & GPS</p>
          </div>
          <Link
            href="/employee"
            className="flex items-center gap-1 text-xs font-semibold text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" /> Beranda
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          </div>
        ) : attendances.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
            <Calendar className="mx-auto h-10 w-10 text-gray-400" />
            <h3 className="mt-3 text-sm font-bold text-gray-900">Belum Ada Riwayat Absensi</h3>
            <p className="mt-1 text-xs text-gray-500">
              Absensi masuk dan pulang Anda akan dicatat dan ditampilkan di sini.
            </p>
            <Link
              href="/employee/absen"
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-indigo-700"
            >
              Lakukan Absensi Pertama
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {attendances.map((item) => {
              const date = new Date(item.timestampServer);
              const isCheckIn = item.type === "CHECK_IN";
              const isOnTime = item.status === "ON_TIME";

              return (
                <div
                  key={item.id}
                  className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm hover:border-indigo-100 transition"
                >
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-lg px-2.5 py-1 text-[11px] font-bold ${
                          isCheckIn
                            ? "bg-indigo-50 text-indigo-700"
                            : "bg-purple-50 text-purple-700"
                        }`}
                      >
                        {isCheckIn ? "MASUK" : "PULANG"}
                      </span>
                      <span className="text-xs font-semibold text-gray-700">
                        {date.toLocaleDateString("id-ID", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>

                    <span
                      className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                        isOnTime
                          ? "bg-green-50 text-green-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {isOnTime ? (
                        <>
                          <CheckCircle2 className="h-3 w-3" /> Tepat Waktu
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-3 w-3" /> Terlambat
                        </>
                      )}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-gray-400 uppercase font-semibold">Waktu Resmi Server</span>
                      <p className="font-mono font-bold text-gray-800">
                        {date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] text-gray-400 uppercase font-semibold">Jarak ke Kantor</span>
                      <p className="font-semibold text-gray-800">
                        {item.distanceToOfficeMeters.toFixed(0)} m ({item.branch?.name || "Kantor"})
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] text-gray-400 uppercase font-semibold">Akurasi Sinyal GPS</span>
                      <p className="font-mono text-gray-600">±{item.accuracyMeters.toFixed(0)} meter</p>
                    </div>

                    <div>
                      <span className="text-[10px] text-gray-400 uppercase font-semibold">Kecocokan Wajah</span>
                      <p className="font-semibold text-indigo-600">
                        Jarak: {item.faceMatchScore} (Liveness OK)
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <BottomNav role={user?.role} />
    </div>
  );
}
