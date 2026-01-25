import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

/**
 * GET /api/businesses
 * List all businesses for the current user
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limit: 100 requests per minute
    const clientIp = getClientIp(request);
    const rateLimit = checkRateLimit(`businesses:${clientIp}`, { maxRequests: 100 });
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const businesses = await prisma.business.findMany({
      where: { userId: session.userId },
      include: {
        brands: {
          include: {
            locations: true,
          },
        },
      },
    });

    return NextResponse.json(businesses);
  } catch (error) {
    console.error("Error fetching businesses:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/businesses
 * Create a new business
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limit: 20 creates per minute
    const clientIp = getClientIp(request);
    const rateLimit = checkRateLimit(`businesses:create:${clientIp}`, { maxRequests: 20 });
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, description, industry, whatsappNumber } = await request.json();

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Business name is required" },
        { status: 400 }
      );
    }

    const business = await prisma.business.create({
      data: {
        name,
        userId: session.userId,
      },
    });

    return NextResponse.json(business, { status: 201 });
  } catch (error) {
    console.error("Error creating business:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
