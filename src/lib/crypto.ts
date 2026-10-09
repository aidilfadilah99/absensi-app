import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits for GCM

// Get 32-byte key from environment or fallback hash
function getEncryptionKey(): Buffer {
  const keyHex = process.env.BIOMETRIC_ENCRYPTION_KEY || "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  return crypto.createHash("sha256").update(keyHex).digest();
}

/**
 * Encrypt 128-dimensional float descriptor using AES-256-GCM
 * Compliance with UU PDP No. 27/2022 for sensitive biometric data
 */
export function encryptBiometricEmbedding(descriptor: number[]): {
  encryptedEmbedding: string;
  iv: string;
  authTag: string;
} {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  // Convert float array to Buffer
  const floatBuffer = Buffer.from(new Float32Array(descriptor).buffer);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(floatBuffer), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    encryptedEmbedding: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
  };
}

/**
 * Decrypt 128-dimensional float descriptor from AES-256-GCM
 */
export function decryptBiometricEmbedding(
  encryptedBase64: string,
  ivBase64: string,
  authTagBase64: string
): number[] {
  const key = getEncryptionKey();
  const iv = Buffer.from(ivBase64, "base64");
  const authTag = Buffer.from(authTagBase64, "base64");
  const encrypted = Buffer.from(encryptedBase64, "base64");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decryptedBuffer = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  const floatArray = new Float32Array(
    decryptedBuffer.buffer,
    decryptedBuffer.byteOffset,
    decryptedBuffer.byteLength / 4
  );

  return Array.from(floatArray);
}

/**
 * Calculate Euclidean Distance between two 128-d face descriptors
 * Standard metric used by face-api.js / ResNet models
 * Distance <= 0.45 is generally considered a match (0 = identical, 1+ = completely different)
 */
export function calculateEuclideanDistance(descriptorA: number[], descriptorB: number[]): number {
  if (descriptorA.length !== descriptorB.length) {
    throw new Error("Vector dimension mismatch: must both be 128 dimensions");
  }

  let sum = 0;
  for (let i = 0; i < descriptorA.length; i++) {
    const diff = descriptorA[i] - descriptorB[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

/**
 * Evaluate face match against threshold and calculate confidence percentage
 */
export function evaluateFaceMatch(
  distance: number,
  threshold: number = Number(process.env.FACE_MATCH_DISTANCE_THRESHOLD) || 0.45
): {
  isMatch: boolean;
  distance: number;
  confidencePercentage: number;
} {
  const isMatch = distance <= threshold;
  // Convert distance to confidence percentage: 0.0 -> 100%, threshold (0.45) -> 70%, 1.0+ -> 0%
  const confidence = Math.max(0, Math.min(100, Math.round((1 - distance / (threshold * 1.5)) * 100)));

  return {
    isMatch,
    distance: Number(distance.toFixed(4)),
    confidencePercentage: Math.max(0, confidence),
  };
}
