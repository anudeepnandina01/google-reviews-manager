import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { devWhatsAppState } from "@/lib/whatsapp-state";
import crypto from "crypto";

const isDev = process.env.NODE_ENV === "development";

// WhatsApp Business number that users will message
const WHATSAPP_BUSINESS_NUMBER = process.env.WHATSAPP_BUSINESS_NUMBER || "";
// WhatsApp is available if we have a business number configured
const WHATSAPP_AVAILABLE = true; // Always show WhatsApp option

/**
 * GET /api/settings/whatsapp
 * Get current WhatsApp connection status
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
          whatsappPhone: true,
          whatsappVerified: true,
          whatsappConnectCode: true,
          whatsappConnectExpiry: true,
          whatsappEnabled: true,
        },
      });

      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      const isConnected = !!user.whatsappPhone && user.whatsappVerified;
      const hasPendingCode = user.whatsappConnectCode && 
        user.whatsappConnectExpiry && 
        user.whatsappConnectExpiry > new Date();

      return NextResponse.json({
        connected: isConnected,
        phone: user.whatsappPhone ? maskPhone(user.whatsappPhone) : null,
        verified: user.whatsappVerified,
        enabled: user.whatsappEnabled,
        pendingCode: hasPendingCode ? user.whatsappConnectCode : null,
        codeExpiresAt: hasPendingCode ? user.whatsappConnectExpiry : null,
        whatsappNumber: WHATSAPP_BUSINESS_NUMBER,
        available: WHATSAPP_AVAILABLE,
      });
    } catch (dbError) {
      if (isDev) {
        console.log("Database unreachable in dev mode, using mock WhatsApp status");
        const hasPendingCode = devWhatsAppState.connectCode && 
          devWhatsAppState.connectExpiry && 
          devWhatsAppState.connectExpiry > new Date();

        return NextResponse.json({
          connected: devWhatsAppState.connected,
          phone: devWhatsAppState.phone ? maskPhone(devWhatsAppState.phone) : null,
          verified: devWhatsAppState.verified,
          enabled: devWhatsAppState.enabled,
          pendingCode: hasPendingCode ? devWhatsAppState.connectCode : null,
          codeExpiresAt: hasPendingCode ? devWhatsAppState.connectExpiry : null,
          whatsappNumber: WHATSAPP_BUSINESS_NUMBER,
          available: WHATSAPP_AVAILABLE,
        });
      }
      throw dbError;
    }
  } catch (error) {
    console.error("Error fetching WhatsApp status:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function maskPhone(phone: string): string {
  if (phone.length < 6) return phone;
  return phone.slice(0, 4) + "****" + phone.slice(-2);
}

// Normalize phone number to E.164 format
function normalizePhone(phone: string): string {
  // Remove all non-digit characters except leading +
  let normalized = phone.replace(/[^\d+]/g, "");
  // If doesn't start with +, assume it's Indian number and add +91
  if (!normalized.startsWith("+")) {
    if (normalized.startsWith("91") && normalized.length > 10) {
      normalized = "+" + normalized;
    } else {
      normalized = "+91" + normalized;
    }
  }
  return normalized;
}

/**
 * POST /api/settings/whatsapp
 * Start WhatsApp connection - send OTP to user's WhatsApp
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { phone } = body;

    if (!phone) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
    }

    const normalizedPhone = normalizePhone(phone);

    // Generate a 6-digit OTP code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    try {
      await prisma.user.update({
        where: { id: session.userId },
        data: {
          whatsappPhone: normalizedPhone,
          whatsappConnectCode: otpCode,
          whatsappConnectExpiry: expiresAt,
          whatsappVerified: false,
        },
      });
    } catch (dbError) {
      if (isDev) {
        console.log("Database unreachable in dev mode, using mock WhatsApp connect");
        devWhatsAppState.phone = normalizedPhone;
        devWhatsAppState.connectCode = otpCode;
        devWhatsAppState.connectExpiry = expiresAt;
        devWhatsAppState.verified = false;
      } else {
        throw dbError;
      }
    }

    // Send OTP via WhatsApp Business API
    const sent = await sendWhatsAppOTP(normalizedPhone, otpCode);

    if (!sent) {
      return NextResponse.json({
        success: true,
        message: "Code generated (WhatsApp API not configured - code logged to console)",
        // In dev/testing, return the code for easier testing
        ...(isDev ? { debugCode: otpCode } : {}),
      });
    }

    return NextResponse.json({
      success: true,
      message: "Verification code sent to your WhatsApp!",
    });
  } catch (error) {
    console.error("Error starting WhatsApp connection:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * Send OTP via WhatsApp Business API
 * Uses a custom authentication template with OTP code as parameter
 */
