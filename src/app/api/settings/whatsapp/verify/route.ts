import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

const isDev = process.env.NODE_ENV === "development";

// Reference to dev state from main route
let devWhatsAppState = {
  connected: false,
  phone: null as string | null,
  verified: false,
  connectCode: null as string | null,
  connectExpiry: null as Date | null,
  enabled: true,
};

/**
 * POST /api/settings/whatsapp/verify
 * Verify OTP and complete WhatsApp connection
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json({ error: "Verification code is required" }, { status: 400 });
    }

    let userCode: string | null = null;
    let userExpiry: Date | null = null;
    let userPhone: string | null = null;

    try {
      const user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: {
          whatsappPhone: true,
          whatsappConnectCode: true,
          whatsappConnectExpiry: true,
        },
      });

      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      userCode = user.whatsappConnectCode;
      userExpiry = user.whatsappConnectExpiry;
      userPhone = user.whatsappPhone;
    } catch (dbError) {
      if (isDev) {
        console.log("Database unreachable in dev mode, using mock WhatsApp verify");
        userCode = devWhatsAppState.connectCode;
        userExpiry = devWhatsAppState.connectExpiry;
        userPhone = devWhatsAppState.phone;
      } else {
        throw dbError;
      }
    }

    if (!userCode || !userPhone) {
      return NextResponse.json({ 
        error: "No pending verification. Please start the connection process again." 
      }, { status: 400 });
    }

    if (userExpiry && userExpiry < new Date()) {
      return NextResponse.json({ error: "Verification code expired" }, { status: 400 });
    }

    if (code !== userCode) {
      return NextResponse.json({ error: "Invalid verification code" }, { status: 400 });
    }

    // Code is valid - mark as verified
    try {
      await prisma.user.update({
        where: { id: session.userId },
        data: {
          whatsappVerified: true,
          whatsappConnectCode: null,
          whatsappConnectExpiry: null,
        },
      });
    } catch (dbError) {
      if (isDev) {
        console.log("Database unreachable in dev mode, completing mock WhatsApp verification");
        devWhatsAppState.connected = true;
        devWhatsAppState.verified = true;
        devWhatsAppState.connectCode = null;
        devWhatsAppState.connectExpiry = null;
      } else {
        throw dbError;
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: "WhatsApp connected successfully!",
      phone: maskPhone(userPhone),
    });
  } catch (error) {
    console.error("Error verifying WhatsApp:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function maskPhone(phone: string): string {
  if (phone.length <= 4) return phone;
  return phone.slice(0, -4).replace(/\d/g, "*") + phone.slice(-4);
}
