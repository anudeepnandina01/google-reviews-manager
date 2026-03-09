import jwt, { SignOptions } from "jsonwebtoken";

/**
 * Get JWT secret from environment variables.
 * SECURITY: Never use a hardcoded fallback — fail hard if missing.
 */
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error(
      "CRITICAL: JWT_SECRET or NEXTAUTH_SECRET environment variable must be set. " +
      "Generate one with: openssl rand -base64 32"
    );
  }
  return secret;
}

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  image: string | null;
}

/**
 * Sign a session payload into a JWT token
 */
export function signToken(payload: SessionPayload, expiresIn: string = "7d"): string {
  const options: SignOptions = { expiresIn: expiresIn as jwt.SignOptions["expiresIn"] };
  return jwt.sign(payload as object, getJwtSecret(), options);
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): SessionPayload | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as SessionPayload;
    return decoded;
  } catch {
    return null;
  }
}
