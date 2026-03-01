"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout";

interface User {
  id: string;
  email: string;
  name: string;
  image: string | null;
}

interface SetupStatus {
  notifications: boolean;
  google: boolean;
  businesses: boolean;
}

interface Review {
  id: string;
  reviewerName: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  location?: { name: string } | null;
  aiReply?: { status: string; replyText: string } | null;
}

function DashboardContent() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [setup, setSetup] = useState<SetupStatus>({ notifications: false, google: false, businesses: false });
  const [reviewCount, setReviewCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [businessCount, setBusinessCount] = useState(0);
  const [recentReviews, setRecentReviews] = useState<Review[]>([]);

  useEffect(() => {
    const init = async () => {
      try {
        const [userRes, bizRes, telegramRes, whatsappRes, googleRes, reviewsRes, pendingRes] = await Promise.all([
          fetch("/api/auth/me"),
          fetch("/api/businesses"),
          fetch("/api/settings/telegram"),
          fetch("/api/settings/whatsapp"),
          fetch("/api/auth/google-business/status"),
          fetch("/api/reviews?limit=5"),
          fetch("/api/reviews?status=pending&limit=100"),
        ]);

        if (userRes.ok) {
          const data = await userRes.json();
          setUser(data.user);
        }

        if (bizRes.ok) {
          const businesses = await bizRes.json();
          setBusinessCount(businesses.length);
          setSetup(prev => ({ ...prev, businesses: businesses.length > 0 }));
        }

        const telegramData = telegramRes.ok ? await telegramRes.json() : { connected: false };
        const whatsappData = whatsappRes.ok ? await whatsappRes.json() : { connected: false };
        const googleData = googleRes.ok ? await googleRes.json() : { connected: false };

        setSetup(prev => ({
          ...prev,
          notifications: telegramData.connected || whatsappData.connected,
          google: googleData.connected,
        }));

        if (reviewsRes.ok) {
          const data = await reviewsRes.json();
          setReviewCount(data.pagination?.total || 0);
          setRecentReviews(data.reviews || []);
        }

        if (pendingRes.ok) {
          const data = await pendingRes.json();
          setPendingCount(data.reviews?.length || 0);
        }
      } catch (error) {
        console.error("Error loading dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  const completedSteps = Object.values(setup).filter(Boolean).length;
  const totalSteps = 3;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center animate-fade-in">
          <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/60">Loading...</p>
        </div>
      </div>
    );
  }

  const renderStars = (rating: number) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`w-3.5 h-3.5 ${star <= rating ? "text-amber-400" : "text-white/15"}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto">
      {/* Welcome */}
      <div className="mb-8 animate-fade-in">
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
          Welcome{user?.name ? `, ${user.name.split(" ")[0]}` : ""}! 👋
        </h1>
        <p className="text-white/50 text-lg">Here&apos;s what&apos;s happening with your reviews</p>
      </div>

      {/* Setup Progress - only show if incomplete */}
      {completedSteps < totalSteps && (
        <div className="mb-8 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5 animate-slide-up">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h2 className="text-sm font-semibold text-white/80">Getting Started</h2>
            </div>
            <span className="text-xs text-white/50">{completedSteps}/{totalSteps} complete</span>
          </div>
          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mb-4">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all duration-500"
              style={{ width: `${(completedSteps / totalSteps) * 100}%` }}
            />
          </div>
          <div className="flex flex-wrap gap-3">
            {[
              { done: setup.notifications, label: "Connect Notifications", href: "/dashboard/settings/notifications", doneLabel: "Notifications Connected" },
              { done: setup.google, label: "Connect Google Business", href: "/dashboard/settings/google", doneLabel: "Google Connected" },
              { done: setup.businesses, label: "Add a Business", href: "/dashboard/businesses", doneLabel: "Business Added" },
            ].map((step) => (
              <Link
                key={step.label}
                href={step.href}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  step.done
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30"
                    : "bg-white/5 text-white/60 border border-white/10 hover:bg-white/10 hover:text-white"
                }`}
              >
                {step.done ? (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-white/30" />
                )}
                {step.done ? step.doneLabel : step.label}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5 animate-slide-up">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-violet-500/20 rounded-lg flex items-center justify-center">
              <svg className="w-4.5 h-4.5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <p className="text-white/40 text-xs font-medium uppercase tracking-wider">Businesses</p>
          </div>
          <p className="text-3xl font-bold text-white">{businessCount}</p>
        </div>
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5 animate-slide-up" style={{ animationDelay: "0.05s" }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-amber-500/20 rounded-lg flex items-center justify-center">
              <svg className="w-4.5 h-4.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </div>
            <p className="text-white/40 text-xs font-medium uppercase tracking-wider">Reviews</p>
          </div>
          <p className="text-3xl font-bold text-white">{reviewCount}</p>
        </div>
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5 animate-slide-up" style={{ animationDelay: "0.1s" }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-orange-500/20 rounded-lg flex items-center justify-center">
              <svg className="w-4.5 h-4.5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-white/40 text-xs font-medium uppercase tracking-wider">Pending</p>
          </div>
          <p className="text-3xl font-bold text-white">
            {pendingCount}
            {pendingCount > 0 && (
              <Link href="/dashboard/reviews?status=pending" className="text-xs text-orange-400 font-medium ml-2 hover:text-orange-300 transition-colors">
                Review →
              </Link>
            )}
          </p>
        </div>
      </div>

      {/* Recent Reviews */}
      <div className="animate-slide-up" style={{ animationDelay: "0.15s" }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Recent Reviews</h2>
          {reviewCount > 0 && (
            <Link href="/dashboard/reviews" className="text-sm text-violet-400 hover:text-violet-300 transition-colors">
              View all →
            </Link>
          )}
        </div>

        {recentReviews.length === 0 ? (
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 text-center">
            <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </div>
            <p className="text-white/50 text-sm mb-1">No reviews yet</p>
            <p className="text-white/30 text-xs">
              {setup.google
                ? "Reviews will appear here once synced from Google"
                : "Connect Google Business to start syncing reviews"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentReviews.map((review) => (
              <Link
                key={review.id}
                href={`/dashboard/reviews`}
                className="group flex items-start gap-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 hover:bg-white/[0.07] hover:border-white/15 transition-all"
              >
                {/* Avatar */}
                <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs font-bold">{review.reviewerName?.charAt(0)?.toUpperCase() || "?"}</span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white text-sm font-medium truncate">{review.reviewerName}</span>
                    {renderStars(review.rating)}
                    {review.aiReply?.status === "PENDING_APPROVAL" && (
                      <span className="px-1.5 py-0.5 bg-orange-500/20 text-orange-400 text-[10px] font-semibold rounded-md flex-shrink-0">NEEDS REPLY</span>
                    )}
                  </div>
                  {review.comment && (
                    <p className="text-white/40 text-xs line-clamp-1">{review.comment}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1.5">
                    {review.location?.name && (
                      <span className="text-white/25 text-[10px]">{review.location.name}</span>
                    )}
                    <span className="text-white/20 text-[10px]">{new Date(review.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Arrow */}
                <svg className="w-4 h-4 text-white/20 group-hover:text-white/40 transition-colors flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <DashboardLayout>
      <DashboardContent />
    </DashboardLayout>
  );
}
