# PresensiPro - Sistem Absensi Karyawan Biometrik Wajah & Geofencing GPS

Aplikasi absensi karyawan modern berbasis web mobile-friendly (Next.js + TypeScript + Tailwind CSS + PostgreSQL) dengan verifikasi biometrik wajah (*Face Recognition* + *Active Liveness Detection*), validasi radius geofence GPS presisi tinggi, kunci perangkat (*Device Binding*), dan kepatuhan penuh terhadap **UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi (UU PDP)**.

---

## 1. Fitur Utama

### A. Fitur Karyawan (Mobile-Friendly)
1. **Otentikasi Aman**: Login menggunakan NIK/Email dan password (JWT Access Token + Refresh Token).
2. **Persetujuan Privasi (UU PDP Consent Modal)**: Persetujuan eksplisit sebelum akses kamera dan GPS.
3. **Perekaman Wajah (Face Enrollment Wizard)**: Perekaman 3 sudut pose wajah, diekstrak menjadi embedding float 128-dimensi yang dienkripsi dengan **AES-256-GCM** (foto mentah tidak disimpan permanen).
4. **Presensi Masuk & Pulang Terverifikasi**:
   - **Active Liveness Detection**: Tantangan acak dari server (kedip mata, senyum, noleh kiri/kanan) untuk mencegah foto cetak, rekaman video, atau layar HP.
   - **Pencocokan Wajah Server-Side**: Menghitung jarak *Euclidean Distance* terhadap template terdaftar dengan ambang batas (*threshold*) yang dapat dikonfigurasi.
   - **Akurasi GPS Tinggi**: Memvalidasi akurasi sinyal GPS (`accuracy <= 100 meter`). Menolak jika sinyal lemah.
   - **Validasi Geofence**: Menghitung jarak langsung ke titik kantor cabang menggunakan **Rumus Haversine** (radius 50 - 500 meter).
   - **Waktu Otoritatif Server**: Jam absen dicatat berdasarkan jam server, kebal manipulasi jam HP lokal.
5. **Riwayat Absensi**: Menampilkan tanggal, jam server resmi, status tepat waktu/terlambat, jarak ke kantor, dan akurasi GPS.
6. **Pengajuan Izin/Sakit/Dinas Luar**: Mengajukan cuti atau sakit dengan tanggal dan keterangan alasan.

### B. Fitur Admin / HRD
1. **Dashboard Eksekutif**: Ringkasan jumlah karyawan, hadir hari ini, tepat waktu, terlambat, alfa, dan persentase kehadiran real-time.
2. **Manajemen Karyawan**: Tambah karyawan baru, atur kantor penempatan & shift kerja, serta **Reset Wajah** jika karyawan perlu mendaftar ulang.
3. **Manajemen Cabang & Geofencing**: Atur koordinat latitude, longitude, dan slider radius geofence (50 - 500 meter) untuk multi-cabang.
4. **Manajemen Shift Kerja**: Konfigurasi jam masuk, jam pulang, dan toleransi keterlambatan (menit).
5. **Rekapitulasi Laporan & Ekspor**: Filter absensi dan ekspor langsung ke format Excel/CSV dengan 1 klik.
6. **Audit Log Forensik**: Catatan log aktivitas keamanan yang tidak dapat dimanipulasi (*immutable*).

---

## 2. Keamanan & Anti-Kecurangan (Security Matrix)

| Vektor Kecurangan | Metode Pelaku | Mitigasi PresensiPro |
| :--- | :--- | :--- |
| **Foto / Video Palsu** | Menempelkan foto di depan kamera atau video HP | **Active Challenge-Response Liveness** berbasis token server waktu nyata. |
| **Fake GPS / Mock Provider** | Menggunakan aplikasi fake GPS di Android/Developer Tools | Memvalidasi akurasi (`accuracy > 100m` atau `accuracy === 0` ditolak), deteksi lonjakan kecepatan abnormal. |
| **Manipulasi Jam HP** | Mengubah setelan jam HP mundur agar tidak telat | Waktu absensi ditentukan 100% oleh **Server Time**, bukan waktu klien. |
| **Joki Absen (Multi-Perangkat)** | Akun dipinjamkan ke rekan kerja di kantor | **Device Binding Hardware-Lock**: 1 akun terkunci pada 1 ID perangkat terdaftar. |
| **Pencurian Data Biometrik** | Kebocoran basis data | Vektor wajah 128-d dienkripsi dengan **AES-256-GCM** dengan IV unik per pengguna. Foto mentah tidak disimpan. |

