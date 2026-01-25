import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { randomBytes } from "crypto";
import { cookies } from "next/headers";

// Initiate OAuth flow to connect Google Business Profile
export async function GET() {
  const session = await getSession();
  
  if (!session?.userId) {
    return NextResponse.redirect(new URL("/auth/signin", process.env.NEXTAUTH_URL || "http://localhost:3000"));
  }
  
  const clientId = process.env.GOOGLE_CLIENT_ID;
  
  if (!clientId) {
    return NextResponse.json(
      { error: "Google OAuth not configured" },
      { status: 500 }
    );
  }
  
  // Generate state for CSRF protection
  const state = randomBytes(32).toString("hex");
  
  // Store state in cookie for verification
  const cookieStore = await cookies();
  cookieStore.set("google_business_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10, // 10 minutes
    path: "/",
  });
  
  // Build OAuth URL with Google Business Profile scope
  const redirectUri = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/auth/google-business/callback`;
  
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: [
      "https://www.googleapis.com/auth/business.manage", // Read/write access to Google Business Profile
      "openid",
      "email",
      "profile",
    ].join(" "),
    access_type: "offline", // Required to get refresh token
    prompt: "consent", // Force consent to get refresh token
    state: state,
  });
  
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  
  return NextResponse.redirect(authUrl);
}
