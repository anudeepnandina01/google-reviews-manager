import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getPlaceDetailsFromInput } from "@/services/google-places";

// POST /api/places/lookup - Preview place details from Google Maps URL
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { input } = body;

    if (!input?.trim()) {
      return NextResponse.json(
        { error: "Google Maps URL or Place ID is required" },
        { status: 400 }
      );
    }

    const placeDetails = await getPlaceDetailsFromInput(input.trim());

    return NextResponse.json({ place: placeDetails });
  } catch (error) {
    console.error("Error looking up place:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to lookup place" },
      { status: 400 }
    );
  }
}
