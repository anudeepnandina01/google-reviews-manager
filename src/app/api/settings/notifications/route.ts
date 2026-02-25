import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

const isDev = process.env.NODE_ENV === "development";

// Dev mode state
let devPreferences = {
  notificationPreference: "both" as string,
  telegramEnabled: true,
  whatsappEnabled: true,
};

/**
 * GET /api/settings/notifications
 * Get notification preferences
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
          notificationPreference: true,
          telegramEnabled: true,
          telegramChatId: true,
          whatsappEnabled: true,
          whatsappPhone: true,
          whatsappVerified: true,
        },
      });

      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      return NextResponse.json({
        preference: user.notificationPreference,
        telegram: {
          enabled: user.telegramEnabled,
          connected: !!user.telegramChatId,
        },
        whatsapp: {
          enabled: user.whatsappEnabled,
          connected: !!user.whatsappPhone && user.whatsappVerified,
        },
      });
    } catch (dbError) {
      if (isDev) {
        console.log("Database unreachable in dev mode, using mock notification preferences");
        return NextResponse.json({
          preference: devPreferences.notificationPreference,
          telegram: {
            enabled: devPreferences.telegramEnabled,
            connected: false,
          },
          whatsapp: {
            enabled: devPreferences.whatsappEnabled,
            connected: false,
          },
        });
      }
      throw dbError;
    }
  } catch (error) {
    console.error("Error fetching notification preferences:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PUT /api/settings/notifications
 * Update notification preferences
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { preference, telegramEnabled, whatsappEnabled } = body;

    // Validate preference value
    const validPreferences = ["telegram", "whatsapp", "both", "none"];
    if (preference && !validPreferences.includes(preference)) {
      return NextResponse.json({ 
        error: "Invalid preference. Must be: telegram, whatsapp, both, or none" 
      }, { status: 400 });
    }

    const updateData: any = {};
    if (preference !== undefined) updateData.notificationPreference = preference;
    if (telegramEnabled !== undefined) updateData.telegramEnabled = telegramEnabled;
    if (whatsappEnabled !== undefined) updateData.whatsappEnabled = whatsappEnabled;

    try {
      const user = await prisma.user.update({
        where: { id: session.userId },
        data: updateData,
        select: {
          notificationPreference: true,
          telegramEnabled: true,
          whatsappEnabled: true,
        },
      });

      return NextResponse.json({
        success: true,
        preference: user.notificationPreference,
        telegramEnabled: user.telegramEnabled,
        whatsappEnabled: user.whatsappEnabled,
      });
    } catch (dbError) {
      if (isDev) {
        console.log("Database unreachable in dev mode, updating mock notification preferences");
        if (preference !== undefined) devPreferences.notificationPreference = preference;
        if (telegramEnabled !== undefined) devPreferences.telegramEnabled = telegramEnabled;
        if (whatsappEnabled !== undefined) devPreferences.whatsappEnabled = whatsappEnabled;
        
        return NextResponse.json({
          success: true,
          ...devPreferences,
        });
      }
      throw dbError;
    }
  } catch (error) {
    console.error("Error updating notification preferences:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
