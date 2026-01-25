import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

/**
 * POST /api/webhooks/telegram
 * Webhook endpoint for Telegram bot updates
 * This receives messages when users send codes to the bot
 */
export async function POST(request: NextRequest) {
  try {
    const update = await request.json();
    
    // Handle incoming message
    if (update.message) {
      const chatId = String(update.message.chat.id);
      const text = update.message.text?.trim().toUpperCase();
      const userName = update.message.from?.first_name || "User";

      if (!text) {
        await sendTelegramReply(chatId, "Please send your connection code.");
        return NextResponse.json({ ok: true });
      }

      // Check if this is a connection code (6 alphanumeric chars)
      if (/^[A-F0-9]{6}$/.test(text)) {
        // Look for user with this connect code
        const user = await prisma.user.findFirst({
          where: {
            telegramConnectCode: text,
            telegramConnectExpiry: {
              gt: new Date(),
            },
          },
        });

        if (user) {
          // Connect Telegram to user account
          await prisma.user.update({
            where: { id: user.id },
            data: {
              telegramChatId: chatId,
              telegramConnectCode: null,
              telegramConnectExpiry: null,
            },
          });

          await sendTelegramReply(
            chatId,
            `✅ *Success!*\n\nHello ${userName}! Your Telegram is now connected to Reviews Manager.\n\nYou'll receive instant notifications here when new reviews arrive for your businesses.`
          );
        } else {
          await sendTelegramReply(
            chatId,
            `❌ *Invalid or Expired Code*\n\nThe code "${text}" is not valid or has expired.\n\nPlease go to your dashboard and generate a new code.`
          );
        }
      } else if (text === "/START" || text === "START") {
        await sendTelegramReply(
          chatId,
          `👋 *Welcome to Reviews Manager Bot!*\n\nTo connect your account:\n\n1. Go to your Reviews Manager dashboard\n2. Click Settings → Notifications\n3. Click "Connect Telegram"\n4. Send the 6-character code here\n\nNeed help? Visit our website.`
        );
      } else if (text === "/HELP" || text === "HELP") {
        await sendTelegramReply(
          chatId,
          `🤖 *Reviews Manager Bot Help*\n\n*Commands:*\n/start - Get started\n/status - Check connection status\n/help - Show this help\n\n*To connect:*\nSend your 6-character code from the dashboard.\n\n*To disconnect:*\nGo to Settings in your dashboard.`
        );
      } else if (text === "/STATUS" || text === "STATUS") {
        const connectedUser = await prisma.user.findFirst({
          where: { telegramChatId: chatId },
          select: { email: true, name: true },
        });

        if (connectedUser) {
          await sendTelegramReply(
            chatId,
            `✅ *Connected*\n\nYou're connected as: ${connectedUser.name || connectedUser.email}\n\nYou'll receive notifications for new reviews.`
          );
        } else {
          await sendTelegramReply(
            chatId,
            `❌ *Not Connected*\n\nYour Telegram is not connected to any account.\n\nGo to your dashboard to get a connection code.`
          );
        }
      } else {
        await sendTelegramReply(
          chatId,
          `🤔 I didn't understand that.\n\nIf you're trying to connect, please send your 6-character code.\n\nType /help for more options.`
        );
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Telegram webhook error:", error);
    return NextResponse.json({ ok: true }); // Always return 200 to Telegram
  }
}

/**
 * GET /api/webhooks/telegram
 * Verify webhook (optional, for manual testing)
 */
export async function GET() {
  return NextResponse.json({ 
    status: "Telegram webhook is active",
    configured: !!TELEGRAM_BOT_TOKEN,
  });
}

/**
 * Send a reply message via Telegram API
 */
async function sendTelegramReply(chatId: string, text: string): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN) {
    console.warn("TELEGRAM_BOT_TOKEN not configured");
    return;
  }

  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: "Markdown",
      }),
    });
  } catch (error) {
    console.error("Failed to send Telegram reply:", error);
  }
}
