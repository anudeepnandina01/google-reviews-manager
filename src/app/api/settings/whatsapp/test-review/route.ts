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
"${mockReview.aiReply}"

---

✅ Reply *APPROVE* to post this reply
✏️ Reply *EDIT* to modify the reply
⏭️ Reply *SKIP* to skip this review

_This is a test notification from Review Alerts_`;

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
          text: { body: message },
        }),
      }
    );

    // Check if text message was sent
    const textSent = textResponse.ok;
    
    if (textSent) {
      return NextResponse.json({ 
        success: true, 
        message: "Test review notification sent to WhatsApp!",
      });
    } else {
      // Text failed but template was sent - tell user to reply first
      return NextResponse.json({ 
        success: true, 
        message: "WhatsApp notification sent! Reply 'hi' to that message, then try again to see the full review alert.",
        partial: true,
      });
    }

  } catch (error) {
    console.error("Error sending WhatsApp test review:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
