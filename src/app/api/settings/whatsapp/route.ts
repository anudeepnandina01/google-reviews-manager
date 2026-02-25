import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { devWhatsAppState } from "@/lib/whatsapp-state";
import crypto from "crypto";

const isDev = process.env.NODE_ENV === "development";

// WhatsApp Business number that users will message
const WHATSAPP_BUSINESS_NUMBER = process.env.WHATSAPP_BUSINESS_NUMBER || "";
const WHATSAPP_AVAILABLE = !!WHATSAPP_BUSINESS_NUMBER;

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

/**
 * POST /api/settings/whatsapp
 * Generate a connection code (like Telegram flow)
 * User will send this code to our WhatsApp number
 */
export async function POST() {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Generate a 6-character alphanumeric code (easier to type in WhatsApp)
    const connectCode = crypto.randomBytes(3).toString("hex").toUpperCase();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    try {
      await prisma.user.update({
        where: { id: session.userId },
        data: {
          whatsappConnectCode: connectCode,
          whatsappConnectExpiry: expiresAt,
          whatsappVerified: false,
        },
      });
    } catch (dbError) {
      if (isDev) {
        console.log("Database unreachable in dev mode, using mock WhatsApp connect");
        devWhatsAppState.connectCode = connectCode;
        devWhatsAppState.connectExpiry = expiresAt;
        devWhatsAppState.verified = false;
      } else {
        throw dbError;
      }
    }

    return NextResponse.json({
      success: true,
      code: connectCode,
      expiresAt,
      whatsappNumber: WHATSAPP_BUSINESS_NUMBER,
      // Generate wa.me link for easy click
      whatsappLink: WHATSAPP_BUSINESS_NUMBER 
        ? `https://wa.me/${WHATSAPP_BUSINESS_NUMBER.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(connectCode)}`
        : null,
      message: "Send this code to our WhatsApp number to connect your account",
    });
  } catch (error) {
    console.error("Error generating WhatsApp code:", error);
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
