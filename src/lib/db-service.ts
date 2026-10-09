import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { encryptBiometricEmbedding, decryptBiometricEmbedding } from "./crypto";

// Default initial mock data for instant out-of-the-box development & testing
const initialBranches = [
  {
    id: "branch-jkt-01",
    code: "JKT-HQ",
    name: "Kantor Pusat Jakarta",
    address: "Jl. Sudirman Kav. 25, Jakarta Selatan",
    latitude: -6.2088,
    longitude: 106.8456,
    radiusMeters: 200,
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
    name: "Shift Reguler Pagi",
    startTime: "08:00",
    endTime: "17:00",
    lateToleranceMinutes: 15,
    earlyDepartureToleranceMinutes: 0,
    isActive: true,
  },
  {
    id: "shift-siang-01",
    name: "Shift Siang",
    startTime: "13:00",
    endTime: "21:00",
    lateToleranceMinutes: 15,
    earlyDepartureToleranceMinutes: 0,
    isActive: true,
  },
];

const defaultPasswordHash = bcrypt.hashSync("Password123!", 10);

interface MockUser {
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
  deviceBoundAt: Date | null;
  isActive: boolean;
  pdpConsentAccepted: boolean;
  pdpConsentAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

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
    pdpConsentAt: new Date(),
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
    pdpConsentAccepted: false,
    pdpConsentAt: null,
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

// In-Memory store fallback
const memoryStore = {
  branches: [...initialBranches],
  shifts: [...initialShifts],
  users: [...initialUsers] as MockUser[],
  faceTemplates: [] as any[],
  attendances: [] as any[],
  leaveRequests: [] as any[],
  deviceRequests: [] as any[],
  auditLogs: [] as any[],
};

// Check if PostgreSQL is available
let isPrismaConnected: boolean | null = null;
async function testDbConnection(): Promise<boolean> {
  if (isPrismaConnected !== null) return isPrismaConnected;
  try {
    await prisma.$queryRaw`SELECT 1`;
    isPrismaConnected = true;
    return true;
  } catch (err) {
    isPrismaConnected = false;
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
    const user = memoryStore.users.find(
      (u) =>
        u.email.toLowerCase() === identifier.toLowerCase() ||
        u.nik.toLowerCase() === identifier.toLowerCase()
    );
    if (!user) return null;
    const branch = memoryStore.branches.find((b) => b.id === user.branchId);
    const shift = memoryStore.shifts.find((s) => s.id === user.shiftId);
    return { ...user, branch, shift };
  },

  async findUserById(id: string) {
    if (await testDbConnection()) {
      return prisma.user.findUnique({
        where: { id },
        include: { branch: true, shift: true },
      });
    }
    const user = memoryStore.users.find((u) => u.id === id);
    if (!user) return null;
    const branch = memoryStore.branches.find((b) => b.id === user.branchId);
    const shift = memoryStore.shifts.find((s) => s.id === user.shiftId);
    return { ...user, branch, shift };
  },

  async getAllUsers() {
    if (await testDbConnection()) {
      return prisma.user.findMany({
        include: { branch: true, shift: true, faceTemplates: { where: { isActive: true } } },
        orderBy: { name: "asc" },
      });
    }
    return memoryStore.users.map((u) => {
      const branch = memoryStore.branches.find((b) => b.id === u.branchId);
      const shift = memoryStore.shifts.find((s) => s.id === u.shiftId);
      const faceTemplates = memoryStore.faceTemplates.filter(
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
    const newUser = {
      id: "usr-" + Math.random().toString(36).substr(2, 9),
      nik: data.nik,
      name: data.name,
      email: data.email,
      phoneNumber: data.phoneNumber,
      role: data.role || "EMPLOYEE",
      branchId: data.branchId,
      shiftId: data.shiftId,
      passwordHash,
      deviceId: null,
      deviceName: null,
      deviceBoundAt: null,
      isActive: true,
      pdpConsentAccepted: false,
      pdpConsentAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    memoryStore.users.push(newUser);
    return newUser;
  },

  async updateUserConsent(userId: string) {
    if (await testDbConnection()) {
      return prisma.user.update({
        where: { id: userId },
        data: { pdpConsentAccepted: true, pdpConsentAt: new Date() },
      });
    }
    const user = memoryStore.users.find((u) => u.id === userId);
    if (user) {
      user.pdpConsentAccepted = true;
      user.pdpConsentAt = new Date();
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
    const user = memoryStore.users.find((u) => u.id === userId);
    if (user) {
      user.deviceId = deviceId;
      user.deviceName = deviceName;
      user.deviceBoundAt = new Date();
    }
    return user;
  },

  // BRANCH METHODS
  async getAllBranches() {
    if (await testDbConnection()) {
      return prisma.branch.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
    }
    return memoryStore.branches.filter((b) => b.isActive);
  },

  async createBranch(data: any) {
    if (await testDbConnection()) {
      return prisma.branch.create({ data });
    }
    const newBranch = {
      id: "branch-" + Math.random().toString(36).substr(2, 9),
      code: data.code,
      name: data.name,
      address: data.address,
      latitude: Number(data.latitude),
      longitude: Number(data.longitude),
      radiusMeters: Number(data.radiusMeters) || 150,
      timezone: data.timezone || "Asia/Jakarta",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    memoryStore.branches.push(newBranch);
    return newBranch;
  },

  async updateBranch(id: string, data: any) {
    if (await testDbConnection()) {
      return prisma.branch.update({ where: { id }, data });
    }
    const idx = memoryStore.branches.findIndex((b) => b.id === id);
    if (idx !== -1) {
      memoryStore.branches[idx] = { ...memoryStore.branches[idx], ...data, updatedAt: new Date() };
      return memoryStore.branches[idx];
    }
    return null;
  },

  // SHIFT METHODS
  async getAllShifts() {
    if (await testDbConnection()) {
      return prisma.shift.findMany({ where: { isActive: true }, orderBy: { startTime: "asc" } });
    }
    return memoryStore.shifts.filter((s) => s.isActive);
  },

  async createShift(data: any) {
    if (await testDbConnection()) {
      return prisma.shift.create({ data });
    }
    const newShift = {
      id: "shift-" + Math.random().toString(36).substr(2, 9),
      name: data.name,
      startTime: data.startTime,
      endTime: data.endTime,
      lateToleranceMinutes: Number(data.lateToleranceMinutes) || 15,
      earlyDepartureToleranceMinutes: Number(data.earlyDepartureToleranceMinutes) || 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    memoryStore.shifts.push(newShift);
    return newShift;
  },

  // BIOMETRIC FACE TEMPLATE METHODS
  async saveFaceTemplate(userId: string, descriptor: number[], sampleCount: number = 3) {
    const { encryptedEmbedding, iv, authTag } = encryptBiometricEmbedding(descriptor);

    if (await testDbConnection()) {
      // Inactivate previous templates
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

    // In-memory
    memoryStore.faceTemplates
      .filter((f) => f.userId === userId && f.isActive)
      .forEach((f) => (f.isActive = false));

    const newTemplate = {
      id: "ft-" + Math.random().toString(36).substr(2, 9),
      userId,
      encryptedEmbedding,
      iv,
      authTag,
      sampleCount,
      isActive: true,
      enrolledAt: new Date(),
    };
    memoryStore.faceTemplates.push(newTemplate);
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
      template = memoryStore.faceTemplates.find(
        (f) => f.userId === userId && f.isActive
      );
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

  async resetUserFace(userId: string, adminId?: string) {
    if (await testDbConnection()) {
      await prisma.faceTemplate.updateMany({
        where: { userId },
        data: { isActive: false },
      });
      return true;
    }
    memoryStore.faceTemplates
      .filter((f) => f.userId === userId)
      .forEach((f) => (f.isActive = false));
    return true;
  },

  // ATTENDANCE METHODS
  async createAttendance(data: any) {
    if (await testDbConnection()) {
      return prisma.attendance.create({ data });
    }
    const newAtt = {
      id: "att-" + Math.random().toString(36).substr(2, 9),
      ...data,
      timestampServer: new Date(),
      createdAt: new Date(),
    };
    memoryStore.attendances.unshift(newAtt);
    return newAtt;
  },

  async getUserAttendances(userId: string, limit: number = 30) {
    if (await testDbConnection()) {
      return prisma.attendance.findMany({
        where: { userId },
        include: { branch: true, shift: true },
        orderBy: { timestampServer: "desc" },
        take: limit,
      });
    }
    return memoryStore.attendances
      .filter((a) => a.userId === userId)
      .slice(0, limit)
      .map((a) => ({
        ...a,
        branch: memoryStore.branches.find((b) => b.id === a.branchId),
        shift: memoryStore.shifts.find((s) => s.id === a.shiftId),
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
    return memoryStore.attendances.map((a) => ({
      ...a,
      user: memoryStore.users.find((u) => u.id === a.userId),
      branch: memoryStore.branches.find((b) => b.id === a.branchId),
      shift: memoryStore.shifts.find((s) => s.id === a.shiftId),
    }));
  },

  async getTodayStats() {
    const today = new Date().toISOString().slice(0, 10);
    const allUsers = await this.getAllUsers();
    const totalEmployees = allUsers.filter((u) => u.role === "EMPLOYEE").length;

    let attendances: any[] = [];
    if (await testDbConnection()) {
      attendances = await prisma.attendance.findMany({
        where: {
          timestampServer: {
            gte: new Date(today + "T00:00:00.000Z"),
            lte: new Date(today + "T23:59:59.999Z"),
          },
        },
      });
    } else {
      attendances = memoryStore.attendances.filter((a) => {
        const d = new Date(a.timestampServer).toISOString().slice(0, 10);
        return d === today;
      });
    }

    const checkIns = attendances.filter((a) => a.type === "CHECK_IN");
    const onTimeCount = checkIns.filter((a) => a.status === "ON_TIME").length;
    const lateCount = checkIns.filter((a) => a.status === "LATE").length;
    const presentCount = checkIns.length;
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
    const newLeave = {
      id: "leave-" + Math.random().toString(36).substr(2, 9),
      ...data,
      status: "PENDING",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    memoryStore.leaveRequests.unshift(newLeave);
    return newLeave;
  },

  async getUserLeaveRequests(userId: string) {
    if (await testDbConnection()) {
      return prisma.leaveRequest.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      });
    }
    return memoryStore.leaveRequests.filter((l) => l.userId === userId);
  },

  async getAllLeaveRequests() {
    if (await testDbConnection()) {
      return prisma.leaveRequest.findMany({
        include: { user: true },
        orderBy: { createdAt: "desc" },
      });
    }
    return memoryStore.leaveRequests.map((l) => ({
      ...l,
      user: memoryStore.users.find((u) => u.id === l.userId),
    }));
  },

  async updateLeaveStatus(id: string, status: "APPROVED" | "REJECTED", approvedById: string, rejectionReason?: string) {
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
    const idx = memoryStore.leaveRequests.findIndex((l) => l.id === id);
    if (idx !== -1) {
      memoryStore.leaveRequests[idx] = {
        ...memoryStore.leaveRequests[idx],
        status,
        approvedById,
        approvedAt: new Date(),
        rejectionReason,
        updatedAt: new Date(),
      };
      return memoryStore.leaveRequests[idx];
    }
    return null;
  },

  // AUDIT LOGS
  async getAllAuditLogs() {
    if (await testDbConnection()) {
      return prisma.auditLog.findMany({
        include: { user: true },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
    }
    return memoryStore.auditLogs.map((log) => ({
      ...log,
      user: memoryStore.users.find((u) => u.id === log.userId),
    }));
  },
};
