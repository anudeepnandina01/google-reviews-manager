import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getSession } from "@/lib/session";

/**
 * POST /api/test/gemini
 * Test Gemini AI with a sample review
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { reviewText, rating, businessName } = await request.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY not configured" },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `You are a professional business manager responding to a Google review.
    
Business: ${businessName || "Sample Business"}
Rating: ${rating || 5}/5 stars
Review: "${reviewText || "Great service!"}"

Generate a professional, polite reply (2-3 sentences). Reply only with the response text:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const suggestedReply = response.text().trim();

    return NextResponse.json({
      success: true,
      suggestedReply,
      model: "gemini-1.5-flash",
    });
  } catch (error) {
    console.error("Gemini test error:", error);
    return NextResponse.json(
      { error: "Gemini API error", details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * GET /api/test/gemini
 * Check if Gemini is configured
 */
export async function GET() {
  const configured = !!process.env.GEMINI_API_KEY;
  return NextResponse.json({
    configured,
    model: "gemini-1.5-flash",
  });
}
