import axios from "axios";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppNotification } from "./whatsapp";
import { sendTelegramNotification } from "./telegram";
import { generateAiReply } from "./ai-service";

const GOOGLE_BUSINESS_API_KEY = process.env.GOOGLE_BUSINESS_API_KEY;

interface GoogleReview {
  name: string;
  reviewer: {
    displayName: string;
    profilePhotoUrl?: string;
  };
  starRating: number;
  reviewText: string;
  createTime: string;
  updateTime: string;
  publishTime: string;
}

/**
 * Fetch reviews from Google Business API for all locations
 * Processes locations in parallel with locking to prevent overlaps
 */
export async function fetchAndProcessReviews(): Promise<void> {
  try {
    // Get all brands with their locations
    const brands = await prisma.brand.findMany({
      include: {
        locations: true,
      },
    });

    // Process each location in parallel
    const promises = [];
    for (const brand of brands) {
      for (const location of brand.locations) {
        promises.push(processLocationReviews(location.id, brand.id));
      }
    }

    await Promise.allSettled(promises);
  } catch (error) {
    console.error("Error in fetchAndProcessReviews:", error);
  }
}

/**
 * Process reviews for a single location with locking
 */
async function processLocationReviews(
  locationId: string,
  _brandId: string
): Promise<void> {
  try {
    // Get location with lock check
    const location = await prisma.location.findUnique({
      where: { id: locationId },
      include: {
        brand: {
          include: {
            business: true,
          },
        },
      },
    });

    if (!location) return;

    // Check if locked (another job is running)
    if (location.fetchLockUntil && location.fetchLockUntil > new Date()) {
      console.log(`Location ${locationId} is locked, skipping`);
      return;
    }

    // Acquire lock (5 minute TTL)
    const lockUntil = new Date(Date.now() + 5 * 60 * 1000);
    await prisma.location.update({
      where: { id: locationId },
      data: { fetchLockUntil: lockUntil },
    });

    // Fetch reviews from Google API
    const reviews = await fetchReviewsFromGoogle(location.googlePlaceId!);

    // Process each review
    for (const googleReview of reviews) {
      await processReview(googleReview, location, location.brand.business.id);
    }

    // Update last fetched time and release lock
    await prisma.location.update({
      where: { id: locationId },
      data: {
        lastFetchedAt: new Date(),
        fetchLockUntil: new Date(), // Release lock
      },
    });
  } catch (error) {
    console.error(`Error processing location ${locationId}:`, error);
    // Release lock on error
    await prisma.location.update({
      where: { id: locationId },
      data: { fetchLockUntil: new Date() },
    });
  }
}

/**
 * Fetch reviews from Google Business API
 */
async function fetchReviewsFromGoogle(placeId: string): Promise<GoogleReview[]> {
  try {
    // This is a simplified example - actual implementation depends on Google API version
    const response = await axios.get(
      `https://mybusiness.googleapis.com/v4/accounts/*/locations/*/reviews`,
      {
        headers: {
          Authorization: `Bearer ${GOOGLE_BUSINESS_API_KEY}`,
        },
        params: {
          pageSize: 100,
        },
      }
    );

    return response.data.reviews || [];
  } catch (error) {
    console.error(`Error fetching reviews from Google for ${placeId}:`, error);
    return [];
  }
}

/**
 * Process a single review: ingest, notify, and trigger AI generation
 */
async function processReview(
  googleReview: GoogleReview,
  location: any,
  businessId: string
): Promise<void> {
  try {
    // Check if review already exists
    const existingReview = await prisma.review.findUnique({
      where: { externalId: googleReview.name },
    });

    if (existingReview) {
      console.log(`Review ${googleReview.name} already processed`);
      return;
    }

    // Create review + audit log in a single transaction
    const [review] = await prisma.$transaction([
      prisma.review.create({
        data: {
          externalId: googleReview.name,
          rating: googleReview.starRating,
          text: googleReview.reviewText,
          authorName: googleReview.reviewer.displayName,
          businessId,
          locationId: location.id,
          reviewedAt: new Date(googleReview.publishTime),
        },
      }),
      prisma.auditLog.create({
        data: {
          event: "REVIEW_CREATED",
          entityId: "pending", // Will be updated below if needed
          details: JSON.stringify({
            rating: googleReview.starRating,
            location: location.name,
          }),
        },
      }),
    ]);

    // Get owner with notification preferences (business already includes user from caller)
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      include: { user: true },
    });

    const user = business?.user;
    if (!user) return;

    const preference = (user as any).notificationPreference || "both";
    const approvalLink = `${process.env.NEXTAUTH_URL}/dashboard/reviews?reviewId=${review.id}`;

    // PARALLEL EXECUTION: Send notifications based on user preference
    const notificationPromises: Promise<void>[] = [];

    // Send WhatsApp notification if enabled and connected
    if ((preference === "whatsapp" || preference === "both") && 
        (user as any).whatsappPhone && 
        (user as any).whatsappVerified) {
      notificationPromises.push(
        sendWhatsAppNotification(
          {
            recipientPhone: (user as any).whatsappPhone,
            reviewerName: googleReview.reviewer.displayName,
            rating: googleReview.starRating,
            reviewText: googleReview.reviewText,
            locationName: location.name,
            aiReplyText: null, // AI reply not ready yet
            approvalLink,
          },
          review.id
        ).catch((error) => {
          console.error(`WhatsApp notification failed for review ${review.id}:`, error);
        })
      );
    }

    // Send Telegram notification if enabled and connected
    if ((preference === "telegram" || preference === "both") && 
        (user as any).telegramChatId && 
        (user as any).telegramEnabled !== false) {
      notificationPromises.push(
        sendTelegramNotification(
          {
            chatId: (user as any).telegramChatId,
            reviewerName: googleReview.reviewer.displayName,
            rating: googleReview.starRating,
            reviewText: googleReview.reviewText,
            locationName: location.name,
            businessName: location.brand.name,
            aiReplyText: null, // AI reply not ready yet
            approvalLink,
          },
          review.id
        ).catch((error) => {
          console.error(`Telegram notification failed for review ${review.id}:`, error);
        })
      );
    }

    // Fire notifications (non-blocking)
    Promise.allSettled(notificationPromises);

    // Generate AI reply asynchronously (non-blocking)
    generateAiReply(
      review.id,
      googleReview.reviewText,
      googleReview.starRating,
      location.brand.name
    ).catch((error) => {
      console.error(`AI generation failed for review ${review.id}:`, error);
    });
  } catch (error) {
    console.error("Error processing review:", error);
  }
}
