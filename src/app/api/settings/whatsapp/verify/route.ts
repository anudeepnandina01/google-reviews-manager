import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { devWhatsAppState } from "@/lib/whatsapp-state";

const isDev = process.env.NODE_ENV === "development";

/**
 * POST /api/settings/whatsapp/verify
 * Verify the OTP code sent to user's WhatsApp
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

    try {
      const user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: {
          whatsappPhone: true,
          whatsappVerified: true,
          whatsappConnectCode: true,
          whatsappConnectExpiry: true,
        },
      });

      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      // Check if already verified
      if (user.whatsappVerified && user.whatsappPhone) {
        return NextResponse.json({
          connected: true,
          verified: true,
          message: "WhatsApp already connected!",
        });
      }

      // Check if there's a pending code
      if (!user.whatsappConnectCode) {
        return NextResponse.json({
          error: "No pending verification. Please request a new code.",
        }, { status: 400 });
      }

      // Check if code expired
      if (user.whatsappConnectExpiry && user.whatsappConnectExpiry < new Date()) {
        return NextResponse.json({
          error: "Code expired. Please request a new code.",
        }, { status: 400 });
      }

      // Verify the code
      if (user.whatsappConnectCode !== code) {
        return NextResponse.json({
          error: "Invalid code. Please check and try again.",
        }, { status: 400 });
      }

      // Code matches! Mark as verified
      await prisma.user.update({
        where: { id: session.userId },
        data: {
          whatsappVerified: true,
          whatsappConnectCode: null,
          whatsappConnectExpiry: null,
          whatsappEnabled: true,
        },
      });

      return NextResponse.json({
        connected: true,
        verified: true,
        message: "WhatsApp connected successfully!",
      });
    } catch (dbError) {
      if (isDev) {
        console.log("Database unreachable in dev mode, using mock WhatsApp verify");
        
        // Mock verification
        if (devWhatsAppState.connectCode === code) {
          devWhatsAppState.verified = true;
          devWhatsAppState.connected = true;
          devWhatsAppState.connectCode = null;
          devWhatsAppState.connectExpiry = null;
          return NextResponse.json({
            connected: true,
            verified: true,
            message: "WhatsApp connected successfully!",
          });
        }

        return NextResponse.json({
          error: "Invalid code",
        }, { status: 400 });
      }
      throw dbError;
    }
  } catch (error) {
    console.error("Error verifying WhatsApp:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
