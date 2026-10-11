"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";
import {
  Plus,
  RefreshCw,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Smartphone,
} from "lucide-react";

export default function ManajemenKaryawanPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    nik: "",
    name: "",
    email: "",
    phoneNumber: "",
    password: "Password123!",
    role: "EMPLOYEE",
    branchId: "",
    shiftId: "",
  });

  const loadData = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      router.replace("/login");
      return;
    }
    const userStr = localStorage.getItem("userProfile");
    if (userStr) setUser(JSON.parse(userStr));

    try {
      const [empRes, branchRes, shiftRes] = await Promise.all([
        fetch("/api/admin/employees", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/admin/branches", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/admin/shifts", { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const empData = await empRes.json();
      const branchData = await branchRes.json();
      const shiftData = await shiftRes.json();

      setEmployees(empData.employees || []);
      setBranches(branchData.branches || []);
      setShifts(shiftData.shifts || []);
      if (branchData.branches?.[0]) {
        setFormData((prev) => ({
          ...prev,
          branchId: branchData.branches[0].id,
          shiftId: shiftData.shifts?.[0]?.id || "",
        }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [router]);

  const showToast = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("accessToken");

    try {
      const res = await fetch("/api/admin/employees", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menambahkan karyawan");

      setIsModalOpen(false);
      setFormData({
        nik: "",
        name: "",
        email: "",
        phoneNumber: "",
        password: "Password123!",
        role: "EMPLOYEE",
        branchId: branches[0]?.id || "",
        shiftId: shifts[0]?.id || "",
      });
      showToast("Karyawan baru berhasil ditambahkan!");
      loadData();
    } catch (err: any) {
      showToast("Error: " + err.message);
    }
  };

  const handleResetAction = async (
    empId: string,
    empName: string,
    action: "RESET_FACE" | "RESET_DEVICE"
  ) => {
    const token = localStorage.getItem("accessToken");
    try {
      const res = await fetch("/api/admin/employees", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          targetUserId: empId,
          action,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memproses aksi.");
      showToast(
        action === "RESET_FACE"
          ? `Biometrik wajah ${empName} berhasil di-reset.`
          : `Kunci perangkat ${empName} berhasil di-reset.`
      );
      loadData();
    } catch (err: any) {
      showToast("Error: " + err.message);
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
            <h1 className="text-2xl font-black text-gray-900">Manajemen Karyawan</h1>
            <p className="text-xs text-gray-500">
              Kelola data staf, penugasan kantor, jadwal shift, biometrik wajah & kunci perangkat.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-indigo-700 transition"
          >
            <Plus className="h-4 w-4" /> Tambah Karyawan
          </button>
        </div>

        {statusMessage && (
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-3.5 text-xs font-semibold text-indigo-800 flex items-center gap-2 shadow-sm">
            <CheckCircle2 className="h-4 w-4 text-indigo-600 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Modal Tambah Karyawan */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
              <h2 className="text-lg font-bold text-gray-900">Tambah Karyawan Baru</h2>
              <form onSubmit={handleCreateEmployee} className="mt-4 space-y-3 text-xs">
                <div>
                  <label className="font-semibold text-gray-700">NIK (Nomor Induk Karyawan)</label>
                  <input
                    type="text"
                    required
                    placeholder="EMP003"
                    value={formData.nik}
                    onChange={(e) => setFormData({ ...formData, nik: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-gray-300 p-2.5"
                  />
                </div>

                <div>
                  <label className="font-semibold text-gray-700">Nama Lengkap</label>
                  <input
                    type="text"
                    required
                    placeholder="Ahmad Fauzi"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-gray-300 p-2.5"
                  />
                </div>

                <div>
                  <label className="font-semibold text-gray-700">Email Perusahaan</label>
                  <input
                    type="email"
                    required
                    placeholder="ahmad@perusahaan.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-gray-300 p-2.5"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-semibold text-gray-700">Cabang Penempatan</label>
                    <select
                      value={formData.branchId}
                      onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-gray-300 p-2.5"
                    >
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-gray-700">Shift Kerja</label>
                    <select
                      value={formData.shiftId}
                      onChange={(e) => setFormData({ ...formData, shiftId: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-gray-300 p-2.5"
                    >
                      {shifts.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
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
                    Simpan Data
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Tabel Karyawan */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 uppercase font-semibold text-[10px]">
                <tr>
                  <th className="p-3">Karyawan</th>
                  <th className="p-3">Cabang Kantor</th>
                  <th className="p-3">Perangkat Terikat</th>
                  <th className="p-3">Biometrik Wajah</th>
                  <th className="p-3">Aksi Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {employees.map((emp) => {
                  const hasFace = emp.faceTemplates && emp.faceTemplates.length > 0;
                  return (
                    <tr key={emp.id} className="hover:bg-gray-50/50">
                      <td className="p-3 font-semibold text-gray-900">
                        {emp.name}
                        <div className="text-[10px] text-gray-400 font-mono font-normal">
                          {emp.nik} • {emp.email}
                        </div>
                      </td>
                      <td className="p-3 font-medium text-gray-700">
                        <div>{emp.branch?.name || "Kantor Pusat"}</div>
                        <div className="text-[10px] text-gray-400">{emp.shift?.name || "Reguler"}</div>
                      </td>
                      <td className="p-3 text-gray-600">
                        {emp.deviceId ? (
                          <div>
                            <div className="font-semibold text-gray-800">{emp.deviceName || "Web Device"}</div>
                            <div className="font-mono text-[10px] text-gray-400">{emp.deviceId}</div>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">Belum terikat</span>
                        )}
                      </td>
                      <td className="p-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            hasFace
                              ? "bg-green-50 text-green-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {hasFace ? (
                            <>
                              <CheckCircle2 className="h-3 w-3" /> Terdaftar
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3 w-3" /> Belum
                            </>
                          )}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleResetAction(emp.id, emp.name, "RESET_FACE")}
                            className="flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-50 transition"
                            title="Reset Template Biometrik Wajah"
                          >
                            <RefreshCw className="h-3 w-3" /> Reset Wajah
                          </button>
                          {emp.deviceId && (
                            <button
                              type="button"
                              onClick={() => handleResetAction(emp.id, emp.name, "RESET_DEVICE")}
                              className="flex items-center gap-1 rounded-lg border border-indigo-200 px-2.5 py-1 text-[11px] font-semibold text-indigo-600 hover:bg-indigo-50 transition"
                              title="Reset Kunci Perangkat"
                            >
                              <Smartphone className="h-3 w-3" /> Reset Device
                            </button>
                          )}
                        </div>
                      </td>
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
