import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "@/lib/prisma";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

interface BusinessContext {
  businessId: string;
  businessName: string;
  businessType?: string | null;
  description?: string | null;
  operatingHours?: string | null;
  toneStyle: string;
  customInstructions?: string | null;
  signatureClosing?: string | null;
  includeContactInfo: boolean;
  contactPhone?: string | null;
  contactEmail?: string | null;
  includePromotion: boolean;
  promotionText?: string | null;
  replyExamples: { rating: number; reviewText: string; reply: string }[];
}

/**
 * Get business context for AI personalization
 */
async function getBusinessContext(businessId: string): Promise<BusinessContext | null> {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    include: {
      aiConfig: true,
      replyExamples: {
        orderBy: { createdAt: "desc" },
        take: 5, // Use last 5 examples for learning
      },
    },
  });

  if (!business) return null;

  return {
    businessId: business.id,
    businessName: business.name,
    businessType: business.aiConfig?.businessType,
    description: business.aiConfig?.description,
    operatingHours: business.aiConfig?.operatingHours,
    toneStyle: business.aiConfig?.toneStyle || "professional",
    customInstructions: business.aiConfig?.customInstructions,
    signatureClosing: business.aiConfig?.signatureClosing,
    includeContactInfo: business.aiConfig?.includeContactInfo || false,
    contactPhone: business.aiConfig?.contactPhone,
    contactEmail: business.aiConfig?.contactEmail,
    includePromotion: business.aiConfig?.includePromotion || false,
    promotionText: business.aiConfig?.promotionText,
    replyExamples: business.replyExamples.map((ex) => ({
      rating: ex.reviewRating,
      reviewText: ex.reviewText,
      reply: ex.finalReply,
    })),
  };
}

/**
 * Build personalized AI prompt based on business context
 */
function buildPersonalizedPrompt(
  context: BusinessContext,
  reviewText: string,
  rating: number,
  brandName: string
): string {
  let prompt = `You are a professional review response assistant for "${brandName}".

`;

  // Business context
  if (context.businessType) {
    prompt += `Business Type: ${context.businessType}\n`;
  }
  if (context.description) {
    prompt += `About the Business: ${context.description}\n`;
  }

  // Operating hours
  if (context.operatingHours) {
    try {
      const hours = JSON.parse(context.operatingHours);
      const today = new Date().toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
      const todayHours = hours[today];
      if (todayHours) {
        prompt += `Today's Hours: ${todayHours.open} - ${todayHours.close}\n`;
      }
      prompt += `Operating Hours: ${JSON.stringify(hours)}\n`;
    } catch {
      // Ignore parsing errors
    }
  }

  // Tone style
  prompt += `
Tone Style: ${context.toneStyle}
- professional: Courteous, business-appropriate language
- friendly: Warm and personable, like talking to a friend
- casual: Relaxed and conversational
- formal: Very polished and corporate

`;

  // Custom instructions from owner
  if (context.customInstructions) {
    prompt += `OWNER'S SPECIFIC INSTRUCTIONS (IMPORTANT - follow these carefully):
${context.customInstructions}

`;
  }

  // Learn from past replies
  if (context.replyExamples.length > 0) {
    prompt += `LEARN FROM THESE PREVIOUS APPROVED REPLIES (match this style):
`;
    context.replyExamples.forEach((ex, i) => {
      prompt += `
Example ${i + 1} (${ex.rating} stars):
Review: "${ex.reviewText.substring(0, 100)}${ex.reviewText.length > 100 ? "..." : ""}"
Owner's Approved Reply: "${ex.reply}"
`;
    });
    prompt += `
`;
  }

  // The actual review
  prompt += `NOW RESPOND TO THIS REVIEW:
Rating: ${rating}/5 stars
Review: "${reviewText}"

`;

  // Response guidelines
  prompt += `Guidelines:
1. Match the tone style specified above
2. For positive reviews (4-5 stars): Express genuine appreciation, mention something specific from their review if possible
3. For negative reviews (1-3 stars): Apologize sincerely, take responsibility, offer to resolve the issue
4. Keep it concise (2-4 sentences)
5. Be authentic, not generic
`;

  // Contact info
  if (context.includeContactInfo && (context.contactPhone || context.contactEmail)) {
    prompt += `6. For negative reviews, offer to help via: ${context.contactPhone || ""} ${context.contactEmail || ""}\n`;
  }

  // Promotion
  if (context.includePromotion && context.promotionText) {
    prompt += `7. For positive reviews, you may naturally mention: "${context.promotionText}"\n`;
  }

  // Signature
  if (context.signatureClosing) {
    prompt += `8. End with this signature: "${context.signatureClosing}"\n`;
  }

  prompt += `
Reply only with the response text, no explanations:`;

  return prompt;
}

