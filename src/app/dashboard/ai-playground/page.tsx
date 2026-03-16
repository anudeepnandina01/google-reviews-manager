"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout";

const SAMPLE_REVIEWS = [
  {
    label: "🍽️ Bad food (1★)",
    text: "Absolutely terrible experience. The butter chicken was tasteless and cold, seemed reheated from yesterday. The naan was hard as a rock. Waiter was rude and took 45 minutes. Never coming back.",
    rating: 1,
    business: "Spice Garden Indian Restaurant",
  },
  {
    label: "😐 Average service (3★)",
    text: "Food was okay but nothing special. Service was slow, had to wait 30 minutes for our order. The ambiance is nice though. Might give it another try.",
    rating: 3,
    business: "Cafe Delight",
  },
  {
    label: "⭐ Great experience (5★)",
    text: "Amazing food and wonderful service! The staff was so friendly and attentive. The biryani was the best I've ever had. Will definitely be coming back with family!",
    rating: 5,
    business: "Royal Kitchen",
  },
  {
    label: "💇 Bad salon (1★)",
    text: "Worst haircut of my life. I showed them a picture and they did the complete opposite. The stylist was on their phone the entire time. Charged me double what they quoted.",
    rating: 1,
    business: "Glamour Hair Studio",
  },
  {
    label: "🏨 Hotel complaint (2★)",
    text: "Room was dirty, AC wasn't working, and the bathroom had no hot water. Front desk was unhelpful. For the price we paid, this is completely unacceptable.",
    rating: 2,
    business: "Sunrise Hotel & Spa",
  },
  {
    label: "🛒 Good retail (4★)",
    text: "Great selection of products and reasonable prices. Staff was helpful in finding what I needed. Only giving 4 stars because the billing queue was too long.",
    rating: 4,
    business: "MegaMart Superstore",
  },
];

