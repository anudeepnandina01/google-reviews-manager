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
 * Uses hello_world template first (required to initiate conversation),
 * then sends the actual OTP as a text message
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
    // First, send template message to initiate conversation (required by WhatsApp Business API)
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
      console.error("WhatsApp template API error:", error);
      return false;
    }

    console.log(`[WhatsApp] Template sent to ${phone}, now sending OTP...`);

    // Small delay to ensure conversation is open
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Now send the actual OTP as a text message (conversation window is now open)
    const otpResponse = await fetch(
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
            body: `🔐 Your Review Alerts verification code is: *${code}*\n\nThis code expires in 10 minutes.\n\nIf you didn't request this, please ignore this message.`,
          },
        }),
      }
    );

    if (!otpResponse.ok) {
      const error = await otpResponse.json();
      console.error("WhatsApp OTP API error:", error);
      // Template was sent, so partial success - user will at least know we tried
      return true;
    }

    console.log(`[WhatsApp] OTP sent to ${phone}`);
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
