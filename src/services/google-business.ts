/**
 * Google Business Profile API Service
 * 
 * Handles:
 * - Token refresh
 * - Fetching accounts and locations
 * - Fetching and syncing reviews
 */

import { prisma } from "@/lib/prisma";

const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GBP_API_BASE = "https://mybusinessbusinessinformation.googleapis.com/v1";
const GBP_ACCOUNT_API = "https://mybusinessaccountmanagement.googleapis.com/v1";

interface GoogleBusinessToken {
  id: string;
  userId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scope: string | null;
}

interface GoogleAccount {
  name: string; // Format: accounts/XXXXX
  accountName: string;
  type: string;
  verificationState?: string;
}

interface GoogleLocation {
  name: string; // Format: locations/XXXXX
  title: string;
  storefrontAddress?: {
    addressLines?: string[];
    locality?: string;
    administrativeArea?: string;
    postalCode?: string;
    regionCode?: string;
  };
  metadata?: {
    placeId?: string;
    mapsUri?: string;
  };
}

interface GoogleReview {
  name: string; // Format: accounts/XXXXX/locations/XXXXX/reviews/XXXXX
  reviewId: string;
  reviewer: {
    profilePhotoUrl?: string;
    displayName: string;
  };
  starRating: "ONE" | "TWO" | "THREE" | "FOUR" | "FIVE";
  comment?: string;
  createTime: string;
  updateTime: string;
  reviewReply?: {
    comment: string;
    updateTime: string;
  };
}

/**
 * Refresh access token if expired
 */
export async function refreshTokenIfNeeded(token: GoogleBusinessToken): Promise<string> {
  // Check if token is expired (with 5 minute buffer)
  const now = new Date();
  const expiryWithBuffer = new Date(token.expiresAt.getTime() - 5 * 60 * 1000);
  
  if (now < expiryWithBuffer) {
    return token.accessToken;
  }
  
  console.log(`Refreshing token for user ${token.userId}`);
  
  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: token.refreshToken,
      grant_type: "refresh_token",
    }),
  });
  
  const data = await response.json();
  
  if (!response.ok || data.error) {
    console.error("Token refresh error:", data);
    throw new Error(`Failed to refresh token: ${data.error || "Unknown error"}`);
  }
  
  const { access_token, expires_in } = data;
  const expiresAt = new Date(Date.now() + expires_in * 1000);
  
  // Update token in database
  await prisma.googleBusinessToken.update({
    where: { id: token.id },
    data: {
      accessToken: access_token,
      expiresAt: expiresAt,
    },
  });
  
  return access_token;
}

/**
 * Get user's Google Business token
 */
export async function getUserToken(userId: string): Promise<GoogleBusinessToken | null> {
  return await prisma.googleBusinessToken.findUnique({
    where: { userId },
  });
}

/**
 * Fetch all Google Business accounts for the user
 */
export async function fetchAccounts(accessToken: string): Promise<GoogleAccount[]> {
  const response = await fetch(`${GBP_ACCOUNT_API}/accounts`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    console.error("Failed to fetch accounts:", error);
    throw new Error(`Failed to fetch accounts: ${response.status}`);
  }
  
  const data = await response.json();
  return data.accounts || [];
}

/**
 * Fetch all locations for a Google Business account
 */
export async function fetchLocations(
  accessToken: string,
  accountName: string
): Promise<GoogleLocation[]> {
  const response = await fetch(
    `${GBP_API_BASE}/${accountName}/locations?readMask=name,title,storefrontAddress,metadata`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    console.error("Failed to fetch locations:", error);
    throw new Error(`Failed to fetch locations: ${response.status}`);
  }
  
  const data = await response.json();
  return data.locations || [];
}

/**
 * Fetch reviews for a location
 */
