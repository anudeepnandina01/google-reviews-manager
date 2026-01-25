import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleWhatsAppWebhook } from "@/services/whatsapp";

/**
 * POST /api/webhooks/whatsapp
 * Receive WhatsApp delivery status updates
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    await handleWhatsAppWebhook(payload);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error handling WhatsApp webhook:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

/**
 * GET /api/webhooks/whatsapp
 * Webhook verification from WhatsApp
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (
    mode === "subscribe" &&
    token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN
  ) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
}
