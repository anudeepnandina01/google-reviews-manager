import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getPlaceDetailsFromInput } from "@/services/google-places";

// GET /api/businesses/[businessId]/brands/[brandId]/locations - List locations for a brand
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string; brandId: string }> }
) {
  try {
    const { businessId, brandId } = await params;
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify business and brand belong to user
    const brand = await prisma.brand.findFirst({
      where: {
        id: brandId,
        businessId,
        business: {
          userId: session.userId,
        },
      },
    });

    if (!brand) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }

    const locations = await prisma.location.findMany({
      where: { brandId },
      include: {
        _count: {
          select: { reviews: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ locations });
  } catch (error) {
    console.error("Error fetching locations:", error);
    return NextResponse.json(
      { error: "Failed to fetch locations" },
      { status: 500 }
    );
  }
}

// POST /api/businesses/[businessId]/brands/[brandId]/locations - Create a new location
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string; brandId: string }> }
) {
  try {
    const { businessId, brandId } = await params;
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify business and brand belong to user
    const brand = await prisma.brand.findFirst({
      where: {
        id: brandId,
        businessId,
        business: {
          userId: session.userId,
        },
      },
    });

    if (!brand) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }

    const body = await request.json();
    const { googleUrl, name, address, googlePlaceId } = body;

    let locationData: {
      name: string;
      address: string | null;
      googlePlaceId: string | null;
      brandId: string;
    };

    // If googleUrl is provided, auto-fetch details
    if (googleUrl) {
      try {
        const placeDetails = await getPlaceDetailsFromInput(googleUrl);
        
        // Check if location with this Place ID already exists
        const existingLocation = await prisma.location.findFirst({
          where: { googlePlaceId: placeDetails.placeId },
        });

        if (existingLocation) {
          return NextResponse.json(
            { error: "This location has already been added", existingLocation },
            { status: 409 }
          );
        }

        locationData = {
          name: placeDetails.name,
          address: placeDetails.address,
          googlePlaceId: placeDetails.placeId,
          brandId,
        };
      } catch (error) {
        console.error("Error fetching place details:", error);
        return NextResponse.json(
          { error: "Failed to fetch place details from Google. Please check the URL and try again." },
          { status: 400 }
        );
      }
    } else {
      // Manual entry
      if (!name?.trim()) {
        return NextResponse.json(
          { error: "Location name is required" },
          { status: 400 }
        );
      }

      locationData = {
        name: name.trim(),
        address: address?.trim() || null,
        googlePlaceId: googlePlaceId?.trim() || null,
        brandId,
      };
    }

    const location = await prisma.location.create({
      data: locationData,
    });

    return NextResponse.json({ location }, { status: 201 });
  } catch (error) {
    console.error("Error creating location:", error);
    return NextResponse.json(
      { error: "Failed to create location" },
      { status: 500 }
    );
  }
}
