"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Lock, User, Smartphone, AlertCircle, ArrowRight, RefreshCw } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const [deviceName, setDeviceName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDeviceMismatch, setIsDeviceMismatch] = useState(false);

  // Generate / retrieve unique device fingerprint
  useEffect(() => {
    let devId = localStorage.getItem("presensi_device_id");
    if (!devId) {
      devId = "DEV-" + Math.random().toString(36).substring(2, 10).toUpperCase();
      localStorage.setItem("presensi_device_id", devId);
    }
    setDeviceId(devId);

    const userAgent = navigator.userAgent;
    let name = "Web Browser";
    if (/Android/i.test(userAgent)) name = "Android Phone";
    else if (/iPhone|iPad/i.test(userAgent)) name = "Apple iOS Device";
    else if (/Windows/i.test(userAgent)) name = "Windows PC / Laptop";
    else if (/Macintosh/i.test(userAgent)) name = "MacBook / macOS";
    setDeviceName(name);
  }, []);

  const handleLogin = async (
    e?: React.FormEvent,
    customId?: string,
    customPass?: string,
    forceBindDevice: boolean = false
  ) => {
    if (e) e.preventDefault();
    setError(null);
    setIsDeviceMismatch(false);
    setLoading(true);

    const loginId = customId || identifier;
    const loginPass = customPass || password;

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: loginId,
          password: loginPass,
          deviceId,
          deviceName,
          forceBindDevice,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.isDeviceMismatch) {
          setIsDeviceMismatch(true);
        }
        throw new Error(data.error || "Gagal masuk. Periksa kembali NIK dan kata sandi.");
      }

      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);
      localStorage.setItem("userProfile", JSON.stringify(data.user));

      if (data.user.role === "HR_ADMIN" || data.user.role === "SUPERADMIN") {
        router.push("/admin");
      } else {
        router.push("/employee");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loginAsDemo = (nik: string) => {
    setIdentifier(nik);
    setPassword("Password123!");
    handleLogin(undefined, nik, "Password123!", true);
  };

  return (
    <div className="flex min-h-screen flex-col justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-4 sm:p-6">
      <div className="mx-auto w-full max-w-md">
        {/* Header App */}
        <div className="mb-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-xl shadow-indigo-500/20 ring-4 ring-indigo-500/30">
            <ShieldCheck className="h-9 w-9" />
          </div>
          <h1 className="mt-4 text-2xl font-black tracking-tight text-white">PresensiPro</h1>
          <p className="mt-1 text-xs text-indigo-200">
            Sistem Absensi Karyawan Biometrik Wajah & Geofence GPS
          </p>
        </div>

        {/* Card Form */}
        <div className="rounded-2xl border border-slate-700/60 bg-slate-800/80 p-6 shadow-2xl backdrop-blur-xl">
          <h2 className="text-lg font-bold text-white">Masuk ke Akun Anda</h2>
          <p className="text-xs text-slate-400">Gunakan NIK atau Email terdaftar</p>

          {error && (
            <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300 space-y-2">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
                <span>{error}</span>
              </div>
              {isDeviceMismatch && (
                <button
                  type="button"
                  onClick={() => handleLogin(undefined, identifier, password, true)}
                  className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-indigo-600 py-2 text-xs font-bold text-white hover:bg-indigo-500 transition"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Sinkronkan ke Perangkat Ini & Masuk
                </button>
              )}
            </div>
          )}

          <form onSubmit={(e) => handleLogin(e)} className="mt-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300">NIK atau Email</label>
              <div className="relative mt-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <User className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="EMP001 atau budi@perusahaan.com"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900/60 py-2.5 pl-10 pr-3 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300">Kata Sandi</label>
              <div className="relative mt-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900/60 py-2.5 pl-10 pr-3 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Device Lock Info */}
            <div className="flex items-center gap-2 rounded-xl bg-slate-900/40 p-2.5 text-[11px] text-slate-400 border border-slate-700/50">
              <Smartphone className="h-4 w-4 text-indigo-400 shrink-0" />
              <div className="truncate">
                <span>Perangkat Terdeteksi: </span>
                <span className="font-semibold text-slate-200">{deviceName}</span>
                <span className="text-[10px] text-slate-500 font-mono ml-1">({deviceId})</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/30 transition hover:bg-indigo-500 active:scale-[0.98] disabled:bg-slate-700"
            >
              {loading ? "Memproses Autentikasi..." : "Masuk Sekarang"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {/* Quick Demo Switcher */}
          <div className="mt-6 border-t border-slate-700/60 pt-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Akses Cepat Akun Demo (1-Click):
            </p>
            <div className="mt-2.5 grid grid-cols-3 gap-2 text-xs">
              <button
                type="button"
                onClick={() => loginAsDemo("EMP001")}
                className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-2 text-left text-indigo-300 hover:bg-indigo-500/20 transition"
              >
                <div className="font-bold truncate">Budi S.</div>
                <div className="text-[10px] text-indigo-400">EMP001</div>
              </button>

              <button
                type="button"
                onClick={() => loginAsDemo("EMP002")}
                className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2 text-left text-emerald-300 hover:bg-emerald-500/20 transition"
              >
                <div className="font-bold truncate">Siti R.</div>
                <div className="text-[10px] text-emerald-400">EMP002</div>
              </button>

              <button
                type="button"
                onClick={() => loginAsDemo("HR001")}
                className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-2 text-left text-purple-300 hover:bg-purple-500/20 transition"
              >
                <div className="font-bold truncate">Admin HRD</div>
                <div className="text-[10px] text-purple-400">HR001</div>
              </button>
            </div>
            <p className="mt-2 text-center text-[10px] text-slate-500">
              Default password semua akun: <strong>Password123!</strong>
            </p>
          </div>
        </div>

        {/* Footer info */}
        <p className="mt-6 text-center text-xs text-slate-400">
          Dilindungi standar keamanan UU PDP No. 27/2022 & Enkripsi AES-256
        </p>
      </div>
    </div>
  );
}
