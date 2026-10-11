import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";
import net from "net";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { encryptBiometricEmbedding, decryptBiometricEmbedding } from "./crypto";
import { getZonedDateTimeParts } from "./security";


export interface MockUser {
  id: string;
  nik: string;
  name: string;
  email: string;
  passwordHash: string;
  phoneNumber?: string;
  role: string;
  branchId: string | null;
  shiftId: string | null;
  deviceId: string | null;
  deviceName: string | null;
  deviceBoundAt: string | Date | null;
  isActive: boolean;
  pdpConsentAccepted: boolean;
  pdpConsentAt: string | Date | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

const initialBranches = [
  {
    id: "branch-jkt-01",
    code: "JKT-HQ",
    name: "Kantor Pusat Jakarta",
    address: "Jl. Jend. Sudirman Kav. 25, Jakarta Selatan",
    latitude: -6.2088,
    longitude: 106.8456,
    radiusMeters: 250,
    timezone: "Asia/Jakarta",
    isActive: true,
  },
  {
    id: "branch-sby-01",
    code: "SBY-01",
    name: "Kantor Cabang Surabaya",
    address: "Jl. Pemuda No. 45, Surabaya",
    latitude: -7.2575,
    longitude: 112.7521,
    radiusMeters: 250,
    timezone: "Asia/Jakarta",
    isActive: true,
  },
];

const initialShifts = [
  {
    id: "shift-reguler-01",
    name: "Shift Reguler Pagi (08:00 - 17:00)",
    startTime: "08:00",
    endTime: "17:00",
    lateToleranceMinutes: 15,
    earlyDepartureToleranceMinutes: 0,
    isActive: true,
  },
  {
    id: "shift-siang-01",
    name: "Shift Siang (13:00 - 21:00)",
    startTime: "13:00",
    endTime: "21:00",
    lateToleranceMinutes: 15,
    earlyDepartureToleranceMinutes: 0,
    isActive: true,
  },
];

const defaultPasswordHash = bcrypt.hashSync("Password123!", 10);

const initialUsers: MockUser[] = [
  {
    id: "usr-admin-01",
    nik: "HR001",
    name: "Admin HRD (Senior)",
    email: "admin@perusahaan.com",
    passwordHash: defaultPasswordHash,
    phoneNumber: "081234567890",
    role: "HR_ADMIN",
    branchId: "branch-jkt-01",
    shiftId: "shift-reguler-01",
    deviceId: null,
    deviceName: null,
    deviceBoundAt: null,
    isActive: true,
    pdpConsentAccepted: true,
    pdpConsentAt: new Date().toISOString(),
  },
  {
    id: "usr-emp-01",
    nik: "EMP001",
    name: "Budi Santoso",
    email: "budi@perusahaan.com",
    passwordHash: defaultPasswordHash,
    phoneNumber: "081298765432",
    role: "EMPLOYEE",
    branchId: "branch-jkt-01",
    shiftId: "shift-reguler-01",
    deviceId: null,
    deviceName: null,
    deviceBoundAt: null,
    isActive: true,
    pdpConsentAccepted: true,
    pdpConsentAt: new Date().toISOString(),
  },
  {
    id: "usr-emp-02",
    nik: "EMP002",
    name: "Siti Rahmawati",
    email: "siti@perusahaan.com",
    passwordHash: defaultPasswordHash,
    phoneNumber: "081345678901",
    role: "EMPLOYEE",
    branchId: "branch-jkt-01",
    shiftId: "shift-reguler-01",
    deviceId: null,
    deviceName: null,
    deviceBoundAt: null,
    isActive: true,
    pdpConsentAccepted: false,
    pdpConsentAt: null,
  },
];

// Pre-compute a default encrypted face template for EMP001 so demo attendance works immediately
function createDefaultFaceTemplates() {
  const sampleDescriptor = Array.from({ length: 128 }, (_, i) => {
    const seed = Math.sin(i * 997 + 42) * 0.5;
    return Number(seed.toFixed(6));
  });
  const encrypted = encryptBiometricEmbedding(sampleDescriptor);
  return [
    {
      id: "ft-default-emp01",
      userId: "usr-emp-01",
      encryptedEmbedding: encrypted.encryptedEmbedding,
      iv: encrypted.iv,
      authTag: encrypted.authTag,
      sampleCount: 3,
      modelVersion: "vladmandic-face-api-ssd-mobilenet",
      isActive: true,
      enrolledAt: new Date().toISOString(),
    },
  ];
}

interface LocalStoreData {
  branches: any[];
  shifts: any[];
  users: MockUser[];
  faceTemplates: any[];
  attendances: any[];
  leaveRequests: any[];
  deviceRequests: any[];
  auditLogs: any[];
}

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "local-db.json");

