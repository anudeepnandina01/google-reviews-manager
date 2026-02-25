import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import axios from "axios";

const WHATSAPP_API_URL = "https://graph.facebook.com/v18.0";
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_BUSINESS_TOKEN;

/**
 * POST /api/webhooks/whatsapp
 * Handle incoming WhatsApp messages and delivery status updates
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    console.log("WhatsApp webhook received:", JSON.stringify(payload, null, 2));

    // Handle incoming messages
    if (payload.entry?.[0]?.changes?.[0]?.value?.messages) {
      const messages = payload.entry[0].changes[0].value.messages;
      
      for (const message of messages) {
        await handleIncomingMessage(message);
      }
    }

    // Handle delivery status updates
    if (payload.entry?.[0]?.changes?.[0]?.value?.statuses) {
      const statuses = payload.entry[0].changes[0].value.statuses;
      
      for (const status of statuses) {
        await handleStatusUpdate(status);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error handling WhatsApp webhook:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

/**
 * Handle incoming WhatsApp message
 * Check if it's a connection code
 */
async function handleIncomingMessage(message: any) {
  try {
    const fromPhone = message.from; // User's phone number
    const messageText = message.text?.body?.trim().toUpperCase();
    
    if (!messageText || !fromPhone) {
      console.log("Invalid message format:", message);
      return;
    }

    console.log(`Received message from ${fromPhone}: ${messageText}`);

    // Check if this is a connection code (6 character hex)
    if (/^[A-F0-9]{6}$/.test(messageText)) {
      await handleConnectionCode(fromPhone, messageText);
      return;
    }

    // Handle other commands
    const lowerText = messageText.toLowerCase();
    
    if (lowerText === "/start" || lowerText === "hi" || lowerText === "hello") {
      await sendWhatsAppMessage(
        fromPhone,
        "👋 Welcome to Review Alerts!\n\n" +
        "To connect your account:\n" +
        "1. Go to Settings in the app\n" +
        "2. Click 'Connect WhatsApp'\n" +
        "3. Send the code shown there to this chat\n\n" +
        "Once connected, you'll receive instant notifications when customers leave reviews!"
      );
      return;
    }

    if (lowerText === "/help") {
      await sendWhatsAppMessage(
        fromPhone,
        "📖 *Available Commands:*\n\n" +
        "• Send your 6-digit code to connect\n" +
        "• /status - Check connection status\n" +
        "• /help - Show this help message"
      );
      return;
    }

    if (lowerText === "/status") {
      // Check if user is connected
      const user = await prisma.user.findFirst({
        where: { whatsappPhone: fromPhone },
      });

      if (user && user.whatsappVerified) {
        await sendWhatsAppMessage(
          fromPhone,
          "✅ *Connected!*\n\n" +
          "Your WhatsApp is linked to your account. You'll receive review notifications here."
        );
      } else {
        await sendWhatsAppMessage(
          fromPhone,
          "❌ *Not Connected*\n\n" +
          "Your WhatsApp is not linked yet. Go to Settings in the app and click 'Connect WhatsApp' to get a code."
        );
      }
      return;
    }

    // Unknown message
    await sendWhatsAppMessage(
      fromPhone,
      "🤔 I didn't understand that.\n\n" +
      "If you're trying to connect, please send the 6-character code from the app.\n\n" +
      "Type /help for available commands."
    );
  } catch (error) {
    console.error("Error handling incoming message:", error);
  }
}

/**
 * Handle connection code verification
 */
async function handleConnectionCode(fromPhone: string, code: string) {
  try {
    // Find user with this pending code
    const user = await prisma.user.findFirst({
      where: {
        whatsappConnectCode: code,
        whatsappConnectExpiry: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      await sendWhatsAppMessage(
        fromPhone,
        "❌ *Invalid or Expired Code*\n\n" +
        "This code is not valid or has expired. Please generate a new code from the app settings."
      );
      return;
    }

    // Verify and connect
    await prisma.user.update({
      where: { id: user.id },
      data: {
        whatsappPhone: fromPhone,
        whatsappVerified: true,
        whatsappConnectCode: null,
        whatsappConnectExpiry: null,
      },
    });

    await sendWhatsAppMessage(
      fromPhone,
      "✅ *Successfully Connected!*\n\n" +
      "Your WhatsApp is now linked to your account.\n\n" +
      "You'll receive instant notifications when customers leave reviews, along with AI-generated reply suggestions.\n\n" +
      "📱 Go back to the app to continue setup."
    );

    console.log(`WhatsApp connected for user ${user.id}: ${fromPhone}`);
  } catch (error) {
    console.error("Error handling connection code:", error);
    await sendWhatsAppMessage(
      fromPhone,
      "⚠️ *Error*\n\n" +
      "Something went wrong while connecting. Please try again."
    );
  }
}

/**
 * Handle delivery status updates
 */
async function handleStatusUpdate(status: any) {
  try {
    const messageId = status.id;
    const statusValue = status.status; // sent, delivered, read, failed
    
    console.log(`Message ${messageId} status: ${statusValue}`);

    // Update notification status in database if needed
    // This can be used to track delivery of review notifications
  } catch (error) {
    console.error("Error handling status update:", error);
  }
}

/**
 * Send a WhatsApp message
 */
async function sendWhatsAppMessage(to: string, text: string): Promise<boolean> {
  if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
    console.log("WhatsApp API not configured. Message would be:", { to, text });
    return false;
  }

  try {
    await axios.post(
      `${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: to,
        type: "text",
        text: { body: text },
      },
      {
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );
    return true;
  } catch (error) {
    console.error("Error sending WhatsApp message:", error);
    return false;
  }
}

/**
 * GET /api/webhooks/whatsapp
 * Webhook verification from WhatsApp (Meta)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  console.log("WhatsApp webhook verification:", { mode, token, challenge });

  if (
    mode === "subscribe" &&
    token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN
  ) {
    console.log("WhatsApp webhook verified successfully");
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
}
