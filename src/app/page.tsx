"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    const userStr = localStorage.getItem("userProfile");

    if (!token || !userStr) {
      router.replace("/login");
      return;
    }

    try {
      const user = JSON.parse(userStr);
      if (user.role === "HR_ADMIN" || user.role === "SUPERADMIN") {
        router.replace("/admin");
      } else {
        router.replace("/employee");
      }
    } catch {
      router.replace("/login");
    }
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 text-white">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
        <p className="text-sm font-medium text-slate-300">Memuat PresensiPro...</p>
      </div>
    </div>
  );
}