declare global {
  // eslint-disable-next-line no-var
  var __presensiStore: LocalStoreData | undefined;
  // eslint-disable-next-line no-var
  var __pgCheckResult: { connected: boolean; checkedAt: number } | undefined;
}

function loadStore(): LocalStoreData {
  if (global.__presensiStore) {
    return global.__presensiStore;
  }

  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, "utf-8");
      const parsed = JSON.parse(raw) as LocalStoreData;
      if (parsed && Array.isArray(parsed.users) && parsed.users.length > 0) {
        global.__presensiStore = parsed;
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Initializing fresh local database store.");
  }

  const initialStore: LocalStoreData = {
    branches: [...initialBranches],
    shifts: [...initialShifts],
    users: [...initialUsers],
    faceTemplates: createDefaultFaceTemplates(),
    attendances: [],
    leaveRequests: [],
    deviceRequests: [],
    auditLogs: [],
  };

  global.__presensiStore = initialStore;
  saveStore(initialStore);
  return initialStore;
}

let asyncWriteChain: Promise<void> = Promise.resolve();

function saveStore(storeData?: LocalStoreData) {
  const data = storeData || global.__presensiStore;
  if (!data) return;

  // Serialize writes asynchronously on background promise chain to avoid blocking Node.js Event Loop
  const serializedPayload = JSON.stringify(data);
  asyncWriteChain = asyncWriteChain
    .then(async () => {
      await fsPromises.mkdir(DATA_DIR, { recursive: true });
      await fsPromises.writeFile(DATA_FILE, serializedPayload, "utf-8");
    })
    .catch(() => {
      // Ignore write errors in read-only environments
    });
}

/**
 * Fast non-blocking TCP socket check (150ms timeout) so we never hang 5-9 seconds
 * waiting for Prisma when PostgreSQL service is not running locally.
 */
async function testDbConnection(): Promise<boolean> {
  const now = Date.now();
  if (global.__pgCheckResult && now - global.__pgCheckResult.checkedAt < 60000) {
    return global.__pgCheckResult.connected;
  }

  const dbUrl = process.env.DATABASE_URL || "";
  let host = "127.0.0.1";
  let port = 5432;

  try {
    const parsed = new URL(dbUrl);
    host = parsed.hostname || "127.0.0.1";
    port = Number(parsed.port) || 5432;
  } catch {
    // fallback default
  }

  const isPortOpen = await new Promise<boolean>((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(150);
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.once("error", () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host);
  });

  if (!isPortOpen) {
    global.__pgCheckResult = { connected: false, checkedAt: now };
    return false;
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    global.__pgCheckResult = { connected: true, checkedAt: now };
    return true;
  } catch {
    global.__pgCheckResult = { connected: false, checkedAt: now };
    return false;
  }
}