export async function fetchReviews(
  accessToken: string,
  accountName: string,
  locationName: string,
  pageToken?: string
): Promise<{ reviews: GoogleReview[]; nextPageToken?: string }> {
  // Extract location ID from the full name
  const locationId = locationName.split("/").pop();
  
  let url = `https://mybusiness.googleapis.com/v4/${accountName}/locations/${locationId}/reviews`;
  if (pageToken) {
    url += `?pageToken=${pageToken}`;
  }
  
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    console.error("Failed to fetch reviews:", error);
    throw new Error(`Failed to fetch reviews: ${response.status}`);
  }
  
  const data = await response.json();
  return {
    reviews: data.reviews || [],
    nextPageToken: data.nextPageToken,
  };
}

/**
 * Post a reply to a review
 */
export async function postReviewReply(
  accessToken: string,
  reviewName: string,
  replyText: string
): Promise<void> {
  const response = await fetch(
    `https://mybusiness.googleapis.com/v4/${reviewName}/reply`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        comment: replyText,
      }),
    }
  );
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    console.error("Failed to post reply:", error);
    throw new Error(`Failed to post reply: ${response.status}`);
  }
}

/**
 * Convert Google star rating to numeric value
 */
export function starRatingToNumber(rating: string): number {
  const ratings: Record<string, number> = {
    ONE: 1,
    TWO: 2,
    THREE: 3,
    FOUR: 4,
    FIVE: 5,
  };
  return ratings[rating] || 0;
}

/**
 * Sync reviews for a specific location
 */
export async function syncLocationReviews(
  userId: string,
  locationId: string,
  accountName: string,
  googleLocationId: string
): Promise<{ synced: number; new: number; updated: number }> {
  const token = await getUserToken(userId);
  if (!token) {
    throw new Error("User has no Google Business token");
  }
  
  const accessToken = await refreshTokenIfNeeded(token);
  
  // Get the location to find the businessId
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
  
  if (!location) {
    throw new Error("Location not found");
  }
  
  const businessId = location.brand.business.id;
  
  let synced = 0;
  let newReviews = 0;
  let updated = 0;
  let pageToken: string | undefined;
  
  do {
    const { reviews, nextPageToken } = await fetchReviews(
      accessToken,
      accountName,
      googleLocationId,
      pageToken
    );
    
    for (const review of reviews) {
      const existingReview = await prisma.review.findFirst({
        where: {
          locationId: locationId,
          externalId: review.reviewId,
        },
      });
      
      const reviewData = {
        locationId: locationId,
        businessId: businessId,
        externalId: review.reviewId,
        authorName: review.reviewer.displayName,
        rating: starRatingToNumber(review.starRating),
        text: review.comment || "",
        reviewedAt: new Date(review.createTime),
      };
      
      if (existingReview) {
        // Update if there are changes
        if (existingReview.text !== reviewData.text) {
          await prisma.review.update({
            where: { id: existingReview.id },
            data: {
              text: reviewData.text,
              rating: reviewData.rating,
            },
          });
          updated++;
        }
      } else {
        // Create new review
        await prisma.review.create({
          data: reviewData,
        });
        newReviews++;
      }
      
      synced++;
    }
    
    pageToken = nextPageToken;
  } while (pageToken);
  
  // Update last fetched timestamp and store googleLocationId
  await prisma.location.update({
    where: { id: locationId },
    data: { 
      lastFetchedAt: new Date(),
      googleLocationId: googleLocationId,
    },
  });
  
  return { synced, new: newReviews, updated };
}

/**
 * Get all accounts and locations for a user
 */
export async function getUserBusinessLocations(userId: string): Promise<{
  accounts: Array<{
    account: GoogleAccount;
    locations: GoogleLocation[];
  }>;
}> {
  const token = await getUserToken(userId);
  if (!token) {
    throw new Error("User has no Google Business token");
  }
  
  const accessToken = await refreshTokenIfNeeded(token);
  const accounts = await fetchAccounts(accessToken);
  
  const result = [];
  
  for (const account of accounts) {
    try {
      const locations = await fetchLocations(accessToken, account.name);
      result.push({ account, locations });
    } catch (error) {
      console.error(`Failed to fetch locations for ${account.name}:`, error);
      result.push({ account, locations: [] });
    }
  }
  
  return { accounts: result };
}
