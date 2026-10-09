"use client";

import React, { useState } from "react";
import { ShieldCheck, Lock, MapPin, Eye, CheckCircle2 } from "lucide-react";

interface PrivacyConsentModalProps {
  isOpen: boolean;
  onAccept: () => Promise<void>;
}

export default function PrivacyConsentModal({ isOpen, onAccept }: PrivacyConsentModalProps) {
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (!agreed) return;
    setSubmitting(true);
    try {
      await onAccept();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Persetujuan Pemrosesan Data Pribadi</h2>
            <p className="text-xs text-gray-500">Kepatuhan UU No. 27 Tahun 2022 (UU PDP)</p>
          </div>
        </div>

        <div className="my-4 max-h-80 space-y-3 overflow-y-auto pr-1 text-sm text-gray-600">
          <p className="font-medium text-gray-800">
            Sebelum menggunakan aplikasi PresensiPro, harap membaca dan menyetujui hak dan kewajiban terkait data pribadi Anda:
          </p>

          <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3.5 space-y-2">
            <div className="flex items-start gap-2.5">
              <Eye className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" />
              <div>
                <span className="font-semibold text-gray-900">1. Data Biometrik Wajah:</span>
                <p className="text-xs text-gray-600 mt-0.5">
                  Foto wajah mentah Anda <strong>tidak disimpan secara permanen</strong>. Sistem hanya mengekstrak vektor matematis (128-dimensi) yang dienkripsi dengan standar <strong>AES-256-GCM</strong> untuk keperluan otentikasi kehadiran.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" />
              <div>
                <span className="font-semibold text-gray-900">2. Titik Lokasi GPS:</span>
                <p className="text-xs text-gray-600 mt-0.5">
                  Akses lokasi GPS hanya diproses pada saat Anda menekan tombol absen masuk/pulang. Aplikasi <strong>TIDAK melacak</strong> lokasi Anda secara berkelanjutan di latar belakang.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Lock className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" />
              <div>
                <span className="font-semibold text-gray-900">3. Kunci Perangkat (Device Binding):</span>
                <p className="text-xs text-gray-600 mt-0.5">
                  ID perangkat Anda dicatat untuk mencegah kecurangan dan joki absensi, menjamin integritas kehadiran Anda.
                </p>
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-500 italic">
            Anda berhak meminta penghapusan template biometrik Anda sewaktu-waktu melalui HRD perusahaan jika sudah tidak bekerja.
          </p>
        </div>

        <div className="mt-4 border-t border-gray-100 pt-4">
          <label className="flex cursor-pointer items-start gap-3 select-none">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-xs text-gray-700">
              Saya telah membaca, memahami, dan memberikan <strong>persetujuan eksplisit</strong> atas pemrosesan data biometrik wajah dan lokasi GPS saya untuk keperluan absensi kerja.
            </span>
          </label>

          <button
            onClick={handleConfirm}
            disabled={!agreed || submitting}
            className={`mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white shadow-md transition ${
              agreed && !submitting
                ? "bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99]"
                : "cursor-not-allowed bg-gray-300"
            }`}
          >
            <CheckCircle2 className="h-4 w-4" />
            {submitting ? "Menyimpan Persetujuan..." : "Setujui & Lanjutkan"}
          </button>
        </div>
      </div>
    </div>
  );
}
