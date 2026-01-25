import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

/**
 * GET /api/reviews?businessId=X&locationId=Y&status=Z
 * List reviews with filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limit: 100 requests per minute
    const clientIp = getClientIp(request);
    const rateLimit = checkRateLimit(`reviews:${clientIp}`, { maxRequests: 100 });
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get("businessId");
    const locationId = searchParams.get("locationId");
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    // Verify business ownership
    if (businessId) {
      const business = await prisma.business.findUnique({
        where: { id: businessId },
      });

      if (!business || business.userId !== session.userId) {
        return NextResponse.json(
          { error: "Access denied" },
          { status: 403 }
        );
      }
    }

    // Build query filter
    const where: any = {};
    if (businessId) where.businessId = businessId;
    if (locationId) where.locationId = locationId;

    // Get reviews
    const reviews = await prisma.review.findMany({
      where,
      include: {
        aiReply: true,
        location: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    });

    // Apply status filter if specified
    const filtered = reviews.filter((review) => {
      if (!status) return true;

      if (status === "pending") {
        return review.aiReply?.status === "PENDING_APPROVAL";
      } else if (status === "approved") {
        return review.aiReply?.status === "APPROVED";
      } else if (status === "sent") {
        return review.aiReply?.status === "SENT";
      } else if (status === "skipped") {
        return review.aiReply?.status === "SKIPPED";
      }
      return true;
    });

    const total = await prisma.review.count({ where });

    return NextResponse.json({
      reviews: filtered,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
