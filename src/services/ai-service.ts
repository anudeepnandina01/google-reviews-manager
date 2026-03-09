/**
 * Unified AI Service — Groq (primary) + Gemini (fallback)
 *
 * Groq (Llama 3.3 70B):  Free 14,400 req/day, 30 RPM, fastest inference
 * Gemini (2.0 Flash):    Free 1,500 req/day, 15 RPM
 *
 * Strategy: Try Groq first → if it fails, fall back to Gemini.
 * Both providers share the same prompt-building logic and DB operations.
 */

import Groq from "groq-sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "@/lib/prisma";

/* ── Provider clients (lazy-init to avoid errors if keys are missing) ── */

function getGroqClient(): Groq | null {
  if (!process.env.GROQ_API_KEY) return null;
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

function getGeminiModel() {
  if (!process.env.GEMINI_API_KEY) return null;
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
}

/* ── Types ─────────────────────────────────────────────────────────── */

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

interface AiResult {
  text: string;
  provider: "groq" | "gemini";
  model: string;
}

/* ── Business context (for personalized prompts) ───────────────────── */

async function getBusinessContext(
  businessId: string
): Promise<BusinessContext | null> {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    include: {
      aiConfig: true,
      replyExamples: {
        orderBy: { createdAt: "desc" },
        take: 5,
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

/* ── Prompt builders ───────────────────────────────────────────────── */

function buildPersonalizedPrompt(
  context: BusinessContext,
  reviewText: string,
  rating: number,
  brandName: string
): string {
  let prompt = `You are a professional review response assistant for "${brandName}".\n\n`;

  if (context.businessType) {
    prompt += `Business Type: ${context.businessType}\n`;
  }
  if (context.description) {
    prompt += `About the Business: ${context.description}\n`;
  }

  if (context.operatingHours) {
    try {
      const hours = JSON.parse(context.operatingHours);
      const today = new Date()
        .toLocaleDateString("en-US", { weekday: "long" })
        .toLowerCase();
      const todayHours = hours[today];
      if (todayHours) {
        prompt += `Today's Hours: ${todayHours.open} - ${todayHours.close}\n`;
      }
      prompt += `Operating Hours: ${JSON.stringify(hours)}\n`;
    } catch {
      // Ignore parsing errors
    }
  }

  prompt += `\nTone Style: ${context.toneStyle}
- professional: Courteous, business-appropriate language
- friendly: Warm and personable, like talking to a friend
- casual: Relaxed and conversational
- formal: Very polished and corporate\n\n`;

  if (context.customInstructions) {
    prompt += `OWNER'S SPECIFIC INSTRUCTIONS (IMPORTANT - follow these carefully):\n${context.customInstructions}\n\n`;
  }

  if (context.replyExamples.length > 0) {
    prompt += `LEARN FROM THESE PREVIOUS APPROVED REPLIES (match this style):\n`;
    context.replyExamples.forEach((ex, i) => {
      prompt += `\nExample ${i + 1} (${ex.rating} stars):\nReview: "${ex.reviewText.substring(0, 100)}${ex.reviewText.length > 100 ? "..." : ""}"\nOwner's Approved Reply: "${ex.reply}"\n`;
    });
    prompt += `\n`;
  }

  prompt += `NOW RESPOND TO THIS REVIEW:\nRating: ${rating}/5 stars\nReview: "${reviewText}"\n\n`;

  prompt += `Guidelines:
1. Match the tone style specified above
2. For positive reviews (4-5 stars): Express genuine appreciation, mention something specific from their review if possible
3. For negative reviews (1-3 stars): Apologize sincerely, take responsibility, offer to resolve the issue
4. Keep it concise (2-4 sentences)
5. Be authentic, not generic\n`;

  if (
    context.includeContactInfo &&
    (context.contactPhone || context.contactEmail)
  ) {
    prompt += `6. For negative reviews, offer to help via: ${context.contactPhone || ""} ${context.contactEmail || ""}\n`;
  }

  if (context.includePromotion && context.promotionText) {
    prompt += `7. For positive reviews, you may naturally mention: "${context.promotionText}"\n`;
  }

  if (context.signatureClosing) {
    prompt += `8. End with this signature: "${context.signatureClosing}"\n`;
  }

  prompt += `\nReply only with the response text, no explanations:`;
  return prompt;
}

function buildDefaultPrompt(
  reviewText: string,
  rating: number,
  brandName: string
): string {
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

/* ── Core: call Groq then Gemini as fallback ───────────────────────── */

async function callGroq(prompt: string): Promise<AiResult> {
  const client = getGroqClient();
  if (!client) throw new Error("GROQ_API_KEY not configured");

  const response = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
    max_tokens: 300,
  });

  const text = response.choices[0]?.message?.content?.trim();
  if (!text) throw new Error("Groq returned empty response");

  return { text, provider: "groq", model: "llama-3.3-70b-versatile" };
}

async function callGemini(prompt: string): Promise<AiResult> {
  const model = getGeminiModel();
  if (!model) throw new Error("GEMINI_API_KEY not configured");

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text().trim();
  if (!text) throw new Error("Gemini returned empty response");

  return { text, provider: "gemini", model: "gemini-2.0-flash" };
}

/**
 * Generate text using Groq (primary) → Gemini (fallback)
 * Returns the AI-generated text + which provider was used
 */
async function generateWithFallback(prompt: string): Promise<AiResult> {
  // Try Groq first
  try {
    return await callGroq(prompt);
  } catch (groqError) {
    console.warn("Groq failed, falling back to Gemini:", String(groqError));
  }

  // Fall back to Gemini
  try {
    return await callGemini(prompt);
  } catch (geminiError) {
    console.error("Gemini fallback also failed:", String(geminiError));
    throw new Error(
      `All AI providers failed. Groq error + Gemini error: ${String(geminiError)}`
    );
  }
}

/* ── Public API (same interface as the old gemini-ai.ts) ───────────── */

/**
 * Generate AI reply for a review
 * Tries Groq first, then Gemini. Never blocks review ingestion.
 */
export async function generateAiReply(
  reviewId: string,
  reviewText: string,
  rating: number,
  brandName: string,
  businessId?: string
): Promise<void> {
  try {
    // Build prompt (personalized if business context available)
    let prompt: string;
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

    // Call AI with fallback
    const result = await generateWithFallback(prompt);

    const suggestedText =
      result.text ||
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
          provider: result.provider,
          model: result.model,
          personalized: !!businessId,
        }),
      },
    });

    console.log(
      `AI reply generated for review ${reviewId} via ${result.provider} (${result.model})`
    );
  } catch (error) {
    console.error(`AI reply generation failed for review ${reviewId}:`, error);

    // Log failure but don't throw — system continues without AI reply
    await prisma.auditLog.create({
      data: {
        event: "AI_REPLY_GENERATED",
        entityId: reviewId,
        details: JSON.stringify({
          error: "Generation failed",
          message: String(error),
        }),
      },
    });
  }
}

