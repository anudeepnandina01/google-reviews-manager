import { prisma } from "@/lib/prisma";
import { NotificationStatus } from "@prisma/client";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

interface TelegramNotificationPayload {
  chatId: string; // Telegram chat ID of the recipient
  reviewerName: string;
  rating: number;
  reviewText: string;
  locationName: string;
  businessName: string;
  aiReplyText: string | null;
  approvalLink: string;
}

/**
 * Send Telegram notification to business owner (FREE & UNLIMITED)
 * Triggered when a new review is received
 */
export async function sendTelegramNotification(
  payload: TelegramNotificationPayload,
  reviewId: string
): Promise<void> {
  try {
    if (!TELEGRAM_BOT_TOKEN) {
      console.warn("TELEGRAM_BOT_TOKEN not configured, skipping notification");
      return;
    }

    const messageBody = formatTelegramMessage(payload);

    // Create notification record
    const notification = await prisma.notification.create({
      data: {
        reviewId,
        recipientPhone: payload.chatId, // Using phone field for chat ID
        messageBody,
        status: NotificationStatus.PENDING,
      },
    });

    // Send message via Telegram API
    await sendTelegramMessage(notification.id, payload.chatId, messageBody);

    // Log event
    await prisma.auditLog.create({
      data: {
        event: "NOTIFICATION_SENT",
        entityId: reviewId,
        details: JSON.stringify({ 
          notificationId: notification.id,
          channel: "telegram"
        }),
      },
    });
  } catch (error) {
    console.error(`Failed to send Telegram notification for review ${reviewId}:`, error);
    
    await prisma.auditLog.create({
      data: {
        event: "NOTIFICATION_FAILED",
        entityId: reviewId,
        details: JSON.stringify({ error: "Telegram notification failed" }),
      },
    });
  }
}

/**
 * Format notification message with emojis and structure
 */
function formatTelegramMessage(payload: TelegramNotificationPayload): string {
  const stars = "⭐".repeat(payload.rating) + "☆".repeat(5 - payload.rating);
  
  const ratingEmoji = payload.rating >= 4 ? "😊" : payload.rating >= 3 ? "😐" : "😞";
  
  const aiReplySection = payload.aiReplyText
    ? `\n\n💡 *AI Suggested Reply:*\n_${escapeMarkdown(payload.aiReplyText)}_`
    : "\n\n⏳ AI reply is being generated...";

  return `
🔔 *New Google Review!* ${ratingEmoji}

📍 *${escapeMarkdown(payload.businessName)}*
📌 ${escapeMarkdown(payload.locationName)}

${stars} (${payload.rating}/5)

👤 *From:* ${escapeMarkdown(payload.reviewerName)}

💬 *Review:*
${escapeMarkdown(payload.reviewText)}
${aiReplySection}

👉 [Open Dashboard](${payload.approvalLink})
  `.trim();
}

/**
 * Escape special characters for Telegram Markdown
 */
function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, "\\$&");
}

/**
 * Send message via Telegram Bot API
 */
async function sendTelegramMessage(
  notificationId: string,
  chatId: string,
  text: string,
  retryCount: number = 0
): Promise<void> {
  const maxRetries = 3;

  try {
    const response = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: "Markdown",
        disable_web_page_preview: false,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      throw new Error(data.description || "Telegram API error");
    }

    // Update notification status
    await prisma.notification.update({
      where: { id: notificationId },
      data: {
        status: NotificationStatus.SENT,
        sentAt: new Date(),
      },
    });

    console.log(`Telegram notification sent: ${notificationId}`);
  } catch (error) {
    console.error(`Telegram send error for ${notificationId}:`, error);

    if (retryCount < maxRetries) {
      // Retry with exponential backoff
      const delay = Math.pow(2, retryCount) * 1000;
      setTimeout(() => {
        sendTelegramMessage(notificationId, chatId, text, retryCount + 1);
      }, delay);

      await prisma.notification.update({
        where: { id: notificationId },
        data: {
          retryCount: retryCount + 1,
          lastRetryAt: new Date(),
        },
      });
    } else {
      // Max retries reached
      await prisma.notification.update({
        where: { id: notificationId },
        data: {
          status: NotificationStatus.FAILED,
          failureReason: String(error),
        },
      });
    }
  }
}

/**
 * Send a test notification to verify bot is working
 */
export async function sendTestNotification(chatId: string): Promise<boolean> {
  try {
    if (!TELEGRAM_BOT_TOKEN) {
      throw new Error("TELEGRAM_BOT_TOKEN not configured");
    }

    const response = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: "✅ *Test Notification*\n\nYour Reviews Manager bot is connected successfully!",
        parse_mode: "Markdown",
      }),
    });

    const data = await response.json();
    return data.ok === true;
  } catch (error) {
    console.error("Test notification failed:", error);
    return false;
  }
}

/**
 * Get bot info to verify token is valid
 */
export async function verifyBotToken(): Promise<{ valid: boolean; botName?: string }> {
  try {
    if (!TELEGRAM_BOT_TOKEN) {
      return { valid: false };
    }

    const response = await fetch(`${TELEGRAM_API_URL}/getMe`);
    const data = await response.json();

    if (data.ok) {
      return { valid: true, botName: data.result.username };
    }
    return { valid: false };
  } catch {
    return { valid: false };
  }
}
