const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("Menyiapkan seed data untuk PresensiPro...");

  const passwordHash = await bcrypt.hash("Password123!", 10);

  // 1. Seed Branch
  const branchJkt = await prisma.branch.upsert({
    where: { code: "JKT-HQ" },
    update: {},
    create: {
      code: "JKT-HQ",
      name: "Kantor Pusat Jakarta",
      address: "Jl. Jend. Sudirman Kav. 25, Jakarta Selatan",
      latitude: -6.2088,
      longitude: 106.8456,
      radiusMeters: 200,
      timezone: "Asia/Jakarta",
    },
  });

  const branchSby = await prisma.branch.upsert({
    where: { code: "SBY-01" },
    update: {},
    create: {
      code: "SBY-01",
      name: "Kantor Cabang Surabaya",
      address: "Jl. Pemuda No. 45, Surabaya",
      latitude: -7.2575,
      longitude: 112.7521,
      radiusMeters: 250,
      timezone: "Asia/Jakarta",
    },
  });

  // 2. Seed Shift
  const shiftPagi = await prisma.shift.upsert({
    where: { id: "shift-reguler-pagi" },
    update: {},
    create: {
      id: "shift-reguler-pagi",
      name: "Shift Reguler Pagi (08:00 - 17:00)",
      startTime: "08:00",
      endTime: "17:00",
      lateToleranceMinutes: 15,
      earlyDepartureToleranceMinutes: 0,
    },
  });

  // 3. Seed Users
  await prisma.user.upsert({
    where: { nik: "HR001" },
    update: {},
    create: {
      nik: "HR001",
      name: "Admin HRD (Senior)",
      email: "admin@perusahaan.com",
      passwordHash,
      role: "HR_ADMIN",
      branchId: branchJkt.id,
      shiftId: shiftPagi.id,
      pdpConsentAccepted: true,
      pdpConsentAt: new Date(),
    },
  });

  await prisma.user.upsert({
    where: { nik: "EMP001" },
    update: {},
    create: {
      nik: "EMP001",
      name: "Budi Santoso",
      email: "budi@perusahaan.com",
      passwordHash,
      role: "EMPLOYEE",
      branchId: branchJkt.id,
      shiftId: shiftPagi.id,
      pdpConsentAccepted: false,
    },
  });

  await prisma.user.upsert({
    where: { nik: "EMP002" },
    update: {},
    create: {
      nik: "EMP002",
      name: "Siti Rahmawati",
      email: "siti@perusahaan.com",
      passwordHash,
      role: "EMPLOYEE",
      branchId: branchJkt.id,
      shiftId: shiftPagi.id,
      pdpConsentAccepted: false,
    },
  });

  console.log("Seed data berhasil diinisialisasi!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
