import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { devTelegramState, resetDevTelegramState } from "@/lib/dev-telegram-state";
import crypto from "crypto";

const isDev = process.env.NODE_ENV === "development";

/**
 * GET /api/settings/telegram
 * Get current Telegram connection status
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: {
          telegramChatId: true,
          telegramConnectCode: true,
          telegramConnectExpiry: true,
        },
      });

      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      const isConnected = !!user.telegramChatId;
      const hasPendingCode = user.telegramConnectCode && 
        user.telegramConnectExpiry && 
        user.telegramConnectExpiry > new Date();

      return NextResponse.json({
        connected: isConnected,
        chatId: user.telegramChatId ? `****${user.telegramChatId.slice(-4)}` : null,
        pendingCode: hasPendingCode ? user.telegramConnectCode : null,
        codeExpiresAt: hasPendingCode ? user.telegramConnectExpiry : null,
      });
    } catch (dbError) {
      // Dev mode fallback when database is unreachable
      if (isDev) {
        console.log("Database unreachable in dev mode, using mock Telegram status");
        const hasPendingCode = devTelegramState.connectCode && 
          devTelegramState.connectExpiry && 
          devTelegramState.connectExpiry > new Date();

        return NextResponse.json({
          connected: devTelegramState.connected,
          chatId: devTelegramState.chatId ? `****${devTelegramState.chatId.slice(-4)}` : null,
          pendingCode: hasPendingCode ? devTelegramState.connectCode : null,
          codeExpiresAt: hasPendingCode ? devTelegramState.connectExpiry : null,
        });
      }
      throw dbError;
    }
  } catch (error) {
    console.error("Error fetching Telegram status:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/settings/telegram
 * Generate a new connection code
 */
export async function POST() {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Generate a 6-character alphanumeric code
    const connectCode = crypto.randomBytes(3).toString("hex").toUpperCase();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    try {
      await prisma.user.update({
        where: { id: session.userId },
        data: {
          telegramConnectCode: connectCode,
          telegramConnectExpiry: expiresAt,
        },
      });
    } catch (dbError) {
      // Dev mode fallback when database is unreachable
      if (isDev) {
        console.log("Database unreachable in dev mode, using mock Telegram connect");
        devTelegramState.connectCode = connectCode;
        devTelegramState.connectExpiry = expiresAt;
      } else {
        throw dbError;
      }
    }

    const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "myreviews_alert_bot";

    return NextResponse.json({
      success: true,
      code: connectCode,
      expiresAt,
      botUsername,
      instructions: [
        `1. Open Telegram and search for @${botUsername}`,
        "2. Start a chat with the bot",
        `3. Send this code: ${connectCode}`,
        "4. Come back here and click 'Verify Connection'",
      ],
    });
  } catch (error) {
    console.error("Error generating connect code:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/settings/telegram
 * Disconnect Telegram
 */
export async function DELETE() {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
      await prisma.user.update({
        where: { id: session.userId },
        data: {
          telegramChatId: null,
          telegramConnectCode: null,
          telegramConnectExpiry: null,
        },
      });
    } catch (dbError) {
      // Dev mode fallback when database is unreachable
      if (isDev) {
        console.log("Database unreachable in dev mode, disconnecting mock Telegram");
        resetDevTelegramState();
      } else {
        throw dbError;
      }
    }

    return NextResponse.json({ success: true, message: "Telegram disconnected" });
  } catch (error) {
    console.error("Error disconnecting Telegram:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
