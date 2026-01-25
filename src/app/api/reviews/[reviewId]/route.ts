import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AiReplyStatus } from "@prisma/client";

type Params = { params: Promise<{ reviewId: string }> };

/**
 * POST /api/reviews/:reviewId/approve
 * Owner approves AI-generated reply and triggers posting to Google
 */
export async function POST(
  request: NextRequest,
  { params }: Params
) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { reviewId } = await params;
    const { action, customReplyText } = await request.json();

    if (!["approve", "skip"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    // Get review and verify ownership
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        business: { include: { user: true } },
        aiReply: true,
      },
    });

    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    if (review.business.user.id !== session.userId) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    if (action === "approve") {
      if (!review.aiReply) {
        return NextResponse.json(
          { error: "No AI reply to approve" },
          { status: 400 }
        );
      }

      const replyText = customReplyText || review.aiReply.suggestedText;

      // Update AI reply status
      await prisma.aiReply.update({
        where: { id: review.aiReply.id },
        data: {
          status: AiReplyStatus.APPROVED,
          sentText: replyText,
          approvedAt: new Date(),
        },
      });

      // TODO: Post reply to Google Business API
      // await postReplyToGoogle(review, replyText);

      // Update status to SENT
      await prisma.aiReply.update({
        where: { id: review.aiReply.id },
        data: {
          status: AiReplyStatus.SENT,
          sentAt: new Date(),
        },
      });

      // Log event
      await prisma.auditLog.create({
        data: {
          event: "REPLY_SENT",
          entityId: reviewId,
          details: JSON.stringify({ textLength: replyText.length }),
        },
      });

      return NextResponse.json({ success: true, status: "SENT" });
    } else if (action === "skip") {
      if (review.aiReply) {
        await prisma.aiReply.update({
          where: { id: review.aiReply.id },
          data: {
            status: AiReplyStatus.SKIPPED,
            skippedAt: new Date(),
          },
        });
      }

      // Log event
      await prisma.auditLog.create({
        data: {
          event: "REPLY_SKIPPED",
          entityId: reviewId,
          details: JSON.stringify({}),
        },
      });

      return NextResponse.json({ success: true, status: "SKIPPED" });
    }
  } catch (error) {
    console.error("Error in review approval:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/reviews/:reviewId
 * Get review details with AI reply
 */
export async function GET(
  _request: NextRequest,
  { params }: Params
) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { reviewId } = await params;
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        business: { include: { user: true } },
        aiReply: true,
        location: { include: { brand: true } },
      },
    });

    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    if (review.business.user.id !== session.userId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    return NextResponse.json(review);
  } catch (error) {
    console.error("Error fetching review:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
