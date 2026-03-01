import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

// Handle OAuth callback from Google
export async function GET(request: NextRequest) {
  const session = await getSession();
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  
  if (!session?.userId) {
    return NextResponse.redirect(new URL("/auth/signin", baseUrl));
  }
  
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  
  // Check for OAuth error
  if (error) {
    console.error("Google OAuth error:", error);
    return NextResponse.redirect(
      new URL(`/dashboard/settings/google?error=${encodeURIComponent(error)}`, baseUrl)
    );
  }
  
  // Verify state to prevent CSRF
  const cookieStore = await cookies();
  const savedState = cookieStore.get("google_business_oauth_state")?.value;
  
  if (!state || state !== savedState) {
    console.error("OAuth state mismatch");
    return NextResponse.redirect(
      new URL("/dashboard/settings/google?error=invalid_state", baseUrl)
    );
  }
  
  // Clear the state cookie
  cookieStore.delete("google_business_oauth_state");
  
  if (!code) {
    return NextResponse.redirect(
      new URL("/dashboard/settings/google?error=no_code", baseUrl)
    );
  }
  
  try {
    // Exchange code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        code: code,
        grant_type: "authorization_code",
        redirect_uri: `${baseUrl}/api/auth/google-business/callback`,
      }),
    });
    
    const tokenData = await tokenResponse.json();
    
    if (!tokenResponse.ok || tokenData.error) {
      console.error("Token exchange error:", tokenData);
      return NextResponse.redirect(
        new URL(`/dashboard/settings/google?error=${encodeURIComponent(tokenData.error || "token_exchange_failed")}`, baseUrl)
      );
    }
    
    const { access_token, refresh_token, expires_in, scope } = tokenData;
    
    if (!refresh_token) {
      console.error("No refresh token received - user may need to revoke access and try again");
      return NextResponse.redirect(
        new URL("/dashboard/settings/google?error=no_refresh_token", baseUrl)
      );
    }
    
    // Calculate expiry time
    const expiresAt = new Date(Date.now() + expires_in * 1000);
    
    // Store tokens in database (upsert to handle reconnection)
    await prisma.googleBusinessToken.upsert({
      where: { userId: session.userId },
      update: {
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt: expiresAt,
        scope: scope,
      },
      create: {
        userId: session.userId,
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt: expiresAt,
        scope: scope,
      },
    });
    
    console.log(`Google Business Profile connected for user ${session.userId}`);
    
    return NextResponse.redirect(
      new URL("/dashboard/settings/google?success=google_business_connected", baseUrl)
    );
  } catch (error) {
    console.error("Error handling OAuth callback:", error);
    return NextResponse.redirect(
      new URL("/dashboard/settings/google?error=server_error", baseUrl)
    );
  }
}