/**
 * Generate AI reply for a review using Google Gemini (FREE)
 * This runs asynchronously and never blocks review ingestion
 */
export async function generateAiReply(
  reviewId: string,
  reviewText: string,
  rating: number,
  brandName: string,
  businessId?: string
): Promise<void> {
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.warn("GEMINI_API_KEY not configured, skipping AI reply generation");
      return;
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    let prompt: string;

    // Try to get business context for personalized prompt
    if (businessId) {
      const context = await getBusinessContext(businessId);
      if (context) {
        prompt = buildPersonalizedPrompt(context, reviewText, rating, brandName);
      } else {
        prompt = buildDefaultPrompt(reviewText, rating, brandName);
      }
    } else {
      prompt = buildDefaultPrompt(reviewText, rating, brandName);
    }

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const suggestedText = response.text().trim() || 
      "Thank you for your review. We appreciate your feedback and hope to serve you again.";

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
        details: JSON.stringify({ 
          suggestionLength: suggestedText.length,
          model: "gemini-1.5-flash",
          personalized: !!businessId
        }),
      },
    });

    console.log(`AI reply generated for review ${reviewId}`);
  } catch (error) {
    console.error(`AI reply generation failed for review ${reviewId}:`, error);
    
    // Log failure but don't throw - system continues without AI reply
    await prisma.auditLog.create({
      data: {
        event: "AI_REPLY_GENERATED",
        entityId: reviewId,
        details: JSON.stringify({ error: "Generation failed", message: String(error) }),
      },
    });
  }
}

/**
 * Default prompt for businesses without custom configuration
 */
function buildDefaultPrompt(reviewText: string, rating: number, brandName: string): string {
  return `You are a professional business manager responding to a Google review.
    
Business: ${brandName}
Rating: ${rating}/5 stars
Review: "${reviewText}"

Generate a professional, polite, and brand-safe reply that:
1. Thanks the reviewer
2. Addresses their feedback appropriately
3. For positive reviews (4-5 stars): express appreciation and invite them back
4. For negative reviews (1-3 stars): apologize sincerely, offer to help resolve the issue, and provide contact
5. Keep it concise (2-3 sentences)
6. Never make promises that cannot be kept
7. Be professional but warm in tone
8. Do not use generic phrases like "Dear valued customer"

Reply only with the response text, no explanations:`;
}

/**
 * Get AI reply for a review (if exists)
 */
export async function getAiReplyForReview(reviewId: string): Promise<string | null> {
  const aiReply = await prisma.aiReply.findUnique({
    where: { reviewId },
  });
  return aiReply?.suggestedText || null;
}

/**
 * Regenerate AI reply for a review
 */
export async function regenerateAiReply(
  reviewId: string,
  reviewText: string,
  rating: number,
  brandName: string,
  businessId?: string
): Promise<string | null> {
  try {
    // Delete existing AI reply if any
    await prisma.aiReply.deleteMany({
      where: { reviewId },
    });

    // Generate new reply
    await generateAiReply(reviewId, reviewText, rating, brandName, businessId);

    // Return the new reply
    return await getAiReplyForReview(reviewId);
  } catch (error) {
    console.error(`Failed to regenerate AI reply for ${reviewId}:`, error);
    return null;
  }
}

/**
 * Save a reply example for AI learning
 * Called when owner approves or edits a reply
 */
export async function saveReplyExample(
  businessId: string,
  reviewRating: number,
  reviewText: string,
  finalReply: string,
  wasEdited: boolean
): Promise<void> {
  try {
    // Check if business has learning enabled
    const config = await prisma.businessAiConfig.findUnique({
      where: { businessId },
    });

    // Only save if learning is enabled (default is true)
    if (config?.learnFromReplies === false) {
      return;
    }

    // Save the example
    await prisma.replyExample.create({
      data: {
        businessId,
        reviewRating,
        reviewText,
        finalReply,
        wasEdited,
      },
    });

    // Keep only the last 20 examples per business
    const examples = await prisma.replyExample.findMany({
      where: { businessId },
      orderBy: { createdAt: "desc" },
      skip: 20,
    });

    if (examples.length > 0) {
      await prisma.replyExample.deleteMany({
        where: {
          id: { in: examples.map((e) => e.id) },
        },
      });
    }

    console.log(`Saved reply example for business ${businessId} (edited: ${wasEdited})`);
  } catch (error) {
    console.error("Failed to save reply example:", error);
  }
}
