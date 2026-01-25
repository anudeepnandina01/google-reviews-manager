import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { fetchPlaceReviews } from "@/services/google-places";

// POST /api/locations/[locationId]/sync-reviews - Sync reviews for a location using Places API
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ locationId: string }> }
) {
  try {
    const { locationId } = await params;
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find the location and verify ownership
    const location = await prisma.location.findFirst({
      where: { id: locationId },
      include: {
        brand: {
          include: {
            business: true,
          },
        },
      },
    });

    if (!location) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }

    if (location.brand.business.userId !== session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (!location.googlePlaceId) {
      return NextResponse.json(
        { error: "This location doesn't have a Google Place ID. Add it using a Google Maps URL." },
        { status: 400 }
      );
    }

    // Fetch reviews from Google Places API
    const { reviews, placeDetails } = await fetchPlaceReviews(location.googlePlaceId);

    if (reviews.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No reviews found for this location",
        reviewsSynced: 0,
        totalReviews: placeDetails.totalReviews || 0,
      });
    }

    // Sync reviews to database
    let newReviewsCount = 0;
    let updatedReviewsCount = 0;

    for (const review of reviews) {
      // Create a unique external ID based on author and timestamp
      const externalId = `places_${location.googlePlaceId}_${review.authorName.replace(/\s+/g, '_')}_${review.time}`;

      // Check if review already exists
      const existingReview = await prisma.review.findFirst({
        where: {
          OR: [
            { externalId },
            // Also check by author name and approximate time (within same day)
            {
              locationId,
              authorName: review.authorName,
              reviewedAt: {
                gte: new Date((review.time - 86400) * 1000), // 1 day before
                lte: new Date((review.time + 86400) * 1000), // 1 day after
              },
            },
          ],
        },
      });

      if (existingReview) {
        // Update if rating or text changed
        if (existingReview.rating !== review.rating || existingReview.text !== review.text) {
          await prisma.review.update({
            where: { id: existingReview.id },
            data: {
              rating: review.rating,
              text: review.text,
              updatedAt: new Date(),
            },
          });
          updatedReviewsCount++;
        }
      } else {
        // Create new review
        await prisma.review.create({
          data: {
            locationId,
            businessId: location.brand.business.id,
            externalId,
            authorName: review.authorName,
            authorPhotoUrl: review.profilePhotoUrl,
            rating: review.rating,
            text: review.text,
            reviewedAt: new Date(review.time * 1000),
            source: "GOOGLE_PLACES",
          },
        });
        newReviewsCount++;
      }
    }

    // Update location's last sync time
    await prisma.location.update({
      where: { id: locationId },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      message: `Synced ${newReviewsCount} new reviews, updated ${updatedReviewsCount} existing reviews`,
      reviewsSynced: newReviewsCount,
      reviewsUpdated: updatedReviewsCount,
      totalReviewsOnGoogle: placeDetails.totalReviews || 0,
      note: "Google Places API returns up to 5 most relevant reviews. For all reviews, connect your Google Business Profile.",
    });
  } catch (error) {
    console.error("Error syncing reviews:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to sync reviews" },
      { status: 500 }
    );
  }
}
