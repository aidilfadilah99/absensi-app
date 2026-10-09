"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Camera, Calendar, History, UserCheck, Shield } from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  primary?: boolean;
}

interface BottomNavProps {
  role?: string;
}

export default function BottomNav({ role = "EMPLOYEE" }: BottomNavProps) {
  const pathname = usePathname();

  const isHR = role === "HR_ADMIN" || role === "SUPERADMIN";

  const employeeLinks: NavItem[] = [
    { href: "/employee", label: "Beranda", icon: Home },
    { href: "/employee/absen", label: "Absen", icon: Camera, primary: true },
    { href: "/employee/izin", label: "Izin", icon: Calendar },
    { href: "/employee/riwayat", label: "Riwayat", icon: History },
  ];

  const hrLinks: NavItem[] = [
    { href: "/admin", label: "Dashboard", icon: Home },
    { href: "/admin/karyawan", label: "Karyawan", icon: UserCheck },
    { href: "/admin/laporan", label: "Laporan", icon: Calendar },
    { href: "/admin/audit-log", label: "Audit", icon: Shield },
  ];

  const links = isHR ? hrLinks : employeeLinks;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white/95 pb-safe backdrop-blur-md">
      <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-1.5">
        {links.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          if (item.primary) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="group relative -mt-5 flex flex-col items-center"
              >
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl shadow-lg transition-transform group-active:scale-90 ${
                    isActive
                      ? "bg-indigo-600 text-white ring-4 ring-indigo-100"
                      : "bg-indigo-600 text-white shadow-indigo-200"
                  }`}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <span className="mt-1 text-[10px] font-bold text-indigo-600">{item.label}</span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center px-3 py-1 transition ${
                isActive ? "text-indigo-600 font-bold" : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="mt-0.5 text-[10px]">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
