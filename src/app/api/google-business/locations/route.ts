import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getUserBusinessLocations, getUserToken, refreshTokenIfNeeded } from "@/services/google-business";

// GET: Fetch all Google Business accounts and locations for the user
export async function GET() {
  const session = await getSession();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    const token = await getUserToken(session.user.id);
    
    if (!token) {
      return NextResponse.json(
        { error: "Google Business Profile not connected" },
        { status: 400 }
      );
    }
    
    // Check token validity
    try {
      await refreshTokenIfNeeded(token);
    } catch {
      return NextResponse.json(
        { error: "Google Business token expired. Please reconnect." },
        { status: 401 }
      );
    }
    
    const data = await getUserBusinessLocations(session.user.id);
    
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching Google Business locations:", error);
    return NextResponse.json(
      { error: "Failed to fetch Google Business locations" },
      { status: 500 }
    );
  }
}
