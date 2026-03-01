"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout";

function DashboardContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [businessCount, setBusinessCount] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const init = async () => {
      try {
        const [authRes, bizRes, reviewsRes, pendingRes] = await Promise.all([
          fetch("/api/auth/me"),
          fetch("/api/businesses"),
          fetch("/api/reviews?limit=1"),
          fetch("/api/reviews?status=pending&limit=100"),
        ]);

        if (!authRes.ok) { router.push("/auth/signin"); return; }

        if (bizRes.ok) {
          const businesses = await bizRes.json();
          setBusinessCount(businesses.length);
        }
        if (reviewsRes.ok) {
          const data = await reviewsRes.json();
          setReviewCount(data.pagination?.total || 0);
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
  }, [router]);

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

  const cards = [
    {
      title: "Businesses",
      description: "Manage your businesses, brands, and locations",
      href: "/dashboard/businesses",
      count: businessCount,
      countLabel: businessCount === 1 ? "business" : "businesses",
      gradient: "from-violet-500 to-purple-600",
      shadow: "shadow-violet-500/20",
      hoverBorder: "hover:border-violet-500/30",
      icon: (
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
    },
    {
      title: "Reviews",
      description: "View reviews and approve AI-suggested replies",
      href: "/dashboard/reviews",
      count: reviewCount,
      countLabel: reviewCount === 1 ? "review" : "reviews",
      gradient: "from-amber-500 to-orange-600",
      shadow: "shadow-amber-500/20",
      hoverBorder: "hover:border-amber-500/30",
      icon: (
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      ),
    },
    {
      title: "Settings",
      description: "Notifications, Google Business, and account",
      href: "/dashboard/settings",
      count: null,
      countLabel: "",
      gradient: "from-blue-500 to-indigo-600",
      shadow: "shadow-blue-500/20",
      hoverBorder: "hover:border-blue-500/30",
      icon: (
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8 animate-fade-in">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-white/50">Quick overview and navigation</p>
      </div>

      {/* Pending Alert */}
      {pendingCount > 0 && (
        <Link
          href="/dashboard/reviews?status=pending"
          className="flex items-center gap-3 mb-6 bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4 hover:bg-orange-500/15 transition-all animate-slide-up"
        >
          <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-white text-sm font-medium">{pendingCount} review{pendingCount !== 1 ? "s" : ""} pending your approval</p>
            <p className="text-white/40 text-xs">AI replies are ready — tap to review them</p>
          </div>
          <svg className="w-5 h-5 text-orange-400/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      )}

      {/* Navigation Cards */}
      <div className="space-y-4">
        {cards.map((card, index) => (
          <Link
            key={card.title}
            href={card.href}
            className={`group flex items-center gap-5 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5 hover:bg-white/10 ${card.hoverBorder} transition-all duration-300 animate-slide-up`}
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <div className={`w-12 h-12 bg-gradient-to-br ${card.gradient} rounded-xl flex items-center justify-center shadow-lg ${card.shadow} group-hover:scale-110 transition-transform flex-shrink-0`}>
              {card.icon}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-white group-hover:text-white/90 transition-colors">{card.title}</h3>
              <p className="text-white/40 text-sm">{card.description}</p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              {card.count !== null && (
                <span className="text-2xl font-bold text-white/20 group-hover:text-white/30 transition-colors">{card.count}</span>
              )}
              <svg className="w-5 h-5 text-white/30 group-hover:text-white/60 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        ))}
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
