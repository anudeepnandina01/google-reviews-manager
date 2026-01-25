import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { syncLocationReviews, getUserToken, refreshTokenIfNeeded } from "@/services/google-business";

// POST: Sync reviews for a specific location
export async function POST(request: NextRequest) {
  const session = await getSession();
  
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    const body = await request.json();
    const { locationId, googleAccountName, googleLocationId } = body;
    
    if (!locationId || !googleAccountName || !googleLocationId) {
      return NextResponse.json(
        { error: "Missing required fields: locationId, googleAccountName, googleLocationId" },
        { status: 400 }
      );
    }
    
    // Verify user owns this location
    const location = await prisma.location.findFirst({
      where: {
        id: locationId,
        brand: {
          business: {
            userId: session.userId,
          },
        },
      },
    });
    
    if (!location) {
      return NextResponse.json(
        { error: "Location not found or unauthorized" },
        { status: 404 }
      );
    }
    
    // Check if user has Google Business connected
    const token = await getUserToken(session.userId);
    if (!token) {
      return NextResponse.json(
        { error: "Google Business Profile not connected" },
        { status: 400 }
      );
    }
    
    // Validate token
    try {
      await refreshTokenIfNeeded(token);
    } catch {
      return NextResponse.json(
        { error: "Google Business token expired. Please reconnect." },
        { status: 401 }
      );
    }
    
    // Sync reviews
    const result = await syncLocationReviews(
      session.userId,
      locationId,
      googleAccountName,
      googleLocationId
    );
    
    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Error syncing reviews:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to sync reviews" },
      { status: 500 }
    );
  }
}