---

## 3. Struktur Folder Proyek

```
absensi-app/
├── prisma/
│   ├── schema.prisma         # Skema relasi database PostgreSQL
│   ├── schema.sql            # Skema SQL DDL mentah (opsional)
│   └── seed.js               # Data awal (Admin HRD, Karyawan, Cabang, Shift)
├── src/
│   ├── app/
│   │   ├── (auth)/login/     # Halaman login karyawan & admin
│   │   ├── employee/         # Halaman portal karyawan
│   │   │   ├── absen/        # Kamera liveness, GPS geofencing & submit
│   │   │   ├── enrollment/   # Wizard pendaftaran wajah 3 pose
│   │   │   ├── izin/         # Form pengajuan cuti/sakit
│   │   │   └── riwayat/      # Riwayat kehadiran pribadi
│   │   ├── admin/            # Halaman portal HRD / Administrator
│   │   │   ├── karyawan/     # Manajemen staf & reset wajah
│   │   │   ├── cabang/       # Manajemen lokasi cabang & radius
│   │   │   ├── laporan/      # Rekapitulasi & ekspor CSV/Excel
│   │   │   └── audit-log/    # Catatan log forensik
│   │   ├── api/              # REST API Backend
│   │   │   ├── auth/         # Login, me, consent UU PDP
│   │   │   ├── attendance/   # Challenge, submit, history
│   │   │   ├── biometric/    # Face enrollment terenkripsi
│   │   │   ├── leaves/       # CRUD pengajuan izin
│   │   │   └── admin/        # Statistik, karyawan, cabang, shift, audit
│   │   ├── globals.css       # Styling Tailwind CSS
│   │   └── layout.tsx        # Mobile-friendly viewport metadata
│   ├── components/
│   │   ├── CameraLiveness.tsx       # Modul kamera, active liveness & capture
│   │   ├── MapLocation.tsx          # Indikator jarak & akurasi geofence
│   │   ├── PrivacyConsentModal.tsx  # Modal persetujuan UU PDP
│   │   ├── Navbar.tsx               # Top navigation header
│   │   └── BottomNav.tsx            # Mobile navigation bar
│   └── lib/
│       ├── prisma.ts         # Singleton PostgreSQL Prisma client
│       ├── db-service.ts     # Layanan data terpadu (PostgreSQL + Fallback)
│       ├── crypto.ts         # Enkripsi AES-256-GCM & Euclidean Distance
│       ├── geofence.ts       # Rumus Haversine & anti-mock GPS
│       ├── liveness.ts       # Generator token tantangan liveness
│       ├── jwt.ts            # JWT signing & verification
│       └── audit.ts          # Helper pencatatan audit log
├── .env.example              # Template konfigurasi environment
├── package.json              # Dependensi proyek
└── README.md                 # Dokumentasi lengkap
```

---

## 4. Panduan Menjalankan Aplikasi

### Prasyarat
- **Node.js**: Versi 18+ (Rekomendasi v20+)
- **NPM** atau **Yarn / PNPM**
- **PostgreSQL** (Opsional untuk demonstrasi langsung; aplikasi telah dilengkapi adaptor cerdas yang langsung aktif dengan data bawaan jika database belum dihubungkan).

### Langkah Instalasi

1. **Clone repository:**
   ```bash
   git clone https://github.com/aidilfadilah99/absensi-app.git
   cd absensi-app
   ```

2. **Install dependensi:**
   ```bash
   npm install
   ```

3. **Konfigurasi Environment:**
   Salin berkas `.env.example` ke `.env`:
   ```bash
   cp .env.example .env
   ```
   Sesuaikan `DATABASE_URL` jika ingin menggunakan PostgreSQL lokal:
   ```env
   DATABASE_URL="postgresql://postgres:password@localhost:5432/absensi_db?schema=public"
   ```

4. **Migrasi Database PostgreSQL (Opsional jika memakai PostgreSQL lokal):**
   ```bash
   npx prisma db push
   npm run prisma:seed
   ```

