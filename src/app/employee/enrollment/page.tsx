"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";
import CameraLiveness from "@/components/CameraLiveness";
import { ArrowLeft, CheckCircle2, ShieldCheck, Sparkles, AlertCircle } from "lucide-react";

export default function EnrollmentPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [samples, setSamples] = useState<number[][]>([]);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const steps = [
    { step: 1, title: "Pose 1: Tatap Lurus", desc: "Arahkan wajah lurus ke tengah lingkaran kamera." },
    { step: 2, title: "Pose 2: Tersenyum", desc: "Tersenyumlah wajar menghadap kamera." },
    { step: 3, title: "Pose 3: Sudut Miring", desc: "Sedikit condongkan atau putar kepala Anda secara perlahan." },
  ];

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      router.replace("/login");
      return;
    }
    const userStr = localStorage.getItem("userProfile");
    if (userStr) setUser(JSON.parse(userStr));
  }, [router]);

  const handleCaptureSample = async (descriptor: number[]) => {
    setErrorMessage(null);
    const newSamples = [...samples, descriptor];
    setSamples(newSamples);

    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    } else {
      // Completed 3 samples -> Average and submit
      await finalizeEnrollment(newSamples);
    }
  };

  const finalizeEnrollment = async (allSamples: number[][]) => {
    setIsSaving(true);
    const token = localStorage.getItem("accessToken");

    // Compute average 128-d vector
    const avgDescriptor: number[] = new Array(128).fill(0);
    for (let i = 0; i < 128; i++) {
      let sum = 0;
      for (const sample of allSamples) {
        sum += sample[i];
      }
      avgDescriptor[i] = Number((sum / allSamples.length).toFixed(6));
    }

    try {
      const res = await fetch("/api/biometric/enroll", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          descriptor: avgDescriptor,
          sampleCount: allSamples.length,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan pendaftaran wajah.");

      setIsSuccess(true);
      // Update local storage state
      if (user) {
        const updated = { ...user, isBiometricEnrolled: true };
        localStorage.setItem("userProfile", JSON.stringify(updated));
      }
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-24">
      <Navbar user={user} />

      <main className="mx-auto max-w-lg px-4 pt-3 space-y-4">
        {/* Back Link */}
        <Link
          href="/employee"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali ke Beranda
        </Link>

        {isSuccess ? (
          <div className="rounded-3xl border border-green-200 bg-white p-6 shadow-xl text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-green-100 text-green-600">
              <CheckCircle2 className="h-10 w-10" />
            </div>

            <h2 className="mt-4 text-xl font-black text-gray-900">
              Pendaftaran Wajah Berhasil!
            </h2>
            <p className="mt-2 text-xs text-gray-600 leading-relaxed">
              Template biometrik wajah Anda telah dienkripsi menggunakan standar <strong>AES-256-GCM</strong> dan tersimpan aman di server sesuai ketentuan UU PDP No. 27/2022.
            </p>

            <Link
              href="/employee/absen"
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white shadow hover:bg-indigo-700"
            >
              Coba Absen Sekarang
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <h1 className="text-xl font-black text-gray-900">Pendaftaran Biometrik Wajah</h1>
              <p className="text-xs text-gray-500">
                Perekaman 3 sudut untuk akurasi pencocokan yang tinggi saat absensi.
              </p>
            </div>

            {/* Stepper Wizard Indicator */}
            <div className="grid grid-cols-3 gap-2">
              {steps.map((s) => (
                <div
                  key={s.step}
                  className={`rounded-xl p-2.5 text-center border transition ${
                    currentStep === s.step
                      ? "border-indigo-600 bg-indigo-50/70"
                      : currentStep > s.step
                      ? "border-green-300 bg-green-50/50"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  <div
                    className={`text-[10px] font-bold ${
                      currentStep === s.step
                        ? "text-indigo-600"
                        : currentStep > s.step
                        ? "text-green-600"
                        : "text-gray-400"
                    }`}
                  >
                    Langkah {s.step} / 3
                  </div>
                  <div className="mt-0.5 text-xs font-semibold text-gray-900 truncate">
                    {s.title.split(": ")[1]}
                  </div>
                </div>
              ))}
            </div>

            {errorMessage && (
              <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Active Step Details */}
            <div className="rounded-xl bg-indigo-50/50 border border-indigo-100 p-3 text-xs text-indigo-900">
              <span className="font-bold">{steps[currentStep - 1].title}: </span>
              <span>{steps[currentStep - 1].desc}</span>
            </div>

            {/* Camera Component */}
            <CameraLiveness
              key={currentStep}
              isEnrolling={true}
              instructionText={steps[currentStep - 1].desc}
              onLivenessComplete={(descriptor) => handleCaptureSample(descriptor)}
            />

            <div className="text-center text-[11px] text-gray-500">
              * Pastikan pencahayaan cukup dan wajah tidak terhalang masker atau kacamata hitam tebal.
            </div>
          </div>
        )}
      </main>

      <BottomNav role={user?.role} />
    </div>
  );
}
