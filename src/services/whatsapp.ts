import axios from "axios";
import { prisma } from "@/lib/prisma";
import { NotificationStatus } from "@prisma/client";

const WHATSAPP_API_URL = "https://graph.instagram.com/v18.0";
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_BUSINESS_TOKEN;

interface WhatsAppNotificationPayload {
  recipientPhone: string;
  reviewerName: string;
  rating: number;
  reviewText: string;
  locationName: string;
  aiReplyText: string | null;
  approvalLink: string;
}

/**
 * Send WhatsApp notification to owner
 * Triggered immediately on review creation (fire-and-forget)
 */
export async function sendWhatsAppNotification(
  payload: WhatsAppNotificationPayload,
  reviewId: string
): Promise<void> {
  try {
    const messageBody = formatNotificationMessage(payload);

    // Create notification record
    const notification = await prisma.notification.create({
      data: {
        reviewId,
        recipientPhone: payload.recipientPhone,
        messageBody,
        status: NotificationStatus.PENDING,
      },
    });

    // Send asynchronously without waiting
    sendMessageToWhatsApp(notification.id, payload, messageBody).catch(
      (error) => {
        console.error(`WhatsApp send failed for notification ${notification.id}:`, error);
      }
    );

    // Log event
    await prisma.auditLog.create({
      data: {
        event: "NOTIFICATION_SENT",
        entityId: reviewId,
        details: JSON.stringify({ notificationId: notification.id }),
      },
    });
  } catch (error) {
    console.error(`Failed to create notification record for review ${reviewId}:`, error);
    await prisma.auditLog.create({
      data: {
        event: "NOTIFICATION_FAILED",
        entityId: reviewId,
        details: JSON.stringify({ error: "Notification creation failed" }),
      },
    });
  }
}

/**
 * Format WhatsApp message with review details
 */
function formatNotificationMessage(payload: WhatsAppNotificationPayload): string {
  const stars = "⭐".repeat(payload.rating);
  const aiReplySection = payload.aiReplyText
    ? `\n\n📝 *Suggested Reply:*\n${payload.aiReplyText}`
    : "";

  return `
🔔 *New Review at ${payload.locationName}*

${stars} (${payload.rating}/5 stars)

👤 *From:* ${payload.reviewerName}

💬 *Review:*
${payload.reviewText}${aiReplySection}

👉 [Review & Approve Reply](${payload.approvalLink})
  `.trim();
}

/**
 * Internal: Send message to WhatsApp API
 */
async function sendMessageToWhatsApp(
  notificationId: string,
  payload: WhatsAppNotificationPayload,
  messageBody: string,
  retryCount: number = 0
): Promise<void> {
  const maxRetries = 3;

  try {
    await axios.post(
      `${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: payload.recipientPhone,
        type: "text",
        text: {
          body: messageBody,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    // Update notification status
    await prisma.notification.update({
      where: { id: notificationId },
      data: {
        status: NotificationStatus.SENT,
        sentAt: new Date(),
      },
    });
  } catch (error) {
    console.error(
      `WhatsApp API error for notification ${notificationId}:`,
      error
    );

    if (retryCount < maxRetries) {
      // Retry with exponential backoff
      const delay = Math.pow(2, retryCount) * 1000;
      setTimeout(() => {
        sendMessageToWhatsApp(
          notificationId,
          payload,
          messageBody,
          retryCount + 1
        );
      }, delay);

      await prisma.notification.update({
        where: { id: notificationId },
        data: {
          retryCount: retryCount + 1,
          lastRetryAt: new Date(),
        },
      });
    } else {
      // Max retries exceeded
      await prisma.notification.update({
        where: { id: notificationId },
        data: {
          status: NotificationStatus.FAILED,
          failureReason: "Max retries exceeded",
        },
      });
    }
  }
}

/**
 * Handle webhook delivery status from WhatsApp
 */
export async function handleWhatsAppWebhook(payload: any): Promise<void> {
  if (payload.entry?.[0]?.changes?.[0]?.value?.statuses) {
    const statuses = payload.entry[0].changes[0].value.statuses;

    for (const status of statuses) {
      const _messageId = status.id;
      const statusValue = status.status; // sent, delivered, read, failed

      // Map WhatsApp status to our status enum
      let notificationStatus: NotificationStatus = NotificationStatus.PENDING;
      if (statusValue === "sent" || statusValue === "delivered") {
        notificationStatus = NotificationStatus.DELIVERED;
      } else if (statusValue === "failed") {
        notificationStatus = NotificationStatus.FAILED;
      }

      // Update notification (in real implementation, would match by external ID)
      // Log the status change for now
      console.log(`WhatsApp status update: ${notificationStatus}`);
    }
  }
}
