import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { sendReviewNotificationWithButtons } from "@/services/telegram-actions";

/**
 * POST /api/test/telegram-notification
 * 
 * Test endpoint to send a mock review notification to Telegram
 * This helps verify the Telegram integration is working correctly
 */
export async function POST(request: NextRequest) {
  try {
    // Only allow in development or for authenticated users
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's Telegram chat ID
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { telegramChatId: true, name: true },
    });

    if (!user?.telegramChatId) {
      return NextResponse.json(
        { error: "Telegram not connected. Please connect Telegram in Settings first." },
        { status: 400 }
      );
    }

    // Get optional custom review data from request body
    const body = await request.json().catch(() => ({}));

    // Create mock review data
    const mockReviewId = `test-review-${Date.now()}`;
    const mockAiReplyId = `test-reply-${Date.now()}`;
    
    const reviewerName = body.reviewerName || "John Doe";
    const rating = body.rating || 4;
    const reviewText = body.reviewText || "Great service! The staff was very helpful and friendly. Would definitely recommend to others.";
    const businessName = body.businessName || "Test Business";
    const locationName = body.locationName || "Main Branch - 123 Test Street";
    const aiReplyText = body.aiReplyText || "Thank you so much for your wonderful review, John! We're thrilled to hear that our staff provided you with excellent service. Your recommendation means a lot to us. We look forward to serving you again soon!";

    // Send the notification
    const success = await sendReviewNotificationWithButtons(
      user.telegramChatId,
      mockReviewId,
      mockAiReplyId,
      reviewerName,
      rating,
      reviewText,
      businessName,
      locationName,
      aiReplyText
    );

    if (success) {
      return NextResponse.json({
        success: true,
        message: "Test notification sent successfully! Check your Telegram.",
        data: {
          chatId: user.telegramChatId,
          reviewerName,
          rating,
          reviewText,
          businessName,
          locationName,
        },
      });
    } else {
      return NextResponse.json(
        { error: "Failed to send notification. Check TELEGRAM_BOT_TOKEN in environment variables." },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Test notification error:", error);
    return NextResponse.json(
      { error: `Test failed: ${error instanceof Error ? error.message : "Unknown error"}` },
      { status: 500 }
    );
  }
}

/**
 * GET /api/test/telegram-notification
 * 
 * Returns instructions and current Telegram connection status
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { telegramChatId: true, name: true },
    });

    const hasTelegramBot = !!process.env.TELEGRAM_BOT_TOKEN;

    return NextResponse.json({
      status: {
        telegramConnected: !!user?.telegramChatId,
        telegramChatId: user?.telegramChatId ? `${user.telegramChatId.slice(0, 4)}...` : null,
        telegramBotConfigured: hasTelegramBot,
      },
      instructions: {
        step1: "Ensure Telegram is connected in Settings page",
        step2: "Make a POST request to this endpoint to send a test notification",
        step3: "Check your Telegram for the notification with action buttons",
      },
      example: {
        method: "POST",
        body: {
          reviewerName: "Jane Smith",
          rating: 5,
          reviewText: "Amazing experience!",
          businessName: "My Restaurant",
          locationName: "Downtown Location",
          aiReplyText: "Thank you for your kind words!",
        },
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to get status: ${error instanceof Error ? error.message : "Unknown error"}` },
      { status: 500 }
    );
  }
}
