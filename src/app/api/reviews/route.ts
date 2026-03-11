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
    const rateLimit = await checkRateLimit(`reviews:${clientIp}`, { maxRequests: 100 });
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
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(Math.max(1, parseInt(searchParams.get("limit") || "20")), 100); // Cap at 100
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

    // Build query filter — always scoped to user's businesses
    const where: Record<string, unknown> = {};

    if (businessId) {
      where.businessId = businessId;
    } else {
      // SECURITY: Without explicit businessId, scope to user's own businesses
      const userBusinesses = await prisma.business.findMany({
        where: { userId: session.userId },
        select: { id: true },
      });
      where.businessId = { in: userBusinesses.map((b: { id: string }) => b.id) };
    }

    if (locationId) where.locationId = locationId;

    // Apply status filter at DB level (not in JS after pagination)
    const STATUS_MAP: Record<string, string> = {
      pending: "PENDING_APPROVAL",
      approved: "APPROVED",
      sent: "SENT",
      skipped: "SKIPPED",
    };
    if (status && STATUS_MAP[status]) {
      where.aiReply = { status: STATUS_MAP[status] };
    }

    // Get reviews + total count in parallel
    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        include: {
          aiReply: true,
          location: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.review.count({ where }),
    ]);

    return NextResponse.json({
      reviews,
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
