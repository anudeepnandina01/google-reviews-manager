import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_BUSINESS_TOKEN;

/**
 * Send a test review notification to WhatsApp
 */
export async function POST() {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's WhatsApp phone
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { 
        whatsappPhone: true, 
        whatsappVerified: true,
        name: true 
      },
    });

    if (!user?.whatsappPhone || !user?.whatsappVerified) {
      return NextResponse.json({ 
        error: "WhatsApp not connected" 
      }, { status: 400 });
    }

    // Send WhatsApp notification
    const phoneNumber = user.whatsappPhone.replace("+", "");
    
    // First send hello_world template - this always works
    const templateResponse = await fetch(
      `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: phoneNumber,
          type: "template",
          template: {
            name: "hello_world",
            language: { code: "en_US" },
          },
        }),
      }
    );

    if (!templateResponse.ok) {
      const error = await templateResponse.json();
      console.error("WhatsApp template error:", error);
      return NextResponse.json({ 
        error: "Failed to send WhatsApp notification" 
      }, { status: 500 });
    }

    // Small delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Try to send the actual review notification as text
    // This will only work if the user has an open conversation window
    const mockReview = {
      authorName: "Sarah Johnson",
      rating: 5,
      text: "Absolutely amazing experience! The team went above and beyond to help me. Highly recommend to everyone!",
      businessName: "Your Business",
      locationName: "Main Location",
      aiReply: "Thank you so much, Sarah! We're delighted to hear about your wonderful experience. Your recommendation means the world to us! 🌟",
    };

    const stars = "⭐".repeat(mockReview.rating);
    const message = `🔔 *New Review Alert!*

📍 *${mockReview.businessName}* - ${mockReview.locationName}

${stars} (${mockReview.rating}/5)

👤 *${mockReview.authorName}* wrote:
"${mockReview.text}"

---

🤖 *AI Suggested Reply:*
"${mockReview.aiReply}"`;

    // Try to send interactive message with buttons (works when conversation window is open)
    const interactiveResponse = await fetch(
      `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: phoneNumber,
          type: "interactive",
          interactive: {
            type: "button",
            body: {
              text: message,
            },
            footer: {
              text: "Test notification from Review Alerts",
            },
            action: {
              buttons: [
                {
                  type: "reply",
                  reply: {
                    id: "approve_reply",
                    title: "✅ Approve",
                  },
                },
                {
                  type: "reply",
                  reply: {
                    id: "edit_reply",
                    title: "✏️ Edit",
                  },
                },
                {
                  type: "reply",
                  reply: {
                    id: "skip_reply",
                    title: "⏭️ Skip",
                  },
                },
              ],
            },
          },
        }),
      }
    );

    // Check if interactive message was sent
    if (interactiveResponse.ok) {
      return NextResponse.json({ 
        success: true, 
        message: "Test review notification sent to WhatsApp with buttons!",
      });
    }
    
    // If interactive failed, try plain text as fallback
    const textResponse = await fetch(
      `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: phoneNumber,
          type: "text",
          text: { body: message + "\n\n---\n\n✅ Reply *APPROVE* to post this reply\n✏️ Reply *EDIT* to modify\n⏭️ Reply *SKIP* to skip" },
        }),
      }
    );

    if (textResponse.ok) {
      return NextResponse.json({ 
        success: true, 
        message: "Test review notification sent to WhatsApp!",
      });
    }
    
    // Both failed - template was sent, tell user to reply first
    return NextResponse.json({ 
      success: true, 
      message: "WhatsApp notification sent! Reply 'hi' to that message, then try again to see the full review alert with buttons.",
      partial: true,
    });

  } catch (error) {
    console.error("Error sending WhatsApp test review:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
