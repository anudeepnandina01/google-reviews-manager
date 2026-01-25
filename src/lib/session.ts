import { cookies } from "next/headers";
import { signToken, verifyToken } from "./jwt";

export interface SessionUser {
  userId: string;
  email: string;
  name: string;
  image: string | null;
}

/**
 * Get current session from cookie
 * Uses JWT verification for security
 */
export async function getSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session");

    if (!sessionCookie?.value) {
      return null;
    }

    // Verify JWT token (cryptographically signed)
    const payload = verifyToken(sessionCookie.value);
    
    if (!payload) {
      return null;
    }

    return {
      userId: payload.userId,
      email: payload.email,
      name: payload.name,
      image: payload.image,
    };
  } catch {
    return null;
  }
}

/**
 * Create a new session with signed JWT
 */
export async function createSession(user: SessionUser): Promise<void> {
  const token = signToken({
    userId: user.userId,
    email: user.email,
    name: user.name,
    image: user.image,
  });

  const cookieStore = await cookies();
  cookieStore.set("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: "/",
  });
}

/**
 * Clear session cookie
 */
export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete("session");
}

