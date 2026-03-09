import { config } from "dotenv";
config({ path: ".env.local" });

import Groq from "groq-sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";

const reviewText = `Absolutely terrible experience. We ordered the butter chicken and it was completely tasteless, cold, and seemed like it was reheated from yesterday. The naan bread was hard as a rock. For the prices they charge, this is unacceptable. The waiter was also rude and took 45 minutes to bring our food. Never coming back.`;

const prompt = `You are a professional business manager responding to a Google review.
    
Business: Spice Garden Indian Restaurant
Rating: 1/5 stars
Review: "${reviewText}"

Generate a professional, polite, and brand-safe reply that:
1. Thanks the reviewer
2. Addresses their feedback appropriately
3. For negative reviews (1-3 stars): apologize sincerely, offer to help resolve the issue, and provide contact
4. Keep it concise (2-3 sentences)
5. Never make promises that cannot be kept
6. Be professional but warm in tone
7. Do not use generic phrases like "Dear valued customer"

Reply only with the response text, no explanations:`;

console.log("━".repeat(60));
console.log("📝 REVIEW (1⭐):");
console.log(reviewText);
console.log("━".repeat(60));

let reply, provider, model;

// Try Groq first
try {
  if (!process.env.GROQ_API_KEY) throw new Error("GROQ_API_KEY not set");
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
    max_tokens: 300,
  });
  reply = response.choices[0]?.message?.content?.trim();
  provider = "Groq";
  model = "llama-3.3-70b-versatile";
} catch (groqErr) {
  console.log(`\n⚠️  Groq failed: ${groqErr.message}`);
  console.log("   Falling back to Gemini...\n");

  // Fallback to Gemini
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const gemModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  const result = await gemModel.generateContent(prompt);
  reply = result.response.text().trim();
  provider = "Gemini";
  model = "gemini-2.0-flash";
}

console.log(`\n🤖 AI SUGGESTED REPLY (via ${provider} — ${model}):`);
console.log("━".repeat(60));
console.log(reply);
console.log("━".repeat(60));
