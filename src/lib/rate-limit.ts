/**
 * Simple in-memory rate limiter
 *
 * ⚠️  SERVERLESS LIMITATION: This rate limiter uses in-memory storage,
 * which resets on every cold start in serverless environments (Vercel).
 * Each function instance has its own counter, so limits are per-instance,
 * NOT global. This still provides some protection against rapid bursts
 * within a single warm instance.
 *
 * For production at scale, replace with:
 * - Upstash Redis (@upstash/ratelimit) — serverless-native, ~$0.20/100K requests
 * - Vercel KV (built-in Redis) — if on Vercel Pro plan
 * - Cloudflare Rate Limiting — if behind Cloudflare
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

interface RateLimitOptions {
  windowMs?: number; // Time window in milliseconds
  maxRequests?: number; // Max requests per window
}

/**
 * Check if a request should be rate limited
 * @returns true if request should be allowed, false if rate limited
 */
export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions = {}
): { allowed: boolean; remaining: number; resetIn: number } {
  const { windowMs = 60 * 1000, maxRequests = 60 } = options; // Default: 60 requests per minute
  
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
