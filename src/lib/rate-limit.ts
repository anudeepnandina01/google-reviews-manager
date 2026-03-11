import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Distributed rate limiter using Upstash Redis
 *
 * Works across all serverless instances (Vercel) — global rate limiting.
 * Falls back to in-memory if Upstash is not configured (dev mode).
 *
 * Setup:
 * 1. Create free Upstash account: https://console.upstash.com
 * 2. Create a Redis database
 * 3. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in env
 */

// Lazy-init Redis client (null if not configured)
let redis: Redis | null = null;
function getRedis(): Redis | null {
  if (redis) return redis;
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
    return redis;
  }
  return null;
}

// Pre-configured rate limiters for different endpoints
const limiters = new Map<string, Ratelimit>();

function getRateLimiter(prefix: string, maxRequests: number, windowMs: number): Ratelimit | null {
  const r = getRedis();
  if (!r) return null;

  const key = `${prefix}:${maxRequests}:${windowMs}`;
  if (!limiters.has(key)) {
    limiters.set(
      key,
      new Ratelimit({
        redis: r,
        prefix: `rl:${prefix}`,
        limiter: Ratelimit.slidingWindow(maxRequests, `${Math.round(windowMs / 1000)} s`),
        analytics: true,
      })
    );
  }
  return limiters.get(key)!;
}

// ==========================================
// In-memory fallback (for dev / no Redis)
// ==========================================

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

interface RateLimitOptions {
  windowMs?: number;
  maxRequests?: number;
}

/**
 * Check if a request should be rate limited
 * Uses Upstash Redis if configured, falls back to in-memory
 */
export async function checkRateLimit(
  identifier: string,
  options: RateLimitOptions = {}
): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
  const { windowMs = 60 * 1000, maxRequests = 60 } = options;

  // Try distributed (Redis) rate limiting first
  const limiter = getRateLimiter(identifier.split(":")[0] || "api", maxRequests, windowMs);
  if (limiter) {
    try {
      const result = await limiter.limit(identifier);
      return {
        allowed: result.success,
        remaining: result.remaining,
        resetIn: result.reset - Date.now(),
      };
    } catch (error) {
      // Redis error — fall through to in-memory
      console.warn("Upstash rate limit error, falling back to in-memory:", error);
    }
  }

  // Fallback: in-memory rate limiting
  return checkRateLimitInMemory(identifier, windowMs, maxRequests);
}

/**
 * In-memory rate limiter (fallback for dev or Redis failures)
 */
function checkRateLimitInMemory(
  identifier: string,
  windowMs: number,
  maxRequests: number
): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  // Clean up expired entries periodically
  if (Math.random() < 0.01) {
    cleanupExpiredEntries();
  }

  if (!entry || now > entry.resetTime) {
    // New window
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
    });
    return { allowed: true, remaining: maxRequests - 1, resetIn: windowMs };
  }

  if (entry.count >= maxRequests) {
    // Rate limited
    return {
      allowed: false,
      remaining: 0,
      resetIn: entry.resetTime - now,
    };
  }

  // Increment count
  entry.count++;
  rateLimitStore.set(identifier, entry);
  
  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    resetIn: entry.resetTime - now,
  };
}

/**
 * Clean up expired rate limit entries
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Get client IP from request headers
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }
  
  return "unknown";
}
