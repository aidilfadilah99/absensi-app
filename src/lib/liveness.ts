import crypto from "crypto";

export type LivenessAction = "BLINK" | "TURN_LEFT" | "TURN_RIGHT" | "SMILE" | "NOD";

export interface LivenessChallenge {
  token: string;
  userId?: string;
  action: LivenessAction;
  instructionText: string;
  createdAt: number;
  expiresAt: number;
}

const ACTION_DESCRIPTIONS: Record<LivenessAction, string> = {
  BLINK: "Kedipkan kedua mata Anda dengan jelas",
  TURN_LEFT: "Tengokkan wajah perlahan ke arah KIRI Anda",
  TURN_RIGHT: "Tengokkan wajah perlahan ke arah KANAN Anda",
  SMILE: "Tersenyumlah lebar menghadap kamera",
  NOD: "Anggukkan kepala Anda ke bawah lalu ke atas",
};

const MAX_ACTIVE_CHALLENGES = 2000;
const CHALLENGE_TTL_MS = 2 * 60 * 1000; // 2 minutes validity

declare global {
  // eslint-disable-next-line no-var
  var __activeLivenessChallenges: Map<string, LivenessChallenge> | undefined;
  // eslint-disable-next-line no-var
  var __consumedLivenessNonces: Map<string, number> | undefined;
  // eslint-disable-next-line no-var
  var __livenessCleanupTimer: NodeJS.Timeout | undefined;
}

const activeChallenges =
  global.__activeLivenessChallenges ||
  (global.__activeLivenessChallenges = new Map<string, LivenessChallenge>());

const consumedNonces =
  global.__consumedLivenessNonces ||
  (global.__consumedLivenessNonces = new Map<string, number>());

function getHmacSecret(): string {
  return (
    process.env.JWT_SECRET ||
    "super-secret-jwt-key-min-32-chars-long-security-key-2026"
  );
}

// Singleton cleanup timer with unref() to prevent memory leaks & event loop hanging
if (!global.__livenessCleanupTimer) {
  const timer = setInterval(() => {
    const now = Date.now();
    activeChallenges.forEach((challenge, token) => {
      if (challenge.expiresAt < now) {
        activeChallenges.delete(token);
      }
    });
    consumedNonces.forEach((expiresAt, nonce) => {
      if (expiresAt < now) {
        consumedNonces.delete(nonce);
      }
    });
  }, 5 * 60 * 1000);
  timer.unref?.();
  global.__livenessCleanupTimer = timer;
}

/**
 * Generate a randomized active liveness challenge signed with HMAC-SHA256 and bound to userId
 */
export function generateLivenessChallenge(userId?: string): LivenessChallenge {
  const actions: LivenessAction[] = ["BLINK", "TURN_LEFT", "TURN_RIGHT", "SMILE"];
  const randomAction = actions[Math.floor(Math.random() * actions.length)];
  const nonce = crypto.randomBytes(16).toString("hex");
  const now = Date.now();
  const expiresAt = now + CHALLENGE_TTL_MS;

  const payloadStr = JSON.stringify({
    n: nonce,
    u: userId || "anon",
    a: randomAction,
    e: expiresAt,
  });
  const payloadB64 = Buffer.from(payloadStr).toString("base64url");
  const sig = crypto
    .createHmac("sha256", getHmacSecret())
    .update(payloadB64)
    .digest("base64url");
  const token = `${payloadB64}.${sig}`;

  // Enforce bounded capacity on activeChallenges Map (DoS prevention)
  if (activeChallenges.size >= MAX_ACTIVE_CHALLENGES) {
    const oldestKey = activeChallenges.keys().next().value;
    if (oldestKey) activeChallenges.delete(oldestKey);
  }

  const challenge: LivenessChallenge = {
    token,
    userId,
    action: randomAction,
    instructionText: ACTION_DESCRIPTIONS[randomAction],
    createdAt: now,
    expiresAt,
  };

  activeChallenges.set(token, challenge);
  return challenge;
}

/**
 * Verify that the challenge token is authentic, belongs to userId, is not expired,
 * and has never been replayed before (one-time consumption)
 */
export function verifyAndConsumeChallenge(
  token: string,
  userId?: string
): {
  isValid: boolean;
  action?: LivenessAction;
  error?: string;
} {
  if (!token || typeof token !== "string") {
    return {
      isValid: false,
      error: "Token tantangan liveness wajib disertakan.",
    };
  }

  const parts = token.split(".");
  if (parts.length === 2) {
    const [payloadB64, sig] = parts;
    const expectedSig = crypto
      .createHmac("sha256", getHmacSecret())
      .update(payloadB64)
      .digest("base64url");

    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expectedSig);
    if (
      sigBuf.length !== expBuf.length ||
      !crypto.timingSafeEqual(sigBuf, expBuf)
    ) {
      return {
        isValid: false,
        error: "Tanda tangan kriptografi token liveness tidak valid.",
      };
    }

    try {
      const decoded = JSON.parse(
        Buffer.from(payloadB64, "base64url").toString("utf-8")
      ) as { n: string; u: string; a: LivenessAction; e: number };

      const now = Date.now();
      if (decoded.e < now) {
        activeChallenges.delete(token);
        return {
          isValid: false,
          error: "Sesi verifikasi liveness telah kedaluwarsa. Silakan ulangi pengambilan wajah.",
        };
      }

      if (userId && decoded.u !== "anon" && decoded.u !== userId) {
        return {
          isValid: false,
          error: "Token liveness tidak sesuai dengan identitas pengguna aktif.",
        };
      }

      if (consumedNonces.has(decoded.n)) {
        return {
          isValid: false,
          error: "Token liveness sudah pernah digunakan (Replay Attack terdeteksi).",
        };
      }

      // Mark nonce as consumed and remove from active store
      if (consumedNonces.size >= MAX_ACTIVE_CHALLENGES) {
        const oldestNonce = consumedNonces.keys().next().value;
        if (oldestNonce) consumedNonces.delete(oldestNonce);
      }
      consumedNonces.set(decoded.n, decoded.e);
      activeChallenges.delete(token);

      return {
        isValid: true,
        action: decoded.a,
      };
    } catch {
      return {
        isValid: false,
        error: "Format token liveness rusak atau tidak dikenali.",
      };
    }
  }

  // Stateful lookup for legacy non-HMAC tokens in memory
  const challenge = activeChallenges.get(token);
  if (!challenge) {
    return {
      isValid: false,
      error: "Token verifikasi liveness tidak valid atau tidak terdaftar di server.",
    };
  }

  if (challenge.expiresAt < Date.now()) {
    activeChallenges.delete(token);
    return {
      isValid: false,
      error: "Sesi verifikasi liveness kedaluwarsa. Silakan coba lagi.",
    };
  }

  if (userId && challenge.userId && challenge.userId !== userId) {
    return {
      isValid: false,
      error: "Token liveness bukan milik akun ini.",
    };
  }

  activeChallenges.delete(token);
  return {
    isValid: true,
    action: challenge.action,
  };
}

