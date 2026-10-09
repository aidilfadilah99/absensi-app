"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";
import { Calendar, Plus, Clock, CheckCircle2, XCircle, ArrowLeft, Send } from "lucide-react";

export default function IzinPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const [type, setType] = useState("SICK");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      router.replace("/login");
      return;
    }
    const userStr = localStorage.getItem("userProfile");
    if (userStr) setUser(JSON.parse(userStr));

    try {
      const res = await fetch("/api/leaves", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLeaves(data.leaves || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const token = localStorage.getItem("accessToken");

    try {
      const res = await fetch("/api/leaves", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type,
          startDate,
          endDate,
          reason,
        }),
      });

      if (!res.ok) throw new Error("Gagal mengajukan izin");

      setIsFormOpen(false);
      setReason("");
      loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-24">
      <Navbar user={user} />

      <main className="mx-auto max-w-lg px-4 pt-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-gray-900">Pengajuan Izin & Sakit</h1>
            <p className="text-xs text-gray-500">Izin tidak masuk kantor, cuti, atau dinas luar</p>
          </div>
          <button
            onClick={() => setIsFormOpen(!isFormOpen)}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" /> Ajukan Izin
          </button>
        </div>

        {/* Modal / Form Pengajuan */}
        {isFormOpen && (
          <form
            onSubmit={handleSubmit}
            className="rounded-3xl border border-indigo-100 bg-white p-5 shadow-lg space-y-3"
          >
            <h3 className="text-sm font-bold text-gray-900">Formulir Pengajuan Baru</h3>

            <div>
              <label className="text-xs font-semibold text-gray-700">Jenis Pengajuan</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-300 p-2.5 text-xs focus:border-indigo-600 focus:outline-none"
              >
                <option value="SICK">Sakit (Dengan/Tanpa Surat Dokter)</option>
                <option value="PERMIT">Izin Keperluan Mendesak</option>
                <option value="ANNUAL_LEAVE">Cuti Tahunan</option>
                <option value="OUTSTATION">Dinas Luar Kota / Lapangan</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold text-gray-700">Tanggal Mulai</label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-300 p-2 text-xs focus:border-indigo-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700">Tanggal Selesai</label>
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-300 p-2 text-xs focus:border-indigo-600 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700">Keterangan / Alasan</label>
              <textarea
                required
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Tuliskan keterangan detail pengajuan Anda..."
                className="mt-1 w-full rounded-xl border border-gray-300 p-2.5 text-xs focus:border-indigo-600 focus:outline-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="flex-1 rounded-xl border border-gray-300 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white shadow hover:bg-indigo-700 disabled:bg-gray-400"
              >
                <Send className="h-3.5 w-3.5" /> Kirim Pengajuan
              </button>
            </div>
          </form>
        )}

        {/* Daftar Pengajuan */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500">
            Riwayat Permohonan Izin Anda
          </h2>

          {leaves.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-center text-xs text-gray-500">
              Belum ada permohonan izin yang diajukan.
            </div>
          ) : (
            leaves.map((l) => (
              <div
                key={l.id}
                className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-indigo-700 uppercase">
                    {l.type === "SICK"
                      ? "Sakit"
                      : l.type === "PERMIT"
                      ? "Izin"
                      : l.type === "ANNUAL_LEAVE"
                      ? "Cuti Tahunan"
                      : "Dinas Luar"}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                      l.status === "APPROVED"
                        ? "bg-green-50 text-green-700"
                        : l.status === "REJECTED"
                        ? "bg-red-50 text-red-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {l.status === "APPROVED"
                      ? "Disetujui"
                      : l.status === "REJECTED"
                      ? "Ditolak"
                      : "Menunggu Persetujuan"}
                  </span>
                </div>

                <div className="text-gray-700">
                  <span className="text-gray-400">Periode: </span>
                  <strong>
                    {new Date(l.startDate).toLocaleDateString("id-ID")} -{" "}
                    {new Date(l.endDate).toLocaleDateString("id-ID")}
                  </strong>
                </div>

                <p className="text-gray-600 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                  &quot;{l.reason}&quot;
                </p>
              </div>
            ))
          )}
        </div>
      </main>

      <BottomNav role={user?.role} />
    </div>
  );
}
