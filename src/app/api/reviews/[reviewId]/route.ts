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

      // Batch: approve → mark sent → audit log in single transaction
      await prisma.$transaction([
        prisma.aiReply.update({
          where: { id: review.aiReply.id },
          data: {
            status: AiReplyStatus.SENT,
            sentText: replyText,
            approvedAt: new Date(),
            sentAt: new Date(),
          },
        }),
        prisma.auditLog.create({
          data: {
            event: "REPLY_SENT",
            entityId: reviewId,
            details: JSON.stringify({ textLength: replyText.length }),
          },
        }),
      ]);

      // TODO: Post reply to Google Business API
      // await postReplyToGoogle(review, replyText);

      return NextResponse.json({ success: true, status: "SENT" });
    } else if (action === "skip") {
      // Batch: skip + audit log in single transaction
      const txOps = [];
      if (review.aiReply) {
        txOps.push(
          prisma.aiReply.update({
            where: { id: review.aiReply.id },
            data: {
              status: AiReplyStatus.SKIPPED,
              skippedAt: new Date(),
            },
          })
        );
      }
      txOps.push(
        prisma.auditLog.create({
          data: {
            event: "REPLY_SKIPPED",
            entityId: reviewId,
            details: JSON.stringify({}),
          },
        })
      );
      await prisma.$transaction(txOps);

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
