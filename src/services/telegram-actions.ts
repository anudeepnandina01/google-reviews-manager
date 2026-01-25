import { prisma } from "@/lib/prisma";
import { saveReplyExample } from "./gemini-ai";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

/**
 * Send review notification with action buttons
 */
export async function sendReviewNotificationWithButtons(
  chatId: string,
  reviewId: string,
  aiReplyId: string,
  reviewerName: string,
  rating: number,
  reviewText: string,
  businessName: string,
  locationName: string,
  aiReplyText: string
): Promise<boolean> {
  try {
    const stars = "⭐".repeat(rating) + "☆".repeat(5 - rating);
    const ratingEmoji = rating >= 4 ? "😊" : rating >= 3 ? "😐" : "😞";

    const message = `
🔔 *New Google Review\\!* ${ratingEmoji}

📍 *${escapeMarkdownV2(businessName)}*
📌 ${escapeMarkdownV2(locationName)}

${stars} \\(${rating}/5\\)

👤 *From:* ${escapeMarkdownV2(reviewerName)}

💬 *Review:*
${escapeMarkdownV2(reviewText)}

💡 *AI Suggested Reply:*
_${escapeMarkdownV2(aiReplyText)}_

Choose an action below:
    `.trim();

    // Inline keyboard with action buttons
    const inlineKeyboard = {
      inline_keyboard: [
        [
          { text: "✅ Approve Reply", callback_data: `approve:${aiReplyId}` },
          { text: "✏️ Edit Reply", callback_data: `edit:${aiReplyId}` },
        ],
        [
          { text: "⏭️ Skip", callback_data: `skip:${aiReplyId}` },
          { text: "🔄 Regenerate", callback_data: `regen:${reviewId}` },
        ],
      ],
    };

    const response = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "MarkdownV2",
        reply_markup: inlineKeyboard,
      }),
    });

    const data = await response.json();
    return data.ok === true;
  } catch (error) {
    console.error("Error sending review notification:", error);
    return false;
  }
}

/**
 * Handle callback query from inline button click
 */
export async function handleTelegramCallback(
  callbackQueryId: string,
  chatId: string,
  messageId: number,
  data: string
): Promise<{ success: boolean; message: string }> {
  try {
    const [action, id] = data.split(":");

    // Remove buttons first to prevent double-clicks
    await removeInlineKeyboard(chatId, messageId);

    switch (action) {
      case "approve":
        return await handleApprove(callbackQueryId, chatId, id);
      case "edit":
        return await handleEdit(callbackQueryId, chatId, id);
      case "skip":
        return await handleSkip(callbackQueryId, chatId, id);
      case "regen":
        return await handleRegenerate(callbackQueryId, chatId, id);
      default:
        return { success: false, message: "Unknown action" };
    }
  } catch (error) {
    console.error("Error handling callback:", error);
    return { success: false, message: "Error processing action" };
  }
}

/**
 * Approve the AI reply
 */
async function handleApprove(
  callbackQueryId: string,
  chatId: string,
  aiReplyId: string
): Promise<{ success: boolean; message: string }> {
  // Update reply status
  const aiReply = await prisma.aiReply.update({
    where: { id: aiReplyId },
    data: {
      status: "APPROVED",
      approvedAt: new Date(),
      sentText: undefined, // Will use suggestedText
    },
    include: {
      review: {
        include: {
          location: true,
          business: true,
        },
      },
    },
  });

  // Save reply example for AI learning (not edited)
  await saveReplyExample(
    aiReply.review.businessId,
    aiReply.review.rating,
    aiReply.review.text,
    aiReply.suggestedText,
    false // wasEdited = false
  );

  // Answer callback query
  await answerCallbackQuery(callbackQueryId, "✅ Reply approved!");

  // Send confirmation
  await sendTelegramMessage(
    chatId,
    `✅ *Reply Approved\\!*\n\nThe reply to ${escapeMarkdownV2(aiReply.review.authorName)}'s review has been approved and will be posted\\.\n\n_"${escapeMarkdownV2(aiReply.suggestedText)}"_`
  );

  // Log audit
  await prisma.auditLog.create({
    data: {
      event: "REPLY_APPROVED_VIA_TELEGRAM",
      entityId: aiReplyId,
      details: JSON.stringify({ chatId }),
    },
  });

  return { success: true, message: "Reply approved" };
}

