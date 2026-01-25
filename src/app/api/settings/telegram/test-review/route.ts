import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/jwt";
import { prisma } from "@/lib/prisma";
import { sendReviewNotificationWithButtons } from "@/services/telegram-actions";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

/**
 * Send a test review notification with action buttons
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session");
    
    if (!sessionCookie?.value) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = verifyToken(sessionCookie.value);
    if (!session?.userId) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    // Get user's Telegram chat ID
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { telegramChatId: true, name: true },
    });

    if (!user?.telegramChatId) {
      return NextResponse.json({ 
        error: "Telegram not connected" 
      }, { status: 400 });
    }

    // Create a mock review and AI reply for testing
    // First check if we have a test business
    let business = await prisma.business.findFirst({
      where: { userId: session.userId },
    });

    // If no business exists, create a test one
    if (!business) {
      business = await prisma.business.create({
        data: {
          name: "Test Business",
          userId: session.userId,
        },
      });
    }

    // Create a brand for the location
    let brand = await prisma.brand.findFirst({
      where: { businessId: business.id },
    });

    if (!brand) {
      brand = await prisma.brand.create({
        data: {
          name: "Main Brand",
          businessId: business.id,
        },
      });
    }

    // Create a location
    let location = await prisma.location.findFirst({
      where: { brandId: brand.id },
    });

    if (!location) {
      location = await prisma.location.create({
        data: {
          name: "Downtown Location",
          brandId: brand.id,
        },
      });
    }

    // Create a test review
    const testReviewId = `test-${Date.now()}`;
    const review = await prisma.review.create({
      data: {
        externalId: testReviewId,
        rating: 4,
        text: "Great service! The staff was very helpful and friendly. The food was delicious too. Will definitely come back!",
        authorName: "John Smith",
        businessId: business.id,
        locationId: location.id,
        reviewedAt: new Date(),
      },
    });

    // Create AI reply
    const aiReply = await prisma.aiReply.create({
      data: {
        reviewId: review.id,
        suggestedText: "Thank you so much, John! We're thrilled to hear you had a great experience with our team. Your kind words mean a lot to us. We look forward to serving you again soon! 🙏",
        status: "PENDING_APPROVAL",
      },
    });

    // Send notification with buttons
    const success = await sendReviewNotificationWithButtons(
      user.telegramChatId,
      review.id,
      aiReply.id,
      review.authorName,
      review.rating,
      review.text,
      business.name,
      location.name,
      aiReply.suggestedText
    );

    if (!success) {
      return NextResponse.json({ 
        error: "Failed to send notification" 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: "Test review notification sent with action buttons!",
      reviewId: review.id,
      aiReplyId: aiReply.id,
    });

  } catch (error) {
    console.error("Error sending test review:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
