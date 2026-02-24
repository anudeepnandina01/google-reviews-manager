import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/jwt";
import { prisma } from "@/lib/prisma";
import { devTelegramState } from "@/lib/dev-telegram-state";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const isDev = process.env.NODE_ENV === "development";

// Poll Telegram for messages and find matching code
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

    // Get user's pending code
    let userCode: string | null = null;
    let userExpiry: Date | null = null;

    try {
      const user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: {
          telegramConnectCode: true,
          telegramConnectExpiry: true,
        },
      });

      if (!user?.telegramConnectCode) {
        return NextResponse.json({ error: "No pending code" }, { status: 400 });
      }

      userCode = user.telegramConnectCode;
      userExpiry = user.telegramConnectExpiry;
    } catch (dbError) {
      // Dev mode fallback
      if (isDev) {
        console.log("Database unreachable in dev mode, using mock Telegram verify");
        if (!devTelegramState.connectCode) {
          return NextResponse.json({ error: "No pending code" }, { status: 400 });
        }
        userCode = devTelegramState.connectCode;
        userExpiry = devTelegramState.connectExpiry;
      } else {
        throw dbError;
      }
    }

    if (userExpiry && userExpiry < new Date()) {
      return NextResponse.json({ error: "Code expired" }, { status: 400 });
    }

    // Poll Telegram for recent messages
    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates?limit=50`
    );
    
    if (!response.ok) {
      return NextResponse.json({ error: "Failed to reach Telegram" }, { status: 500 });
    }

    const data = await response.json();
    
    if (!data.ok || !data.result) {
      return NextResponse.json({ error: "Telegram API error" }, { status: 500 });
    }

    // Find message with matching code
    const matchingMessage = data.result.find((update: any) => {
      const text = update.message?.text?.trim();
      return text === userCode;
    });

    if (!matchingMessage) {
      return NextResponse.json({ 
        connected: false, 
        message: "Code not found. Make sure you sent the exact code to the bot." 
      });
    }

    const chatId = matchingMessage.message.chat.id.toString();

    // Link Telegram to user
    try {
      await prisma.user.update({
        where: { id: session.userId },
        data: {
          telegramChatId: chatId,
          telegramConnectCode: null,
          telegramConnectExpiry: null,
        },
      });
    } catch (dbError) {
      // Dev mode fallback
      if (isDev) {
        console.log("Database unreachable in dev mode, storing mock Telegram chatId");
        devTelegramState.connected = true;
        devTelegramState.chatId = chatId;
        devTelegramState.connectCode = null;
        devTelegramState.connectExpiry = null;
      } else {
        throw dbError;
      }
    }

    // Send confirmation message to user
    await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: "✅ Connected successfully!\n\nYou'll now receive notifications when new reviews arrive.",
        }),
      }
    );

    return NextResponse.json({ 
      connected: true, 
      message: "Telegram connected successfully!" 
    });

  } catch (error) {
    console.error("Error verifying Telegram:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