/**
 * Start edit flow - user will send new text
 */
async function handleEdit(
  callbackQueryId: string,
  chatId: string,
  aiReplyId: string
): Promise<{ success: boolean; message: string }> {
  // Find user by chat ID and set editing state
  await prisma.user.updateMany({
    where: { telegramChatId: chatId },
    data: { telegramEditingReplyId: aiReplyId },
  });

  // Get the current reply
  const aiReply = await prisma.aiReply.findUnique({
    where: { id: aiReplyId },
    include: { review: true },
  });

  if (!aiReply) {
    return { success: false, message: "Reply not found" };
  }

  // Answer callback query
  await answerCallbackQuery(callbackQueryId, "✏️ Send your edited reply");

  // Send instructions
  await sendTelegramMessage(
    chatId,
    `✏️ *Edit Mode*\n\nCurrent reply:\n_"${escapeMarkdownV2(aiReply.suggestedText)}"_\n\n📝 *Send your edited reply now\\.*\n\nOr send /cancel to cancel editing\\.`
  );

  return { success: true, message: "Edit mode started" };
}

/**
 * Process the edited reply text
 */
export async function processEditedReply(
  chatId: string,
  newText: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Find user with pending edit
    const user = await prisma.user.findFirst({
      where: { 
        telegramChatId: chatId,
        telegramEditingReplyId: { not: null },
      },
    });

    if (!user || !user.telegramEditingReplyId) {
      return { success: false, message: "No pending edit" };
    }

    // Update the reply
    const aiReply = await prisma.aiReply.update({
      where: { id: user.telegramEditingReplyId },
      data: {
        suggestedText: newText,
        status: "APPROVED",
        approvedAt: new Date(),
        sentText: newText,
      },
      include: { 
        review: {
          include: { business: true },
        },
      },
    });

    // Save edited reply for AI learning (marked as edited - more valuable!)
    await saveReplyExample(
      aiReply.review.businessId,
      aiReply.review.rating,
      aiReply.review.text,
      newText,
      true // wasEdited = true (owner edited it)
    );

    // Clear editing state
    await prisma.user.update({
      where: { id: user.id },
      data: { telegramEditingReplyId: null },
    });

    // Send confirmation
    await sendTelegramMessage(
      chatId,
      `✅ *Reply Updated & Approved\\!*\n\nYour edited reply to ${escapeMarkdownV2(aiReply.review.authorName)}'s review:\n\n_"${escapeMarkdownV2(newText)}"_`
    );

    // Log audit
    await prisma.auditLog.create({
      data: {
        event: "REPLY_EDITED_VIA_TELEGRAM",
        entityId: aiReply.id,
        details: JSON.stringify({ chatId, newText }),
      },
    });

    return { success: true, message: "Reply updated and approved" };
  } catch (error) {
    console.error("Error processing edited reply:", error);
    return { success: false, message: "Error updating reply" };
  }
}

/**
 * Skip the review (no reply)
 */
async function handleSkip(
  callbackQueryId: string,
  chatId: string,
  aiReplyId: string
): Promise<{ success: boolean; message: string }> {
  const aiReply = await prisma.aiReply.update({
    where: { id: aiReplyId },
    data: {
      status: "SKIPPED",
      skippedAt: new Date(),
    },
    include: { review: true },
  });

  await answerCallbackQuery(callbackQueryId, "⏭️ Review skipped");

  await sendTelegramMessage(
    chatId,
    `⏭️ *Skipped*\n\n${escapeMarkdownV2(aiReply.review.authorName)}'s review has been skipped\\. No reply will be posted\\.`
  );

  await prisma.auditLog.create({
    data: {
      event: "REPLY_SKIPPED_VIA_TELEGRAM",
      entityId: aiReplyId,
      details: JSON.stringify({ chatId }),
    },
  });

  return { success: true, message: "Review skipped" };
}

