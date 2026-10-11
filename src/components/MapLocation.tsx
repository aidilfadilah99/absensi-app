"use client";

import React from "react";
import {
  MapPin,
  Navigation,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Building2,
  Crosshair,
  ShieldAlert,
} from "lucide-react";

interface MapLocationProps {
  userLocation: {
    latitude: number;
    longitude: number;
    accuracy: number;
  } | null;
  officeLocation?: {
    id?: string;
    name: string;
    latitude: number;
    longitude: number;
    radiusMeters: number;
  };
  distanceToOffice?: number | null;
  onRefreshLocation: () => void;
  onSetOfficeMode?: () => void;
  onSetOutsideMode?: () => void;
  onCalibrateOfficeToMe?: () => void;
  isLoading?: boolean;
}

export default function MapLocation({
  userLocation,
  officeLocation,
  distanceToOffice,
  onRefreshLocation,
  onSetOfficeMode,
  onSetOutsideMode,
  onCalibrateOfficeToMe,
  isLoading = false,
}: MapLocationProps) {
  const isAccuracyGood = userLocation ? userLocation.accuracy <= 100 : false;
  const isWithinRadius =
    officeLocation && distanceToOffice !== undefined && distanceToOffice !== null
      ? distanceToOffice <= officeLocation.radiusMeters
      : false;

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
            <Navigation className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Validasi Geofence & GPS
            </h3>
            <p className="text-sm font-semibold text-gray-900">
              {officeLocation ? officeLocation.name : "Mencari Kantor Terdekat..."}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onRefreshLocation}
          disabled={isLoading}
          className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 active:scale-95 transition"
        >
          <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
          GPS Asli
        </button>
      </div>

      {/* Quick Simulation / Calibration Controls for Testing */}
      <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-200/80">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
          Mode Pengujian Lokasi & Kalibrasi Geofence:
        </div>
        <div className="grid grid-cols-3 gap-1.5 text-[11px]">
          {onSetOfficeMode && (
            <button
              type="button"
              onClick={onSetOfficeMode}
              className="flex items-center justify-center gap-1 rounded-lg bg-indigo-600 px-2 py-1.5 font-bold text-white shadow-sm hover:bg-indigo-700 active:scale-95 transition"
            >
              <Building2 className="h-3 w-3 shrink-0" /> Di Kantor
            </button>
          )}
          {onCalibrateOfficeToMe && (
            <button
              type="button"
              onClick={onCalibrateOfficeToMe}
              className="flex items-center justify-center gap-1 rounded-lg bg-emerald-600 px-2 py-1.5 font-bold text-white shadow-sm hover:bg-emerald-700 active:scale-95 transition"
              title="Pindahkan titik koordinat kantor ke posisi GPS Anda saat ini"
            >
              <Crosshair className="h-3 w-3 shrink-0" /> Kalibrasi GPS
            </button>
          )}
          {onSetOutsideMode && (
            <button
              type="button"
              onClick={onSetOutsideMode}
              className="flex items-center justify-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2 py-1.5 font-bold text-amber-800 hover:bg-amber-100 active:scale-95 transition"
            >
              <ShieldAlert className="h-3 w-3 shrink-0" /> Tes Luar Radius
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl bg-gray-50 p-2.5">
          <span className="text-[11px] text-gray-500">Koordinat Anda:</span>
          <p className="mt-0.5 font-mono font-medium text-gray-900 truncate">
            {userLocation
              ? `${userLocation.latitude.toFixed(5)}, ${userLocation.longitude.toFixed(5)}`
              : "Mengambil data..."}
          </p>
        </div>

        <div className="rounded-xl bg-gray-50 p-2.5">
          <span className="text-[11px] text-gray-500">Akurasi Sinyal GPS:</span>
          <p
            className={`mt-0.5 font-semibold flex items-center gap-1 ${
              isAccuracyGood ? "text-green-600" : "text-amber-600"
            }`}
          >
            {userLocation ? `±${userLocation.accuracy.toFixed(0)} meter` : "Mencari..."}
            {isAccuracyGood ? (
              <span className="text-[10px] font-normal text-green-600">(Akurat)</span>
            ) : (
              <span className="text-[10px] font-normal text-amber-600">(&gt;100m)</span>
            )}
          </p>
        </div>
      </div>

      {/* Geofence Status Badge */}
      <div>
        {distanceToOffice !== undefined && distanceToOffice !== null ? (
          <div
            className={`flex items-center gap-2.5 rounded-xl p-3 text-xs ${
              isWithinRadius && isAccuracyGood
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-amber-50 text-amber-900 border border-amber-200"
            }`}
          >
            {isWithinRadius && isAccuracyGood ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
            ) : (
              <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" />
            )}
            <div className="flex-1">
              <p className="font-bold">
                {isWithinRadius
                  ? "Anda Berada di Dalam Area Geofence Kantor"
                  : "Anda Berada di Luar Radius Kantor"}
              </p>
              <p className="text-[11px] opacity-90 mt-0.5">
                Jarak ke Kantor: <strong>{distanceToOffice.toFixed(0)} m</strong> (Maksimal radius:{" "}
                {officeLocation?.radiusMeters} m)
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-xl bg-blue-50 p-3 text-xs text-blue-700 flex items-center gap-2">
            <MapPin className="h-4 w-4 animate-bounce" />
            Menghitung jarak ke titik geofence kantor...
          </div>
        )}
      </div>

      {userLocation && (!isAccuracyGood || !isWithinRadius) && (
        <p className="text-[11px] text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-xl p-2.5">
          💡 <strong>Tips Pengujian:</strong> Jika posisi Anda saat ini jauh dari titik kantor Jakarta, klik tombol{" "}
          <strong>&quot;Di Kantor&quot;</strong> atau <strong>&quot;Kalibrasi GPS&quot;</strong> di atas agar lokasi kantor mengikuti posisi Anda saat ini.
        </p>
      )}
    </div>
  );
}
