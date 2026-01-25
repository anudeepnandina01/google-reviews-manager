import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { 
  handleTelegramCallback, 
  processEditedReply,
  cancelEditing 
} from "@/services/telegram-actions";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

// Store last update ID to avoid processing duplicates
let lastUpdateId = 0;

/**
 * Poll Telegram for updates (button clicks, messages)
 * This endpoint should be called periodically (e.g., every 5 seconds)
 */
export async function POST(request: NextRequest) {
  try {
    if (!TELEGRAM_BOT_TOKEN) {
      return NextResponse.json({ error: "Bot token not configured" }, { status: 500 });
    }

    // Get updates from Telegram
    const response = await fetch(
      `${TELEGRAM_API_URL}/getUpdates?offset=${lastUpdateId + 1}&timeout=5`
    );
    
    const data = await response.json();
    
    if (!data.ok || !data.result) {
      return NextResponse.json({ error: "Failed to fetch updates" }, { status: 500 });
    }

    const results = [];

    for (const update of data.result) {
      lastUpdateId = Math.max(lastUpdateId, update.update_id);

      // Handle callback query (button click)
      if (update.callback_query) {
        const callbackQuery = update.callback_query;
        const chatId = callbackQuery.message?.chat?.id?.toString();
        const messageId = callbackQuery.message?.message_id;
        const callbackData = callbackQuery.data;
        const callbackQueryId = callbackQuery.id;

        if (chatId && callbackData && messageId) {
          const result = await handleTelegramCallback(
            callbackQueryId,
            chatId,
            messageId,
            callbackData
          );
          results.push({ type: "callback", ...result });
        }
      }

      // Handle regular message (for editing flow)
      if (update.message && update.message.text) {
        const chatId = update.message.chat.id.toString();
        const text = update.message.text.trim();

        // Check if user is in editing mode
        const user = await prisma.user.findFirst({
          where: { 
            telegramChatId: chatId,
            telegramEditingReplyId: { not: null },
          },
        });

        if (user) {
          // User is in edit mode
          if (text === "/cancel") {
            await cancelEditing(chatId);
            results.push({ type: "cancel_edit", success: true });
          } else {
            // Process the edited reply
            const result = await processEditedReply(chatId, text);
            results.push({ type: "edit", ...result });
          }
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      processed: data.result.length,
      results 
    });

  } catch (error) {
    console.error("Error polling Telegram:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/**
 * GET endpoint to check polling status
 */
export async function GET() {
  return NextResponse.json({ 
    status: "ready",
    lastUpdateId,
    botConfigured: !!TELEGRAM_BOT_TOKEN,
  });
}
