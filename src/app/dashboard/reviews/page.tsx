"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { DashboardLayout } from "@/components/layout";

interface Review {
  id: string;
  externalId: string;
  authorName: string;
  authorEmail: string | null;
  authorPhotoUrl: string | null;
  rating: number;
  text: string;
  source: string;
  reviewedAt: string;
  location: {
    id: string;
    name: string;
  };
  aiReply: {
    id: string;
    suggestedText: string;
    status: string;
  } | null;
}

function ReviewsLoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center animate-fade-in">
        <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-white/60">Loading reviews...</p>
      </div>
    </div>
  );
}

export default function ReviewsPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={<ReviewsLoadingFallback />}>
        <ReviewsContent />
      </Suspense>
    </DashboardLayout>
  );
}

function ReviewsContent() {
  const searchParams = useSearchParams();
  const businessId = searchParams.get("businessId");
  
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const url = businessId 
          ? `/api/reviews?businessId=${businessId}` 
          : "/api/reviews";
        const res = await fetch(url);
        
        if (res.ok) {
          const data = await res.json();
          setReviews(data.reviews || []);
        } else {
          setError("Failed to fetch reviews");
        }
      } catch (err) {
        console.error("Error fetching reviews:", err);
        setError("Failed to fetch reviews");
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, [businessId]);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PENDING_APPROVAL: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
      APPROVED: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
      SENT: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
      SKIPPED: "bg-white/10 text-white/60 border border-white/20",
    };
    return styles[status] || "bg-white/10 text-white/60";
  };

  const getReplyStatus = (review: Review) => {
    return review.aiReply?.status || "NO_REPLY";
  };

  const filteredReviews = reviews.filter((review) => {
    if (filter === "all") return true;
    if (filter === "pending") return getReplyStatus(review) === "PENDING_APPROVAL";
    if (filter === "positive") return review.rating >= 4;
    if (filter === "negative") return review.rating <= 2;
    return true;
  });

  const stats = {
    total: reviews.length,
    pending: reviews.filter((r) => getReplyStatus(r) === "PENDING_APPROVAL").length,
    avgRating: reviews.length > 0 
      ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
      : "0.0",
  };

  if (loading) {
    return <ReviewsLoadingFallback />;
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="mb-8 animate-fade-in">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Customer Reviews</h1>
        <p className="text-white/60">Manage and respond to your Google reviews</p>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-8 animate-slide-up">
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-violet-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-violet-400" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-bold text-white">{stats.total}</p>
              <p className="text-white/50 text-xs sm:text-sm">Total Reviews</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-amber-400" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-bold text-white">{stats.pending}</p>
              <p className="text-white/50 text-xs sm:text-sm">Pending Reply</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-emerald-400" width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-bold text-white">{stats.avgRating}</p>
              <p className="text-white/50 text-xs sm:text-sm">Avg Rating</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6 animate-slide-up">
        {[
          { key: "all", label: "All Reviews" },
          { key: "pending", label: "Pending" },
          { key: "positive", label: "Positive (4-5★)" },
          { key: "negative", label: "Negative (1-2★)" },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
              filter === f.key
                ? "bg-violet-500/20 text-violet-300 border border-violet-500/30"
                : "bg-white/5 text-white/60 border border-white/10 hover:bg-white/10 hover:text-white"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500/30 text-red-300 px-4 py-3 rounded-xl mb-6 animate-fade-in">
          {error}
        </div>
      )}

      {filteredReviews.length === 0 ? (
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 sm:p-12 text-center animate-scale-in">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-violet-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 sm:w-10 sm:h-10 text-violet-400" width="40" height="40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h2 className="text-lg sm:text-xl font-semibold text-white mb-2">
            {filter === "all" ? "No reviews yet" : "No matching reviews"}
          </h2>
          <p className="text-white/60 mb-4 max-w-md mx-auto text-sm sm:text-base">
            {filter === "all"
              ? "Reviews from Google Business Profile will appear here once they are synced."
              : "Try adjusting your filter to see more reviews."}
          </p>
          {filter !== "all" && (
            <button
              onClick={() => setFilter("all")}
              className="text-violet-400 hover:text-violet-300 font-medium"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReviews.map((review, index) => (
            <div
              key={review.id}
              className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 sm:p-6 hover:bg-white/[0.07] transition-all animate-slide-up"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex items-center gap-3 sm:gap-4">
                  {review.authorPhotoUrl ? (
                    <img
                      src={review.authorPhotoUrl}
                      alt={review.authorName || "Reviewer"}
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-full ring-2 ring-white/20 object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center ring-2 ring-white/20 flex-shrink-0">
                      <span className="text-white font-semibold text-base sm:text-lg">
                        {review.authorName?.charAt(0)?.toUpperCase() || "?"}
                      </span>
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-white truncate">
                      {review.authorName || "Anonymous"}
                    </p>
                    <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs sm:text-sm text-white/50">
                      <span>
                        {new Date(review.reviewedAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      {review.location && (
                        <>
                          <span>•</span>
                          <span className="truncate max-w-[120px] sm:max-w-none">{review.location.name}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <svg
                        key={i}
                        className={`w-4 h-4 sm:w-5 sm:h-5 ${i < review.rating ? "text-amber-400" : "text-white/20"}`}
                        width="20"
                        height="20"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(getReplyStatus(review))}`}>
                    {getReplyStatus(review).replace("_", " ")}
                  </span>
                </div>
              </div>

              {review.text && (
                <p className="mt-4 text-white/80 leading-relaxed text-sm sm:text-base">{review.text}</p>
              )}

              {review.aiReply && (
                <div className="mt-5 bg-violet-500/10 border border-violet-500/20 rounded-xl p-4 sm:p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 bg-gradient-to-br from-violet-500 to-purple-600 rounded-md flex items-center justify-center">
                      <span className="text-xs text-white font-medium">AI</span>
                    </div>
                    <p className="text-sm font-medium text-violet-300">
                      AI Suggested Reply
                    </p>
                  </div>
                  <p className="text-white/70 text-sm leading-relaxed">{review.aiReply.suggestedText}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button 
                      disabled={actionLoading === review.id}
                      className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all disabled:opacity-50"
                    >
                      <svg className="w-4 h-4" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Approve & Post
                    </button>
                    <button className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all">
                      <svg className="w-4 h-4" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit
                    </button>
                    <button className="text-white/50 hover:text-white/80 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-all">
                      Skip
                    </button>
                  </div>
                </div>
              )}

              {!review.aiReply && getReplyStatus(review) === "PENDING" && (
                <div className="mt-5 bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-sm text-amber-300">
                      AI is generating a reply suggestion...
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