export default function AiPlaygroundPage() {
  const [reviewText, setReviewText] = useState("");
  const [rating, setRating] = useState(1);
  const [businessName, setBusinessName] = useState("Test Business");
  const [aiReply, setAiReply] = useState("");
  const [provider, setProvider] = useState("");
  const [model, setModel] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [responseTime, setResponseTime] = useState(0);
  const [history, setHistory] = useState<
    Array<{
      review: string;
      rating: number;
      business: string;
      reply: string;
      provider: string;
      model: string;
      time: number;
    }>
  >([]);

  const handleTest = async () => {
    if (!reviewText.trim()) {
      setError("Please enter a review text");
      return;
    }

    setLoading(true);
    setError("");
    setAiReply("");
    setProvider("");
    setModel("");

    const start = Date.now();

    try {
      const res = await fetch("/api/test/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewText, rating, businessName }),
      });

      const data = await res.json();
      const elapsed = Date.now() - start;
      setResponseTime(elapsed);

      if (!res.ok) {
        setError(data.error || "AI generation failed");
        return;
      }

      setAiReply(data.suggestedReply);
      setProvider(data.provider);
      setModel(data.model);

      // Add to history
      setHistory((prev) => [
        {
          review: reviewText,
          rating,
          business: businessName,
          reply: data.suggestedReply,
          provider: data.provider,
          model: data.model,
          time: elapsed,
        },
        ...prev,
      ]);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const loadSample = (sample: (typeof SAMPLE_REVIEWS)[number]) => {
    setReviewText(sample.text);
    setRating(sample.rating);
    setBusinessName(sample.business);
    setError("");
    setAiReply("");
  };

  const getRatingColor = (r: number) => {
    if (r <= 2) return "text-red-400";
    if (r === 3) return "text-yellow-400";
    return "text-green-400";
  };

  const getRatingBg = (r: number) => {
    if (r <= 2) return "bg-red-500/10 border-red-500/30";
    if (r === 3) return "bg-yellow-500/10 border-yellow-500/30";
    return "bg-green-500/10 border-green-500/30";
  };

  return (
    <DashboardLayout>
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <span className="text-3xl">🧪</span> AI Playground
        </h1>
        <p className="text-white/60 mt-1">
          Test how the AI responds to different reviews. Enter any review text, select a rating, and see the generated reply.
        </p>
      </div>

      {/* Sample Reviews */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <h3 className="text-sm font-medium text-white/50 mb-3 uppercase tracking-wider">
          Quick Samples — click to load
        </h3>
        <div className="flex flex-wrap gap-2">
          {SAMPLE_REVIEWS.map((sample, i) => (
            <button
              key={i}
              onClick={() => loadSample(sample)}
              className="px-3 py-1.5 text-sm bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-lg text-white/80 transition-all"
            >
              {sample.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Panel */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-5">
          <h2 className="text-lg font-semibold text-white">📝 Review Input</h2>

          {/* Business Name */}
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1.5">
              Business Name
            </label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
              placeholder="e.g., Spice Garden Restaurant"
            />
          </div>

          {/* Star Rating */}
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1.5">
              Rating
            </label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className={`text-3xl transition-all ${
                    star <= rating
                      ? "text-yellow-400 scale-110"
                      : "text-white/20 hover:text-white/40"
                  }`}
                >
                  ★
                </button>
              ))}
              <span className={`ml-3 text-lg font-bold ${getRatingColor(rating)}`}>
                {rating}/5
              </span>
            </div>
          </div>

          {/* Review Text */}
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1.5">
              Review Text
            </label>
            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              rows={5}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 resize-none"
              placeholder="Type a review or click a sample above..."
            />
            <div className="text-xs text-white/30 mt-1">
              {reviewText.length} characters
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleTest}
            disabled={loading || !reviewText.trim()}
            className={`w-full py-3 rounded-lg font-semibold text-white transition-all flex items-center justify-center gap-2 ${
              loading || !reviewText.trim()
                ? "bg-blue-600/30 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 active:scale-[0.98]"
            }`}
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Generating...
              </>
            ) : (
              <>
                <span>🤖</span> Generate AI Reply
              </>
            )}
          </button>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
              ❌ {error}
            </div>
          )}
        </div>

        {/* Output Panel */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-5">
          <h2 className="text-lg font-semibold text-white">🤖 AI Response</h2>

          {!aiReply && !loading && (
            <div className="flex flex-col items-center justify-center py-16 text-white/30">
              <span className="text-5xl mb-3">💬</span>
              <p className="text-center">
                Enter a review and click &quot;Generate AI Reply&quot; to see the response
              </p>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="animate-pulse flex flex-col items-center gap-3">
                <span className="text-5xl">🧠</span>
                <p className="text-white/50">AI is thinking...</p>
              </div>
            </div>
          )}

          {aiReply && (
            <>
              {/* Rating badge */}
              <div
                className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-sm ${getRatingBg(rating)}`}
              >
                <span className={getRatingColor(rating)}>
                  {"★".repeat(rating)}{"☆".repeat(5 - rating)}
                </span>
                <span className="text-white/60">{rating}/5 review</span>
              </div>

              {/* AI Reply */}
              <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                <p className="text-white leading-relaxed whitespace-pre-wrap">
                  {aiReply}
                </p>
              </div>

              {/* Meta info */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <div className="text-xs text-white/40 uppercase">Provider</div>
                  <div className="text-sm font-semibold text-white mt-0.5">
                    {provider}
                  </div>
                </div>
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <div className="text-xs text-white/40 uppercase">Model</div>
                  <div className="text-sm font-semibold text-white mt-0.5 truncate">
                    {model}
                  </div>
                </div>
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <div className="text-xs text-white/40 uppercase">Time</div>
                  <div className="text-sm font-semibold text-white mt-0.5">
                    {(responseTime / 1000).toFixed(1)}s
                  </div>
                </div>
              </div>

              {/* Copy button */}
              <button
                onClick={() => navigator.clipboard.writeText(aiReply)}
                className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white/70 text-sm transition-all"
              >
                📋 Copy Reply
              </button>
            </>
          )}
        </div>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">📜 Test History</h2>
            <button
              onClick={() => setHistory([])}
              className="text-xs text-white/40 hover:text-white/60 transition-all"
            >
              Clear
            </button>
          </div>

          <div className="space-y-4">
            {history.map((item, i) => (
              <div
                key={i}
                className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm ${getRatingColor(item.rating)}`}>
                      {"★".repeat(item.rating)}{"☆".repeat(5 - item.rating)}
                    </span>
                    <span className="text-xs text-white/40">
                      {item.business}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-white/40">
                    <span>{item.provider}</span>
                    <span>•</span>
                    <span>{(item.time / 1000).toFixed(1)}s</span>
                  </div>
                </div>
                <p className="text-sm text-white/50 line-clamp-2">
                  &quot;{item.review}&quot;
                </p>
                <p className="text-sm text-white/80 italic">
                  → {item.reply}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
    </DashboardLayout>
  );
}