async function sendWhatsAppOTP(phone: string, code: string): Promise<boolean> {
  const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const ACCESS_TOKEN = process.env.WHATSAPP_BUSINESS_TOKEN;

  if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
    console.log(`[WhatsApp] API not configured. OTP for ${phone}: ${code}`);
    return false;
  }

  const phoneNumber = phone.replace("+", "");

  try {
    // Use custom OTP template with the code as a parameter
    // Template name: "review_alerts_otp" - must be created in WhatsApp Manager
    // Fallback to hello_world if custom template fails
    
    // Try custom OTP template first
    let response = await fetch(
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
            name: "review_alerts_otp",
            language: { code: "en" },
            components: [
              {
                type: "body",
                parameters: [
                  { type: "text", text: code }
                ]
              },
              {
                type: "button",
                sub_type: "url",
                index: "0",
                parameters: [
                  { type: "text", text: code }
                ]
              }
            ]
          },
        }),
      }
    );

    if (response.ok) {
      console.log(`[WhatsApp] OTP template sent to ${phone}`);
      return true;
    }

    // If custom template fails, try the simple text-only template
    console.log(`[WhatsApp] Custom template failed, trying simple template...`);
    
    response = await fetch(
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
            name: "review_otp_simple",
            language: { code: "en" },
            components: [
              {
                type: "body",
                parameters: [
                  { type: "text", text: code }
                ]
              }
            ]
          },
        }),
      }
    );

    if (response.ok) {
      console.log(`[WhatsApp] Simple OTP template sent to ${phone}`);
      return true;
    }

    // Last resort: hello_world + text (requires user reply)
    console.log(`[WhatsApp] Templates failed, using hello_world fallback...`);
    const error = await response.json();
    console.error("WhatsApp template error:", error);
    
    // Send hello_world as last resort
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

    // Try text message (works if conversation already open)
    await new Promise(resolve => setTimeout(resolve, 1000));
    
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
          type: "text",
          text: {
            body: `🔐 Your Review Alerts verification code is: *${code}*\n\nThis code expires in 10 minutes.`,
          },
        }),
      }
    );

    return true;
  } catch (error) {
    console.error("Error sending WhatsApp message:", error);
    return false;
  }
}

/**
 * PUT /api/settings/whatsapp
 * Update WhatsApp preferences (enable/disable)
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { enabled } = body;

    if (typeof enabled !== "boolean") {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    try {
      await prisma.user.update({
        where: { id: session.userId },
        data: { whatsappEnabled: enabled },
      });
    } catch (dbError) {
      if (isDev) {
        console.log("Database unreachable in dev mode, using mock WhatsApp update");
        devWhatsAppState.enabled = enabled;
      } else {
        throw dbError;
      }
    }

    return NextResponse.json({ success: true, enabled });
  } catch (error) {
    console.error("Error updating WhatsApp preferences:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/settings/whatsapp
 * Disconnect WhatsApp
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
          whatsappPhone: null,
          whatsappVerified: false,
          whatsappConnectCode: null,
          whatsappConnectExpiry: null,
        },
      });
    } catch (dbError) {
      if (isDev) {
        console.log("Database unreachable in dev mode, using mock WhatsApp disconnect");
        devWhatsAppState.connected = false;
        devWhatsAppState.phone = null;
        devWhatsAppState.verified = false;
        devWhatsAppState.connectCode = null;
        devWhatsAppState.connectExpiry = null;
      } else {
        throw dbError;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error disconnecting WhatsApp:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
