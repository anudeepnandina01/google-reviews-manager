import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { syncLocationReviews, getUserToken, refreshTokenIfNeeded, getUserBusinessLocations } from "@/services/google-business";

// POST: Sync reviews for all connected locations
export async function POST() {
  const session = await getSession();
  
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
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
    
    // Get all locations with googleLocationId for this user
    const locations = await prisma.location.findMany({
      where: {
        googleLocationId: { not: null },
        brand: {
          business: {
            userId: session.userId,
          },
        },
      },
      include: {
        brand: {
          include: {
            business: true,
          },
        },
      },
    });
    
    if (locations.length === 0) {
      // Try to auto-link locations by getting Google Business locations
      const googleData = await getUserBusinessLocations(session.userId);
      
      // Get all user's locations
      const allLocations = await prisma.location.findMany({
        where: {
          brand: {
            business: {
              userId: session.userId,
            },
          },
        },
        include: {
          brand: {
            include: {
              business: true,
            },
          },
        },
      });
      
      // Try to match by place ID
      for (const { locations: googleLocations } of googleData.accounts) {
        for (const googleLocation of googleLocations) {
          const placeId = googleLocation.metadata?.placeId;
          if (placeId) {
            const matchingLocation = allLocations.find(
              (loc) => loc.googlePlaceId === placeId
            );
            if (matchingLocation) {
              await prisma.location.update({
                where: { id: matchingLocation.id },
                data: { 
                  googleLocationId: googleLocation.name,
                },
              });
              console.log(`Auto-linked location ${matchingLocation.name} to ${googleLocation.name}`);
            }
          }
        }
      }
      
      return NextResponse.json({
        success: true,
        message: "No linked locations found. Attempted auto-linking by Place ID.",
        synced: 0,
        results: [],
      });
    }
    
    // Get Google accounts for reference
    const googleData = await getUserBusinessLocations(session.userId);
    
    // Build a map of googleLocationId to account name
    const locationToAccount = new Map<string, string>();
    for (const { account, locations: googleLocations } of googleData.accounts) {
      for (const loc of googleLocations) {
        locationToAccount.set(loc.name, account.name);
      }
    }
    
    // Sync each location
    const results: Array<{
      locationId: string;
      locationName: string;
      success: boolean;
      synced?: number;
      new?: number;
      updated?: number;
      error?: string;
    }> = [];
    
    for (const location of locations) {
      const accountName = locationToAccount.get(location.googleLocationId!);
      
      if (!accountName) {
        results.push({
          locationId: location.id,
          locationName: location.name,
          success: false,
          error: "Could not find Google account for this location",
        });
        continue;
      }
      
      try {
        const result = await syncLocationReviews(
          session.userId,
          location.id,
          accountName,
          location.googleLocationId!
        );
        
        results.push({
          locationId: location.id,
          locationName: location.name,
          success: true,
          ...result,
        });
      } catch (error) {
        results.push({
          locationId: location.id,
          locationName: location.name,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
    
    const totalSynced = results
      .filter((r) => r.success)
      .reduce((sum, r) => sum + (r.synced || 0), 0);
    
    return NextResponse.json({
      success: true,
      synced: totalSynced,
      results,
    });
  } catch (error) {
    console.error("Error syncing all reviews:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to sync reviews" },
      { status: 500 }
    );
  }
}
