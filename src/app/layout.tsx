import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PresensiPro - Absensi Karyawan Biometrik & Geofence",
  description:
    "Aplikasi absensi mobile-friendly dengan verifikasi biometrik wajah (active liveness), geofencing GPS akurat, dan kepatuhan UU PDP.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="bg-slate-50 text-slate-900 antialiased selection:bg-indigo-500 selection:text-white pb-20 sm:pb-0">
        {children}
      </body>
    </html>
  );
}