5. **Jalankan Server Development:**
   ```bash
   npm run dev
   ```
   Buka browser di: **`http://localhost:3000`**

---

## 5. Akun Uji Coba Bawaan (Demo Accounts)

Tersedia tombol akses cepat 1-klik di halaman login, atau gunakan kredensial berikut:

| Peran | NIK / Email | Kata Sandi | Keterangan |
| :--- | :--- | :--- | :--- |
| **Admin HRD** | `HR001` / `admin@perusahaan.com` | `Password123!` | Akses penuh dashboard, karyawan, cabang, laporan, dan reset wajah. |
| **Karyawan 1** | `EMP001` / `budi@perusahaan.com` | `Password123!` | Penempatan di Kantor Pusat Jakarta (Radius 200m). |
| **Karyawan 2** | `EMP002` / `siti@perusahaan.com` | `Password123!` | Penempatan di Kantor Cabang Surabaya (Radius 250m). |

---

## 6. Skenario Pengujian (Test Cases)

| No | Kasus Uji | Skenario Pengujian | Hasil yang Diharapkan |
| :---: | :--- | :--- | :--- |
| **TC-01** | **Wajah Palsu (Photo Spoofing)** | Mengarahkan foto cetak diam di depan kamera saat liveness challenge diminta. | **Ditolak**: Sistem mendeteksi tidak adanya gerakan kedipan mata atau perubahan pose wajah secara dinamis. |
| **TC-02** | **Fake GPS / Mock Provider** | Menggunakan aplikasi fake GPS dengan akurasi buatan `0 meter` atau data anomali. | **Ditolak**: Server mendeteksi peringatan `MOCK_GPS_DETECTED` dan meminta mematikan fake provider. |
| **TC-03** | **Di Luar Radius Geofence** | Melakukan absensi dari jarak lebih jauh dari radius kantor (misal 500 meter dari kantor). | **Ditolak**: Muncul pesan *"Anda berada di luar radius kantor (X meter dari Kantor Pusat Jakarta). Maksimal radius: 200m"*. |
| **TC-04** | **Akurasi GPS Buruk** | Melakukan absensi saat sinyal GPS lemah (`accuracy > 100 meter`). | **Ditolak**: Sistem meminta karyawan berpindah ke area terbuka atau mengaktifkan mode Akurasi Tinggi. |
| **TC-05** | **Manipulasi Jam Perangkat** | Memundurkan jam di pengaturan HP dari jam 08:30 menjadi 07:45. | **Tercatat Terlambat**: Jam absensi dicatat sesuai waktu server (`serverTimestamp`), bukan waktu HP. |
| **TC-06** | **Joki Absen (Device Mismatch)** | Karyawan mencoba login dan absen dari HP rekan kerja yang berbeda dari yang terdaftar. | **Ditolak**: Sistem memblokir akses dan mewajibkan permintaan pergantian perangkat ke HRD. |
| **TC-07** | **Replay Attack (Token Kedaluwarsa)** | Mengirimkan ulang payload absensi lama via Postman. | **Ditolak**: Challenge token berstatus *one-time use* (terkonsumsi) dan masa berlaku habis setelah 60 detik. |

---

## 7. Kepatuhan UU Pelindungan Data Pribadi (UU PDP No. 27/2022)

1. **Prinsip Persetujuan Eksplisit (Pasal 20)**: Seluruh pemrosesan biometrik wajah dan koordinat lokasi didahului oleh modal persetujuan eksplisit karyawan saat login pertama kali.
2. **Prinsip Pembatasan Tujuan (Pasal 27)**: Data biometrik dan geolokasi **hanya** digunakan untuk validasi absensi pada jam kerja, bukan untuk pelacakan terus-menerus.
3. **Keamanan Data Spesifik (Pasal 35)**: Data biometrik dikategorikan sebagai data pribadi spesifik dan dilindungi dengan enkripsi standar **AES-256-GCM**.
4. **Hak Penghapusan Data (Pasal 8)**: Admin HRD memiliki fitur **Reset Wajah** untuk menghapus template biometrik atas permintaan karyawan atau ketika mengundurkan diri.

---

## 8. Lisensi & Hak Cipta
Dibuat untuk kebutuhan operasional perusahaan dengan standar keamanan industri dan integritas kehadiran tinggi.
