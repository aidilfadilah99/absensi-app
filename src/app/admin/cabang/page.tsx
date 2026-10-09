"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";
import { Building2, Plus, MapPin, ArrowLeft, Navigation, ShieldCheck } from "lucide-react";

export default function CabangPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    code: "",
    name: "",
    address: "",
    latitude: -6.2088,
    longitude: 106.8456,
    radiusMeters: 150,
  });

  const loadData = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) return router.replace("/login");

    const userStr = localStorage.getItem("userProfile");
    if (userStr) setUser(JSON.parse(userStr));

    try {
      const res = await fetch("/api/admin/branches", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setBranches(data.branches || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("accessToken");

    try {
      const res = await fetch("/api/admin/branches", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error("Gagal menambah cabang");
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

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
            <h1 className="text-2xl font-black text-gray-900">Manajemen Cabang & Geofencing</h1>
            <p className="text-xs text-gray-500">
              Konfigurasi titik koordinat GPS kantor cabang dan radius batas toleransi (50 - 500m).
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" /> Tambah Cabang
          </button>
        </div>

        {/* Modal Tambah Cabang */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
              <h2 className="text-lg font-bold text-gray-900">Tambah Cabang Kantor</h2>
              <form onSubmit={handleSubmit} className="mt-4 space-y-3 text-xs">
                <div>
                  <label className="font-semibold text-gray-700">Kode Cabang</label>
                  <input
                    type="text"
                    required
                    placeholder="BDG-01"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-gray-300 p-2.5"
                  />
                </div>

                <div>
                  <label className="font-semibold text-gray-700">Nama Kantor Cabang</label>
                  <input
                    type="text"
                    required
                    placeholder="Kantor Cabang Bandung"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-gray-300 p-2.5"
                  />
                </div>

                <div>
                  <label className="font-semibold text-gray-700">Alamat Lengkap</label>
                  <textarea
                    required
                    rows={2}
                    placeholder="Jl. Asia Afrika No. 10, Bandung"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-gray-300 p-2.5"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-semibold text-gray-700">Latitude (Titik Lintang)</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={formData.latitude}
                      onChange={(e) =>
                        setFormData({ ...formData, latitude: parseFloat(e.target.value) })
                      }
                      className="mt-1 w-full rounded-xl border border-gray-300 p-2 font-mono"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-gray-700">Longitude (Titik Bujur)</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={formData.longitude}
                      onChange={(e) =>
                        setFormData({ ...formData, longitude: parseFloat(e.target.value) })
                      }
                      className="mt-1 w-full rounded-xl border border-gray-300 p-2 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-gray-700">
                    Radius Geofence: <strong>{formData.radiusMeters} meter</strong>
                  </label>
                  <input
                    type="range"
                    min="50"
                    max="500"
                    step="10"
                    value={formData.radiusMeters}
                    onChange={(e) =>
                      setFormData({ ...formData, radiusMeters: parseInt(e.target.value) })
                    }
                    className="mt-2 w-full"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400">
                    <span>50m</span>
                    <span>150m (Standar)</span>
                    <span>500m</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 rounded-xl border border-gray-300 py-2.5 font-bold text-gray-700 hover:bg-gray-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 rounded-xl bg-indigo-600 py-2.5 font-bold text-white hover:bg-indigo-700 shadow"
                  >
                    Simpan Cabang
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* List Cabang Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {branches.map((b) => (
            <div
              key={b.id}
              className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-3"
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{b.name}</h3>
                    <p className="text-[10px] font-mono text-gray-400">{b.code}</p>
                  </div>
                </div>
                <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
                  Radius {b.radiusMeters}m
                </span>
              </div>

              <p className="text-xs text-gray-600">{b.address}</p>

              <div className="rounded-xl bg-gray-50 p-2.5 font-mono text-xs text-gray-700 flex items-center justify-between">
                <span>Lat: {b.latitude}</span>
                <span>Lng: {b.longitude}</span>
              </div>
            </div>
          ))}
        </div>
      </main>

      <BottomNav role={user?.role} />
    </div>
  );
}
