import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

// Get business AI configuration
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    const { businessId } = await params;
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session");

    if (!sessionCookie?.value) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify business belongs to user
    const business = await prisma.business.findFirst({
      where: {
        id: businessId,
        user: {
          sessions: {
            some: { sessionToken: sessionCookie.value },
          },
        },
      },
      include: {
        aiConfig: true,
        replyExamples: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    return NextResponse.json({
      config: business.aiConfig || {
        toneStyle: "professional",
        includeContactInfo: false,
        includePromotion: false,
        learnFromReplies: true,
      },
      replyExamples: business.replyExamples,
    });
  } catch (error) {
    console.error("Error fetching AI config:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Create or update business AI configuration
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    const { businessId } = await params;
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session");

    if (!sessionCookie?.value) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify business belongs to user
    const business = await prisma.business.findFirst({
      where: {
        id: businessId,
        user: {
          sessions: {
            some: { sessionToken: sessionCookie.value },
          },
        },
      },
    });

    if (!business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    const body = await request.json();
    const {
      businessType,
      description,
      operatingHours,
      toneStyle,
      customInstructions,
      signatureClosing,
      includeContactInfo,
      contactPhone,
      contactEmail,
      includePromotion,
      promotionText,
      learnFromReplies,
    } = body;

    // Validate operating hours format if provided
    if (operatingHours) {
      try {
        const hours = typeof operatingHours === "string" 
          ? JSON.parse(operatingHours) 
          : operatingHours;
        
        // Validate structure
        const validDays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
        for (const day of Object.keys(hours)) {
          if (!validDays.includes(day.toLowerCase())) {
            return NextResponse.json(
              { error: `Invalid day: ${day}` },
              { status: 400 }
            );
          }
        }
      } catch {
        return NextResponse.json(
          { error: "Invalid operating hours format" },
          { status: 400 }
        );
      }
    }

    // Upsert configuration
    const config = await prisma.businessAiConfig.upsert({
      where: { businessId },
      create: {
        businessId,
        businessType,
        description,
        operatingHours: typeof operatingHours === "object" 
          ? JSON.stringify(operatingHours) 
          : operatingHours,
        toneStyle: toneStyle || "professional",
        customInstructions,
        signatureClosing,
        includeContactInfo: includeContactInfo ?? false,
        contactPhone,
        contactEmail,
        includePromotion: includePromotion ?? false,
        promotionText,
        learnFromReplies: learnFromReplies ?? true,
      },
      update: {
        businessType,
        description,
        operatingHours: typeof operatingHours === "object" 
          ? JSON.stringify(operatingHours) 
          : operatingHours,
        toneStyle,
        customInstructions,
        signatureClosing,
        includeContactInfo,
        contactPhone,
        contactEmail,
        includePromotion,
        promotionText,
        learnFromReplies,
      },
    });

    return NextResponse.json({ success: true, config });
  } catch (error) {
    console.error("Error saving AI config:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Delete a reply example
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    const { businessId } = await params;
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session");

    if (!sessionCookie?.value) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const exampleId = searchParams.get("exampleId");

    if (!exampleId) {
      return NextResponse.json({ error: "Example ID required" }, { status: 400 });
    }

    // Verify business belongs to user
    const business = await prisma.business.findFirst({
      where: {
        id: businessId,
        user: {
          sessions: {
            some: { sessionToken: sessionCookie.value },
          },
        },
      },
    });

    if (!business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    // Delete the example
    await prisma.replyExample.delete({
      where: {
        id: exampleId,
        businessId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting reply example:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
