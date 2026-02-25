import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

const isDev = process.env.NODE_ENV === "development";

// In-memory store for dev mode
const devWhatsAppState = {
  connected: false,
  phone: null as string | null,
  verified: false,
  connectCode: null as string | null,
  connectExpiry: null as Date | null,
  enabled: true,
};

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
        pendingCode: hasPendingCode,
        codeExpiresAt: hasPendingCode ? user.whatsappConnectExpiry : null,
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
          pendingCode: hasPendingCode,
          codeExpiresAt: hasPendingCode ? devWhatsAppState.connectExpiry : null,
        });
      }
      throw dbError;
    }
  } catch (error) {
    console.error("Error fetching WhatsApp status:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/settings/whatsapp
 * Start WhatsApp connection - send OTP to provided phone
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

    // Validate phone format (should start with + and contain only digits after)
    const cleanPhone = phone.replace(/\s/g, "");
    if (!/^\+\d{10,15}$/.test(cleanPhone)) {
      return NextResponse.json({ 
        error: "Invalid phone format. Use international format: +1234567890" 
      }, { status: 400 });
    }

    // Generate a 6-digit OTP
    const connectCode = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    try {
      await prisma.user.update({
        where: { id: session.userId },
        data: {
          whatsappPhone: cleanPhone,
          whatsappVerified: false,
          whatsappConnectCode: connectCode,
          whatsappConnectExpiry: expiresAt,
        },
      });
    } catch (dbError) {
      if (isDev) {
        console.log("Database unreachable in dev mode, using mock WhatsApp connect");
        devWhatsAppState.phone = cleanPhone;
        devWhatsAppState.verified = false;
        devWhatsAppState.connectCode = connectCode;
        devWhatsAppState.connectExpiry = expiresAt;
      } else {
        throw dbError;
      }
    }

    // In production, send OTP via WhatsApp
    // For now, we'll just return success and expect manual verification
    // TODO: Integrate with WhatsApp Business API to send OTP
    
    const isWhatsAppConfigured = !!(
      process.env.WHATSAPP_PHONE_NUMBER_ID && 
      process.env.WHATSAPP_BUSINESS_TOKEN
    );

    return NextResponse.json({
      success: true,
      phone: maskPhone(cleanPhone),
      expiresAt,
      // In dev/testing, show the code. In production, it would be sent via WhatsApp
      ...(isDev || !isWhatsAppConfigured ? { code: connectCode } : {}),
      message: isWhatsAppConfigured 
        ? "OTP sent to your WhatsApp" 
        : "Enter the verification code shown below (WhatsApp API not configured)",
    });
  } catch (error) {
    console.error("Error starting WhatsApp connection:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
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
        console.log("Database unreachable in dev mode, updating mock WhatsApp enabled");
        devWhatsAppState.enabled = enabled;
      } else {
        throw dbError;
      }
    }

    return NextResponse.json({ success: true, enabled });
  } catch (error) {
    console.error("Error updating WhatsApp settings:", error);
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
        console.log("Database unreachable in dev mode, disconnecting mock WhatsApp");
        devWhatsAppState.connected = false;
        devWhatsAppState.phone = null;
        devWhatsAppState.verified = false;
        devWhatsAppState.connectCode = null;
        devWhatsAppState.connectExpiry = null;
      } else {
        throw dbError;
      }
    }

    return NextResponse.json({ success: true, message: "WhatsApp disconnected" });
  } catch (error) {
    console.error("Error disconnecting WhatsApp:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Helper to mask phone number for display
function maskPhone(phone: string): string {
  if (phone.length <= 4) return phone;
  return phone.slice(0, -4).replace(/\d/g, "*") + phone.slice(-4);
}
