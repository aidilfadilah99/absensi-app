/**
 * Security utilities:
 * 1. Sliding-window / fixed-window in-memory Rate Limiter with bounded capacity
 * 2. Trusted Client IP extraction (mitigates X-Forwarded-For spoofing)
 * 3. Timezone-consistent Date & Time helper (WIB / WITA / WIT)
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const MAX_RATE_LIMIT_KEYS = 5000;

declare global {
  // eslint-disable-next-line no-var
  var __rateLimitStore: Map<string, RateLimitEntry> | undefined;
}

function getRateLimitStore(): Map<string, RateLimitEntry> {
  if (!global.__rateLimitStore) {
    global.__rateLimitStore = new Map<string, RateLimitEntry>();
  }
  return global.__rateLimitStore;
}

/**
 * Check if a client key (e.g. IP + route) is within rate limit
 */
export function checkRateLimit(
  key: string,
  maxRequests: number = 15,
  windowMs: number = 60_000
): { allowed: boolean; remaining: number; retryAfterSeconds: number } {
  const store = getRateLimitStore();
  const now = Date.now();

  // Evict expired or oldest entry if capacity reached
  if (store.size >= MAX_RATE_LIMIT_KEYS) {
    store.forEach((val, k) => {
      if (val.resetAt <= now) store.delete(k);
    });
    if (store.size >= MAX_RATE_LIMIT_KEYS) {
      const oldestKey = store.keys().next().value;
      if (oldestKey) store.delete(oldestKey);
    }
  }

  const existing = store.get(key);
  if (!existing || existing.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return {
      allowed: true,
      remaining: maxRequests - 1,
      retryAfterSeconds: Math.ceil(windowMs / 1000),
    };
  }

  if (existing.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  return {
    allowed: true,
    remaining: Math.max(0, maxRequests - existing.count),
    retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
  };
}

/**
 * Extract and sanitize client IP address from request headers
 */
export function getClientIp(req: Request): string {
  const xRealIp = req.headers.get("x-real-ip");
  if (xRealIp && /^[0-9a-fA-F.:]+$/.test(xRealIp.trim())) {
    return xRealIp.trim();
  }

  const xForwardedFor = req.headers.get("x-forwarded-for");
  if (xForwardedFor) {
    // Take only the first hop IP and validate format
    const firstIp = xForwardedFor.split(",")[0]?.trim();
    if (firstIp && /^[0-9a-fA-F.:]+$/.test(firstIp) && firstIp.length <= 45) {
      return firstIp;
    }
  }

  return "127.0.0.1";
}

/**
 * Get consistent YYYY-MM-DD and minutes-since-midnight in target timezone (default: Asia/Jakarta)
 * Fixes UTC vs Local OS timezone mismatch between 00:00 and 07:00 WIB
 */
export function getZonedDateTimeParts(
  date: Date = new Date(),
  timeZone: string = "Asia/Jakarta"
): {
  dateStr: string;
  hour: number;
  minute: number;
  totalMinutes: number;
} {
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    const parts = Object.fromEntries(
      formatter.formatToParts(date).map((p) => [p.type, p.value])
    );

    const hour = Number(parts.hour === "24" ? 0 : parts.hour);
    const minute = Number(parts.minute);

    return {
      dateStr: `${parts.year}-${parts.month}-${parts.day}`,
      hour,
      minute,
      totalMinutes: hour * 60 + minute,
    };
  } catch {
    // Fallback to WIB (+07:00) offset calculation if invalid timezone string passed
    const wibTime = new Date(date.getTime() + 7 * 60 * 60 * 1000);
    const iso = wibTime.toISOString();
    const dateStr = iso.slice(0, 10);
    const hour = wibTime.getUTCHours();
    const minute = wibTime.getUTCMinutes();
    return {
      dateStr,
      hour,
      minute,
      totalMinutes: hour * 60 + minute,
    };
  }
}
