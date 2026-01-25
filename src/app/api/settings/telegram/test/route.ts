import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/jwt";
import { prisma } from "@/lib/prisma";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// Send a test notification to the user's Telegram
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
        error: "Telegram not connected. Please connect Telegram first." 
      }, { status: 400 });
    }

    // Send test notification
    const message = `🧪 *Test Notification*

This is a test message from Google Reviews Manager!

✅ Your Telegram integration is working correctly.

When you receive real reviews, you'll get notifications like this:

⭐⭐⭐⭐⭐ (5 stars)
📝 "Great service! Highly recommended."
👤 John D.
📍 Your Business Name

You can then approve AI-generated replies directly from the dashboard.`;

    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: user.telegramChatId,
          text: message,
          parse_mode: "Markdown",
        }),
      }
    );

    const data = await response.json();

    if (!data.ok) {
      console.error("Telegram API error:", data);
      return NextResponse.json({ 
        error: "Failed to send test notification" 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: "Test notification sent! Check your Telegram." 
    });

  } catch (error) {
    console.error("Error sending test notification:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