export const dbService = {
  // USER METHODS
  async findUserByEmailOrNik(identifier: string) {
    if (await testDbConnection()) {
      return prisma.user.findFirst({
        where: {
          OR: [{ email: identifier }, { nik: identifier }],
        },
        include: { branch: true, shift: true },
      });
    }
    const store = loadStore();
    const cleanId = identifier.trim().toLowerCase();
    const user = store.users.find(
      (u) =>
        u.email.toLowerCase() === cleanId || u.nik.toLowerCase() === cleanId
    );
    if (!user) return null;
    const branch = store.branches.find((b) => b.id === user.branchId) || store.branches[0];
    const shift = store.shifts.find((s) => s.id === user.shiftId) || store.shifts[0];
    return { ...user, branch, shift };
  },

  async findUserById(id: string) {
    if (await testDbConnection()) {
      return prisma.user.findUnique({
        where: { id },
        include: { branch: true, shift: true },
      });
    }
    const store = loadStore();
    const user = store.users.find((u) => u.id === id);
    if (!user) return null;
    const branch = store.branches.find((b) => b.id === user.branchId) || store.branches[0];
    const shift = store.shifts.find((s) => s.id === user.shiftId) || store.shifts[0];
    return { ...user, branch, shift };
  },

  async getAllUsers() {
    if (await testDbConnection()) {
      return prisma.user.findMany({
        include: {
          branch: true,
          shift: true,
          faceTemplates: { where: { isActive: true } },
        },
        orderBy: { name: "asc" },
      });
    }
    const store = loadStore();
    return store.users.map((u) => {
      const branch = store.branches.find((b) => b.id === u.branchId) || store.branches[0];
      const shift = store.shifts.find((s) => s.id === u.shiftId) || store.shifts[0];
      const faceTemplates = store.faceTemplates.filter(
        (f) => f.userId === u.id && f.isActive
      );
      return { ...u, branch, shift, faceTemplates };
    });
  },

  async createUser(data: any) {
    const passwordHash = await bcrypt.hash(data.password || "Password123!", 10);
    if (await testDbConnection()) {
      return prisma.user.create({
        data: {
          nik: data.nik,
          name: data.name,
          email: data.email,
          phoneNumber: data.phoneNumber,
          role: data.role || "EMPLOYEE",
          branchId: data.branchId,
          shiftId: data.shiftId,
          passwordHash,
        },
      });
    }
    const store = loadStore();
    const newUser: MockUser = {
      id: "usr-" + Math.random().toString(36).substring(2, 11),
      nik: data.nik,
      name: data.name,
      email: data.email,
      phoneNumber: data.phoneNumber,
      role: data.role || "EMPLOYEE",
      branchId: data.branchId || store.branches[0]?.id || null,
      shiftId: data.shiftId || store.shifts[0]?.id || null,
      passwordHash,
      deviceId: null,
      deviceName: null,
      deviceBoundAt: null,
      isActive: true,
      pdpConsentAccepted: false,
      pdpConsentAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.users.push(newUser);
    saveStore(store);
    return newUser;
  },

  async updateUserConsent(userId: string) {
    if (await testDbConnection()) {
      return prisma.user.update({
        where: { id: userId },
        data: { pdpConsentAccepted: true, pdpConsentAt: new Date() },
      });
    }
    const store = loadStore();
    const user = store.users.find((u) => u.id === userId);
    if (user) {
      user.pdpConsentAccepted = true;
      user.pdpConsentAt = new Date().toISOString();
      saveStore(store);
    }
    return user;
  },

  async bindUserDevice(userId: string, deviceId: string, deviceName: string) {
    if (await testDbConnection()) {
      return prisma.user.update({
        where: { id: userId },
        data: {
          deviceId,
          deviceName,
          deviceBoundAt: new Date(),
        },
      });
    }
    const store = loadStore();
    const user = store.users.find((u) => u.id === userId);
    if (user) {
      user.deviceId = deviceId;
      user.deviceName = deviceName;
      user.deviceBoundAt = new Date().toISOString();
      saveStore(store);
    }
    return user;
  },

  async resetUserDevice(userId: string) {
    if (await testDbConnection()) {
      return prisma.user.update({
        where: { id: userId },
        data: {
          deviceId: null,
          deviceName: null,
          deviceBoundAt: null,
        },
      });
    }
    const store = loadStore();
    const user = store.users.find((u) => u.id === userId);
    if (user) {
      user.deviceId = null;
      user.deviceName = null;
      user.deviceBoundAt = null;
      saveStore(store);
    }
    return user;
  },

  // BRANCH METHODS
  async getAllBranches() {
    if (await testDbConnection()) {
      return prisma.branch.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
      });
    }
    const store = loadStore();
    return store.branches.filter((b) => b.isActive);
  },

  async createBranch(data: any) {
    if (await testDbConnection()) {
      return prisma.branch.create({
        data: {
          code: data.code,
          name: data.name,
          address: data.address,
          latitude: Number(data.latitude),
          longitude: Number(data.longitude),
          radiusMeters: Number(data.radiusMeters) || 150,
          timezone: data.timezone || "Asia/Jakarta",
        },
      });
    }
    const store = loadStore();
    const newBranch = {
      id: "branch-" + Math.random().toString(36).substring(2, 11),
      code: data.code,
      name: data.name,
      address: data.address,
      latitude: Number(data.latitude),
      longitude: Number(data.longitude),
      radiusMeters: Number(data.radiusMeters) || 150,
      timezone: data.timezone || "Asia/Jakarta",
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.branches.push(newBranch);
    saveStore(store);
    return newBranch;
  },

  async updateBranch(id: string, data: any) {
    if (await testDbConnection()) {
      return prisma.branch.update({ where: { id }, data });
    }
    const store = loadStore();
    const idx = store.branches.findIndex((b) => b.id === id);
    if (idx !== -1) {
      store.branches[idx] = {
        ...store.branches[idx],
        ...data,
        updatedAt: new Date().toISOString(),
      };
      saveStore(store);
      return store.branches[idx];
    }
    return null;
  },

  // SHIFT METHODS
  async getAllShifts() {
    if (await testDbConnection()) {
      return prisma.shift.findMany({
        where: { isActive: true },
        orderBy: { startTime: "asc" },
      });
    }
    const store = loadStore();
    return store.shifts.filter((s) => s.isActive);
  },

  async createShift(data: any) {
    if (await testDbConnection()) {
      return prisma.shift.create({
        data: {
          name: data.name,
          startTime: data.startTime,
          endTime: data.endTime,
          lateToleranceMinutes: Number(data.lateToleranceMinutes) || 15,
          earlyDepartureToleranceMinutes: Number(data.earlyDepartureToleranceMinutes) || 0,
        },
      });
    }
    const store = loadStore();
    const newShift = {
      id: "shift-" + Math.random().toString(36).substring(2, 11),
      name: data.name,
      startTime: data.startTime,
      endTime: data.endTime,
      lateToleranceMinutes: Number(data.lateToleranceMinutes) || 15,
      earlyDepartureToleranceMinutes: Number(data.earlyDepartureToleranceMinutes) || 0,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.shifts.push(newShift);
    saveStore(store);
    return newShift;
  },

  // BIOMETRIC FACE TEMPLATE METHODS
  async saveFaceTemplate(userId: string, descriptor: number[], sampleCount: number = 3) {
    const { encryptedEmbedding, iv, authTag } = encryptBiometricEmbedding(descriptor);

    if (await testDbConnection()) {
      await prisma.faceTemplate.updateMany({
        where: { userId, isActive: true },
        data: { isActive: false },
      });

      return prisma.faceTemplate.create({
        data: {
          userId,
          encryptedEmbedding,
          iv,
          authTag,
          sampleCount,
          isActive: true,
          enrolledAt: new Date(),
        },
      });
    }

    const store = loadStore();
    store.faceTemplates
      .filter((f) => f.userId === userId && f.isActive)
      .forEach((f) => (f.isActive = false));

    const newTemplate = {
      id: "ft-" + Math.random().toString(36).substring(2, 11),
      userId,
      encryptedEmbedding,
      iv,
      authTag,
      sampleCount,
      isActive: true,
      enrolledAt: new Date().toISOString(),
    };
    store.faceTemplates.push(newTemplate);
    saveStore(store);
    return newTemplate;
  },

  async getActiveFaceTemplate(userId: string): Promise<number[] | null> {
    let template: any = null;
    if (await testDbConnection()) {
      template = await prisma.faceTemplate.findFirst({
        where: { userId, isActive: true },
        orderBy: { enrolledAt: "desc" },
      });
    } else {
      const store = loadStore();
      const userTemplates = store.faceTemplates.filter(
        (f) => f.userId === userId && f.isActive
      );
      template = userTemplates[userTemplates.length - 1] || null;
    }

    if (!template) return null;
    try {
      return decryptBiometricEmbedding(
        template.encryptedEmbedding,
        template.iv,
        template.authTag
      );
    } catch (err) {
      console.error("Failed to decrypt biometric template:", err);
      return null;
    }
  },

  async resetUserFace(userId: string) {
    if (await testDbConnection()) {
      await prisma.faceTemplate.updateMany({
        where: { userId },
        data: { isActive: false },
      });
      return true;
    }
    const store = loadStore();
    store.faceTemplates
      .filter((f) => f.userId === userId)
      .forEach((f) => (f.isActive = false));
    saveStore(store);
    return true;
  },

  // ATTENDANCE METHODS
  async createAttendance(data: any) {
    if (await testDbConnection()) {
      return prisma.attendance.create({ data });
    }
    const store = loadStore();
    const newAtt = {
      id: "att-" + Math.random().toString(36).substring(2, 11),
      ...data,
      timestampServer: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    store.attendances.unshift(newAtt);
    saveStore(store);
    return newAtt;
  },

  async getUserAttendances(userId: string, limit: number = 50) {
    if (await testDbConnection()) {
      return prisma.attendance.findMany({
        where: { userId },
        include: { branch: true, shift: true },
        orderBy: { timestampServer: "desc" },
        take: limit,
      });
    }
    const store = loadStore();
    return store.attendances
      .filter((a) => a.userId === userId)
      .slice(0, limit)
      .map((a) => ({
        ...a,
        branch: store.branches.find((b) => b.id === a.branchId) || store.branches[0],
        shift: store.shifts.find((s) => s.id === a.shiftId) || store.shifts[0],
      }));
  },

  async getAllAttendances(filters?: { date?: string; branchId?: string; status?: string }) {
    if (await testDbConnection()) {
      const where: any = {};
      if (filters?.branchId) where.branchId = filters.branchId;
      if (filters?.status) where.status = filters.status;
      return prisma.attendance.findMany({
        where,
        include: { user: true, branch: true, shift: true },
        orderBy: { timestampServer: "desc" },
        take: 100,
      });
    }
    const store = loadStore();
    let list = [...store.attendances];
    if (filters?.branchId) {
      list = list.filter((a) => a.branchId === filters.branchId);
    }
    if (filters?.status) {
      list = list.filter((a) => a.status === filters.status);
    }
    return list.map((a) => ({
      ...a,
      user: store.users.find((u) => u.id === a.userId),
      branch: store.branches.find((b) => b.id === a.branchId) || store.branches[0],
      shift: store.shifts.find((s) => s.id === a.shiftId) || store.shifts[0],
    }));
  },

  async getTodayStats() {
    const todayWib = getZonedDateTimeParts(new Date(), "Asia/Jakarta").dateStr;
    let totalEmployees = 0;
    let attendances: any[] = [];

    if (await testDbConnection()) {
      totalEmployees = await prisma.user.count({
        where: { role: "EMPLOYEE", isActive: true },
      });
      // Query range covering WIB (UTC+7) day start & end
      const startOfWibDay = new Date(`${todayWib}T00:00:00.000+07:00`);
      const endOfWibDay = new Date(`${todayWib}T23:59:59.999+07:00`);
      attendances = await prisma.attendance.findMany({
        where: {
          timestampServer: {
            gte: startOfWibDay,
            lte: endOfWibDay,
          },
        },
        select: {
          userId: true,
          type: true,
          status: true,
          timestampServer: true,
        },
      });
    } else {
      const store = loadStore();
      totalEmployees = store.users.filter((u) => u.role === "EMPLOYEE" && u.isActive).length;
      attendances = store.attendances.filter((a) => {
        const d = getZonedDateTimeParts(new Date(a.timestampServer), "Asia/Jakarta").dateStr;
        return d === todayWib;
      });
    }

    const checkIns = attendances.filter((a) => a.type === "CHECK_IN");
    // Deduplicate by userId so multiple check-ins by the same user never inflate stats
    const uniqueByUser = new Map<string, string>();
    for (const record of checkIns) {
      if (!uniqueByUser.has(record.userId)) {
        uniqueByUser.set(record.userId, record.status);
      }
    }

    let onTimeCount = 0;
    let lateCount = 0;
    uniqueByUser.forEach((status) => {
      if (status === "ON_TIME") onTimeCount += 1;
      else if (status === "LATE") lateCount += 1;
    });

    const presentCount = uniqueByUser.size;
    const absentCount = Math.max(0, totalEmployees - presentCount);

    return {
      totalEmployees,
      presentCount,
      onTimeCount,
      lateCount,
      absentCount,
      attendanceRate: totalEmployees > 0 ? Math.round((presentCount / totalEmployees) * 100) : 0,
    };
  },

  // LEAVE REQUEST METHODS
  async createLeaveRequest(data: any) {
    if (await testDbConnection()) {
      return prisma.leaveRequest.create({ data });
    }
    const store = loadStore();
    const newLeave = {
      id: "leave-" + Math.random().toString(36).substring(2, 11),
      ...data,
      startDate: new Date(data.startDate).toISOString(),
      endDate: new Date(data.endDate).toISOString(),
      status: "PENDING",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.leaveRequests.unshift(newLeave);
    saveStore(store);
    return newLeave;
  },

  async getUserLeaveRequests(userId: string) {
    if (await testDbConnection()) {
      return prisma.leaveRequest.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      });
    }
    const store = loadStore();
    return store.leaveRequests.filter((l) => l.userId === userId);
  },

  async getAllLeaveRequests() {
    if (await testDbConnection()) {
      return prisma.leaveRequest.findMany({
        include: { user: true },
        orderBy: { createdAt: "desc" },
      });
    }
    const store = loadStore();
    return store.leaveRequests.map((l) => ({
      ...l,
      user: store.users.find((u) => u.id === l.userId),
    }));
  },

  async updateLeaveStatus(
    id: string,
    status: "APPROVED" | "REJECTED",
    approvedById: string,
    rejectionReason?: string
  ) {
    if (await testDbConnection()) {
      return prisma.leaveRequest.update({
        where: { id },
        data: {
          status,
          approvedById,
          approvedAt: new Date(),
          rejectionReason,
        },
      });
    }
    const store = loadStore();
    const idx = store.leaveRequests.findIndex((l) => l.id === id);
    if (idx !== -1) {
      store.leaveRequests[idx] = {
        ...store.leaveRequests[idx],
        status,
        approvedById,
        approvedAt: new Date().toISOString(),
        rejectionReason,
        updatedAt: new Date().toISOString(),
      };
      saveStore(store);
      return store.leaveRequests[idx];
    }
    return null;
  },

  // AUDIT LOGS
  async createAuditLogEntry(data: {
    userId?: string | null;
    action: "CREATE" | "UPDATE" | "DELETE" | "LOGIN" | "ENROLL_FACE" | "DEVICE_BIND" | "RESET_FACE";
    entityName: string;
    entityId?: string | null;
    oldValues?: any;
    newValues?: any;
    ipAddress?: string;
    userAgent?: string;
  }) {
    if (await testDbConnection()) {
      try {
        return await prisma.auditLog.create({
          data: {
            userId: data.userId || undefined,
            action: data.action,
            entityName: data.entityName,
            entityId: data.entityId || undefined,
            oldValues: data.oldValues ? JSON.stringify(data.oldValues) : undefined,
            newValues: data.newValues ? JSON.stringify(data.newValues) : undefined,
            ipAddress: data.ipAddress || "127.0.0.1",
            userAgent: data.userAgent || "Web Browser",
          },
        });
      } catch {
        // Fallback to local store
      }
    }

    const store = loadStore();
    const newLog = {
      id: store.auditLogs.length + 1,
      userId: data.userId || null,
      action: data.action,
      entityName: data.entityName,
      entityId: data.entityId || null,
      oldValues: data.oldValues ? JSON.stringify(data.oldValues) : null,
      newValues: data.newValues ? JSON.stringify(data.newValues) : null,
      ipAddress: data.ipAddress || "127.0.0.1",
      userAgent: data.userAgent || "Web Browser",
      createdAt: new Date().toISOString(),
    };
    store.auditLogs.unshift(newLog);
    saveStore(store);
    return newLog;
  },

  async getAllAuditLogs() {
    if (await testDbConnection()) {
      return prisma.auditLog.findMany({
        include: { user: true },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
    }
    const store = loadStore();
    return store.auditLogs.map((log) => ({
      ...log,
      user: store.users.find((u) => u.id === log.userId),
    }));
  },
};