/**
 * Regenerate AI reply
 */
async function handleRegenerate(
  callbackQueryId: string,
  chatId: string,
  reviewId: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Import dynamically to avoid circular deps
    const { regenerateAiReply } = await import("./gemini-ai");

    await answerCallbackQuery(callbackQueryId, "🔄 Regenerating...");

    await sendTelegramMessage(
      chatId,
      "🔄 *Regenerating AI reply\\.\\.\\.*\n\nPlease wait a moment\\."
    );

    // Get review details for regeneration
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      include: { 
        location: { include: { brand: true } },
        business: true,
      },
    });

    if (!review) {
      await sendTelegramMessage(chatId, "❌ Review not found\\.");
      return { success: false, message: "Review not found" };
    }

    // Regenerate the reply with required arguments (including businessId for personalization)
    const newReply = await regenerateAiReply(
      reviewId,
      review.text,
      review.rating,
      review.location.brand.name,
      review.businessId // Pass businessId for personalized AI
    );

    if (!newReply) {
      await sendTelegramMessage(chatId, "❌ Failed to regenerate reply\\. Please try again\\.");
      return { success: false, message: "Regeneration failed" };
    }

    // Get updated review with new AI reply
    const updatedReview = await prisma.review.findUnique({
      where: { id: reviewId },
      include: { 
        location: { include: { brand: true } },
        aiReply: true,
      },
    });

    if (updatedReview && updatedReview.aiReply) {
      // Get user for chat ID verification
      const inlineKeyboard = {
        inline_keyboard: [
          [
            { text: "✅ Approve Reply", callback_data: `approve:${updatedReview.aiReply.id}` },
            { text: "✏️ Edit Reply", callback_data: `edit:${updatedReview.aiReply.id}` },
          ],
          [
            { text: "⏭️ Skip", callback_data: `skip:${updatedReview.aiReply.id}` },
            { text: "🔄 Regenerate", callback_data: `regen:${reviewId}` },
          ],
        ],
      };

      await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: `🆕 *New AI Suggestion:*\n\n_"${escapeMarkdownV2(updatedReview.aiReply.suggestedText)}"_`,
          parse_mode: "MarkdownV2",
          reply_markup: inlineKeyboard,
        }),
      });
    }

    return { success: true, message: "Reply regenerated" };
  } catch (error) {
    console.error("Error regenerating reply:", error);
    return { success: false, message: "Error regenerating reply" };
  }
}

/**
 * Answer callback query (removes loading state from button)
 */
async function answerCallbackQuery(callbackQueryId: string, text: string): Promise<void> {
  await fetch(`${TELEGRAM_API_URL}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text: text,
      show_alert: false,
    }),
  });
}

/**
 * Remove inline keyboard from a message (prevents double-clicks)
 */
async function removeInlineKeyboard(chatId: string, messageId: number): Promise<void> {
  try {
    await fetch(`${TELEGRAM_API_URL}/editMessageReplyMarkup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        reply_markup: { inline_keyboard: [] },
      }),
    });
  } catch (error) {
    console.error("Error removing keyboard:", error);
  }
}

/**
 * Send a simple message
 */
async function sendTelegramMessage(chatId: string, text: string): Promise<boolean> {
  try {
    const response = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: "MarkdownV2",
      }),
    });
    const data = await response.json();
    return data.ok === true;
  } catch (error) {
    console.error("Error sending message:", error);
    return false;
  }
}

/**
 * Escape special characters for MarkdownV2
 */
function escapeMarkdownV2(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, "\\$&");
}

/**
 * Cancel editing mode
 */
export async function cancelEditing(chatId: string): Promise<void> {
  await prisma.user.updateMany({
    where: { telegramChatId: chatId },
    data: { telegramEditingReplyId: null },
  });

  await sendTelegramMessage(chatId, "❌ Editing cancelled\\.");
}
