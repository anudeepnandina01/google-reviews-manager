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

    // Create mock review data
    const mockReview = {
      authorName: "Sarah Johnson",
      rating: 5,
      text: "Absolutely amazing experience! The team went above and beyond to help me. Highly recommend to everyone!",
      businessName: "Your Business",
      locationName: "Main Location",
      aiReply: "Thank you so much, Sarah! We're delighted to hear about your wonderful experience. Your recommendation means the world to us! 🌟",
    };

    // Send WhatsApp notification
    const phoneNumber = user.whatsappPhone.replace("+", "");
    
    // First send hello_world template to initiate (if needed)
    await fetch(
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

    // Small delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Send the actual review notification
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

    const response = await fetch(
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

    if (!response.ok) {
      const error = await response.json();
      console.error("WhatsApp API error:", error);
      return NextResponse.json({ 
        error: "Failed to send WhatsApp notification" 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: "Test review notification sent to WhatsApp!",
    });

  } catch (error) {
    console.error("Error sending WhatsApp test review:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
