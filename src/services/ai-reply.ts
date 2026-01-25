import { prisma } from "@/lib/prisma";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generate AI reply for a review
 * This runs asynchronously and never blocks review ingestion
 */
export async function generateAiReply(
  reviewId: string,
  reviewText: string,
  rating: number,
  brandName: string
): Promise<void> {
  try {
    const prompt = `You are a professional business manager responding to a Google review.
    
Business: ${brandName}
Rating: ${rating}/5 stars
Review: "${reviewText}"

Generate a professional, polite, and brand-safe reply that:
1. Thanks the reviewer
2. Addresses their feedback appropriately
3. For positive reviews: express appreciation and invite them back
4. For negative reviews: apologize, offer to help resolve, and provide contact
5. Keeps it concise (2-3 sentences)
6. Never makes promises that cannot be kept
7. Is professional but warm in tone

Reply:`;

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 150,
    });

    const suggestedText =
      response.choices[0]?.message?.content?.trim() ||
      "Thank you for your review. We appreciate your feedback.";

    // Store AI reply with PENDING_APPROVAL status
    await prisma.aiReply.create({
      data: {
        reviewId,
        suggestedText,
      },
    });

    // Log event
    await prisma.auditLog.create({
      data: {
        event: "AI_REPLY_GENERATED",
        entityId: reviewId,
        details: JSON.stringify({ suggestionLength: suggestedText.length }),
      },
    });
  } catch (error) {
    console.error(`AI reply generation failed for review ${reviewId}:`, error);
    // Fail gracefully - system continues without AI reply
    // Log failure but don't throw
    await prisma.auditLog.create({
      data: {
        event: "AI_REPLY_GENERATED",
        entityId: reviewId,
        details: JSON.stringify({ error: "Generation failed" }),
      },
    });
  }
}

/**
 * Generate suggested reply for owner approval
 */
export async function generateReplyForApproval(
  reviewId: string
): Promise<string | null> {
  const aiReply = await prisma.aiReply.findUnique({
    where: { reviewId },
  });

  return aiReply?.suggestedText || null;
}
