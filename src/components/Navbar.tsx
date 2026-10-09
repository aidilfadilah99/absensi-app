"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck, LogOut, User, Building, Clock } from "lucide-react";

interface NavbarProps {
  user?: {
    name: string;
    role: string;
    nik: string;
    branch?: { name: string };
  } | null;
}

export default function Navbar({ user }: NavbarProps) {
  const router = useRouter();

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("userProfile");
      router.push("/login");
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-200">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <span className="text-base font-black tracking-tight text-gray-900">PresensiPro</span>
            <span className="hidden sm:inline-block ml-1.5 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
              Biometric & Geofence
            </span>
          </div>
        </Link>

        {/* User Info & Actions */}
        {user ? (
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs font-bold text-gray-900 leading-tight">{user.name}</p>
              <div className="flex items-center justify-end gap-1.5 text-[10px] text-gray-500">
                <span className="font-mono">{user.nik}</span>
                <span>•</span>
                <span
                  className={`font-semibold ${
                    user.role === "HR_ADMIN" || user.role === "SUPERADMIN"
                      ? "text-purple-600"
                      : "text-indigo-600"
                  }`}
                >
                  {user.role === "HR_ADMIN" ? "HR Admin" : "Karyawan"}
                </span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              title="Keluar"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition active:scale-95"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-100 hover:bg-indigo-700 transition"
          >
            Masuk
          </Link>
        )}
      </div>
    </header>
  );
}
