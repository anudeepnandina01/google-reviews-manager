import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { devWhatsAppState } from "@/lib/whatsapp-state";

const isDev = process.env.NODE_ENV === "development";

/**
 * POST /api/settings/whatsapp/verify
 * Check if WhatsApp connection has been verified (user sent code via WhatsApp)
 */
export async function POST() {
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
        },
      });

      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      // Check if user is now verified (code was sent via WhatsApp and processed)
      if (user.whatsappVerified && user.whatsappPhone) {
        return NextResponse.json({
          connected: true,
          verified: true,
          message: "WhatsApp connected successfully!",
        });
      }

      // Still pending
      if (user.whatsappConnectCode) {
        return NextResponse.json({
          connected: false,
          verified: false,
          message: "Waiting for you to send the code via WhatsApp. Please send the code shown above to our WhatsApp number.",
        });
      }

      return NextResponse.json({
        connected: false,
        verified: false,
        message: "No pending connection. Please click 'Connect WhatsApp' to generate a code.",
      });
    } catch (dbError) {
      if (isDev) {
        console.log("Database unreachable in dev mode, using mock WhatsApp verify");
        
        if (devWhatsAppState.verified && devWhatsAppState.phone) {
          return NextResponse.json({
            connected: true,
            verified: true,
            message: "WhatsApp connected successfully!",
          });
        }

        if (devWhatsAppState.connectCode) {
          return NextResponse.json({
            connected: false,
            verified: false,
            message: "Waiting for you to send the code via WhatsApp.",
          });
        }

        return NextResponse.json({
          connected: false,
          verified: false,
          message: "No pending connection.",
        });
      }
      throw dbError;
    }
  } catch (error) {
    console.error("Error verifying WhatsApp:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
