import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession, clearSession } from "@/lib/session";
import { verifyFirebaseToken } from "@/lib/firebase-admin";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const isDev = process.env.NODE_ENV === "development";

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 10 auth attempts per minute per IP
    const clientIp = getClientIp(request);
    const rateLimit = checkRateLimit(`auth:${clientIp}`, {
      windowMs: 60 * 1000,
      maxRequests: 10,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const { idToken } = await request.json();

    if (!idToken) {
      return NextResponse.json(
        { error: "ID token is required" },
        { status: 400 }
      );
    }

    // Verify Firebase ID token
    const tokenData = await verifyFirebaseToken(idToken);
    
    if (!tokenData || !tokenData.email) {
      console.error("Token verification failed:", { tokenData, hasServiceAccount: !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY });
      return NextResponse.json(
        { error: "Invalid or expired token. Check server logs." },
        { status: 401 }
      );
    }

    const { email, name, picture } = tokenData;

    // Try to find or create user in database
    let user;
    try {
      user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        // Create new user
        user = await prisma.user.create({
          data: {
            email,
            name: name || email.split("@")[0],
            image: picture || null,
          },
        });
      } else {
        // Update existing user
        user = await prisma.user.update({
          where: { email },
          data: {
            name: name || user.name,
            image: picture || user.image,
          },
        });
      }
    } catch (dbError) {
      // In development, if database is unreachable, create a mock session
      if (isDev) {
        console.warn("Database unreachable in dev mode, creating mock session for:", email);
        await createSession({
          userId: `dev-${email.replace(/[^a-z0-9]/gi, "")}`,
          email: email,
          name: name || email.split("@")[0],
          image: picture || null,
        });
        return NextResponse.json({
          success: true,
          user: {
            id: `dev-${email.replace(/[^a-z0-9]/gi, "")}`,
            email,
            name: name || email.split("@")[0],
            image: picture || null,
          },
          warning: "Running in dev mode without database connection",
        });
      }
      throw dbError;
    }

    // Create signed JWT session
    await createSession({
      userId: user.id,
      email: user.email!,
      name: user.name || "",
      image: user.image,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
      },
    });
  } catch (error) {
    console.error("Firebase auth error:", error);
    
    // Check if it's a database connection error
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    if (errorMessage.includes("Can't reach database") || errorMessage.includes("P1001")) {
      return NextResponse.json(
        { error: "Database connection failed. If running locally, please check your network connection to Supabase or deploy to Vercel for testing." },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { error: `Authentication failed: ${errorMessage}` },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    await clearSession();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { error: "Logout failed" },
      { status: 500 }
    );
  }
}
