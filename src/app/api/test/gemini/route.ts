import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { testAiGeneration } from "@/services/ai-service";

/**
 * POST /api/test/gemini
 * Test AI reply generation (Groq primary → Gemini fallback)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { reviewText, rating, businessName } = await request.json();

    const result = await testAiGeneration(
      reviewText || "Great service!",
      rating || 5,
      businessName || "Sample Business"
    );

    return NextResponse.json({
      success: true,
      suggestedReply: result.suggestedReply,
      provider: result.provider,
      model: result.model,
    });
  } catch (error) {
    console.error("AI test error:", error);
    return NextResponse.json(
      { error: "AI generation failed", details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * GET /api/test/gemini
 * Check which AI providers are configured
 */
export async function GET() {
  const groqConfigured = !!process.env.GROQ_API_KEY;
  const geminiConfigured = !!process.env.GEMINI_API_KEY;

  return NextResponse.json({
    groq: { configured: groqConfigured, model: "llama-3.3-70b-versatile" },
    gemini: { configured: geminiConfigured, model: "gemini-2.0-flash" },
    primary: groqConfigured ? "groq" : geminiConfigured ? "gemini" : "none",
  });
}