/**
 * Get AI reply for a review (if exists)
 */
export async function getAiReplyForReview(
  reviewId: string
): Promise<string | null> {
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
    await prisma.aiReply.deleteMany({ where: { reviewId } });
    await generateAiReply(reviewId, reviewText, rating, brandName, businessId);
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
    const config = await prisma.businessAiConfig.findUnique({
      where: { businessId },
    });

    if (config?.learnFromReplies === false) return;

    await prisma.replyExample.create({
      data: { businessId, reviewRating, reviewText, finalReply, wasEdited },
    });

    // Keep only the last 20 examples per business
    const old = await prisma.replyExample.findMany({
      where: { businessId },
      orderBy: { createdAt: "desc" },
      skip: 20,
    });

    if (old.length > 0) {
      await prisma.replyExample.deleteMany({
        where: { id: { in: old.map((e) => e.id) } },
      });
    }

    console.log(
      `Saved reply example for business ${businessId} (edited: ${wasEdited})`
    );
  } catch (error) {
    console.error("Failed to save reply example:", error);
  }
}

/**
 * Test AI generation — for the /api/test/ai endpoint
 * Returns the reply text + provider info without saving to DB
 */
export async function testAiGeneration(
  reviewText: string,
  rating: number,
  businessName: string
): Promise<{ suggestedReply: string; provider: string; model: string }> {
  const prompt = buildDefaultPrompt(reviewText, rating, businessName);
  const result = await generateWithFallback(prompt);
  return {
    suggestedReply: result.text,
    provider: result.provider,
    model: result.model,
  };
}
