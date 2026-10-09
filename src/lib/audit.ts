import { prisma } from "./prisma";

export async function createAuditLog({
  userId,
  action,
  entityName,
  entityId,
  oldValues,
  newValues,
  ipAddress = "127.0.0.1",
  userAgent = "Web Browser",
}: {
  userId?: string | null;
  action: "CREATE" | "UPDATE" | "DELETE" | "LOGIN" | "ENROLL_FACE" | "DEVICE_BIND" | "RESET_FACE";
  entityName: string;
  entityId?: string | null;
  oldValues?: any;
  newValues?: any;
  ipAddress?: string;
  userAgent?: string;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: userId || undefined,
        action,
        entityName,
        entityId: entityId || undefined,
        oldValues: oldValues ? JSON.stringify(oldValues) : undefined,
        newValues: newValues ? JSON.stringify(newValues) : undefined,
        ipAddress,
        userAgent,
      },
    });
  } catch (err) {
    console.warn("Audit log creation skipped (fallback):", err);
  }
}
